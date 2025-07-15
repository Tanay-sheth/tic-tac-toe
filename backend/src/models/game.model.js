import mongoose from "mongoose";

const moveSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true }, // 0-8 cell index
    symbol: { type: String, enum: ["X", "O"], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const gameSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true },
    playerX: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    playerO: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null if draw
    result: {
      type: String,
      enum: ["X", "O", "draw"],
      required: true,
    },
    moves: [moveSchema], // sequential move list
  },
  { timestamps: true }
);

const Game = mongoose.model("Game", gameSchema);

export default Game;
