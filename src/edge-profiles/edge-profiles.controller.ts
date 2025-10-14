// src/edge-profiles/edge-profiles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { EdgeProfilesService } from './edge-profiles.service';
import { CreateEdgeProfileDto } from './dto/create-edge-profile.dto';
import { UpdateEdgeProfileDto } from './dto/update-edge-profile.dto';
import { DeleteEdgeProfilesDto } from './dto/delete-edge-profile.dto';

@ApiTags('Edge Profiles')
@Controller('edge-profiles')
export class EdgeProfilesController {
  constructor(private readonly service: EdgeProfilesService) { }

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  create(@Body() createDto: CreateEdgeProfileDto) { return this.service.create(createDto); }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  update(@Param('id') id: string, @Body() updateDto: UpdateEdgeProfileDto) { return this.service.update(id, updateDto); }

  @Delete()
  @ApiOperation({ summary: 'Eliminar uno o más materiales (Protegido)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@Body() deleteEdgeProfilesDto: DeleteEdgeProfilesDto) {
    return this.service.remove(deleteEdgeProfilesDto.ids);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un EdgeProfile por ID (Protegido)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeOne(@Param('id') id: string) { return this.service.remove([id]); }
}