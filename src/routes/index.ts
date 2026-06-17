import express from "express";
import { authRoutes } from "./auth.route.js";
import { requireAuth } from "../middleware/auth.middleware.js";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/app-error.js";

const router = express.Router();

router.use("/auth", authRoutes);

export { router as rootRouter };
