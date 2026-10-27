
import { randomUUID } from "crypto";
import { EVENTS } from "./events.js";
import { roomManager } from "../classes/RoomManager.js";
import { can, ACTIONS, ROLES } from "../permissions/roles.js";
import { RoomModel } from "../models/Room.model.js";

const VIDEO_ID_REGEX = /^[\w-]{11}$/;

export class MessageHandler {
  constructor(io) {
    this.io = io;
  }

  // ---------- Register socket events ----------

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

    // Approval flow events
    socket.on(EVENTS.REQUEST_CHANGE, (data) =>
      this.run(socket, () => this.onRequestChange(socket, data))
    );

    socket.on(EVENTS.APPROVE_REQUEST, (data) =>
      this.run(socket, () => this.onApproveRequest(socket, data))
    );

    socket.on(EVENTS.REJECT_REQUEST, (data) =>
      this.run(socket, () => this.onRejectRequest(socket, data))
    );

    socket.on("disconnect", () =>
      this.run(socket, () => this.leaveCurrentRoom(socket))
    );
  }

  // ---------- Helpers ----------

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

  authorize(socket, action) {
    const room = roomManager.getRoom(socket.data.roomId);
    const participant = room?.getParticipant(socket.data.userId);

    if (!participant) {
      this.sendError(socket, "You are not in a room");
      return null;
    }

    if (!can(participant.role, action)) {
      this.sendError(
        socket,
        `Your role (${participant.role}) is not allowed to ${action.replace("_", " ")}`
      );
      return null;
    }

    return { room, participant };
  }

  broadcastSync(room, participant, action) {
    this.io.to(room.roomId).emit(EVENTS.SYNC_STATE, {
      ...room.getSyncState(),
      action,
      by: participant.username,
    });
  }

  // Send requests only to Host/Moderators
  emitToApprovers(room, event, payload) {
    for (const p of room.participants.values()) {
      if (can(p.role, ACTIONS.APPROVE_REQUEST)) {
        this.io.to(p.socketId).emit(event, payload);
      }
    }
  }

  // Send the current queue to a newly joined/promoted approver
  sendPendingRequests(room, participant) {
    if (!can(participant.role, ACTIONS.APPROVE_REQUEST)) return;

    this.io.to(participant.socketId).emit(EVENTS.PENDING_REQUESTS, {
      requests: room.getPendingRequests(),
    });
  }

  cancelUserRequests(room, userId) {
    for (const request of room.removeRequestsByUser(userId)) {
      this.io.to(room.roomId).emit(EVENTS.REQUEST_RESOLVED, {
        requestId: request.requestId,
        status: "cancelled",
      });
    }
  }

  handlePromotion(room, participant) {
    this.cancelUserRequests(room, participant.userId);
    this.sendPendingRequests(room, participant);
  }

  applyChange(room, request) {
    switch (request.type) {
      case "play":
        room.play();
        break;

      case "pause":
        room.pause();
        break;

      case "seek":
        room.seek(request.payload.time);
        break;

      case "change_video":
        room.changeVideo(request.payload.videoId);

        RoomModel.updateOne(
          { roomId: room.roomId },
          { lastVideoId: request.payload.videoId }
        ).catch((e) =>
          console.error("Failed to save video:", e.message)
        );
        break;

      default:
        throw new Error("Invalid request type");
    }
  }

  // ---------- Join / Leave ----------

  async onJoinRoom(socket, data = {}) {
    const roomId = String(data.roomId || "").trim().toUpperCase();
    const username = String(data.username || "").trim().slice(0, 20);

    if (!roomId || !username) {
      return this.sendError(socket, "Room code and username are required");
    }

    if (socket.data.roomId) {
      this.leaveCurrentRoom(socket);
    }

    let room = roomManager.getRoom(roomId);

    if (!room) {
      const saved = await RoomModel.findOne({ roomId }).lean();

      if (!saved) {
        return this.sendError(socket, "Room not found");
      }

      room = roomManager.getRoom(roomId);

      if (!room) {
        room = roomManager.createRoom(roomId, null);

        if (saved.lastVideoId) {
          room.videoState.videoId = saved.lastVideoId;
        }
      }
    }

    const userId = randomUUID();

    if (!room.hostUserId) {
      room.hostUserId = userId;
    }

    const participant = room.addParticipant({
      userId,
      username,
      socketId: socket.id,
    });

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    socket.emit(EVENTS.ROOM_JOINED, {
      roomId,
      you: participant.toJSON(),
      hostUserId: room.hostUserId,
      participants: room.getParticipantsList(),
      videoState: room.getSyncState(),
    });

    socket.to(roomId).emit(EVENTS.USER_JOINED, {
      userId,
      username,
      role: participant.role,
      participants: room.getParticipantsList(),
    });

    // A Host/Moderator receives any existing pending requests
    this.sendPendingRequests(room, participant);
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

    // Cancel the requests created by the person leaving
    this.cancelUserRequests(room, userId);

    if (room.isEmpty()) {
      roomManager.deleteRoom(roomId);
      return;
    }

    let newHost = null;

    if (leaving.role === ROLES.HOST) {
      newHost = room.promoteNextHost();
    }

    this.io.to(roomId).emit(EVENTS.USER_LEFT, {
      userId,
      username: leaving.username,
      participants: room.getParticipantsList(),
      newHostId: newHost ? newHost.userId : null,
    });

    if (newHost) {
      this.handlePromotion(room, newHost);
    }
  }

  // ---------- Playback: Host / Moderator ----------

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

    RoomModel.updateOne(
      { roomId: ctx.room.roomId },
      { lastVideoId: videoId }
    ).catch((e) =>
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

    if (target.role === ROLES.MODERATOR) {
      this.handlePromotion(ctx.room, target);
    }
  }

  onRemoveParticipant(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.REMOVE_PARTICIPANT);
    if (!ctx) return;

    const targetId = String(data.userId || "");

    if (targetId === ctx.participant.userId) {
      return this.sendError(
        socket,
        "You cannot remove yourself. Transfer host and leave instead"
      );
    }

    const removed = ctx.room.removeParticipant(targetId);

    if (!removed) {
      return this.sendError(socket, "Participant not found");
    }

    this.cancelUserRequests(ctx.room, removed.userId);

    const targetSocket = this.io.sockets.sockets.get(removed.socketId);

    if (targetSocket) {
      targetSocket.emit(EVENTS.REMOVED, {
        message: "You were removed from the room by the host",
      });

      targetSocket.leave(ctx.room.roomId);
      targetSocket.data.roomId = null;
      targetSocket.data.userId = null;
    }

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

    this.handlePromotion(ctx.room, result.newHost);
  }

  // ---------- Approval flow ----------

  onRequestChange(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.REQUEST_CHANGE);
    if (!ctx) return;

    const type = String(data.type || "");
    let payload = {};

    switch (type) {
      case "play":
      case "pause":
        break;

      case "seek": {
        const time = Number(data.time);

        if (!Number.isFinite(time) || time < 0) {
          return this.sendError(socket, "Invalid seek time");
        }

        payload = { time };
        break;
      }

      case "change_video": {
        const videoId = String(data.videoId || "").trim();

        if (!VIDEO_ID_REGEX.test(videoId)) {
          return this.sendError(socket, "Invalid YouTube video");
        }

        payload = { videoId };
        break;
      }

      default:
        return this.sendError(socket, "Invalid request type");
    }

    let request;

    try {
      request = ctx.room.addRequest(ctx.participant, type, payload);
    } catch (err) {
      return this.sendError(socket, err.message);
    }

    socket.emit(EVENTS.REQUEST_SENT, {
      requestId: request.requestId,
      type: request.type,
      payload: request.payload,
    });

    this.emitToApprovers(ctx.room, EVENTS.REQUEST_CREATED, request);
  }

  onApproveRequest(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.APPROVE_REQUEST);
    if (!ctx) return;

    const request = ctx.room.removeRequest(
      String(data.requestId || "")
    );

    if (!request) {
      return this.sendError(
        socket,
        "Request not found or already handled"
      );
    }

    this.applyChange(ctx.room, request);

    this.io.to(ctx.room.roomId).emit(EVENTS.REQUEST_RESOLVED, {
      requestId: request.requestId,
      status: "approved",
      type: request.type,
      username: request.username,
      by: ctx.participant.username,
    });

    this.broadcastSync(ctx.room, ctx.participant, request.type);
  }

  onRejectRequest(socket, data = {}) {
    const ctx = this.authorize(socket, ACTIONS.APPROVE_REQUEST);
    if (!ctx) return;

    const request = ctx.room.removeRequest(
      String(data.requestId || "")
    );

    if (!request) {
      return this.sendError(
        socket,
        "Request not found or already handled"
      );
    }

    this.io.to(ctx.room.roomId).emit(EVENTS.REQUEST_RESOLVED, {
      requestId: request.requestId,
      status: "rejected",
      type: request.type,
      username: request.username,
      by: ctx.participant.username,
    });
  }
}
