import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req } from "@nestjs/common";
import { CartService } from "./cart.service";
import { AddToCartDto, UpdateCartItemDto } from "./dto/cart.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Cart")
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener el carrito actual del usuario" })
  async getCart(@Req() req) {
    // Usamos el ID del usuario del JWT
    return this.cartService.getOrCreateCart(req.user.userId);
  }

  @Post("items")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Añadir un ítem al carrito" })
  async addItem(@Req() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addItem(req.user.userId, addToCartDto);
  }

  @Put("items/:cartItemId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar un ítem del carrito" })
  async updateItem(@Req() req, @Param("cartItemId") cartItemId: string, @Body() updateDto: UpdateCartItemDto) {
    return this.cartService.updateItem(req.user.userId, cartItemId, updateDto);
  }

  @Delete("items/:cartItemId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar un ítem del carrito" })
  async removeItem(@Req() req, @Param("cartItemId") cartItemId: string) {
    return this.cartService.removeItem(req.user.userId, cartItemId);
  }

  @Post("save-as-drafts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Guardar todo el contenido del carrito como borradores agrupados" })
  async saveAsDrafts(@Req() req) {
    return this.cartService.saveAsDraftGroup(req.user.userId);
  }

  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Iniciar el proceso de creación de orden desde el carrito (Asíncrono)" })
  async checkout(@Req() req) {
    return this.cartService.checkout(req.user.userId);
  }
}
