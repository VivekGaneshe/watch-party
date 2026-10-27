import { useEffect, useMemo, useRef } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../socket/events";

// Every event the server can send us
const SERVER_EVENTS = [
  EVENTS.ROOM_JOINED,
  EVENTS.SYNC_STATE,
  EVENTS.USER_JOINED,
  EVENTS.USER_LEFT,
  EVENTS.ROLE_ASSIGNED,
  EVENTS.PARTICIPANT_REMOVED,
  EVENTS.REMOVED,
  EVENTS.HOST_TRANSFERRED,
  EVENTS.REQUEST_SENT,
  EVENTS.REQUEST_CREATED,
  EVENTS.REQUEST_RESOLVED,
  EVENTS.PENDING_REQUESTS,
  EVENTS.ERROR,
];

export function useRoomSocket(dispatch) {
  // { roomId, username } of the room we want to be in (used to re-join after reconnect)
  const creds = useRef(null);

  // ---------- Listen to the server ----------
  useEffect(() => {
    const onConnect = () => {
      dispatch({ type: "CONNECTION", payload: true });
      // First connect OR reconnect: (re)join the room
      if (creds.current) socket.emit(EVENTS.JOIN_ROOM, creds.current);
    };
    const onDisconnect = () => dispatch({ type: "CONNECTION", payload: false });
    const onConnectError = () =>
      dispatch({ type: "NOTICE", payload: { kind: "error", text: "Cannot reach the server" } });

    // Kicked by the host: stop auto re-joining
    const onRemoved = () => {
      creds.current = null;
      socket.disconnect();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on(EVENTS.REMOVED, onRemoved);

    // One generic listener per server event -> reducer
    const handlers = SERVER_EVENTS.map((event) => {
      const handler = (payload) => dispatch({ type: event, payload });
      socket.on(event, handler);
      return [event, handler];
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off(EVENTS.REMOVED, onRemoved);
      handlers.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [dispatch]);

  // ---------- Actions the UI can call ----------
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
        dispatch({ type: "JOINING" });
        if (socket.connected) socket.emit(EVENTS.JOIN_ROOM, next);
        else socket.connect(); // the "connect" listener sends join_room
      },

      leaveRoom() {
        socket.emit(EVENTS.LEAVE_ROOM);
        creds.current = null;
        socket.disconnect();
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
    };
  }, [dispatch]);
}