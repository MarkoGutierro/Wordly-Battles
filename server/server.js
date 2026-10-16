// Import the modules and packages needed for the backend server
import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";

// Create the Express app, HTTP server, and Socket.IO server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {}; // Store all active multiplayer rooms by room code

// Load the multiplayer solution words from the game words list
const gameWords = fs.readFileSync("../data/game_words.txt", "utf-8")
    .split(/\r?\n/)
    .map(word => word.trim().toUpperCase())
    .filter(word => word !== "");

// Load the valid multiplayer guesses from the possible guesses list
const possibleGuesses = fs.readFileSync("../data/possible_guesses.txt", "utf-8")
    .split(/\r?\n/)
    .map(word => word.trim().toUpperCase())
    .filter(word => word !== "");

// Display a simple message on the root page to confirm the backend server is running
app.get("/", (req, res) => {
    res.send("Wordly Battles server is running!");
});

// Handle Socket.IO server connections
io.on("connection", (socket) => {
    console.log("A player connected: ", socket.id);

    // Create a multiplayer room when requested
    socket.on("create-room", () => {
        createRoom(socket);
    });

    // Join an existing multiplayer room when requested
    socket.on("join-room", (roomCode) => {
        joinRoom(socket, roomCode);
    });

    // Leave the current multiplayer room when requested
    socket.on("leave-room", () => {
        if (socket.roomCode) {
            const roomCode = socket.roomCode;

            leaveCurrentRoom(socket);

            // Notify the other player that their opponent left the game
            io.to(roomCode).emit("opponent-left");
        }
    });

    // Validate and check a multiplayer guess when submitted
    socket.on("submit-guess", (guess) => {
        const validatedGuess = validateMultiplayerGuess(socket, guess);

        if (!validatedGuess) {
            return;
        }

        checkMultiplayerGuess(socket, validatedGuess);
    });

    // Handle a player disconnecting from the multiplayer server
    socket.on("disconnect", () => {
        // Remove the player from their current room, if they were in one
        if (socket.roomCode) {
            const roomCode = socket.roomCode;

            leaveCurrentRoom(socket);

            // Notify a remaining player that their opponent disconnected
            io.to(roomCode).emit("opponent-disconnected");
        }

        // Log the player that disconnected
        console.log("A player disconnected: ", socket.id);
    });
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log("Server running on port 3000");
});

// Create a new multiplayer room when requested
function createRoom(socket) {
    // Make the player leave their current room, if applicable
    if (socket.roomCode) {
        leaveCurrentRoom(socket);
    }

    const roomCode = generateRoomCode(); // Generate unique room code

    // Create a new room object and add the creator as the first player
    rooms[roomCode] = {
        players: [socket.id]
    };

    // Add the creator's socket connection to the Socket.IO room
    socket.join(roomCode);
    socket.roomCode = roomCode; // Track the player's current room code

    // Send the room code back to the player who created it
    socket.emit("room-created", roomCode);

    // Display who created the room and its room code
    console.log(`Player ${socket.id} created room ${roomCode}`);
}

// Generate a unique six-character room code
function generateRoomCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let roomCode;

    // Repeat until an unused room code is generated
    do {
        roomCode = "";

        // Generate the random six-character code
        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            roomCode += characters[randomIndex];
        }
    } while (rooms[roomCode]);

    return roomCode;
}

