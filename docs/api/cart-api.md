# API: Carrito de Compras (Cart)

Este módulo gestiona la agrupación de presupuestos antes de convertirlos en una orden.

## 1. Modelo de Datos (CartItem)

| Campo             | Tipo     | Descripción                                                                |
| :---------------- | :------- | :------------------------------------------------------------------------- |
| `cartItemId`      | `string` | UUID generado por el backend.                                              |
| `customName`      | `string` | Alias (ej: "Cocina Principal").                                            |
| `core`            | `Object` | Datos de negocio (Contrato con el motor de cálculo).                       |
| `uiState`         | `Object` | Datos visuales opacos para el backend.                                     |
| `subtotalPoints`  | `number` | Precio calculado por el backend (Inmutable desde el cliente).              |
| `hydratedContext` | `Object` | **Inyectado por el backend** en el `GET`. Contiene detalles de materiales. |

---

## 2. Endpoints

### 2.1 Obtener Carrito Actual

Devuelve el carrito activo del usuario, con los ítems **hidratados** (patrón BFF).

- **URL**: `GET /cart`
- **Auth**: Requerido (JWT)

### 2.2 Añadir al Carrito

Añade una nueva configuración. El backend valida el precio automáticamente usando el nodo `core`.

- **URL**: `POST /cart/items`
- **Body**:

```json
{
  "customName": "Isla de mármol",
  "core": {
    "mainPieces": [...],
    "factoryId": "..."
  },
  "uiState": { "selectedShapeId": "L", "lastStep": 2 }
}
```

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
