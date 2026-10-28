import { useEffect } from "react";
import { useRoom } from "../context/RoomContext";

// Position the emoji horizontally from its id, so it is stable and needs no random()
function leftPercent(id) {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return 8 + (sum % 80);
}

function Floating({ reaction, onDone }) {
  // Remove it from state once the 3s animation has finished
  useEffect(() => {
    const timer = setTimeout(() => onDone(reaction.id), 3000);
    return () => clearTimeout(timer);
  }, [reaction.id, onDone]);

  return (
    <div className="reaction" style={{ left: `${leftPercent(reaction.id)}%` }}>
      <span className="reaction-emoji">{reaction.emoji}</span>
      <span className="reaction-name">{reaction.username}</span>
    </div>
  );
}

export default function ReactionLayer() {
  const { reactions, removeReaction } = useRoom();

  return (
    <div className="reaction-layer">
      {reactions.map((r) => (
        <Floating key={r.id} reaction={r} onDone={removeReaction} />
      ))}
    </div>
  );
}