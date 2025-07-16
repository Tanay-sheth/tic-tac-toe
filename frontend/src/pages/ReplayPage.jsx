import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../lib/axios";

const ReplayPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [board, setBoard] = useState(Array(9).fill(null));

  // Fetch game data
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await axiosInstance.get(`/games/${gameId}`);
        setGame(res.data);
      } catch (err) {
        console.error("Failed to fetch game data:", err.message);
      }
    };
    fetchGame();
  }, [gameId]);

  // Update board based on currentMove
  useEffect(() => {
    if (!game) return;
    const newBoard = Array(9).fill(null);
    for (let i = 0; i < currentMove; i++) {
      const move = game.moves[i];
      newBoard[move.index] = move.symbol;
    }
    setBoard(newBoard);
  }, [currentMove, game]);

  const handleNext = () => {
    if (!game || currentMove >= game.moves.length) return;
    setCurrentMove((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentMove > 0) setCurrentMove((prev) => prev - 1);
  };

  const handleJump = (moveIndex) => {
    setCurrentMove(moveIndex);
  };

  const renderCell = (index) => (
    <div
      key={index}
      className="aspect-square w-full min-w-[4rem] bg-white border-2 border-gray-300 flex items-center justify-center text-4xl font-bold transition-all duration-100"
    >
      {board[index] || <span className="text-transparent">X</span>}
    </div>
  );

  if (!game) return <p className="p-10 text-center">Loading Replay...</p>;

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-start p-6 space-y-6">
      <div className="mt-12"></div> {/* Spacer instead of multiple br tags */}
      <h1 className="text-2xl font-bold">Replay Game</h1>
      <h2 className="text-md font-semibold">
        {game.playerX} (X) vs {game.playerO} (O)
      </h2>
      <p className="text-gray-600">
        Result:{" "}
        <span
          className={
            game.result === "draw"
              ? "text-amber-50 font-bold"
              : game.result === "X"
              ? "text-red-600 font-bold"
              : "text-green-600 font-bold"
          }
        >
          {game.result === "draw"
            ? "DRAW"
            : game.result === "X"
            ? `${game.playerX} WON`
            : `${game.playerO} WON`}
        </span>
      </p>
      <div className="grid grid-cols-3 gap-2 w-64 max-w-full text-blue-600">
        {Array.from({ length: 9 }).map((_, index) => renderCell(index))}
      </div>
      <div className="flex space-x-3 mt-4">
        <button
          className="btn btn-outline btn-sm"
          onClick={handlePrev}
          disabled={currentMove === 0}
        >
          ⏮ Prev
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleNext}
          disabled={currentMove === game.moves.length}
        >
          ⏭ Next
        </button>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-md">
        {game.moves.map((move, idx) => (
          <button
            key={idx}
            onClick={() => handleJump(idx + 1)}
            className={`btn btn-xs ${
              currentMove === idx + 1 ? "btn-active btn-accent" : "btn-outline"
            }`}
          >
            Move {idx + 1}
          </button>
        ))}
      </div>
      <button
        onClick={() => navigate("/")}
        className="mt-6 btn btn-primary px-4 py-2"
      >
        🏠 Go Home
      </button>
    </div>
  );
};

export default ReplayPage;
