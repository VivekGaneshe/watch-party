import { useRoom } from "../context/RoomContext";
import { formatTime } from "../utils/time";

function describe(r) {
  switch (r.type) {
    case "play":
      return "play the video";
    case "pause":
      return "pause the video";
    case "seek":
      return `jump to ${formatTime(r.payload?.time)}`;
    case "change_video":
      return `change the video (${r.payload?.videoId})`;
    default:
      return r.type;
  }
}

export default function RequestPanel() {
  const { canApprove, requests, myRequests, approveRequest, rejectRequest } = useRoom();

  // Host / Moderator: the approval queue
  if (canApprove) {
    return (
      <section className="panel">
        <h3 className="panel-title">Requests ({requests.length})</h3>
        {requests.length === 0 && <p className="muted small">No requests right now.</p>}

        <ul className="plist">
          {requests.map((r) => (
            <li key={r.requestId} className="pitem">
              <span>
                <b>{r.username}</b> wants to {describe(r)}
              </span>
              <div className="pactions">
                <button className="btn btn-small btn-primary" onClick={() => approveRequest(r.requestId)}>
                  Approve
                </button>
                <button className="btn btn-small" onClick={() => rejectRequest(r.requestId)}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Participant: what I asked for and am waiting on
  return (
    <section className="panel">
      <h3 className="panel-title">My requests ({myRequests.length})</h3>
      {myRequests.length === 0 && (
        <p className="muted small">Your requests will appear here until approved or rejected.</p>
      )}
      <ul className="plist">
        {myRequests.map((r) => (
          <li key={r.requestId} className="pitem">
            <span>Waiting: {describe(r)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}