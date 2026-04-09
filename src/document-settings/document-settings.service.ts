import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DocumentSettings, DocumentSettingsDocument } from "./schemas/document-settings.schema";
import { CreateDocumentSettingsDto } from "./dto/create-document-settings.dto";
import { UpdateDocumentSettingsDto } from "./dto/update-document-settings.dto";

@Injectable()
export class DocumentSettingsService {
  constructor(
    @InjectModel(DocumentSettings.name)
    private documentSettingsModel: Model<DocumentSettingsDocument>,
  ) {}

  async create(createDto: CreateDocumentSettingsDto, factoryId: string): Promise<DocumentSettings> {
    const userId = createDto.userId ?? null;

    const existing = await this.documentSettingsModel.findOne({ factoryId, userId }).exec();
    if (existing) {
      return this.documentSettingsModel.findOneAndUpdate({ factoryId, userId }, createDto, { new: true, upsert: true }).exec();
    }

    const created = new this.documentSettingsModel({
      ...createDto,
      factoryId,
      userId,
    });
    return created.save();
  }

  async findByFactory(factoryId: string, userId?: string): Promise<DocumentSettings | null> {
    if (userId) {
      const userSettings = await this.documentSettingsModel.findOne({ factoryId, userId }).exec();
      if (userSettings) return userSettings;
    }

    return this.documentSettingsModel.findOne({ factoryId, userId: null }).exec();
  }

  async findOne(id: string, factoryId: string): Promise<DocumentSettings> {
    const settings = await this.documentSettingsModel.findOne({ _id: id, factoryId }).exec();
    if (!settings) {
      throw new NotFoundException(`Document Settings with ID "${id}" not found`);
    }
    return settings;
  }

  async update(id: string, updateDto: UpdateDocumentSettingsDto, factoryId: string): Promise<DocumentSettings> {
    const updated = await this.documentSettingsModel.findOneAndUpdate({ _id: id, factoryId }, updateDto, { new: true }).exec();

    if (!updated) {
      throw new NotFoundException(`Document Settings with ID "${id}" not found`);
    }
    return updated;
  }

  async remove(id: string, factoryId: string): Promise<void> {
    const result = await this.documentSettingsModel.deleteOne({ _id: id, factoryId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Document Settings with ID "${id}" not found`);
    }
  }

  async getValidityDays(factoryId: string, userId?: string): Promise<number> {
    const settings = await this.findByFactory(factoryId, userId);
    return settings?.validityDays ?? 30;
  }

  async getFooterText(factoryId: string, userId?: string): Promise<string> {
    const settings = await this.findByFactory(factoryId, userId);
    return (
      settings?.footerText ??
      "Presupuesto válido por 30 días desde su emisión. Pasado este plazo será necesaria una nueva validación de precios y condiciones. Validez 30 días."
    );
  }
}
