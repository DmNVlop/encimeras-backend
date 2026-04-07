import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ValidationPipe, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DocumentSettingsService } from "./document-settings.service";
import { CreateDocumentSettingsDto } from "./dto/create-document-settings.dto";
import { UpdateDocumentSettingsDto } from "./dto/update-document-settings.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";

@ApiTags("Document Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("document-settings")
export class DocumentSettingsController {
  constructor(private readonly documentSettingsService: DocumentSettingsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create or update document settings for a factory" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() createDto: CreateDocumentSettingsDto, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.documentSettingsService.create(createDto, fid);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES)
  @ApiOperation({ summary: "Get document settings for current factory" })
  findByFactory(@GetUser("factoryId") factoryId: string, @GetUser("userId") userId?: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.documentSettingsService.findByFactory(fid, userId);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.SALES)
  @ApiOperation({ summary: "Get document settings by ID" })
  findOne(@Param("id") id: string, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.documentSettingsService.findOne(id, fid);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update document settings" })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param("id") id: string, @Body() updateDto: UpdateDocumentSettingsDto, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.documentSettingsService.update(id, updateDto, fid);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Delete document settings" })
  remove(@Param("id") id: string, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.documentSettingsService.remove(id, fid);
  }
}
