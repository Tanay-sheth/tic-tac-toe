// ✅ FINAL FIXED SERVER CODE
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const roomPlayers = new Map(); // roomCode => [player1, player2]
const roomReadyCount = new Map(); // roomCode => number of players ready

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });

  socket.on("joinRoom", ({ roomCode, userId, userName }) => {
    console.log("➡️ User attempting to join room:", roomCode, userName);

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
      const [player1, player2] = roomPlayers.get(roomCode);
      console.log("🎮 Both players ready in room:", roomCode);

      io.to(player1.socketId).emit("gameStart", {
        yourSymbol: "X",
        yourName: player1.userName,
        opponentName: player2.userName,
        opponentId: player2.userId,
        isFirstTurn: true,
        roomCode,
      });

      io.to(player2.socketId).emit("gameStart", {
        yourSymbol: "O",
        yourName: player2.userName,
        opponentName: player1.userName,
        opponentId: player1.userId,
        isFirstTurn: false,
        roomCode,
      });

      roomReadyCount.delete(roomCode);
    }
  });

  socket.on("makeMove", ({ roomCode, index, symbol }) => {
    console.log("📩 Move received:", roomCode, index, symbol);
    socket.to(roomCode).emit("opponentMove", { index, symbol });
  });
});

export { io, app, server };
