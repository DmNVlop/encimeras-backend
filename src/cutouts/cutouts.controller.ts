// src/cutouts/cutouts.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { CutoutsService } from './cutouts.service';
import { CreateCutoutDto } from './dto/create-cutout.dto';
import { UpdateCutoutDto } from './dto/update-cutout.dto';

@Controller('cutouts')
export class CutoutsController {
  constructor(private readonly service: CutoutsService) { }
  @Post() @UsePipes(ValidationPipe) create(@Body() createDto: CreateCutoutDto) { return this.service.create(createDto); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @UsePipes(ValidationPipe) update(@Param('id') id: string, @Body() updateDto: UpdateCutoutDto) { return this.service.update(id, updateDto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}