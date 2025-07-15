import express from "express";
import Game from "../models/game.model.js";
import { getUserGames } from "../controllers/game.controller.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { roomCode, playerX, playerO, winner, moves } = req.body;

    const result =
      winner === "draw"
        ? { [playerX]: "draw", [playerO]: "draw" }
        : {
            [winner]: "win",
            [playerX === winner ? playerO : playerX]: "lose",
          };

    const game = await Game.create({
      roomCode,
      playerX,
      playerO,
      winner,
      moves,
      result,
    });

    res.status(201).json(game);
  } catch (err) {
    console.error("❌ Game save error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:userId", getUserGames);

export default router;
