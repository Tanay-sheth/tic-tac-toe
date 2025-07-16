import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import Game from "../models/game.model.js"; // Import the Game model

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track players and readiness
const roomPlayers = new Map();
const roomReadyCount = new Map();
// Track moves for each room
const roomMoves = new Map();

const checkWinner = (board) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every((cell) => cell !== null) ? "draw" : null;
};

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (const [roomCode, players] of roomPlayers.entries()) {
      const index = players.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) {
        players.splice(index, 1);
        roomPlayers.set(roomCode, players);
        socket.to(roomCode).emit("opponentLeft");
        break;
      }
    }
  });

  socket.on("joinRoom", ({ roomCode, userId, userName }) => {
    if (!roomCode || typeof roomCode !== "string") {
      socket.emit("joinRoomError", "Invalid room ID");
      return;
    }

    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }

    const players = roomPlayers.get(roomCode) || [];
    if (players.length >= 2) {
      socket.emit("joinRoomError", "Room is full");
      return;
    }

    socket.join(roomCode);
    const playerData = { socketId: socket.id, userId, userName };
    players.push(playerData);
    roomPlayers.set(roomCode, players);

    socket.emit("roomJoined", roomCode);
    socket
      .to(roomCode)
      .emit("userJoined", { socketId: socket.id, userId, userName });
  });

  socket.on("playerReady", ({ roomCode }) => {
    const count = roomReadyCount.get(roomCode) || 0;
    roomReadyCount.set(roomCode, count + 1);

    if (count + 1 === 2) {
      const [p1, p2] = roomPlayers.get(roomCode);
      io.to(p1.socketId).emit("gameStart", {
        yourSymbol: "X",
        yourName: p1.userName,
        opponentName: p2.userName,
        opponentId: p2.userId,
        isFirstTurn: true,
        roomCode,
      });
      io.to(p2.socketId).emit("gameStart", {
        yourSymbol: "O",
        yourName: p2.userName,
        opponentName: p1.userName,
        opponentId: p1.userId,
        isFirstTurn: false,
        roomCode,
      });
      roomReadyCount.delete(roomCode);
    }
    // Reset moves for new game
    roomMoves.set(roomCode, []);
  });

  socket.on("makeMove", async ({ roomCode, index, symbol }) => {
    // Track the move
    const players = roomPlayers.get(roomCode);
    if (!players || players.length !== 2) return;
    // Find the userId for this socket
    const player = players.find((p) => p.socketId === socket.id);
    if (!player) return;
    // Add move to roomMoves
    if (!roomMoves.has(roomCode)) roomMoves.set(roomCode, []);
    roomMoves.get(roomCode).push({ index, symbol, by: player.userId });

    // Notify opponent
    socket.to(roomCode).emit("opponentMove", { index, symbol });

    // Build board from moves
    const movesArr = roomMoves.get(roomCode);
    const board = Array(9).fill(null);
    for (const move of movesArr) {
      board[move.index] = move.symbol;
    }
    const winnerSymbol = checkWinner(board);
    if (!winnerSymbol) return;

    // Find playerX/playerO by join order
    const [pX, pO] = players;
    const winnerId =
      winnerSymbol === "draw"
        ? null
        : winnerSymbol === "X"
        ? pX.userId
        : pO.userId;

    // Emit game over to both
    io.to(roomCode).emit("gameOver", {
      winner: winnerId || "draw",
      result: winnerSymbol,
    });

    // Save to MongoDB
    try {
      await Game.create({
        playerX: pX.userId,
        playerO: pO.userId,
        winner: winnerId, // null if draw
        roomCode,
        moves: movesArr,
        result: winnerSymbol, // 'X', 'O', or 'draw'
      });
      console.log("✅ Game saved");
    } catch (err) {
      console.error("❌ Error saving game:", err.message);
    }
    // Clear moves for this room (optional, or keep for rematch)
    roomMoves.delete(roomCode);
  });

  socket.on("restartGame", ({ roomCode }) => {
    const players = roomPlayers.get(roomCode);
    if (!players || players.length !== 2) return;

    io.to(players[0].socketId).emit("gameStart", {
      yourSymbol: "X",
      yourName: players[0].userName,
      opponentName: players[1].userName,
      opponentId: players[1].userId,
      isFirstTurn: true,
      roomCode,
    });
    io.to(players[1].socketId).emit("gameStart", {
      yourSymbol: "O",
      yourName: players[1].userName,
      opponentName: players[0].userName,
      opponentId: players[0].userId,
      isFirstTurn: false,
      roomCode,
    });
    // Reset moves for new game
    roomMoves.set(roomCode, []);
  });

  socket.on("leaveGame", ({roomCode}) => {
    io.to(roomCode).emit("playerLeft");
  });
});

export { io, app, server };
