import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { type IStorageStrategy } from "./interfaces/storage-strategy.interface";

@Injectable()
export class AssetsService {
  constructor(@Inject("STORAGE_STRATEGY") private readonly storage: IStorageStrategy) {}

  async uploadImage(file: Express.Multer.File) {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      throw new BadRequestException("Formato no soportado. Use JPG, PNG o WEBP");
    }

    // 1. Optimización con Sharp
    // Convertimos a WebP y Redimensionamos inteligentemente
    const optimizedBuffer = await sharp(file.buffer)
      .resize({
        width: 800, // Límite seguro para web
        height: 800,
        fit: "inside", // Respeta aspecto, no corta
        withoutEnlargement: true, // CRUCIAL: Si es pequeña, NO la escala
      })
      .webp({ quality: 80 }) // Compresión WebP al 80%
      .toBuffer();

    // 2. Generar nombre único
    const filename = `${uuidv4()}.webp`;

    // 3. Guardar usando la estrategia configurada
    const url = await this.storage.save(optimizedBuffer, filename, "image/webp");

    return {
      url,
      filename,
      originalName: file.originalname,
    };
  }
}
