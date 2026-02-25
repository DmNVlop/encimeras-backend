# Documentación Técnica: Sistema de Cola y Procesamiento Asíncrono (BullMQ + Redis)

## 1. Arquitectura del Sistema

Para garantizar la **Alta Disponibilidad (HA)** y evitar bloqueos en el hilo principal de Node.js durante procesos pesados (como la generación de órdenes con snapshots técnicos complejos), se ha implementado un sistema de colas basado en **BullMQ** y **Redis**.

### Componentes:

- **Productor (`CartService`)**: Recibe la solicitud de checkout y añade un "Job" a la cola de Redis.
- **Broker (`Redis`)**: Almacena de forma persistente y ordenada los trabajos pendientes.
- **Consumidor (`CartProcessor`)**: Un Worker que se ejecuta en segundo plano, procesa el trabajo y emite resultados.

## 2. Insumos Técnicos (DevOps)

Para el correcto funcionamiento en desarrollo, es imperativo tener una instancia de Redis activa.

### Docker Compose

Se ha incluido un archivo `docker-compose.yml` en la raíz:

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data # Persistencia de datos ante reinicios
```

### Variables de Entorno (.env)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 3. Flujo de Ejecución Asíncrona

1. **Request**: El cliente llama a `POST /cart/checkout`.
2. **Ack (202)**: El servidor valida el carrito y responde inmediatamente con un `jobId`. No espera a que la orden se cree.
3. **Queue**: BullMQ coloca el trabajo en Redis.
4. **Processing**: El `CartProcessor` en `OrdersModule` toma el trabajo:
   - Recupera el carrito de MongoDB.
   - Genera la `Order` con todos sus `OrderLineItems`.
   - Limpia/Convierte el carrito original.
5. **Notification**: Al finalizar (éxito o error), se utiliza el sistema de WebSockets para notificar al cliente final.

## 4. Ventajas de esta Implementación

- **Resiliencia**: Si el servidor se cae durante el procesamiento, Redis mantiene el trabajo y el Worker lo retomará al reiniciar.
- **Escalabilidad**: Podríamos levantar múltiples instancias del backend y los Workers se repartirían la carga de forma automática.
- **UX Fluida**: El usuario no experimenta _timeouts_ ni pantallas congeladas.
