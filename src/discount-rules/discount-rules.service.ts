import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DiscountRule, DiscountRuleDocument } from "./schemas/discount-rule.schema";
import { CreateDiscountRuleDto } from "./dto/create-discount-rule.dto";
import { UpdateDiscountRuleDto } from "./dto/update-discount-rule.dto";

@Injectable()
export class DiscountRulesService {
  constructor(
    @InjectModel(DiscountRule.name)
    private discountRuleModel: Model<DiscountRuleDocument>,
  ) {}

  async create(createDiscountRuleDto: CreateDiscountRuleDto, factoryId: string): Promise<DiscountRule> {
    const createdRule = new this.discountRuleModel({
      ...createDiscountRuleDto,
      factoryId,
    });
    return createdRule.save();
  }

  async findAll(factoryId: string): Promise<DiscountRule[]> {
    return this.discountRuleModel.find({ factoryId, isActive: true }).exec();
  }

  async findOne(id: string, factoryId: string): Promise<DiscountRule> {
    const rule = await this.discountRuleModel.findOne({ _id: id, factoryId }).exec();
    if (!rule) {
      throw new NotFoundException(`Discount Rule with ID "${id}" not found`);
    }
    return rule;
  }

  async update(id: string, updateDiscountRuleDto: UpdateDiscountRuleDto, factoryId: string): Promise<DiscountRule> {
    const updatedRule = await this.discountRuleModel
      .findOneAndUpdate({ _id: id, factoryId }, updateDiscountRuleDto, {
        new: true,
      })
      .exec();

    if (!updatedRule) {
      throw new NotFoundException(`Discount Rule with ID "${id}" not found`);
    }
    return updatedRule;
  }

  async remove(id: string, factoryId: string): Promise<void> {
    const result = await this.discountRuleModel.updateOne({ _id: id, factoryId }, { isActive: false }).exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Discount Rule with ID "${id}" not found`);
    }
  }

  // Helper method for the Discount Engine
  async findActiveRules(factoryId: string): Promise<DiscountRuleDocument[]> {
    const now = new Date();
    return this.discountRuleModel
      .find({
        factoryId,
        isActive: true,
        $or: [
          { "conditions.startDate": { $lte: now }, "conditions.endDate": { $gte: now } },
          { "conditions.startDate": { $exists: false }, "conditions.endDate": { $exists: false } },
          { "conditions.startDate": null, "conditions.endDate": null },
        ],
      })
      .sort({ priority: -1 })
      .exec();
  }
}
