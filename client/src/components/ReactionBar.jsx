import { useRoom } from "../context/RoomContext";

// Must match ALLOWED_REACTIONS on the server
const EMOJIS = ["👍", "😂", "😮", "👏", "🔥", "🎉"];

export default function ReactionBar() {
  const { sendReaction } = useRoom();

  return (
    <div className="reaction-bar">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="btn reaction-btn"
          onClick={() => sendReaction(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}