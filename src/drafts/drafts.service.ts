import { Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Draft } from "./schemas/draft.schema";
import { User } from "../users/schemas/users.schema";
import { GlobalSettingsService } from "../settings/global-settings.service";
import { QuotesService } from "src/quotes/quotes.service";
import { CreateDraftDto } from "./dto/create-draft.dto";
import { QuoteEventsService } from "../quote-events/quote-events.service";
import { QuoteEventType } from "../quote-events/schemas/quote-event.schema";

@Injectable()
export class DraftsService {
  constructor(
    @InjectModel(Draft.name) private draftModel: Model<Draft>,
    @InjectModel(User.name) private userModel: Model<User>,
    private settingsService: GlobalSettingsService,
    // Inyectamos el motor de precios existente
    private pricingService: QuotesService,
    private quoteEventsService: QuoteEventsService,
  ) {}

  // --- CREAR / GUARDAR ---
  async createOrUpdate(createDraftDto: CreateDraftDto, userId?: string): Promise<Draft> {
    const validityDays = await this.settingsService.getDraftValidityDays();

    // Calculamos fecha de expiración: Hoy + N días
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + validityDays);

    let finalCurrentPrice = createDraftDto.currentPricePoints;
    let finalOriginalPrice = createDraftDto.originalPoints;
    let finalDiscount = createDraftDto.discountAmount;
    let piecesBreakdown: any[] = [];

    const calculation = await this.pricingService.calculate({
      mainPieces: createDraftDto.core.mainPieces as any,
      factoryId: createDraftDto.core.factoryId,
      customerId: createDraftDto.core.customerId || userId,
    });
    piecesBreakdown = calculation.pieces || [];

    if (finalCurrentPrice === undefined || finalCurrentPrice === null) {
      finalCurrentPrice = Number.isFinite(calculation.finalTotalPoints) ? calculation.finalTotalPoints : 0;
      finalOriginalPrice = Number.isFinite(calculation.totalPoints) ? calculation.totalPoints : finalCurrentPrice;
      finalDiscount = Number.isFinite(calculation.totalDiscount) ? calculation.totalDiscount : 0;
    }

    const newDraft = new this.draftModel({
      ...createDraftDto,
      quoteTraceId: createDraftDto.quoteTraceId || QuoteEventsService.newTraceId(),
      currentPricePoints: finalCurrentPrice,
      originalPoints: finalOriginalPrice ?? finalCurrentPrice,
      discountAmount: finalDiscount ?? 0,
      piecesBreakdown,
      userId: userId || null,
      expirationDate,
      isConverted: false,
    });

