# Documentación Técnica: Módulo de Usuarios (Users)

Gestión de usuarios del sistema con roles y autenticación JWT.

---

## 1. Modelo de Datos: Usuario (User)

| Campo       | Tipo       | Descripción                                                 | Requerido   |
| :---------- | :--------- | :---------------------------------------------------------- | :---------- |
| `username`  | `String`   | Identificador único (usado para login)                      | Sí          |
| `password`  | `String`   | Contraseña hasheada con bcrypt                              | Sí          |
| `roles`     | `Role[]`   | Array de roles: `ADMIN`, `OWNER`, `SALES`, `WORKER`, `USER` | Sí          |
| `name`      | `String`   | Nombre real para mostrar en la UI                           | No          |
| `email`     | `String`   | Email para notificaciones                                   | No          |
| `phone`     | `String`   | Teléfono de contacto                                        | No          |
| `factoryId` | `ObjectId` | ID de la fábrica (requerido si tiene rol `OWNER`)           | Condicional |
| `ownerId`   | `ObjectId` | Referencia al usuario OWNER que gestiona este usuario       | Condicional |
| `createdBy` | `ObjectId` | ID del usuario que creó este usuario                        | Sí          |

> **Nota**: Los usuarios con rol `OWNER` deben tener un `factoryId` asociado para scoping de acceso a los recursos de su fábrica.
> **Nota**: Los usuarios con rol `SALES` pueden tener un `ownerId` que referencia al usuario OWNER que los gestiona.

---

## 2. API Endpoints: Usuarios (`/users`)

Todos los endpoints requieren autenticación JWT (`@ApiBearerAuth()`).

| Método   | Endpoint                    | Roles                      | Descripción                                                         |
| :------- | :-------------------------- | :------------------------- | :------------------------------------------------------------------ |
| `GET`    | `/users`                    | `ADMIN`, `OWNER`           | Lista de usuarios. Opcional: `?role=SALES`, `?managed=true` (OWNER) |
| `GET`    | `/users/:id`                | `ADMIN`, `OWNER`, `USER`\* | Detalle de un usuario.                                              |
| `POST`   | `/users`                    | `ADMIN`, `OWNER`           | Crear nuevo usuario.                                                |
| `PATCH`  | `/users/:id`                | `ADMIN`, `OWNER`, `USER`\* | Actualizar usuario.                                                 |
| `DELETE` | `/users/:id`                | `ADMIN`                    | Eliminar usuario.                                                   |
| `GET`    | `/users/managed`            | `OWNER`                    | Lista de usuarios SALES gestionados por el OWNER actual             |
| `POST`   | `/users/:id/transfer-owner` | `ADMIN`                    | Transferir usuario SALES a otro OWNER                               |
| `POST`   | `/users/batch-transfer`     | `ADMIN`                    | Transferencia masiva de usuarios SALES                              |

_\*Restricción: Usuarios no-ADMIN solo pueden ver/editar su propio perfil (cuando `:id` coincide con su `userId` del token)._

### Filtrado y Consulta

| Parámetro | Tipo     | Requerido | Descripción                                                         |
| :-------- | :------- | :-------- | :------------------------------------------------------------------ |
| `role`    | `String` | No        | Filtrar por rol (ej: `SALES`)                                       |
| `managed` | `String` | No        | Para OWNER, filtrar solo sus usuarios gestionados (`?managed=true`) |

**Response 200:**

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "juan.ventas",
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "phone": "+34600000001",
    "roles": ["SALES"],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

> **Nota:** El campo `password` nunca se incluye en las respuestas.

---

## 3. Crear Usuario

### `POST /users`

**Body:**

```json
{
  "username": "nuevo.usuario",
  "password": "contraseñaSegura123",
  "roles": ["SALES"],
  "name": "Nombre Completo",
  "email": "usuario@empresa.com",
  "phone": "+34600000002"
}
```

Para crear un usuario con rol `OWNER`, se debe incluir `factoryId`:

```json
{
  "username": "propietario.fabrica",
  "password": "contraseñaSegura123",
  "roles": ["OWNER"],
  "name": "Juan García",
  "email": "juan@fabricamar.com",
  "factoryId": "65d8f1f77bcf86cd799439000"
}
```

Para crear un usuario con rol `SALES`, **ADMIN** debe especificar `ownerId`:

