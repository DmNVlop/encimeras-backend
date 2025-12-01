import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { IStorageStrategy } from "../interfaces/storage-strategy.interface";

@Injectable()
export class CloudinaryStorageStrategy implements IStorageStrategy {
  private readonly folderName = "encimeras-uploads"; // Carpeta en Cloudinary
  private readonly logger = new Logger(CloudinaryStorageStrategy.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.get<string>("CLOUDINARY_API_KEY"),
      api_secret: this.configService.get<string>("CLOUDINARY_API_SECRET"),
    });
  }

  async save(file: Buffer, filename: string, mimeType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Tu AssetsService envía "uuid.webp".
      // Cloudinary prefiere el "public_id" sin extensión para manejar transformaciones.
      const publicId = filename.split(".")[0];

      const upload = cloudinary.uploader.upload_stream(
        {
          folder: this.folderName,
          public_id: publicId, // Usamos el UUID que generó tu servicio
          resource_type: "auto", // Detecta que es imagen
          overwrite: true,
          format: "webp", // Aseguramos que Cloudinary sepa que es webp
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Error uploading to Cloudinary: ${error.message}`, error.stack);
            return reject(new InternalServerErrorException("Error uploading to Cloudinary"));
          }
          if (!result) {
            this.logger.error("Cloudinary upload successful but no result returned");
            return reject(new InternalServerErrorException("Error uploading to Cloudinary, blank result"));
          }
          // Retornamos la URL segura (HTTPS)
          resolve(result.secure_url);
        },
      );

      // Convertimos el Buffer de Sharp a Stream y lo enviamos
      Readable.from(file).pipe(upload);
    });
  }

  async delete(filename: string): Promise<void> {
    try {
      // Para borrar en Cloudinary necesitamos el "public_id" completo (carpeta/nombre sin extension)
      const nameWithoutExtension = filename.split(".")[0];
      const publicId = `${this.folderName}/${nameWithoutExtension}`;

      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.warn(`Could not delete file ${filename} from Cloudinary: ${error.message}`);
    }
  }
}
