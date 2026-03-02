# Resumen Ejecutivo: Nueva Arquitectura de Sincronización Core/UI

## 🎯 Objetivo de la Reunión

Resolver la desincronización entre el Motor de Cálculo (Backend) y el Estado del Wizard (Frontend), garantizando precios 100% fiables y una UI que recupera su estado sin buffers intermedios.

---

## 🛠️ 1. El Cambio: División de la "Configuración"

El antiguo objeto `configuration` desaparece. Ahora toda persistencia (Carrito y Borradores) utiliza este contrato:

```typescript
{
  "customName": "Cocina de Juana",
  "core": {
     // CONTRATO ESTRICTO DE NEGOCIO
     // El motor de cálculo solo mira este objeto.
     "mainPieces": [...],
     "factoryId": "..."
  },
  "uiState": {
     // CAJÓN DE SASTRE PARA EL FRONTEND
     // El backend lo guarda y devuelve pero NO lo valida.
     "wizardTempMaterial": {...},
     "selectedShapeId": "L",
     "currentStep": 3,
     "anyCustomUIVariable": ...
  }
}
```

---

## ⚡ 2. El Beneficio: Patrón BFF (Backend For Frontend)

Para evitar que el Front tenga que hacer peticiones extra para "traducir" IDs de materiales a nombres/fotos al cargar el carrito, el Backend ahora **hidrata** los datos en tiempo real.

**Respuesta del `GET /cart`:**

```json
{
  "cartItemId": "...",
  "core": { "materialId": "mat123" },
  "uiState": { ... },
  "hydratedContext": {
     "materials": [
        { "_id": "mat123", "name": "Silestone Blanco", "image": "..." }
     ]
  }
}
```

> **Acción Front**: Usar `hydratedContext` para pintar la lista del carrito instantáneamente.

---

## 📋 3. Puntos de Debate / Acuerdo

1.  **Mappers en Front**: Implementar un `CoreMapper` que limpie el estado de Zustand antes de enviarlo al backend.
2.  **Precio Re-calculado**: Al cargar un borrador, si el backend devuelve `status: EXPIRED_RECALCULATED`, acordar el componente visual de aviso al usuario.
3.  **Seguridad**: El Front debe dejar de enviar el campo `subtotalPoints` (el backend lo calculará de nuevo por seguridad).

---

## 📂 Documentación de Apoyo

- [Guía de Implementación Detallada](../ux-ui/guia-datos-core-ui.md)
- [Nueva Especificación del Carrito](../api/cart-api.md)
