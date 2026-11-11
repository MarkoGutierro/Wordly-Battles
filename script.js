// Game configuration
const WORD_LENGTH = 5; // Number of letters in each word
const MAX_ATTEMPTS = 6; // Maximum number of guesses allowed per game
const TOTAL_TILES = WORD_LENGTH * MAX_ATTEMPTS; // Total number of tiles on each game board

const KEYBOARD_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"]
]; // Store the three rows of on-screen keyboard keys

// Game elements
const board = document.getElementById("board"); // Main game board
const opponentBoard = document.getElementById("opponent-board"); // Opponent's multiplayer board
const keyboard = document.getElementById("keyboard"); // On-screen game keyboard
const playAgainButton = document.getElementById("play-again"); // Play Again button
const gameMessage = document.getElementById("game-message"); // Messages related to gameplay

// Multiplayer elements
const multiplayerButton = document.getElementById("multiplayer-button"); // Multiplayer button
const roomCodeDisplay = document.getElementById("room-code-display"); // Displays the current multiplayer room code
const roomCodeInput = document.getElementById("room-code-input"); // Room code input field
const joinRoomButton = document.getElementById("join-room-button"); // Join multiplayer room button
const leaveRoomButton = document.getElementById("leave-room-button"); // Leave multiplayer room button
const roomErrorMessage = document.getElementById("room-error-message"); // Temporary room-related error messages
const multiplayerStatusMessage = document.getElementById("multiplayer-status-message"); // Current multiplayer status message

// Multiplayer connection
const socket = io("http://localhost:3000"); // Connect to the multiplayer server

// Game state
let currentTile = 0; // Track the current tile the player can type into
let currentRow = 0; // Track the player's current guess row
let opponentRow = 0; // Track the opponent's current guess row
let filesReady = false; // Track whether both word files have finished loading
let gameOver = false; // Track whether the current game has ended
let multiplayerMode = false; // Track whether the player is currently in multiplayer mode

// Word data
let gameWords = []; // Store all possible solution words loaded from game_words.txt
let possibleGuesses = []; // Store all valid guesses loaded from possible_guesses.txt
let secretWord = ""; // Store the randomly selected single-player solution word

loadWordFiles(); // Load both word files before allowing the game to start

// Generate the game board
for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    board.appendChild(tile);
}

// Create the opponent's game board
for (let i = 0; i < TOTAL_TILES; i++) {
    const tile = document.createElement("div");
    tile.classList.add("opponent-tile");
    opponentBoard.appendChild(tile);
}

// Generate the on-screen game keyboard
for (const row of KEYBOARD_ROWS) {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("keyboard-row");

    for (const letter of row) {
        const keyButton = document.createElement("button");
        keyButton.textContent = letter === "BACKSPACE" ? "⌫" : letter;
        keyButton.classList.add("key");

        //Enter and Backspace keys are larger
        if (letter === "ENTER" || letter === "BACKSPACE") {
            keyButton.classList.add("wide-key");
        }

        //Handle user input
        keyButton.addEventListener("click", function() {
            handleKey(letter);
            keyButton.blur();
        });

        rowDiv.appendChild(keyButton);
    }

    keyboard.appendChild(rowDiv);
}

// Load both word files before allowing the game to start
async function loadWordFiles() {
    await loadGameWords(); // Load the possible solution words from game_words.txt and pick an initial solution word
    await loadPossibleGuesses(); // Load the valid guess words from possible_guesses.txt

    filesReady = true;
}

// Load the possible solution words from game_words.txt and pick an initial solution word
async function loadGameWords() {
    const response = await fetch("data/game_words.txt"); // Request the game_words.txt file and wait for the response
    const text = await response.text(); // Read the returned file as a string

    // Convert the string text into a clean list of solution words
    gameWords = text
        .split(/\r?\n/)
        .map(word => word.trim().toUpperCase())
        .filter(word => word !== "");

    // Pick a solution word
    secretWord = gameWords[Math.floor(Math.random() * gameWords.length)];

    gameReady = true; // Mark the game as ready now that the solution word has finished loading

    console.log(secretWord); //Allow us to view the solution word
}

// Load the valid guess words from possible_guesses.txt
async function loadPossibleGuesses() {
    const response = await fetch("data/possible_guesses.txt"); // Request the possible_guesses.txt file and wait for the response
    const text = await response.text(); // Read the returned file as a string

    // Convert the string string into a clean list of valid guess words
    possibleGuesses = text
        .split(/\r?\n/)
        .map(word => word.trim().toUpperCase())
        .filter(word => word !== "");
}

