import { useEffect, useMemo, useRef } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../socket/events";

const SERVER_EVENTS = [
  EVENTS.ROOM_JOINED,
  EVENTS.SYNC_STATE,
  EVENTS.USER_JOINED,
  EVENTS.USER_LEFT,
  EVENTS.ROLE_ASSIGNED,
  EVENTS.PARTICIPANT_REMOVED,
  EVENTS.REMOVED,
  EVENTS.NEW_MESSAGE,
  EVENTS.REACTION,
  EVENTS.HOST_TRANSFERRED,
  EVENTS.REQUEST_SENT,
  EVENTS.REQUEST_CREATED,
  EVENTS.REQUEST_RESOLVED,
  EVENTS.PENDING_REQUESTS,
  // Added chat and reactions entries before EVENTS.ERROR
  EVENTS.CHAT_MESSAGE,
  EVENTS.SEND_REACTION,
  EVENTS.ERROR,
];

export function useRoomSocket(dispatch) {
  // { roomId, username } of the room we want to be in (used to re-join after reconnect)
  const creds = useRef(null);
  // true between "we asked to join" and "server confirmed"
  const joining = useRef(false);

  useEffect(() => {
    const failJoin = (text) => {
      joining.current = false;
      creds.current = null;
      socket.disconnect();
      dispatch({ type: "JOIN_FAILED", payload: text });
    };

    const onConnect = () => {
      dispatch({ type: "CONNECTION", payload: true });
      if (creds.current) {
        joining.current = true;
        socket.emit(EVENTS.JOIN_ROOM, creds.current);
      }
    };
    const onDisconnect = () => dispatch({ type: "CONNECTION", payload: false });

    const onConnectError = () => {
      if (joining.current) failJoin("Cannot reach the server");
      else dispatch({ type: "NOTICE", payload: { kind: "error", text: "Cannot reach the server" } });
    };

    const onRoomJoined = () => {
      joining.current = false;
    };

    // An error while joining (e.g. "Room not found") means the join failed
    const onError = (payload) => {
      if (joining.current) failJoin(payload?.message || "Could not join the room");
    };

    // Kicked by the host: stop auto re-joining
    const onRemoved = () => {
      joining.current = false;
      creds.current = null;
      socket.disconnect();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on(EVENTS.ROOM_JOINED, onRoomJoined);
    socket.on(EVENTS.ERROR, onError);
    socket.on(EVENTS.REMOVED, onRemoved);

    const handlers = SERVER_EVENTS.map((event) => {
      const handler = (payload) => dispatch({ type: event, payload });
      socket.on(event, handler);
      return [event, handler];
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off(EVENTS.ROOM_JOINED, onRoomJoined);
      socket.off(EVENTS.ERROR, onError);
      socket.off(EVENTS.REMOVED, onRemoved);
      handlers.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [dispatch]);

  return useMemo(() => {
    const emit = (event, data) => socket.emit(event, data);

    return {
      joinRoom(roomId, username) {
        const next = { roomId: roomId.toUpperCase(), username };
        // Already joining/joined this exact room: do nothing (avoids double join)
        if (
          creds.current &&
          creds.current.roomId === next.roomId &&
          creds.current.username === next.username
        ) {
          return;
        }
        creds.current = next;
        joining.current = true;
        dispatch({ type: "JOINING" });
        if (socket.connected) socket.emit(EVENTS.JOIN_ROOM, next);
        else socket.connect(); // the "connect" listener sends join_room
      },

      leaveRoom() {
        socket.emit(EVENTS.LEAVE_ROOM);
        joining.current = false;
        creds.current = null;
        socket.disconnect();
        dispatch({ type: "RESET" });
      },

      // Clear local state without talking to the server (used after being removed)
      reset() {
        joining.current = false;
        creds.current = null;
        dispatch({ type: "RESET" });
      },

      // Host / Moderator
      play: () => emit(EVENTS.PLAY),
      pause: () => emit(EVENTS.PAUSE),
      seek: (time) => emit(EVENTS.SEEK, { time }),
      changeVideo: (videoId) => emit(EVENTS.CHANGE_VIDEO, { videoId }),
      approveRequest: (requestId) => emit(EVENTS.APPROVE_REQUEST, { requestId }),
      rejectRequest: (requestId) => emit(EVENTS.REJECT_REQUEST, { requestId }),

      // Host only
      assignRole: (userId, role) => emit(EVENTS.ASSIGN_ROLE, { userId, role }),
      removeParticipant: (userId) => emit(EVENTS.REMOVE_PARTICIPANT, { userId }),
      transferHost: (userId) => emit(EVENTS.TRANSFER_HOST, { userId }),

      // Participant: ask for a change, e.g. requestChange("seek", { time: 30 })
      requestChange: (type, extra = {}) => emit(EVENTS.REQUEST_CHANGE, { type, ...extra }),

      // Chat and reactions (everyone)
      sendMessage: (text) => emit(EVENTS.CHAT_MESSAGE, { text }),
      sendReaction: (emoji) => emit(EVENTS.SEND_REACTION, { emoji }),
      removeReaction: (id) => dispatch({ type: "REMOVE_REACTION", payload: id }),
    };
  }, [dispatch]);
}