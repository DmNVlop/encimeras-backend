# Guía de Sincronización de Seguridad: Roles y Accesos (Frontend -> Backend)

Este documento detalla la estructura de permisos implementada en el Frontend para que el equipo de Backend pueda replicar y blindar la seguridad a nivel de API (RBAC - Role Based Access Control).

> [!IMPORTANT]
> La seguridad en el Frontend es meramente **funcional y de UX**. El Backend debe ser el responsable último de validar que el usuario que realiza la petición tiene el rol adecuado para ejecutarla.

## 1. Roles Base

El sistema utiliza los siguientes identificadores (strings exactos):

- `ADMIN`: Acceso total.
- `SALES`: Gestión comercial y presupuestación.
- `USER`: Cliente final, solo gestión de sus propios datos/presupuestos.
- `WORKER`: Operario, solo acceso a terminal de fábrica.

## 2. Matriz de Permisos (Endpoints Sugeridos)

| Módulo / Recurso    | Operación (CRUD)                    | Roles Permitidos | Notas                                              |
| ------------------- | ----------------------------------- | ---------------- | -------------------------------------------------- |
| **Auth**            | Login / Register                    | Público          | -                                                  |
| **Users**           | GET / POST / PATCH / DELETE         | `ADMIN`          | Gestión de personal de la empresa.                 |
| **Customers**       | GET / POST / PATCH                  | `ADMIN`, `SALES` | Gestión de clientes finales.                       |
| **Quotes / Orders** | GET (All)                           | `ADMIN`, `SALES` | Ver todas las órdenes de la empresa.               |
| **Quotes / Orders** | GET (Own) / POST                    | `USER`           | El cliente solo ve lo suyo.                        |
| **Discount Rules**  | POST / PATCH / DELETE               | `ADMIN`          | Solo el administrador define márgenes.             |
| **Discount Rules**  | GET                                 | `ADMIN`, `SALES` | Los comerciales pueden consultarlas.               |
| **Master Data**     | Materiales, Cantos, Precios, Reglas | `ADMIN`          | Blindar escritura para evitar sabotaje de precios. |

## 3. Requerimientos de Implementación en API

### A. Validación de Token (Middleware)

- Todas las rutas excepto `/auth` deben requerir un `Authorization: Bearer <JWT>`.
- El JWT debe contener el array de `roles` en el payload para evitar consultas constantes a la base de datos en peticiones sencillas.

### B. Decoradores de Rol (Sugerencia NestJS/Express)

Se recomienda encarecidamente usar decoradores por ruta para garantizar que el `SALES` no pueda, por ejemplo, borrar un `Material` haciendo una petición manual a la API:

```typescript
// Ejemplo conceptual
@Roles(Role.ADMIN)
@Delete(':id')
removeMaterial(@Param('id') id: string) { ... }
```

### C. Filtros de Propiedad (Seguridad de Datos)

- Al devolver un objeto `User`, el Backend **nunca** debe enviar el campo `password`.
- Al devolver `Orders`, si el rol es `USER`, el Backend debe filtrar por `userId` automáticamente en la consulta a DB. No confiar en el ID enviado por el Frontend en el Body si es posible obtenerlo del Token.

## 4. Gestión de Errores (Contrato)

Para que el Frontend reaccione correctamente:

- **401 Unauthorized:** El token ha expirado o es inválido. El Frontend limpiará la sesión automáticamente.
- **403 Forbidden:** El usuario está autenticado pero no tiene el rol necesario. El Frontend mostrará una pantalla de acceso denegado.

---

**Documento coordinado con la arquitectura actual del Frontend (v1.2).**
