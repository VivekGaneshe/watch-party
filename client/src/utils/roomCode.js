
const NOT_ALLOWED = /[^A-HJ-NP-Z2-9]/g;

export function parseRoomCode(input) {
  let text = String(input || "").trim();

  const match = text.match(/\/room\/([^/?#\s]+)/i);

  if (match) {
    text = match[1];
  }

  return text.toUpperCase().replace(NOT_ALLOWED, "").slice(0, 6);
}
