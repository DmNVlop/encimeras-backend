# KUUK ERP - Backend de Presupuestado de Encimeras

Motor de cálculo y gestión de pedidos para proyectos de superficies (mármoles, piedras, etc.). Diseñado con una arquitectura desacoplada para separar la lógica de negocio técnica de la experiencia de usuario.

---

## 🚀 Stack Tecnológico

- **Framework**: [NestJS](https://nestjs.com/) (Node.js) con TypeScript.
- **Base de Datos**: [MongoDB](https://www.mongodb.com/) con Mongoose.
- **Mensajería / Colas**: [BullMQ](https://docs.bullmq.io/) sobre Redis (Procesos asíncronos).
- **Comunicación**: [Socket.io](https://socket.io/) (Notificaciones en tiempo real).
- **Documentación**: [Swagger](https://swagger.io/) (Endpoint `/api`).

---

## 🏛️ Decisiones de Arquitectura

- **Separación CORE/UI**: El backend solo valida el nodo `core`. El frontend inyecta `uiState` (opaco) para restaurar la sesión visual del usuario sin riesgo de corromper el cálculo.
- **Aislamiento de Identidad**: Distinción estricta entre **UserId** (quién crea el dato: Vendedor/Admin) y **CustomerId** (identidad de negocio para aplicar descuentos).
- **Inmutabilidad de Órdenes**: Al realizar el checkout, se toma un snapshot del `core` y los precios calculados, blindándolos ante cambios futuros en tarifas maestros.
- **Estrategia BFF**: Hidratación automática de materiales en carritos y borradores para minimizar llamadas de red desde el frontend.

---

## 📂 Documentación Técnica

Contamos con una suite completa de guías detalladas en la carpeta [`/docs`](./docs/):

### 📡 APIs Principales

- [Cálculo de Precios (Real-time)](./docs/api/quotes-calculate-api.md)
- [Gestión de Carrito](./docs/api/cart-api.md)
- [Borradores (Drafts)](./docs/api/drafts-api.md)
- [Órdenes y Pedidos](./docs/api/orders-api.md)

### 🎨 Integración Frontend

- **[Guía Crítica: Datos Core vs UI](./docs/ux-ui/guia-datos-core-ui.md)** (Lectura obligatoria para Frontend).
- [Flujo de Descuentos](./docs/ux-ui/flujo-descuentos-frontend.md).

---

## 🛠️ Instalación y Desarrollo

### Requisitos Previos

- Node.js (v20+)
- Docker (Para Redis y MongoDB si se desea local)

### Levantar Infraestructura (Redis)

```bash
docker-compose up -d
```

### Iniciar Servidor

```bash
# Instalación de dependencias
npm install

# Modo desarrollo
npm run start:dev

# Build para producción
npm run build
```

---

## 📄 Licencia

Este proyecto es propiedad privada. Uso no autorizado prohibido.
