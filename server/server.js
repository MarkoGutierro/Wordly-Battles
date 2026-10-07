// Import the packages needed to create the backend server
import express from "express";
import http from "http";
import { Server } from "socket.io";

// Create the Express app, HTTP server, and Socket.IO server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Display a simple message on the root page to confirm the backend server is running
app.get("/", (req, res) => {
    res.send("Wordly Battles server is running!");
});

// Run when a player connects to the Socket.IO server
io.on("connection", (socket) => {
    console.log("A player connected: ", socket.id);
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log("Server running on port 3000");
});