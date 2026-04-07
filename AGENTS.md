# KUUK ERP Backend - AI Agent Context

> Backend para sistema de presupuestado de encimeras y superficies. API REST para gestión de materiales, cálculo de presupuestos, carrito de compras, órdenes y configuración de documentos PDF.

## Project Overview

- **Name**: KUUK ERP Backend
- **Version**: 0.1.0
- **Author**: Damian Vidal
- **Framework**: NestJS 11
- **Database**: MongoDB (Mongoose 8)
- **Language**: TypeScript 5.7
- **Runtime**: Node.js
- **Queue System**: BullMQ + Redis
- **Real-time**: Socket.io
- **Auth**: JWT + Passport (bcrypt)
- **API Docs**: Swagger UI at `/api`

## Environment Variables

| Variable             | Description                                     | Default                         |
| :------------------- | :---------------------------------------------- | :------------------------------ |
| `NODE_ENV`           | Environment                                     | `development`                   |
| `MONGO_URI`          | MongoDB connection string                       | `mongodb://127.0.0.1:27017/...` |
| `MONGO_DB_NAME`      | Database name                                   | `encimeras-db-dev`              |
| `PORT`               | Server port                                     | `3000`                          |
| `JWT_SECRET`         | JWT signing secret                              | (configured)                    |
| `JWT_EXPIRES_IN`     | JWT expiration                                  | `3600s`                         |
| `CLOUDINARY_*`       | Image storage (cloud_name, api_key, api_secret) | (configured)                    |
| `CORS_ORIGIN`        | Allowed CORS origin                             | `http://localhost`              |
| `ADMIN_DEFAULT_USER` | Default admin email                             | `admin@admin.com`               |
| `ADMIN_DEFAULT_PASS` | Default admin password                          | `admin123`                      |
| `REDIS_HOST`         | Redis host for BullMQ                           | `localhost`                     |
| `REDIS_PORT`         | Redis port                                      | `6379`                          |

## Scripts

```bash
npm run start        # Start server
npm run start:dev    # Watch mode
npm run start:debug  # Debug watch mode
npm run build        # Build project
npm run lint         # ESLint + Prettier fix
npm run test         # Run unit tests
npm run test:e2e     # Run e2e tests
```

## Directory Structure

