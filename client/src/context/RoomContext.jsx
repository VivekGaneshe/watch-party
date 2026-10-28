import { createContext, useContext, useMemo, useReducer } from "react";
import { EVENTS } from "../socket/events";
import { socket } from "../socket/socket";
import { useRoomSocket } from "../hooks/useRoomSocket";

const initialState = {
  status: "idle", // idle | joining | joined | removed
  connected: socket.connected,
  roomId: null,
  myUserId: null,
  hostUserId: null,
  participants: [], // [{ userId, username, role }]
  videoState: null, // { videoId, playState, currentTime, serverTime }
  lastSync: null, // { action, by } of the latest sync_state
  requests: [], // pending requests (only filled for Host/Moderator)
  myRequests: [], // my own requests waiting for approval
  messages: [], // chat history
  reactions: [], // floating emojis currently on screen
  notice: null, // { id, kind, text } for toasts
};

const label = (type) => String(type || "").replace("_", " ");
const notice = (kind, text) => ({ id: Math.random(), kind, text });

function reducer(state, { type, payload }) {
  switch (type) {
    case "CONNECTION":
      return { ...state, connected: payload };

    case "JOINING":
      return { ...state, status: "joining" };

    case "RESET":
      return { ...initialState, connected: socket.connected };

    case "NOTICE":
      return { ...state, notice: notice(payload.kind, payload.text) };

    case "CLEAR_NOTICE":
      return { ...state, notice: null };

    case EVENTS.ROOM_JOINED:
      return {
        ...state,
        status: "joined",
        roomId: payload.roomId,
        myUserId: payload.you.userId,
        hostUserId: payload.hostUserId,
        participants: payload.participants,
        videoState: payload.videoState,
        lastSync: null,
        requests: [],
        myRequests: [],
        messages: payload.messages || [],
        reactions: [],
      };

    case EVENTS.SYNC_STATE:
      return {
        ...state,
        videoState: payload,
        lastSync: { action: payload.action, by: payload.by },
      };

    case EVENTS.USER_JOINED:
      return {
        ...state,
        participants: payload.participants,
        notice: notice("info", `${payload.username} joined`),
      };

    case EVENTS.USER_LEFT:
      return {
        ...state,
        participants: payload.participants,
        hostUserId: payload.newHostId || state.hostUserId,
        notice: notice("info", `${payload.username} left`),
      };

    case EVENTS.ROLE_ASSIGNED:
      return {
        ...state,
        participants: payload.participants,
        notice: notice("info", `${payload.username} is now ${payload.role}`),
      };

    case EVENTS.PARTICIPANT_REMOVED:
      return {
        ...state,
        participants: payload.participants,
        notice: notice("info", `${payload.username} was removed`),
      };

    case EVENTS.REMOVED:
      return {
        ...initialState,
        connected: state.connected,
        status: "removed",
        notice: notice("error", payload.message),
      };

    case EVENTS.HOST_TRANSFERRED:
      return {
        ...state,
        hostUserId: payload.hostUserId,
        participants: payload.participants,
        notice: notice("info", `${payload.newHostName} is now the host`),
      };

    case EVENTS.REQUEST_SENT:
      return { ...state, myRequests: [...state.myRequests, payload] };

    case EVENTS.REQUEST_CREATED:
      if (state.requests.some((r) => r.requestId === payload.requestId)) return state;
      return { ...state, requests: [...state.requests, payload] };

    case EVENTS.PENDING_REQUESTS:
      return { ...state, requests: payload.requests };

    case EVENTS.REQUEST_RESOLVED: {
      const next = {
        ...state,
        requests: state.requests.filter((r) => r.requestId !== payload.requestId),
        myRequests: state.myRequests.filter((r) => r.requestId !== payload.requestId),
      };
      if (payload.status === "approved") {
        next.notice = notice("success", `${payload.by} approved ${payload.username}'s ${label(payload.type)} request`);
      } else if (payload.status === "rejected") {
        next.notice = notice("error", `${payload.by} rejected ${payload.username}'s ${label(payload.type)} request`);
      }
      return next;
    }

    case EVENTS.NEW_MESSAGE:
      return { ...state, messages: [...state.messages, payload].slice(-100) };

    case EVENTS.REACTION:
      return { ...state, reactions: [...state.reactions, payload].slice(-30) };

    case "REMOVE_REACTION":
      return { ...state, reactions: state.reactions.filter((r) => r.id !== payload) };

    case EVENTS.ERROR:
      return { ...state, notice: notice("error", payload.message) };

    default:
      return state;
  }
}

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = useRoomSocket(dispatch);

  const value = useMemo(() => {
    const me = state.participants.find((p) => p.userId === state.myUserId) || null;
    const role = me ? me.role : null;
    return {
      ...state,
      ...actions,
      me,
      role,
      isHost: role === "host",
      // These only hide/disable buttons. The real security is on the server.
      canControl: role === "host" || role === "moderator",
      canApprove: role === "host" || role === "moderator",
      clearNotice: () => dispatch({ type: "CLEAR_NOTICE" }),
    };
  }, [state, actions]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}