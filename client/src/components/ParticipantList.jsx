import { useRoom } from "../context/RoomContext";
import RoleBadge from "./RoleBadge";

const ORDER = { host: 0, moderator: 1, participant: 2 };

export default function ParticipantList() {
  const { participants, myUserId, isHost, assignRole, removeParticipant, transferHost } = useRoom();

  const sorted = [...participants].sort(
    (a, b) =>
      (ORDER[a.role] ?? 3) - (ORDER[b.role] ?? 3) || a.username.localeCompare(b.username)
  );

  return (
    <section className="panel">
      <h3 className="panel-title">Participants ({participants.length})</h3>

      <ul className="plist">
        {sorted.map((p) => {
          const isMe = p.userId === myUserId;

          return (
            <li key={p.userId} className="pitem">
              <div className="pinfo">
                <span className="pname">
                  {p.username}
                  {isMe && <span className="muted"> (you)</span>}
                </span>
                <RoleBadge role={p.role} />
              </div>

              {/* Only the host sees these. The server checks again anyway. */}
              {isHost && !isMe && (
                <div className="pactions">
                  {p.role === "participant" ? (
                    <button className="btn btn-small" onClick={() => assignRole(p.userId, "moderator")}>
                      Make mod
                    </button>
                  ) : (
                    <button className="btn btn-small" onClick={() => assignRole(p.userId, "participant")}>
                      Remove mod
                    </button>
                  )}
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      if (window.confirm(`Make ${p.username} the host? You will become a moderator.`)) {
                        transferHost(p.userId);
                      }
                    }}
                  >
                    Make host
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      if (window.confirm(`Remove ${p.username} from the room?`)) {
                        removeParticipant(p.userId);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}