# Documentación del Proyecto: Sistema de Presupuestado y Carrito

Bienvenido a la documentación técnica del backend de Presupuesto-Encimeras.

## 📂 Estructura de Documentación

### 1. 📡 [APIs](./api/)

Detalle de todos los endpoints disponibles para el frontend.

- [Cálculo de Precios](./api/quotes-calculate-api.md): El motor core.
- [Carrito de Compras](./api/cart-api.md): Gestión de pedidos múltiples.
- [Borradores](./api/drafts-api.md): Persistencia temporal.
- [Órdenes](./api/orders-api.md): Ciclo de vida de pedidos firmes.

### 2. 🎨 [UX/UI e Integración](./ux-ui/)

Guías específicas para que el equipo de frontend sincronice con el negocio.

- **[Resumen Ejecutivo para Debate](./ux-ui/resumen-ejecutivo-sincronizacion.md)**: Punto de inicio para la reunión de equipo.
- **[Guía Crítica: Datos Core vs UI](./ux-ui/guia-datos-core-ui.md)**: Cómo enviar los datos sin romper el motor de precios.
- [Flujo de Descuentos](./ux-ui/flujo-descuentos-frontend.md): Visualización de reglas comerciales.

### 3. 🛠️ [Desarrollo (Dev Ops)](./dev/)

Arquitectura interna para desarrolladores backend.

- [Infraestructura de Colas (Redis)](./dev/infra-colas-redis.md): Procesamiento asíncrono.
- [Especificación Técnica Carrito](./dev/especificacion-modulo-carrito.md): Detalles de implementación interna.

### 4. 💼 [Negocio / Admin](./business/)

Manuales para administradores del sistema.

- [Manual de Descuentos](./business/manual-descuentos-admin.md).

---

## 🏛️ Principios de la Arquitectura Actual

- **Separación CORE/UI**: El backend valida el negocio (`core`), el frontend gestiona la experiencia (`uiState`).
- **Inmutabilidad**: Las órdenes congelan los precios en el momento del checkout.
- **BFF (Backend For Frontend)**: El backend entrega datos "masticados" (hidratados) para que la UI vuele.