// Add a player to an existing multiplayer room and start the game when ready
function joinRoom(socket, roomCode) {
    // Check if the room exists
    if (!rooms[roomCode]) {
        socket.emit("join-error", "Room not found");
        return;
    }

    // Prevent player from unnecessarily rejoining if already in the room
    if (socket.roomCode === roomCode) {
        return;
    }

    // Check if the room already has two players
    if (rooms[roomCode].players.length >= 2) {
        socket.emit("join-error", "Room is full");
        return;
    }
    
    // Make the player leave their current room, if applicable
    if (socket.roomCode) {
        leaveCurrentRoom(socket);
    }

    // Add the player to the room data
    rooms[roomCode].players.push(socket.id);

    // Add the player's socket connection to the Socket.IO room
    socket.join(roomCode);
    socket.roomCode = roomCode; // Track the player's current room code

    // Confirm to the front-end that the player successfully joined
    socket.emit("room-joined", roomCode);

    // Display when a player has successfully joined a room
    console.log(`Player ${socket.id} joined room ${roomCode}`);

    // Start a multiplayer game once a room has two players
    startMultiplayerGame(roomCode);
}

// Remove a player from their current multiplayer room
function leaveCurrentRoom(socket) {
    // Leave function if the player is not currently in a room
    if (!socket.roomCode) {
        return;
    }

    const roomCode = socket.roomCode; // Player's current room code

    // Remove the player from the room data
    rooms[roomCode].players = rooms[roomCode].players.filter(
        playerId => playerId !== socket.id
    );

    // Remove the player's socket connection from the Socket.IO room
    socket.leave(roomCode);

    // Delete the room if no players remain
    if (rooms[roomCode].players.length === 0) {
        delete rooms[roomCode];
        console.log(`Room ${roomCode} deleted`);
    }

    // Clear the room currently assigned to this socket
    socket.roomCode = null;
}

// Start a multiplayer game with a shared secret word once a room has two players
function startMultiplayerGame(roomCode) {
    if (rooms[roomCode].players.length === 2) {
        // Select a random solution word
        const randomIndex = Math.floor(Math.random() * gameWords.length);
        const secretWord = gameWords[randomIndex];

        // Store the solution word in the room
        rooms[roomCode].secretWord = secretWord;

        // Tell both clients in the room to start the multiplayer game
        io.to(roomCode).emit("game-start");
    }
}

// Validate and normalize a multiplayer guess before scoring it
function validateMultiplayerGuess(socket, guess) {
    const roomCode = socket.roomCode;

    // Make sure the player is in a valid room with an active game
    if (!roomCode || !rooms[roomCode] || !rooms[roomCode].secretWord) {
        return null;
    }

    // Make sure the guess is a string
    if (typeof guess !== "string") {
        return null;
    }

    // Normalize the guess
    guess = guess.trim().toUpperCase();

    // Make sure the guess is exactly five letters
    if (!/^[A-Z]{5}$/.test(guess)) {
        socket.emit("guess-error", "Not a valid word");
        return null;
    }

    // Make sure the guess exists in the valid guess list
    if (!possibleGuesses.includes(guess)) {
        socket.emit("guess-error", "Not a valid word");
        return null;
    }

    return guess;
}

// Check a multiplayer guess against the room's solution word
function checkMultiplayerGuess(socket, guess) {
    const roomCode = socket.roomCode;
    const secretWord = rooms[roomCode].secretWord;
    const result = []; // Array that stores the results of the player's guess
    const remainingLetters = secretWord.split(""); // Working, mutable copy of the solution word

    // First pass: mark correct letters
    for (let i = 0; i < 5; i++) {
        if (guess[i] === secretWord[i]) {
            result[i] = "correct";
            remainingLetters[i] = null; //Remove letter from array, it has been accounted for
        }
    }

    // Second pass: mark present and absent letters
    for (let i = 0; i < 5; i++) {
        // Skip letters already marked as correct
        if (result[i] === "correct") {
            continue;
        }

        // Find the index of the guessed letter in the remaining unused letters
        const index = remainingLetters.indexOf(guess[i]);

        // If the letter was found, mark it present and use up that copy
        if (index !== -1) {  
            result[i] = "present";
            remainingLetters[index] = null; //Remove letter from array, it has been accounted for
        } else {
            result[i] = "absent";
        }
    }

    socket.emit("guess-result", { guess, result }); // Send the guess result back to the player
}