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

// ✅ Check winner helper
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

  socket.on("makeMove", ({ roomCode, index, symbol, board }) => {
    console.log("📩 Move received:", roomCode, index, symbol);

    // Send move to opponent
    socket.to(roomCode).emit("opponentMove", { index, symbol });

    // Check winner
    const winner = checkWinner(board);
    if (winner) {
      io.to(roomCode).emit("gameOver", { winner });
    }
  });

  socket.on("restartGame", ({ roomCode }) => {
    console.log("🔁 Restarting game for room:", roomCode);
    const players = roomPlayers.get(roomCode);
    if (players?.length === 2) {
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
    }
  });
  socket.on("leaveGame", ({ roomCode }) => {
    io.to(roomCode).emit("playerLeft");
  });
});

export { io, app, server };
