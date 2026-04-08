📋 PLAN DE AMPLIACIÓN Y CORRECCIÓN DEL SISTEMA DE ROLES
Estado Actual

- 4 roles: ADMIN, USER, SALES, WORKER
- User schema NO tiene factoryId
- JWT payload NO incluye factoryId
- Customer tiene allowedSalesUserIds y createdBy
- Fallback hardcoded: "000000000000000000000000"
- WORKER rol existe pero no está implementado completamente

---

Objetivos

1. ✅ Agregar rol OWNER con permisos intermedios entre ADMIN y SALES
2. ✅ Agregar factoryId al schema User
3. ✅ Incluir factoryId en JWT payload
4. ✅ Renombrar allowedSalesUserIds → assignedUserIds en Customer
5. ✅ Implementar lógica de acceso para OWNER
6. ✅ Preparar base para multi-tenant
7. ✅ Revisar y corregir todos los endpoints según nueva matriz de permisos

---

Nueva Matriz de Permisos
Recurso ADMIN OWNER
Users
Create ✅ Todos ✅ Solo SALES/USER
Read All ✅ ✅ (factory)
Read One ✅ ✅ (factory)
Update ✅ ✅ (factory, no ADMIN/OWNER)
Delete ✅ ❌
Customers
Create ✅ ✅
Read All ✅ 👁️ Todos (factory)
Read One ✅ 👁️ Todos (factory)
Update ✅ ✏️ Solo asignados
Delete ✅ ❌
Link to User ✅ ❌
Batch Assign ✅ ✅
Batch Delete ✅ ❌
Quotes
Create ✅ 👁️ Ver (factory)
Read All ✅ 👁️ Ver (factory)
Read One ✅ 👁️ Ver (factory)
Update ✅ ❌
Delete ✅ ❌
Calculate ✅ 👁️
Orders
Create ✅ 👁️
Read All ✅ 👁️ Ver (factory)
Read One ✅ 👁️ Ver (factory)
Update Status ✅ ❌
Materials ✅ ❌
Attributes ✅ ❌
Price Configs ✅ ❌
Discount Rules
Create ✅ ❌
Read ✅ 👁️ Ver (factory)
Update ✅ ❌
Delete ✅ ❌
Document Settings
Create ✅ ❌
Read ✅ 👁️ Ver (factory)
Update ✅ ❌
Delete ✅ ❌
Addons/Cutouts/Edges ✅ ❌
Analytics ✅ 👁️ Ver (factory)
Assets (Upload) ✅ ❌
Leyenda:

- ✅ = Acceso completo
- ❌ = Sin acceso
- 👤 Self = Solo sus propios datos
- 👁️ = Solo lectura
- ✏️ = Edición condicional

---

Cambios Necesarios

1. Schema Changes
   src/users/schemas/users.schema.ts
   // Agregar campo factoryId
   @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Factory" })
   factoryId?: string;
   src/customers/schemas/customer.schema.ts
   // Renombrar campo
   @Prop({ type: [MongooseSchema.Types.ObjectId], ref: "User", default: [] })
   assignedUserIds: string[]; // Antes: allowedSalesUserIds
   Nota: Necesitaremos migración de datos para renombrar el campo en MongoDB.

---

2. Auth Changes
   src/auth/enums/role.enum.ts
   export enum Role {
   ADMIN = "ADMIN",
   OWNER = "OWNER", // ← NUEVO
   SALES = "SALES",
   USER = "USER",
   WORKER = "WORKER",
   }
   src/auth/jwt.strategy.ts
   // Modificar validate() para incluir factoryId
   async validate(payload: any) {
   return {
   userId: payload.sub,
   name: payload.name,
   username: payload.username,
   roles: payload.roles,
   factoryId: payload.factoryId || null, // ← NUEVO
   };
   }
   src/auth/auth.service.ts
   // Modificar login() para incluir factoryId en el payload
   async login(user: any) {
   const payload = {
   sub: user.\_id,
   name: user.name,
   username: user.username,
   roles: user.roles,
   factoryId: user.factoryId || null, // ← NUEVO
   };
   return {
   access_token: this.jwtService.sign(payload),
   };
   }

---

#### **3. Service Changes**

##### `src/customers/customers.service.ts`

