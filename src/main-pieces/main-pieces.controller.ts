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
import { MainPiecesService } from './main-pieces.service';
import { CreateMainPieceDto } from './dto/create-main-pieces.dto';
import { UpdateMainPieceDto } from './dto/update-main-pieces.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('main-pieces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class MainPiecesController {
    constructor(private readonly mainPiecesService: MainPiecesService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    create(@Body() createMainPieceDto: CreateMainPieceDto) {
        return this.mainPiecesService.create(createMainPieceDto);
    }

    @Get()
    findAll() {
        return this.mainPiecesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.mainPiecesService.findOne(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    update(
        @Param('id') id: string,
        @Body() updateMainPieceDto: UpdateMainPieceDto,
    ) {
        return this.mainPiecesService.update(id, updateMainPieceDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.mainPiecesService.remove(id);
    }
}
