
import dotenv from "dotenv";

dotenv.config();

const CLIENT_URLS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_URLS,
};

if (!env.MONGO_URI) {
  console.error("MONGO_URI is missing in environment variables");
  process.exit(1);
}