    const saved = await newDraft.save();
    this.recordDraftSaved(saved, userId);
    return saved;
  }

  private recordDraftSaved(draft: Draft, userId?: string): void {
    this.quoteEventsService.record({
      ...QuoteEventsService.snapshotOf(draft),
      quoteTraceId: draft.quoteTraceId!,
      type: QuoteEventType.DRAFT_SAVED,
      userId,
      draftId: String(draft._id),
    });
  }

  // --- RECUPERAR CON LÓGICA DE NEGOCIO ---
  /**
   * `scopeFilter` (de `DataScopeService.toDraftFilter`) permite leer borradores ajenos dentro del
   * alcance; sin él solo el dueño (o anónimo). Los ajenos se devuelven con `isOwn: false`
   * y nunca se persiste en ellos el recálculo por caducidad.
   */
  async findOne(id: string, userId: string, scopeFilter?: Record<string, any>): Promise<any> {
    // CAMBIO IMPORTANTE: Buscamos solo por ID primero para diagnosticar mejor
    // y para permitir que un usuario reclame un borrador anónimo
    const draft = await this.draftModel.findById(id);

    if (!draft) {
      throw new NotFoundException(`Borrador ${id} no encontrado`);
    }

    if (draft.isConverted) {
      throw new NotFoundException(`Este borrador ya fue procesado como orden`);
    }

    // VALIDACIÓN DE PROPIEDAD:
    // 1. Si el borrador TIENE userId, debe coincidir con el que solicita
    // 2. Si el borrador NO TIENE userId (es anónimo), permitimos que pase (se reclamará al convertir)
    // CORRECCIÓN: Forzamos la comparación como Strings porque pueden venir como number o ObjectId
    const isOwn = !draft.userId || String(draft.userId) === String(userId);
    if (!isOwn) {
      const inScope = scopeFilter && (await this.draftModel.exists({ _id: draft._id, ...scopeFilter }));
      // Seguridad: Si no es tuyo ni está en tu alcance, decimos que no existe
      if (!inScope) throw new NotFoundException(`Borrador no encontrado o no pertenece al usuario`);
    }

    const now = new Date();

    // CASO A: El borrador sigue vigente
    if (draft.expirationDate > now) {
      return {
        status: "VALID",
        data: draft,
        isOwn,
      };
    }

    // CASO B: El borrador ha CADUCADO -> Recálculo Obligatorio
    // Usamos core para recalcular
    const calculation = await this.pricingService.calculate({
      mainPieces: draft.core.mainPieces,
      factoryId: draft.core.factoryId,
      customerId: draft.core.customerId || draft.userId,
    });

    const safePoints = Number.isFinite(calculation.finalTotalPoints) ? calculation.finalTotalPoints : 0;
    draft.currentPricePoints = safePoints;
    draft.originalPoints = calculation.totalPoints;
    draft.discountAmount = calculation.totalDiscount;
    (draft as any).piecesBreakdown = calculation.pieces || [];
    if (isOwn) await draft.save();

    return {
      status: "EXPIRED_RECALCULATED",
      message: "El presupuesto ha caducado. Los precios se han actualizado a la tarifa vigente.",
      data: draft,
      newPrice: safePoints,
      isOwn,
    };
  }

  async update(id: string, updateDraftDto: CreateDraftDto, userId: string): Promise<Draft> {
    const validityDays = await this.settingsService.getDraftValidityDays();

    // Al actualizar, renovamos la validez por N días más desde hoy
    const newExpirationDate = new Date();
    newExpirationDate.setDate(newExpirationDate.getDate() + validityDays);

    let finalCurrentPrice = updateDraftDto.currentPricePoints;
    let finalOriginalPrice = updateDraftDto.originalPoints;
    let finalDiscount = updateDraftDto.discountAmount;
    let piecesBreakdown: any[] = [];

    const calculation = await this.pricingService.calculate({
      mainPieces: updateDraftDto.core.mainPieces as any,
      factoryId: updateDraftDto.core.factoryId,
      customerId: updateDraftDto.core.customerId || userId,
    });
    piecesBreakdown = calculation.pieces || [];

    if (finalCurrentPrice === undefined || finalCurrentPrice === null) {
      finalCurrentPrice = Number.isFinite(calculation.finalTotalPoints) ? calculation.finalTotalPoints : 0;
      finalOriginalPrice = Number.isFinite(calculation.totalPoints) ? calculation.totalPoints : finalCurrentPrice;
      finalDiscount = Number.isFinite(calculation.totalDiscount) ? calculation.totalDiscount : 0;
    }

    // El id de trazabilidad de un borrador no cambia: se conserva el guardado y solo se asigna si no tenía
    const existing = await this.draftModel.findOne({ _id: id, userId }).select("quoteTraceId").lean();
    if (!existing) {
      throw new NotFoundException(`No se pudo encontrar el borrador con ID ${id} para actualizar.`);
    }

    const updatedDraft = await this.draftModel.findOneAndUpdate(
      { _id: id, userId },
      {
        ...updateDraftDto,
        quoteTraceId: existing.quoteTraceId || updateDraftDto.quoteTraceId || QuoteEventsService.newTraceId(),
        currentPricePoints: finalCurrentPrice,
        originalPoints: finalOriginalPrice ?? finalCurrentPrice,
        discountAmount: finalDiscount ?? 0,
        piecesBreakdown,
        expirationDate: newExpirationDate,
      },
      { new: true },
    );

    if (!updatedDraft) {
      throw new NotFoundException(`No se pudo encontrar el borrador con ID ${id} para actualizar.`);
    }

    this.recordDraftSaved(updatedDraft, userId);
    return updatedDraft;
  }

  async markAsConverted(id: string): Promise<void> {
    await this.draftModel.findByIdAndUpdate(id, { isConverted: true });
  }

  /** Borradores activos dentro del alcance, marcados con `isOwn` y el nombre del dueño si es ajeno. */
  async findAllActive(userId: string, scopeFilter: Record<string, any>): Promise<any[]> {
    const drafts = await this.draftModel.find({ ...scopeFilter, isConverted: false }).lean().exec();

    const otherIds = [...new Set(drafts.map((d) => String(d.userId ?? "")).filter((id) => id && id !== String(userId)))];
    const validIds = otherIds.filter((id) => Types.ObjectId.isValid(id));
    const owners = validIds.length ? await this.userModel.find({ _id: { $in: validIds } }).select("name username email").lean() : [];
    const ownerName = new Map(owners.map((u) => [u._id.toString(), u.name || u.username || u.email || ""]));

    return drafts.map((d) => {
      const isOwn = !d.userId || String(d.userId) === String(userId);
      return { ...d, isOwn, ownerName: isOwn ? undefined : ownerName.get(String(d.userId)) || undefined };
    });
  }

  async findAllByGroupId(groupId: string, userId: string): Promise<Draft[]> {
    return this.draftModel.find({ cartGroupId: groupId, userId, isConverted: false }).lean().exec() as any;
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.draftModel.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Draft with ID "${id}" not found or does not belong to user`);
    }
  }
}
