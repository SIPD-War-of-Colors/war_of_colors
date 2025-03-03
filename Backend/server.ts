import express, { Request, Response } from "express";
import { Server } from "socket.io";
import cors from "cors";
import http from "http";
import { v4 as uuidv4 } from "uuid";

interface Player {
  playerID: string;
  currentGuess: number;
}

interface Room {
  players: { [key: string]: Player };
}

const rooms: { [key: string]: Room } = {};

// Create express app
const app = express();
app.use(express.json());
app.use(cors());

// Create HTTP server with Express
const server = http.createServer(app);

// Create Socket.IO server using the HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // change this to the frontend URL kng mag deploy na
    methods: ["GET", "POST"],
  },
});

// Function to broadcast the current room list
const broadcastRoomList = () => {
  const roomList = Object.keys(rooms).map((roomId) => ({
    id: roomId,
  }));
  console.log("Broadcasting room list", roomList);
  io.emit("roomListUpdate", roomList);
};

io.on("connection", (socket) => {
  console.log("A user connected! " + socket.id);

  broadcastRoomList();

  socket.on("test", () => {
    console.log("Test event received");
  });

  socket.on("getRoomList", (callback) => {
    const roomList = Object.keys(rooms).map((roomId) => ({
      id: roomId,
    }));
    callback(roomList);
  });

  // Create a new room
  socket.on("createRoom", (playerID, callback) => {
    const roomId = uuidv4(); // Generate a unique room ID
    rooms[roomId] = {
      players: { [socket.id]: { playerID: playerID, currentGuess: 0 } },
    };
    socket.join(roomId); // Join the Socket.IO room
    callback(roomId); // Send the room ID back to the client

    console.log(`Room created: ${roomId}, Player: ${playerID}`);
  });

  // Join an existing room
  socket.on("joinRoom", (roomId, playerID, callback) => {
    if (rooms[roomId]) {
      rooms[roomId].players[socket.id] = {
        playerID: playerID,
        currentGuess: 0,
      };
      socket.join(roomId);

      // Notify players in the room about the new player
      io.to(roomId).emit("playerJoined", rooms[roomId].players);
      socket.emit("currentPlayers", rooms[roomId].players);
      callback(true); // Success
      console.log(`Room ${roomId} joined by ${playerID}`);
    } else {
      callback(false); // Room not found
      console.log("attempted to join room that does not exist");
    }
  });
});

// Define the root path with a greeting message
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the Express + TypeScript Server!" });
});

// Set the network port
const port = process.env.PORT || 3000;

// Start the Express server
server.listen(port, () => {
  console.log(`The server is running at http://localhost:${port}`);
});
