import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BACKFILL_SOURCE, QuoteEvent, QuoteEventType } from "../quote-events/schemas/quote-event.schema";
import { DisplayNamesService } from "../shared/display-names/display-names.service";
import { Order } from "../orders/schemas/order.schema";
import { Draft } from "../drafts/schemas/draft.schema";
import { DataScope, DataScopeService, ScopeUser } from "../shared/scope/data-scope.service";
import { ActivityQueryDto } from "./dto/activity-query.dto";
import { ActivityDto, ActivityRowDto, PortalSummaryDto, QuoteFunnelDto } from "./dto/activity.dto";

const RECENT_LIMIT = 5;
const EXPIRING_SOON_DAYS = 7;

/** Contadores del embudo, comunes a los tres agrupados ($facet). */
const FUNNEL_GROUP = {
  quotes: { $sum: 1 },
  calculated: { $sum: "$calculated" },
  pdfDownloaded: { $sum: "$pdfDownloaded" },
  draftSaved: { $sum: "$draftSaved" },
  cartAdded: { $sum: "$cartAdded" },
  ordered: { $sum: "$ordered" },
  quotedPoints: { $sum: "$quotedPoints" },
  orderedPoints: { $sum: "$orderedPoints" },
};

const hasType = (...types: QuoteEventType[]) => ({ $cond: [{ $or: types.map((type) => ({ $in: [type, "$types"] })) }, 1, 0] });
const nonNull = (field: string) => ({ $filter: { input: field, cond: { $ne: ["$$this", null] } } });
const firstNonNull = (field: string) => ({ $arrayElemAt: [nonNull(field), 0] });
const lastNonNull = (field: string) => ({ $arrayElemAt: [nonNull(field), -1] });

/**
 * Actividad de presupuestos a partir de `quote_events` (embudo por usuario y por cliente)
 * y resumen del portal. Todo filtrado por la política única de alcance (DataScopeService).
 */
