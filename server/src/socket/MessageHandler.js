import { randomUUID } from "crypto";
import { EVENTS } from "./events.js";
import { roomManager } from "../classes/RoomManager.js";
import { can, ACTIONS, ROLES } from "../permissions/roles.js";
import { RoomModel } from "../models/Room.model.js";

const VIDEO_ID_REGEX = /^[\w-]{11}$/; // YouTube IDs are 11 chars

export class MessageHandler {
  constructor(io) {
    this.io = io;
  }

  // Called once for every new socket connection
  register(socket) {
  socket.data.roomId = null;
  socket.data.userId = null;

  socket.on(EVENTS.JOIN_ROOM, (data) =>
    this.run(socket, () => this.onJoinRoom(socket, data))
  );

  socket.on(EVENTS.LEAVE_ROOM, () =>
    this.run(socket, () => this.leaveCurrentRoom(socket))
  );

  socket.on(EVENTS.PLAY, () =>
    this.run(socket, () => this.onPlay(socket))
  );

  socket.on(EVENTS.PAUSE, () =>
    this.run(socket, () => this.onPause(socket))
  );

  socket.on(EVENTS.SEEK, (data) =>
    this.run(socket, () => this.onSeek(socket, data))
  );

  socket.on(EVENTS.CHANGE_VIDEO, (data) =>
    this.run(socket, () => this.onChangeVideo(socket, data))
  );

  socket.on(EVENTS.ASSIGN_ROLE, (data) =>
    this.run(socket, () => this.onAssignRole(socket, data))
  );

  socket.on(EVENTS.REMOVE_PARTICIPANT, (data) =>
    this.run(socket, () => this.onRemoveParticipant(socket, data))
  );

  socket.on(EVENTS.TRANSFER_HOST, (data) =>
    this.run(socket, () => this.onTransferHost(socket, data))
  );

  socket.on("disconnect", () =>
    this.run(socket, () => this.leaveCurrentRoom(socket))
  );
}

  // ---------- Helpers ----------

  // Wraps every handler so one bad message can never crash the server
  run(socket, fn) {
    Promise.resolve()
      .then(fn)
      .catch((err) => {
        console.error("Handler error:", err);
        this.sendError(socket, "Something went wrong");
      });
  }

  sendError(socket, message) {
    socket.emit(EVENTS.ERROR, { message });
  }

  // THE permission gate: finds the sender's room + role, checks can()
  authorize(socket, action) {
    const room = roomManager.getRoom(socket.data.roomId);
    const participant = room?.getParticipant(socket.data.userId);

    if (!participant) {
      this.sendError(socket, "You are not in a room");
      return null;
    }
    if (!can(participant.role, action)) {
      this.sendError(socket, `Your role (${participant.role}) is not allowed to ${action.replace("_", " ")}`);
      return null;
    }
    return { room, participant };
  }

  broadcastSync(room, participant, action) {
    this.io.to(room.roomId).emit(EVENTS.SYNC_STATE, {
      ...room.getSyncState(),
      action, // "play" | "pause" | "seek" | "change_video"
      by: participant.username,
    });
  }

  // ---------- Join / Leave ----------

  async onJoinRoom(socket, data = {}) {
    const roomId = String(data.roomId || "").trim().toUpperCase();
    const username = String(data.username || "").trim().slice(0, 20);

    if (!roomId || !username) {
      return this.sendError(socket, "Room code and username are required");
    }

    // If this socket is already in a room, leave it first
    if (socket.data.roomId) this.leaveCurrentRoom(socket);

    // Get the room from memory, or restore it from MongoDB
    let room = roomManager.getRoom(roomId);
    if (!room) {
      const saved = await RoomModel.findOne({ roomId }).lean();
      if (!saved) return this.sendError(socket, "Room not found");

      // Check again: another user may have created it while we awaited the DB
      room = roomManager.getRoom(roomId);
      if (!room) {
        room = roomManager.createRoom(roomId, null);
        if (saved.lastVideoId) room.videoState.videoId = saved.lastVideoId;
      }
    }

    const userId = randomUUID();

    // First person into a host-less room becomes the Host
    if (!room.hostUserId) room.hostUserId = userId;

    const participant = room.addParticipant({ userId, username, socketId: socket.id });

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    // 1) Full state to the person who joined
    socket.emit(EVENTS.ROOM_JOINED, {
      roomId,
      you: participant.toJSON(),
      hostUserId: room.hostUserId,
      participants: room.getParticipantsList(),
      videoState: room.getSyncState(),
    });

    // 2) Notify everyone else
    socket.to(roomId).emit(EVENTS.USER_JOINED, {
      userId,
      username,
      role: participant.role,
      participants: room.getParticipantsList(),
    });
  }

