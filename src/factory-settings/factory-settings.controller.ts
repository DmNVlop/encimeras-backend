import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FactorySettingsService } from "./factory-settings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../auth/enums/role.enum";
import { GetUser } from "../auth/decorators/get-user.decorator";

@ApiTags("Factory Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("factory-settings")
export class FactorySettingsController {
  constructor(private readonly factorySettingsService: FactorySettingsService) {}

  @Get()
  @Roles(Role.SALES) // nivel 2 mínimo → MANAGER, OWNER y ADMIN también
  @ApiOperation({ summary: "Obtener configuración de la fábrica actual" })
  findByFactory(@GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.factorySettingsService.findByFactory(fid);
  }

  @Patch("logo")
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: "Subir o reemplazar el logo de la fábrica" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  uploadLogo(
    @GetUser("factoryId") factoryId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const fid = factoryId || "000000000000000000000000";
    return this.factorySettingsService.uploadLogo(fid, file);
  }

  @Delete("logo")
  @Roles(Role.ADMIN, Role.OWNER)
  @ApiOperation({ summary: "Eliminar el logo de la fábrica (vuelve al logo por defecto)" })
  deleteLogo(@GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.factorySettingsService.deleteLogo(fid);
  }
}
