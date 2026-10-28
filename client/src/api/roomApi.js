import axios from "axios";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
export function wakeServer() {
  fetch(`${SERVER_URL}/health`).catch(() => {});
}

const api = axios.create({ baseURL: `${SERVER_URL}/api/rooms` });

export async function createRoom() {
  const { data } = await api.post("/");
  return data.roomId;
}

export async function checkRoom(roomId) {
  const { data } = await api.get(`/${encodeURIComponent(roomId)}`);
  return data.exists;
}