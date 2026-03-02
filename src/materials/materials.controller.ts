// src/materials/materials.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards, Query } from "@nestjs/common";
import { MaterialsService } from "./materials.service";
import { CreateMaterialDto } from "./dto/create-material.dto";
import { UpdateMaterialDto } from "./dto/update-material.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DeleteMaterialsDto } from "./dto/delete-material.dto";

import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@ApiTags("Materials")
@Controller("materials")
@UseGuards(RolesGuard) // Aplicamos RolesGuard a nivel de controlador
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ summary: "Obtener todos los materiales (Público)" })
  findAll(@Query("fields") fields?: string) {
    return this.materialsService.findAll(fields);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un material por ID (Público)" })
  findOne(@Param("id") id: string) {
    return this.materialsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Crear un nuevo material (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialsService.create(createMaterialDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar un material (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param("id") id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialsService.update(id, updateMaterialDto);
  }

  @Delete()
  @ApiOperation({ summary: "Eliminar uno o más materiales (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  remove(@Body() deleteMaterialsDto: DeleteMaterialsDto) {
    return this.materialsService.remove(deleteMaterialsDto.ids);
  }

  // Mantenemos el endpoint antiguo por si se necesita para un borrado simple,
  // aunque la nueva lógica ya lo cubre.
  @Delete(":id")
  @ApiOperation({ summary: "Eliminar un material por ID (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  removeOne(@Param("id") id: string) {
    return this.materialsService.remove([id]);
  }
}
