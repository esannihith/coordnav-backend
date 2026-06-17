import http from "http";
import { app } from "./app.js";
import { connectDB } from "./lib/db.js";
import { env } from "./config/env.js";

const PORT = env.PORT;

const startServer = async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
    server.on("error", (err) => {
      console.error("Server failed to start:", err);
    });
  } catch (err) {
    console.error(`Failed to start application: ${err}`);
    process.exit(1);
  }
};

startServer();
