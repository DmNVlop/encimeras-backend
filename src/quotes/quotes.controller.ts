// src/quotes/quotes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { CalculateQuoteDto } from "./dto/quote.dto";
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

  // --- PUBLIC ENDPOINTS ---
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

  // --- PROTECTED ADMIN ENDPOINTS ---
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
