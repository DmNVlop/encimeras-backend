# Documento de Proyecto: CartModule (Sistema de Carrito y Órdenes de Alta Disponibilidad)

## 1. Introducción

El objetivo de este proyecto es implementar una funcionalidad de **Carrito de Presupuestos** que permita a los usuarios agrupar configuraciones independientes (ej. "Cocina de Juana", "Baño Principal") en una única transacción comercial. El sistema está diseñado para soportar alta demanda mediante procesamiento asíncrono y estrategias de caché.

## 2. Arquitectura de Datos (Backend)

### 2.1 Entidades Principales

- **Cart (Carrito)**: Almacén temporal (Redis + MongoDB) que agrupa `CartItems`.
- **CartItem**: Instancia persistente de un presupuesto. Contiene el `customName` definido por el usuario y un `technicalSnapshot` (materiales, piezas, addons).
- **Draft (Borrador)**: Se extiende para soportar `cartGroupId`, permitiendo guardar y cargar colecciones completas de presupuestos.
- **OrderLineItem**: Se vincula al `cartItemName` para garantizar la trazabilidad hacia fábrica.

### 2.2 Estrategia de Rendimiento (High Availability)

- **Caché Multinivel**: Uso de Redis/In-memory para catálogos y reglas de precio en `QuotesService`.
- **Procesamiento Asíncrono (BullMQ)**: El checkout no bloquea el hilo principal. Se traslada a un Worker en background.
- **Idempotencia**: Control por `cartId` para evitar duplicidad de órdenes en picos de latencia.

---

## 3. Flujo de Experiencia de Usuario (Frontend)

### F1: Agrupación y Persistencia

1. El usuario finaliza el diseño de una encimera.
2. Al pulsar **"Añadir al Carrito"**, se abre un modal solicitando un alias (ej: _Isla de mármol_).
3. El sistema guarda el ítem y muestra el contador del carrito actualizado.
4. El usuario puede volver al configurador para añadir más elementos o editar los existentes desde el carrito.

### F2: Proceso de Checkout (Flujo de Alta Disponibilidad)

1. **Acción**: El usuario pulsa "Finalizar Pedido" en el carrito.
2. **Respuesta Inmediata**: El backend valida el estado del carrito y devuelve un `jobId` con estado `HTTP 202 Accepted`.
3. **Interfaz de Espera Activa**:
   - El carrito se bloquea (no se puede editar).
   - Se muestra una pantalla de procesamiento: _"Generando documentación técnica... Estamos preparando sus planos."_
   - El sistema escucha vía **WebSockets** el canal de eventos asignado a su sesión.

### F3: Resolución de la Orden

- **Éxito (Evento `order.completed`)**:
  - Transición visual a pantalla de éxito.
  - El carrito se marca como `CONVERTED` y se vacía de la vista activa.
- **Error (Evento `order.failed`)**:
  - El sistema muestra una alerta clara con el motivo del fallo.
  - **Recuperación Automática**: Se desbloquea el carrito y se devuelve al usuario a la vista de edición. _Ninguna información se pierde porque el carrito solo se borra tras el éxito confirmado._

---

## 4. Gestión de Casos de Borde y Errores

- **Pérdida de Conexión (Socket)**: El frontend implementa un "Polling de Rescate" cada 30 segundos si no recibe eventos del `jobId`.
- **Expiración de Precios**: Si un ítem del carrito tiene más de 24h, el sistema recalcula automáticamente al entrar en la vista de carrito y notifica al usuario si ha habido variaciones.
- **Borradores Grupales**: Al cargar un borrador que pertenece a un grupo, el sistema pregunta: _"Este presupuesto es parte de un conjunto. ¿Quieres cargar también la 'Cocina' y la 'Isla'?"_

## 5. Trazabilidad hacia Fabricación

Al finalizar la orden, cada `OrderLineItem` mantiene su `cartItemName`. En el panel administrativo y en los archivos de exportación para máquinas de corte, cada pieza irá etiquetada con su origen (ej: "Pieza A - Cocina de Juana"), eliminando errores de identificación en la cadena de montaje.
