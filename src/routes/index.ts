import express from "express";
import { authRoutes } from "./auth.route.js";
import { roomRoutes } from "./room.routes.js";
import { placesRoutes } from "./places.routes.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";

const router = express.Router();

router.use("/auth", authRoutes);

router.use("/room", requireAuth, roomRoutes);

router.use("/places", placesRoutes);

export { router as rootRouter };
