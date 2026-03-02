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

  async calculateDiscounts(items: DiscountableItem[], factoryId: string, customerId?: string | any): Promise<DiscountEngineResult> {
    // Obtener reglas activas y aplicables según cliente
    const activeRules = await this.discountRulesService.findActiveRules(factoryId);

    // Aseguramos que customerId sea un string primitivo (no un ObjectId)
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
    const itemBreakdown = items.map((item) => ({
      itemId: item.id,
      originalPrice: item.price,
      finalPrice: item.price,
      discountAmount: 0,
      currentPrice: item.price, // Precio que va variando con cada regla
    }));

    // El motor procesa reglas en orden de prioridad (findActiveRules ya las trae ordenadas DESC por priority)
    // Para cada regla, verificamos si se puede aplicar (stackability)
    let isStackableBlocked = false;

    for (const rule of applicableRules) {
      if (isStackableBlocked) break;

      let ruleApplied = false;
      let ruleTotalDiscount = 0;

      if (rule.scope === DiscountScope.GLOBAL_TOTAL) {
        // --- REGLA GLOBAL ---
        const currentGlobalTotal = itemBreakdown.reduce((sum, ib) => {
          const source = items.find((i) => i.id === ib.itemId);
          return sum + ib.currentPrice * (source?.quantity || 1);
        }, 0);

        // Validar minOrderValue
        if (rule.conditions?.minOrderValue && currentGlobalTotal < rule.conditions.minOrderValue) {
          continue;
        }

        const discountResult = this.calculateRuleValue(rule, currentGlobalTotal);
        if (discountResult > 0) {
          // Repartimos el descuento proporcionalmente entre los items para mantener consistencia
          // O lo aplicamos al total (aquí lo aplicamos al total interno)
          ruleTotalDiscount = discountResult;

          // Ajustar proporcionalmente cada item (Cascade)
          const ratio = (currentGlobalTotal - discountResult) / currentGlobalTotal;
          itemBreakdown.forEach((ib) => {
            const oldPrice = ib.currentPrice;
            ib.currentPrice = ib.currentPrice * ratio;
            ib.discountAmount += oldPrice - ib.currentPrice;
            ib.finalPrice = ib.currentPrice;
          });

          ruleApplied = true;
        }
      } else {
        // --- REGLA POR ITEM / CATEGORIA ---
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
            }
          }
        }
      }

      if (ruleApplied) {
        appliedRulesSummary.push({
          ruleId: (rule as any)._id,
          ruleName: rule.name,
          discountAmount: ruleTotalDiscount,
        });

        // Si la regla dice que NO es stackable, bloqueamos las siguientes de menor prioridad
        if (rule.stackable === false) {
          isStackableBlocked = true;
        }
      }
    }

    const finalTotal = itemBreakdown.reduce((sum, ib) => {
      const source = items.find((i) => i.id === ib.itemId);
      return sum + ib.currentPrice * (source?.quantity || 1);
    }, 0);

    return {
      originalTotal,
      finalTotal: Math.round(finalTotal * 100) / 100,
      totalDiscount: Math.round((originalTotal - finalTotal) * 100) / 100,
      appliedRules: appliedRulesSummary,
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
