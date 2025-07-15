import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

const GamePage = () => {
  const { socket, authUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!location.state || !socket || !authUser)
    return <p>Waiting for game data...</p>;

  const {
    yourName,
    opponentName,
    opponentId,
    yourSymbol,
    isFirstTurn,
    roomCode,
  } = location.state;

  const [board, setBoard] = useState(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [status, setStatus] = useState("Starting...");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  const checkLocalWinner = (newBoard) => {
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
      if (
        newBoard[a] &&
        newBoard[a] === newBoard[b] &&
        newBoard[a] === newBoard[c]
      ) {
        return newBoard[a];
      }
    }
    return newBoard.every((cell) => cell !== null) ? "draw" : null;
  };

  useEffect(() => {
    if (!socket) return;

    setIsMyTurn(isFirstTurn);
    setStatus(isFirstTurn ? "Your turn" : "Opponent's turn");

    socket.emit("playerReady", { roomCode });

    const handleOpponentMove = ({ index, symbol }) => {
      setBoard((prev) => {
        const newBoard = [...prev];
        newBoard[index] = symbol;
        return newBoard;
      });
      setIsMyTurn(true);
      setStatus("Your turn");
    };

    const handleGameOver = async ({ winner }) => {
      setGameOver(true);
      setWinner(winner);
      if (winner === "draw") {
        setStatus("It's a draw!");
      } else if (winner === yourSymbol) {
        setStatus("🎉 You win!");
      } else {
        setStatus("😢 You lose!");
      }
    };

    const handleOpponentLeft = () => {
      setGameOver(true);
      setStatus("Opponent left the game.");
    };

    const handleGameRestart = ({
      yourSymbol,
      yourName,
      opponentName,
      opponentId,
      isFirstTurn,
    }) => {
      setBoard(Array(9).fill(null));
      setIsMyTurn(isFirstTurn);
      setStatus(isFirstTurn ? "Your turn" : "Opponent's turn");
      setGameOver(false);
      setWinner(null);
    };

    const handlePlayerLeft = () => {
      navigate("/");
    };

    socket.on("opponentMove", handleOpponentMove);
    socket.on("gameOver", handleGameOver);
    socket.on("opponentLeft", handleOpponentLeft);
    socket.on("gameStart", handleGameRestart);
    socket.on("playerLeft", handlePlayerLeft);

    return () => {
      socket.off("opponentMove", handleOpponentMove);
      socket.off("gameOver", handleGameOver);
      socket.off("opponentLeft", handleOpponentLeft);
      socket.off("gameStart", handleGameRestart);
      socket.off("playerLeft", handlePlayerLeft);
    };
  }, [socket, roomCode]); // ✅ FIXED: No board in dependencies

  const handleCellClick = (index) => {
    if (!isMyTurn || board[index] || gameOver) return;

    const newBoard = [...board];
    newBoard[index] = yourSymbol;
    setBoard(newBoard);
    setIsMyTurn(false);
    setStatus("Opponent's turn");

    socket.emit("makeMove", {
      roomCode,
      index,
      symbol: yourSymbol,
      board: newBoard,
    });

    const localWinner = checkLocalWinner(newBoard);
    if (localWinner) {
      setGameOver(true);
      setWinner(localWinner);
      setStatus(
        localWinner === "draw"
          ? "It's a draw!"
          : localWinner === yourSymbol
          ? "🎉 You win!"
          : "😢 You lose!"
      );
    }
  };

  const handleRestart = () => {
    if (!socket || gameOver === false) return;
    socket.emit("restartGame", { roomCode });
  };

  const handleLeave = () => {
    navigate("/");
    socket.emit("leaveGame", { roomCode });
  };

  const renderCell = (index) => (
    <div
      key={index}
      onClick={() => handleCellClick(index)}
      className="w-full h-full bg-white border-2 border-gray-300 flex items-center justify-center text-4xl font-bold cursor-pointer"
    >
      {board[index]}
    </div>
  );

  return (
    <div className="h-screen bg-base-100 flex flex-col items-center justify-center space-y-6">
      <h2 className="text-xl font-semibold">
        You: {yourName} ({yourSymbol}) vs {opponentName}
      </h2>
      <p className="text-md">{status}</p>
      <div className="grid text-blue-800 grid-cols-3 gap-2 w-64 h-64">
        {Array.from({ length: 9 }).map((_, index) => renderCell(index))}
      </div>

      {gameOver && (
        <div className="flex flex-col space-y-2 mt-4">
          <button onClick={handleRestart} className="btn btn-accent">
            🔄 Restart Game
          </button>
          <button onClick={handleLeave} className="btn btn-secondary">
            🚪 Leave Game
          </button>
        </div>
      )}
    </div>
  );
};

export default GamePage;
