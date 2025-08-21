// src/quotes/quotes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from '../materials/schemas/material.schema';
import { EdgeProfile, EdgeProfileDocument } from '../edge-profiles/schemas/edge-profile.schema';
import { Cutout, CutoutDocument } from '../cutouts/schemas/cutout.schema';
import { Quote, QuoteDocument } from './schemas/quote.schema';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CalculateQuoteDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
    @InjectModel(EdgeProfile.name) private edgeProfileModel: Model<EdgeProfileDocument>,
    @InjectModel(Cutout.name) private cutoutModel: Model<CutoutDocument>,
  ) { }

  async calculatePrice(dto: CalculateQuoteDto) {
    const material = await this.materialModel.findById(dto.materialId);
    if (!material) throw new NotFoundException('Material not found');

    const edgeProfile = await this.edgeProfileModel.findById(dto.edgeProfileId);
    if (!edgeProfile) throw new NotFoundException('Edge profile not found');

    // 1. Calculate Area (in square meters)
    const m = dto.measurements;
    let area = 0;
    const fondoM = m.fondo / 100;
    if (dto.shape === 'Lineal') area = (m.ladoA / 100) * fondoM;
    if (dto.shape === 'L') area = ((m.ladoA / 100) * fondoM) + (((m.ladoB - m.fondo) / 100) * fondoM);
    if (dto.shape === 'U') area = ((m.ladoA / 100) * fondoM) + (((m.ladoB - (2 * m.fondo)) / 100) * fondoM) + ((m.ladoC / 100) * fondoM);

    // 2. Calculate Costs
    const materialCost = area * material.pricePerSquareMeter;

    let edgeMeters = 0;
    if (dto.shape === 'Lineal') edgeMeters = (m.ladoA / 100);
    if (dto.shape === 'L') edgeMeters = (m.ladoA / 100) + (m.ladoB / 100);
    if (dto.shape === 'U') edgeMeters = (m.ladoA / 100) + (m.ladoB / 100) + (m.ladoC / 100);
    const edgeCost = edgeMeters * edgeProfile.pricePerMeter;

    let cutoutsCost = 0;
    if (dto.cutouts && dto.cutouts.length > 0) {
      for (const item of dto.cutouts) {
        const cutout = await this.cutoutModel.findById(item.cutoutId);
        if (cutout) cutoutsCost += cutout.price * item.quantity;
      }
    }

    const backsplashCost = (dto.backsplashMeters || 0) * material.pricePerSquareMeter;

    // 3. Total Price and Breakdown
    const totalPrice = materialCost + edgeCost + cutoutsCost + backsplashCost;
    const priceBreakdown = { materialCost, edgeCost, cutoutsCost, backsplashCost };

    return { totalPrice, priceBreakdown };
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

    // TODO - Day 10: Send email notification with Nodemailer

    return newQuote.save();
  }

  // CRUD methods for admin panel
  findAll() { return this.quoteModel.find().populate('material').exec(); }
  findOne(id: string) { return this.quoteModel.findById(id).populate('material').exec(); }
  update(id: string, status: { status: string }) { return this.quoteModel.findByIdAndUpdate(id, status, { new: true }); }
  remove(id: string) { return this.quoteModel.findByIdAndDelete(id); }
}
