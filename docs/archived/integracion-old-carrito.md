# Guía de Integración para Frontend: Módulo de Carrito y Órdenes Asíncronas

Esta guía detalla los cambios necesarios en el Frontend para integrarse con el nuevo `CartModule` y el flujo de órdenes asíncronas.

## 1. Cambios en Modelos Existentes (Breaking Changes)

### 1.1 Órdenes (`OrderLineItem`)

Cada línea de pedido ahora requiere una propiedad de identificación para trazabilidad técnica.

- **Atributo añadido:** `cartItemName: string`
- **Uso:** Mostrar en la UI de la orden a qué área pertenece cada grupo de piezas (ej: "Cocina de Juana").

### 1.2 Borradores (`Draft`)

Los borradores ahora pueden estar agrupados.

- **Atributo añadido:** `cartGroupId?: string`
- **Lógica recomendada:** Al cargar un borrador, si existe `cartGroupId`, consultar al usuario si desea cargar el resto de elementos del grupo en el carrito.

---

## 2. Nuevo Módulo de Carrito (`/cart`)

### 2.1 Endpoints Principales

- `GET /cart`: Recupera el carrito activo del usuario.
- `POST /cart/items`: Añade una configuración al carrito.
  - Body: `{ customName: string, configuration: QuoteConfig, subtotalPoints: number, draftId?: string }`
- `DELETE /cart/items/:cartItemId`: Elimina un ítem.
- `POST /cart/save-as-drafts`: Convierte el contenido del carrito en una colección de borradores agrupados.

---

## 3. Implementación del Flujo de Checkout Asíncrono (CRÍTICO)

El proceso de compra ya no devuelve la orden creada, sino un identificador de trabajo (`jobId`).

### Paso A: Solicitud de Checkout

```javascript
// POST /cart/checkout -> Respuesta:
{
  "message": "Proceso iniciado asíncronamente.",
  "jobId": "12345",
  "status": "processing"
}
```

### Paso B: Escucha de WebSockets

El Frontend DEBE estar suscrito a los siguientes eventos de Socket.io:

1. **`orders:new` (Éxito)**
   - El backend enviará el objeto `OrderHeader` cuando la orden esté persistida.
   - **Acción:** Navegar a la pantalla de "Pedido Completado".

2. **`orders:fail` (Error)**
   - El backend enviará un payload: `{ jobId: string, customerId: string, message: string }`.
   - **Acción:** Mostrar notificación de error (Toast/Alert) y **desbloquear** la UI del carrito para permitir reintentos.

---

## 4. Ejemplo de Implementación Sugerida (Workflow UI)

1. Usuario pulsa "Pagar".
2. UI muestra un overlay de bloqueo con un mensaje: _"Estamos procesando su pedido y generando los planos técnicos. No cierre la ventana."_
3. Al recibir `orders:new` vía Socket:
   - Ocultar overlay.
   - Limpiar estado local del carrito.
   - Mostrar pantalla de éxito con el ID de la orden recibida.
4. Si pasan más de 45 segundos sin respuesta:
   - Ofrecer un botón de "Verificar estado" que llame manualmente a un endpoint de consulta.
