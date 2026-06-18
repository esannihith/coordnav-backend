import express from "express";
import cors from "cors";
import { rootRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' })
});

// API Routes
app.use("/api/v1", rootRouter);

// Global Error Handler
app.use(errorHandler);

export { app };
