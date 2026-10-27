
import { Room } from "./Room.js";

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId, hostUserId) {
    if (this.rooms.has(roomId)) {
      throw new Error("Room already exists");
    }

    const room = new Room(roomId, hostUserId);
    this.rooms.set(roomId, room);

    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  deleteRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  findRoomBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.getParticipantBySocketId(socketId)) return room;
    }

    return null;
  }

  count() {
    return this.rooms.size;
  }
}

export const roomManager = new RoomManager();
