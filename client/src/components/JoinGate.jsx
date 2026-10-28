import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkRoom } from "../api/roomApi";
import { useRoom } from "../context/RoomContext";
import { getSavedName, saveName } from "../utils/storage";

export default function JoinGate({ roomId }) {
  const navigate = useNavigate();
  const { joinRoom, status } = useRoom();
  const [username, setUsername] = useState(getSavedName);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const busy = checking || status === "joining";

  async function handleSubmit(e) {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 2) return setError("Enter a name (at least 2 characters)");

    setError("");
    setChecking(true);
    try {
      const exists = await checkRoom(roomId);
      if (!exists) {
        setError("This room does not exist. Check the link or code.");
        return;
      }
      saveName(name);
      joinRoom(roomId, name);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h1 className="title">Join watch party</h1>
        <p className="muted">
          Room code: <span className="code">{roomId}</span>
        </p>

        <label className="label" htmlFor="gate-name">Your name</label>
        <input
          id="gate-name"
          className="input"
          placeholder="e.g. Asha"
          value={username}
          maxLength={20}
          autoFocus
          onChange={(e) => setUsername(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Joining..." : "Join room"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => navigate("/")}>
          Back to home
        </button>
      </form>
    </div>
  );
}