import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MainPiece, MainPieceDocument } from './schemas/main-pieces.schema';
import { CreateMainPieceDto } from './dto/create-main-pieces.dto';
import { UpdateMainPieceDto } from './dto/update-main-pieces.dto';

@Injectable()
export class MainPiecesService {
    constructor(
        @InjectModel(MainPiece.name)
        private readonly mainPieceModel: Model<MainPieceDocument>,
    ) { }

    async create(createMainPieceDto: CreateMainPieceDto): Promise<MainPiece> {
        const newPiece = new this.mainPieceModel(createMainPieceDto);
        return newPiece.save();
    }

    async findAll(): Promise<MainPiece[]> {
        return this.mainPieceModel.find().populate('materialId').exec();
    }

    async findOne(id: string): Promise<MainPiece> {
        const piece = await this.mainPieceModel.findById(id).exec();
        if (!piece) {
            throw new NotFoundException(`MainPiece with ID "${id}" not found`);
        }
        return piece;
    }

    async update(
        id: string,
        updateMainPieceDto: UpdateMainPieceDto,
    ): Promise<MainPiece> {
        const updatedPiece = await this.mainPieceModel
            .findByIdAndUpdate(id, updateMainPieceDto, { new: true })
            .exec();
        if (!updatedPiece) {
            throw new NotFoundException(`MainPiece with ID "${id}" not found`);
        }
        return updatedPiece;
    }

    async remove(id: string): Promise<MainPiece> {
        const deletedPiece = await this.mainPieceModel.findByIdAndDelete(id).exec();
        if (!deletedPiece) {
            throw new NotFoundException(`MainPiece with ID "${id}" not found`);
        }
        return deletedPiece;
    }
}
