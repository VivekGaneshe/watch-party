import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

// autoConnect: false -> we connect only when the user joins a room
export const socket = io(SERVER_URL, { autoConnect: false });