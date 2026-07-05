import express from "express";
import { getDirections } from "@/controllers/directions.controller.js";

const router = express.Router();

router.get("/", getDirections);

export { router as directionsRoutes };
