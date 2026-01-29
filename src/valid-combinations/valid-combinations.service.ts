// src/valid-combinations/valid-combinations.service.ts
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CreateValidCombinationDto } from "./dto/create-valid-combination.dto";
import { ValidCombination, ValidCombinationDocument } from "./schemas/valid-combination.schema";
import { UpdateValidCombinationDto } from "./dto/update-valid-combination.dto";
import { Material } from "src/materials/schemas/material.schema";

type OptionsState = Record<string, string[]>;

@Injectable()
export class ValidCombinationsService {
  constructor(
    @InjectModel(ValidCombination.name) private validCombinationModel: Model<ValidCombinationDocument>,
    @InjectModel(Material.name) private materialModel: Model<Material>,
  ) {}

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

  async getAvailableOptions(materialId: string, currentSelection: Record<string, string>): Promise<OptionsState> {
    // 1. Obtener orden de atributos (Idealmente esto debería estar en CACHE de Redis)
    const material = await this.materialModel.findById(materialId).select("selectableAttributes").lean(); // .lean() es más rápido si no necesitas hidratar el documento

    if (!material) throw new NotFoundException("Material no encontrado");

    const attributesOrder = material.selectableAttributes;
    if (!attributesOrder?.length) throw new BadRequestException("Sin atributos configurados.");

    // Castear string a ObjectId para el Aggregation
    // Si tu materialId es inválido, esto lanzará error, así que el validador de DTO debería haberlo atrapado antes.
    const oid = new Types.ObjectId(materialId);

    // 2. Construcción dinámica del Facet
    // Preparamos todos los "buckets" de búsqueda en memoria antes de tocar la BD
    const facets: Record<string, any[]> = {};

    // Usamos el ObjectId en el criterio base
    const currentMatchCriteria: Record<string, any> = { materialId: oid };

    for (const attr of attributesOrder) {
      // A. Para el atributo actual, queremos todos los valores distintos
      // que cumplan con los criterios ACUMULADOS hasta ahora.
      facets[attr] = [
        { $match: { ...currentMatchCriteria } }, // Copia del filtro actual
        { $group: { _id: `$attributes.${attr}` } }, // Group by para sacar distincts
        { $sort: { _id: 1 } }, // Ordenar en DB es más eficiente que en Node
        { $project: { value: "$_id", _id: 0 } }, // Formatear salida
      ];

      // B. Antes de pasar al siguiente atributo, verificamos si el usuario
      // seleccionó algo en EL ACTUAL. Si sí, actualizamos el criterio para el siguiente.
      // Si no, rompemos el bucle (no tiene sentido buscar opciones de hijos sin padre seleccionado).
      if (currentSelection[attr]) {
        currentMatchCriteria[`attributes.${attr}`] = currentSelection[attr];
      } else {
        break;
      }
    }

    // 3. Ejecutar UNA sola query a MongoDB
    const [results] = await this.validCombinationModel.aggregate([{ $facet: facets }]);

    // Protección: Si por alguna razón results es undefined (colección vacía), usamos {}
    const safeResults = results || {};

    // 4. Mapear la respuesta al formato OptionsState
    const response: OptionsState = {};

    attributesOrder.forEach((attr) => {
      // Si el facet existió y trajo datos, los mapeamos. Si no, array vacío.
      const attrResults = safeResults[attr];
      // Mapeamos solo si hay resultados, sino array vacío
      response[attr] = attrResults ? attrResults.map((r: any) => r.value) : [];
    });

    return response;
  }

  // async getAvailableOptions(
  //   materialId: string,
  //   currentSelection: Record<string, string>,
  // ): Promise<OptionsState> {

  //   // Encontrar el material para saber el orden de los atributos
  //   const material = await this.materialModel.findById(materialId);
  //   if (!material) {
  //     throw new NotFoundException('Material no encontrado');
  //   }
  //   const attributesOrder = material.selectableAttributes;

  //   if (!attributesOrder || attributesOrder.length === 0) {
  //     throw new BadRequestException('Este material no tiene "Atributos Seleccionables" configurados.');
  //   }

  //   const response: OptionsState = {};
  //   let mongoQuery: Record<string, any> = { materialId };

  //   // Iterar sobre los atributos EN ORDEN
  //   for (const attr of attributesOrder) {
  //     // Construir la query de atributos para MongoDB
  //     // (Ej: { materialId: '...', 'attributes.MAT_GROUP': 'Basic' })
  //     const attributeQuery = Object.keys(mongoQuery)
  //       .filter((key) => key !== 'materialId')
  //       .reduce((acc, key) => {
  //         acc[`attributes.${key}`] = mongoQuery[key];
  //         return acc;
  //       }, { materialId: mongoQuery.materialId });

  //     // Buscar los valores distintos para el atributo actual,
  //     //basado en la selección de los atributos anteriores
  //     const distinctValues = await this.validCombinationModel.distinct(
  //       `attributes.${attr}`,
  //       attributeQuery,
  //     );

  //     response[attr] = (distinctValues as string[]).sort();

  //     // Si el usuario NO ha seleccionado un valor para este atributo,
  //     //    paramos aquí. No tiene sentido calcular las opciones de niveles inferiores.
  //     const selectedValue = currentSelection[attr];
  //     if (selectedValue) {
  //       // Si SÍ seleccionó, lo añadimos a la query para la siguiente iteración
  //       mongoQuery[attr] = selectedValue;
  //     } else {
  //       break;
  //     }
  //   }

  //   // 6. Rellenar los atributos restantes con arrays vacíos
  //   attributesOrder.forEach(attr => {
  //     if (!response[attr]) {
  //       response[attr] = [];
  //     }
  //   });

  //   return response;
  // }
}
