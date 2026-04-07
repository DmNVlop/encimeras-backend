// src/quotes/quotes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { CalculateQuoteDto } from "./dto/quote.dto";
import { AddPieceDto } from "./dto/add-piece.dto";
import { UpdatePieceInQuoteDto } from "./dto/update-piece-in-quote.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { QuotesService } from "./quotes.service";

import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";

@ApiTags("Quotes")
@Controller("quotes")
@UseGuards(RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post("calculate")
  @ApiOperation({ summary: "Calculate a quote price in real-time" })
  @UsePipes(ValidationPipe)
  async calculatePrice(@Body() calculateQuoteDto: CalculateQuoteDto) {
    const result = await this.quotesService.calculate(calculateQuoteDto);
    return result;
  }

  @Post()
  @ApiOperation({ summary: "Create and save a new quote" })
  @UsePipes(ValidationPipe)
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Post(":id/pieces")
  @ApiOperation({ summary: "Add a piece to an existing quote" })
  @UsePipes(ValidationPipe)
  addPiece(@Param("id") id: string, @Body() addPieceDto: AddPieceDto) {
    return this.quotesService.addPiece(id, addPieceDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Patch(":id/pieces/:pieceId")
  @ApiOperation({ summary: "Update a piece in an existing quote" })
  @UsePipes(ValidationPipe)
  updatePiece(@Param("id") id: string, @Param("pieceId") pieceId: string, @Body() updatePieceDto: UpdatePieceInQuoteDto) {
    return this.quotesService.updatePiece(id, pieceId, updatePieceDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Delete(":id/pieces/:pieceId")
  @ApiOperation({ summary: "Remove a piece from an existing quote" })
  removePiece(@Param("id") id: string, @Param("pieceId") pieceId: string) {
    return this.quotesService.removePiece(id, pieceId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Get()
  @ApiOperation({ summary: "Get all quotes (Admin & Sales)" })
  findAll() {
    return this.quotesService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Get(":id")
  @ApiOperation({ summary: "Get a single quote by ID (Admin & Sales)" })
  findOne(@Param("id") id: string) {
    return this.quotesService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Patch(":id")
  @ApiOperation({ summary: "Update a quote status (Admin & Sales)" })
  update(@Param("id") id: string, @Body() status: { status: string }) {
    return this.quotesService.update(id, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Delete(":id")
  @ApiOperation({ summary: "Delete a quote (Solo Admin)" })
  remove(@Param("id") id: string) {
    return this.quotesService.remove(id);
  }
}
