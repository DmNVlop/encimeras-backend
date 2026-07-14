import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { User } from "../src/users/schemas/users.schema";
import { Material } from "../src/materials/schemas/material.schema";
import { Draft } from "../src/drafts/schemas/draft.schema";
import { Cart } from "../src/cart/schemas/cart.schema";
import { Order } from "../src/orders/schemas/order.schema";
import { Role } from "../src/auth/enums/role.enum";
import { PriceConfig } from "../src/price-configs/schemas/price-config.schema";

/**
 * E2E — Flujo completo de creación de Order.
 *
 * Cubre: crear presupuesto (Draft) -> crear carrito (Cart) -> checkout async (BullMQ)
 * -> Order creada -> verificación de invariantes críticos -> limpieza total de datos.
 *
 * Ejecutar SIEMPRE antes de desplegar a producción cualquier cambio que toque:
 * drafts, cart, orders, analytics (factoryId scoping), o el motor de precios (quotes).
 *
 * Requiere Mongo y Redis corriendo localmente (mismos que usa `npm run start:dev`).
 * Se autoprovisiona su propio usuario y material de prueba — no depende de datos
 * preexistentes ni dev seed. Todo lo creado se elimina al final (afterAll),
 * incluso si alguna aserción falla a mitad de camino.
 *
 *   npm run test:e2e -- order-creation-flow
 */
