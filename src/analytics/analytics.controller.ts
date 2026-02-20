import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsQueryDto } from "./dto/analytics-query.dto";
import { AnalyticsSummaryDto } from "./dto/analytics-summary.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSummary(@Query() query: AnalyticsQueryDto): Promise<AnalyticsSummaryDto> {
    return this.analyticsService.getSummary(query);
  }
}
