Plan de Ejecución: Sistema de Jerarquía OWNER-SALES
Resumen
Implementar campos y endpoints para rastrear qué OWNER creó/gestiona cada SALES, con capacidad de transferencia individual y masiva entre OWNERs.

---

FASE 1: Modificación del Schema y DTOs
1.1 Actualizar users.schema.ts

- Añadir campo ownerId (referencia a User con rol OWNER)
- Añadir campo createdBy (ID del usuario que lo creó)
- Tipo: MongooseSchema.Types.ObjectId con ref: "User"
- Opcional para USER, requerido para SALES
  1.2 Actualizar create-user.dto.ts
- Añadir propiedad opcional ownerId: string con validación @IsMongoId()
- Documentación Swagger indicando que es requerido cuando se crea un SALES
  1.3 Actualizar update-user.dto.ts
- Ya hereda de PartialType(CreateUserDto), no requiere cambios directos

---

FASE 2: Lógica de Negocio en UsersService
2.1 Modificar método create()

- Para ADMIN creando SALES: Validar que ownerId esté presente y sea un OWNER válido
- Para OWNER creando SALES/USER: Auto-asignar ownerId = currentUserId
- Registrar createdBy con el ID del usuario actual en todos los casos
- Validar que el ownerId tenga rol OWNER
  2.2 Crear método findManagedUsers(ownerId: string)
- Retorna todos los SALES donde ownerId = ownerId
- Incluye filtro de roles [Role.SALES]
- Excluye passwords
  2.3 Crear método transferOwnership(userId: string, newOwnerId: string, currentUserRoles: string[])
- Validar que userId sea un SALES
- Validar que newOwnerId exista y tenga rol OWNER
- Validar que solo ADMIN pueda ejecutar transferencia
- Actualizar ownerId del usuario
- Retornar usuario actualizado
  2.4 Crear método batchTransferOwnership(userIds: string[], newOwnerId: string, currentUserRoles: string[])
- Validar que todos userIds sean SALES
- Validar que newOwnerId exista y tenga rol OWNER
- Validar que solo ADMIN pueda ejecutar transferencia
- Actualizar ownerId de todos los usuarios en una operación
- Retornar resumen: { transferred: number, failed: string[] }

---

FASE 3: Nuevos Endpoints en UsersController
3.1 Modificar endpoint GET /users

- Si el usuario es OWNER, añadir opción de consultar ?managed=true para ver solo sus SALES
- Mantener comportamiento actual por defecto (todos de la factory)
  3.2 Crear GET /users/managed (OWNER solo)
- Llama a findManagedUsers(user.userId)
- Retorna SALES gestionados por el OWNER actual
- @Roles(Role.OWNER)
  3.3 Crear POST /users/:id/transfer-owner (ADMIN solo)
- Body: { newOwnerId: string }
- Llama a transferOwnership()
- @Roles(Role.ADMIN)
- Validaciones y respuestas Swagger
  3.4 Crear POST /users/batch-transfer (ADMIN solo)
- Body: { userIds: string[], newOwnerId: string }
- Llama a batchTransferOwnership()
- @Roles(Role.ADMIN)
- Validaciones y respuestas Swagger

---

FASE 4: DTOs Específicos
4.1 Crear transfer-owner.dto.ts
export class TransferOwnerDto {
@IsMongoId()
@ApiProperty()
newOwnerId: string;
}
4.2 Crear batch-transfer.dto.ts
export class BatchTransferDto {
@IsArray()
@IsMongoId({ each: true })
@ApiProperty()
userIds: string[];
@IsMongoId()
@ApiProperty()
newOwnerId: string;
}

---

### **FASE 5: Validaciones y Reglas de Negocio**

#### 5.1 Reglas de Creación

- **ADMIN crea SALES**: `ownerId` es **requerido** en DTO
- **OWNER crea SALES**: `ownerId` se auto-asigna al OWNER actual (ignorar si viene en DTO)
- **OWNER crea USER**: `ownerId` se ignora (USER no tiene OWNER)
- **Todos los casos**: `createdBy` se registra automáticamente

#### 5.2 Reglas de Transferencia

- Solo **ADMIN** puede transferir ownership
- Solo usuarios con rol **SALES** pueden ser transferidos
- El `newOwnerId` debe existir y tener rol **OWNER**
- La transferencia actualiza `ownerId` pero NO modifica `createdBy`

#### 5.3 Reglas de Consulta

- **OWNER** puede ver todos los usuarios de su `factoryId` (actual)
- **OWNER** puede filtrar específicamente sus SALES gestionados con `/users/managed`
- **ADMIN** puede ver todos los usuarios sin restricción

---

FASE 6: Testing (Opcional pero Recomendado)
6.1 Unit Tests para UsersService

- create() con ADMIN asignando ownerId
- create() con OWNER auto-asignando ownerId
- findManagedUsers() retorna solo SALES del OWNER
- transferOwnership() con validaciones
- batchTransferOwnership() con casos de éxito y error
  6.2 E2E Tests
- POST /users con diferentes roles y escenarios
- GET /users/managed como OWNER
- POST /users/:id/transfer-owner como ADMIN
- POST /users/batch-transfer con múltiples usuarios

---

FASE 7: Documentación
7.1 Crear/Actualizar docs/api/users-api.md

- Tabla de permisos actualizada
- Ejemplos de creación con ownerId
- Ejemplos de transferencia individual y masiva
- Diagrama de jerarquía OWNER → SALES
  7.2 Actualizar AGENTS.md
- Añadir sección "User Hierarchy & Ownership"
- Documentar nuevos endpoints
- Explicar reglas de creación y transferencia

---

Archivos a Crear/Modificar
Modificar:

1. src/users/schemas/users.schema.ts - Añadir campos ownerId y createdBy
2. src/users/dto/create-user.dto.ts - Añadir ownerId opcional
3. src/users/users.service.ts - Añadir 3 métodos nuevos + modificar create()
4. src/users/users.controller.ts - Añadir 3 endpoints nuevos + modificar GET
5. AGENTS.md - Documentar cambios
   Crear:
6. src/users/dto/transfer-owner.dto.ts - DTO para transferencia individual
7. src/users/dto/batch-transfer.dto.ts - DTO para transferencia masiva
8. docs/api/users-api.md - Documentación API completa (si no existe)
   Opcional (Testing):
9. src/users/users.service.spec.ts - Unit tests
10. test/users.e2e-spec.ts - E2E tests

---

Orden de Implementación Sugerido

1. Schema y DTOs (Fase 1 + Fase 4) - Base de datos
2. Service Logic (Fase 2) - Lógica de negocio
3. Controller Endpoints (Fase 3) - Exposición API
4. Validaciones (Fase 5) - Refinamiento
5. Testing (Fase 6) - Opcional pero recomendado
6. Documentación (Fase 7) - Para referencia futura

---
