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

  // Change request events: Client -> Server
  REQUEST_CHANGE: "request_change",
  APPROVE_REQUEST: "approve_request",
  REJECT_REQUEST: "reject_request",

  // Server -> Client
  ROOM_JOINED: "room_joined",
  SYNC_STATE: "sync_state",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  ROLE_ASSIGNED: "role_assigned",
  PARTICIPANT_REMOVED: "participant_removed",
  REMOVED: "removed",
  HOST_TRANSFERRED: "host_transferred",

  // Approval flow events: Server -> Client
  REQUEST_SENT: "request_sent",
  REQUEST_CREATED: "request_created",
  REQUEST_RESOLVED: "request_resolved",
  PENDING_REQUESTS: "pending_requests",

  ERROR: "error_message",
});