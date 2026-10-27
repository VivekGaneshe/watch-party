
export const EVENTS = Object.freeze({
  // Client -> Server
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  PLAY: "play",
  PAUSE: "pause",
  SEEK: "seek",
  CHANGE_VIDEO: "change_video",

  // Server -> Client
  ROOM_JOINED: "room_joined",
  SYNC_STATE: "sync_state",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  ERROR: "error_message",
});
