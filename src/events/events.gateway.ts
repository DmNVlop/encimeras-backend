import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*", // ⚠️ En producción, cambia esto por la URL de tu admin (ej: https://admin.kuuk.com)
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Opcional: Log para debug
    // console.log(`Admin conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // console.log(`Admin desconectado: ${client.id}`);
  }

  /**
   * Emite una nueva orden a todos los clientes conectados.
   * Payload optimizado: Solo headers, no el snapshot técnico completo.
   */
  notifyNewOrder(orderHeader: any) {
    this.server.emit("orders:new", orderHeader);
  }

  /**
   * Notifica que una orden existente ha cambiado (ej. cambio de estado)
   */
  notifyOrderUpdate(orderHeaderWithId: any) {
    this.server.emit("orders:update", orderHeaderWithId);
  }
}
