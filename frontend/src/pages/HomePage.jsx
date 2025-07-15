import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const [joinButton, setJoinButton] = useState("Join");
  const { socket, authUser } = useAuthStore();

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (roomCode) => {
      console.log("✅ Room joined, sending playerReady...");
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
      console.log("🎮 Game started vs", opponentName);
      console.log("Navigating with", roomCode, yourSymbol, isFirstTurn);

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

    // navigation happens after gameStart
  };

  return (
    <div className="h-screen bg-base-200 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <input
          type="text"
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          className="input input-bordered w-64"
        />
        <button onClick={handleJoinClick} className="btn btn-primary w-64">
          {joinButton}
        </button>
      </div>
    </div>
  );
};

export default HomePage;
