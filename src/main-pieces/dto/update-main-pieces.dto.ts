import { PartialType } from '@nestjs/mapped-types';
import { CreateMainPieceDto } from './create-main-pieces.dto';

export class UpdateMainPieceDto extends PartialType(CreateMainPieceDto) { }
