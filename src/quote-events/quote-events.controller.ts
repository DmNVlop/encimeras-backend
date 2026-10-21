import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { DataScopeService } from "../shared/scope/data-scope.service";
import { QuoteEventsService } from "./quote-events.service";
import { PdfDownloadDto } from "./dto/pdf-download.dto";

@ApiTags("Quote Events")
@ApiBearerAuth()
@Controller("quote-events")
export class QuoteEventsController {
  constructor(
    private readonly quoteEventsService: QuoteEventsService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  @Post("pdf-download")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Registra la descarga del PDF del carrito o de una orden (un evento por presupuesto)" })
  recordPdfDownload(@Body() dto: PdfDownloadDto, @GetUser() user: any) {
    return this.quoteEventsService.recordPdfDownload(user, dto.source, dto.orderId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Cronología de eventos de un presupuesto (dentro del alcance del usuario)" })
  async findTimeline(@Query("quoteTraceId") quoteTraceId: string, @GetUser() user: any) {
    if (!quoteTraceId) throw new BadRequestException("quoteTraceId es obligatorio");
    return this.quoteEventsService.findTimeline(quoteTraceId, await this.dataScopeService.resolve(user));
  }

  @Delete(":quoteTraceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Purga la traza de un presupuesto sin orden (solo ADMIN, para datos de prueba)" })
  purgeTrace(@Param("quoteTraceId") quoteTraceId: string, @GetUser() user: any) {
    return this.quoteEventsService.purgeTrace(quoteTraceId, user.userId);
  }
}
