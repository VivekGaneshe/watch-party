import express from "express";
import http from "http";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/index.js";

const app = express();

app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

// Health check (also useful for Render)
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Express and Socket.IO must share ONE http server
const httpServer = http.createServer(app);
initSocket(httpServer);

async function start() {
  await connectDB();
  httpServer.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

start();