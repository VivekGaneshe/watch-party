import { useEffect, useRef, useState } from "react";

// Load the YouTube IFrame API script only once for the whole app
let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previous) previous();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function useYouTubePlayer(containerRef, onError) {
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Keep the latest onError without re-creating the player
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;
    let player = null;
    const container = containerRef.current;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !container) return;

      // The API replaces this element with an <iframe>
      const mount = document.createElement("div");
      container.appendChild(mount);

      player = new YT.Player(mount, {
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0, // hide YouTube's own controls: the room controls the video
          disablekb: 1, // disable keyboard shortcuts
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            playerRef.current = e.target;
            setReady(true);
          },
          onError: (e) => onErrorRef.current?.(e.data),
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current = null;
      setReady(false);
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      if (container) container.innerHTML = "";
    };
  }, [containerRef]);

  return { playerRef, ready };
}