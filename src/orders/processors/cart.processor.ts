import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { OrdersService } from "../orders.service";
import { Injectable, Logger } from "@nestjs/common";
import { EventsGateway } from "../../events/events.gateway";

@Injectable()
@Processor("cart")
export class CartProcessor extends WorkerHost {
  private readonly logger = new Logger(CartProcessor.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Procesando checkout para el cliente: ${job.data.customerId}`);

    try {
      // Llamamos al servicio de órdenes para consolidar el carrito
      const order = await this.ordersService.createFromCart(job.data.customerId);

      this.logger.log(`Orden ${order.header.orderNumber} creada con éxito desde la cola.`);

      return {
        orderId: (order as any)._id,
        orderNumber: order.header.orderNumber,
      };
    } catch (error) {
      this.logger.error(`Error al procesar el checkout: ${error.message}`);

      this.eventsGateway.notifyOrderFailure({
        jobId: job.id || "unknown",
        customerId: job.data.customerId,
        message: error.message,
      });

      throw error; // Re-lanzar para que BullMQ lo marque como fallido
    }
  }
}
