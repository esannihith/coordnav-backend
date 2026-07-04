import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rootRouter } from "@/routes/index.js";
import { errorHandler } from "@/middlewares/error.middleware.js";

const app = express();

// One proxy hop (Caddy) in front of us in production; needed so req.ip and
// the rate limiters see the client IP, not the proxy's.
app.set("trust proxy", 1);

app.use(helmet());
// CORS stays permissive: the only client is a native Android app, which sends
// no Origin header — browser-style origin restrictions don't apply here.
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// API Routes
app.use("/api/v1", rootRouter);

// Global Error Handler
app.use(errorHandler);

export { app };