- Renombrar todas las referencias `allowedSalesUserIds` → `assignedUserIds`
- Agregar métodos específicos para OWNER:
  - `findAllForOwner(factoryId)`: Retorna TODOS los clientes del factory
  - `findOneForOwner(id, factoryId, userId)`: Valida acceso de lectura
  - Modificar `update()`: OWNER solo edita si está en `assignedUserIds`

##### `src/users/users.service.ts`

- Agregar validación en `create()`: OWNER no puede crear ADMIN/OWNER
- Agregar método `findAllByFactory(factoryId)`
- Modificar `update()`: OWNER puede editar usuarios de su factory (excepto ADMIN/OWNER)

##### `src/quotes/quotes.service.ts`

- Agregar métodos de lectura para OWNER:
  - `findAllByFactory(factoryId)`: Lista todos los quotes del factory
  - `findOneByFactory(id, factoryId)`: Obtener un quote específico

##### `src/orders/orders.service.ts`

- Agregar métodos de lectura para OWNER:
  - `findAllByFactory(factoryId)`: Lista todas las órdenes del factory
  - `findOneByFactory(id, factoryId)`: Obtener una orden específica

---

4. Controller Changes
   Todos los controladores necesitan:
1. Eliminar fallback "000000000000000000000000"
1. Agregar rol OWNER en decoradores @Roles() según matriz
1. Implementar lógica condicional por rol donde sea necesario
   Ejemplo: src/customers/customers.controller.ts
   @Get()
   @Roles(Role.ADMIN, Role.OWNER, Role.SALES)
   @ApiOperation({ summary: "List customers (filtered by role)" })
   findAll(@GetUser() user: any) {
   const { factoryId, userId, roles } = user;

if (roles.includes(Role.ADMIN)) {
return this.customersService.findAll(factoryId);
}

if (roles.includes(Role.OWNER)) {
return this.customersService.findAllForOwner(factoryId);
}

// SALES
return this.customersService.findAllForSales(factoryId, userId);
}
@Patch(":id")
@Roles(Role.ADMIN, Role.OWNER, Role.SALES)
@ApiOperation({ summary: "Update customer" })
update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @GetUser() user: any) {
return this.customersService.update(id, dto, user.factoryId, user.userId, user.roles);
}

---

5. DTOs que necesitan actualización
   src/customers/dto/create-customer.dto.ts
   @IsArray()
   @IsOptional()
   assignedUserIds?: string[]; // Antes: allowedSalesUserIds
   src/customers/dto/batch-assign-sales.dto.ts
   // Renombrar clase y campos
   export class BatchAssignUsersDto {
   @IsArray()
   @IsMongoId({ each: true })
   customerIds: string[];
   @IsArray()
   @IsMongoId({ each: true })
   assignedUserIds: string[]; // Antes: salesUserIds
   }
   src/users/dto/create-user.dto.ts
   @IsMongoId()
   @IsOptional()
   factoryId?: string; // ← NUEVO

---

6. Seed Service Update
   src/database/seed.service.ts
   // Actualizar seed de admin para incluir factoryId si es necesario
   // (ADMIN puede no tener factoryId si es super-admin global)

---

7.  Validaciones Adicionales
    Crear guard helper: src/auth/guards/factory-scope.guard.ts
    // Guard opcional para validar que el usuario tenga factoryId
    @Injectable()
    export class FactoryScopeGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
        // ADMIN puede no tener factoryId (super-admin)
        if (user.roles.includes(Role.ADMIN)) {
          return true;
        }

        // OWNER, SALES, WORKER deben tener factoryId
        if ([Role.OWNER, Role.SALES, Role.WORKER].some(r => user.roles.includes(r))) {
          if (!user.factoryId) {
            throw new ForbiddenException("User does not have a factory assigned");
          }
        }

        return true;
    }
    }

---

Migración de Datos (MongoDB)
Necesitaremos ejecutar un script de migración para renombrar el campo en la colección customers:
// Migración: Renombrar allowedSalesUserIds → assignedUserIds
db.customers.updateMany(
{ allowedSalesUserIds: { $exists: true } },
{ $rename: { "allowedSalesUserIds": "assignedUserIds" } }
);

---

### **Orden de Implementación**

1. **Fase 1: Schemas y Auth (Base)**
   - Actualizar `role.enum.ts`
   - Actualizar `User` schema (agregar `factoryId`)
   - Actualizar `Customer` schema (renombrar campo)
   - Actualizar JWT strategy y auth service
