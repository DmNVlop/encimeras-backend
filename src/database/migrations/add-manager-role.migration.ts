/**
 * Migración: Verificación de compatibilidad para el rol MANAGER
 *
 * Esta migración NO modifica datos existentes.
 * El rol MANAGER es un valor nuevo en el enum — los documentos existentes
 * no contienen este valor, así que son plenamente compatibles.
 *
 * Lo que hace este script:
 * 1. Verifica que no existan documentos con roles inválidos
 * 2. Registra un resumen de la distribución de roles actual
 * 3. Confirma que el schema está listo para aceptar MANAGER
 *
 * Ejecutar: npx ts-node -r tsconfig-paths/register src/database/migrations/add-manager-role.migration.ts
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const VALID_ROLES = ["ADMIN", "OWNER", "MANAGER", "SALES", "WORKER", "USER"];

const UserSchema = new mongoose.Schema(
  {
    username: String,
    roles: [String],
    factoryId: mongoose.Schema.Types.ObjectId,
    ownerId: mongoose.Schema.Types.ObjectId,
  },
  { strict: false },
);

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("ERROR: MONGODB_URI no definido en .env");
    process.exit(1);
  }

  console.log("Conectando a MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Conectado.\n");

  const UserModel = mongoose.model("User", UserSchema);

  // 1. Distribución de roles actual
  const allUsers = await UserModel.find({}).select("username roles").lean();
  console.log(`Total usuarios: ${allUsers.length}`);

  const roleCounts: Record<string, number> = {};
  const invalidUsers: { username: string; invalidRoles: string[] }[] = [];

  for (const user of allUsers) {
    const roles: string[] = (user as any).roles || [];
    for (const role of roles) {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      if (!VALID_ROLES.includes(role)) {
        const existing = invalidUsers.find((u) => u.username === (user as any).username);
        if (existing) {
          existing.invalidRoles.push(role);
        } else {
          invalidUsers.push({ username: (user as any).username, invalidRoles: [role] });
        }
      }
    }
  }

  console.log("\nDistribución de roles actual:");
  for (const [role, count] of Object.entries(roleCounts).sort()) {
    console.log(`  ${role}: ${count} usuario(s)`);
  }

  // 2. Verificar documentos con roles inválidos
  if (invalidUsers.length > 0) {
    console.error("\n⚠ USUARIOS CON ROLES INVÁLIDOS (requieren corrección manual):");
    for (const u of invalidUsers) {
      console.error(`  - ${u.username}: ${u.invalidRoles.join(", ")}`);
    }
    console.error("\nCorrige estos documentos antes de desplegar.");
  } else {
    console.log("\n✓ Todos los documentos tienen roles válidos.");
    console.log("✓ Schema compatible con el nuevo rol MANAGER.");
    console.log("✓ Migración no destructiva completada.");
  }

  // 3. Verificar que nadie ya tiene MANAGER asignado (sanity check)
  const managerCount = roleCounts["MANAGER"] || 0;
  if (managerCount > 0) {
    console.log(`\nNota: Ya existen ${managerCount} usuario(s) con rol MANAGER.`);
  } else {
    console.log("\n✓ Sin usuarios MANAGER pre-existentes. El rol es nuevo y limpio.");
  }

  await mongoose.disconnect();
  console.log("\nDesconectado. Migración finalizada.");
}

runMigration().catch((err) => {
  console.error("Error en migración:", err);
  process.exit(1);
});