```
src/
├── main.ts                          # Entry point (bootstrap, CORS, Swagger, ValidationPipe)
├── app.module.ts                    # Root module (imports all feature modules)
├── app.controller.ts / app.service.ts
├── redis-check.service.ts           # Redis health check
│
├── database/
│   ├── database.module.ts           # MongooseModule.forRootAsync
│   └── seed.service.ts              # Seeds admin user + default document settings on bootstrap
│
├── auth/                            # JWT authentication
│   ├── auth.module.ts, auth.service.ts, auth.controller.ts
│   ├── jwt.strategy.ts, jwt-auth.guard.ts
│   ├── guards/roles.guard.ts, decorators/roles.decorator.ts
│   ├── enums/role.enum.ts           # ADMIN, SALES, WORKER, USER
│   └── dto/login.dto.ts
│
├── users/                           # User management
│   └── schemas/users.schema.ts
│
├── customers/                       # B2B customer management
│   ├── schemas/customer.schema.ts
│   └── enums/customer-type.enum.ts
│
├── materials/                       # Material catalog (marbles, stones, etc.)
│   └── schemas/material.schema.ts
│
├── attributes/                      # Material attributes (color, finish, group, thickness)
│   └── schemas/attribute.schema.ts
│
├── valid-combinations/              # Valid material+attribute combinations
│   └── schemas/valid-combination.schema.ts
│
├── price-configs/                   # Pricing per product type + attribute combination
│   └── schemas/price-config.schema.ts
│
├── addons/                          # Accessories (cladding, coping, sinks, etc.)
│   └── schemas/addons.schema.ts
│
├── measurement-rule-sets/           # Range-based measurement rules (for addons)
│   └── schemas/measurement-rule-sets.schema.ts
│
├── cutouts/                         # Cutout types (sink cutouts, etc.)
│   └── schemas/cutout.schema.ts
│
├── edge-profiles/                   # Edge profile types
│   └── schemas/edge-profile.schema.ts
│
├── main-pieces/                     # Individual countertop pieces
│   └── schemas/main-pieces.schema.ts
│
├── quotes/                          # Quote calculation and persistence
│   ├── quotes.controller.ts         # POST /quotes/calculate, POST /quotes, CRUD
│   ├── quotes.service.ts            # Core pricing engine
│   ├── quotes.module.ts
│   └── schemas/quote.schema.ts
│
├── discount-rules/                  # Discount rule engine
│   ├── discount-engine.service.ts   # Core discount calculation logic
│   ├── discount-rules.service.ts, discount-rules.controller.ts
│   └── schemas/discount-rule.schema.ts
│
├── cart/                            # Shopping cart (multi-project)
│   ├── cart.service.ts, cart.controller.ts, cart.module.ts
│   └── schemas/cart.schema.ts
│
├── drafts/                          # Temporary saved quotes with expiration
│   ├── drafts.service.ts, drafts.controller.ts, drafts.module.ts
│   └── schemas/draft.schema.ts
│
├── orders/                          # Confirmed orders (immutable snapshots)
│   ├── orders.service.ts, orders.controller.ts, orders.module.ts
│   ├── schemas/order.schema.ts
│   ├── processors/cart.processor.ts # BullMQ async checkout
│   └── dto/create-order.dto.ts, update-order-status.dto.ts
│
├── document-settings/               # PDF document configuration per factory
│   ├── document-settings.service.ts
│   ├── document-settings.controller.ts
│   ├── document-settings.module.ts
│   ├── schemas/document-settings.schema.ts
│   └── dto/create-document-settings.dto.ts, update-document-settings.dto.ts
│
├── settings/                        # Global application settings (singleton)
│   ├── global-settings.service.ts   # getDraftValidityDays()
│   ├── global-settings.module.ts
│   └── schemas/global-settings.schema.ts
│
├── assets/                          # File storage (Cloudinary or local)
│   ├── strategies/cloudinary.strategy.ts, local-storage.strategy.ts
│   └── interfaces/storage-strategy.interface.ts
│
├── events/                          # Socket.io real-time notifications
│   └── events.gateway.ts, events.module.ts
│
├── analytics/                       # Analytics service
│   └── analytics.service.ts, analytics.controller.ts, analytics.module.ts
│
└── dictionaries/                    # Dictionary/lookup service
    └── dictionaries.service.ts, dictionaries.controller.ts, dictionaries.module.ts
```

## Database Schemas

### User (`users/schemas/users.schema.ts`)

| Field      | Type     | Notes             |
| :--------- | :------- | :---------------- |
| `username` | `string` | Unique, required  |
| `password` | `string` | Bcrypt hashed     |
| `roles`    | `Role[]` | Default: `[USER]` |
| `name`     | `string` | Optional          |
| `email`    | `string` | Optional          |
| `phone`    | `string` | Optional          |

> **Note**: User does NOT have `factoryId`. Factory association is indirect via `Customer.platformUserId`.

### Customer (`customers/schemas/customer.schema.ts`)

| Field             | Type           | Notes                                |
| :---------------- | :------------- | :----------------------------------- |
| `type`            | `CustomerType` | Required                             |
| `officialName`    | `string`       | Required                             |
| `commercialName`  | `string`       | Optional                             |
| `nif`             | `string`       | Required                             |
| `factoryId`       | `ObjectId`     | Ref: "Factory", **required**         |
| `platformUserId`  | `ObjectId`     | Ref: "User"                          |
| `discountProfile` | `number`       | Optional                             |
| `taxProfile`      | `number`       | Optional                             |
| `contact`         | `Object`       | Subdoc: phone, email, website        |
| `address`         | `Object`       | Subdoc: country, address, city, etc. |
| `isActive`        | `boolean`      | Default: true                        |

