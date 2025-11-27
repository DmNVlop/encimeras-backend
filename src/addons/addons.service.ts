import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Addon, AddonDocument } from './schemas/addons.schema';
import { CreateAddonDto } from './dto/create-addons.dto';
import { UpdateAddonDto } from './dto/update-addons.dto';

@Injectable()
export class AddonsService {
    constructor(
        @InjectModel(Addon.name) private readonly addonModel: Model<AddonDocument>,
    ) { }

    async create(createAddonDto: CreateAddonDto): Promise<Addon> {
        const newAddon = new this.addonModel(createAddonDto);
        return newAddon.save();
    }

    async findAll(): Promise<Addon[]> {
        return this.addonModel.find().exec();
    }

    async findOne(id: string): Promise<Addon> {
        const addon = await this.addonModel.findById(id).exec();
        if (!addon) {
            throw new NotFoundException(`Addon with ID "${id}" not found`);
        }
        return addon;
    }

    /**
   * Busca un addon por su campo 'code' único.
   * Este método es utilizado por el QuotesService para obtener la configuración de un addon.
   * @param code - El código único del addon (ej. 'CLADDING', 'COVING_ML').
   */
    async findByCode(code: string): Promise<Addon> {
        const addon = await this.addonModel.findOne({ code }).exec();
        if (!addon) {
            throw new NotFoundException(`Addon with code "${code}" not found`);
        }
        return addon;
    }

    async update(id: string, updateAddonDto: UpdateAddonDto): Promise<Addon> {
        const updatedAddon = await this.addonModel
            .findByIdAndUpdate(id, updateAddonDto, { new: true })
            .exec();
        if (!updatedAddon) {
            throw new NotFoundException(`Addon with ID "${id}" not found`);
        }
        return updatedAddon;
    }

    async remove(id: string): Promise<Addon> {
        const deletedAddon = await this.addonModel.findByIdAndDelete(id).exec();
        if (!deletedAddon) {
            throw new NotFoundException(`Addon with ID "${id}" not found`);
        }
        return deletedAddon;
    }
}
