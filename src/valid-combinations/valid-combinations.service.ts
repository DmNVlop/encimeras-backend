// src/valid-combinations/valid-combinations.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateValidCombinationDto } from './dto/create-valid-combination.dto';
import { ValidCombination, ValidCombinationDocument } from './schemas/valid-combination.schema';
import { UpdateValidCombinationDto } from './dto/update-valid-combination.dto';
import { Material } from 'src/materials/schemas/material.schema';

type OptionsState = Record<string, string[]>;

@Injectable()
export class ValidCombinationsService {
  constructor(
    @InjectModel(ValidCombination.name) private validCombinationModel: Model<ValidCombinationDocument>,
    @InjectModel(Material.name) private materialModel: Model<Material>,
  ) { }

  create(createValidCombinationDto: CreateValidCombinationDto) {
    const newCombination = new this.validCombinationModel(createValidCombinationDto);
    return newCombination.save();
  }

  findAll(materialId?: string) {
    const filter = materialId ? { materialId } : {};
    return this.validCombinationModel.find(filter).exec();
  }

  update(id: string, updateValidCombinationDto: UpdateValidCombinationDto) {
    return this.validCombinationModel.findByIdAndUpdate(id, updateValidCombinationDto, { new: true }).exec();
  }

  remove(id: string) {
    return this.validCombinationModel.findByIdAndDelete(id).exec();
  }

  findOne(id: number) {
    return `This action returns a #${id} validCombination`;
  }

  async getAvailableOptions(
    materialId: string,
    currentSelection: Record<string, string>,
  ): Promise<OptionsState> {

    // Encontrar el material para saber el orden de los atributos
    const material = await this.materialModel.findById(materialId);
    if (!material) {
      throw new NotFoundException('Material no encontrado');
    }
    const attributesOrder = material.selectableAttributes;

    if (!attributesOrder || attributesOrder.length === 0) {
      throw new BadRequestException('Este material no tiene "Atributos Seleccionables" configurados.');
    }

    const response: OptionsState = {};
    let mongoQuery: Record<string, any> = { materialId };

    // Iterar sobre los atributos EN ORDEN
    for (const attr of attributesOrder) {
      // Construir la query de atributos para MongoDB
      // (Ej: { materialId: '...', 'attributes.MAT_GROUP': 'Basic' })
      const attributeQuery = Object.keys(mongoQuery)
        .filter((key) => key !== 'materialId')
        .reduce((acc, key) => {
          acc[`attributes.${key}`] = mongoQuery[key];
          return acc;
        }, { materialId: mongoQuery.materialId });

      // Buscar los valores distintos para el atributo actual,
      //    basado en la selección de los atributos anteriores
      const distinctValues = await this.validCombinationModel.distinct(
        `attributes.${attr}`,
        attributeQuery,
      );

      response[attr] = (distinctValues as string[]).sort();

      // Si el usuario NO ha seleccionado un valor para este atributo,
      //    paramos aquí. No tiene sentido calcular las opciones de niveles inferiores.
      const selectedValue = currentSelection[attr];
      if (selectedValue) {
        // Si SÍ seleccionó, lo añadimos a la query para la siguiente iteración
        mongoQuery[attr] = selectedValue;
      } else {
        break;
      }
    }

    // 6. Rellenar los atributos restantes con arrays vacíos
    attributesOrder.forEach(attr => {
      if (!response[attr]) {
        response[attr] = [];
      }
    });

    return response;
  }
}