@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(QuoteEvent.name) private quoteEventModel: Model<QuoteEvent>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Draft.name) private draftModel: Model<Draft>,
    private dataScopeService: DataScopeService,
    private displayNames: DisplayNamesService,
  ) {}

  async getActivity(query: ActivityQueryDto, user: ScopeUser): Promise<ActivityDto> {
    const scope = await this.dataScopeService.resolve(user);
    const match: Record<string, any> = { ...this.dataScopeService.toQuoteEventFilter(scope) };
    // Solo ADMIN puede acotar a una fábrica concreta.
    if (scope.kind === "all" && query.factoryId) match.factoryId = query.factoryId;
    const createdAt = this.dateRange(query.startDate, query.endDate);
    if (createdAt) match.createdAt = createdAt;
    return this.aggregateActivity(match);
  }

  async getPortalSummary(user: ScopeUser): Promise<PortalSummaryDto> {
    const scope = await this.dataScopeService.resolve(user);
    const [orders, drafts, activity] = await Promise.all([
      this.portalOrders(scope),
      this.portalDrafts(scope),
      this.aggregateActivity(this.dataScopeService.toQuoteEventFilter(scope)),
    ]);
    return { scope: this.scopeLabel(scope), orders, drafts, activity };
  }

  /**
   * Un presupuesto (quoteTraceId) cuenta una vez en cada paso al que llegó dentro del filtro.
   * Se atribuye al primer usuario con sesión que actuó sobre él y al último cliente conocido.
   */
  private async aggregateActivity(match: Record<string, any>): Promise<ActivityDto> {
    const [result] = await this.quoteEventModel.aggregate([
      { $match: match },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$quoteTraceId",
          types: { $addToSet: "$type" },
          userIds: { $push: { $ifNull: ["$userId", null] } },
          customerIds: { $push: { $ifNull: ["$customerId", null] } },
          points: { $push: { $ifNull: ["$totalPoints", null] } },
          orderedPoints: { $max: { $cond: [{ $eq: ["$type", QuoteEventType.ORDERED] }, "$totalPoints", null] } },
        },
      },
      {
        $project: {
          userId: firstNonNull("$userIds"),
          customerId: lastNonNull("$customerIds"),
          quotedPoints: { $ifNull: [lastNonNull("$points"), 0] },
          orderedPoints: { $ifNull: ["$orderedPoints", 0] },
          calculated: hasType(QuoteEventType.CALCULATED),
          pdfDownloaded: hasType(QuoteEventType.PDF_DOWNLOADED),
          draftSaved: hasType(QuoteEventType.DRAFT_SAVED),
          // Acumulativo: todo pedido pasó por el carrito (el histórico reconstruido solo tiene ORDERED).
          cartAdded: hasType(QuoteEventType.CART_ADDED, QuoteEventType.ORDERED),
          ordered: hasType(QuoteEventType.ORDERED),
        },
      },
      {
        $facet: {
          funnel: [{ $group: { _id: null, ...FUNNEL_GROUP } }],
          byUser: [{ $group: { _id: "$userId", ...FUNNEL_GROUP } }, { $sort: { quotes: -1 } }],
          byCustomer: [{ $match: { customerId: { $ne: null } } }, { $group: { _id: "$customerId", ...FUNNEL_GROUP } }, { $sort: { quotes: -1 } }],
        },
      },
    ]);

    const [byUser, byCustomer, trackedSince] = await Promise.all([
      this.withUserNames(result?.byUser ?? []),
      this.withCustomerNames(result?.byCustomer ?? []),
      this.trackedSince(match),
    ]);
    return { funnel: this.toFunnel(result?.funnel?.[0]), byUser, byCustomer, trackedSince };
  }

  /** Primer evento registrado en vivo (los reconstruidos por backfill no miden cálculos ni PDF). */
  private async trackedSince(match: Record<string, any>): Promise<string | null> {
    const first = await this.quoteEventModel
      .findOne({ ...match, source: { $ne: BACKFILL_SOURCE } })
      .sort({ createdAt: 1 })
      .select("createdAt")
      .lean();
    return first ? new Date(first.createdAt).toISOString() : null;
  }

  private async withUserNames(rows: any[]): Promise<ActivityRowDto[]> {
    const names = await this.displayNames.userNames(rows.map((r) => r._id));
    return rows.map((r) => {
      const u = r._id ? names.get(String(r._id)) : undefined;
      const name = r._id ? u?.name || "Usuario eliminado" : "Público (sin sesión)";
      return { ...this.toFunnel(r), id: r._id ?? null, name, email: u?.email };
    });
  }

  /** Solo clientes reales: en drafts antiguos `core.customerId` puede ser un userId y se descarta. */
  private async withCustomerNames(rows: any[]): Promise<ActivityRowDto[]> {
    const names = await this.displayNames.customerNames(rows.map((r) => r._id));
    return rows
      .filter((r) => names.has(String(r._id)))
      .map((r) => ({ ...this.toFunnel(r), id: String(r._id), ...names.get(String(r._id))! }));
  }

  private async portalOrders(scope: DataScope): Promise<PortalSummaryDto["orders"]> {
    const filter = this.dataScopeService.toOrderFilter(scope);
    const [statusRows, recent] = await Promise.all([
      this.orderModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$header.status",
            count: { $sum: 1 },
            points: { $sum: "$header.totalPoints" },
            originalPoints: { $sum: "$header.totalOriginalPoints" },
            discount: { $sum: "$header.totalDiscount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      this.orderModel.find(filter).sort({ "header.orderDate": -1 }).limit(RECENT_LIMIT).select("header").lean(),
    ]);

    const names = await this.displayNames.customerNames(recent.map((o: any) => o.header.customerId));
    const sum = (key: string) => statusRows.reduce((acc, r) => acc + (r[key] || 0), 0);
    return {
      total: sum("count"),
      totalPoints: sum("points"),
      totalOriginalPoints: sum("originalPoints"),
      totalDiscount: sum("discount"),
      byStatus: statusRows.map((r) => ({ status: r._id, count: r.count, points: r.points })),
      recent: recent.map((o: any) => ({
        id: o._id.toString(),
        orderNumber: o.header.orderNumber,
        orderName: o.header.orderName,
        status: o.header.status,
        totalPoints: o.header.totalPoints,
        totalDiscount: o.header.totalDiscount,
        orderDate: new Date(o.header.orderDate).toISOString(),
        customerName: names.get(String(o.header.customerId))?.name,
      })),
    };
  }

  private async portalDrafts(scope: DataScope): Promise<PortalSummaryDto["drafts"]> {
    const filter = { ...(await this.dataScopeService.toDraftFilter(scope)), isConverted: false };
    const now = new Date();
    const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
    const [totals, recent] = await Promise.all([
      this.draftModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            active: { $sum: 1 },
            activePoints: { $sum: "$currentPricePoints" },
            expiringSoon: { $sum: { $cond: [{ $and: [{ $gte: ["$expirationDate", now] }, { $lte: ["$expirationDate", soon] }] }, 1, 0] } },
          },
        },
      ]),
      this.draftModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .limit(RECENT_LIMIT)
        .select("name currentPricePoints discountAmount updatedAt expirationDate")
        .lean(),
    ]);

    return {
      active: totals[0]?.active ?? 0,
      expiringSoon: totals[0]?.expiringSoon ?? 0,
      activePoints: totals[0]?.activePoints ?? 0,
      recent: recent.map((d: any) => ({
        id: d._id.toString(),
        name: d.name || "Presupuesto sin nombre",
        currentPricePoints: d.currentPricePoints,
        discountAmount: d.discountAmount,
        updatedAt: new Date(d.updatedAt).toISOString(),
        expirationDate: new Date(d.expirationDate).toISOString(),
      })),
    };
  }

  private scopeLabel(scope: DataScope): PortalSummaryDto["scope"] {
    if (scope.kind !== "users") return scope.kind;
    return scope.userIds.length > 1 || scope.customerIds.length ? "team" : "own";
  }

  private dateRange(startDate?: string, endDate?: string): Record<string, Date> | null {
    if (!startDate && !endDate) return null;
    const range: Record<string, Date> = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) range.$lte = new Date(endDate);
    return range;
  }

  private toFunnel(row?: any): QuoteFunnelDto {
    return {
      quotes: row?.quotes ?? 0,
      calculated: row?.calculated ?? 0,
      pdfDownloaded: row?.pdfDownloaded ?? 0,
      draftSaved: row?.draftSaved ?? 0,
      cartAdded: row?.cartAdded ?? 0,
      ordered: row?.ordered ?? 0,
      quotedPoints: row?.quotedPoints ?? 0,
      orderedPoints: row?.orderedPoints ?? 0,
    };
  }
}
