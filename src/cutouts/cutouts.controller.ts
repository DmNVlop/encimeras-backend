// src/cutouts/cutouts.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { CutoutsService } from './cutouts.service';
import { CreateCutoutDto } from './dto/create-cutout.dto';
import { UpdateCutoutDto } from './dto/update-cutout.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiBearerAuth() // Esto le dice a Swagger que este endpoint requiere un token
@ApiTags('Cutouts')
@UseGuards(JwtAuthGuard)
@Controller('cutouts')
export class CutoutsController {
  constructor(private readonly service: CutoutsService) { }
  @Post() @UsePipes(ValidationPipe) create(@Body() createDto: CreateCutoutDto) { return this.service.create(createDto); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @UsePipes(ValidationPipe) update(@Param('id') id: string, @Body() updateDto: UpdateCutoutDto) { return this.service.update(id, updateDto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}