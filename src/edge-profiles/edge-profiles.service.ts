// src/edge-profiles/edge-profiles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEdgeProfileDto } from './dto/create-edge-profile.dto';
import { UpdateEdgeProfileDto } from './dto/update-edge-profile.dto';
import { EdgeProfile, EdgeProfileDocument } from './schemas/edge-profile.schema';

@Injectable()
export class EdgeProfilesService {
  constructor(@InjectModel(EdgeProfile.name) private edgeProfileModel: Model<EdgeProfileDocument>) { }
  async create(createDto: CreateEdgeProfileDto) { return new this.edgeProfileModel(createDto).save(); }
  async findAll() { return this.edgeProfileModel.find().exec(); }
  async findOne(id: string) {
    const profile = await this.edgeProfileModel.findById(id).exec();
    if (!profile) throw new NotFoundException(`EdgeProfile with ID "${id}" not found`);
    return profile;
  }
  async update(id: string, updateDto: UpdateEdgeProfileDto) {
    const profile = await this.edgeProfileModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!profile) throw new NotFoundException(`EdgeProfile with ID "${id}" not found`);
    return profile;
  }
  async remove(id: string) {
    const profile = await this.edgeProfileModel.findByIdAndDelete(id).exec();
    if (!profile) throw new NotFoundException(`EdgeProfile with ID "${id}" not found`);
    return profile;
  }
}