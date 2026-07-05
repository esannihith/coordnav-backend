import express from "express";
import { authRoutes } from "./auth.route.js";
import { roomRoutes } from "./room.routes.js";
import { placesRoutes } from "./places.routes.js";
import { directionsRoutes } from "./directions.routes.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import {
  authLimiter,
  placesLimiter,
  directionsLimiter,
} from "@/middlewares/rate-limit.middleware.js";

const router = express.Router();

router.use("/auth", authLimiter, authRoutes);

router.use("/room", requireAuth, roomRoutes);

// Public by design (Google free tier; only room features need auth) —
// rate-limited so the billed Places key can't be farmed.
router.use("/places", placesLimiter, placesRoutes);

router.use("/directions", directionsLimiter, directionsRoutes);

export { router as rootRouter };
