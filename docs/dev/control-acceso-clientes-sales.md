# Control de Acceso a Clientes por Rol (SALES)

> Documentación técnica de la funcionalidad que restringe la visibilidad de clientes según el rol del usuario. Los ADMIN ven todos los clientes, mientras que los SALES solo ven los que tienen asignados o los que crearon.

## Resumen

Se implementó un sistema de control de acceso granular sobre los clientes de la fábrica, permitiendo:

- **ADMIN**: Acceso completo a todos los clientes de su fábrica
- **SALES**: Solo ven clientes donde están explícitamente asignados (`allowedSalesUserIds`) o que ellos mismos crearon (`createdBy`)
- **Configuración global**: Toggle para permitir que múltiples SALES compartan un mismo cliente

## Schema: Customer — Nuevos campos

**Archivo:** `src/customers/schemas/customer.schema.ts`

| Campo                 | Tipo                     | Default | Descripción                                                        |
| --------------------- | ------------------------ | ------- | ------------------------------------------------------------------ |
| `allowedSalesUserIds` | `ObjectId[]` (ref: User) | `[]`    | Array de IDs de usuarios SALES con acceso explícito a este cliente |
| `createdBy`           | `ObjectId` (ref: User)   | `null`  | ID del usuario que creó el cliente (siempre puede verlo)           |

## Schema: GlobalSettings — Nuevo campo

**Archivo:** `src/settings/schemas/global-settings.schema.ts`

| Campo                   | Tipo      | Default | Descripción                                                                                             |
| ----------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `multiSalesPerCustomer` | `boolean` | `true`  | Si `true`, varios SALES pueden ser asignados al mismo cliente. Si `false`, máximo un SALES por cliente. |

## DTO: CreateCustomerDto — Nuevo campo

**Archivo:** `src/customers/dto/create-customer.dto.ts`

| Campo                 | Tipo       | Descripción                                                                          |
| --------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `allowedSalesUserIds` | `string[]` | IDs de usuarios SALES a asignar al cliente. Validado contra `multiSalesPerCustomer`. |

> **Nota:** `createdBy` NO se expone en el DTO — se resuelve automáticamente en el service con el usuario autenticado.

## Lógica de acceso

### Creación (`POST /customers`)

- **Roles permitidos:** ADMIN, SALES
- El campo `createdBy` se setea automáticamente con el `userId` del token JWT
- Si `multiSalesPerCustomer === false` y se envían más de 1 `allowedSalesUserIds`, se rechaza con `ForbiddenException`

### Listado (`GET /customers`)

El controller bifurca según el rol:

| Rol   | Método del service                   | Filtro                                                          |
| ----- | ------------------------------------ | --------------------------------------------------------------- |
| ADMIN | `findAll(factoryId)`                 | Todos los activos de la fábrica                                 |
| SALES | `findAllForSales(factoryId, userId)` | `$or: [{ createdBy: userId }, { allowedSalesUserIds: userId }]` |

### Detalle (`GET /customers/:id`)

Misma bifurcación:

| Rol   | Método del service                       | Filtro                                                            |
| ----- | ---------------------------------------- | ----------------------------------------------------------------- |
| ADMIN | `findOne(id, factoryId)`                 | Por ID y factoryId                                                |
| SALES | `findOneForSales(id, factoryId, userId)` | Por ID, factoryId, Y acceso (`createdBy` o `allowedSalesUserIds`) |

Si un SALES intenta acceder a un cliente que no le pertenece, recibe `NotFoundException` con mensaje "not found or access denied".

### Actualización (`PATCH /customers/:id`)

- **ADMIN:** Puede modificar todos los campos, incluyendo `allowedSalesUserIds`
- **SALES:** Puede modificar campos del cliente PERO:
  - Solo si es el creador (`createdBy`) O está en `allowedSalesUserIds`
  - NO puede modificar `allowedSalesUserIds` (se sanitiza del DTO)
  - Validación de `multiSalesPerCustomer` al modificar `allowedSalesUserIds`

### Eliminación (`DELETE /customers/:id`)

- **Solo ADMIN** — soft delete (`isActive: false`)

