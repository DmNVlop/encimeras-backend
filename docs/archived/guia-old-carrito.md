# Guía de Integración Frontend: Adaptación Estricta del Carrito y Borradores al Motor de Precios

## El Problema Actual

Hasta ahora, el frontend enviaba al carrito (y a los borradores) un objeto `configuration` con el estado puramente visual del wizard (ej. usando `length` o `width` en lugar de `length_mm` y `width_mm`, y `addons` en lugar de `appliedAddons`).
El problema es que cuando el backend intentaba **recalcular/validar el precio por seguridad** usando `QuotesService.calculate`, este motor estricto no encontraba las variables necesarias y producía precios de 0 pts.

## La Solución Arquitectónica

De cara a mantener el código limpio y libre de deuda técnica, hemos decidido **no añadir mappers ni fallbacks en el backend**.
El motor central de cálculo (`CalculateQuoteDto`) es la **única fuente de verdad** sobre cómo debe estructurarse una pieza para ser presupuestada.

Por lo tanto, **el Frontend debe alinear la data que envía al backend con la estructura estricta del motor de cálculo.**

---

## Cambios Requeridos en el Frontend

### 1. Nomenclatura Estricta en `mainPieces`

Antes de hacer el `POST /cart/items` o guardar un borrador (`POST /drafts`), debes asegurarte de que cada pieza dentro del array `mainPieces` de la configuración cumple esta interfaz exacta:

```typescript
// ESTO ES LO QUE EL BACKEND ESPERA RECIbir POR CADA PIEZA
interface StrictMainPiece {
  id?: string;
  materialId: string;
  selectedAttributes: Record<string, string>; // NO "attributes"

  length_mm: number; // NO "length"
  width_mm: number; // NO "width"

  appliedAddons?: {
    // NO "addons"
    code: string;
    measurements?: Record<string, number>;
    quantity?: number;
  }[];
}
```

### 2. Ejemplo Práctico de Transformación (Antes de hacer POST)

Si en tu estado de React/Zustand tienes variables distintas, debes hacer un `.map()` antes de enviarlo:

```javascript
// DENTRO DE TU FUNCIÓN AL DAR CLIC A "AÑADIR AL CARRITO"

// 1. Mapear el estado visual a la interfaz estricta (Calculon)
const strictMainPieces = wizardState.mainPieces.map((piece) => ({
  id: piece.id,
  materialId: piece.material?.id || piece.materialId,
  selectedAttributes: piece.attributes || piece.selectedAttributes || {},

  // 🔥 CAMBIO CLAVE A MANO
  length_mm: piece.length || piece.length_mm,
  width_mm: piece.width || piece.width_mm,

  // 🔥 CAMBIO CLAVE A MANO
  appliedAddons: (piece.addons || piece.appliedAddons || []).map((addon) => ({
    code: addon.code,
    measurements: addon.measurements,
    quantity: addon.quantity,
  })),
}));

// 2. Construir el DTO Final
const payloadToBackend = {
  customName: "Cocina de Juana",
  subtotalPoints: precioYaCalculadoEnElFrontend,
  draftId: lastDraftId,
  configuration: {
    ...wizardState,
    mainPieces: strictMainPieces, // Reemplazamos las piezas laxas por las estrictas
  },
};

// 3. Enviar
await api.post("/cart/items", payloadToBackend);
```

### 3. Consideraciones sobre `subtotalPoints`

El frontend debe seguir enviando `subtotalPoints` (el precio que se calculó previamente usando el Endpoint de `calculate`). Sin embargo, el carrito **recalculará el precio en el servidor como medida de seguridad** antes de guardarlo en base de datos para prevenir manipulación del body.
Si el formato enviado es estrictamente correcto, ambos precios cuadrarán a la perfección.

### 4. Resumen de Nombres a Erradicar al enviar al Backend (Dentro de las piezas)

| ❌ NO ENVIAR ESTO | ✅ ENVIAR ESTO                               |
| :---------------- | :------------------------------------------- |
| `length`          | `length_mm`                                  |
| `width`           | `width_mm`                                   |
| `attributes`      | `selectedAttributes`                         |
| `addons`          | `appliedAddons`                              |
| `material.id`     | `materialId` (en el primer nivel del objeto) |
