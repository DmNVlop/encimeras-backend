import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order } from "../orders/schemas/order.schema";
import { Draft } from "../drafts/schemas/draft.schema";
import { AnalyticsQueryDto, AnalyticsStatus } from "./dto/analytics-query.dto";
import { AnalyticsSummaryDto } from "./dto/analytics-summary.dto";
import { UsersService } from "../users/users.service";
import { Role } from "../auth/enums/role.enum";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Draft.name) private draftModel: Model<Draft>,
    private usersService: UsersService,
  ) {}

  private async resolveUserIdScope(user: { userId: string; roles: Role[] }): Promise<string[] | undefined> {
    if (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.OWNER)) {
      return undefined;
    }
    if (user.roles.includes(Role.MANAGER)) {
      const salesUsers = await this.usersService.findManagedByManager(user.userId);
      const salesIds = salesUsers.map((u) => (u as any)._id.toString());
      return [user.userId, ...salesIds];
    }
    return [user.userId];
  }

  async getSummary(query: AnalyticsQueryDto, user: { userId: string; roles: Role[] }): Promise<AnalyticsSummaryDto> {
    const { startDate, endDate, status, factoryId } = query;
    const userIdScope = await this.resolveUserIdScope(user);

    const dateFilter: any = {};
    const effectiveStatus = status || AnalyticsStatus.ALL;

    // Si no hay fecha de inicio, por defecto usamos los últimos 30 días
    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.$gte = thirtyDaysAgo;
    } else {
      dateFilter.$gte = new Date(startDate);
    }

    if (endDate) dateFilter.$lte = new Date(endDate);

    const results: any = {
      summary: { totalQuotes: 0, totalPoints: 0, avgPointsPerProject: 0, totalSqm: 0, totalMl: 0, avgPiecesPerProject: 0 },
      charts: { materials: [], shapes: [], addons: [] },
      trends: { dailyQuotes: [] },
    };

    if (effectiveStatus === AnalyticsStatus.ORDER || effectiveStatus === AnalyticsStatus.ALL) {
      const orderResults = await this.aggregateOrders(dateFilter, factoryId, userIdScope);
      this.mergeResults(results, orderResults);
    }

    if (effectiveStatus === AnalyticsStatus.DRAFT || effectiveStatus === AnalyticsStatus.ALL) {
      const draftResults = await this.aggregateDrafts(dateFilter, factoryId, userIdScope);
      this.mergeResults(results, draftResults);
    }

    // Post-procesar promedios y porcentajes
    if (results.summary.totalQuotes > 0) {
      results.summary.avgPointsPerProject = results.summary.totalPoints / results.summary.totalQuotes;
      results.summary.avgPiecesPerProject = results.summary.avgPiecesPerProject / results.summary.totalQuotes;
    }

    // Calcular porcentajes para materiales
    const totalMaterials = results.charts.materials.reduce((acc, m) => acc + m.count, 0);
    results.charts.materials.forEach((m) => {
      m.percentage = totalMaterials > 0 ? (m.count / totalMaterials) * 100 : 0;
    });

    return results;
  }

  private async aggregateOrders(dateFilter: any, factoryId?: string, userIdScope?: string[]) {
    const match: any = {};
    if (Object.keys(dateFilter).length > 0) {
      match["header.orderDate"] = dateFilter;
    }
    if (factoryId) {
      match["items.core.factoryId"] = factoryId;
    }
    if (userIdScope) {
      match["header.userId"] = { $in: userIdScope };
    }

    return this.orderModel.aggregate([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $project: {
                totalPoints: "$header.totalPoints",
                pieces: {
                  $reduce: {
                    input: "$items",
                    initialValue: [],
                    in: { $concatArrays: ["$$value", { $ifNull: ["$$this.core.mainPieces", []] }] },
                  },
                },
              },
            },
            {
              $addFields: {
                numPieces: { $size: "$pieces" },
              },
            },
            {
              $unwind: { path: "$pieces", preserveNullAndEmptyArrays: true },
            },
            {
              $group: {
                _id: "$_id",
                totalPoints: { $first: "$totalPoints" },
                numPieces: { $first: "$numPieces" },
                projectSqm: {
                  $sum: {
                    $divide: [{ $multiply: [{ $ifNull: ["$pieces.length_mm", 0] }, { $ifNull: ["$pieces.width_mm", 0] }] }, 1000000],
                  },
                },
                projectMl: {
                  $sum: {
                    $reduce: {
                      input: { $ifNull: ["$pieces.appliedAddons", []] },
                      initialValue: 0,
                      in: { $add: ["$$value", { $ifNull: ["$$this.measurements.length_ml", 0] }] },
                    },
                  },
                },
              },
            },
            {
              $group: {
                _id: null,
                totalQuotes: { $sum: 1 },
                totalPoints: { $sum: "$totalPoints" },
                totalSqm: { $sum: "$projectSqm" },
                totalMl: { $sum: "$projectMl" },
                totalPieces: { $sum: "$numPieces" },
              },
            },
          ],
          materials: [
            { $unwind: "$items" },
            { $unwind: "$items.core.mainPieces" },
            {
              $group: {
                _id: { $toObjectId: "$items.core.mainPieces.materialId" },
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "materials",
                localField: "_id",
                foreignField: "_id",
                pipeline: [{ $project: { name: 1 } }],
                as: "materialInfo",
              },
            },
            {
              $project: {
                id: { $toString: "$_id" },
                name: { $ifNull: [{ $arrayElemAt: ["$materialInfo.name", 0] }, "Desconocido"] },
                count: 1,
                _id: 0,
              },
            },
          ],
          addons: [
            { $unwind: "$items" },
            { $unwind: "$items.core.mainPieces" },
            { $unwind: "$items.core.mainPieces.appliedAddons" },
            {
              $group: {
                _id: "$items.core.mainPieces.appliedAddons.code",
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "addons",
                localField: "_id",
                foreignField: "code",
                pipeline: [{ $project: { name: 1 } }],
                as: "addonInfo",
              },
            },
            {
              $project: {
                code: "$_id",
                label: { $ifNull: [{ $arrayElemAt: ["$addonInfo.name", 0] }, "$_id"] },
                count: 1,
                _id: 0,
              },
            },
          ],
          shapes: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.uiState.selectedShapeId",
                count: { $sum: 1 },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $project: { id: "$_id", label: "$_id", value: "$count", _id: 0 } },
          ],
          trends: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$header.orderDate" } },
                count: { $sum: 1 },
                points: { $sum: "$header.totalPoints" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", count: 1, points: 1, _id: 0 } },
          ],
        },
      },
    ]);
  }

  private async aggregateDrafts(dateFilter: any, factoryId?: string, userIdScope?: string[]) {
    const match: any = {};
    if (Object.keys(dateFilter).length > 0) {
      match.createdAt = dateFilter;
    }
    if (factoryId) {
      match["core.factoryId"] = factoryId;
    }
    if (userIdScope) {
      match.userId = { $in: userIdScope };
    }

    return this.draftModel.aggregate([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $project: {
                totalPoints: "$currentPricePoints",
                pieces: "$core.mainPieces",
                numPieces: { $size: { $ifNull: ["$core.mainPieces", []] } },
              },
            },
            {
              $unwind: { path: "$pieces", preserveNullAndEmptyArrays: true },
            },
            {
              $group: {
                _id: "$_id",
                totalPoints: { $first: "$totalPoints" },
                numPieces: { $first: "$numPieces" },
                projectSqm: {
                  $sum: {
                    $divide: [{ $multiply: [{ $ifNull: ["$pieces.length_mm", 0] }, { $ifNull: ["$pieces.width_mm", 0] }] }, 1000000],
                  },
                },
                projectMl: {
                  $sum: {
                    $reduce: {
                      input: { $ifNull: ["$pieces.appliedAddons", []] },
                      initialValue: 0,
                      in: { $add: ["$$value", { $ifNull: ["$$this.measurements.length_ml", 0] }] },
                    },
                  },
                },
              },
            },
            {
              $group: {
                _id: null,
                totalQuotes: { $sum: 1 },
                totalPoints: { $sum: "$totalPoints" },
                totalSqm: { $sum: "$projectSqm" },
                totalMl: { $sum: "$projectMl" },
                totalPieces: { $sum: "$numPieces" },
              },
            },
          ],
          materials: [
            { $unwind: { path: "$core.mainPieces", preserveNullAndEmptyArrays: false } },
            {
              $group: {
                _id: { $toObjectId: "$core.mainPieces.materialId" },
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "materials",
                localField: "_id",
                foreignField: "_id",
                pipeline: [{ $project: { name: 1 } }],
                as: "materialInfo",
              },
            },
            {
              $project: {
                id: { $toString: "$_id" },
                name: { $ifNull: [{ $arrayElemAt: ["$materialInfo.name", 0] }, "Desconocido"] },
                count: 1,
                _id: 0,
              },
            },
          ],
          addons: [
            { $unwind: { path: "$core.mainPieces", preserveNullAndEmptyArrays: false } },
            { $unwind: "$core.mainPieces.appliedAddons" },
            {
              $group: {
                _id: "$core.mainPieces.appliedAddons.code",
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "addons",
                localField: "_id",
                foreignField: "code",
                pipeline: [{ $project: { name: 1 } }],
                as: "addonInfo",
              },
            },
            {
              $project: {
                code: "$_id",
                label: { $ifNull: [{ $arrayElemAt: ["$addonInfo.name", 0] }, "$_id"] },
                count: 1,
                _id: 0,
              },
            },
          ],
          shapes: [
            {
              $group: {
                _id: "$uiState.selectedShapeId",
                count: { $sum: 1 },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $project: { id: "$_id", label: "$_id", value: "$count", _id: 0 } },
          ],
          trends: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
                points: { $sum: "$currentPricePoints" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", count: 1, points: 1, _id: 0 } },
          ],
        },
      },
    ]);
  }

  private mergeResults(target: AnalyticsSummaryDto, aggregated: any[]) {
    if (!aggregated || aggregated.length === 0) return;
    const data = aggregated[0];

    // Summary
    if (data.summary && data.summary[0]) {
      const s = data.summary[0];
      target.summary.totalQuotes += s.totalQuotes || 0;
      target.summary.totalPoints += s.totalPoints || 0;
      target.summary.totalSqm += s.totalSqm || 0;
      target.summary.totalMl += s.totalMl || 0;
      target.summary.avgPiecesPerProject += s.totalPieces || 0;
    }

    // Charts: Materials
    data.materials?.forEach((m) => {
      const existing = target.charts.materials.find((x) => x.id === m.id);
      if (existing) {
        existing.count += m.count;
      } else {
        target.charts.materials.push({ ...m, percentage: 0 });
      }
    });

    // Charts: Addons
    data.addons?.forEach((a) => {
      const existing = target.charts.addons.find((x) => x.code === a.code);
      if (existing) {
        existing.count += a.count;
      } else {
        target.charts.addons.push(a);
      }
    });

    // Charts: Shapes
    data.shapes?.forEach((s) => {
      const existing = target.charts.shapes.find((x) => x.id === s.id);
      if (existing) {
        existing.value += s.value;
      } else {
        target.charts.shapes.push(s);
      }
    });

    // Trends
    data.trends?.forEach((t) => {
      const existing = target.trends.dailyQuotes.find((x) => x.date === t.date);
      if (existing) {
        existing.count += t.count;
        existing.points += t.points;
      } else {
        target.trends.dailyQuotes.push(t);
      }
    });

    // Sort trends again after merge
    target.trends.dailyQuotes.sort((a, b) => a.date.localeCompare(b.date));
  }
}
