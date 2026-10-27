export const EVENTS = Object.freeze({
  // Client -> Server
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  PLAY: "play",
  PAUSE: "pause",
  SEEK: "seek",
  CHANGE_VIDEO: "change_video",
  ASSIGN_ROLE: "assign_role",
  REMOVE_PARTICIPANT: "remove_participant",
  TRANSFER_HOST: "transfer_host",

  // Server -> Client
  ROOM_JOINED: "room_joined", // only to the person who joined
  SYNC_STATE: "sync_state",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  ROLE_ASSIGNED: "role_assigned",
  PARTICIPANT_REMOVED: "participant_removed",
  REMOVED: "removed", // only to the kicked user
  HOST_TRANSFERRED: "host_transferred",
  ERROR: "error_message",
});