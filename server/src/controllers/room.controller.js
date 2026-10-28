
import { RoomModel } from "../models/Room.model.js";
import { roomManager } from "../classes/RoomManager.js";
import { generateRoomCode } from "../utils/generateRoomCode.js";

// POST /api/rooms
export async function createRoom(req, res) {
  try {
    for (let i = 0; i < 5; i++) {
      const roomId = generateRoomCode();
      const exists = await RoomModel.exists({ roomId });

      if (!exists) {
        await RoomModel.create({ roomId });
        return res.status(201).json({ roomId });
      }
    }

    return res.status(500).json({ message: "Could not generate a unique room code" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/rooms/:roomId
export async function checkRoom(req, res) {
  try {
    const roomId = String(req.params.roomId || "")
      .trim()
      .toUpperCase();

    const exists =
      roomManager.hasRoom(roomId) ||
      Boolean(await RoomModel.exists({ roomId }));

    return res.json({ exists });
  } catch (err) {

    return res.status(500).json({
      message: "Server error",
    });
  }
}
