import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { PortalSummaryDto } from "./dto/activity.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";

/** Resumen del portal de usuario (/dashboard). */
@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortalAnalyticsController {
  constructor(private readonly activityService: ActivityService) {}

  @Get("me")
  @Roles(Role.USER) // nivel 0 mínimo — el alcance lo resuelve DataScopeService
  async getPortalSummary(@Request() req): Promise<PortalSummaryDto> {
    return this.activityService.getPortalSummary(req.user);
  }
}
