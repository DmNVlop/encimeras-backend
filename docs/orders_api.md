# Documentación Técnica: Módulo de Órdenes (Orders)

Este módulo gestiona la conversión de carritos o borradores en pedidos firmes para producción.

## 1. Modelo de Datos (Order)

Una orden se divide en una cabecera comercial (`OrderHeader`) y múltiples líneas técnicas (`OrderLineItem`).

### 1.1 OrderHeader (Cabecera)

| Campo         | Tipo     | Descripción                                            |
| :------------ | :------- | :----------------------------------------------------- |
| `orderNumber` | `string` | ID secuencial único (ej: ORD-2026-0001).               |
| `customerId`  | `string` | Identificador del cliente.                             |
| `status`      | `enum`   | PENDING, MANUFACTURING, SHIPPED, INSTALLED, CANCELLED. |
| `totalPoints` | `number` | Puntos totales del pedido (Inmutable).                 |
| `orderDate`   | `Date`   | Fecha de creación.                                     |

### 1.2 OrderLineItem (Línea de Detalle)

Cada línea representa un presupuesto independiente (ej: una cocina o una isla).
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `type` | `string` | Por defecto "COUNTERTOP_PROJECT". |
| `cartItemName` | `string` | **Alias del presupuesto** (ej: "Cocina de Juana"). |
| `technicalSnapshot` | `Object` | Copia inmutable de materiales, piezas y accesorios. |

---

## 2. Endpoints de la API

### 2.1 Listar Órdenes (Headers)

Retorna solo las cabeceras para optimizar listados.

- **URL**: `GET /orders`
- **Auth**: Requerido (Admin/Ventas/User)
- **QueryParams**: `status` (opcional)

### 2.2 Ver Detalle de Orden

Retorna la orden completa con todos los snapshots técnicos.

- **URL**: `GET /orders/:id`

### 2.3 Checkout desde Carrito (NUEVO - RECOMENDADO)

Inicia el proceso asíncrono. Ver guía de [Integración de Carrito](./frontend/integracion-carrito-ordenes.md).

- **URL**: `POST /cart/checkout`
- **Respuesta**: 202 Accepted con `jobId`.

### 2.4 Crear desde Borrador (Legacy)

Crea una orden a partir de un único borrador ID.

- **URL**: `POST /orders`
- **Body**: `{ draftId: string }`

---

## 3. WebSockets y Estados en Tiempo Real

El sistema emite eventos automáticos cuando hay cambios en las órdenes:

- `orders:new`: Se dispara cuando una orden se crea con éxito (ideal para el Admin Panel).
- `orders:update`: Se dispara al cambiar el estado de una orden.
- `orders:fail`: Se dispara si el proceso de checkout asíncrono falla.
