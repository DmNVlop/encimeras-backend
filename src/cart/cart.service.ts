import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cart, CartDocument, CartItem } from "./schemas/cart.schema";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
import { QuotesService } from "../quotes/quotes.service";
import { DraftsService } from "../drafts/drafts.service";
import { MaterialsService } from "../materials/materials.service";
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
    @InjectQueue("cart") private cartQueue: Queue,
  ) {}

  /**
   * Obtiene o crea un carrito para un cliente
   * Implementa patrón BFF: Hidrata los ítems con datos maestros actualizados
   */
  async getOrCreateCart(customerId: string): Promise<any> {
    let cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();

    if (!cart) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

      cart = new this.cartModel({
        customerId,
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

  async addItem(customerId: string, addToCartDto: AddToCartDto): Promise<any> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!cart) await this.getOrCreateCart(customerId);

    // Necesitamos el cart de nuevo si lo acabamos de crear o para asegurar consistencia
    const activeCart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!activeCart) throw new BadRequestException("No se pudo crear o encontrar el carrito");

    // 1. Validamos el precio antes de añadir (Seguridad Backend)
    // Usamos exclusivamente el nodo 'core'
    const calculation = await this.quotesService.calculate({
      mainPieces: addToCartDto.core.mainPieces,
      customerId: customerId,
      factoryId: addToCartDto.core.factoryId,
    });

    const cartItem: any = {
      cartItemId: uuidv4(),
      customName: addToCartDto.customName,
      core: addToCartDto.core,
      uiState: addToCartDto.uiState,
      subtotalPoints: calculation.finalTotalPoints, // Siempre usamos el precio REAL del backend
      draftId: addToCartDto.draftId,
    };

    activeCart.items.push(cartItem);
    this.calculateTotal(activeCart as any);

    await activeCart.save();
    return this.getOrCreateCart(customerId); // Devolvemos hidratado
  }

  /**
   * Elimina un ítem del carrito
   */
  async removeItem(customerId: string, cartItemId: string): Promise<any> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    cart.items = cart.items.filter((item) => item.cartItemId !== cartItemId);
    this.calculateTotal(cart);

    await cart.save();
    return this.getOrCreateCart(customerId);
  }

  /**
   * Elimina múltiples ítems del carrito
   */
  async removeItems(customerId: string, cartItemIds: string[]): Promise<any> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    cart.items = cart.items.filter((item) => !cartItemIds.includes(item.cartItemId));
    this.calculateTotal(cart);

    await cart.save();
    return this.getOrCreateCart(customerId);
  }

  /**
   * Actualiza un ítem del carrito
   */
  async updateItem(customerId: string, cartItemId: string, updateDto: UpdateCartItemDto): Promise<any> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
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
        customerId: customerId,
        factoryId: cart.items[itemIndex].core.factoryId,
      });
      cart.items[itemIndex].subtotalPoints = calculation.finalTotalPoints;
    }

    if (updateDto.uiState) {
      cart.items[itemIndex].uiState = {
        ...cart.items[itemIndex].uiState,
        ...updateDto.uiState,
      };
    }

    this.calculateTotal(cart);

    await cart.save();
    return this.getOrCreateCart(customerId);
  }

  /**
   * Guarda el carrito completo como un grupo de borradores
   */
  async saveAsDraftGroup(customerId: string): Promise<any> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
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

      const savedDraft = await this.draftsService.createOrUpdate(draftData, customerId);

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
  async importByGroupId(customerId: string, groupId: string, clearFirst: boolean = false): Promise<any> {
    const drafts = await this.draftsService.findAllByGroupId(groupId, customerId);
    if (!drafts || drafts.length === 0) {
      throw new NotFoundException(`No se encontraron borradores para el grupo ${groupId}`);
    }

    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!cart) await this.getOrCreateCart(customerId);
    const activeCart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!activeCart) throw new BadRequestException("No se pudo crear o encontrar el carrito");

    if (clearFirst) {
      activeCart.items = [];
    }

    for (const draft of drafts) {
      const draftIdStr = (draft as any)._id.toString();

      // Evitamos duplicados si ya está en el carrito
      const alreadyInCart = activeCart.items.some((item) => item.draftId === draftIdStr);
      if (alreadyInCart) continue;

      const cartItem: any = {
        cartItemId: uuidv4(),
        customName: draft.name || "Borrador importado",
        core: draft.core,
        uiState: draft.uiState,
        subtotalPoints: draft.currentPricePoints,
        draftId: draftIdStr,
      };

      activeCart.items.push(cartItem);
    }

    this.calculateTotal(activeCart as any);
    await activeCart.save();
    return this.getOrCreateCart(customerId);
  }

  private calculateTotal(cart: CartDocument) {
    cart.totalPoints = cart.items.reduce((sum, item) => sum + item.subtotalPoints, 0);
  }

  /**
   * Inicia el proceso de checkout agregando un trabajo a la cola de BullMQ
   */
  async checkout(customerId: string): Promise<any> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("El carrito está vacío o no existe.");
    }

    // El carrito se queda bloqueado emocionalmente? No, simplemente lo procesamos.
    // En una implementación real, podríamos ponerle un status 'PROCESSING' para evitar ediciones.

    const job = await this.cartQueue.add("process-checkout", {
      customerId,
      cartId: cart._id,
    });

    return {
      message: "Proceso de creación de orden iniciado asíncronamente.",
      jobId: job.id,
      status: "processing",
    };
  }
}
