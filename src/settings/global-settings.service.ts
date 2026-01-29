import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { GlobalSettings } from "./schemas/global-settings.schema";

@Injectable()
export class GlobalSettingsService {
  constructor(@InjectModel(GlobalSettings.name) private settingsModel: Model<GlobalSettings>) {}

  async getDraftValidityDays(): Promise<number> {
    const config = await this.settingsModel.findOne({ key: "default_config" });
    // Si no existe config, devolvemos 15 días por defecto (Fail-safe)
    return config ? config.draftValidityDays : 1;
  }
}
