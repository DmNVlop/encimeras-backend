# API: Carrito de Compras (Cart)

Este módulo gestiona la agrupación de presupuestos antes de convertirlos en una orden.

## 1. Modelo de Datos (CartItem)

| Campo             | Tipo     | Descripción                                                                |
| :---------------- | :------- | :------------------------------------------------------------------------- |
| `cartItemId`      | `string` | UUID generado por el backend.                                              |
| `customName`      | `string` | Alias (ej: "Cocina Principal").                                            |
| `core`            | `Object` | Datos de negocio (Contrato con el motor de cálculo).                       |
| `uiState`         | `Object` | Datos visuales opacos para el backend.                                     |
| `subtotalPoints`  | `number` | Precio final calculado (después de descuentos).                            |
| `originalPoints`  | `number` | Precio base antes de aplicar descuentos.                                   |
| `discountAmount`  | `number` | Importe total descontado en este ítem.                                     |
| `appliedRules`    | `Array`  | Reglas de descuento aplicadas a este ítem.                                 |
| `hydratedContext` | `Object` | **Inyectado por el backend** en el `GET`. Contiene detalles de materiales. |

---

## 2. Endpoints

### 2.1 Obtener Carrito Actual

Devuelve el carrito activo del usuario logueado, con los ítems **hidratados** (patrón BFF). El carrito está vinculado al `userId` del token JWT.

- **URL**: `GET /cart`
- **Auth**: Requerido (JWT)

#### Resumen de Totales en el Carrito:

Además de los ítems, el objeto raíz del carrito incluye:

- `userId`: ID del usuario/vendedor propietario del carrito.
- `totalPoints`: Suma de los subtotales con descuento.
- `totalOriginalPoints`: Suma de los precios base sin descuento.
- `totalDiscount`: Ahorro total acumulado en el carrito.

### 2.2 Añadir al Carrito

Añade una nueva configuración. El backend valida el precio automáticamente usando el nodo `core`.

- **URL**: `POST /cart/items`
- **Body**:

```json
{
  "customName": "Isla de mármol",
  "core": {
    "mainPieces": [...],
    "factoryId": "...",
    "customerId": "ID_DEL_CLIENTE_B2B"
  },
  "uiState": { "selectedShapeId": "L", "lastStep": 2 }
}
```

> **Nota**: El `customerId` dentro de `core` es el cliente final para el cual se calculan los descuentos. El carrito en sí pertenece al usuario autenticado.

### 2.3 Actualizar Ítem

Permite modificar el nombre, el core (provoca recálculo de precio) o el uiState.

- **URL**: `PUT /cart/items/:cartItemId`

### 2.4 Checkout (Asíncrono)

Inicia la creación de la orden.

- **URL**: `POST /cart/checkout`
- **Response**: `202 Accepted` con `jobId`.

---

## 3. Guía de Integración

Para más detalles sobre la separación de datos, consulte la [Guía de Datos Core/UI](../ux-ui/guia-datos-core-ui.md).
