import express from "express";
import Game from "../models/game.model.js";
import {
  getUserGames,
  postGame,
  getGameMoves,
} from "../controllers/game.controller.js";

const router = express.Router();

router.post("/", postGame);

router.get("/user/:userId", getUserGames);

router.get("/:gameId", getGameMoves);

export default router;
