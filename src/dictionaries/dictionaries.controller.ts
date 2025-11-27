// src/dictionaries/dictionaries.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DictionariesService } from 'src/dictionaries/dictionaries.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta esta ruta si tu guard está en otro lugar

@ApiTags('Dictionaries')
@ApiBearerAuth() // Indica que los endpoints requieren autenticación Bearer
@UseGuards(JwtAuthGuard) // Aplica el guard de JWT a todo el controlador
@Controller('dictionaries')
export class DictionariesController {
    constructor(private readonly dictionariesService: DictionariesService) { }

    /**
     * Endpoint para obtener una lista única de todos los 'productType'
     * definidos en el sistema (tanto de Addons como de Materials).
     */
    @Get('product-types')
    @ApiOperation({
        summary: 'Get all unique product types',
        description: 'Returns a sorted array of unique productType strings from both Addons (productTypeMap) and Materials (pricingRecipes.productType).'
    })
    @ApiResponse({
        status: 200,
        description: 'An array of unique product type strings.',
        type: [String],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    findAllProductTypes() {
        // Llama al método del servicio que diseñamos
        return this.dictionariesService.findAllProductTypes();
    }

    // Aquí podrías añadir futuros endpoints de diccionarios, por ejemplo:
    // @Get('material-categories')
    // findAllMaterialCategories() { ... }
}