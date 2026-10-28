const ID = /^[\w-]{11}$/;

// Accepts: watch links, youtu.be, shorts, embed, live, or a bare 11-char ID
export function extractVideoId(input) {
  const text = String(input || "").trim();
  if (!text) return null;
  if (ID.test(text)) return text;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (["youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/?]+)/);
      if (m) id = m[2];
    }
  }

  return id && ID.test(id) ? id : null;
}   