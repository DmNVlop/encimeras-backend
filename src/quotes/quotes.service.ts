// src/quotes/quotes.service.ts
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HydratedDocument, Model, Types } from "mongoose";

import { Quote, QuoteDocument } from "./schemas/quote.schema";
import { CalculateQuoteDto } from "./dto/quote.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { MaterialsService } from "src/materials/materials.service";
import { PriceConfigsService } from "src/price-configs/price-configs.service";
import { AddonsService } from "src/addons/addons.service";
import { MeasurementRuleSetsService } from "src/measurement-rule-sets/measurement-rule-sets.service";
import { MainPiecesService } from "src/main-pieces/main-pieces.service";
import { MainPiece } from "src/main-pieces/schemas/main-pieces.schema";
import { Addon } from "src/addons/schemas/addons.schema";

// Tipos Helper
type MainPieceData = CalculateQuoteDto["mainPieces"][0];
type AppliedAddonData = NonNullable<MainPieceData["appliedAddons"]>[0];

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    private readonly materialsService: MaterialsService,
    private readonly priceConfigsService: PriceConfigsService,
    private readonly addonsService: AddonsService,
    private readonly measurementRuleSetsService: MeasurementRuleSetsService,
    private readonly mainPiecesService: MainPiecesService,
  ) {}

  // ===========================================================================
  // 1. MÉTODO PRINCIPAL: CALCULATE
  // ===========================================================================
  async calculate(calculateQuoteDto: CalculateQuoteDto): Promise<{ totalPoints: number; pieces: any[] }> {
    let totalProjectPoints = 0;
    const piecesBreakdown: any[] = [];

    // Iteramos sobre cada tramo (MainPiece)
    for (const [index, piece] of calculateQuoteDto.mainPieces.entries()) {
      let pieceSubtotal = 0;
      const pieceDetail: any = {
        pieceName: `Tramo ${index + 1}`,
        basePricePoints: 0,
        addons: [],
        subtotalPoints: 0,
      };

      // A. Precio Base del Material (Encimera)
      const basePrice = await this.calculateMainPiecePrice(piece);
      pieceSubtotal += basePrice;
      pieceDetail.basePricePoints = basePrice;

      // B. Precio de Accesorios (Addons)
      if (piece.appliedAddons && piece.appliedAddons.length > 0) {
        for (const addon of piece.appliedAddons) {
          const addonPrice = await this.calculateAddonPrice(addon, piece);
          pieceSubtotal += addonPrice;

          pieceDetail.addons.push({
            addonName: addon.code, // Idealmente buscar el nombre real en DB, pero por performance usamos code o lo traemos del servicio
            pricePoints: addonPrice,
          });
        }
      }

      pieceDetail.subtotalPoints = pieceSubtotal;
      piecesBreakdown.push(pieceDetail);
      totalProjectPoints += pieceSubtotal;
    }

    return {
      totalPoints: totalProjectPoints,
      pieces: piecesBreakdown,
    };
  }

  // ===========================================================================
  // 2. MÉTODO CREATE
  // ===========================================================================
  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    // 1. Recalculamos para asegurar que el precio es real (no confiamos en el frontend)
    const calculation = await this.calculate(createQuoteDto);

    // 2. Guardamos cada MainPiece en su colección
    const createdPieceIds: Types.ObjectId[] = [];
    for (const pieceDto of createQuoteDto.mainPieces) {
      const createdPiece = (await this.mainPiecesService.create(pieceDto)) as HydratedDocument<MainPiece>;
      createdPieceIds.push(createdPiece._id);
    }

    // 3. Guardamos el Presupuesto (Quote)
    // Aplanamos el desglose para guardarlo simple en la DB si queremos
    const flatBreakdown = calculation.pieces.map((p) => ({
      description: p.pieceName,
      points: p.subtotalPoints,
    }));

    const newQuote = new this.quoteModel({
      customerName: createQuoteDto.customerName,
      customerEmail: createQuoteDto.customerEmail,
      customerPhone: createQuoteDto.customerPhone,
      mainPieces: createdPieceIds, // Referencias
      totalPrice: calculation.totalPoints,
      priceBreakdown: flatBreakdown,
      status: "Pendiente",
    });

    return newQuote.save();
  }

  // --- CRUD ADMIN (Sin cambios mayores) ---
  findAll() {
    return this.quoteModel
      .find()
      .populate({ path: "mainPieces", populate: { path: "materialId" } })
      .exec();
  }
  findOne(id: string) {
    return this.quoteModel
      .findById(id)
      .populate({ path: "mainPieces", populate: { path: "materialId" } })
      .exec();
  }
  remove(id: string) {
    return this.quoteModel.findByIdAndDelete(id);
  }
  update(id: string, status: { status: string }) {
    return this.quoteModel.findByIdAndUpdate(id, status, { new: true });
  }

  // ===========================================================================
  // 3. LOGICA PRIVADA DE PRECIOS (EL MOTOR)
  // ===========================================================================

  private async calculateMainPiecePrice(piece: MainPieceData): Promise<number> {
    const productType = "ENCIMERA"; // Hardcoded por ahora, podría venir de config

    // 1. Obtener la receta del material
    const recipe = await this.materialsService.getPricingRecipe(piece.materialId, productType);
    if (!recipe) return 0; // O lanzar error

    // 2. Construir clave (ej: "MAT_GROUP:BASIC||MAT_THICKNESS:20")
    const combinationKey = this.buildCombinationKey(piece.selectedAttributes, recipe.pricingAttributes);

    // 3. Obtener precio unitario
    const priceConfig = await this.priceConfigsService.findPriceForCombination(productType, combinationKey);

    // 4. Calcular superficie (m2)
    // Convertimos mm a m
    const areaM2 = (piece.length_mm / 1000) * (piece.width_mm / 1000);

    return priceConfig.price * areaM2;
  }

  private async calculateAddonPrice(addon: AppliedAddonData, piece: MainPieceData): Promise<number> {
    // Buscamos por 'code'
    const addonMaster = await this.addonsService.findByCode(addon.code);

    switch (addonMaster.pricingType) {
      case "FIXED":
        return this.calculateFixedAddon(addon, addonMaster);
      case "RANGE_BASED":
        return this.calculateRangeBasedAddon(addon, piece, addonMaster);
      case "COMBINATION_BASED":
        // La mayoría de las veces es igual al MainPiece, pero con otro productType (ej: APLACADO)
        return this.calculateCombinationBasedAddon(addon, piece, addonMaster);
      default:
        return 0;
    }
  }

  // --- CÁLCULO: FIXED (Precio Fijo) ---
  private async calculateFixedAddon(addon: AppliedAddonData, addonMaster: Addon): Promise<number> {
    const priceConfig = await this.priceConfigsService.findPriceForCombination(addonMaster.productTypeMap, "DEFAULT");
    // Usamos quantity si existe, si no 1
    const qty = addon.measurements?.quantity || addon.quantity || 1;
    return priceConfig.price * qty;
  }

  // --- CÁLCULO: RANGE_BASED (Rangos, ej. Copete) ---
  private async calculateRangeBasedAddon(addon: AppliedAddonData, piece: MainPieceData, addonMaster: Addon): Promise<number> {
    if (!addonMaster.measurementRuleSetId) {
      throw new BadRequestException(`Addon ${addonMaster.code} is RANGE_BASED but has no rule set.`);
    }

    // 1. Obtener la Regla de Medición (ej. "Regla Copetes Altura")
    const ruleSet = await this.measurementRuleSetsService.findOne(addonMaster.measurementRuleSetId.toString());

    // 2. Determinar el valor que define el rango.
    // Intenta buscar 'height_mm' o 'width_mm' en las medidas del addon.
    // Para un copete, el rango suele ser la altura (height_mm).
    const rangeValue = addon.measurements?.height_mm || addon.measurements?.width_mm || 0;

    // 3. Buscar en qué rango cae
    const range = ruleSet.ranges.find((r) => rangeValue >= r.min && rangeValue <= r.max);
    if (!range) {
      // Si no encuentra rango, o lanzamos error o devolvemos 0
      // throw new NotFoundException(`No range found for value ${rangeValue} in rule set ${ruleSet.name}`);
      return 0;
    }

    // 4. Construir la clave de combinación
    // Heredamos atributos del material padre si es necesario (ej. Grupo de Material)
    const inheritedAttrs = this.filterAttributes(piece.selectedAttributes, addonMaster.inheritedAttributes || []);

    // Añadimos la clave especial WIDTH_RANGE con la etiqueta del rango encontrado (ej. "ALTO_100")
    const combinationKey = this.buildCombinationKey({
      ...inheritedAttrs,
      WIDTH_RANGE: range.label,
    });

    // 5. Buscar precio base
    const priceConfig = await this.priceConfigsService.findPriceForCombination(addonMaster.productTypeMap, combinationKey);

    // 6. Multiplicar según el tipo de precio del rango (ml, m2, unidad)
    // Para copetes, suele ser precio/ml * metros lineales
    if (range.priceType === "ml" && addon.measurements?.length_ml) {
      return priceConfig.price * addon.measurements.length_ml;
    }
    if (range.priceType === "m2" && addon.measurements?.length_ml) {
      // Si es m2, multiplicamos largo x alto (convertido a metros)
      const heightM = rangeValue / 1000;
      return priceConfig.price * (addon.measurements.length_ml * heightM);
    }

    // Default a precio por pieza
    // Si es 'piece', debemos multiplicar por la cantidad solicitada
    const qty = addon.measurements?.quantity || addon.quantity || 1;
    return priceConfig.price * qty;
  }

  // --- CÁLCULO: COMBINATION_BASED (Atributos) ---
  private async calculateCombinationBasedAddon(addon: AppliedAddonData, piece: MainPieceData, addonMaster: Addon): Promise<number> {
    // 1. Usamos la receta del material, pero con el productType del Addon (ej: 'CLADDING')
    const recipe = await this.materialsService.getPricingRecipe(piece.materialId, addonMaster.productTypeMap);

    if (!recipe) return 0;

    const combinationKey = this.buildCombinationKey(piece.selectedAttributes, recipe.pricingAttributes);

    const priceConfig = await this.priceConfigsService.findPriceForCombination(addonMaster.productTypeMap, combinationKey);

    // Normalmente esto se cobra por m2 (Aplacado)
    if (recipe.unit === "m2") {
      // Buscamos medidas de superficie
      const l = addon.measurements?.length_ml || piece.length_mm / 1000; // Fallback al largo de pieza
      const w = (addon.measurements?.height_mm || addon.measurements?.width_mm || 0) / 1000;

      if (l && w) {
        return priceConfig.price * (l * w);
      }
    }

    return priceConfig.price; // Fallback unitario
  }

  // --- HELPERS ---
  private buildCombinationKey(attributes: Record<string, string>, filterBy?: string[]): string {
    const attrsToUse = filterBy ? this.filterAttributes(attributes, filterBy) : attributes;
    // Orden alfabético es CRÍTICO para que coincida con lo guardado en DB
    return Object.keys(attrsToUse)
      .sort()
      .map((key) => `${key}:${attrsToUse[key]}`)
      .join("||");
  }

  private filterAttributes(allAttributes: Record<string, string>, keysToKeep: string[]): Record<string, string> {
    return keysToKeep.reduce(
      (result, key) => {
        if (allAttributes[key]) result[key] = allAttributes[key];
        return result;
      },
      {} as Record<string, string>,
    );
  }
}
