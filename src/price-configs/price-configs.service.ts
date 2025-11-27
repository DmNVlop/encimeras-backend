// src/price-configs/price-configs.service.ts
import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreatePriceConfigDto } from "./dto/create-price-config.dto";
import { UpdatePriceConfigDto } from "./dto/update-price-config.dto";
import { PriceConfig, PriceConfigDocument } from "./schemas/price-config.schema";

@Injectable()
export class PriceConfigsService {
  constructor(@InjectModel(PriceConfig.name) private priceConfigModel: Model<PriceConfigDocument>) {}

  // El CRUD se mantiene similar, pero ahora siempre incluye `productType`

  create(createPriceConfigDto: CreatePriceConfigDto) {
    const newPriceConfig = new this.priceConfigModel(createPriceConfigDto);
    return newPriceConfig.save();
  }

  findAll() {
    return this.priceConfigModel.find().exec();
  }

  findOne(id: string) {
    const priceConfig = this.priceConfigModel.findById(id).exec();
    if (!priceConfig) {
      throw new NotFoundException(`PriceConfig with ID "${id}" not found`);
    }
    return priceConfig;
  }

  async update(id: string, updatePriceConfigDto: UpdatePriceConfigDto) {
    // Aseguramos que no se pueda modificar la clave o el tipo de producto
    delete updatePriceConfigDto.combinationKey;
    delete updatePriceConfigDto.productType;

    const updatedPriceConfig = await this.priceConfigModel.findByIdAndUpdate(id, { $set: updatePriceConfigDto }, { new: true });
    if (!updatedPriceConfig) {
      throw new NotFoundException(`PriceConfig with ID "${id}" not found`);
    }
    return updatedPriceConfig;
  }

  remove(id: string) {
    return this.priceConfigModel.findByIdAndDelete(id).exec();
  }

  /**
   * Busca el precio para una combinación específica de un tipo de producto.
   * @param productType El tipo de producto ('ENCIMERA', 'CLADDING', etc.).
   * @param combinationKey La clave generada ('MAT_GROUP:Basic||...').
   * @returns El documento de PriceConfig encontrado.
   * @throws NotFoundException si no se encuentra un precio.
   */
  async findPriceForCombination(productType: string, combinationKey: string): Promise<PriceConfig> {
    const priceConfig = await this.priceConfigModel
      .findOne({
        productType,
        combinationKey,
      })
      .exec();

    if (!priceConfig) {
      throw new NotFoundException(`Price not found for combination "${combinationKey}" of product type "${productType}"`);
    }
    return priceConfig;
  }
}
