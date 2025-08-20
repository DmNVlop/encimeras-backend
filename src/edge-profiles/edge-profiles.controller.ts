// src/edge-profiles/edge-profiles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { EdgeProfilesService } from './edge-profiles.service';
import { CreateEdgeProfileDto } from './dto/create-edge-profile.dto';
import { UpdateEdgeProfileDto } from './dto/update-edge-profile.dto';

@Controller('edge-profiles')
export class EdgeProfilesController {
  constructor(private readonly service: EdgeProfilesService) { }
  @Post() @UsePipes(ValidationPipe) create(@Body() createDto: CreateEdgeProfileDto) { return this.service.create(createDto); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @UsePipes(ValidationPipe) update(@Param('id') id: string, @Body() updateDto: UpdateEdgeProfileDto) { return this.service.update(id, updateDto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}