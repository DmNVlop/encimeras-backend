// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap"); // 2. Crea una instancia del Logger

  // 1. Configuración de CORS (Usando la lógica que discutimos antes)
  const whitelist = process.env.CORS_ORIGIN;
  let origin: boolean | string | RegExp | (string | RegExp)[] = "*";

  if (whitelist) {
    origin = whitelist.includes(",") ? whitelist.split(",").map((url) => url.trim()) : whitelist;
  }

  // Configuración de CORS para permitir peticiones desde el frontend
  app.enableCors({
    origin: origin,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle("API de Presupuestos de Encimeras")
    .setDescription("Documentación de la API para la aplicación de presupuestos.")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document); // La UI de Swagger estará en /api

  const port = process.env.PORT || 3000; // 3. Define el puerto
  await app.listen(port);

  // 4. Muestra el mensaje en la consola
  logger.log(`🚀 API corriendo en: ${await app.getUrl()}`);
  logger.log(`📄 Documentación de Swagger disponible en: ${await app.getUrl()}/api`);
}
bootstrap();
