// src/auth/users.service.ts
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

// En una aplicación real, esto vendría de una base de datos.
export type User = any;

@Injectable()
export class UsersService {
  private readonly users: User[];

  constructor() {
    // Hasheamos la contraseña una sola vez al iniciar.
    // NUNCA guardes contraseñas en texto plano.
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync("admin123", salt);
    const hashedPasswordUser = bcrypt.hashSync("usuario123", salt);

    this.users = [
      {
        userId: 1,
        name: "Admin",
        username: "admin@admin.com",
        password: hashedPassword,
        roles: ["ADMIN"],
      },
      {
        userId: 2,
        name: "Usuario",
        username: "user@user.com",
        password: hashedPasswordUser,
        roles: ["USER"],
      },
    ];
  }

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }
}