### Material (`materials/schemas/material.schema.ts`)

| Field                  | Type              | Notes            |
| :--------------------- | :---------------- | :--------------- |
| `name`                 | `string`          | Required, unique |
| `category`             | `string`          | Required         |
| `type`                 | `string`          | Required         |
| `imageUrl`             | `string`          | Optional         |
| `pricingRecipes`       | `PricingRecipe[]` | Embedded subdocs |
| `selectableAttributes` | `string[]`        | Optional         |

### PricingRecipe (subdoc in Material)

| Field               | Type       | Notes        |
| :------------------ | :--------- | :----------- |
| `productType`       | `string`   | Required     |
| `pricingAttributes` | `string[]` | Required     |
| `unit`              | `string`   | "m2" or "ml" |

### Attribute (`attributes/schemas/attribute.schema.ts`)

| Field      | Type      | Notes         |
| :--------- | :-------- | :------------ |
| `type`     | `string`  | Required      |
| `value`    | `string`  | Required      |
| `label`    | `string`  | Required      |
| `isActive` | `boolean` | Default: true |

### ValidCombination (`valid-combinations/schemas/valid-combination.schema.ts`)

| Field        | Type       | Notes                     |
| :----------- | :--------- | :------------------------ |
| `materialId` | `ObjectId` | Ref: "Material", required |
| `attributes` | `Map`      | Attribute key-value pairs |

### PriceConfig (`price-configs/schemas/price-config.schema.ts`)

| Field            | Type     | Notes    |
| :--------------- | :------- | :------- |
| `combinationKey` | `string` | Required |
| `productType`    | `string` | Required |
| `price`          | `number` | Required |

> Unique index on `(productType, combinationKey)`

### Addon (`addons/schemas/addons.schema.ts`)

| Field                       | Type       | Notes                     |
| :-------------------------- | :--------- | :------------------------ |
| `code`                      | `string`   | Required, unique          |
| `name`                      | `string`   | Required                  |
| `category`                  | `string`   | Required                  |
| `pricingType`               | `string`   | Required                  |
| `productTypeMap`            | `Object`   | Optional                  |
| `measurementRuleSetId`      | `ObjectId` | Ref: "MeasurementRuleSet" |
| `allowedMaterialCategories` | `string[]` | Optional                  |

### MeasurementRuleSet (`measurement-rule-sets/schemas/measurement-rule-sets.schema.ts`)

| Field    | Type                 | Notes            |
| :------- | :------------------- | :--------------- |
| `name`   | `string`             | Required         |
| `unit`   | `string`             | Required         |
| `ranges` | `MeasurementRange[]` | Embedded subdocs |

### Cutout (`cutouts/schemas/cutout.schema.ts`)

| Field   | Type     | Notes    |
| :------ | :------- | :------- |
| `name`  | `string` | Required |
| `price` | `number` | Required |
| `type`  | `string` | Optional |

### EdgeProfile (`edge-profiles/schemas/edge-profile.schema.ts`)

| Field           | Type     | Notes    |
| :-------------- | :------- | :------- |
| `name`          | `string` | Required |
| `pricePerMeter` | `number` | Required |
| `imageUrl`      | `string` | Optional |

### MainPiece (`main-pieces/schemas/main-pieces.schema.ts`)

| Field                | Type             | Notes              |
| :------------------- | :--------------- | :----------------- |
| `quoteId`            | `ObjectId`       | Ref: "Quote"       |
| `materialId`         | `ObjectId`       | Ref: "Material"    |
| `selectedAttributes` | `Object`         | Dynamic attributes |
| `length_mm`          | `number`         | Required           |
| `width_mm`           | `number`         | Required           |
| `appliedAddons`      | `AppliedAddon[]` | Embedded subdocs   |

### Quote (`quotes/schemas/quote.schema.ts`)

