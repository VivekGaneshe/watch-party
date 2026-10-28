import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import JoinGate from "../components/JoinGate";

export default function Room() {
  const { roomId } = useParams();
  const room = useRoom();
  const navigate = useNavigate();
  const code = String(roomId || "").toUpperCase();

  // Kicked by the host
  if (room.status === "removed") {
    return (
      <div className="page">
        <div className="card">
          <h1 className="title">Removed from room</h1>
          <p className="muted">The host removed you from this room.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              room.reset();
              navigate("/");
            }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // Opened a room link directly (or refreshed): ask for a name first
  if (room.status === "idle") return <JoinGate roomId={code} />;

  if (room.status === "joining") {
    return (
      <div className="page">
        <p className="muted">Joining room {code}...</p>
      </div>
    );
  }

  // ---- status === "joined": temporary test UI (Step 10 replaces this) ----
  return (
    <div style={{ padding: 24 }}>
      <h2>Room {room.roomId} (temporary page)</h2>
      <p>
        Connected: {String(room.connected)} | My role: <b>{room.role}</b>
      </p>

      <button onClick={room.play}>Play</button>
      <button onClick={room.pause}>Pause</button>
      <button onClick={() => room.seek(30)}>Seek 30s</button>
      <button onClick={() => room.requestChange("play")}>Request play</button>
      <button
        onClick={() => {
          room.leaveRoom();
          navigate("/");
        }}
      >
        Leave
      </button>

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