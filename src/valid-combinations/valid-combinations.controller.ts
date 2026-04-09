// src/valid-combinations/valid-combinations.controller.ts
import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, Patch, NotFoundException } from "@nestjs/common";
import { ValidCombinationsService } from "./valid-combinations.service";
import { CreateValidCombinationDto } from "./dto/create-valid-combination.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { UpdateValidCombinationDto } from "./dto/update-valid-combination.dto";

import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@ApiTags("Valid Combinations")
@Controller("valid-combinations")
export class ValidCombinationsController {
  constructor(private readonly validCombinationsService: ValidCombinationsService) {}

  @Get("available-options")
  async getAvailableOptions(@Query() query: any) {
    const { materialId, ...currentSelection } = query;
    if (!materialId) {
      throw new NotFoundException("Material ID es requerido");
    }
    return this.validCombinationsService.getAvailableOptions(materialId, currentSelection);
  }

  @Post()
  @ApiOperation({ summary: "Crear una nueva combinación válida (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createValidCombinationDto: CreateValidCombinationDto) {
    return this.validCombinationsService.create(createValidCombinationDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "Obtener todas las combinaciones válidas, opcionalmente filtradas por material (Protegido)" })
  @ApiQuery({ name: "materialId", required: false, description: "ID del material para filtrar las combinaciones" })
  findAll(@Query("materialId") materialId?: string) {
    return this.validCombinationsService.findAll(materialId);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Actualizar una combinación válida por ID (Solo Admin)" })
  update(@Param("id") id: string, @Body() updateValidCombinationDto: UpdateValidCombinationDto) {
    return this.validCombinationsService.update(id, updateValidCombinationDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Eliminar una combinación válida por ID (Solo Admin)" })
  remove(@Param("id") id: string) {
    return this.validCombinationsService.remove(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.validCombinationsService.findOne(+id);
  }
}
