export enum Role {
  ADMIN = "ADMIN",
  OWNER = "OWNER", // Propietario de fábrica
  MANAGER = "MANAGER", // Gerente de fábrica (por debajo de OWNER)
  SALES = "SALES", // Comercial
  WORKER = "WORKER", // Operario de fábrica
  USER = "USER", // Cliente final
}

/**
 * Jerarquía numérica de roles.
 * Un rol con nivel mayor hereda acceso a todos los endpoints
 * que requieran un rol de nivel menor o igual.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 5,
  [Role.OWNER]: 4,
  [Role.MANAGER]: 3,
  [Role.SALES]: 2,
  [Role.WORKER]: 1,
  [Role.USER]: 0,
};

/** Devuelve el nivel jerárquico máximo de un array de roles. */
export function getMaxRoleLevel(roles: Role[]): number {
  if (!roles || roles.length === 0) return -1;
  return Math.max(...roles.map((r) => ROLE_HIERARCHY[r] ?? -1));
}

/** True si el usuario tiene al menos el nivel requerido por alguno de sus roles. */
export function hasMinimumLevel(userRoles: Role[], requiredRole: Role): boolean {
  const required = ROLE_HIERARCHY[requiredRole] ?? 0;
  return getMaxRoleLevel(userRoles) >= required;
}
