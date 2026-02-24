import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ValidationPipe, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DiscountRulesService } from "./discount-rules.service";
import { CreateDiscountRuleDto } from "./dto/create-discount-rule.dto";
import { UpdateDiscountRuleDto } from "./dto/update-discount-rule.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";

@ApiTags("Discount Rules")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("discount-rules")
export class DiscountRulesController {
  constructor(private readonly discountRulesService: DiscountRulesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create a new discount rule" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() createDiscountRuleDto: CreateDiscountRuleDto, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "default-factory";
    return this.discountRulesService.create(createDiscountRuleDto, fid);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "List all active discount rules" })
  findAll(@GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "default-factory";
    return this.discountRulesService.findAll(fid);
  }

  @Get(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get discount rule details" })
  findOne(@Param("id") id: string, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "default-factory";
    return this.discountRulesService.findOne(id, fid);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update a discount rule" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param("id") id: string, @Body() updateDiscountRuleDto: UpdateDiscountRuleDto, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "default-factory";
    return this.discountRulesService.update(id, updateDiscountRuleDto, fid);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Deactivate a discount rule" })
  remove(@Param("id") id: string, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "default-factory";
    return this.discountRulesService.remove(id, fid);
  }
}
