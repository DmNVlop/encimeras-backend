// src/price-configs/price-configs.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { PriceConfigsService } from "./price-configs.service";
import { CreatePriceConfigDto } from "./dto/create-price-config.dto";
import { UpdatePriceConfigDto } from "./dto/update-price-config.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@ApiTags("Price Configurations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("price-configs")
export class PriceConfigsController {
  constructor(private readonly priceConfigsService: PriceConfigsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Crear una nueva configuración de precio (Solo Admin)" })
  @ApiResponse({ status: 201, description: "La configuración ha sido creada." })
  @ApiResponse({ status: 401, description: "No autorizado." })
  create(@Body() createPriceConfigDto: CreatePriceConfigDto) {
    return this.priceConfigsService.create(createPriceConfigDto);
  }

  @Get()
  @ApiOperation({ summary: "Obtener todas las configuraciones de precio" })
  findAll() {
    return this.priceConfigsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una configuración de precio por ID" })
  findOne(@Param("id") id: string) {
    return this.priceConfigsService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Actualizar una configuración de precio (Solo Admin)" })
  update(@Param("id") id: string, @Body() updatePriceConfigDto: UpdatePriceConfigDto) {
    return this.priceConfigsService.update(id, updatePriceConfigDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Eliminar una configuración de precio (Solo Admin)" })
  remove(@Param("id") id: string) {
    return this.priceConfigsService.remove(id);
  }
}
