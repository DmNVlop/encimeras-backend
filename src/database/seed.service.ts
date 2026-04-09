import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { User } from "../users/schemas/users.schema";
import { DocumentSettings } from "../document-settings/schemas/document-settings.schema";
import { Role } from "../auth/enums/role.enum";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(DocumentSettings.name) private readonly documentSettingsModel: Model<DocumentSettings>,
    private readonly configService: ConfigService,
  ) {}

  // Este método se ejecuta automáticamente al iniciar la App
  async onApplicationBootstrap() {
    await this.seedAdminUser();
    await this.seedDefaultDocumentSettings();
  }

  private async seedAdminUser() {
    // 1. Definimos las credenciales base (Idealmente desde variables de entorno)
    const adminUsername = this.configService.get<string>("ADMIN_DEFAULT_USER") || "admin@admin.com";
    const adminName = this.configService.get<string>("ADMIN_DEFAULT_NAME") || "Administrador";
    const adminPassword = this.configService.get<string>("ADMIN_DEFAULT_PASS") || "admin123";

    // 2. Verificamos si ya existe
    const existingAdmin = await this.userModel.findOne({ username: adminUsername });

    if (existingAdmin) {
      this.logger.log(`✅ El usuario administrador "${adminUsername}" ya existe. Omitiendo seed.`);
      return;
    }

    this.logger.log(`⚠️ No se encontró administrador. Creando usuario "${adminUsername}"...`);

    // 3. Hasheamos la contraseña (CRÍTICO)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // 4. Creamos el usuario
    const newAdmin = new this.userModel({
      username: adminUsername,
      name: adminName,
      roles: [Role.ADMIN],
      password: hashedPassword,
    });

    await newAdmin.save();
    this.logger.log(`🚀 Usuario administrador creado con éxito: ${adminUsername}`);
  }

  private async seedDefaultDocumentSettings() {
    const factoryId = "000000000000000000000000";

    const existing = await this.documentSettingsModel.findOne({ factoryId, userId: null }).exec();
    if (existing) {
      this.logger.log(`✅ Document settings para factory "${factoryId}" ya existen. Omitiendo seed.`);
      return;
    }

    this.logger.log(`⚠️ No se encontraron document settings. Creando defaults para factory "${factoryId}"...`);

    const defaultSettings = new this.documentSettingsModel({
      factoryId,
      userId: null,
      validityDays: 30,
      footerText:
        "Presupuesto válido por 30 días desde su emisión. Pasado este plazo será necesaria una nueva validación de precios y condiciones. Validez 30 días.",
    });

    await defaultSettings.save();
    this.logger.log(`🚀 Document settings por defecto creados con éxito para factory "${factoryId}".`);
  }
}
