import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import { createAuthRouter } from "./authRoutes.js";
import { createEventRouter } from "./eventRoutes.js";
import { healthRouter } from "./healthRoutes.js";

export function createRouter(database: DatabaseSync) {
  const router = Router();

  router.use("/health", healthRouter);
  router.use("/auth", createAuthRouter(database));
  router.use("/events", createEventRouter(database));

  return router;
}
