import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, UsePipes, UseGuards } from "@nestjs/common";
import { MainPiecesService } from "./main-pieces.service";
import { CreateMainPieceDto } from "./dto/create-main-pieces.dto";
import { UpdateMainPieceDto } from "./dto/update-main-pieces.dto";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";

import { RolesGuard } from "src/auth/guards/roles.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { Role } from "src/auth/enums/role.enum";

@Controller("main-pieces")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MainPiecesController {
  constructor(private readonly mainPiecesService: MainPiecesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Body() createMainPieceDto: CreateMainPieceDto) {
    return this.mainPiecesService.create(createMainPieceDto);
  }

  @Get()
  findAll() {
    return this.mainPiecesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.mainPiecesService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  update(@Param("id") id: string, @Body() updateMainPieceDto: UpdateMainPieceDto) {
    return this.mainPiecesService.update(id, updateMainPieceDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.mainPiecesService.remove(id);
  }
}