## Validación multiSalesPerCustomer

Se aplica en dos puntos:

1. **`create()`** — Si `multiSalesPerCustomer === false` y `allowedSalesUserIds.length > 1` → `ForbiddenException`
2. **`update()`** — Misma validación cuando ADMIN modifica `allowedSalesUserIds`

## Configuración global

**Servicio:** `GlobalSettingsService`

| Método                                        | Descripción                               |
| --------------------------------------------- | ----------------------------------------- |
| `getMultiSalesPerCustomer()`                  | Retorna el valor actual (default: `true`) |
| `updateMultiSalesPerCustomer(value: boolean)` | Actualiza el toggle                       |

> **Nota:** Actualmente no hay endpoint REST expuesto para este setting. Se puede agregar en un futuro controller de settings si se necesita desde el panel de administración.

## Cambios en la arquitectura

### `CustomersModule`

Ahora importa `GlobalSettingsModule` para poder inyectar `GlobalSettingsService` en `CustomersService`.

### `AppModule`

Se agregó `GlobalSettingsModule` a los imports globales (resuelve el known gap de que no estaba registrado en el root module).

## Diagrama de flujo de acceso

```
GET /customers
  │
  ├─ Rol: ADMIN
  │   └─ findAll(factoryId)
  │       └─ WHERE factoryId = X AND isActive = true
  │
  └─ Rol: SALES
      └─ findAllForSales(factoryId, userId)
          └─ WHERE factoryId = X
             AND isActive = true
             AND (createdBy = userId OR allowedSalesUserIds CONTAINS userId)
```

## Ejemplo de respuesta

```json
{
  "_id": "abc123",
  "type": "COMPANY",
  "officialName": "Constructora García S.L.",
  "commercialName": "García Construcciones",
  "nif": "B12345678",
  "factoryId": "factory123",
  "platformUserId": null,
  "discountProfile": 1,
  "taxProfile": 2,
  "contact": {
    "phone": "+34 600 123 456",
    "email": "info@garcia.com"
  },
  "address": {
    "city": "Madrid",
    "country": "España"
  },
  "allowedSalesUserIds": ["user1", "user2"],
  "createdBy": "user1",
  "isActive": true,
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-07T10:00:00.000Z"
}
```

## Archivos modificados

| Archivo                                          | Cambio                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `src/customers/schemas/customer.schema.ts`       | Agregados `allowedSalesUserIds` y `createdBy`                              |
| `src/settings/schemas/global-settings.schema.ts` | Agregado `multiSalesPerCustomer`                                           |
| `src/customers/dto/create-customer.dto.ts`       | Agregado `allowedSalesUserIds`                                             |
| `src/customers/customers.service.ts`             | Lógica de filtrado por rol, sanitización en update, validación multi-sales |
| `src/customers/customers.controller.ts`          | Bifurcación por rol en GET, POST ahora acepta SALES, pasa userId           |
| `src/customers/customers.module.ts`              | Importa `GlobalSettingsModule`                                             |
| `src/settings/global-settings.service.ts`        | Métodos `getMultiSalesPerCustomer()` y `updateMultiSalesPerCustomer()`     |
| `src/app.module.ts`                              | Importa `GlobalSettingsModule`                                             |

## Migración de datos

Los clientes existentes tendrán:

- `allowedSalesUserIds: []` (default)
- `createdBy: null` (no se puede determinar retroactivamente)

Esto significa que después del deploy, los SALES NO verán clientes existentes hasta que un ADMIN los asigne explícitamente mediante `PATCH /customers/:id` con `allowedSalesUserIds`.

### Opción de migración (si se necesita)

Si se desea que los SALES existentes vean todos los clientes actuales, se puede ejecutar un script de migración:

```typescript
// Asignar todos los clientes existentes a todos los SALES de la fábrica
await customerModel.updateMany(
  { createdBy: null },
  { allowedSalesUserIds: [lista de userIds de SALES] }
);
```

O alternativamente, dejar `allowedSalesUserIds` vacío y que el equipo de ADMIN haga la asignación manual gradual.
