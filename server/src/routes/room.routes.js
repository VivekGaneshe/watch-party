
import { Router } from "express";
import {
  createRoom,
  checkRoom,
} from "../controllers/room.controller.js";

const router = Router();

router.post("/", createRoom);
router.get("/:roomId", checkRoom);

export default router;
