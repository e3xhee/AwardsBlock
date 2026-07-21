import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { DatabaseSync } from "node:sqlite";
import { createRouter } from "./routes/index.js";

export type CreateAppOptions = {
  database: DatabaseSync;
};

export function createApp({ database }: CreateAppOptions) {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(createRouter(database));

  return app;
}
