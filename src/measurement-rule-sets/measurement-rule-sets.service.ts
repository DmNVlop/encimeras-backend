import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MeasurementRuleSet, MeasurementRuleSetDocument } from './schemas/measurement-rule-sets.schema';
import { CreateMeasurementRuleSetDto } from './dto/create-measurement-rule-sets.dto';
import { UpdateMeasurementRuleSetDto } from './dto/update-measurement-rule-sets.dto';

@Injectable()
export class MeasurementRuleSetsService {
    constructor(
        @InjectModel(MeasurementRuleSet.name)
        private readonly measurementRuleSetModel: Model<MeasurementRuleSetDocument>,
    ) { }

    // --- Crear un nuevo conjunto de reglas ---
    async create(
        createDto: CreateMeasurementRuleSetDto,
    ): Promise<MeasurementRuleSet> {
        const newRuleSet = new this.measurementRuleSetModel(createDto);
        return newRuleSet.save();
    }

    // --- Obtener todos los conjuntos de reglas ---
    async findAll(): Promise<MeasurementRuleSet[]> {
        return this.measurementRuleSetModel.find().exec();
    }

    // --- Obtener un conjunto de reglas por su ID ---
    async findOne(id: string): Promise<MeasurementRuleSet> {
        const ruleSet = await this.measurementRuleSetModel.findById(id).exec();
        if (!ruleSet) {
            throw new NotFoundException(`MeasurementRuleSet with ID "${id}" not found`);
        }
        return ruleSet;
    }

    // --- Actualizar un conjunto de reglas por su ID ---
    async update(
        id: string,
        updateDto: UpdateMeasurementRuleSetDto,
    ): Promise<MeasurementRuleSet> {
        const updatedRuleSet = await this.measurementRuleSetModel
            .findByIdAndUpdate(id, updateDto, { new: true }) // {new: true} devuelve el documento actualizado
            .exec();

        if (!updatedRuleSet) {
            throw new NotFoundException(`MeasurementRuleSet with ID "${id}" not found`);
        }
        return updatedRuleSet;
    }

    // --- Eliminar un conjunto de reglas por su ID ---
    async remove(id: string): Promise<MeasurementRuleSet> {
        const deletedRuleSet = await this.measurementRuleSetModel
            .findByIdAndDelete(id)
            .exec();
        if (!deletedRuleSet) {
            throw new NotFoundException(`MeasurementRuleSet with ID "${id}" not found`);
        }
        return deletedRuleSet;
    }
}
