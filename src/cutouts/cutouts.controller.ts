// src/cutouts/cutouts.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards } from "@nestjs/common";
import { CutoutsService } from "./cutouts.service";
import { CreateCutoutDto } from "./dto/create-cutout.dto";
import { UpdateCutoutDto } from "./dto/update-cutout.dto";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { DeleteCutoutsDto } from "./dto/delete-cutout.dto";

import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@ApiTags("Cutouts")
@Controller("cutouts")
export class CutoutsController {
  constructor(private readonly service: CutoutsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createDto: CreateCutoutDto) {
    return this.service.create(createDto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param("id") id: string, @Body() updateDto: UpdateCutoutDto) {
    return this.service.update(id, updateDto);
  }

  @Delete()
  @ApiOperation({ summary: "Eliminar uno o más Cortes (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Body() deleteCutoutsDto: DeleteCutoutsDto) {
    return this.service.remove(deleteCutoutsDto.ids);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar un Cortes por ID (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeOne(@Param("id") id: string) {
    return this.service.remove([id]);
  }
}
