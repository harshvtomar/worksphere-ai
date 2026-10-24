import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const portText = process.env.PORT ?? "4000";
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!allowedOrigins.length || allowedOrigins.some((origin) => {
    try {
      const url = new URL(origin);
      return !["http:", "https:"].includes(url.protocol) || url.origin !== origin;
    } catch { return true; }
  })) throw new Error("CORS_ORIGINS must contain comma-separated HTTP(S) origins without paths");
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: false,
  });
  app.setGlobalPrefix("v1");
  await app.listen(port, "0.0.0.0");
  console.log(`WorkSphere API listening on http://localhost:${port}/v1/health`);
}

void bootstrap().catch((error: unknown) => {
  console.error("Failed to start WorkSphere API", error);
  process.exitCode = 1;
});
