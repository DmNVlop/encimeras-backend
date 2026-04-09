# Documentación Técnica: Módulo de Clientes y Descuentos

Esta documentación detalla la estructura, endpoints y reglas de negocio para la gestión de clientes y el sistema dinámico de reglas de descuento del proyecto.

---

## 1. Modelo de Datos: Cliente (Customer)

La entidad `Customer` representa a los clientes finales (B2B o B2C) de la fábrica.

### Atributos Principales

| Campo                 | Tipo       | Descripción                                               | Requerido                |
| :-------------------- | :--------- | :-------------------------------------------------------- | :----------------------- |
| `type`                | `String`   | `INDIVIDUAL` o `COMPANY`                                  | Sí                       |
| `officialName`        | `String`   | Razón Social (Empresas) o Nombre Completo (Individuos)    | Automático\*             |
| `firstName`           | `String`   | Nombre (Solo para individuos)                             | Si `type === INDIVIDUAL` |
| `lastName`            | `String`   | Apellidos (Solo para individuos)                          | Si `type === INDIVIDUAL` |
| `commercialName`      | `String`   | Nombre comercial o apodo                                  | No                       |
| `description`         | `String`   | Notas o descripción del cliente                           | No                       |
| `nif`                 | `String`   | Identificación fiscal (DNI/CIF/NIE/NIF)                   | No                       |
| `birthDate`           | `Date`     | Fecha de nacimiento (Solo individuos)                     | No                       |
| `gender`              | `String`   | Género (Solo individuos)                                  | No                       |
| `legalRepresentative` | `String`   | Representante legal (Solo empresas)                       | No                       |
| `isActive`            | `Boolean`  | Estado del cliente (Soft Delete)                          | Default `true`           |
| `factoryId`           | `ObjectId` | ID de la fábrica dueña del cliente                        | Inyectado por Backend    |
| `platformUserId`      | `ObjectId` | ID del usuario vinculado en la plataforma para acceso B2B | No                       |
| `discountProfile`     | `Number`   | ID del perfil de descuentos asignado                      | No                       |
| `taxProfile`          | `Number`   | ID del perfil de impuestos aplicable                      | No                       |

_\*Nota: Si no se envía `officialName` para un `INDIVIDUAL`, el backend lo genera concatenando `firstName` y `lastName`._

### Objetos Anidados

#### `contact`

- `phone`: `String`
- `email`: `String` (Formato email válido)
- `website`: `String` (URL)
- `socialMedia`: `String[]` (Array de enlaces)

#### `address`

- `country`, `fullName`, `addressLine1`, `addressLine2`, `city`, `region`, `cp`

---

## 2. API Endpoints: Clientes (`/customers`)

| Método   | Endpoint                        | Roles                             | Descripción                              |
| :------- | :------------------------------ | :-------------------------------- | :--------------------------------------- |
| `GET`    | `/customers`                    | `ADMIN`, `OWNER`, `SALES`, `USER` | Lista de clientes activos.               |
| `GET`    | `/customers/:id`                | `ADMIN`, `OWNER`, `SALES`, `USER` | Detalle de un cliente.                   |
| `POST`   | `/customers`                    | `ADMIN`, `OWNER`, `SALES`         | Crear nuevo cliente.                     |
| `PATCH`  | `/customers/:id`                | `ADMIN`, `SALES`                  | Actualizar información.                  |
| `DELETE` | `/customers/:id`                | `ADMIN`, `SALES`                  | Desactivar cliente (Soft Delete).        |
| `POST`   | `/customers/:id/link/:userId`   | `ADMIN`, `OWNER`                  | Vincular cliente a un usuario de acceso. |
| `PATCH`  | `/customers/batch/assign-sales` | `ADMIN`, `OWNER`                  | Asignar vendedores a múltiples clientes. |
| `DELETE` | `/customers/batch`              | `ADMIN`, `OWNER`                  | Desactivar múltiples clientes.           |

_\*Nota: Los roles `USER` ya no tienen acceso a PATCH. Solo pueden leer el cliente asignado a ellos._

### Acceso por Rol

**ADMIN:**

- Puede hacer TODO
- Acceso completo a todos los endpoints

**OWNER:**

- ✅ **READ**: Todos los clientes agregados en el sistema (modo solo lectura)
- ✅ **POST**: Crear clientes y asignarlos a usuarios SALES
- ✅ **linkToUser**: Vincular cliente a usuario de plataforma
- ✅ **batchAssignUsers**: Asignar usuarios SALES a múltiples clientes
- ✅ **batchRemove**: Eliminar múltiples clientes en batch
- ❌ **PATCH**: No puede actualizar clientes individualmente
- ❌ **DELETE**: No puede eliminar clientes individualmente

**SALES:**

- ✅ **READ**: Todos los clientes que le pertenecen (creados por él o asignados a él)
- ✅ **POST**: Crear clientes (automáticamente se asignan a él)
- ✅ **PATCH**: Actualizar clientes que le pertenecen
- ✅ **DELETE**: Eliminar clientes que le pertenecen
- ❌ **linkToUser**: No puede vincular clientes a usuarios
- ❌ **batchAssignUsers**: No puede hacer asignaciones batch
- ❌ **batchRemove**: No puede eliminar en batch

**USER:**

- ✅ **READ**: El cliente asignado a él (donde `platformUserId` = userId)
- ❌ **POST**: No puede crear clientes
- ❌ **PATCH**: No puede actualizar clientes (excepto su propio perfil si está vinculado)
- ❌ **DELETE**: No puede eliminar clientes
- ❌ **linkToUser**: No puede vincular clientes
- ❌ **batchAssignUsers**: No puede hacer asignaciones batch
- ❌ **batchRemove**: No puede eliminar en batch

