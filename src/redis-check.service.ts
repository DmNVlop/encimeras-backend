import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisCheckService implements OnApplicationBootstrap {
  private readonly logger = new Logger("RedisBootstrap");

  async onApplicationBootstrap() {
    // Usamos la misma configuración que en app.module.ts
    const host = process.env.REDIS_HOST || "localhost";
    const port = parseInt(process.env.REDIS_PORT || "6379");

    const redis = new Redis({
      host,
      port,
      // Evitamos que intente reconectar indefinidamente si falla el ping inicial
      retryStrategy: () => null,
    });

    try {
      const ping = await redis.ping();
      if (ping === "PONG") {
        this.logger.log(`✅ Conexión establecida con Redis en ${host}:${port}`);
      }
      await redis.quit();
    } catch (error) {
      this.logger.error(`❌ No se pudo conectar a Redis en ${host}:${port}. Error: ${error.message}`);
    }
  }
}
