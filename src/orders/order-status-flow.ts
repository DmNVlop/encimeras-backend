import { Role, hasMinimumLevel } from "../auth/enums/role.enum";

/**
 * Flujo de estados de una orden: fuente única de verdad (BE). El FE lo lee de `GET /orders/status-flow`
 * y las acciones válidas de cada orden llegan ya resueltas en `GET /orders/:id` (`statusActions`).
 * Mismo flujo para todas las fábricas; si algún día es configurable por fábrica, este módulo es el punto de entrada.
 */
export const ORDER_STATUSES = ["PENDING", "REVIEWED", "APPROVED", "REJECTED", "MANUFACTURING", "SHIPPED", "INSTALLED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Transiciones permitidas desde cada estado. Los estados sin salida son finales (REJECTED solo se reabre con «deshacer»). */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["REVIEWED", "REJECTED", "CANCELLED"],
  REVIEWED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["MANUFACTURING", "CANCELLED"],
  REJECTED: [],
  MANUFACTURING: ["SHIPPED"],
  SHIPPED: ["INSTALLED"],
  INSTALLED: [],
  CANCELLED: [],
};

/** Estados destino que exigen nota (motivo visible en el portal). Deshacer también la exige siempre. */
export const NOTE_REQUIRED_STATUSES: OrderStatus[] = ["REJECTED", "CANCELLED"];

/** Lo que puede hacer el operario de fábrica (WORKER). */
const WORKER_TARGETS: OrderStatus[] = ["REVIEWED", "MANUFACTURING", "SHIPPED", "INSTALLED"];

/**
 * El permiso no es lineal por nivel: SALES (nivel 2) está por encima de WORKER (1) en la jerarquía
 * pero no opera la fábrica. Por eso: OWNER o superior (por nivel) = todo; WORKER = sus estados;
 * cualquier rol = cancelar SU pedido (creado por él) mientras esté en PENDING. Los roles se acumulan.
 */
export interface StatusActor {
  userId: string;
  roles: Role[];
}

export function canManageAllStatuses(roles: Role[]): boolean {
  return hasMinimumLevel(roles ?? [], Role.OWNER);
}

/** Estados a los que `actor` puede llevar una orden que está en `from` y fue creada por `orderUserId`. */
export function allowedTargets(from: string, orderUserId: string, actor: StatusActor): OrderStatus[] {
  const targets = ORDER_TRANSITIONS[from as OrderStatus] ?? [];
  if (canManageAllStatuses(actor.roles)) return [...targets];

  const isWorker = (actor.roles ?? []).includes(Role.WORKER);
  const isOwnPending = from === "PENDING" && String(orderUserId) === String(actor.userId);
  return targets.filter((to) => (isWorker && WORKER_TARGETS.includes(to)) || (to === "CANCELLED" && isOwnPending));
}

export function requiresNote(to: string): boolean {
  return NOTE_REQUIRED_STATUSES.includes(to as OrderStatus);
}

/** Cambio registrado en `header.statusHistory` (append-only). */
export interface StatusChangeEntry {
  from: string;
  to: string;
  undo?: boolean;
}

/**
 * Cambio que se desharía ahora: pila de transiciones en la que cada «deshacer» retira la última vigente.
 * Así se pueden deshacer varios cambios seguidos sin que un deshacer se deshaga a sí mismo.
 */
export function lastUndoableChange<T extends StatusChangeEntry>(history: T[] = []): T | null {
  const stack: T[] = [];
  for (const entry of history) {
    if (entry.undo) stack.pop();
    else stack.push(entry);
  }
  return stack[stack.length - 1] ?? null;
}

/** Mapa estático para el FE (`GET /orders/status-flow`). */
export function statusFlowDescriptor() {
  return {
    statuses: ORDER_STATUSES,
    transitions: ORDER_TRANSITIONS,
    finalStatuses: ORDER_STATUSES.filter((s) => ORDER_TRANSITIONS[s].length === 0),
    noteRequired: NOTE_REQUIRED_STATUSES,
    roles: {
      OWNER_OR_ABOVE: { targets: "ALL", undo: true },
      WORKER: { targets: WORKER_TARGETS, undo: false },
      ANY: { targets: ["CANCELLED"], onlyFrom: "PENDING", onlyOwnOrders: true, undo: false },
    },
  };
}
