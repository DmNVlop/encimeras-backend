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
import { GetUser } from "../auth/decorators/get-user.decorator";

@ApiTags("Quotes")
@Controller("quotes")
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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OWNER, Role.SALES)
  @Get()
  @ApiOperation({ summary: "Get all quotes (Admin, Owner & Sales)" })
  findAll(@GetUser() user: any) {
    const factoryId = user?.factoryId;
    if (user?.roles.includes(Role.OWNER) && factoryId) {
      return this.quotesService.findAllByFactory(factoryId);
    }
    return this.quotesService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OWNER, Role.SALES)
  @Get(":id")
  @ApiOperation({ summary: "Get a single quote by ID (Admin, Owner & Sales)" })
  findOne(@Param("id") id: string, @GetUser() user: any) {
    const factoryId = user?.factoryId;
    if (user?.roles.includes(Role.OWNER) && factoryId) {
      return this.quotesService.findOneByFactory(id, factoryId);
    }
    return this.quotesService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
