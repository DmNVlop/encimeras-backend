// src/quotes/quotes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CalculateQuoteDto } from './dto/quote.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';

@ApiTags('Quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) { }

  // --- PUBLIC ENDPOINTS ---
  @Post('calculate')
  @ApiOperation({ summary: 'Calculate a quote price in real-time' })
  @UsePipes(ValidationPipe)
  calculatePrice(@Body() calculateQuoteDto: CalculateQuoteDto) {
    return this.quotesService.calculate(calculateQuoteDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create and save a new quote' })
  @UsePipes(ValidationPipe)
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
  }

  // --- PROTECTED ADMIN ENDPOINTS ---
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all quotes (Admin)' })
  findAll() {
    return this.quotesService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a single quote by ID (Admin)' })
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a quote status (Admin)' })
  update(@Param('id') id: string, @Body() status: { status: string }) {
    return this.quotesService.update(id, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote (Admin)' })
  remove(@Param('id') id: string) {
    return this.quotesService.remove(id);
  }
}
