// src/materials/materials.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Material, MaterialDocument } from './schemas/material.schema';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
  ) { }

  async create(createMaterialDto: CreateMaterialDto): Promise<Material> {
    const createdMaterial = new this.materialModel(createMaterialDto);
    return createdMaterial.save();
  }

  async findAll(): Promise<Material[]> {
    return this.materialModel.find().exec();
  }

  async findOne(id: string): Promise<Material> {
    const material = await this.materialModel.findById(id).exec();
    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return material;
  }

  async update(id: string, updateMaterialDto: UpdateMaterialDto): Promise<Material> {
    const updatedMaterial = await this.materialModel
      .findByIdAndUpdate(id, updateMaterialDto, { new: true })
      .exec();
    if (!updatedMaterial) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return updatedMaterial;
  }

  async remove(id: string): Promise<Material> {
    const deletedMaterial = await this.materialModel.findByIdAndDelete(id).exec();
    if (!deletedMaterial) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return deletedMaterial;
  }
}
