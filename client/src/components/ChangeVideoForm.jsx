import { useState } from "react";
import { useRoom } from "../context/RoomContext";
import { extractVideoId } from "../utils/youtube";

export default function ChangeVideoForm() {
  const { canControl, changeVideo, requestChange } = useRoom();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const videoId = extractVideoId(url);
    if (!videoId) return setError("That does not look like a YouTube link");

    setError("");
    if (canControl) changeVideo(videoId);
    else requestChange("change_video", { videoId });
    setUrl("");
  }

  return (
    <form className="panel change-form" onSubmit={handleSubmit}>
      <h3 className="panel-title">{canControl ? "Change video" : "Suggest a video"}</h3>
      <div className="row">
        <input
          className="input"
          placeholder="Paste a YouTube link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          {canControl ? "Play" : "Request"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}