import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cart, CartDocument, CartItem } from "./schemas/cart.schema";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
import { QuotesService } from "../quotes/quotes.service";
import { DraftsService } from "../drafts/drafts.service";
import { MaterialsService } from "../materials/materials.service";
import { DiscountEngineService } from "../discount-rules/discount-engine.service";
import { CustomersService } from "../customers/customers.service";
import { v4 as uuidv4 } from "uuid";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly quotesService: QuotesService,
    private readonly draftsService: DraftsService,
    private readonly materialsService: MaterialsService,
    private readonly discountEngineService: DiscountEngineService,
    private readonly customersService: CustomersService,
    @InjectQueue("cart") private cartQueue: Queue,
  ) {}

  /**
   * Obtiene o crea un carrito para un cliente
   * Implementa patrón BFF: Hidrata los ítems con datos maestros actualizados
   */
  async getOrCreateCart(userId: string): Promise<any> {
    let cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();

    if (!cart) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

      cart = new this.cartModel({
        userId,
        status: "ACTIVE",
        totalPoints: 0,
        expiresAt,
        items: [],
      });
      await cart.save();
    }

    // Patrón BFF: Hidratamos la respuesta para el Frontend
    const hydratedItems = await Promise.all(
      cart.items.map(async (item) => {
        const itemObj = (item as any).toObject ? (item as any).toObject() : { ...item };
        const hydratedContext: any = {};

        try {
          // Hidratamos con datos de materiales de la pieza principal
          if (item.core.mainPieces && item.core.mainPieces.length > 0) {
            const materialIds = [...new Set(item.core.mainPieces.map((p) => p.materialId))];
            const materials = await Promise.all(materialIds.map((id) => this.materialsService.findOne(id).catch(() => null)));
            hydratedContext.materials = materials.filter((m) => m !== null);
          }
        } catch (e) {
          console.error("Error hydrating cart item context", e);
        }

        return {
          ...itemObj,
          hydratedContext,
        };
      }),
    );

    const cartObj = cart.toObject();
    return {
      ...cartObj,
      items: hydratedItems,
    };
  }

  async addItem(userId: string, addToCartDto: AddToCartDto): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart) await this.getOrCreateCart(userId);

    // Necesitamos el cart de nuevo si lo acabamos de crear o para asegurar consistencia
    const activeCart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!activeCart) throw new BadRequestException("No se pudo crear o encontrar el carrito");

    // 1. Validamos el precio antes de añadir (Seguridad Backend)
    // Usamos exclusivamente el nodo 'core'
    const calculation = await this.quotesService.calculate({
      mainPieces: addToCartDto.core.mainPieces,
      customerId: addToCartDto.core.customerId || userId,
      factoryId: addToCartDto.core.factoryId,
    });

    const cartItem: any = {
      cartItemId: uuidv4(),
      customName: addToCartDto.customName,
      core: addToCartDto.core,
      uiState: addToCartDto.uiState,
      subtotalPoints: calculation.finalTotalPoints,
      originalPoints: calculation.totalPoints,
      discountAmount: calculation.totalDiscount,
      appliedRules: calculation.appliedRules,
      piecesBreakdown: calculation.pieces,
      draftId: addToCartDto.draftId,
    };

    activeCart.items.push(cartItem);
    await this.recalculateCartTotals(activeCart as any);

    await activeCart.save();
    return this.getOrCreateCart(userId); // Devolvemos hidratado
  }

  /**
   * Elimina un ítem del carrito
   */
  async removeItem(userId: string, cartItemId: string): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    cart.items = cart.items.filter((item) => item.cartItemId !== cartItemId);
    await this.recalculateCartTotals(cart);

    await cart.save();
    return this.getOrCreateCart(userId);
  }

  /**
   * Elimina múltiples ítems del carrito
   */
  async removeItems(userId: string, cartItemIds: string[]): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    cart.items = cart.items.filter((item) => !cartItemIds.includes(item.cartItemId));
    await this.recalculateCartTotals(cart);

    await cart.save();
    return this.getOrCreateCart(userId);
  }

  /**
   * Actualiza un ítem del carrito
   */
  async updateItem(userId: string, cartItemId: string, updateDto: UpdateCartItemDto): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    const itemIndex = cart.items.findIndex((item) => item.cartItemId === cartItemId);
    if (itemIndex === -1) throw new NotFoundException("Ítem no encontrado en el carrito");

    if (updateDto.customName) cart.items[itemIndex].customName = updateDto.customName;

    if (updateDto.core) {
      cart.items[itemIndex].core = {
        ...cart.items[itemIndex].core,
        ...updateDto.core,
      };

      // Si cambia el core, recalculamos precio
      const calculation = await this.quotesService.calculate({
        mainPieces: cart.items[itemIndex].core.mainPieces,
        customerId: cart.items[itemIndex].core.customerId || userId,
        factoryId: cart.items[itemIndex].core.factoryId,
      });
      cart.items[itemIndex].subtotalPoints = calculation.finalTotalPoints;
      cart.items[itemIndex].originalPoints = calculation.totalPoints;
      cart.items[itemIndex].discountAmount = calculation.totalDiscount;
      cart.items[itemIndex].appliedRules = calculation.appliedRules;
      (cart.items[itemIndex] as any).piecesBreakdown = calculation.pieces;
    }

    if (updateDto.uiState) {
      cart.items[itemIndex].uiState = {
        ...cart.items[itemIndex].uiState,
        ...updateDto.uiState,
      };
    }

    await this.recalculateCartTotals(cart);

    await cart.save();
    return this.getOrCreateCart(userId);
  }

  /**
   * Guarda el carrito completo como un grupo de borradores
   */
  async saveAsDraftGroup(userId: string): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart || cart.items.length === 0) throw new BadRequestException("El carrito está vacío");

    const cartGroupId = uuidv4();
    const drafts: any[] = [];

    for (const item of cart.items) {
      const draftData: any = {
        name: item.customName,
        core: item.core,
        uiState: item.uiState,
        currentPricePoints: item.subtotalPoints,
        cartGroupId: cartGroupId,
      };

      const savedDraft = await this.draftsService.createOrUpdate(draftData, userId);

      // Actualizamos el cartItem con el nuevo draftId
      item.draftId = (savedDraft as any)._id.toString();
      drafts.push(savedDraft);
    }

    await cart.save();

    return {
      cartGroupId,
      count: drafts.length,
      drafts,
    };
  }

  /**
   * Importa todos los borradores de un grupo al carrito
   */
  async importByGroupId(userId: string, groupId: string, clearFirst: boolean = false): Promise<any> {
    const drafts = await this.draftsService.findAllByGroupId(groupId, userId);
    if (!drafts || drafts.length === 0) {
      throw new NotFoundException(`No se encontraron borradores para el grupo ${groupId}`);
    }

    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart) await this.getOrCreateCart(userId);
    const activeCart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!activeCart) throw new BadRequestException("No se pudo crear o encontrar el carrito");

    if (clearFirst) {
      activeCart.items = [];
    }

    for (const draft of drafts) {
      const draftIdStr = (draft as any)._id.toString();

      // Evitamos duplicados si ya está en el carrito
      const alreadyInCart = activeCart.items.some((item) => item.draftId === draftIdStr);
      if (alreadyInCart) continue;

      let draftBreakdown: any[] = (draft as any).piecesBreakdown || [];
      if (draftBreakdown.length === 0) {
        try {
          const calc = await this.quotesService.calculate({
            mainPieces: draft.core.mainPieces,
            factoryId: draft.core.factoryId,
            customerId: draft.core.customerId,
          });
          draftBreakdown = calc.pieces;
        } catch {
          // Fallback silencioso — breakdown queda vacío
        }
      }

      const cartItem: any = {
        cartItemId: uuidv4(),
        customName: draft.name || "Borrador importado",
        core: draft.core,
        uiState: draft.uiState,
        subtotalPoints: draft.currentPricePoints,
        originalPoints: (draft as any).originalPoints || draft.currentPricePoints,
        discountAmount: (draft as any).discountAmount || 0,
        piecesBreakdown: draftBreakdown,
        draftId: draftIdStr,
      };

      activeCart.items.push(cartItem);
    }

    await this.recalculateCartTotals(activeCart as any);
    await activeCart.save();
    return this.getOrCreateCart(userId);
  }

  /**
   * Asigna un cliente al carrito y recalcula los totales
   */
  async assignCustomer(userId: string, customerId: string): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    // Validar cliente
    const customer = await this.customersService.findById(customerId);
    if (!customer) throw new NotFoundException("Cliente no encontrado");

    // Asignar al carrito global
    cart.customerId = customerId;

    // Propagar a todos los items existentes
    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        if (item.core) {
          item.core.customerId = customerId;
          item.core.factoryId = customer.factoryId.toString();
        }
      }
      // Notificamos a Mongoose que el array de items (que contiene objetos Mixed) ha cambiado
      cart.markModified("items");
    }

    await this.recalculateCartTotals(cart);
    await cart.save();

    return this.getOrCreateCart(userId);
  }

  async clearCustomer(userId: string): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    cart.customerId = undefined;

    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        if (item.core) {
          item.core.customerId = undefined;
        }
      }
      cart.markModified("items");
    }

    await this.recalculateCartTotals(cart);
    await cart.save();

    return this.getOrCreateCart(userId);
  }

  /**
   * Recalcula los totales del carrito aplicando reglas globales
   */
  private async recalculateCartTotals(cart: CartDocument) {
    if (!cart.items || cart.items.length === 0) {
      cart.totalPoints = 0;
      cart.totalOriginalPoints = 0;
      cart.totalDiscount = 0;
      cart.appliedGlobalRules = [];
      return;
    }

    // 1. Obtener factoryId base (del cliente si existe, o del primer item)
    let globalFactoryId: string | undefined;

    if (cart.customerId) {
      const customer = await this.customersService.findById(cart.customerId);
      if (customer) {
        globalFactoryId = customer.factoryId.toString();
      }
    }

    if (!globalFactoryId && cart.items[0]?.core?.factoryId) {
      globalFactoryId = cart.items[0].core.factoryId;
    }

    // 2. Obtener todos los ítems base brutos para el motor de descuentos
    const allPieces: any[] = [];
    let grossTotal = 0;
    let grossAddonsTotal = 0;

    // Registra cuántas piezas aporta cada ítem al array allPieces (para recomponer el breakdown por ítem)
    const itemPieceCounts: number[] = [];
    // Registra los addons de cada ítem (subtotal - base), para reconstruir subtotalPoints con descuento
    const itemAddons: number[] = [];

    for (const item of cart.items) {
      // Sincronización forzada: Si el carrito tiene cliente, el item DEBE tener ese cliente y su fábrica
      if (cart.customerId && globalFactoryId) {
        item.core.customerId = cart.customerId;
        item.core.factoryId = globalFactoryId;
      }

      // Usamos el QuotesService para obtener los precios brutos de cada pieza
      const calculation = await this.quotesService.calculate({
        mainPieces: item.core.mainPieces,
        factoryId: item.core.factoryId || globalFactoryId,
        customerId: item.core.customerId || cart.customerId,
      });

      // Mapeamos las piezas al formato del motor — solo base, los extras no se descuentan
      let itemAddonsTotal = 0;
      calculation.pieces.forEach((p: any) => {
        allPieces.push({
          id: p.materialId,
          name: p.pieceName,
          category: p.materialCategory,
          price: p.basePricePoints,
          quantity: 1,
        });
        grossTotal += p.subtotalPoints;
        grossAddonsTotal += p.subtotalPoints - p.basePricePoints;
        itemAddonsTotal += p.subtotalPoints - p.basePricePoints;
      });

      itemPieceCounts.push(calculation.pieces.length);
      itemAddons.push(itemAddonsTotal);

      // Actualizamos metadatos del ítem — breakdown queda en estado bruto (sin descuentos globales aún)
      item.originalPoints = calculation.totalPoints;
      item.subtotalPoints = calculation.totalPoints;
      item.discountAmount = 0;
      item.appliedRules = [];
      (item as any).piecesBreakdown = calculation.pieces;
    }

    // 3. Ejecutar el motor de descuentos global
    if (globalFactoryId) {
      const discountResult = await this.discountEngineService.calculateDiscounts(allPieces, globalFactoryId, cart.customerId);

      // 4. Mapear el breakdown por pieza de vuelta a cada ítem del carrito
      // itemBreakdown está alineado posicionalmente con allPieces, que se construyó en el mismo orden que cart.items
      let pieceOffset = 0;
      cart.items.forEach((item, idx) => {
        const count = itemPieceCounts[idx];
        const itemBreakdownSlice = discountResult.itemBreakdown.slice(pieceOffset, pieceOffset + count);
        pieceOffset += count;

        const itemDiscountAmount = itemBreakdownSlice.reduce((sum: number, b: any) => sum + (b.discountAmount ?? 0), 0);
        const itemDiscountedBase = itemBreakdownSlice.reduce((sum: number, b: any) => sum + (b.finalPrice ?? 0), 0);

        item.discountAmount = itemDiscountAmount;
        item.subtotalPoints = itemDiscountedBase + itemAddons[idx];

        // Agregar appliedRules de todas las piezas del ítem, agrupando por ruleId y sumando discountAmount
        const ruleMap = new Map<string, { ruleId: string; ruleName: string; discountAmount: number }>();
        for (let pieceIdx = pieceOffset - count; pieceIdx < pieceOffset; pieceIdx++) {
          const pieceRules = discountResult.appliedRulesByItem?.find((r) => r.itemIndex === pieceIdx);
          if (pieceRules) {
            for (const r of pieceRules.appliedRules) {
              const existing = ruleMap.get(r.ruleId);
              if (existing) {
                existing.discountAmount = Math.round((existing.discountAmount + r.discountAmount) * 100) / 100;
              } else {
                ruleMap.set(r.ruleId, { ruleId: r.ruleId, ruleName: r.ruleName, discountAmount: r.discountAmount });
              }
            }
          }
        }
        item.appliedRules = Array.from(ruleMap.values());
      });

      // 5. Asignar resultados al carrito
      // finalTotal del engine es solo bases descontadas; sumamos los addons para el total real
      cart.totalOriginalPoints = grossTotal;
      cart.totalPoints = discountResult.finalTotal + grossAddonsTotal;
      cart.totalDiscount = discountResult.totalDiscount;
      cart.appliedGlobalRules = discountResult.appliedGlobalRules;
    } else {
      // Fallback si no hay factoryId (no se aplican reglas)
      cart.totalOriginalPoints = grossTotal;
      cart.totalPoints = grossTotal;
      cart.totalDiscount = 0;
      cart.appliedGlobalRules = [];
    }

    // Marcamos items como modificados por si hubo cambios en los cores de los items
    cart.markModified("items");
  }

  private calculateTotal(cart: CartDocument) {
    // Método antiguo, ahora usamos recalculateCartTotals
    this.recalculateCartTotals(cart);
  }

  /**
   * Inicia el proceso de checkout agregando un trabajo a la cola de BullMQ
   */
  async checkout(userId: string, orderName: string): Promise<any> {
    const cart = await this.cartModel.findOne({ userId, status: "ACTIVE" }).exec();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("El carrito está vacío o no existe.");
    }

    const job = await this.cartQueue.add("process-checkout", {
      userId,
      cartId: cart._id,
      orderName,
    });

    return {
      message: "Proceso de creación de orden iniciado asíncronamente.",
      jobId: job.id,
      status: "processing",
    };
  }
}
