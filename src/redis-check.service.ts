import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisCheckService implements OnApplicationBootstrap {
  private readonly logger = new Logger("RedisBootstrap");

  async onApplicationBootstrap() {
    const redisUrl = process.env.REDIS_URL;
    const host = process.env.REDIS_HOST || "localhost";
    const port = parseInt(process.env.REDIS_PORT || "6379");
    const password = process.env.REDIS_PASSWORD || undefined;

    const redis = redisUrl
      ? new Redis(redisUrl, { retryStrategy: () => null })
      : new Redis({ host, port, password, retryStrategy: () => null });

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
