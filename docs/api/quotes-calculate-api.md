# API: Cálculo de Presupuesto Real-Time

Este documento detalla el funcionamiento, los parámetros de entrada y la estructura de respuesta del endpoint `/quotes/calculate`. Este endpoint es el motor principal para calcular precios dinámicos, incluyendo accesorios (addons) y el nuevo motor de descuentos por cliente/fábrica.

---

## 1. Información General

- **Endpoint**: `/quotes/calculate`
- **Método**: `POST`
- **Autenticación**: Pública (No requiere JWT para el cálculo inicial, aunque `customerId` es necesario para descuentos específicos).
- **Propósito**: Calcular el desglose de puntos (precios) de un proyecto de encimeras antes de ser guardado.

---

## 2. Petición (Request JSON)

El payload debe ser un objeto `CalculateQuoteDto`.

### Estructura del Payload

| Campo        | Tipo                  | Requerido | Descripción                                                                 |
| :----------- | :-------------------- | :-------- | :-------------------------------------------------------------------------- |
| `mainPieces` | `Array<MainPieceDto>` | Sí        | Lista de piezas (encimeras) que componen el proyecto.                       |
| `customerId` | `String`              | No        | ID del cliente. Si se proporciona, se aplicarán sus descuentos específicos. |
| `factoryId`  | `String`              | No        | ID de la fábrica. Si no viene, se intentará deducir del cliente.            |

### Detalle de `MainPieceDto`

| Campo                | Tipo               | Requerido | Descripción                                                            |
| :------------------- | :----------------- | :-------- | :--------------------------------------------------------------------- |
| `id`                 | `String`           | No        | ID temporal (frontend). Utilizado para correlacionar en la respuesta.  |
| `materialId`         | `String` (MongoId) | Sí        | ID del material seleccionado.                                          |
| `selectedAttributes` | `Object`           | Sí        | Diccionario de atributos (ej: `{ "COLOR": "SNOW", "ESPESOR": "20" }`). |
| `length_mm`          | `Number`           | Sí        | Longitud en milímetros.                                                |
| `width_mm`           | `Number`           | Sí        | Anchura en milímetros.                                                 |
| `appliedAddons`      | `Array<AddonDto>`  | No        | Lista de accesorios/trabajos sobre la pieza.                           |

### Detalle de `AddonDto` (Dentro de `appliedAddons`)

| Campo          | Tipo     | Requerido | Descripción                                                    |
| :------------- | :------- | :-------- | :------------------------------------------------------------- |
| `code`         | `String` | Sí        | Código único del accesorio (ej: `ENCASTRE_FREGADERO_SOBRE`).   |
| `quantity`     | `Number` | No        | Cantidad (por defecto 1).                                      |
| `measurements` | `Object` | No        | Medidas específicas (ej: `{ "length_ml": 2.5 }` para copetes). |

---

## 3. Ejemplo de Petición

```json
{
  "customerId": "65d8f3a2...",
  "mainPieces": [
    {
      "id": "ui-unique-id-1",
      "materialId": "65d8f2b1...",
      "length_mm": 2500,
      "width_mm": 600,
      "selectedAttributes": {
        "MAT_GROUP": "BASIC",
        "THICKNESS": "20"
      },
      "appliedAddons": [
        {
          "code": "COPETE_ESTANDAR",
          "measurements": {
            "length_ml": 2.5,
            "height_mm": 50
          }
        },
        {
          "code": "HUECO_FREGADERO_ENCIMERA",
          "quantity": 1
        }
      ]
    }
  ]
}
```

---

## 4. Respuesta (Response JSON)

La respuesta devuelve un desglose detallado tanto del precio base como de los descuentos.

### Estructura de Respuesta

| Campo              | Tipo                 | Descripción                                                          |
| :----------------- | :------------------- | :------------------------------------------------------------------- |
| `totalPoints`      | `Number`             | Puntos totales **antes** de descuentos.                              |
| `finalTotalPoints` | `Number`             | Puntos totales **después** de aplicar todas las reglas de descuento. |
| `totalDiscount`    | `Number`             | Suma total ahorrada (`totalPoints - finalTotalPoints`).              |
| `appliedRules`     | `Array<AppliedRule>` | Lista de reglas que se activaron (nombre e importe descontado).      |
| `pieces`           | `Array<PieceDetail>` | Desglose individual de cada pieza enviada en el request.             |

### Detalle de `AppliedRule`

