
import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
};

if (!env.MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}
