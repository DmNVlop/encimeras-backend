import { Injectable } from "@nestjs/common";
import { IStorageStrategy } from "../interfaces/storage-strategy.interface";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class LocalStorageStrategy implements IStorageStrategy {
  private readonly uploadPath = "./public/uploads"; // O donde sirvas tus estáticos

  constructor() {
    // Asegurar que la carpeta existe al iniciar
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  async save(file: Buffer, filename: string): Promise<string> {
    const fullPath = path.join(this.uploadPath, filename);
    await fs.writeFile(fullPath, file);
    // Retornamos la URL relativa (ajusta según tu ServeStaticModule)
    return `/uploads/${filename}`;
  }

  async delete(filename: string): Promise<void> {
    const fullPath = path.join(this.uploadPath, filename);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.warn(`Could not delete file ${filename}:`, error);
    }
  }
}
