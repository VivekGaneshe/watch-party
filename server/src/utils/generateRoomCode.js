
import { randomInt } from "crypto";

// Characters that are easy to read and type
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6) {
  let code = "";

  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }

  return code;
}
