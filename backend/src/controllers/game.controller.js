import Game from "../models/game.model.js";
import mongoose from "mongoose";

export const getUserGames = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find games where the user is playerX or playerO, and populate user info
    const games = await Game.find({
      $or: [
        { playerX: new mongoose.Types.ObjectId(userId) },
        { playerO: new mongoose.Types.ObjectId(userId) },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("playerX", "fullName")
      .populate("playerO", "fullName");

    const formattedGames = games.map((game) => {
      const isPlayerX = game.playerX._id.toString() === userId;
      const opponent = isPlayerX ? game.playerO : game.playerX;
      let result;
      if (game.result === "draw") {
        result = "draw";
      } else if (
        (game.result === "X" && isPlayerX) ||
        (game.result === "O" && !isPlayerX)
      ) {
        result = "win";
      } else {
        result = "lose";
      }

      return {
        opponentName: opponent.fullName,
        result,
        roomCode: game.roomCode,
        createdAt: game.createdAt,
      };
    });

    res.status(200).json(formattedGames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
