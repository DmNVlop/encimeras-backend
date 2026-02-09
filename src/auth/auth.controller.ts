import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { GetUser } from "./decorators/get-user.decorator";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: "Iniciar sesión de administrador" })
  @ApiResponse({ status: 200, description: "Login exitoso, devuelve el token JWT." })
  @ApiResponse({ status: 401, description: "Credenciales inválidas." })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async signIn(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException("Credenciales incorrectas");
    }
    return this.authService.login(user);
  }

  @ApiOperation({ summary: "Obtener el perfil del usuario autenticado" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "Perfil de usuario obtenido con éxito." })
  @ApiResponse({ status: 401, description: "No autorizado." })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@GetUser() user: any) {
    // Obtenemos el perfil completo (fresco) desde el servicio
    return this.authService.getProfile(user.userId);
  }
}