// Physical keyboard events
document.addEventListener("keydown", function(event) {
    handleKey(event.key);
});

// Start a new round when the play again button is clicked
playAgainButton.addEventListener("click", playAgain);

// Handle all game key input
function handleKey(key) {
    // Don't run this function until both word files have finished loading
    if (!filesReady) {
        return;
    }

    // Don't run this function when the game is over
    if (gameOver) {
        return;
    }

    // Uppercase all keyboard input
    key = key.toUpperCase();

    // Backspace: go back one tile
    if (key === "BACKSPACE" && currentTile > currentRow * WORD_LENGTH) {
        currentTile--;
        board.children[currentTile].textContent = "";
        return;
    }

    // Enter: submit guesses and call the checkGameEnd function to see if the game is over
    if (key === "ENTER" && currentTile === (currentRow + 1) * WORD_LENGTH) {
        let guess = "";
        const rowStart = currentRow * WORD_LENGTH;

        //Concatenate the guess into a string
        for (let i = rowStart; i < rowStart + WORD_LENGTH; i++) {
            guess += board.children[i].textContent;
        }

        // Reject the guess if it is not in the valid guess list
        if (!possibleGuesses.includes(guess)) {
            gameMessage.textContent = "Not a valid word";

            setTimeout(() => {
                gameMessage.textContent = "";
            }, 2000);

            return;
        }

        // Send valid multiplayer guesses to the server
        if (multiplayerMode) {
            socket.emit("submit-guess", guess);
            return;
        }

        //See how many tiles in the guess were correct, partially correct, and incorrect
        console.log(guess);
        checkGuess(guess);

        // Move on to next row/guess or end game if appropriate
        currentRow++;
        checkGameEnd(guess);

        return;
    }

    // Letters: enter a letter into a tile
    if (
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(key) &&
        currentTile < (currentRow + 1) * WORD_LENGTH &&
        currentRow < MAX_ATTEMPTS
    ) {
        board.children[currentTile].textContent = key;
        currentTile++;
    }
}

// Check if guess is correct or not and change tile colors accordingly 
function checkGuess(guess) {
    const rowStart = currentRow * WORD_LENGTH;
    const remainingLetters = secretWord.split(""); // Convert the secret word into an array of individual letters

    // First pass: mark correct letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = board.children[rowStart + i];

        if (guess[i] === secretWord[i]) {
            tile.classList.add("correct");
            updateKeyboard(guess[i], "correct");
            remainingLetters[i] = null; //Remove letter from array, it has been accounted for
        }
    }

    // Second pass: mark present or absent letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = board.children[rowStart + i];

        //Letter correct, skip to next loop iteration
        if (guess[i] === secretWord[i]) {
            continue;
        }

        // Find the index of the guessed letter in the remaining unused letters
        const letterIndex = remainingLetters.indexOf(guess[i]);

        // If the letter was found, mark it present and use up that copy
        if (letterIndex !== -1) {
            tile.classList.add("present");
            updateKeyboard(guess[i], "present");
            remainingLetters[letterIndex] = null; //Remove letter from array, it has been accounted for
        } else {
            tile.classList.add("absent");
            updateKeyboard(guess[i], "absent");
        }
    }
}

// Update colors of letters on the on-screen keyboard based on player guesses
function updateKeyboard(letter, status) {
    const keys = document.querySelectorAll(".key");

    for (const key of keys) {
        if (key.textContent === letter) {

            // Never downgrade a correct letter
            if (key.classList.contains("correct")) {
                return;
            }

            // Never downgrade a present letter to absent
            if (key.classList.contains("present") && status === "absent") {
                return;
            }

            // Remove weaker statuses before applying the new one
            key.classList.remove("absent", "present");
            key.classList.add(status);

            return;
        }
    }
}

//End the game when appropriate and display a corresponding message
function checkGameEnd(guess) {
    //WINNER!!!
    if (guess === secretWord) {
        gameMessage.textContent = "You win!";
        gameOver = true;
        playAgainButton.hidden = false;
        return;
    }

    //loser :(
    if (currentRow === MAX_ATTEMPTS) {
        gameMessage.textContent = `Game over! The word was ${secretWord}.`;
        gameOver = true;
        playAgainButton.hidden = false;
    }
}

