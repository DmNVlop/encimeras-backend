export class AnalyticsSummaryDto {
  summary: {
    totalQuotes: number;
    totalPoints: number;
    avgPointsPerProject: number;
    totalSqm: number;
    totalMl: number;
    avgPiecesPerProject: number;
  };
  charts: {
    materials: Array<{ id: string; name: string; count: number; percentage: number }>;
    shapes: Array<{ id: string; label: string; value: number }>;
    addons: Array<{ code: string; label: string; count: number }>;
  };
  trends: {
    dailyQuotes: Array<{ date: string; count: number; points: number }>;
  };
}
