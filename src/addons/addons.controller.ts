import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UsePipes,
    ValidationPipe,
    UseGuards,
} from '@nestjs/common';
import { AddonsService } from './addons.service';
import { CreateAddonDto } from './dto/create-addons.dto';
import { UpdateAddonDto } from './dto/update-addons.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('addons')
export class AddonsController {
    constructor(private readonly addonsService: AddonsService) { }

    @Get()
    findAll() {
        return this.addonsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.addonsService.findOne(id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    create(@Body() createAddonDto: CreateAddonDto) {
        return this.addonsService.create(createAddonDto);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    update(@Param('id') id: string, @Body() updateAddonDto: UpdateAddonDto) {
        return this.addonsService.update(id, updateAddonDto);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.addonsService.remove(id);
    }
}
