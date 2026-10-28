import { useEffect, useRef, useState } from "react";
import { useRoom } from "../context/RoomContext";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import VideoControls from "./VideoControls";

const DRIFT_PLAYING = 1; // seconds of difference we tolerate while playing
const DRIFT_PAUSED = 0.4;
const AUTO_CORRECT = 2.5; // periodic check: jump back if we drift more than this

// Where should the video be right now?
// Uses OUR receive time, so the server and client clocks never need to match.
function livePosition(state, receivedAt) {
  if (state.playState !== "playing") return state.currentTime;
  return state.currentTime + (Date.now() - receivedAt) / 1000;
}

// Make the YouTube player match the server's state
function applyState(player, state, lastVideoId, canPlay) {
  const { videoId, playState, currentTime } = state;
  const shouldPlay = playState === "playing" && canPlay;

  // New video: load it
  if (lastVideoId.current !== videoId) {
    lastVideoId.current = videoId;
    const args = { videoId, startSeconds: currentTime };
    if (shouldPlay) player.loadVideoById(args);
    else player.cueVideoById(args);
    return;
  }

  const drift = Math.abs(player.getCurrentTime() - currentTime);

  if (playState === "playing") {
    if (drift > DRIFT_PLAYING) player.seekTo(currentTime, true);
    if (canPlay) player.playVideo();
  } else {
    if (drift > DRIFT_PAUSED) player.seekTo(currentTime, true);
    player.pauseVideo();
  }
}

export default function VideoPlayer() {
  const { videoState } = useRoom();

  const containerRef = useRef(null);
  const [playerError, setPlayerError] = useState("");
  const { playerRef, ready } = useYouTubePlayer(containerRef, () =>
    setPlayerError("This video cannot be played here (the owner may have blocked embedding). Try another video.")
  );

  // Browsers block autoplay until the user clicks once
  const [activated, setActivated] = useState(false);
  const activatedRef = useRef(false);

  const [time, setTime] = useState({ current: 0, duration: 0 });
  const lastVideoId = useRef(null);
  const latest = useRef({ state: videoState, receivedAt: Date.now() });

  // 1) Remember the newest server state and WHEN we received it
  useEffect(() => {
    if (videoState) latest.current = { state: videoState, receivedAt: Date.now() };
  }, [videoState]);

  // 2) Every new server state -> update the player
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player || !videoState) return;

    const { state, receivedAt } = latest.current;
    if (lastVideoId.current !== state.videoId) setPlayerError("");

    applyState(
      player,
      { ...state, currentTime: livePosition(state, receivedAt) },
      lastVideoId,
      activatedRef.current
    );
  }, [videoState, ready, playerRef]);

  // 3) Every 500ms: update the seek bar, and fix drift (e.g. after buffering)
  useEffect(() => {
    if (!ready) return;

    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      const current = player.getCurrentTime?.() || 0;
      const duration = player.getDuration?.() || 0;
      setTime({ current, duration });

      const { state, receivedAt } = latest.current;
      const isPlayingNow = player.getPlayerState?.() === 1; // 1 = playing
      if (activatedRef.current && state?.playState === "playing" && isPlayingNow) {
        const expected = livePosition(state, receivedAt);
        const inRange = !duration || expected < duration;
        if (inRange && Math.abs(current - expected) > AUTO_CORRECT) {
          player.seekTo(expected, true);
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [ready, playerRef]);

  // The user's first click: now the browser allows playing
  function handleActivate() {
    activatedRef.current = true;
    setActivated(true);

    const player = playerRef.current;
    const { state, receivedAt } = latest.current;
    if (player && state) {
      applyState(
        player,
        { ...state, currentTime: livePosition(state, receivedAt) },
        lastVideoId,
        true
      );
    }
  }

  return (
    <div className="player-section">
      <div className="player-wrap">
        <div ref={containerRef} className="player-host" />

        {/* Transparent shield: nobody can click YouTube's own controls */}
        <div className="player-shield" />

        {!ready && (
          <div className="player-overlay">
            <p className="muted">Loading player...</p>
          </div>
        )}

        {ready && !activated && (
          <div className="player-overlay">
            <button className="btn btn-primary" onClick={handleActivate}>
              ▶ Click to join the video
            </button>
            <p className="muted small">Browsers need one click before a video can play.</p>
          </div>
        )}
      </div>

      {playerError && <p className="error">{playerError}</p>}

      <VideoControls current={time.current} duration={time.duration} />
    </div>
  );
}