# KUUK ERP Backend - AI Agent Context

> Backend para sistema de presupuestado de encimeras y superficies. API REST para gestión de materiales, cálculo de presupuestos, carrito de compras, órdenes y configuración de documentos PDF.

## Project Overview

- **Name**: KUUK ERP Backend
- **Version**: 0.1.0
- **Framework**: NestJS 11
- **Database**: MongoDB (Mongoose 8)
- **Language**: TypeScript 5.7
- **Queue System**: BullMQ + Redis
- **Auth**: JWT + Passport (bcrypt)
- **API Docs**: Swagger UI at `/api`

## Scripts

```bash
# Development
npm run start              # Start server
npm run start:dev          # Watch mode (auto-reload)
npm run start:debug        # Debug watch mode

# Build & Lint
npm run build              # Compile to dist/
npm run lint              # ESLint + Prettier fix
npm run format            # Prettier format only

# Testing
npm run test              # Run all unit tests
npm run test:watch        # Watch mode for tests
npm run test:cov          # With coverage report
npm run test:debug        # Debug tests
npm run test:e2e          # Run e2e tests

# Single test file (use -- syntax)
npm test -- src/orders/orders.service.spec.ts
npm test -- --testPathPattern=discount-engine
npm test -- --testNamePattern="calculate discount"
```

## Code Style Guidelines

### General Rules

- **No comments** unless explicitly requested
- **No emojis** in code
- **Language**: English for code, Spanish for documentation
- **Print width**: 160 characters (per .prettierrc)

### Imports

```typescript
// Order: external libs → internal modules → relative paths
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Quote, QuoteDocument } from "./schemas/quote.schema";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { DiscountEngineService } from "../discount-rules/discount-engine.service";
```

### Naming Conventions

| Element      | Convention       | Example                                   |
| :----------- | :--------------- | :---------------------------------------- |
| Files        | kebab-case       | `quote.service.ts`, `create-quote.dto.ts` |
| Classes      | PascalCase       | `QuoteService`, `CreateQuoteDto`          |
| Interfaces   | PascalCase       | `QuoteDocument`                           |
| Enums        | PascalCase       | `Role`, `CustomerType`                    |
| Constants    | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                         |
| Schema props | camelCase        | `factoryId`, `totalPrice`                 |

### Type Annotations

- Use **explicit return types** on public service methods
- Use `any` sparingly - prefer `Record<string, unknown>` or specific types
- Interface over type for object shapes
- Use `PartialType()` from @nestjs/swagger for update DTOs

### Error Handling

```typescript
// Use built-in NestJS exceptions
throw new NotFoundException(`Quote with ID ${id} not found`);
throw new BadRequestException("Invalid measurement values");
throw new UnauthorizedException("Invalid credentials");

// Custom error messages
throw new NotFoundException(`Material ${materialId} not found`);
```

### Decorator Usage

```typescript
// Controller pattern
@ApiTags("Quotes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("quotes")
export class QuotesController {}

// Swagger DTOs
export class CreateQuoteDto {
  @IsString()
  @ApiProperty()
  customerName: string;
}

// Role-based access
@Roles(Role.ADMIN, Role.OWNER)
```

### Mongoose Schemas

```typescript
@Schema({ timestamps: true, collection: "quotes" })
export class Quote {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Material" })
  materialId: string;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);
```

### Service Pattern

```typescript
@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private model: Model<QuoteDocument>,
    private discountEngine: DiscountEngineService,
  ) {}

  async findAll(factoryId: string): Promise<Quote[]> {
    return this.model.find({ factoryId }).exec();
  }

  async findOne(id: string, factoryId: string): Promise<Quote> {
    const entity = await this.model.findOne({ _id: id, factoryId }).exec();
    if (!entity) throw new NotFoundException(`Quote ${id} not found`);
    return entity;
  }
}
```

## Authentication & Authorization

### Roles

| Role   | Description                            |
| :----- | :------------------------------------- |
| ADMIN  | Full access to all resources           |
| OWNER  | Factory owner (full access to factory) |
| SALES  | View/edit quotes, customers, orders    |
| WORKER | Limited access (production view)       |
| USER   | Basic access                           |

### Guards

