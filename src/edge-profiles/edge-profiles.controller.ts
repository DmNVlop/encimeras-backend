// src/edge-profiles/edge-profiles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { EdgeProfilesService } from "./edge-profiles.service";
import { CreateEdgeProfileDto } from "./dto/create-edge-profile.dto";
import { UpdateEdgeProfileDto } from "./dto/update-edge-profile.dto";
import { DeleteEdgeProfilesDto } from "./dto/delete-edge-profile.dto";

import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@ApiTags("Edge Profiles")
@Controller("edge-profiles")
export class EdgeProfilesController {
  constructor(private readonly service: EdgeProfilesService) {}

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
  create(@Body() createDto: CreateEdgeProfileDto) {
    return this.service.create(createDto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  update(@Param("id") id: string, @Body() updateDto: UpdateEdgeProfileDto) {
    return this.service.update(id, updateDto);
  }

  @Delete()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Eliminar uno o más cantos (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@Body() deleteEdgeProfilesDto: DeleteEdgeProfilesDto) {
    return this.service.remove(deleteEdgeProfilesDto.ids);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Eliminar un EdgeProfile por ID (Solo Admin)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeOne(@Param("id") id: string) {
    return this.service.remove([id]);
  }
}
