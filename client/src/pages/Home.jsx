import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, checkRoom } from "../api/roomApi";
import { useRoom } from "../context/RoomContext";

export default function Home() {
  const navigate = useNavigate();
  const { joinRoom } = useRoom();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!username.trim()) return setError("Enter your name");
    try {
      const roomId = await createRoom();
      joinRoom(roomId, username.trim());
      navigate(`/room/${roomId}`);
    } catch {
      setError("Could not create the room");
    }
  }

  async function handleJoin() {
    if (!username.trim() || !code.trim()) return setError("Enter your name and a room code");
    try {
      const roomId = code.trim().toUpperCase();
      if (!(await checkRoom(roomId))) return setError("Room not found");
      joinRoom(roomId, username.trim());
      navigate(`/room/${roomId}`);
    } catch {
      setError("Could not reach the server");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 360 }}>
      <h2>Watch Party (temporary page)</h2>
      <input placeholder="Your name" value={username} onChange={(e) => setUsername(e.target.value)} />
      <button onClick={handleCreate}>Create room</button>
      <hr />
      <input placeholder="Room code" value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={handleJoin}>Join room</button>
      {error && <p style={{ color: "tomato" }}>{error}</p>}
    </div>
  );
}