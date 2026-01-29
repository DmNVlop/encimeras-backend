// src/auth/auth.service.ts
import { Injectable } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    console.log("1111 ", user);

    // Asumiendo que user ahora es un documento de Mongo
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // 🔥 CLAVE: Incluimos el rol en el payload del token
    const payload = {
      name: user.name,
      username: user.username,
      userId: user.userId,
      roles: user.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      // Devolvemos también el usuario (sin pass) para que el Front decida la redirección inicial
      user: {
        name: user.name,
        username: user.username,
        userId: user.userId,
        roles: user.roles,
      },
    };
  }
}
