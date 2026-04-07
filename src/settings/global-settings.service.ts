import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { GlobalSettings } from "./schemas/global-settings.schema";

@Injectable()
export class GlobalSettingsService {
  constructor(@InjectModel(GlobalSettings.name) private settingsModel: Model<GlobalSettings>) {}

  async getDraftValidityDays(): Promise<number> {
    const config = await this.settingsModel.findOne({ key: "default_config" });
    return config ? config.draftValidityDays : 1;
  }

  async getMultiSalesPerCustomer(): Promise<boolean> {
    const config = await this.settingsModel.findOne({ key: "default_config" });
    return config ? config.multiSalesPerCustomer : true;
  }

  async updateMultiSalesPerCustomer(value: boolean): Promise<GlobalSettings> {
    const config = await this.settingsModel.findOneAndUpdate({ key: "default_config" }, { multiSalesPerCustomer: value }, { new: true, upsert: true });
    return config;
  }
}