- `JwtAuthGuard`: Validates JWT token
- `RolesGuard`: Checks user roles via `@Roles()` decorator
- `FactoryScopeGuard`: Validates factory access for OWNER role

## User Hierarchy & Ownership

### Owner-Sales Hierarchy System

#### Schema Changes

- **ownerId** (User reference): Reference to OWNER user who manages this SALES user
- **createdBy** (User reference, required): ID of user who created this user

#### Creation Rules

- **ADMIN creates SALES**: `ownerId` required in DTO, must reference valid OWNER user
- **OWNER creates SALES**: `ownerId` auto-assigned to current OWNER (ignored if provided in DTO)
- **OWNER creates USER**: `ownerId` ignored (USER doesn't have owner)
- **All cases**: `createdBy` automatically set to current user ID

#### Transfer Rules

- Only **ADMIN** can transfer ownership
- Only **SALES** users can be transferred
- `newOwnerId` must exist and have **OWNER** role
- Transfer updates `ownerId` but NOT `createdBy`

#### New Endpoints

| Method | Endpoint                    | Roles   | Description                              |
| ------ | --------------------------- | ------- | ---------------------------------------- |
| `GET`  | `/users/managed`            | `OWNER` | Get SALES users managed by current OWNER |
| `POST` | `/users/:id/transfer-owner` | `ADMIN` | Transfer SALES user to another OWNER     |
| `POST` | `/users/batch-transfer`     | `ADMIN` | Batch transfer multiple SALES users      |

#### Query Parameters for GET /users

- `?managed=true`: For OWNER users, returns only their managed SALES users
- `?role=SALES`: Filter users by role

#### DTOs Created

- `TransferOwnerDto`: For individual transfer (`{ newOwnerId: string }`)
- `BatchTransferDto`: For batch transfer (`{ userIds: string[], newOwnerId: string }`)

## Module Registration Pattern

```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }])],
  controllers: [EntityController],
  providers: [EntityService],
  exports: [EntityService],
})
export class EntityModule {}
```

## Known Gaps & Issues

1. **No Factory schema**: `Customer` and `DiscountRule` reference `"Factory"` but no schema exists
2. **Quote has no factoryId**: Factory association is lost when quote is persisted
3. **Analytics bug**: `analytics.service.ts` filters by `header.factoryId` but field is in `items[].core.factoryId`
4. **GlobalSettings not imported**: Module exists but NOT imported in `app.module.ts`

## Recent Changes (2026-04-09)

### Customers Module - Permissions Update (Revision 2)

**Controller Changes (`src/customers/customers.controller.ts`):**

- `POST /customers`: Añadido `Role.SALES` (SALES puede crear clientes)
- `GET /customers`: Añadido `Role.USER` (USER puede leer cliente asignado)
- `GET /customers/:id`: Añadido `Role.USER`
- `PATCH /customers/:id`: Removido `Role.OWNER` (OWNER solo lectura)
- `DELETE /customers/:id`: Añadido `Role.SALES` (con validación de propiedad)
- `POST /customers/:id/link/:userId`: Añadido `Role.OWNER`
- `DELETE /customers/batch`: Añadido `Role.OWNER`

**Service Changes (`src/customers/customers.service.ts`):**

- `create()`: Añadido parámetro `userRoles` y auto-asignación de SALES a `assignedUserIds`
- Añadido `findAllForUser()` y `findOneForUser()` para usuarios con rol USER
- `remove()`: Añadido validación de propiedad para SALES

**Validación de Propiedad:**

- **SALES**: Accede a clientes donde `createdBy = userId` o `assignedUserIds.includes(userId)`
- **USER**: Accede a clientes donde `platformUserId = userId`
- **OWNER**: Lee todos los clientes activos, no puede PATCH/DELETE individual

**Reglas de Asignación Automática:**

- Cuando un SALES crea un cliente: automáticamente se asigna como `createdBy` y se añade a `assignedUserIds`

**Documentación Actualizada:**

- `docs/api/customers-api.md`: Tabla de permisos actualizada y reglas detalladas

## ESLint & Prettier

- **ESLint config**: `eslint.config.mjs`
- **Prettier config**: `.prettierrc`
- Print width: 160, semicolons: true, single quotes: false
- Run `npm run lint` to fix issues automatically
