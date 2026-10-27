import { Server } from "socket.io";
import { env } from "../config/env.js";
import { MessageHandler } from "./MessageHandler.js";

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  const handler = new MessageHandler(io);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    handler.register(socket);
    socket.on("disconnect", (reason) => {
      console.log("Client disconnected:", socket.id, reason);
    });
  });

  return io;
}