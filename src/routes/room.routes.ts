import express from 'express'
import { createRoom, joinRoom, leaveRoom, currentRoom } from '../controllers/room.controller.js';

const router = express.Router()

router.post('/create', createRoom);
router.post('/join', joinRoom);
router.post('/leave', leaveRoom);
router.get('/current', currentRoom);

export { router as roomRoutes };