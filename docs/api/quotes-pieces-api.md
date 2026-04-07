# API: Gestión de Piezas en Presupuestos

Este documento detalla los endpoints para agregar, modificar y eliminar piezas en presupuestos ya guardados.

---

## 1. Información General

Estos endpoints permiten manipular las piezas (`mainPieces`) de un presupuesto existente sin necesidad de recrearlo. Cada operación recalcula automáticamente los totales del presupuesto aplicando las reglas de descuento vigentes.

---

## 2. Endpoints

### 2.1 Agregar pieza a un presupuesto

- **Endpoint**: `POST /quotes/:id/pieces`
- **Autenticación**: JWT requerido
- **Roles**: `ADMIN`, `SALES`
- **Propósito**: Agregar una nueva pieza a un presupuesto existente y recalcular totales.

#### Request

| Campo                | Tipo               | Requerido | Descripción                                                                       |
| :------------------- | :----------------- | :-------- | :-------------------------------------------------------------------------------- |
| `materialId`         | `String` (MongoId) | Sí        | ID del material para esta pieza (puede ser diferente al de otras piezas).         |
| `selectedAttributes` | `Object`           | Sí        | Diccionario de atributos (ej: `{ "MAT_GROUP": "BASIC", "MAT_THICKNESS": "20" }`). |
| `length_mm`          | `Number`           | Sí        | Longitud en milímetros.                                                           |
| `width_mm`           | `Number`           | Sí        | Anchura en milímetros.                                                            |
| `appliedAddons`      | `Array<AddonDto>`  | No        | Lista de accesorios aplicados a esta pieza.                                       |

#### Ejemplo de Petición

```json
{
  "materialId": "65d8f2b1...",
  "selectedAttributes": {
    "MAT_GROUP": "PREMIUM",
    "MAT_THICKNESS": "20mm"
  },
  "length_mm": 1800,
  "width_mm": 650,
  "appliedAddons": [
    {
      "code": "COPETE_ESTANDAR",
      "measurements": {
        "length_ml": 1.8,
        "height_mm": 50
      }
    }
  ]
}
```

#### Respuesta

Devuelve el presupuesto completo actualizado con las mismas estructuras que `GET /quotes/:id`.

---

### 2.2 Modificar pieza en un presupuesto

- **Endpoint**: `PATCH /quotes/:id/pieces/:pieceId`
- **Autenticación**: JWT requerido
- **Roles**: `ADMIN`, `SALES`
- **Propósito**: Modificar los atributos de una pieza existente (material, dimensiones, atributos, addons) y recalcular totales.

#### Request

Todos los campos son opcionales. Solo se actualizan los proporcionados.

| Campo                | Tipo               | Requerido | Descripción                     |
| :------------------- | :----------------- | :-------- | :------------------------------ |
| `materialId`         | `String` (MongoId) | No        | Nuevo material para la pieza.   |
| `selectedAttributes` | `Object`           | No        | Nuevos atributos seleccionados. |
| `length_mm`          | `Number`           | No        | Nueva longitud en mm.           |
| `width_mm`           | `Number`           | No        | Nueva anchura en mm.            |
| `appliedAddons`      | `Array<AddonDto>`  | No        | Nueva lista de accesorios.      |

#### Ejemplo de Petición

```json
{
  "length_mm": 2200,
  "selectedAttributes": {
    "MAT_GROUP": "BASIC",
    "MAT_THICKNESS": "30mm"
  }
}
```

#### Respuesta

Devuelve el presupuesto completo actualizado.

---

### 2.3 Eliminar pieza de un presupuesto

- **Endpoint**: `DELETE /quotes/:id/pieces/:pieceId`
- **Autenticación**: JWT requerido
- **Roles**: `ADMIN`, `SALES`
- **Propósito**: Eliminar una pieza de un presupuesto existente y recalcular totales.

#### Request

Sin body. Solo los parámetros de ruta.

#### Parámetros

| Parámetro | Tipo     | Descripción                |
| :-------- | :------- | :------------------------- |
| `id`      | `String` | ID del presupuesto.        |
| `pieceId` | `String` | ID de la pieza a eliminar. |

