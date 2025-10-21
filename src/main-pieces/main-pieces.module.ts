import { Module } from '@nestjs/common';
import { MainPiecesService } from './main-pieces.service';
import { MainPiecesController } from './main-pieces.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MainPiece, MainPieceSchema } from './schemas/main-pieces.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MainPiece.name, schema: MainPieceSchema },
    ]),
  ],
  providers: [MainPiecesService],
  controllers: [MainPiecesController],
  exports: [MainPiecesService],
})
export class MainPiecesModule { }
