import { Router } from "express";
import { healthRouter } from "./healthRoutes.js";

export const router = Router();

router.use("/health", healthRouter);
