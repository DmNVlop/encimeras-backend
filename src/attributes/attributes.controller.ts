// src/attributes/attributes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { AttributesService } from "./attributes.service";
import { CreateAttributeDto } from "./dto/create-attribute.dto";
import { UpdateAttributeDto } from "./dto/update-attribute.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@ApiTags("Attributes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("attributes")
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Crear un nuevo atributo (Solo Admin)" })
  create(@Body() createAttributeDto: CreateAttributeDto) {
    return this.attributesService.create(createAttributeDto);
  }

  @Get()
  @ApiOperation({ summary: "Obtener todos los atributos, con opción de filtrar por tipo (Protegido)" })
  @ApiQuery({ name: "type", required: false, description: "Filtrar atributos por su tipo (ej. GROUP)" })
  findAll(@Query("type") type?: string) {
    return this.attributesService.findAll(type);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un atributo por ID (Protegido)" })
  findOne(@Param("id") id: string) {
    return this.attributesService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Actualizar un atributo por ID (Solo Admin)" })
  update(@Param("id") id: string, @Body() updateAttributeDto: UpdateAttributeDto) {
    return this.attributesService.update(id, updateAttributeDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Eliminar un atributo por ID (Solo Admin)" })
  remove(@Param("id") id: string) {
    return this.attributesService.remove(id);
  }
}
