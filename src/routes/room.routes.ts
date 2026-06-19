import express from "express";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  currentRoom,
} from "@/controllers/room.controller.js";

const router = express.Router();

router.post("/", createRoom);
router.post("/join", joinRoom);
router.post("/leave", leaveRoom);
router.get("/", currentRoom);

export { router as roomRoutes };
