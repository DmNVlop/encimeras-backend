import { Module, Global } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";

@Global() // Hacemos el módulo Global para no tener que importarlo en cada submódulo
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
