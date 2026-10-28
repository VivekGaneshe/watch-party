import { useState } from "react";
import { useRoom } from "../context/RoomContext";
import { formatTime } from "../utils/time";

const VERBS = {
  play: "played the video",
  pause: "paused the video",
  seek: "jumped to a new position",
  change_video: "changed the video",
};

export default function VideoControls({ current, duration }) {
  const { videoState, lastSync, canControl, play, pause, seek, requestChange, myRequests } = useRoom();

  // While the user drags the slider we show the dragged value, not the live time
  const [scrub, setScrub] = useState(null);

  const isPlaying = videoState?.playState === "playing";
  const shown = scrub ?? current;

  // Host/Mod act directly. Participants send a request for approval.
  function handleToggle() {
    const type = isPlaying ? "pause" : "play";
    if (canControl) (isPlaying ? pause : play)();
    else requestChange(type);
  }

  function commitSeek() {
    if (scrub === null) return;
    if (canControl) seek(scrub);
    else requestChange("seek", { time: scrub });
    setScrub(null); // the bar goes back to the real (server-controlled) time
  }

  const toggleLabel = canControl
    ? isPlaying ? "⏸ Pause" : "▶ Play"
    : isPlaying ? "Request pause" : "Request play";

  return (
    <div className="controls">
      <div className="controls-row">
        <button className="btn btn-primary" onClick={handleToggle}>
          {toggleLabel}
        </button>

        <span className="time">{formatTime(shown)}</span>
        <input
          className="seek"
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={Math.min(shown, Math.max(duration, 1))}
          disabled={!duration}
          onChange={(e) => setScrub(Number(e.target.value))}
          onPointerUp={commitSeek}
          onKeyUp={commitSeek}
          aria-label="Seek"
        />
        <span className="time">{formatTime(duration)}</span>
      </div>

      {!canControl && (
        <p className="muted small">
          You are a participant. Your actions are sent as requests and the host or a moderator must approve them.
          {myRequests.length > 0 && ` (${myRequests.length} waiting)`}
        </p>
      )}

      {lastSync?.action && (
        <p className="muted small">
          {lastSync.by} {VERBS[lastSync.action] || lastSync.action}
        </p>
      )}
    </div>
  );
}