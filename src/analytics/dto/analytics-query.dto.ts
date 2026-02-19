import { IsOptional, IsEnum, IsISO8601, IsString } from "class-validator";

export enum AnalyticsStatus {
  DRAFT = "draft",
  ORDER = "order",
  ALL = "all",
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsEnum(AnalyticsStatus)
  status?: AnalyticsStatus = AnalyticsStatus.ALL;

  @IsOptional()
  @IsString()
  factoryId?: string;
}
