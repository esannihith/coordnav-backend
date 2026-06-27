import express from "express";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  currentRoom,
  updateDestination,
} from "@/controllers/room.controller.js";
import { getMessages } from "@/controllers/chat.controller.js";

const router = express.Router();

router.post("/", createRoom);
router.post("/join", joinRoom);
router.post("/leave", leaveRoom);
router.get("/", currentRoom);
router.patch("/destination", updateDestination);
router.get("/messages", getMessages);

export { router as roomRoutes };
