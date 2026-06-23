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
  appliedGlobalRules: {
    ruleId: string;
    ruleName: string;
    discountAmount: number;
  }[];
  appliedRulesByItem?: {
    itemIndex: number;
    appliedRules: {
      ruleId: string;
      ruleName: string;
      discountAmount: number;
    }[];
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

  async calculateDiscounts(items: DiscountableItem[], factoryId: string, customerId?: string | any): Promise<DiscountEngineResult> {
    const activeRules = await this.discountRulesService.findActiveRules(factoryId);
    const normalizedCustomerId = customerId ? customerId.toString() : undefined;

    const applicableRules = activeRules.filter((rule) => {
      if (!rule.conditions || !rule.conditions.customerStrategy || rule.conditions.customerStrategy === CustomerStrategy.ALL) return true;
      if (
        rule.conditions.customerStrategy === CustomerStrategy.SPECIFIC_CUSTOMERS &&
        normalizedCustomerId &&
        rule.conditions.targetCustomers?.map((id) => id.toString()).includes(normalizedCustomerId)
      ) {
        return true;
      }
      return false;
    });

    const originalTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const appliedRulesSummary: any[] = [];
    // Map<itemIndex, Map<ruleId, discountAmount>> — descuento real por regla por ítem
    const appliedRulesByItemMap: Map<number, Map<string, number>> = new Map();

    const itemBreakdown = items.map((item, idx) => {
      appliedRulesByItemMap.set(idx, new Map());
      return {
        itemId: item.id,
        itemIndex: idx,
        originalPrice: item.price,
        finalPrice: item.price,
        discountAmount: 0,
        currentPrice: item.price,
      };
    });

    let isStackableBlocked = false;

    for (const rule of applicableRules) {
      if (isStackableBlocked) break;

      let ruleApplied = false;
      let ruleTotalDiscount = 0;
      const ruleId = (rule as any)._id;

      if (rule.scope === DiscountScope.GLOBAL_TOTAL) {
        const currentGlobalTotal = itemBreakdown.reduce((sum, ib) => {
          const source = items.find((i) => i.id === ib.itemId);
          return sum + ib.currentPrice * (source?.quantity || 1);
        }, 0);

        if (rule.conditions?.minOrderValue && currentGlobalTotal < rule.conditions.minOrderValue) {
          continue;
        }

        const discountResult = this.calculateRuleValue(rule, currentGlobalTotal);
        if (discountResult > 0) {
          ruleTotalDiscount = discountResult;
          const ratio = (currentGlobalTotal - discountResult) / currentGlobalTotal;

          itemBreakdown.forEach((ib) => {
            const oldPrice = ib.currentPrice;
            ib.currentPrice = ib.currentPrice * ratio;
            const itemDiscount = oldPrice - ib.currentPrice;
            ib.discountAmount += itemDiscount;
            ib.finalPrice = ib.currentPrice;
            const ruleMap = appliedRulesByItemMap.get(ib.itemIndex)!;
            ruleMap.set(ruleId, (ruleMap.get(ruleId) ?? 0) + itemDiscount);
          });

          ruleApplied = true;
        }
      } else {
        for (const ib of itemBreakdown) {
          const source = items.find((i) => i.id === ib.itemId);
          if (!source) continue;

          const isMatch =
            (rule.scope === DiscountScope.SPECIFIC_MATERIALS && rule.targetMaterials?.includes(source.id)) ||
            (rule.scope === DiscountScope.MATERIAL_CATEGORIES && rule.targetCategories?.includes(source.category));

          if (isMatch) {
            const discount = this.calculateRuleValue(rule, ib.currentPrice);
            if (discount > 0) {
              ib.currentPrice -= discount;
              ib.discountAmount += discount;
              ib.finalPrice = ib.currentPrice;
              ruleTotalDiscount += discount * source.quantity;
              ruleApplied = true;
              const ruleMap = appliedRulesByItemMap.get(ib.itemIndex)!;
              ruleMap.set(ruleId, (ruleMap.get(ruleId) ?? 0) + discount * source.quantity);
            }
          }
        }
      }

      if (ruleApplied) {
        appliedRulesSummary.push({
          ruleId,
          ruleName: rule.name,
          discountAmount: ruleTotalDiscount,
        });

        if (rule.stackable === false) {
          isStackableBlocked = true;
        }
      }
    }

    const finalTotal = itemBreakdown.reduce((sum, ib) => {
      const source = items.find((i) => i.id === ib.itemId);
      return sum + ib.currentPrice * (source?.quantity || 1);
    }, 0);

    // Build appliedRulesByItem array con descuento real por regla por ítem
    const appliedRulesByItem = Array.from(appliedRulesByItemMap.entries())
      .map(([itemIndex, ruleAmounts]) => ({
        itemIndex,
        appliedRules: Array.from(ruleAmounts.entries()).map(([ruleId, discountAmount]) => {
          const summary = appliedRulesSummary.find(r => r.ruleId === ruleId);
          return {
            ruleId,
            ruleName: summary?.ruleName ?? '',
            discountAmount: Math.round(discountAmount * 100) / 100,
          };
        }),
      }));

    // Separate global rules (scope=GLOBAL_TOTAL) from all applied rules
    const appliedGlobalRules = appliedRulesSummary.filter(r => {
      const rule = applicableRules.find(ar => (ar as any)._id === r.ruleId);
      return rule?.scope === DiscountScope.GLOBAL_TOTAL;
    });

    return {
      originalTotal,
      finalTotal: Math.round(finalTotal * 100) / 100,
      totalDiscount: Math.round((originalTotal - finalTotal) * 100) / 100,
      appliedRules: appliedRulesSummary,
      appliedGlobalRules,
      appliedRulesByItem,
      itemBreakdown: itemBreakdown.map((ib) => ({
        itemId: ib.itemId,
        originalPrice: ib.originalPrice,
        finalPrice: Math.round(ib.finalPrice * 100) / 100,
        discountAmount: Math.round(ib.discountAmount * 100) / 100,
      })),
    };
  }

  private calculateRuleValue(rule: DiscountRuleDocument, baseAmount: number): number {
    if (rule.type === DiscountType.PERCENTAGE) {
      return baseAmount * (rule.value / 100);
    }
    return rule.value; // FIXED_AMOUNT
  }
}
