import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DiscountRulesService } from "./discount-rules.service";
import { DiscountRulesController } from "./discount-rules.controller";
import { DiscountRule, DiscountRuleSchema } from "./schemas/discount-rule.schema";
import { DiscountEngineService } from "./discount-engine.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: DiscountRule.name, schema: DiscountRuleSchema }])],
  controllers: [DiscountRulesController],
  providers: [DiscountRulesService, DiscountEngineService],
  exports: [DiscountRulesService, DiscountEngineService],
})
export class DiscountRulesModule {}
