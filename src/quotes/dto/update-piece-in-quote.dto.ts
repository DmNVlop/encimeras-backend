import { PartialType } from "@nestjs/swagger";
import { AddPieceDto } from "./add-piece.dto";

export class UpdatePieceInQuoteDto extends PartialType(AddPieceDto) {}
