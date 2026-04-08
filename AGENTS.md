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

## ESLint & Prettier

- **ESLint config**: `eslint.config.mjs`
- **Prettier config**: `.prettierrc`
- Print width: 160, semicolons: true, single quotes: false
- Run `npm run lint` to fix issues automatically
