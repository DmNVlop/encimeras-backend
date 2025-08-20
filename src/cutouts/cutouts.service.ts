// src/cutouts/cutouts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCutoutDto } from './dto/create-cutout.dto';
import { UpdateCutoutDto } from './dto/update-cutout.dto';
import { Cutout, CutoutDocument } from './schemas/cutout.schema';

@Injectable()
export class CutoutsService {
  constructor(@InjectModel(Cutout.name) private cutoutModel: Model<CutoutDocument>) { }
  async create(createDto: CreateCutoutDto) { return new this.cutoutModel(createDto).save(); }
  async findAll() { return this.cutoutModel.find().exec(); }
  async findOne(id: string) {
    const cutout = await this.cutoutModel.findById(id).exec();
    if (!cutout) throw new NotFoundException(`Cutout with ID "${id}" not found`);
    return cutout;
  }
  async update(id: string, updateDto: UpdateCutoutDto) {
    const cutout = await this.cutoutModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!cutout) throw new NotFoundException(`Cutout with ID "${id}" not found`);
    return cutout;
  }
  async remove(id: string) {
    const cutout = await this.cutoutModel.findByIdAndDelete(id).exec();
    if (!cutout) throw new NotFoundException(`Cutout with ID "${id}" not found`);
    return cutout;
  }
}