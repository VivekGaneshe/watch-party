import { useState  ,useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, checkRoom } from "../api/roomApi";
import { useRoom } from "../context/RoomContext";
import { parseRoomCode } from "../utils/roomCode";
import { getSavedName, saveName } from "../utils/storage";
import {  wakeServer } from "../api/roomApi";

export default function Home() {
  const navigate = useNavigate();
  const room = useRoom();

  const [username, setUsername] = useState(getSavedName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(null); // null | "create" | "join"
  const [error, setError] = useState("");

   useEffect(() => {
    wakeServer();
  }, []);

  function getName() {
    const name = username.trim();
    if (name.length < 2) {
      setError("Enter a name (at least 2 characters)");
      return null;
    }
    
    return name;
  }

  async function handleCreate() {
    const name = getName();
    if (!name) return;

    setError("");
    setBusy("create");
    try {
      const roomId = await createRoom();
      saveName(name);
      room.joinRoom(roomId, name);
      navigate(`/room/${roomId}`);
    } catch {
      setError("Could not create the room. Is the server running?");
      setBusy(null);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const name = getName();
    if (!name) return;
    if (code.length !== 6) return setError("A room code has 6 characters");

    setError("");
    setBusy("join");
    try {
      if (!(await checkRoom(code))) {
        setError("Room not found. Check the code and try again.");
        setBusy(null);
        return;
      }
      saveName(name);
      room.joinRoom(code, name);
      navigate(`/room/${code}`);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Watch Party</h1>
        <p className="muted">Watch YouTube together, perfectly in sync.</p>

        {room.status === "joined" && (
          <div className="banner">
            <span>You are still in room <b>{room.roomId}</b></span>
            <div className="row">
              <button className="btn btn-small" onClick={() => navigate(`/room/${room.roomId}`)}>
                Return
              </button>
              <button className="btn btn-small btn-ghost" onClick={room.leaveRoom}>
                Leave
              </button>
            </div>
          </div>
        )}

        <label className="label" htmlFor="name">Your name</label>
        <input
          id="name"
          className="input"
          placeholder="e.g. Asha"
          value={username}
          maxLength={20}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          className="btn btn-primary"
          type="button"
          onClick={handleCreate}
          disabled={busy !== null}
        >
          {busy === "create" ? "Creating..." : "Create a new room"}
        </button>

        <div className="divider"><span>or join with a code</span></div>

        <form onSubmit={handleJoin}>
          <input
            className="input input-code"
            placeholder="ABC123 (or paste a room link)"
            value={code}
            onChange={(e) => setCode(parseRoomCode(e.target.value))}
          />
          <button className="btn" type="submit" disabled={busy !== null}>
            {busy === "join" ? "Checking..." : "Join room"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}