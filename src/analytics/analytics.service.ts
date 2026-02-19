import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order } from "../orders/schemas/order.schema";
import { Draft } from "../drafts/schemas/draft.schema";
import { AnalyticsQueryDto, AnalyticsStatus } from "./dto/analytics-query.dto";
import { AnalyticsSummaryDto } from "./dto/analytics-summary.dto";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Draft.name) private draftModel: Model<Draft>,
  ) {}

  async getSummary(query: AnalyticsQueryDto): Promise<AnalyticsSummaryDto> {
    const { startDate, endDate, status, factoryId } = query;

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.$gte = startDate ? new Date(startDate) : new Date(0);
      dateFilter.$lte = endDate ? new Date(endDate) : new Date();
    }

    // Definir qué colecciones consultar
    const results: any = {
      summary: { totalQuotes: 0, totalPoints: 0, avgPointsPerProject: 0, totalSqm: 0, totalMl: 0, avgPiecesPerProject: 0 },
      charts: { materials: [], shapes: [], addons: [] },
      trends: { dailyQuotes: [] },
    };

    if (status === AnalyticsStatus.ORDER || status === AnalyticsStatus.ALL) {
      const orderResults = await this.aggregateOrders(dateFilter, factoryId);
      this.mergeResults(results, orderResults);
    }

    if (status === AnalyticsStatus.DRAFT || status === AnalyticsStatus.ALL) {
      const draftResults = await this.aggregateDrafts(dateFilter, factoryId);
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

  private async aggregateOrders(dateFilter: any, factoryId?: string) {
    const match: any = { "header.orderDate": dateFilter };
    // if (factoryId) match['header.factoryId'] = factoryId; // Add when factoryId is available

    return this.orderModel.aggregate([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $project: {
                totalPoints: "$header.totalPoints",
                pieces: { $arrayElemAt: ["$items.technicalSnapshot.pieces", 0] },
                numPieces: { $size: { $ifNull: [{ $arrayElemAt: ["$items.technicalSnapshot.pieces", 0] }, []] } },
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
            { $unwind: "$items.technicalSnapshot.materials" },
            {
              $group: {
                _id: "$items.technicalSnapshot.materials.id",
                name: { $first: "$items.technicalSnapshot.materials.name" },
                count: { $sum: 1 },
              },
            },
            { $project: { id: "$_id", name: 1, count: 1, _id: 0 } },
          ],
          addons: [
            { $unwind: "$items" },
            { $unwind: { path: "$items.technicalSnapshot.addons", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: "$items.technicalSnapshot.addons.code",
                label: { $first: "$items.technicalSnapshot.addons.name" }, // Or label if exists/available
                count: { $sum: { $cond: [{ $ifNull: ["$items.technicalSnapshot.addons.code", false] }, 1, 0] } },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $project: { code: "$_id", label: { $ifNull: ["$label", "$_id"] }, count: 1, _id: 0 } },
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

  private async aggregateDrafts(dateFilter: any, factoryId?: string) {
    const match: any = { createdAt: dateFilter }; // Drafts use timestamps (createdAt)

    return this.draftModel.aggregate([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $project: {
                totalPoints: "$currentPricePoints",
                pieces: "$configuration.mainPieces",
                numPieces: { $size: { $ifNull: ["$configuration.mainPieces", []] } },
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
            {
              $group: {
                _id: "$configuration.wizardTempMaterial.id",
                name: { $first: "$configuration.wizardTempMaterial.name" },
                count: { $sum: 1 },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $project: { id: "$_id", name: 1, count: 1, _id: 0 } },
          ],
          addons: [
            { $unwind: { path: "$configuration.globalAddons", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: "$configuration.globalAddons.code",
                label: { $first: "$configuration.globalAddons.name" },
                count: { $sum: { $cond: [{ $ifNull: ["$configuration.globalAddons.code", false] }, 1, 0] } },
              },
            },
            { $match: { _id: { $ne: null } } },
            { $project: { code: "$_id", label: { $ifNull: ["$label", "$_id"] }, count: 1, _id: 0 } },
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
