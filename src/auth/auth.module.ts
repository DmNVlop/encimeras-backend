// src/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";
import { RoleHierarchyService } from "./services/role-hierarchy.service";
import { RolesGuard } from "./guards/roles.guard";
import { AuthSharedModule } from "./auth-shared.module";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsersModule,
    AuthSharedModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: configService.get<string>("JWT_EXPIRES_IN") as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [RoleHierarchyService, RolesGuard, AuthSharedModule],
})
export class AuthModule {}