  leaveCurrentRoom(socket) {
    const { roomId, userId } = socket.data;
    if (!roomId) return;

    socket.leave(roomId);
    socket.data.roomId = null;
    socket.data.userId = null;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const leaving = room.removeParticipant(userId);
    if (!leaving) return;

    // Room empty: free the memory (it stays saved in MongoDB)
    if (room.isEmpty()) {
      roomManager.deleteRoom(roomId);
      return;
    }

    // Host left: promote someone so the room is never host-less
    let newHost = null;
    if (leaving.role === ROLES.HOST) newHost = room.promoteNextHost();

    this.io.to(roomId).emit(EVENTS.USER_LEFT, {
      userId,
      username: leaving.username,
      participants: room.getParticipantsList(),
      newHostId: newHost ? newHost.userId : null,
    });
  }

  // ---------- Playback (Host / Moderator only) ----------

  onPlay(socket) {
    const ctx = this.authorize(socket, ACTIONS.PLAY);
    if (!ctx) return;
    ctx.room.play();
    this.broadcastSync(ctx.room, ctx.participant, "play");
  }

  onPause(socket) {
    const ctx = this.authorize(socket, ACTIONS.PAUSE);
    if (!ctx) return;
    ctx.room.pause();
    this.broadcastSync(ctx.room, ctx.participant, "pause");
  }

  onSeek(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.SEEK);
    if (!ctx) return;

    const time = Number(data.time);
    if (!Number.isFinite(time) || time < 0) {
      return this.sendError(socket, "Invalid seek time");
    }
    ctx.room.seek(time);
    this.broadcastSync(ctx.room, ctx.participant, "seek");
  }

  onChangeVideo(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.CHANGE_VIDEO);
    if (!ctx) return;

    const videoId = String(data.videoId || "").trim();
    if (!VIDEO_ID_REGEX.test(videoId)) {
      return this.sendError(socket, "Invalid YouTube video");
    }
    ctx.room.changeVideo(videoId);
    socket.on(EVENTS.ASSIGN_ROLE, (data) =>
  this.run(socket, () => this.onAssignRole(socket, data))
);

socket.on(EVENTS.REMOVE_PARTICIPANT, (data) =>
  this.run(socket, () => this.onRemoveParticipant(socket, data))
);

socket.on(EVENTS.TRANSFER_HOST, (data) =>
  this.run(socket, () => this.onTransferHost(socket, data))
);

    // Save so the room remembers its last video (fire and forget)
    RoomModel.updateOne({ roomId: ctx.room.roomId }, { lastVideoId: videoId }).catch((e) =>
      console.error("Failed to save video:", e.message)
    );

    this.broadcastSync(ctx.room, ctx.participant, "change_video");
  }
    // ---------- Host-only features ----------

  onAssignRole(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.ASSIGN_ROLE);
    if (!ctx) return;

    const targetId = String(data.userId || "");
    const newRole = String(data.role || "");

    if (targetId === ctx.participant.userId) {
      return this.sendError(socket, "You cannot change your own role");
    }

    let target;
    try {
      // Room validates: target exists, is not host, role is assignable
      target = ctx.room.assignRole(targetId, newRole);
    } catch (err) {
      return this.sendError(socket, err.message);
    }

    this.io.to(ctx.room.roomId).emit(EVENTS.ROLE_ASSIGNED, {
      userId: target.userId,
      username: target.username,
      role: target.role,
      participants: ctx.room.getParticipantsList(),
    });
  }

  onRemoveParticipant(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.REMOVE_PARTICIPANT);
    if (!ctx) return;

    const targetId = String(data.userId || "");

    if (targetId === ctx.participant.userId) {
      return this.sendError(socket, "You cannot remove yourself. Transfer host and leave instead");
    }

    const removed = ctx.room.removeParticipant(targetId);
    if (!removed) return this.sendError(socket, "Participant not found");

    // Find the removed user's socket, tell them, and kick them from the room
    const targetSocket = this.io.sockets.sockets.get(removed.socketId);
    if (targetSocket) {
      targetSocket.emit(EVENTS.REMOVED, { message: "You were removed from the room by the host" });
      targetSocket.leave(ctx.room.roomId);
      // Clear their state so a later "disconnect" does nothing
      targetSocket.data.roomId = null;
      targetSocket.data.userId = null;
    }

    // Everyone still in the room updates their list
    this.io.to(ctx.room.roomId).emit(EVENTS.PARTICIPANT_REMOVED, {
      userId: removed.userId,
      username: removed.username,
      participants: ctx.room.getParticipantsList(),
    });
  }

  onTransferHost(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.TRANSFER_HOST);
    if (!ctx) return;

    const targetId = String(data.userId || "");

    let result;
    try {
      result = ctx.room.transferHost(ctx.participant.userId, targetId);
    } catch (err) {
      return this.sendError(socket, err.message);
    }

    this.io.to(ctx.room.roomId).emit(EVENTS.HOST_TRANSFERRED, {
      oldHostId: result.oldHost.userId,
      newHostId: result.newHost.userId,
      newHostName: result.newHost.username,
      hostUserId: ctx.room.hostUserId,
      participants: ctx.room.getParticipantsList(),
    });
  }
}