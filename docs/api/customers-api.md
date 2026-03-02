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

| Método   | Endpoint                      | Roles             | Descripción                              |
| :------- | :---------------------------- | :---------------- | :--------------------------------------- |
| `GET`    | `/customers`                  | `ADMIN`, `SALES`  | Lista de clientes activos.               |
| `GET`    | `/customers/:id`              | `ADMIN`, `SALES`  | Detalle de un cliente.                   |
| `POST`   | `/customers`                  | `ADMIN`           | Crear nuevo cliente.                     |
| `PATCH`  | `/customers/:id`              | `ADMIN`, `USER`\* | Actualizar información.                  |
| `DELETE` | `/customers/:id`              | `ADMIN`           | Desactivar cliente (Soft Delete).        |
| `POST`   | `/customers/:id/link/:userId` | `ADMIN`           | Vincular cliente a un usuario de acceso. |

_\*Restricción: Roles `USER` solo pueden editar su perfil si `platformUserId` coincide con su ID de sesión._

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

Reservado exclusivamente para **ADMINS**.

| Método   | Endpoint              | Descripción                |
| :------- | :-------------------- | :------------------------- |
| `GET`    | `/discount-rules`     | Listado de reglas activas. |
| `POST`   | `/discount-rules`     | Crear regla nueva.         |
| `PATCH`  | `/discount-rules/:id` | Modificar.                 |
| `DELETE` | `/discount-rules/:id` | Desactivar regla.          |

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
