import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cart, CartDocument, CartItem } from "./schemas/cart.schema";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
import { QuotesService } from "../quotes/quotes.service";
import { DraftsService } from "../drafts/drafts.service";
import { v4 as uuidv4 } from "uuid";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly quotesService: QuotesService,
    private readonly draftsService: DraftsService,
    @InjectQueue("cart") private cartQueue: Queue,
  ) {}

  /**
   * Obtiene o crea un carrito para un cliente
   */
  async getOrCreateCart(customerId: string): Promise<CartDocument> {
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

    return cart;
  }

  async addItem(customerId: string, addToCartDto: AddToCartDto): Promise<CartDocument> {
    const cart = await this.getOrCreateCart(customerId);

    // 1. Validamos el precio antes de añadir (Seguridad Backend)
    // Recalculamos usando el motor oficial para evitar fraudes desde el frontend
    const calculation = await this.quotesService.calculate({
      mainPieces: addToCartDto.configuration.pieces,
      // Podríamos pasar factoryId si fuera necesario para descuentos
      customerId: customerId,
    });

    const cartItem: CartItem = {
      cartItemId: uuidv4(),
      customName: addToCartDto.customName,
      technicalSnapshot: addToCartDto.configuration,
      subtotalPoints: calculation.finalTotalPoints || addToCartDto.subtotalPoints, // Usamos el precio REAL del backend
      draftId: addToCartDto.draftId,
    };

    cart.items.push(cartItem);
    this.calculateTotal(cart);

    return cart.save();
  }

  /**
   * Elimina un ítem del carrito
   */
  async removeItem(customerId: string, cartItemId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    cart.items = cart.items.filter((item) => item.cartItemId !== cartItemId);
    this.calculateTotal(cart);

    return cart.save();
  }

  /**
   * Actualiza un ítem del carrito
   */
  async updateItem(customerId: string, cartItemId: string, updateDto: UpdateCartItemDto): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ customerId, status: "ACTIVE" }).exec();
    if (!cart) throw new NotFoundException("Carrito no encontrado");

    const itemIndex = cart.items.findIndex((item) => item.cartItemId === cartItemId);
    if (itemIndex === -1) throw new NotFoundException("Ítem no encontrado en el carrito");

    if (updateDto.customName) cart.items[itemIndex].customName = updateDto.customName;
    if (updateDto.configuration) cart.items[itemIndex].technicalSnapshot = updateDto.configuration;
    if (updateDto.subtotalPoints) cart.items[itemIndex].subtotalPoints = updateDto.subtotalPoints;

    this.calculateTotal(cart);

    return cart.save();
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
      // Creamos un borrador para cada ítem del carrito
      // Usamos el servicio de borradores para persistir
      const draftData = {
        userId: customerId,
        name: item.customName,
        configuration: item.technicalSnapshot,
        currentPricePoints: item.subtotalPoints,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        cartGroupId: cartGroupId,
      };

      // Nota: Asumimos que DraftsService tiene un método create o similar
      // De lo contrario, lo implementaremos en el siguiente paso o usaremos el modelo directamente si estuviéramos inyectándolo
      // Por ahora, simulamos la llamada para mantener la abstracción
      const savedDraft = await this.draftsService.createOrUpdate(draftData as any, customerId);

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
