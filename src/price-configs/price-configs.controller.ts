// src/price-configs/price-configs.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PriceConfigsService } from './price-configs.service';
import { CreatePriceConfigDto } from './dto/create-price-config.dto';
import { UpdatePriceConfigDto } from './dto/update-price-config.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('Price Configurations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('price-configs')
export class PriceConfigsController {
  constructor(private readonly priceConfigsService: PriceConfigsService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva configuración de precio' })
  @ApiResponse({ status: 201, description: 'La configuración ha sido creada.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  create(@Body() createPriceConfigDto: CreatePriceConfigDto) {
    return this.priceConfigsService.create(createPriceConfigDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las configuraciones de precio' })
  findAll() {
    return this.priceConfigsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una configuración de precio por ID' })
  findOne(@Param('id') id: string) {
    return this.priceConfigsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una configuración de precio' })
  update(@Param('id') id: string, @Body() updatePriceConfigDto: UpdatePriceConfigDto) {
    return this.priceConfigsService.update(id, updatePriceConfigDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una configuración de precio' })
  remove(@Param('id') id: string) {
    return this.priceConfigsService.remove(id);
  }
}