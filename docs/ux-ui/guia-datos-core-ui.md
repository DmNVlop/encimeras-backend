# Guía de Transición: Nueva Arquitectura de Datos (Separación Core/UI)

Esta guía detalla los cambios realizados en el backend para separar la lógica de negocio de los metadatos de interfaz. Este cambio asegura que el motor de cálculo de precios sea 100% fiable y que el frontend pueda guardar cualquier estado visual sin riesgo de romper el sistema.

## 1. El Concepto Principal: Separación de Responsabilidades

Hemos dividido el antiguo campo `configuration` (en Carrito y Borradores) en dos nuevos campos:

1.  **`core` (Negocio):** Contrato estricto con el backend. Solo contiene lo necesario para calcular el precio (piezas, medidas, fábrica).
2.  **`uiState` (Frontend):** Nodo opaco para el backend. Podéis guardar aquí cualquier objeto complejo, estados temporales del Wizard o metadatos visuales. El backend lo guarda y lo devuelve intacto.

---

## 2. Cambios en el API y DTOs

### 2.1. Guardar Ítem en Carrito (`POST /cart/items`)

**Antes:** Se enviaba `configuration`.
**Ahora:** Se envía `core` y, opcionalmente, `uiState`.

**Nuevo Payload sugerido:**

```json
{
  "customName": "Cocina de Juana",
  "core": {
    "mainPieces": [
      {
        "materialId": "65db8...",
        "length_mm": 2500,
        "width_mm": 600,
        "selectedAttributes": { "COLOR": "Blanco", "ESPESOR": "20" },
        "appliedAddons": []
      }
    ],
    "factoryId": "65db1..."
  },
  "uiState": {
    "wizardTempMaterial": { "id": "...", "name": "...", "imageUrl": "..." },
    "selectedShapeId": "shape-L",
    "lastStep": 3
  }
}
```

### 2.2. Guardar Borrador (`POST /drafts`)

Mismo cambio que el carrito. Se requiere el campo `core` para que el backend pueda validar el precio antes de guardar.

---

## 3. Patrón BFF y Hidratación de Datos

Para evitar que el frontend tenga que hacer múltiples llamadas después de restaurar un borrador o abrir el carrito, el backend ahora implementa un **BFF (Backend For Frontend)** en el `GET /cart`.

### 3.1. Respuesta del Carrito (`GET /cart`)

El backend inyecta automáticamente un campo llamado `hydratedContext` en cada ítem. Este campo contiene los documentos completos de los materiales referenciados en el `core`.

**Ejemplo de respuesta hidratada:**

```json
{
  "cartItemId": "...",
  "core": { ... },
  "uiState": { ... },
  "hydratedContext": {
    "materials": [
      { "_id": "65db8...", "name": "Silestone Blanco Zeus", "category": "PREMIUM", ... }
    ]
  }
}
```

**Ventaja:** Podéis usar `hydratedContext.materials` para pintar el nombre y la foto del material inmediatamente sin buscarlo en vuestra caché o llamar a otro endpoint.

---

## 4. Recomendaciones para el Frontend

1.  **Mapeadores (Adapters):** Cread una función `mapStateToCoreDto(state)` que extraiga solo los campos de `core` desde vuestro Store (Zustand/Redux).
2.  **Precio de Confianza:** Ignorad cualquier precio calculado localmente al guardar. El backend ignorará campos de precio enviados por el cliente y siempre devolverá el calculado por el motor oficial en la respuesta.
3.  **Restauración de Estado:** Al abrir un borrador, usad `uiState` para posicionar al usuario en el paso correcto, pero usad `core` + `hydratedContext` para llenar los datos de la configuración actual.

---

## 5. Resumen Técnico de Campos (Typescript)

```typescript
interface CoreEntityDto {
  mainPieces: MainPieceDto[]; // Estructura estricta ya conocida
  factoryId?: string;
}

interface CartItem {
  cartItemId: string;
  customName: string;
  core: CoreEntityDto; // REQUERIDO
  uiState?: Record<string, any>; // OPCIONAL (Metadatos Visuales)
  subtotalPoints: number; // CALCULADO POR BACKEND
  hydratedContext?: any; // INYECTADO POR BACKEND EN GET
}
```
