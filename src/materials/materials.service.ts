// src/materials/materials.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateMaterialDto } from "./dto/create-material.dto";
import { UpdateMaterialDto } from "./dto/update-material.dto";
import { Material, MaterialDocument, PricingRecipe } from "./schemas/material.schema";

@Injectable()
export class MaterialsService {
  constructor(@InjectModel(Material.name) private materialModel: Model<MaterialDocument>) {}

  async create(createMaterialDto: CreateMaterialDto): Promise<Material> {
    const createdMaterial = new this.materialModel(createMaterialDto);
    return createdMaterial.save();
  }

  async findAll() {
    // Usamos el pipeline de agregación para unir colecciones y contar
    return this.materialModel
      .aggregate([
        {
          // 1. "Left Join" a la colección de combinaciones válidas
          // El nombre 'validcombinations' debe coincidir con el nombre de tu colección en MongoDB (plural y en minúsculas)
          $lookup: {
            from: "validcombinations",
            localField: "_id",
            foreignField: "materialId",
            as: "combinations", // Nombre temporal del array con las combinaciones encontradas
          },
        },
        {
          // 2. Añadimos el nuevo campo con el contador
          $addFields: {
            validCombinationsCount: { $size: "$combinations" }, // Usamos $size para contar los elementos del array
          },
        },
        {
          // 3. Proyectamos los campos finales para limpiar la respuesta
          $project: {
            combinations: 0, // Eliminamos el array temporal que ya no necesitamos
          },
        },
      ])
      .exec();
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialModel.findById(id).exec();
    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return material;
  }

  async update(id: string, updateMaterialDto: UpdateMaterialDto): Promise<Material> {
    const updatedMaterial = await this.materialModel.findByIdAndUpdate(id, updateMaterialDto, { new: true }).exec();
    if (!updatedMaterial) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return updatedMaterial;
  }

  async removeOne(id: string): Promise<Material> {
    const deletedMaterial = await this.materialModel.findByIdAndDelete(id).exec();
    if (!deletedMaterial) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return deletedMaterial;
  }

  async remove(ids: string[]): Promise<{ deletedCount: number }> {
    const result = await this.materialModel.deleteMany({ _id: { $in: ids } });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`No materials found with the provided IDs.`);
    }
    return { deletedCount: result.deletedCount };
  }

  /**
   * Encuentra un material por su ID y extrae la receta de precios
   * para un tipo de producto específico.
   * Este método será fundamental para el servicio de Quotes.
   * @param materialId El ID del material a buscar.
   * @param productType El tipo de producto ('ENCIMERA', 'CLADDING', etc.).
   * @returns La receta de precios correspondiente.
   * @throws NotFoundException si el material o la receta no se encuentran.
   */
  async getPricingRecipe(materialId: string, productType: string): Promise<PricingRecipe> {
    const material = await this.findOne(materialId);

    const recipe = material.pricingRecipes.find((r) => r.productType === productType);

    if (!recipe) {
      throw new NotFoundException(`Pricing recipe for product type "${productType}" not found in material "${material.name}"`);
    }

    return recipe;
  }
}