2. **Fase 2: Services (Lógica de negocio)**
   - Actualizar `CustomersService` (métodos OWNER + renombrar campos)
   - Actualizar `UsersService` (validaciones OWNER)
   - Actualizar `QuotesService` (métodos lectura OWNER)
   - Actualizar `OrdersService` (métodos lectura OWNER)
3. **Fase 3: Controllers (Endpoints)**
   - Actualizar todos los controllers según matriz de permisos
   - Eliminar fallbacks hardcoded
   - Agregar rol OWNER en decoradores
4. **Fase 4: DTOs**
   - Actualizar todos los DTOs con nombres nuevos
   - Agregar validaciones
5. **Fase 5: Testing y Migración**
   - Ejecutar migración de MongoDB
   - Crear usuarios de prueba con rol OWNER
   - Validar flujos end-to-end

---

Archivos a Modificar (Lista Completa)
Schemas (2 archivos)

- src/users/schemas/users.schema.ts
- src/customers/schemas/customer.schema.ts
  Auth (4 archivos)
- src/auth/enums/role.enum.ts
- src/auth/jwt.strategy.ts
- src/auth/auth.service.ts
- src/auth/guards/factory-scope.guard.ts (nuevo)
  Services (4+ archivos principales)
- src/customers/customers.service.ts
- src/users/users.service.ts
- src/quotes/quotes.service.ts
- src/orders/orders.service.ts
- src/discount-rules/discount-rules.service.ts (menor)
- src/analytics/analytics.service.ts (menor)
  Controllers (17 archivos)
- src/users/users.controller.ts
- src/customers/customers.controller.ts
- src/quotes/quotes.controller.ts
- src/orders/orders.controller.ts
- src/materials/materials.controller.ts
- src/attributes/attributes.controller.ts
- src/price-configs/price-configs.controller.ts
- src/discount-rules/discount-rules.controller.ts
- src/document-settings/document-settings.controller.ts
- src/addons/addons.controller.ts
- src/cutouts/cutouts.controller.ts
- src/edge-profiles/edge-profiles.controller.ts
- src/measurement-rule-sets/measurement-rule-sets.controller.ts
- src/valid-combinations/valid-combinations.controller.ts
- src/main-pieces/main-pieces.controller.ts
- src/analytics/analytics.controller.ts
- src/assets/assets.controller.ts
  DTOs (5+ archivos)
- src/users/dto/create-user.dto.ts
- src/customers/dto/create-customer.dto.ts
- src/customers/dto/update-customer.dto.ts
- src/customers/dto/batch-assign-sales.dto.ts (renombrar)
- Otros DTOs que referencien el campo
  Seed
- src/database/seed.service.ts (verificar)

---

Testing Checklist
Después de implementar los cambios, validar:
✅ ADMIN mantiene acceso total  
✅ OWNER puede crear usuarios SALES/USER (no ADMIN/OWNER)  
✅ OWNER ve todos los clientes de su factory  
✅ OWNER solo edita clientes asignados (assignedUserIds)  
✅ OWNER ve todos los quotes/orders de su factory (lectura)  
✅ OWNER no accede a materiales, precios, configuraciones  
✅ SALES mantiene comportamiento actual (con campos renombrados)  
✅ USER mantiene comportamiento actual  
✅ WORKER mantiene comportamiento actual  
✅ JWT incluye factoryId  
✅ Migración de datos ejecutada correctamente

---

Riesgos y Consideraciones
⚠️ Breaking Changes:

- Cambio de nombre de campo allowedSalesUserIds → assignedUserIds
- JWT payload incluye nuevo campo factoryId
- Necesita migración de base de datos
- Frontend deberá actualizar referencias al campo renombrado
  ⚠️ Compatibilidad:
- Usuarios existentes sin factoryId necesitarán actualización
- Considerar crear script para asignar factoryId a usuarios SALES/WORKER existentes
  ⚠️ Performance:
- Queries filtradas por factoryId mejoran performance en multi-tenant
- Considerar índices compuestos: { factoryId: 1, isActive: 1 }

---

Preguntas Pendientes

1. ¿ADMIN debe tener factoryId o será un super-admin global sin factory?
2. ¿Necesitamos endpoint específico para que OWNER asigne usuarios a customers?
3. ¿El campo Customer.createdBy debe seguir existiendo o se depreca?
4. ¿Necesitamos auditoría de quién modifica qué? (considerar campos updatedBy)

---

¿Te parece bien este plan? ¿Hay algo que quieras ajustar antes de comenzar la implementación?
