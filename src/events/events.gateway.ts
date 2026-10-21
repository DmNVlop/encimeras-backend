import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { DataScopeService } from "../shared/scope/data-scope.service";

/**
 * Tiempo real de órdenes. Solo se aceptan conexiones con JWT válido (`handshake.auth.token`);
 * cada socket entra en las salas de su alcance (DataScopeService.roomsFor) y cada evento se
 * emite únicamente a las salas de quienes pueden ver esa orden.
 */
@WebSocketGateway({
  cors: {
    origin: "*", // ⚠️ En producción, cambia esto por la URL de tu admin (ej: https://admin.kuuk.com)
  },
})
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const payload = await this.jwtService.verifyAsync(client.handshake.auth?.token);
      const user = { userId: String(payload.sub), roles: payload.roles || [], factoryId: payload.factoryId || null };
      const scope = await this.dataScopeService.resolve(user);
      await client.join(this.dataScopeService.roomsFor(scope, user.userId));
    } catch {
      this.logger.warn(`Conexión WS rechazada (token ausente o inválido): ${client.id}`);
      client.disconnect(true);
    }
  }

  /**
   * Emite una nueva orden a quienes pueden verla.
   * Payload optimizado: Solo headers, no el snapshot técnico completo.
   */
  notifyNewOrder(orderHeader: any, rooms: string[]) {
    this.server.to(rooms).emit("orders:new", orderHeader);
  }

  /**
   * Notifica que una orden existente ha cambiado (ej. cambio de estado)
   */
  notifyOrderUpdate(orderHeaderWithId: any, rooms: string[]) {
    this.server.to(rooms).emit("orders:update", orderHeaderWithId);
  }

  /**
   * Notifica un fallo en el procesamiento asíncrono de una orden (solo al usuario afectado)
   */
  notifyOrderFailure(payload: { jobId: string; userId: string; message: string }) {
    this.server.to(`user:${payload.userId}`).emit("orders:fail", payload);
  }
}
