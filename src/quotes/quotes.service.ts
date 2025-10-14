// src/quotes/quotes.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Material, MaterialDocument } from '../materials/schemas/material.schema';
import { EdgeProfile, EdgeProfileDocument } from '../edge-profiles/schemas/edge-profile.schema';
import { Cutout, CutoutDocument } from '../cutouts/schemas/cutout.schema';
import { Quote, QuoteDocument } from './schemas/quote.schema';
import { PriceConfig, PriceConfigDocument } from 'src/price-configs/schemas/price-config.schema';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { CalculateQuoteDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
    @InjectModel(EdgeProfile.name) private edgeProfileModel: Model<EdgeProfileDocument>,
    @InjectModel(Cutout.name) private cutoutModel: Model<CutoutDocument>,
    @InjectModel(PriceConfig.name) private priceConfigModel: Model<PriceConfigDocument>,
  ) { }

  // IMPORTANTE: Esta función debe ser IDÉNTICA a la del PriceConfigsService
  private generateCombinationKey(attributes: Record<string, string>): string {
    return Object.keys(attributes)
      .sort()
      .map(key => `${key}:${attributes[key]}`)
      .join('_');
  }

  async calculatePrice(calculateQuoteDto: CalculateQuoteDto) {
    const {
      materialId,
      shape,
      measurements,
      edgeProfileId,
      cutouts,
      thickness,
      finish,
      group,
      face,
      type
    } = calculateQuoteDto;

    // --- Construir el objeto de atributos para buscar el precio ---
    const priceAttributes = {
      mat_thickness: thickness,
      mat_finish: finish,
      mat_group: group,
      mat_face: face,
      mat_type: type
    };

    // --- Construir la clave y buscar el precio ---
    const combinationKey = this.generateCombinationKey(priceAttributes);
    const priceConfig = await this.priceConfigModel.findOne({ combinationKey }).exec();

    if (!priceConfig) {
      throw new NotFoundException(`No se encontró un precio para la combinación de atributos seleccionada. (${combinationKey})`);
    }

    const pricePerSquareMeter = priceConfig.pricePerSquareMeter;

    // ====================================================================
    // VALIDACIÓN DE MEDIDAS SEGÚN LA FORMA
    // ====================================================================
    if (shape === 'L' && !measurements.ladoB) {
      throw new BadRequestException('Para la forma "L", la medida "ladoB" es requerida.');
    }
    if (shape === 'U' && (!measurements.ladoB || !measurements.ladoC)) {
      throw new BadRequestException('Para la forma "U", las medidas "ladoB" y "ladoC" son requeridas.');
    }
    // ====================================================================

    const material = await this.materialModel.findById(materialId);
    if (!material) throw new NotFoundException('Material no encontrado');

    const edgeProfile = await this.edgeProfileModel.findById(edgeProfileId);
    if (!edgeProfile) throw new NotFoundException('Edge profile not found');

    // Calculate Area (in square meters)
    let area = 0;
    const fondoM = measurements.fondo / 1000;
    const ladoAM = measurements.ladoA / 1000;

    // Calculate Costs
    if (shape === 'Lineal') {
      area = ladoAM * fondoM;
    } else if (shape === 'L') {
      const ladoBM = measurements.ladoB! / 1000;
      area = (ladoAM * fondoM) + ((ladoBM - fondoM) * fondoM);
    } else if (shape === 'U') {
      const ladoBM = measurements.ladoB! / 1000;
      const ladoCM = measurements.ladoC! / 1000;
      area = (ladoAM * fondoM) + ((ladoBM - 2 * fondoM) * fondoM) + (ladoCM * fondoM);
    }

    const materialCost = area * pricePerSquareMeter;

    // Lógica de coste de canto
    let edgeMeters = 0;
    if (shape === 'Lineal') {
      edgeMeters = (ladoAM / 1000);
    }
    if (shape === 'L') {
      const ladoBM = measurements.ladoB! / 1000;
      edgeMeters = (ladoAM / 1000) + (ladoBM / 1000);
    }
    if (shape === 'U') {
      const ladoBM = measurements.ladoB! / 1000;
      const ladoCM = measurements.ladoC! / 1000;
      edgeMeters = (ladoAM / 1000) + (ladoBM / 1000) + (ladoCM / 1000);
    }

    const edgeCost = edgeMeters * edgeProfile.pricePerMeter;

    // Lógica de coste de cortes (Trabajos)
    let cutoutsCost = 0;
    if (cutouts && cutouts.length > 0) {
      for (const item of cutouts) {
        const cutout = await this.cutoutModel.findById(item.cutoutId);
        if (cutout) cutoutsCost += cutout.price * item.quantity;
      }
    }

    // Total Price and Breakdown
    const totalPrice = materialCost + edgeCost + cutoutsCost;
    const priceBreakdown = { materialCost, edgeCost, cutoutsCost };

    return { totalPrice, priceBreakdown, area };
  }

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    const { totalPrice, priceBreakdown } = await this.calculatePrice(createQuoteDto);

    const newQuote = new this.quoteModel({
      ...createQuoteDto,
      material: createQuoteDto.materialId,
      edgeProfile: createQuoteDto.edgeProfileId,
      cutouts: createQuoteDto.cutouts?.map(c => ({ cutout: c.cutoutId, quantity: c.quantity })),
      totalPrice,
      priceBreakdown,
    });

    // TODO - Send email notification with Nodemailer

    return newQuote.save();
  }

  // CRUD methods for admin panel
  findAll() { return this.quoteModel.find().populate('material').exec(); }
  findOne(id: string) { return this.quoteModel.findById(id).populate('material').exec(); }
  update(id: string, status: { status: string }) { return this.quoteModel.findByIdAndUpdate(id, status, { new: true }); }
  remove(id: string) { return this.quoteModel.findByIdAndDelete(id); }
}
