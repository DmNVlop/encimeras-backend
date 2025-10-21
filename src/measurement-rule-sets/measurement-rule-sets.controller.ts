import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ValidationPipe,
    UsePipes,
    UseGuards,
} from '@nestjs/common';
import { MeasurementRuleSetsService } from './measurement-rule-sets.service';
import { CreateMeasurementRuleSetDto } from './dto/create-measurement-rule-sets.dto';
import { UpdateMeasurementRuleSetDto } from './dto/update-measurement-rule-sets.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('measurement-rule-sets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class MeasurementRuleSetsController {
    constructor(
        private readonly measurementRuleSetsService: MeasurementRuleSetsService,
    ) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    create(@Body() createDto: CreateMeasurementRuleSetDto) {
        return this.measurementRuleSetsService.create(createDto);
    }

    @Get()
    findAll() {
        return this.measurementRuleSetsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.measurementRuleSetsService.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    update(@Param('id') id: string, @Body() updateDto: UpdateMeasurementRuleSetDto) {
        return this.measurementRuleSetsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.measurementRuleSetsService.remove(id);
    }
}