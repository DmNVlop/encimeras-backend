# Documentación Técnica: Integración Frontend - Motor de Descuentos

Este documento describe el flujo de datos, los contratos de interfaz y la lógica de negocio que el equipo de Frontend debe implementar para integrar correctamente el sistema de clientes y descuentos.

---

## 1. Flujo de Interacción Seleccionador-Cálculo

Para una correcta experiencia de usuario y precisión en el precio, el frontend debe seguir este ciclo de vida:

1.  **Estado Inicial**: El presupuesto se calcula con `customerId: null`. Solo se aplican reglas de tipo `ALL`.
2.  **Selección de Cliente**: El usuario selecciona un cliente del buscador.
3.  **Disparo de Recálculo**: Al cambiar el `customerId`, se debe realizar una nueva llamada al endpoint de cálculo (Optimization/Budget) enviando el nuevo ID.
4.  **Actualización de UI**: El motor devuelve un desglose detallado. **No se debe calcular nada en el frontend**; solo se debe representar el resultado del backend.

---

## 2. Contratos de Datos (Entidades Clave)

### A. Payload de Envío (Request)

Al solicitar un cálculo, el objeto debe estructurarse así:

```typescript
interface BudgetCalculationRequest {
  factoryId: string;
  customerId?: string; // UUID del cliente seleccionado
  items: {
    id: string; // ID del material o proceso
    category: string; // Categoría del material (crucial para reglas por categoría)
    price: number; // Precio base unitario
    quantity: number; // Metros cuadrados, unidades, etc.
  }[];
}
```

### B. Respuesta del Motor (Response)

El backend devuelve el objeto `DiscountEngineResult`. El frontend debe mapear estos campos:

```typescript
interface DiscountEngineResult {
  originalTotal: number; // Suma de precios base sin descuentos
  finalTotal: number; // Precio final tras todas las reglas
  totalDiscount: number; // Ahorro total (originalTotal - finalTotal)

  // Reglas aplicadas (Para el resumen de totales)
  appliedRules: {
    ruleId: string;
    ruleName: string;
    discountAmount: number; // Cuánto restó esta regla específica
  }[];

  // Desglose por ítem (Para la tabla de materiales)
  itemBreakdown: {
    itemId: string;
    originalPrice: number;
    finalPrice: number;
    discountAmount: number; // Descuento total acumulado en esta línea
  }[];
}
```

---

## 3. Lógica Interna del Motor (Pseudocódigo)

El frontend debe conocer el orden de ejecución para explicarlo al usuario si es necesario:

```javascript
// 1. Filtrado
rules = activeRules.filter((r) => r.customerStrategy === "ALL" || r.targetCustomers.includes(currentCustomerId));

// 2. Ejecución por Jerarquía de Scope
// Primero: Ítems (Materiales/Categorías)
for (rule of rules.where(scope !== "GLOBAL_TOTAL")) {
  applyToLineItems(rule); // Modifica el precio de la línea
}

// Segundo: Totales
subtotal = sum(lineItems.finalPrice);
for (rule of rules.where(scope === "GLOBAL_TOTAL")) {
  if (subtotal >= rule.minOrderValue) {
    applyToTotal(rule); // Modifica el total final
  }
}
```

---

## 4. Guía de Implementación UI

### Tabla de Materiales (`itemBreakdown`)

Para cada fila de la tabla:

- **Si `discountAmount > 0`**:
  1.  Mostrar `originalPrice` tachado.
  2.  Mostrar `finalPrice` resaltado (ej. color verde).
  3.  Añadir un tooltip o icono informativo informando que se ha aplicado un descuento de categoría/material.

### Resumen de Totales

1.  **Subtotal**: Suma de precios base.
2.  **Descuentos**: Iterar el array `appliedRules`. Mostrar cada una como una línea negativa:
    - _Ejemplo_: `Descuento Primavera: -15.00€`
3.  **Total**: Valor de `finalTotal`.

### Editor de Reglas (Admin)

El formulario de creación de reglas debe tener validaciones cruzadas:

- Si `Type === 'FIXED_AMOUNT'`, la UI debe advertir que el descuento no debe superar el precio base esperado.
- Si `Scope === 'SPECIFIC_MATERIALS'`, el campo `targetMaterials` (array de IDs) es **obligatorio**.
- Si `CustomerStrategy === 'SPECIFIC_CUSTOMERS'`, el campo `targetCustomers` es **obligatorio**.

---

## 5. Endpoints Relacionados

- `GET /customers`: Para el buscador de clientes en el presupuesto.
- `GET /discount-rules/active`: Para pre-visualizar reglas vigentes (opcional).
- `POST /quotes/calculate`: El endpoint principal que consume el `DiscountEngineService`.