| Field                      | Type         | Notes                                 |
| :------------------------- | :----------- | :------------------------------------ | ------------ | ---------- |
| `customerName`             | `string`     | Required                              |
| `customerEmail`            | `string`     | Required                              |
| `customerPhone`            | `string`     | Optional                              |
| `status`                   | `string`     | "Pendiente"                           | "Contactado" | "Aceptado" |
| `mainPieces`               | `ObjectId[]` | Ref: "MainPiece"                      |
| `totalPrice`               | `number`     | Required (after discounts)            |
| `totalPriceBeforeDiscount` | `number`     | Required                              |
| `totalDiscount`            | `number`     | Default: 0                            |
| `appliedRules`             | `Object[]`   | {ruleId, ruleName, discountAmount}    |
| `priceBreakdown`           | `Object[]`   | {description, points, discountAmount} |

> **Note**: Quote schema does NOT have `factoryId`. Factory association is transient during calculation (via DTO or Customer lookup).

### DiscountRule (`discount-rules/schemas/discount-rule.schema.ts`)

| Field               | Type                 | Notes                                              |
| :------------------ | :------------------- | :------------------------------------------------- |
| `name`              | `string`             | Required                                           |
| `type`              | `DiscountType`       | Required (enum)                                    |
| `value`             | `number`             | Required                                           |
| `scope`             | `DiscountScope`      | Required (enum)                                    |
| `targetMaterials`   | `string[]`           | Optional                                           |
| `targetCategories`  | `string[]`           | Optional                                           |
| `priority`          | `number`             | Default: 0                                         |
| `collisionStrategy` | `CollisionStrategy`  | Default: SUM                                       |
| `stackable`         | `boolean`            | Default: true                                      |
| `conditions`        | `DiscountConditions` | Subdoc: startDate, endDate, customerStrategy, etc. |
| `factoryId`         | `ObjectId`           | Ref: "Factory", **required**                       |
| `isActive`          | `boolean`            | Default: true                                      |

### Cart (`cart/schemas/cart.schema.ts`)

| Field                 | Type         | Notes            |
| :-------------------- | :----------- | :--------------- |
| `userId`              | `string`     | Required         |
| `customerId`          | `ObjectId`   | Ref: "Customer"  |
| `status`              | `string`     | Required         |
| `items`               | `CartItem[]` | Embedded subdocs |
| `totalPoints`         | `number`     | Required         |
| `totalOriginalPoints` | `number`     | Required         |
| `totalDiscount`       | `number`     | Default: 0       |
| `expiresAt`           | `Date`       | Optional         |

### CartItem (subdoc in Cart)

| Field            | Type       | Notes                                     |
| :--------------- | :--------- | :---------------------------------------- |
| `cartItemId`     | `string`   | Unique identifier                         |
| `customName`     | `string`   | Optional                                  |
| `core`           | `Object`   | Mixed: business data (includes factoryId) |
| `uiState`        | `Object`   | Mixed: visual metadata                    |
| `subtotalPoints` | `number`   | Required                                  |
| `originalPoints` | `number`   | Required                                  |
| `discountAmount` | `number`   | Default: 0                                |
| `appliedRules`   | `Object[]` | Applied discount rules                    |
| `draftId`        | `ObjectId` | Ref: "Draft"                              |

### Draft (`drafts/schemas/draft.schema.ts`)

| Field                | Type      | Notes                                             |
| :------------------- | :-------- | :------------------------------------------------ |
| `userId`             | `string`  | Required                                          |
| `userEmail`          | `string`  | Required                                          |
| `name`               | `string`  | Optional                                          |
| `core`               | `Object`  | Mixed: includes factoryId, customerId, mainPieces |
| `uiState`            | `Object`  | Mixed: visual metadata                            |
| `currentPricePoints` | `number`  | Required                                          |
| `originalPoints`     | `number`  | Required                                          |
| `discountAmount`     | `number`  | Default: 0                                        |
| `expirationDate`     | `Date`    | Required                                          |
| `isConverted`        | `boolean` | Default: false                                    |
| `cartGroupId`        | `string`  | Optional                                          |

### Order (`orders/schemas/order.schema.ts`)