// Reset the game boards and keyboard back to their starting state
function resetBoard() {
    // Reset the progress of both game boards and the game status
    currentTile = 0;
    currentRow = 0;
    opponentRow = 0;
    gameOver = false;

    // Clear old messages and hide the Play Again button
    gameMessage.textContent = "";
    playAgainButton.hidden = true;

    // Reset all board tiles
    for (const tile of board.children) {
        tile.textContent = "";
        tile.classList.remove("correct", "present", "absent");
    }

    // Reset all opponent board tiles
    for (const tile of opponentBoard.children) {
        tile.classList.remove("correct", "present", "absent");
    }

    // Reset all on-screen keyboard colors
    const keys = document.querySelectorAll(".key");

    for (const key of keys) {
        key.classList.remove("correct", "present", "absent");
    }
}

// Reset the game and choose a new solution word
function playAgain() {
    resetBoard();

    // Generate a new single-player solution word
    secretWord = gameWords[Math.floor(Math.random() * gameWords.length)];

    console.log(secretWord);
}

// Confirm when the frontend connects to the multiplayer server
socket.on("connect", () => {
    console.log("Connected to multiplayer server");
});

// Send a request to the server to create a multiplayer room
multiplayerButton.addEventListener("click", () => {
    socket.emit("create-room");
});

// Display room code to creator upon room creation
socket.on("room-created", (roomCode) => {
    roomCodeDisplay.textContent = `Room Code: ${roomCode}`;
});

// Send the entered room code to the server when the Join Room button is clicked
joinRoomButton.addEventListener("click", () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    socket.emit("join-room", roomCode);
});

// Display when the player successfully joins a room
socket.on("room-joined", (roomCode) => {
    roomCodeDisplay.textContent = `Room Joined | Code: ${roomCode}`;
});

// Display when the player fails to join a room
socket.on("join-error", (message) => {
    roomErrorMessage.textContent = message; // Display the error message

    // Error message only displays for 2 seconds
    setTimeout(() => {
        roomErrorMessage.textContent = "";
    }, 2000);
});

// Start a multiplayer game with a shared secret word once a room has two players
socket.on("game-start", () => {
    resetBoard(); // Reset the game board and keyboard back to their starting state
    multiplayerMode = true; // Multiplayer flag is set to true
    leaveRoomButton.hidden = false; // Leave multiplayer room button now visible
    opponentBoard.hidden = false; // Reveal opponent's game board

    // Inform the player that the multiplayer game is about to begin
    multiplayerStatusMessage.textContent = "Opponent connected! Starting game...";
});

// Display the result of a guess as decided by the multiplayer server
socket.on("guess-result", ({ guess, result }) => {
    const rowStart = currentRow * WORD_LENGTH;

    // Apply the server's result to each tile and keyboard letter
    for (let i = 0; i < WORD_LENGTH; i++) {
        board.children[rowStart + i].classList.add(result[i]);
        updateKeyboard(guess[i], result[i]);
    }

    // Move to the next row
    currentRow++;
});

// Display an error when the multiplayer server rejects a guess
socket.on("guess-error", (message) => {
    gameMessage.textContent = message; // Display the error message

    // Error message only displays for 2 seconds
    setTimeout(() => {
        gameMessage.textContent = "";
    }, 2000);
});

// Update the opponent board when they make a guess
socket.on("opponent-guess-result", (result) => {
    const rowStart = opponentRow * WORD_LENGTH;

    // Apply the server's result to each tile
    for (let i = 0; i < WORD_LENGTH; i++) {
        opponentBoard.children[rowStart + i].classList.add(result[i]);
    }

    // Move to the next row
    opponentRow++;
});

// Notify the player when their opponent disconnects
socket.on("opponent-disconnected", () => {
    multiplayerStatusMessage.textContent = "Opponent disconnected";
});

// Leave the current multiplayer game and return to single-player mode
leaveRoomButton.addEventListener("click", () => {
    socket.emit("leave-room"); // Tell the server to leave the room

    multiplayerMode = false; // Reset multiplayer flag

    // Remove multiplayer GUI
    leaveRoomButton.hidden = true;
    opponentBoard.hidden = true;
    multiplayerStatusMessage.textContent = "";
    roomCodeDisplay.textContent = "";

    playAgain(); // Start a new single-player round
});

// Notify the player when their opponent leaves the game
socket.on("opponent-left", () => {
    multiplayerStatusMessage.textContent = "Opponent left the game";
});

// Handle the player winning the multiplayer game
socket.on("game-won", (message) => {
    gameMessage.textContent = message;
    gameOver = true;
});

// Handle the player losing the multiplayer game
socket.on("game-lost", (message) => {
    gameMessage.textContent = message;
    gameOver = true;
});