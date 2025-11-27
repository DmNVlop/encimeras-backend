// (Este servicio necesitaría inyectar los modelos de Addon y Material)
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Addon, AddonDocument } from 'src/addons/schemas/addons.schema';
import { Material, MaterialDocument } from 'src/materials/schemas/material.schema';

@Injectable()
export class DictionariesService {
    constructor(
        @InjectModel(Addon.name) private addonModel: Model<AddonDocument>,
        @InjectModel(Material.name) private materialModel: Model<MaterialDocument>,
    ) { }

    async findAllProductTypes(): Promise<string[]> {
        // 1. Obtener todos los productTypeMap de los Addons
        const addonTypes = await this.addonModel.distinct('productTypeMap');

        // 2. Obtener todos los productType de las PricingRecipes (anidadas)
        const materials = await this.materialModel.find().select('pricingRecipes.productType').exec();
        const recipeTypes = materials.flatMap(m =>
            m.pricingRecipes.map(r => r.productType)
        );

        // 3. Unir, filtrar duplicados, nulos y ordenar
        const allTypes = [...addonTypes, ...recipeTypes];
        const uniqueTypes = [...new Set(allTypes)];

        return uniqueTypes.filter(Boolean).sort(); // filter(Boolean) elimina null/undefined/""
    }
}