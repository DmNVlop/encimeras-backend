import { Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Draft } from "./schemas/draft.schema";
import { GlobalSettingsService } from "../settings/global-settings.service";
import { QuotesService } from "src/quotes/quotes.service";
import { CreateDraftDto } from "./dto/create-draft.dto";
// Importa tu servicio real de precios aquí

@Injectable()
export class DraftsService {
  constructor(
    @InjectModel(Draft.name) private draftModel: Model<Draft>,
    private settingsService: GlobalSettingsService,
    // Inyectamos el motor de precios existente
    private pricingService: QuotesService,
  ) {}

  // --- CREAR / GUARDAR ---
  async createOrUpdate(createDraftDto: CreateDraftDto, userId?: string): Promise<Draft> {
    const validityDays = await this.settingsService.getDraftValidityDays();

    // Calculamos fecha de expiración: Hoy + N días
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + validityDays);

    const newDraft = new this.draftModel({
      ...createDraftDto,
      userId: userId || null,
      expirationDate,
      isConverted: false,
    });

    return newDraft.save();
  }

  // --- RECUPERAR CON LÓGICA DE NEGOCIO ---
  async findOne(id: string): Promise<any> {
    const draft = await this.draftModel.findById(id);
    if (!draft) throw new NotFoundException(`Borrador ${id} no encontrado`);
    if (draft.isConverted) throw new NotFoundException(`Este borrador ya fue procesado como orden`);

    const now = new Date();

    // CASO A: El borrador sigue vigente
    if (draft.expirationDate > now) {
      return {
        status: "VALID",
        data: draft,
      };
    }

    // CASO B: El borrador ha CADUCADO -> Recálculo Obligatorio
    // Usamos mainPieces para recalcular
    const calculation = await this.pricingService.calculate({
      mainPieces: draft.configuration.mainPieces,
    });

    // Actualizamos el precio en el borrador (pero no la fecha, sigue expirado hasta que el usuario guarde de nuevo)
    // Esto es opcional: podrías solo devolverlo sin guardar, pero guardar ayuda a la trazabilidad.
    draft.currentPricePoints = calculation.totalPoints;
    await draft.save();

    return {
      status: "EXPIRED_RECALCULATED",
      message: "El presupuesto ha caducado. Los precios se han actualizado a la tarifa vigente.",
      data: draft,
      newPrice: calculation.totalPoints,
    };
  }

  async update(id: string, updateDraftDto: CreateDraftDto): Promise<Draft> {
    const validityDays = await this.settingsService.getDraftValidityDays();

    // Al actualizar, renovamos la validez por N días más desde hoy
    const newExpirationDate = new Date();
    newExpirationDate.setDate(newExpirationDate.getDate() + validityDays);

    const updatedDraft = await this.draftModel.findByIdAndUpdate(
      id,
      {
        ...updateDraftDto,
        expirationDate: newExpirationDate,
      },
      { new: true }, // Para que devuelva el documento ya actualizado
    );

    if (!updatedDraft) {
      throw new NotFoundException(`No se pudo encontrar el borrador con ID ${id} para actualizar.`);
    }

    return updatedDraft;
  }

  async markAsConverted(id: string): Promise<void> {
    await this.draftModel.findByIdAndUpdate(id, { isConverted: true });
  }
}