describe("Order creation flow (e2e)", () => {
  let app: INestApplication<App>;

  let userModel: Model<User>;
  let materialModel: Model<Material>;
  let draftModel: Model<Draft>;
  let cartModel: Model<Cart>;
  let orderModel: Model<Order>;
  let priceConfigModel: Model<PriceConfig>;

  const TEST_TAG = `E2E_ORDER_FLOW_${Date.now()}`;
  const testUsername = `${TEST_TAG}_user`;
  const testPassword = "Test1234!";
  const testFactoryId = new Types.ObjectId().toString();

  let testUserId: string;
  let testMaterialId: string;
  let testPriceConfigId: string;
  let accessToken: string;

  const createdDraftIds: string[] = [];
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    // Guard de seguridad: nunca correr esta prueba contra una base de datos que no sea local.
    const mongoUri = process.env.MONGO_URI || "";
    const isLocalDb = /^mongodb:\/\/(127\.0\.0\.1|localhost)/.test(mongoUri);
    if (!isLocalDb || /prod/i.test(mongoUri)) {
      throw new Error(
        `MONGO_URI no parece una base de datos local de desarrollo ("${mongoUri}"). ` +
          `Abortando para evitar escribir datos de prueba fuera de un entorno seguro.`,
      );
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    materialModel = moduleFixture.get<Model<Material>>(getModelToken(Material.name));
    draftModel = moduleFixture.get<Model<Draft>>(getModelToken(Draft.name));
    cartModel = moduleFixture.get<Model<Cart>>(getModelToken(Cart.name));
    orderModel = moduleFixture.get<Model<Order>>(getModelToken(Order.name));
    priceConfigModel = moduleFixture.get<Model<PriceConfig>>(getModelToken(PriceConfig.name));

    // --- Fixture: usuario de prueba (OWNER con factoryId propio) ---
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const testUser = await userModel.create({
      username: testUsername,
      password: hashedPassword,
      roles: [Role.OWNER],
      factoryId: testFactoryId,
      createdBy: new Types.ObjectId().toString(),
    });
    testUserId = (testUser._id as Types.ObjectId).toString();

    // --- Fixture: material de prueba con receta de precio real para "ENCIMERA" ---
    // La pieza de prueba siempre selecciona TEST_GROUP:BASIC (ver samplePiece), y la
    // receta usa ese mismo atributo para construir la combinationKey — deben coincidir
    // con la key registrada en el PriceConfig de abajo.
    const testMaterial = await materialModel.create({
      name: TEST_TAG,
      category: "TEST",
      type: "TEST",
      isActive: true,
      pricingRecipes: [{ productType: "ENCIMERA", pricingAttributes: ["TEST_GROUP"], unit: "m2" }],
      selectableAttributes: ["TEST_GROUP"],
    });
    testMaterialId = (testMaterial._id as Types.ObjectId).toString();

    const testPriceConfig = await priceConfigModel.create({
      combinationKey: "TEST_GROUP:BASIC",
      productType: "ENCIMERA",
      price: 100,
    });
    testPriceConfigId = (testPriceConfig._id as Types.ObjectId).toString();

    // --- Login real vía HTTP para obtener el access_token (igual que el frontend) ---
    const loginRes = await request(app.getHttpServer()).post("/auth/login").send({ username: testUsername, password: testPassword }).expect(200);

    accessToken = loginRes.body.access_token || loginRes.body.token;
    expect(accessToken).toBeDefined();
  });

  afterAll(async () => {
    // Limpieza total — corre incluso si beforeAll falló a mitad de camino
    // (ej. error de compilación/conexión), por eso cada paso es defensivo.
    if (orderModel) await orderModel.deleteMany({ _id: { $in: createdOrderIds } });
    if (draftModel) await draftModel.deleteMany({ _id: { $in: createdDraftIds } });
    if (cartModel && testUserId) await cartModel.deleteMany({ userId: testUserId });
    if (materialModel && testMaterialId) await materialModel.deleteOne({ _id: testMaterialId });
    if (priceConfigModel && testPriceConfigId) await priceConfigModel.deleteOne({ _id: testPriceConfigId });
    if (userModel && testUserId) await userModel.deleteOne({ _id: testUserId });

    if (app) await app.close();
  });

  const authed = (method: "get" | "post" | "put" | "delete", url: string) => request(app.getHttpServer())[method](url).set("Authorization", `Bearer ${accessToken}`);

  const samplePiece = () => ({
    materialId: testMaterialId,
    selectedAttributes: { TEST_GROUP: "BASIC" },
    length_mm: 2000,
    width_mm: 600,
  });

  // ==========================================================================
  // 1. Crear un presupuesto (Draft)
  // ==========================================================================
  it("crea un Draft (presupuesto) con factoryId propagado correctamente", async () => {
    const res = await authed("post", "/drafts")
      .send({
        name: `${TEST_TAG}_draft`,
        core: {
          mainPieces: [samplePiece()],
          factoryId: testFactoryId,
        },
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    createdDraftIds.push(res.body.id);

    const draftInDb = await draftModel.findById(res.body.id).lean();
    expect(draftInDb).not.toBeNull();
    expect(draftInDb!.core.factoryId).toBe(testFactoryId);
    expect(draftInDb!.userId).toBe(testUserId);
    expect(draftInDb!.isConverted).toBe(false);
  });

  // ==========================================================================
  // 2. Crear un carrito (Cart) e importar el borrador
  // ==========================================================================
  it("crea/obtiene el Cart y añade un ítem con el mismo factoryId", async () => {
    // Aseguramos carrito activo
    await authed("get", "/cart").expect(200);

    const addRes = await authed("post", "/cart/items")
      .send({
        customName: `${TEST_TAG}_cart_item`,
        core: {
          mainPieces: [samplePiece()],
          factoryId: testFactoryId,
        },
      })
      .expect(201);

    expect(addRes.body.items?.length).toBeGreaterThan(0);

    const cartInDb = await cartModel.findOne({ userId: testUserId, status: "ACTIVE" }).lean();
    expect(cartInDb).not.toBeNull();
    expect(cartInDb!.items.length).toBeGreaterThan(0);
    for (const item of cartInDb!.items) {
      expect(item.core.factoryId).toBe(testFactoryId);
    }
  });

  // ==========================================================================
  // 3. Checkout (Cart -> Order), asíncrono vía BullMQ
  // ==========================================================================
  it("checkout crea una Order de forma asíncrona y consistente", async () => {
    const orderName = `${TEST_TAG}_order`;

    const checkoutRes = await authed("post", "/cart/checkout").send({ orderName }).expect(201);

    expect(checkoutRes.body.status).toBe("processing");

    // El procesamiento es async (BullMQ) — hacemos polling con timeout generoso.
    const order = await waitForOrderByName(orderModel, testUserId, orderName, 15_000);
    expect(order).not.toBeNull();
    createdOrderIds.push((order!._id as Types.ObjectId).toString());

    // --- Verificación de creación correcta ---
    expect(order!.header.userId).toBe(testUserId);
    expect(order!.header.status).toBe("PENDING");
    expect(order!.items.length).toBeGreaterThan(0);

    // Invariante crítico (motivador del fix reciente de scoping por fábrica):
    // TODOS los items de la Order deben compartir el mismo factoryId, y debe
    // coincidir con el de la fábrica del usuario/carrito de origen.
    const itemFactoryIds = new Set(order!.items.map((i) => i.core?.factoryId));
    expect(itemFactoryIds.size).toBe(1);
    expect([...itemFactoryIds][0]).toBe(testFactoryId);

    // El carrito debe haber quedado marcado como convertido, no seguir ACTIVE.
    const cartAfter = await cartModel.findOne({ userId: testUserId, status: "ACTIVE" }).lean();
    expect(cartAfter).toBeNull();
  }, 20_000);

  // ==========================================================================
  // 4. Verificar que la Order es visible a través del scoping por factoryId
  //    (regresión directa del bug de analytics/orders.findAllByFactory)
  // ==========================================================================
  it("la Order creada es recuperable filtrando por su propio factoryId", async () => {
    const ordersRes = await authed("get", "/orders").expect(200);
    // El endpoint raíz de listado aplica el scope de rol/factory internamente;
    // buscamos nuestra orden por orderName dentro del resultado (solo se
    // proyecta "header" -> select("header")).
    const found = (ordersRes.body as any[]).some((o) => o.header?.orderName?.startsWith(TEST_TAG));
    expect(found).toBe(true);
  });

  // ==========================================================================
  // 5. Crear Order directo desde Draft (segundo camino de creación real)
  // ==========================================================================
  it("crea una Order directamente desde un Draft (POST /orders) con factoryId consistente", async () => {
    const draftRes = await authed("post", "/drafts")
      .send({
        name: `${TEST_TAG}_draft2`,
        core: {
          mainPieces: [samplePiece()],
          factoryId: testFactoryId,
        },
      })
      .expect(201);
    createdDraftIds.push(draftRes.body.id);

    const orderName = `${TEST_TAG}_order_from_draft`;
    const orderRes = await authed("post", "/orders")
      .send({
        orderName,
        draftId: draftRes.body.id,
      })
      .expect(201);

    expect(orderRes.body.orderId).toBeDefined();
    createdOrderIds.push(orderRes.body.orderId);

    const orderInDb = await orderModel.findById(orderRes.body.orderId).lean();
    expect(orderInDb).not.toBeNull();
    expect(orderInDb!.items[0].core.factoryId).toBe(testFactoryId);

    // El draft de origen debe quedar marcado como convertido (no reutilizable).
    const draftAfter = await draftModel.findById(draftRes.body.id).lean();
    expect(draftAfter!.isConverted).toBe(true);
  });

  // ==========================================================================
  // 6. Regresión: creación de Order sin factoryId explícito cae al factoryId
  //    del usuario dueño, en vez de crear una Order huérfana (fix reciente).
  // ==========================================================================
  it("si el draft no trae factoryId, la Order hereda el factoryId del usuario dueño", async () => {
    const draftRes = await authed("post", "/drafts")
      .send({
        name: `${TEST_TAG}_draft_no_factory`,
        core: {
          mainPieces: [samplePiece()],
          // factoryId omitido a propósito
        },
      })
      .expect(201);
    createdDraftIds.push(draftRes.body.id);

    const orderName = `${TEST_TAG}_order_fallback_factory`;
    const orderRes = await authed("post", "/orders")
      .send({ orderName, draftId: draftRes.body.id })
      .expect(201);

    createdOrderIds.push(orderRes.body.orderId);

    const orderInDb = await orderModel.findById(orderRes.body.orderId).lean();
    expect(orderInDb!.items[0].core.factoryId).toBe(testFactoryId);
  });
});

/**
 * Hace polling sobre la colección Order hasta que aparezca la orden generada
 * por el job asíncrono de checkout, o hasta agotar el timeout.
 */
async function waitForOrderByName(orderModel: Model<Order>, userId: string, orderName: string, timeoutMs: number): Promise<(Order & { _id: Types.ObjectId }) | null> {
  const start = Date.now();
  const pollIntervalMs = 300;

  while (Date.now() - start < timeoutMs) {
    const order = await orderModel.findOne({ "header.userId": userId, "header.orderName": orderName }).lean();
    if (order) return order as any;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return null;
}