| Campo            | Tipo     | Descripción                                                     |
| :--------------- | :------- | :-------------------------------------------------------------- |
| `ruleId`         | `String` | ID de la regla de descuento.                                    |
| `ruleName`       | `String` | Nombre público/administrativo de la regla applied.              |
| `discountAmount` | `Number` | Cuánto descontó esta regla específica en el total del proyecto. |

### Detalle de `PieceDetail` (En la respuesta)

| Campo              | Tipo                 | Descripción                                                                |
| :----------------- | :------------------- | :------------------------------------------------------------------------- |
| `id`               | `String`             | ID temporal enviado por el front (si no se envió, se genera uno `temp-X`). |
| `pieceName`        | `String`             | Nombre por defecto para visualización (ej: "Pieza 1").                     |
| `materialName`     | `String`             | Nombre legible del material (ej: "Silestone Snow").                        |
| `basePricePoints`  | `Number`             | Precio de la superficie base de la encimera.                               |
| `subtotalPoints`   | `Number`             | Suma de base + addons de ESTA pieza (sin descuentos todavía).              |
| `discountAmount`   | `Number`             | Descuento aplicado específicamente a esta línea/pieza.                     |
| `finalPricePoints` | `Number`             | Precio final de esta pieza (`subtotalPoints - discountAmount`).            |
| `addons`           | `Array<AddonDetail>` | Desglose de accesorios calculados para esta pieza.                         |

---

## 5. Lógica de Cálculo (Flujo Interno)

Es importante que el equipo de Frontend entienda el orden de operaciones para mostrar tooltips informativos:

1.  **Precio Base M2/ML**: Se busca la combinación de atributos en `priceConfigs`. Se multiplica por el área o longitud.
2.  **Addons**: Cada addon calcula su propio precio según su `pricingType` (Fijo, Rangos, o Combinación).
3.  **Subtotal de Pieza**: Suma de material + accesorios.
4.  **MOTOR DE DESCUENTOS** (Nuevo):
    - **Step A (Filtro)**: Se buscan reglas para la fábrica del cliente que coincidan con el `customerId` (o globales).
    - **Step B (Scope: Material/Categoría)**: Se aplican descuentos a las líneas individuales (ej: "10% dto en Silestone").
    - **Step C (Scope: Global Total)**: Sobre el subtotal acumulado, se aplican descuentos finales (ej: "-50€ por compras superiores a 1000€").

---

## 6. Guía para el Frontend

1.  **Persistencia del ID**: El campo `id` enviado en `mainPieces` es devuelto tal cual. Úsenlo para actualizar el estado del componente específico de la pieza en vuestro store/state.
2.  **Visualización de Precios**:
    - Usar `totalPoints` como el "Subtotal" general.
    - Listar las `appliedRules` como ítems de descuento.
    - Usar `finalTotalPoints` como el "Total a Pagar".
3.  **Recálculo**: Deben invocar este endpoint cada vez que:
    - Se cambie algún atributo del material.
    - Se modifiquen medidas (`length_mm`, `width_mm`).
    - Se añadan/quiten addons.
    - **Novedad**: Se seleccione un cliente diferente en el buscador de clientes.
4.  **Persistencia en Carrito/Borrador**: Cuando se guarda un presupuesto, el `customerId` seleccionado debe viajar dentro del objeto `core` para que el backend lo use en futuros recálculos automáticos. (Ej: `core: { ..., customerId: "..." }`).

---

## 7. Ejemplo de Respuesta Completa

```json
{
  "totalPoints": 1500,
  "finalTotalPoints": 1305,
  "totalDiscount": 195,
  "appliedRules": [
    {
      "ruleId": "65d8f...",
      "ruleName": "Campaña Primavera -10% Materiales",
      "discountAmount": 150
    },
    {
      "ruleId": "65d8e...",
      "ruleName": "Bono Fidelidad Fijo",
      "discountAmount": 45
    }
  ],
  "pieces": [
    {
      "id": "ui-unique-id-1",
      "pieceName": "Pieza 1",
      "materialName": "Silestone Snow",
      "basePricePoints": 1200,
      "subtotalPoints": 1500,
      "discountAmount": 150,
      "finalPricePoints": 1350,
      "addons": [
        {
          "addonName": "COPETE_ESTANDAR",
          "name": "Copete Estándar Cantos Rectos",
          "pricePoints": 150
        },
        {
          "addonName": "HUECO_FREGADERO",
          "name": "Hueco Fregadero Encimera",
          "pricePoints": 150
        }
      ]
    }
  ]
}
```