#### Respuesta

Devuelve el presupuesto completo actualizado.

---

## 3. Comportamiento de Recálculo

Cada operación (`addPiece`, `updatePiece`, `removePiece`) ejecuta automáticamente:

1. **Reconstrucción del DTO de cálculo**: Se obtienen todas las piezas actuales del presupuesto (incluyendo la modificada) y se construye un `CalculateQuoteDto` interno.
2. **Cálculo de precios**: Se ejecuta el motor de cálculo (`calculate()`) que:
   - Calcula el precio base de cada pieza según su material y atributos
   - Calcula el precio de los addons de cada pieza
   - Aplica el motor de descuentos según la fábrica y cliente
3. **Actualización de totales**: Se actualizan los campos del presupuesto:
   - `totalPrice` — Precio final después de descuentos
   - `totalPriceBeforeDiscount` — Precio antes de descuentos
   - `totalDiscount` — Monto total descontado
   - `appliedRules` — Reglas de descuento aplicadas
   - `priceBreakdown` — Desglose por pieza

---

## 4. Respuesta Típica (todos los endpoints)

```json
{
  "_id": "65d8f4c3...",
  "customerName": "Juan Pérez",
  "customerEmail": "juan@example.com",
  "customerPhone": "+34600000000",
  "status": "Pendiente",
  "mainPieces": [
    {
      "_id": "65d8f5a1...",
      "materialId": {
        "_id": "65d8f2b1...",
        "name": "Silestone Snow",
        "category": "PIEDRA"
      },
      "selectedAttributes": {
        "MAT_GROUP": "BASIC",
        "MAT_THICKNESS": "20mm"
      },
      "length_mm": 2500,
      "width_mm": 600,
      "appliedAddons": []
    },
    {
      "_id": "65d8f5a2...",
      "materialId": {
        "_id": "65d8f2b2...",
        "name": "Dekton Kraftizen",
        "category": "PORCELANICO"
      },
      "selectedAttributes": {
        "MAT_GROUP": "PREMIUM",
        "MAT_THICKNESS": "20mm"
      },
      "length_mm": 1800,
      "width_mm": 650,
      "appliedAddons": [
        {
          "code": "COPETE_ESTANDAR",
          "measurements": { "length_ml": 1.8, "height_mm": 50 },
          "quantity": 1
        }
      ]
    }
  ],
  "totalPrice": 2850,
  "totalPriceBeforeDiscount": 3200,
  "totalDiscount": 350,
  "appliedRules": [
    {
      "ruleId": "65d8f...",
      "ruleName": "Descuento Volumen",
      "discountAmount": 350
    }
  ],
  "priceBreakdown": [
    {
      "description": "Pieza 1",
      "points": 1500,
      "discountAmount": 150,
      "finalPoints": 1350
    },
    {
      "description": "Pieza 2",
      "points": 1700,
      "discountAmount": 200,
      "finalPoints": 1500
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z"
}
```

---

## 5. Errores

| Código | Escenario                                                                              |
| :----- | :------------------------------------------------------------------------------------- |
| `404`  | Presupuesto no encontrado (`Quote with ID "..." not found`)                            |
| `404`  | Pieza no encontrada en el presupuesto (`Piece with ID "..." not found in quote "..."`) |
| `400`  | Validación fallida (campos requeridos, formato incorrecto)                             |
| `401`  | No autenticado                                                                         |
| `403`  | Sin permisos (rol insuficiente)                                                        |

---

## 6. Notas para el Frontend

1. **Recalcular UI**: Después de cada operación, la respuesta contiene el presupuesto completo con totales actualizados. Usar estos valores directamente, no recalcular en el frontend.
2. **Piezas mixtas**: Cada pieza puede tener un material diferente. El motor de cálculo resuelve el precio de cada pieza independientemente.
3. **Orden de operaciones**: Si se necesitan múltiples cambios, cada llamada es atómica y recalcula. Para eficiencia, considerar hacer cambios en lote si el backend lo soporta en el futuro.
4. **IDs de piezas**: Los `_id` de las piezas se generan al crearlas. Usar estos IDs para las operaciones de `PATCH` y `DELETE`.
