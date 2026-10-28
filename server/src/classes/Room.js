
import { ROLES, isAssignableRole } from "../permissions/roles.js";
import { Participant } from "./Participant.js";
import { randomUUID } from "crypto";

const MAX_PENDING_PER_USER = 3;
const MAX_MESSAGES = 50; // chat history kept per room

export class Room {
  constructor(roomId, hostUserId) {
    this.roomId = roomId;
    this.hostUserId = hostUserId;
    this.participants = new Map();

    this.videoState = {
      videoId: "dQw4w9WgXcQ",
      playState: "paused",
      currentTime: 0,
      updatedAt: Date.now(),
    };

    this.requests = new Map();
    this.messages = []; // recent chat history
  }

  // ---------- Participants ----------

  addParticipant({ userId, username, socketId }) {
    const role =
      userId === this.hostUserId ? ROLES.HOST : ROLES.PARTICIPANT;

    const participant = new Participant({
      userId,
      username,
      socketId,
      role,
    });

    this.participants.set(userId, participant);
    return participant;
  }

  removeParticipant(userId) {
    const participant = this.participants.get(userId);
    if (!participant) return null;

    this.participants.delete(userId);
    return participant;
  }

  getParticipant(userId) {
    return this.participants.get(userId) || null;
  }

  getParticipantBySocketId(socketId) {
    for (const participant of this.participants.values()) {
      if (participant.socketId === socketId) return participant;
    }

    return null;
  }

  getParticipantsList() {
    return [...this.participants.values()].map((p) => p.toJSON());
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  // ---------- Roles ----------

  assignRole(userId, newRole) {
    const target = this.getParticipant(userId);

    if (!target) throw new Error("Participant not found");

    if (target.role === ROLES.HOST) {
      throw new Error("Cannot change the host's role");
    }

    if (!isAssignableRole(newRole)) {
      throw new Error("Invalid role");
    }

    target.role = newRole;
    return target;
  }

  transferHost(currentHostId, newHostId) {
    const current = this.getParticipant(currentHostId);
    const next = this.getParticipant(newHostId);

    if (!current || !next) {
      throw new Error("Participant not found");
    }

    if (currentHostId === newHostId) {
      throw new Error("You are already the host");
    }

    current.role = ROLES.MODERATOR;
    next.role = ROLES.HOST;
    this.hostUserId = newHostId;

    return { oldHost: current, newHost: next };
  }

  // ---------- Change requests (approval flow) ----------

  addRequest(participant, type, payload = {}) {
    const pending = [...this.requests.values()].filter(
      (r) => r.userId === participant.userId
    ).length;

    if (pending >= MAX_PENDING_PER_USER) {
      throw new Error(
        "You have too many pending requests. Wait for the host to respond"
      );
    }

    const request = {
      requestId: randomUUID(),
      userId: participant.userId,
      username: participant.username,
      type,
      payload,
      createdAt: Date.now(),
    };

    this.requests.set(request.requestId, request);
    return request;
  }

  // Removes and returns the request, or null if it doesn't exist.
  removeRequest(requestId) {
    const request = this.requests.get(requestId);
    if (!request) return null;

    this.requests.delete(requestId);
    return request;
  }

  removeRequestsByUser(userId) {
    const removed = [];

    for (const request of this.requests.values()) {
      if (request.userId === userId) removed.push(request);
    }

    removed.forEach((r) => this.requests.delete(r.requestId));
    return removed;
  }

  getPendingRequests() {
    return [...this.requests.values()];
  }

  promoteNextHost() {
    if (this.isEmpty()) return null;

    const all = [...this.participants.values()];
    const next =
      all.find((p) => p.role === ROLES.MODERATOR) || all[0];

    next.role = ROLES.HOST;
    this.hostUserId = next.userId;

    return next;
  }

  // ---------- Video state ----------

  play() {
    this.videoState.currentTime = this.getCurrentTime();
    this.videoState.playState = "playing";
    this.videoState.updatedAt = Date.now();
  }

  pause() {
    this.videoState.currentTime = this.getCurrentTime();
    this.videoState.playState = "paused";
    this.videoState.updatedAt = Date.now();
  }

  seek(time) {
    this.videoState.currentTime = Math.max(0, Number(time) || 0);
    this.videoState.updatedAt = Date.now();
  }

  changeVideo(videoId) {
    this.videoState = {
      videoId,
      playState: "paused",
      currentTime: 0,
      updatedAt: Date.now(),
    };
  }

  getCurrentTime() {
    const { playState, currentTime, updatedAt } = this.videoState;

    if (playState !== "playing") return currentTime;

    return currentTime + (Date.now() - updatedAt) / 1000;
  }

  getSyncState() {
    return {
      videoId: this.videoState.videoId,
      playState: this.videoState.playState,
      currentTime: this.getCurrentTime(),
      serverTime: Date.now(),
    };
  }

  // ---------- Chat ----------

  addMessage(participant, text) {
    const message = {
      id: randomUUID(),
      userId: participant.userId,
      username: participant.username,
      role: participant.role,
      text,
      createdAt: Date.now(),
    };

    this.messages.push(message);

    if (this.messages.length > MAX_MESSAGES) {
      this.messages.shift(); // drop the oldest
    }

    return message;
  }

  getMessages() {
    return [...this.messages];
  }

  // ---------- Serialization ----------

  toJSON() {
    return {
      roomId: this.roomId,
      hostUserId: this.hostUserId,
      participants: this.getParticipantsList(),
      videoState: this.getSyncState(),
    };
  }
}
