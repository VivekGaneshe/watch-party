
/*
  Roles define karte hain
*/
export const ROLES = Object.freeze({
  HOST: "host",
  MODERATOR: "moderator",
  PARTICIPANT: "participant",
});

/*
  Actions define karte hain
*/
export const ACTIONS = Object.freeze({
  PLAY: "play",
  PAUSE: "pause",
  SEEK: "seek",
  CHANGE_VIDEO: "change_video",
  APPROVE_REQUEST: "approve_request",
  REQUEST_CHANGE: "request_change",
  CHAT: "chat",
  ASSIGN_ROLE: "assign_role",
  REMOVE_PARTICIPANT: "remove_participant",
  TRANSFER_HOST: "transfer_host",
});

/*
  Har action ke allowed roles
*/
const PERMISSIONS = {
  [ACTIONS.PLAY]: [ROLES.HOST, ROLES.MODERATOR],
  [ACTIONS.PAUSE]: [ROLES.HOST, ROLES.MODERATOR],
  [ACTIONS.SEEK]: [ROLES.HOST, ROLES.MODERATOR],
  [ACTIONS.CHANGE_VIDEO]: [ROLES.HOST, ROLES.MODERATOR],
  [ACTIONS.APPROVE_REQUEST]: [ROLES.HOST, ROLES.MODERATOR],

  [ACTIONS.REQUEST_CHANGE]: [ROLES.PARTICIPANT],

  [ACTIONS.CHAT]: [
    ROLES.HOST,
    ROLES.MODERATOR,
    ROLES.PARTICIPANT,
  ],

  [ACTIONS.ASSIGN_ROLE]: [ROLES.HOST],
  [ACTIONS.REMOVE_PARTICIPANT]: [ROLES.HOST],
  [ACTIONS.TRANSFER_HOST]: [ROLES.HOST],
};

/*
  Host kin roles ko assign kar sakta hai?
*/
export const ASSIGNABLE_ROLES = Object.freeze([
  ROLES.MODERATOR,
  ROLES.PARTICIPANT,
]);

/*
  Permission check
*/
export function can(role, action) {
  const allowedRoles = PERMISSIONS[action];

  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role);
}

/*
  Role assign karna allowed hai ya nahi?
*/
export function isAssignableRole(role) {
  return ASSIGNABLE_ROLES.includes(role);
}
