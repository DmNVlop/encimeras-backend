import { IsIn, IsMongoId, IsNotEmpty, ValidateIf } from "class-validator";

export class PdfDownloadDto {
  @IsIn(["cart", "order"])
  source: "cart" | "order";

  // Obligatorio solo si el PDF es de una orden
  @ValidateIf((dto: PdfDownloadDto) => dto.source === "order")
  @IsNotEmpty()
  @IsMongoId()
  orderId?: string;
}
