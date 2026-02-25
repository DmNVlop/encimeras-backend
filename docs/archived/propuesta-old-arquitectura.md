# Propuesta Arquitectónica: Separación de Estado UI vs Entidades de Negocio (Borradores y Carrito)

## 1. Contexto y Problema Actual

Actualmente, existe una desalineación de estructuras de datos entre el Frontend y el Motor de Cálculo del Backend. Esta desalineación se hizo evidente al integrar el módulo del Carrito de Compras y el sistema de Borradores.

**¿Qué ocurrió exactamente?**

1. **Motor de Cálculo Estricto:** El endpoint de cálculo de presupuestos (`/quotes/calculate`) exige una estructura de datos muy estricta y orientada al negocio (ej: `length_mm`, `width_mm`, `appliedAddons`, `materialId`).
2. **Evolución del Frontend (Wizard):** El frontend, para poder dibujar la interfaz del presupuestador paso a paso, maneja un estado mucho más complejo e hidratado (ej: `measurements.length_mm`, formas tridimensionales completas, objetos anidados temporalmente).
3. **El Conflicto en Borradores/Carrito:** Cuando se desarrolló la función de guardar borradores o enviar ítems al carrito, el objetivo principal fue "guardar la sesión del usuario para poder restaurarla tal cual". Por simplicidad, se optó por guardar el **Estado Crudo de React (UI State)** directamente en la base de datos dentro del campo `configuration`.
4. **La Falla:** Cuando el Carrito evolucionó para requerir un **re-cálculo de seguridad** en el backend antes del checkout, intentó pasarle ese estado crudo de React al Motor de Cálculo. El motor, esperando la estructura estricta de negocio, falló silenciosamente o devolvió precios de 0 pts al no encontrar las propiedades en la raíz del objeto.

---

## 2. La Raíz del Problema: Acoplamiento de Responsabilidades

El problema arquitectónico subyacente es que estamos usando la **misma estructura de datos** para dos propósitos completamente distintos:

1. **Restaurar la UI (Frontend):** Necesita metadatos visuales, saber en qué paso se quedó el usuario, qué opciones estaban desplegadas temporalmente, etc.
2. **Calcular Tarifas (Backend Core):** Solo necesita saber las dimensiones exactas, IDs de materiales y complementos aplicados. Nada más.

Al mezclar ambos en un solo JSON monolítico (`configuration`), obligamos al motor de backend a lidiar con "basura visual", o forzamos al frontend a perder capacidad de restaurar su estado si lo aplanamos prematuramente.

---

## 3. Propuesta de Solución: Separación UI Metadata vs Core Entities

Para resolver esto de forma definitiva y escalable, proponemos evolucionar el esquema de datos que comparten el Frontend y el Backend para Carritos y Borradores.

### 3.1. Nuevo Esquema de Datos Sugerido (DTO)

El payload para guardar un Borrador o añadir al Carrito debe dividirse explícitamente en dos grandes bloques:

```json
{
  "name": "Mi Proyecto de Cocina",
  "customerId": "...",

  // 1. ENTIDADES DE NEGOCIO (CORE CONTRACT)
  // Estructura ESTRICTA requerida por el motor de cálculo de precios.
  // El frontend envía esto ya "limpio" y mapeado.
  "coreEntities": {
    "mainPieces": [
      {
        "id": "uuid-1",
        "materialId": "mat-123",
        "length_mm": 2500,
        "width_mm": 600,
        "selectedAttributes": { ... },
        "appliedAddons": [
           { "code": "RODAPIE", "quantity": 1 }
        ]
      }
    ]
  },

  // 2. METADATOS DE INTERFAZ (UI METADATA)
  // Datos opacos para el backend. El backend solo los guarda y los devuelve intactos.
  // Sirven exclusivamente para que el Frontend hidrate su contexto temporal al restaurar.
  "uiMetadata": {
    "wizardTempMaterial": { ... }, // Objeto completo del material para dibujarlo rápido sin llamar a API extra
    "selectedShapeId": "shape-L",
    "lastActiveStep": 3,
    "measurementsTemporaryState": { ... } // Estructuras anidadas propias de los formularios de React
  },

  "currentPricePoints": 150000
}
```

### 3.2. Cómo convive todo en la aplicación

Con esta separación, el ciclo de vida de los datos queda perfectamente delimitado:

1. **Guardar Borrador / Carrito:**
   - El usuario pulsa "Guardar".
   - El Frontend toma su estado complejo de React.
   - Ejecuta un **Adapter/Mapper** que extrae y aplana los datos para construir `coreEntities`.
   - El resto del estado sucio lo empaqueta en `uiMetadata`.
   - Envía el JSON estructurado al Backend.

2. **Re-cálculo en el Backend (Checkout / Validación):**
   - El Backend recibe la orden de checkout del Carrito.
   - Toma **exclusivamente** el nodo `coreEntities` y se lo envía al `QuotesService.calculate()`.
   - Al estar los datos ya limpios y en el formato estricto, el cálculo es perfecto y 100% fiable.

3. **Restaurar Borrador / Carrito en Pantalla:**
   - El usuario abre un borrador guardado semanas atrás.
   - El Frontend recibe el JSON desde el Backend.
   - Lee el nodo `uiMetadata` e hidrata el Contexto de React (`Zustand` o `Context API`) exactamente como estaba.
   - La interfaz se dibuja a la perfección.

---

## 4. Estándares a Implementar (Frontend & Backend)

Para que esta arquitectura se mantenga en el tiempo y no volvamos a perder la alineación, se deben acordar los siguientes estándares:

1. **Única Fuente de Verdad (Single Source of Truth):**
   - Los DTOs del motor de cálculo (`CalculateQuoteDto`, `StrictMainPiece`) deben estar claramente documentados (Swagger/OpenAPI) o tipados de antemano.
   - El frontend debe replicar la interfaz TypeScript exacta del `coreEntities` para que el compilador avise de cualquier cambio.

2. **Capa de Adaptadores (Mappers) Obligatoria en Frontend:**
   - Ningún componente de React (UI) debe construir directamente cargas útiles (payloads) para APIs que involucren persistencia de modelos de negocio.
   - Toda llamada a `cartApi.addItem` o `draftsApi.create` debe pasar sus argumentos por un Mapper puro (ej. `mapUiStateToDraftDto()`) ubicado en la capa de servicios (`src/adapters/`).

3. **Inmutabilidad del UI Metadata:**
   - El Backend hace un pacto formal: No iterará, no validará, ni mutará absolutamente nada del nodo `uiMetadata`. Lo tratará como un Blob o JSON Field (en PostgreSQL/MongoDB) de libre esquema. Es dominio exclusivo del cliente.

## 5. Resumen de Beneficios

- **Seguridad y Fiabilidad:** El motor de cálculo nunca más fallará por recibir propiedades anidadas o nombres incorrectos.
- **Flexibilidad en UI:** El equipo de Frontend puede refactorizar componentes, cambiar la forma en que anidan variables o el diseño del Wizard sin miedo a romper la facturación del backend.
- **Trazabilidad:** Queda explícito en la base de datos qué es lo que se cobra (`coreEntities`) y qué es lo que se dibuja (`uiMetadata`).
