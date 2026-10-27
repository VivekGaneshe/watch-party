import { Server } from "socket.io";
import { env } from "../config/env.js";

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", (reason) => {
      console.log("Client disconnected:", socket.id, reason);
    });
  });

  return io;
}