```json
{
  "username": "nuevo.vendedor",
  "password": "contraseñaSegura123",
  "roles": ["SALES"],
  "name": "Carlos López",
  "email": "carlos@fabricamar.com",
  "ownerId": "65d8f1f77bcf86cd799439000"
}
```

**Response 201:**

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "username": "nuevo.usuario",
  "name": "Nombre Completo",
  "email": "usuario@empresa.com",
  "phone": "+34600000002",
  "roles": ["SALES"],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Errores:**

| Código | Descripción                              |
| :----- | :--------------------------------------- |
| `409`  | El `username` ya existe                  |
| `400`  | `OWNER` sin `factoryId`                  |
| `403`  | ADMIN creando SALES sin `ownerId`        |
| `404`  | `ownerId` no existe o no tiene rol OWNER |

---

## 4. Actualizar Usuario

### `PATCH /users/:id`

**Body (campos opcionales):**

```json
{
  "name": "Nombre Actualizado",
  "email": "nuevo@email.com",
  "roles": ["SALES", "USER"]
}
```

> **Nota:** Solo `ADMIN` puede modificar el campo `roles`. Si un usuario no-ADMIN intenta actualizar sus propios roles, estos se ignoran silenciosamente.

---

## 5. Roles del Sistema

| Rol      | Descripción                                                       |
| :------- | :---------------------------------------------------------------- |
| `ADMIN`  | Acceso total a todos los recursos                                 |
| `OWNER`  | Propietario de fábrica (acceso completo a recursos de su fábrica) |
| `SALES`  | Gestión de presupuestos y clientes                                |
| `WORKER` | Acceso limitado (vista de producción)                             |
| `USER`   | Acceso básico                                                     |

Un usuario puede tener múltiples roles simultáneamente.

### OWNER: Acceso con Scoping de Fábrica

Los usuarios con rol `OWNER` tienen acceso exclusivo a los recursos de su fábrica (`factoryId`). El sistema filtra automáticamente las consultas por este campo.

**JWT Payload para OWNER:**

```json
{
  "sub": "user_id",
  "name": "Juan García",
  "username": "juan.fabrica",
  "roles": ["OWNER"],
  "factoryId": "65d8f1f77bcf86cd799439000"
}
```

> **Nota**: El `factoryId` se incluye en el token JWT solo para usuarios con rol `OWNER`. El backend lo usa para filtrar consultas y aplicar FactoryScopeGuard.

---

## 6. Sistema de Jerarquía OWNER-SALES

### Reglas de Creación

| Creador   | Tipo Usuario | Comportamiento `ownerId`             | Comportamiento `createdBy` |
| --------- | ------------ | ------------------------------------ | -------------------------- |
| **ADMIN** | `SALES`      | **Requerido** en DTO                 | ID del ADMIN               |
| **OWNER** | `SALES`      | Auto-asignado (ignorar si viene DTO) | ID del OWNER               |
| **OWNER** | `USER`       | Ignorado (USER no tiene owner)       | ID del OWNER               |
| **ADMIN** | `OWNER`      | No aplicable                         | ID del ADMIN               |

### Transferencia de Propiedad

Solo usuarios con rol **ADMIN** pueden transferir ownership entre OWNERs.

#### Transferencia Individual

**POST** `/users/:id/transfer-owner`

```json
{
  "newOwnerId": "507f1f77bcf86cd799439022"
}
```

#### Transferencia Masiva

**POST** `/users/batch-transfer`

```json
{
  "userIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "newOwnerId": "507f1f77bcf86cd799439022"
}
```

**Response (batch):**

```json
{
  "transferred": 2,
  "failed": []
}
```

### Restricciones de Transferencia

1. Solo usuarios con rol **SALES** pueden ser transferidos
2. El `newOwnerId` debe existir y tener rol **OWNER**
3. Solo **ADMIN** puede ejecutar transferencias
4. La transferencia actualiza `ownerId` pero NO modifica `createdBy`

### Diagrama de Jerarquía

```
ADMIN
  └── OWNER 1 (factoryA)
        ├── SALES 1 (manager: OWNER 1)
        └── SALES 2 (manager: OWNER 1)
  └── OWNER 2 (factoryB)
        └── SALES 3 (manager: OWNER 2)
  └── USER (no owner)
```
