import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../lib/axios";

const HomePage = () => {
  const [roomCode, setRoomCode] = useState("");
  const [joinButton, setJoinButton] = useState("Join");
  const [pastGames, setPastGames] = useState([]);

  const { socket, authUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser?._id) return;

    const fetchGames = async () => {
      try {
        const res = await axiosInstance.get(`/games/user/${authUser._id}`);
        setPastGames(res.data);
      } catch (err) {
        console.error("Failed to fetch past games:", err.message);
      }
    };

    fetchGames();
  }, [authUser]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (roomCode) => {
      socket.emit("playerReady", { roomCode });
    };

    const handleGameStart = ({
      opponentId,
      opponentName,
      yourName,
      yourSymbol,
      isFirstTurn,
      roomCode,
    }) => {
      navigate("/game", {
        state: {
          opponentName,
          opponentId,
          yourName,
          yourSymbol,
          isFirstTurn,
          roomCode,
        },
      });
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("gameStart", handleGameStart);

    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("gameStart", handleGameStart);
    };
  }, [socket, navigate]);

  const handleJoinClick = () => {
    if (!authUser || !socket) return;

    if (roomCode && typeof roomCode === "string") {
      setJoinButton("Waiting for other player...");
    }

    socket.emit("joinRoom", {
      roomCode,
      userId: authUser._id,
      userName: authUser.fullName,
    });
  };

  return (
    <div className="h-screen bg-base-200 p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="mt-24"></div>
        <h1 className="text-center text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6 tracking-tight">
          Enter room code:
        </h1>
        <input
          type="text"
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          className="input input-bordered w-full mb-4"
        />
        <button onClick={handleJoinClick} className="btn btn-primary w-full">
          {joinButton}
        </button>
      </div>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">🕹️ Past Games</h2>
        <div className="bg-blue-500 rounded-lg shadow-inner max-h-64 overflow-y-auto px-4 py-2 space-y-2 border-0">
          {pastGames.length === 0 ? (
            <p className="text-gray-500">No games played yet.</p>
          ) : (
            <ul className="space-y-2">
              {pastGames.map((game, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded bg-blue-100 flex justify-between items-center"
                >
                  <span>
                    <strong className="text-black">{game.opponentName}</strong>
                  </span>

                  <span
                    className={
                      game.result === "win"
                        ? "text-green-600 font-bold"
                        : game.result === "lose"
                        ? "text-red-600 font-bold"
                        : "text-gray-600 font-bold"
                    }
                  >
                    {game.result === "draw"
                      ? "DRAW"
                      : game.result === "win"
                      ? "WON"
                      : game.result === "lose"
                      ? "LOST"
                      : game.result.toUpperCase()}
                  </span>
                  <span
                    onClick={() => navigate(`/replay/${game.gameId}`)}
                    className="inline-block px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    View
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
