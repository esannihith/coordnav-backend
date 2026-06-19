import express from "express";
import {
  googleSignIn,
  refresh,
  signout,
} from "@/controllers/auth.controller.js";

const router = express.Router();

router.post("/google-signin", googleSignIn);
router.post("/refresh", refresh);
router.post("/signout", signout);

export { router as authRoutes };
