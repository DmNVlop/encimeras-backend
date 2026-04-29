import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { FactorySettings, FactorySettingsDocument } from "./schemas/factory-settings.schema";
import { UpdateFactorySettingsDto } from "./dto/update-factory-settings.dto";
import { AssetsService } from "../assets/assets.service";

@Injectable()
export class FactorySettingsService {
  constructor(
    @InjectModel(FactorySettings.name)
    private factorySettingsModel: Model<FactorySettingsDocument>,
    private readonly assetsService: AssetsService,
  ) {}

  async findByFactory(factoryId: string): Promise<FactorySettings | null> {
    return this.factorySettingsModel.findOne({ factoryId }).exec();
  }

  async uploadLogo(factoryId: string, file: Express.Multer.File): Promise<FactorySettings> {
    // 1. Subir nuevo logo
    const { url, filename } = await this.assetsService.uploadImage(file);

    // 2. Leer settings actuales para borrar logo anterior
    const current = await this.factorySettingsModel.findOne({ factoryId }).exec();
    if (current?.logoFilename) {
      await this.assetsService.deleteImage(current.logoFilename).catch(() => {
        // No bloquear si el archivo ya no existe en storage
      });
    }

    // 3. Upsert con nuevo logo
    const updated = await this.factorySettingsModel
      .findOneAndUpdate(
        { factoryId },
        { logoUrl: url, logoFilename: filename },
        { new: true, upsert: true },
      )
      .exec();

    return updated;
  }

  async deleteLogo(factoryId: string): Promise<FactorySettings> {
    const current = await this.factorySettingsModel.findOne({ factoryId }).exec();
    if (!current) {
      throw new NotFoundException(`Factory settings for factory "${factoryId}" not found`);
    }

    if (current.logoFilename) {
      await this.assetsService.deleteImage(current.logoFilename).catch(() => {});
    }

    const updated = await this.factorySettingsModel
      .findOneAndUpdate({ factoryId }, { logoUrl: null, logoFilename: null }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Factory settings for factory "${factoryId}" not found`);
    }

    return updated;
  }

  async update(factoryId: string, dto: UpdateFactorySettingsDto): Promise<FactorySettings> {
    const updated = await this.factorySettingsModel
      .findOneAndUpdate({ factoryId }, dto, { new: true, upsert: true })
      .exec();
    return updated;
  }

  async getLogoUrl(factoryId: string): Promise<string | null> {
    const settings = await this.findByFactory(factoryId);
    return settings?.logoUrl ?? null;
  }

  async getMultiAssignedUsersPerCustomer(factoryId: string): Promise<boolean> {
    const settings = await this.factorySettingsModel.findOne({ factoryId }).exec();
    return settings?.multiAssignedUsersPerCustomer ?? true;
  }

  async updateMultiAssignedUsersPerCustomer(factoryId: string, value: boolean): Promise<FactorySettings> {
    const updated = await this.factorySettingsModel
      .findOneAndUpdate({ factoryId }, { multiAssignedUsersPerCustomer: value }, { new: true, upsert: true })
      .exec();
    return updated;
  }
}
