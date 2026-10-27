import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "../context/RoomContext";

export default function Room() {
  const room = useRoom();
  const navigate = useNavigate();

  // Opened /room/CODE directly (no name yet) or got removed -> back home
  useEffect(() => {
    if (room.status === "idle" || room.status === "removed") navigate("/");
  }, [room.status, navigate]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Room {room.roomId} (temporary page)</h2>
      <p>Status: {room.status} | Connected: {String(room.connected)} | My role: {room.role}</p>

      {room.notice && (
        <p style={{ color: room.notice.kind === "error" ? "tomato" : "lightgreen" }}>
          {room.notice.text}
        </p>
      )}

      <button onClick={room.play}>Play</button>
      <button onClick={room.pause}>Pause</button>
      <button onClick={() => room.seek(30)}>Seek 30s</button>
      <button onClick={() => room.requestChange("play")}>Request play</button>
      <button onClick={() => { room.leaveRoom(); navigate("/"); }}>Leave</button>

      <h3>Pending requests (for Host/Mod)</h3>
      {room.requests.map((r) => (
        <div key={r.requestId}>
          {r.username} wants to {r.type}
          <button onClick={() => room.approveRequest(r.requestId)}>Approve</button>
          <button onClick={() => room.rejectRequest(r.requestId)}>Reject</button>
        </div>
      ))}

      <h3>State</h3>
      <pre>
        {JSON.stringify(
          { participants: room.participants, videoState: room.videoState, lastSync: room.lastSync },
          null,
          2
        )}
      </pre>
    </div>
  );
}