
import { ROLES } from "../permissions/roles.js";

export class Participant {
  constructor({ userId, username, socketId, role = ROLES.PARTICIPANT }) {
    this.userId = userId;
    this.username = username;
    this.socketId = socketId;
    this.role = role;
  }

  // Client ko safe participant data bhejna
  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
    };
  }
}
