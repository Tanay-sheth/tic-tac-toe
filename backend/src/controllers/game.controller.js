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
        gameId: game._id,
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

export const getGameMoves = async (req, res) => {
  try {
    const gameId = req.params.gameId;

    const game = await Game.findById(gameId)
      .populate("playerX", "fullName")
      .populate("playerO", "fullName")
      .populate("moves.by", "fullName"); // populate player who made each move

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.status(200).json({
      gameId: game._id,
      roomCode: game.roomCode,
      playerX: game.playerX.fullName,
      playerO: game.playerO.fullName,
      result: game.result,
      winner: game.winner,
      moves: game.moves.map((move, index) => ({
        moveNumber: index + 1,
        index: move.index,
        symbol: move.symbol,
        by: move.by.fullName,
      })),
      createdAt: game.createdAt,
    });
  } catch (err) {
    console.error("❌ Error fetching game moves:", err.message);
    res.status(500).json({ error: err.message });
  }
};


export const postGame = async (req, res) => {
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
};