| Field                | Type              | Notes                                             |
| :------------------- | :---------------- | :------------------------------------------------ |
| `header`             | `OrderHeader`     | Subdoc: orderNumber, userId, status, totals, etc. |
| `items`              | `OrderLineItem[]` | Embedded subdocs (immutable snapshots)            |
| `appliedGlobalRules` | `Object[]`        | Global discount rules applied                     |
| `originDraftId`      | `ObjectId`        | Ref: "Draft"                                      |

### DocumentSettings (`document-settings/schemas/document-settings.schema.ts`)

| Field          | Type               | Notes                                        |
| :------------- | :----------------- | :------------------------------------------- |
| `factoryId`    | `ObjectId`         | Ref: "Factory", **required**                 |
| `userId`       | `ObjectId \| null` | Ref: "User", `null` = factory default        |
| `validityDays` | `number`           | Default: 30                                  |
| `footerText`   | `string`           | Default: "Presupuesto válido por 30 días..." |

> Unique index on `{ factoryId: 1, userId: 1 }`. Resolution: tries userId-specific first, falls back to `userId: null`, then hardcoded defaults.

### GlobalSettings (`settings/schemas/global-settings.schema.ts`)

| Field                       | Type     | Notes               |
| :-------------------------- | :------- | :------------------ |
| `key`                       | `string` | Singleton: "config" |
| `draftValidityDays`         | `number` | Default: 7          |
| `currentCurrencyMultiplier` | `number` | Default: 1.0        |

> Singleton pattern (single document). Used for draft expiration.

## Schema Relationships

```
User (no factoryId)
  │
  │ (linked via Customer.platformUserId)
  ▼
Customer ──────── factoryId ──────► Factory (referenced but NOT implemented as schema)
  │
  │ (used for discount resolution)
  ▼
DiscountRule ─── factoryId ──────► Factory

Quote (NO factoryId stored)
  │
  │ (factoryId transient during calculation)
  ▼
MainPiece ────── materialId ─────► Material
  │                                    │
  │                                    ▼
  │                              PricingRecipe[]
  │
  ▼
AppliedAddon[] ── code ─────────► Addon ── measurementRuleSetId ──► MeasurementRuleSet

Cart ────────── customerId ─────► Customer
  │
  ▼
CartItem ────── draftId ───────► Draft
  │
  │ (processed async via BullMQ)
  ▼
Order ───────── originDraftId ─► Draft
  │
  ▼
OrderLineItem.core.factoryId ──► Factory (string, not ObjectId ref)

DocumentSettings ── factoryId ─► Factory
                 ── userId ────► User (optional override)

GlobalSettings ── singleton (key: "config")
```

## Key Architectural Patterns

### 1. CORE/UI Separation

The backend strictly separates business data (`core`) from presentation data (`uiState`):

- **`core`**: Contains all business-critical data (pieces, measurements, factoryId, customerId, materials). This is validated and processed by the backend.
- **`uiState`**: Opaque metadata for the frontend (wizard state, selected tabs, UI preferences). The backend passes this through without validation.

This pattern is used in Cart, Draft, and Order items.

### 2. Immutability

Orders are **immutable snapshots**. Once a cart is converted to an order:

- All prices are frozen at checkout time
- Items contain full `core` data (no references to mutable entities)
- Historical pricing is preserved even if material prices change

### 3. BFF (Backend For Frontend)

The backend delivers pre-computed, hydrated data:

- `totalPrice`, `totalPriceBeforeDiscount`, `totalDiscount` are calculated server-side
- `appliedRules` includes rule names and discount amounts
- `priceBreakdown` provides human-readable descriptions
- Frontend should NOT perform price calculations

### 4. Factory Scoping

Most entities are scoped by `factoryId`:

- `Customer.factoryId` (required)
- `DiscountRule.factoryId` (required)
- `DocumentSettings.factoryId` (required)
- Cart/Draft/Order items have `factoryId` in their `core` object

Controllers use `@GetUser("factoryId")` with fallback to `"000000000000000000000000"`.

