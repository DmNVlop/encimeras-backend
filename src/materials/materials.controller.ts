// src/materials/materials.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeleteMaterialsDto } from './dto/delete-material.dto';

@ApiTags('Materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los materiales (Público)' })
  findAll() {
    return this.materialsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un material por ID (Público)' })
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo material (Protegido)' })
  @ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialsService.create(createMaterialDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un material (Protegido)' })
  @ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialsService.update(id, updateMaterialDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Eliminar uno o más materiales (Protegido)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@Body() deleteMaterialsDto: DeleteMaterialsDto) {
    return this.materialsService.remove(deleteMaterialsDto.ids);
  }

  // Mantenemos el endpoint antiguo por si se necesita para un borrado simple,
  // aunque la nueva lógica ya lo cubre.
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un material por ID (Protegido)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeOne(@Param('id') id: string) {
    return this.materialsService.remove([id]);
  }
}
