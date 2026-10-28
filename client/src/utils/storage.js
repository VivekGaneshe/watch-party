
const KEY = "watchparty_username";

export function getSavedName() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function saveName(name) {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // Ignore storage errors
  }
}
