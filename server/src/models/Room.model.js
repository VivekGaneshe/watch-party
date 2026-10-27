
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    lastVideoId: {
      type: String,
      default: "dQw4w9WgXcQ",
    },
  },
  { timestamps: true }
);

export const RoomModel = mongoose.model("Room", roomSchema);
