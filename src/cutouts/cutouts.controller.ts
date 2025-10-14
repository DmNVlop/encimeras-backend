// src/cutouts/cutouts.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { CutoutsService } from './cutouts.service';
import { CreateCutoutDto } from './dto/create-cutout.dto';
import { UpdateCutoutDto } from './dto/update-cutout.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { DeleteCutoutsDto } from './dto/delete-cutout.dto';

@ApiTags('Cutouts')
@Controller('cutouts')
export class CutoutsController {
  constructor(private readonly service: CutoutsService) { }

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  create(@Body() createDto: CreateCutoutDto) { return this.service.create(createDto); }

  @Patch(':id')
  @ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  update(@Param('id') id: string, @Body() updateDto: UpdateCutoutDto) { return this.service.update(id, updateDto); }

  @Delete()
  @ApiOperation({ summary: 'Eliminar uno o más Cortes (Protegido)' })
  @ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
  @UseGuards(JwtAuthGuard)
  remove(@Body() deleteCutoutsDto: DeleteCutoutsDto) {
    return this.service.remove(deleteCutoutsDto.ids);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un Cortes por ID (Protegido)' })
  @ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
  @UseGuards(JwtAuthGuard)
  removeOne(@Param('id') id: string) {
    return this.service.remove([id]);
  }

}