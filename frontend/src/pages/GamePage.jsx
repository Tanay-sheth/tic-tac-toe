import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const GamePage = () => {
  const { socket } = useAuthStore();
  const location = useLocation();

  if (!location.state || !socket) return <p>Waiting for game data...</p>;

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

  // ✅ Setup socket listeners & mark player as ready
  useEffect(() => {
    if (!socket) return;

    setIsMyTurn(isFirstTurn);
    setStatus(isFirstTurn ? "Your turn" : "Opponent's turn");

    socket.emit("playerReady", { roomCode });

    const handleOpponentMove = ({ index, symbol }) => {
      console.log("Received opponentMove", index, symbol);
      setBoard((prev) => {
        const newBoard = [...prev];
        newBoard[index] = symbol;
        return newBoard;
      });
      setIsMyTurn(true);
      setStatus("Your turn");
    };

    socket.on("opponentMove", handleOpponentMove);

    return () => {
      socket.off("opponentMove", handleOpponentMove);
    };
  }, [socket]);

  const handleCellClick = (index) => {
    if (!isMyTurn || board[index]) return;

    const newBoard = [...board];
    newBoard[index] = yourSymbol;
    setBoard(newBoard);
    setIsMyTurn(false);
    setStatus("Opponent's turn");

    socket.emit("makeMove", {
      roomCode,
      index,
      symbol: yourSymbol,
    });
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
      <div className="grid grid-cols-3 gap-2 w-64 h-64">
        {Array.from({ length: 9 }).map((_, index) => renderCell(index))}
      </div>
    </div>
  );
};

export default GamePage;
