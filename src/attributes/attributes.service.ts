// src/attributes/attributes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { Attribute, AttributeDocument } from './schemas/attribute.schema';

@Injectable()
export class AttributesService {
  constructor(
    @InjectModel(Attribute.name) private attributeModel: Model<AttributeDocument>,
  ) { }

  create(createAttributeDto: CreateAttributeDto) {
    const newAttribute = new this.attributeModel(createAttributeDto);
    return newAttribute.save();
  }

  findAll(type?: string) {
    const filter = type ? { type } : {};
    return this.attributeModel.find(filter).exec();
  }

  async findOne(id: string) {
    const attribute = await this.attributeModel.findById(id);
    if (!attribute) {
      throw new NotFoundException(`Atributo con ID "${id}" no encontrado.`);
    }
    return attribute;
  }

  async update(id: string, updateAttributeDto: UpdateAttributeDto) {
    const updatedAttribute = await this.attributeModel.findByIdAndUpdate(
      id,
      updateAttributeDto,
      { new: true },
    );
    if (!updatedAttribute) {
      throw new NotFoundException(`Atributo con ID "${id}" no encontrado.`);
    }
    return updatedAttribute;
  }

  async remove(id: string) {
    const result = await this.attributeModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Atributo con ID "${id}" no encontrado.`);
    }
    return { message: `Atributo con ID "${id}" eliminado correctamente.` };
  }
}
