/** Embudo de presupuestos: cuántos presupuestos distintos (quoteTraceId) llegaron a cada paso. */
export interface QuoteFunnelDto {
  quotes: number;
  calculated: number;
  pdfDownloaded: number;
  draftSaved: number;
  cartAdded: number;
  ordered: number;
  /** Último precio conocido de cada presupuesto, sumado. */
  quotedPoints: number;
  /** Precio congelado al pedir (snapshot del evento ORDERED), sumado. */
  orderedPoints: number;
}

export interface ActivityRowDto extends QuoteFunnelDto {
  /** userId o customerId; null = presupuestos sin sesión (configurador público). */
  id: string | null;
  name: string;
  email?: string;
}

export interface ActivityDto {
  funnel: QuoteFunnelDto;
  byUser: ActivityRowDto[];
  byCustomer: ActivityRowDto[];
  /** Fecha del primer evento real (no reconstruido): desde ahí se miden cálculos y descargas de PDF. */
  trackedSince: string | null;
}

export interface PortalOrderDto {
  id: string;
  orderNumber: string;
  orderName: string;
  status: string;
  totalPoints: number;
  totalDiscount: number;
  orderDate: string;
  customerName?: string;
}

export interface PortalDraftDto {
  id: string;
  name: string;
  currentPricePoints: number;
  discountAmount: number;
  updatedAt: string;
  expirationDate: string;
}

/** Resumen del portal: lo que el usuario puede ver según su alcance (USER = lo suyo). */
export interface PortalSummaryDto {
  scope: "all" | "factory" | "team" | "own";
  orders: {
    total: number;
    totalPoints: number;
    totalOriginalPoints: number;
    totalDiscount: number;
    byStatus: { status: string; count: number; points: number }[];
    recent: PortalOrderDto[];
  };
  drafts: {
    active: number;
    expiringSoon: number;
    activePoints: number;
    recent: PortalDraftDto[];
  };
  activity: ActivityDto;
}