### Reglas de Asignación Automática

1. **Cuando un SALES crea un cliente:**
   - El campo `createdBy` se establece automáticamente con su `userId`
   - Si no se especifica `assignedUserIds`, se añade automáticamente su `userId`
   - Si se especifica `assignedUserIds`, se añade su `userId` si no está ya incluido

2. **Validación de propiedad para SALES:**
   - Un SALES solo puede acceder a clientes donde:
     - `createdBy` = userId (creados por él) **O**
     - `assignedUserIds` incluye userId (asignados a él)
   - Esto aplica para: GET, PATCH, DELETE

3. **Validación de propiedad para USER:**
   - Un USER solo puede acceder a clientes donde:
     - `platformUserId` = userId (cliente vinculado a su cuenta)
   - Solo aplica para GET (lectura)

### Endpoints Batch

#### `PATCH /customers/batch/assign-sales`

Asigna uno o más vendedores (usuarios con rol `SALES`) a múltiples clientes simultáneamente.

**Body:**

```json
{
  "customerIds": ["cust1", "cust2", "cust3"],
  "assignedUserIds": ["sales1", "sales2"]
}
```

**Validaciones:**

- Todos los `salesUserIds` deben existir y tener rol `SALES`
- Si `multiSalesPerCustomer` está deshabilitado en configuración global, solo se permite 1 sales por cliente
- Solo se asigna a clientes activos (`isActive: true`) del `factoryId` del admin

**Response 200:**

```json
{
  "updatedCount": 3
}
```

**Errores:**

| Código | Descripción                                  |
| :----- | :------------------------------------------- |
| `404`  | Sales users no encontrados o sin rol `SALES` |
| `403`  | Multi-sales deshabilitado y se enviaron >1   |
| `404`  | No se encontraron clientes activos           |

---

#### `DELETE /customers/batch`

Desactiva (soft delete) múltiples clientes simultáneamente.

**Body:**

```json
{
  "customerIds": ["cust1", "cust2"]
}
```

**Response 200:**

```json
{
  "deletedCount": 2
}
```

**Errores:**

| Código | Descripción                        |
| :----- | :--------------------------------- |
| `404`  | No se encontraron clientes activos |

---

## 3. Modelo de Datos: Reglas de Descuento (DiscountRule)

Define descuentos dinámicos aplicables atomáticamente por el motor de precios.

### Atributos

| Campo               | Tipo      | Valores / Descripción                                        |
| :------------------ | :-------- | :----------------------------------------------------------- |
| `name`              | `String`  | Nombre identificador de la regla.                            |
| `type`              | `Enum`    | `PERCENTAGE` o `FIXED_AMOUNT`.                               |
| `value`             | `Number`  | % de descuento o importe fijo.                               |
| `scope`             | `Enum`    | `GLOBAL_TOTAL`, `SPECIFIC_MATERIALS`, `MATERIAL_CATEGORIES`. |
| `priority`          | `Number`  | Prioridad (Mayor número se procesa antes).                   |
| `collisionStrategy` | `Enum`    | `SUM`, `MAX`, `MIN`, `CASCADE`.                              |
| `stackable`         | `Boolean` | Permite aplicar otras reglas simultáneas.                    |

### Condiciones (`conditions`)

| Campo              | Tipo         | Descripción                                      |
| :----------------- | :----------- | :----------------------------------------------- |
| `startDate`        | `Date`       | Fecha inicio vigencia.                           |
| `endDate`          | `Date`       | Fecha fin vigencia.                              |
| `customerStrategy` | `Enum`       | `ALL`, `SPECIFIC_CUSTOMERS`.                     |
| `targetCustomers`  | `ObjectId[]` | Lista de IDs si la estrategia es específica.     |
| `minOrderValue`    | `Number`     | Importe mínimo acumulado para disparar la regla. |

---

## 4. API Endpoints: Reglas de Descuento (`/discount-rules`)

Accesible para **ADMIN** y **OWNER** (este último solo para reglas de su fábrica).

| Método   | Endpoint              | Roles            | Descripción                |
| :------- | :-------------------- | :--------------- | :------------------------- |
| `GET`    | `/discount-rules`     | `ADMIN`, `OWNER` | Listado de reglas activas. |
| `POST`   | `/discount-rules`     | `ADMIN`, `OWNER` | Crear regla nueva.         |
| `PATCH`  | `/discount-rules/:id` | `ADMIN`, `OWNER` | Modificar.                 |
| `DELETE` | `/discount-rules/:id` | `ADMIN`, `OWNER` | Desactivar regla.          |

---

## 5. Lógica del Motor de Descuento (Frontend Insight)

Al calcular un presupuesto, el motor sigue este flujo interno:

1.  **Filtrado Temporada:** Solo reglas cuya fecha actual esté en rango (o sin fechas).
2.  **Filtrado Segmentación:** Reglas para `ALL` o donde el `customerId` esté incluido.
3.  **Prioridad de Cálculo:**
    - Se aplican primero todas las reglas de tipo `PERCENTAGE`.
    - Luego se aplican las de tipo `FIXED_AMOUNT`.
    - Las reglas de producto (`SPECIFIC_MATERIALS`/`CATEGORY`) se aplican antes que las de `GLOBAL_TOTAL`.

Para el equipo de Frontend, el backend devolverá en el objeto de presupuesto un desglose similar a:

```json
{
  "originalTotal": 1000,
  "finalTotal": 850,
  "totalDiscount": 150,
  "appliedRules": [
    { "ruleName": "Black Friday", "discountAmount": 100 },
    { "ruleName": "Cupón Bienvenida", "discountAmount": 50 }
  ]
}
```
