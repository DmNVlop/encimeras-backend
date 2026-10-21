import { Module, Global } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventsGateway } from "./events.gateway";
import { DataScopeModule } from "../shared/scope/data-scope.module";

@Global() // Hacemos el módulo Global para no tener que importarlo en cada submódulo
@Module({
  imports: [
    DataScopeModule,
    // Solo verifica tokens del handshake: mismo secreto que AuthModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({ secret: configService.get<string>("JWT_SECRET") }),
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
