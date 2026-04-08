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

> **Nota**: Los usuarios con rol `OWNER` deben tener un `factoryId` asociado para scoping de acceso a los recursos de su fábrica.

---

## 2. API Endpoints: Usuarios (`/users`)

Todos los endpoints requieren autenticación JWT (`@ApiBearerAuth()`).

| Método   | Endpoint     | Roles             | Descripción                                |
| :------- | :----------- | :---------------- | :----------------------------------------- |
| `GET`    | `/users`     | `ADMIN`           | Lista de usuarios. Opcional: `?role=SALES` |
| `GET`    | `/users/:id` | `ADMIN`, `USER`\* | Detalle de un usuario.                     |
| `POST`   | `/users`     | `ADMIN`           | Crear nuevo usuario.                       |
| `PATCH`  | `/users/:id` | `ADMIN`, `USER`\* | Actualizar usuario.                        |
| `DELETE` | `/users/:id` | `ADMIN`           | Eliminar usuario.                          |

_\*Restricción: Usuarios no-ADMIN solo pueden ver/editar su propio perfil (cuando `:id` coincide con su `userId` del token)._

### Filtrado por Rol

Soporta filtrar usuarios por rol específico:

| Parámetro | Tipo     | Requerido | Descripción                   |
| :-------- | :------- | :-------- | :---------------------------- |
| `role`    | `String` | No        | Filtrar por rol (ej: `SALES`) |

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

| Código | Descripción             |
| :----- | :---------------------- |
| `409`  | El `username` ya existe |
| `400`  | `OWNER` sin `factoryId` |

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
