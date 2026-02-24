import { Injectable } from "@nestjs/common";
import { DiscountRulesService } from "./discount-rules.service";
import { CollisionStrategy, CustomerStrategy, DiscountScope, DiscountType } from "./enums/discount-rule.enums";
import { DiscountRuleDocument } from "./schemas/discount-rule.schema";

export interface DiscountableItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

export interface DiscountEngineResult {
  originalTotal: number;
  finalTotal: number;
  totalDiscount: number;
  appliedRules: {
    ruleId: string;
    ruleName: string;
    discountAmount: number;
  }[];
  itemBreakdown: {
    itemId: string;
    originalPrice: number;
    finalPrice: number;
    discountAmount: number;
  }[];
}

@Injectable()
export class DiscountEngineService {
  constructor(private readonly discountRulesService: DiscountRulesService) {}

  async calculateDiscounts(items: DiscountableItem[], factoryId: string, customerId?: string): Promise<DiscountEngineResult> {
    const activeRules = await this.discountRulesService.findActiveRules(factoryId);

    // Filter rules based on customer strategy
    const applicableRules = activeRules.filter((rule) => {
      if (rule.conditions?.customerStrategy === CustomerStrategy.ALL) return true;
      if (
        rule.conditions?.customerStrategy === CustomerStrategy.SPECIFIC_CUSTOMERS &&
        customerId &&
        rule.conditions.targetCustomers?.map((id) => id.toString()).includes(customerId)
      ) {
        return true;
      }
      return false;
    });

    let currentTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const originalTotal = currentTotal;
    const appliedRulesSummary: any[] = [];
    const itemBreakdown = items.map((item) => ({
      itemId: item.id,
      originalPrice: item.price,
      finalPrice: item.price,
      discountAmount: 0,
      currentPrice: item.price, // Temp field for calculations
    }));

    // 1. Apply Rules by Scope: SPECIFIC_MATERIALS and MATERIAL_CATEGORIES first
    const itemLevelRules = applicableRules.filter((r) => r.scope !== DiscountScope.GLOBAL_TOTAL);

    // 2. Apply GLOBAL_TOTAL rules later
    const globalRules = applicableRules.filter((r) => r.scope === DiscountScope.GLOBAL_TOTAL);

    // Group item rules by priority and type for collision handling
    // For simplicity in this first robust version, we'll process them strictly by priority

    // 1. Process Item-level rules (Specific Materials or Categories)
    // Pass 1: Percentages
    for (const rule of itemLevelRules.filter((r) => r.type === DiscountType.PERCENTAGE)) {
      this.applyRuleToItems(rule, itemBreakdown, items, appliedRulesSummary);
    }
    // Pass 2: Fixed Amounts
    for (const rule of itemLevelRules.filter((r) => r.type === DiscountType.FIXED_AMOUNT)) {
      this.applyRuleToItems(rule, itemBreakdown, items, appliedRulesSummary);
    }

    // Recalculate total after item discounts
    currentTotal = itemBreakdown.reduce((sum, item) => {
      const sourceItem = items.find((i) => i.id === item.itemId);
      return sum + item.finalPrice * (sourceItem?.quantity || 1);
    }, 0);

    // 2. Process Global rules
    // Pass 1: Percentages
    for (const rule of globalRules.filter((r) => r.type === DiscountType.PERCENTAGE)) {
      currentTotal = this.applyGlobalRule(rule, currentTotal, appliedRulesSummary);
    }
    // Pass 2: Fixed Amounts
    for (const rule of globalRules.filter((r) => r.type === DiscountType.FIXED_AMOUNT)) {
      currentTotal = this.applyGlobalRule(rule, currentTotal, appliedRulesSummary);
    }

    return {
      originalTotal,
      finalTotal: currentTotal,
      totalDiscount: originalTotal - currentTotal,
      appliedRules: appliedRulesSummary,
      itemBreakdown: itemBreakdown.map(({ itemId, originalPrice, finalPrice, discountAmount }) => ({
        itemId,
        originalPrice,
        finalPrice,
        discountAmount,
      })),
    };
  }

  private applyRuleToItems(rule: DiscountRuleDocument, itemBreakdown: any[], items: DiscountableItem[], summary: any[]) {
    let ruleApplied = false;
    let ruleTotalDiscount = 0;

    for (const item of itemBreakdown) {
      const sourceItem = items.find((i) => i.id === item.itemId);
      if (!sourceItem) continue;

      const isMaterialMatch = rule.scope === DiscountScope.SPECIFIC_MATERIALS && rule.targetMaterials?.includes(sourceItem.id);

      const isCategoryMatch = rule.scope === DiscountScope.MATERIAL_CATEGORIES && rule.targetCategories?.includes(sourceItem.category);

      if (isMaterialMatch || isCategoryMatch) {
        let discount = 0;
        if (rule.type === DiscountType.PERCENTAGE) {
          discount = item.currentPrice * (rule.value / 100);
        } else {
          discount = rule.value;
        }

        item.currentPrice -= discount;
        item.discountAmount += discount;
        item.finalPrice = item.currentPrice;
        ruleTotalDiscount += discount * sourceItem.quantity;
        ruleApplied = true;
      }
    }

    if (ruleApplied) {
      summary.push({
        ruleId: (rule as any)._id,
        ruleName: rule.name,
        discountAmount: ruleTotalDiscount,
      });
    }
  }

  private applyGlobalRule(rule: DiscountRuleDocument, currentTotal: number, summary: any[]): number {
    if (rule.conditions?.minOrderValue && currentTotal < rule.conditions.minOrderValue) {
      return currentTotal;
    }

    let discount = 0;
    if (rule.type === DiscountType.PERCENTAGE) {
      discount = currentTotal * (rule.value / 100);
    } else {
      discount = rule.value;
    }

    summary.push({
      ruleId: (rule as any)._id,
      ruleName: rule.name,
      discountAmount: discount,
    });

    return currentTotal - discount;
  }
}
