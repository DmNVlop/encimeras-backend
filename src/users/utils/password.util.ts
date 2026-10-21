import { randomInt } from "crypto";

// Sin caracteres ambiguos (0/O, 1/l/I) para que se pueda dictar o copiar a mano
const PASSWORD_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const PASSWORD_LENGTH = 12;

/** Contraseña inicial aleatoria (CSPRNG) para altas sin contraseña elegida por una persona, p. ej. el import CSV. */
export function generateTemporaryPassword(length = PASSWORD_LENGTH): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARSET[randomInt(PASSWORD_CHARSET.length)];
  }
  return password;
}
