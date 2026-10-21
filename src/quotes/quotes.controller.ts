// src/quotes/quotes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UsePipes, ValidationPipe, Req } from "@nestjs/common";
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
import { DataScopeService } from "../shared/scope/data-scope.service";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { QuoteEventsService } from "../quote-events/quote-events.service";
import { QuoteEventType } from "../quote-events/schemas/quote-event.schema";

@ApiTags("Quotes")
@Controller("quotes")
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly dataScopeService: DataScopeService,
    private readonly quoteEventsService: QuoteEventsService,
  ) {}

  @Post("calculate")
  @UseGuards(OptionalJwtAuthGuard) // Público; si llega token, el cálculo queda trazado con su usuario
  @ApiOperation({ summary: "Calculate a quote price in real-time" })
  @UsePipes(ValidationPipe)
  async calculatePrice(@Body() calculateQuoteDto: CalculateQuoteDto, @GetUser() user: any) {
    const result = await this.quotesService.calculate(calculateQuoteDto);
    if (calculateQuoteDto.quoteTraceId) {
      this.quoteEventsService.record({
        quoteTraceId: calculateQuoteDto.quoteTraceId,
        type: QuoteEventType.CALCULATED,
        userId: user?.userId,
        factoryId: calculateQuoteDto.factoryId || user?.factoryId,
        customerId: calculateQuoteDto.customerId,
        totalPoints: result.finalTotalPoints,
        originalPoints: result.totalPoints,
        discountAmount: result.totalDiscount,
        piecesCount: calculateQuoteDto.mainPieces?.length,
      });
    }
    return result;
  }

  @Post()
  @ApiOperation({ summary: "Create and save a new quote" })
  @UsePipes(ValidationPipe)
  create(@Body() createQuoteDto: CreateQuoteDto, @Req() req: any) {
    const createdBy = req?.user?.userId;
    return this.quotesService.create(createQuoteDto, createdBy);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Patch(":id/pieces/:pieceId")
  @ApiOperation({ summary: "Update a piece in an existing quote" })
  @UsePipes(ValidationPipe)
  async updatePiece(@Param("id") id: string, @Param("pieceId") pieceId: string, @Body() updatePieceDto: UpdatePieceInQuoteDto, @GetUser() user: any) {
    await this.quotesService.assertInScope(id, await this.scopeFilter(user));
    return this.quotesService.updatePiece(id, pieceId, updatePieceDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALES)
  @Delete(":id/pieces/:pieceId")
  @ApiOperation({ summary: "Remove a piece from an existing quote" })
  async removePiece(@Param("id") id: string, @Param("pieceId") pieceId: string, @GetUser() user: any) {
    await this.quotesService.assertInScope(id, await this.scopeFilter(user));
    return this.quotesService.removePiece(id, pieceId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALES) // nivel 2 mínimo → MANAGER, OWNER y ADMIN también acceden
  @Get()
  @ApiOperation({ summary: "Get all quotes (Admin, Owner, Manager & Sales)" })
  async findAll(@GetUser() user: any) {
    return this.quotesService.findAll(await this.scopeFilter(user));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SALES) // nivel 2 mínimo
  @Get(":id")
  @ApiOperation({ summary: "Get a single quote by ID (Admin, Owner, Manager & Sales)" })
  async findOne(@Param("id") id: string, @GetUser() user: any) {
    return this.quotesService.findOne(id, await this.scopeFilter(user));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SALES)
  @Patch(":id")
  @ApiOperation({ summary: "Update a quote status (Admin & Sales)" })
  async update(@Param("id") id: string, @Body() status: { status: string }, @GetUser() user: any) {
    await this.quotesService.assertInScope(id, await this.scopeFilter(user));
    return this.quotesService.update(id, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(":id")
  @ApiOperation({ summary: "Delete a quote (Solo Admin)" })
  remove(@Param("id") id: string) {
    return this.quotesService.remove(id);
  }

  private async scopeFilter(user: any): Promise<Record<string, any>> {
    return this.dataScopeService.toQuoteFilter(await this.dataScopeService.resolve(user));
  }
}
