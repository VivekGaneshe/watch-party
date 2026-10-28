import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import JoinGate from "../components/JoinGate";
import VideoPlayer from "../components/VideoPlayer";
import ChangeVideoForm from "../components/ChangeVideoForm";
import ParticipantList from "../components/ParticipantList";
import RequestPanel from "../components/RequestPanel";
import RoleBadge from "../components/RoleBadge";
import InviteButton from "../components/InviteButton";
import ReactionBar from "../components/ReactionBar";
import Chat from "../components/Chat";

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

  // Opened a room link directly (or refreshed), or the link is for a different room
  if (room.status === "idle" || (room.status === "joined" && room.roomId !== code)) {
    return <JoinGate roomId={code} />;
  }

  if (room.status === "joining") {
    return (
      <div className="page">
        <p className="muted">Joining room {code}...</p>
      </div>
    );
  }

  function handleLeave() {
    room.leaveRoom();
    navigate("/");
  }

  return (
    <div className="room">
      <header className="room-header">
        <div className="room-title">
          <h1>Watch Party</h1>
          <span className="code">{room.roomId}</span>
          <RoleBadge role={room.role} />
        </div>
        <div className="row">
          <InviteButton roomId={room.roomId} />
          <button className="btn btn-small btn-ghost" onClick={handleLeave}>
            Leave
          </button>
        </div>
      </header>

      {!room.connected && <div className="reconnect">Connection lost. Reconnecting...</div>}

      <main className="room-body">
        <div className="room-main">
          <VideoPlayer />
          <ReactionBar />
          <ChangeVideoForm />
        </div>

        <aside className="room-side">
          <ParticipantList />
          <RequestPanel />
          <Chat />
        </aside>
      </main>
    </div>
  );
}