### 5. Discount Engine

Discounts are calculated by `DiscountEngineService`:

- Rules are filtered by `factoryId` and `isActive`
- Rules are sorted by `priority` (higher first)
- Collision strategies: SUM, MAX, FIRST
- Stackable rules can combine; non-stackable rules block further discounts
- Conditions: date ranges, customer targeting, minimum order value

### 6. Async Processing

Cart checkout uses BullMQ for async order creation:

- `POST /cart/checkout` queues the job
- `CartProcessor` processes the queue
- Real-time notifications via Socket.io (`notifyNewOrder`, `notifyOrderUpdate`)

### 7. File Storage Strategy

Strategy pattern for file storage:

- `StorageStrategy` interface
- `CloudinaryStrategy` for cloud storage
- `LocalStorageStrategy` for local file serving (`/public/uploads`)

## Authentication & Authorization

### Roles

| Role     | Description                             |
| :------- | :-------------------------------------- |
| `ADMIN`  | Full access to all resources            |
| `SALES`  | Can view/edit quotes, customers, orders |
| `WORKER` | Limited access (production view)        |
| `USER`   | Basic access                            |

### Guards

- `JwtAuthGuard`: Validates JWT token
- `RolesGuard`: Checks user roles via `@Roles()` decorator

### Decorators

- `@GetUser()`: Extracts user data from request
- `@GetUser("factoryId")`: Extracts factoryId (falls back to `"000000000000000000000000"`)
- `@GetUser("userId")`: Extracts userId from JWT payload
- `@Roles(Role.ADMIN, Role.SALES)`: Specifies allowed roles

### JWT Payload

```typescript
{
  sub: user._id,
  name: user.name,
  username: user.username,
  roles: user.roles,
}
```

> **Known gap**: `factoryId` is NOT included in JWT payload. Controllers fall back to `"000000000000000000000000"`.

## Module Registration Pattern

All feature modules follow this structure:

```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }])],
  controllers: [EntityController],
  providers: [EntityService],
  exports: [EntityService], // If other modules need it
})
export class EntityModule {}
```

Modules are registered in `app.module.ts` imports array.

## DTO Pattern

- **Create DTO**: All fields required (except optional ones), with `class-validator` decorators
- **Update DTO**: `extends PartialType(CreateDto)` using `@nestjs/swagger`
- Validation via `ValidationPipe({ whitelist: true, transform: true })`

## Controller Pattern

```typescript
@ApiTags("Entity Name")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("entities")
export class EntityController {
  constructor(private readonly service: EntityService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateEntityDto, @GetUser("factoryId") factoryId: string) {
    const fid = factoryId || "000000000000000000000000";
    return this.service.create(dto, fid);
  }
}
```

## Known Gaps & Issues

