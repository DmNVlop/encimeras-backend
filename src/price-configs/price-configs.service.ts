// src/price-configs/price-configs.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePriceConfigDto } from './dto/create-price-config.dto';
import { UpdatePriceConfigDto } from './dto/update-price-config.dto';
import { PriceConfig, PriceConfigDocument } from './schemas/price-config.schema';

@Injectable()
export class PriceConfigsService {
  constructor(
    @InjectModel(PriceConfig.name) private priceConfigModel: Model<PriceConfigDocument>,
  ) { }

  // Genera una clave única y consistente a partir de un objeto de atributos.
  private generateCombinationKey(attributes: Record<string, string>): string {
    return Object.keys(attributes)
      .sort() // 1. Ordena las claves alfabéticamente (CRÍTICO para la consistencia)
      .map(key => `${key}:${attributes[key]}`) // 2. Crea pares "clave:valor"
      .join('_'); // 3. Los une en un string único
  }

  async create(createPriceConfigDto: CreatePriceConfigDto) {
    const combinationKey = this.generateCombinationKey(createPriceConfigDto.attributes);

    const existing = await this.priceConfigModel.findOne({ combinationKey }).exec();
    if (existing) {
      throw new ConflictException(`Ya existe una configuración de precio para la combinación: ${Object.values(createPriceConfigDto.attributes).join(', ')}`);
    }

    const createdPriceConfig = new this.priceConfigModel({
      combinationKey,
      pricePerSquareMeter: createPriceConfigDto.pricePerSquareMeter,
    });

    return createdPriceConfig.save();
  }

  findAll() {
    return this.priceConfigModel.find().exec();
  }

  findOne(id: string) {
    return this.priceConfigModel.findById(id).exec();
  }

  async update(id: string, updatePriceConfigDto: UpdatePriceConfigDto) {
    // Para cambiar la combinación, se debería borrar y crear una nueva regla.
    // Solo permitimos actualizar el precio de una combinación existente.
    const updateData: Partial<PriceConfig> = {};
    if (updatePriceConfigDto.pricePerSquareMeter) {
      updateData.pricePerSquareMeter = updatePriceConfigDto.pricePerSquareMeter;
    }
    // Si se envían nuevos atributos, se genera una nueva clave (no recomendado para update)
    if (updatePriceConfigDto.attributes) {
      updateData.combinationKey = this.generateCombinationKey(updatePriceConfigDto.attributes);
    }
    return this.priceConfigModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  remove(id: string) {
    return this.priceConfigModel.findByIdAndDelete(id).exec();
  }
}

