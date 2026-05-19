/**
 * Tipos compartidos para el desglose de precios por pieza y addon.
 * Se persiste en Cart, Draft y Order para trazabilidad completa.
 */

export interface AddonBreakdownItem {
  code: string;
  name: string;
  imageUrl?: string;
  pricePoints: number;
  measurements?: Record<string, number>;
  quantity?: number;
}

export interface PieceBreakdownItem {
  id: string;
  pieceName: string;
  materialId: string;
  materialName: string;
  materialCategory: string;
  length_mm: number;
  width_mm: number;
  basePricePoints: number;
  addons: AddonBreakdownItem[];
  subtotalPoints: number;
  discountAmount: number;
  finalPricePoints: number;
}