1. **No Factory schema**: `Customer` and `DiscountRule` reference `"Factory"` but no schema exists. Factory is treated as an opaque ObjectId.
2. **User has no factoryId**: JWT does not include factoryId. All controllers fall back to `"000000000000000000000000"`.
3. **Quote has no factoryId**: Factory association is lost when quote is persisted. Cannot query "all quotes for factory X".
4. **Analytics bug**: `analytics.service.ts` filters by `header.factoryId` but `OrderHeader` has no `factoryId` field (it's in `items[].core.factoryId`).
5. **No migration system**: MongoDB schema changes are applied by modifying `@Schema` classes. No data migration tooling.
6. **GlobalSettings not imported**: `GlobalSettingsModule` exists but is NOT imported in `app.module.ts` (only imported by `DraftsModule`).

## How to Add a New Feature

### 1. Create Schema

```typescript
// src/new-feature/schemas/new-feature.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type NewFeatureDocument = NewFeature & Document;

@Schema({ timestamps: true })
export class NewFeature {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Factory", required: true })
  factoryId: string;

  @Prop({ required: true })
  name: string;
}

export const NewFeatureSchema = SchemaFactory.createForClass(NewFeature);
```

### 2. Create DTOs

```typescript
// src/new-feature/dto/create-new-feature.dto.ts
import { IsString } from "class-validator";
export class CreateNewFeatureDto {
  @IsString()
  name: string;
}

// src/new-feature/dto/update-new-feature.dto.ts
import { PartialType } from "@nestjs/swagger";
import { CreateNewFeatureDto } from "./create-new-feature.dto";
export class UpdateNewFeatureDto extends PartialType(CreateNewFeatureDto) {}
```

### 3. Create Service

```typescript
// src/new-feature/new-feature.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { NewFeature, NewFeatureDocument } from "./schemas/new-feature.schema";
import { CreateNewFeatureDto } from "./dto/create-new-feature.dto";
import { UpdateNewFeatureDto } from "./dto/update-new-feature.dto";

@Injectable()
export class NewFeatureService {
  constructor(@InjectModel(NewFeature.name) private model: Model<NewFeatureDocument>) {}

  async create(dto: CreateNewFeatureDto, factoryId: string): Promise<NewFeature> {
    const entity = new this.model({ ...dto, factoryId });
    return entity.save();
  }

  async findAll(factoryId: string): Promise<NewFeature[]> {
    return this.model.find({ factoryId }).exec();
  }

  async findOne(id: string, factoryId: string): Promise<NewFeature> {
    const entity = await this.model.findOne({ _id: id, factoryId }).exec();
    if (!entity) throw new NotFoundException(`Not found`);
    return entity;
  }

  async update(id: string, dto: UpdateNewFeatureDto, factoryId: string): Promise<NewFeature> {
    const updated = await this.model.findOneAndUpdate({ _id: id, factoryId }, dto, { new: true }).exec();
    if (!updated) throw new NotFoundException(`Not found`);
    return updated;
  }

  async remove(id: string, factoryId: string): Promise<void> {
    const result = await this.model.deleteOne({ _id: id, factoryId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Not found`);
  }
}
```

### 4. Create Controller

Follow the controller pattern above with `@ApiTags`, `@ApiBearerAuth`, guards, roles, and `@GetUser("factoryId")`.

### 5. Create Module

```typescript
// src/new-feature/new-feature.module.ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NewFeatureService } from "./new-feature.service";
import { NewFeatureController } from "./new-feature.controller";
import { NewFeature, NewFeatureSchema } from "./schemas/new-feature.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: NewFeature.name, schema: NewFeatureSchema }])],
  controllers: [NewFeatureController],
  providers: [NewFeatureService],
  exports: [NewFeatureService],
})
export class NewFeatureModule {}
```

### 6. Register in app.module.ts

```typescript
import { NewFeatureModule } from "./new-feature/new-feature.module";

@Module({
  imports: [
    // ...existing modules
    NewFeatureModule,
  ],
})
export class AppModule {}
```

## Documentation

- **API Docs**: `docs/api/` - Endpoint documentation (naming: `<module>-api.md`)
- **UX/UI Guides**: `docs/ux-ui/` - Frontend integration guides
- **Dev Ops**: `docs/dev/` - Infrastructure and internal architecture
- **Business/Admin**: `docs/business/` - Admin manuals
- **Master Index**: `docs/AGENT_INDEX.md`

## Testing

- **Unit tests**: `jest` with `*.spec.ts` files alongside source
- **E2E tests**: `test/jest-e2e.json` configuration
- **Test directory**: `test/`

## Code Conventions

- **No comments** unless explicitly requested
- **No emojis** in code
- **Spanish** for documentation, **English** for code
- **Mongoose** decorators: `@Prop`, `@Schema`, `SchemaFactory`
- **NestJS** decorators: `@Injectable`, `@Module`, `@Controller`, `@Get`, `@Post`, etc.
- **Validation**: `class-validator` decorators on DTOs
- **Swagger**: `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` on controllers
- **Factory scoping**: Always pass `factoryId` to service methods, scope queries by it
- **Error handling**: Use `NotFoundException` for missing entities, `ValidationPipe` for input validation
