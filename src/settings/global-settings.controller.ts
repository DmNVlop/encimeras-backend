import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GlobalSettingsService } from "./global-settings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";

@ApiTags("Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("settings")
export class GlobalSettingsController {
  constructor(private readonly globalSettingsService: GlobalSettingsService) {}

  @Get("global")
  @Roles(Role.WORKER)
  @ApiOperation({ summary: "Get global settings" })
  async getGlobalSettings() {
    const multiSalesPerCustomer = await this.globalSettingsService.getMultiSalesPerCustomer();
    return { multiSalesPerCustomer };
  }
}
