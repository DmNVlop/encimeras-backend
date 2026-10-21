import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Como JwtAuthGuard, pero nunca rechaza: con token válido rellena req.user;
 * sin token (o inválido) deja req.user = null y la petición sigue (endpoints públicos que quieren saber quién llama).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
