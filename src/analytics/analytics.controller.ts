import { Controller, Get, Query, Request, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { ActivityService } from "./activity.service";
import { AnalyticsQueryDto } from "./dto/analytics-query.dto";
import { AnalyticsSummaryDto } from "./dto/analytics-summary.dto";
import { ActivityQueryDto } from "./dto/activity-query.dto";
import { ActivityDto } from "./dto/activity.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly activityService: ActivityService,
  ) {}

  @Get("summary")
  @Roles(Role.ADMIN, Role.OWNER, Role.MANAGER, Role.SALES)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSummary(@Query() query: AnalyticsQueryDto, @Request() req): Promise<AnalyticsSummaryDto> {
    return this.analyticsService.getSummary(query, req.user);
  }

  /** Embudo de presupuestos por usuario y por cliente (quote_events), dentro del alcance. */
  @Get("activity")
  @Roles(Role.ADMIN, Role.OWNER, Role.MANAGER, Role.SALES)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getActivity(@Query() query: ActivityQueryDto, @Request() req): Promise<ActivityDto> {
    return this.activityService.getActivity(query, req.user);
  }
}
