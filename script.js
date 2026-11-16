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
const opponentBoardContainer = document.querySelector(".opponent-board-container"); // Contains opponent's board and heading
const opponentBoard = document.getElementById("opponent-board"); // Opponent's multiplayer board
const keyboard = document.getElementById("keyboard"); // On-screen game keyboard
const playAgainButton = document.getElementById("play-again"); // Play Again button
const gameMessage = document.getElementById("game-message"); // Messages related to gameplay

// How to Play elements
const howToPlayButton = document.getElementById("how-to-play-button"); // Opens the How to Play dialog
const howToPlayDialog = document.getElementById("how-to-play-dialog"); // How to Play dialog
const closeHowToPlayButton = document.getElementById("close-how-to-play"); // Closes the How to Play dialog

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
let opponentPresent = false; // Track whether the multiplayer opponent is still present

// Word data
let gameWords = []; // Store all possible solution words loaded from game_words.txt
let possibleGuesses = []; // Store all valid guesses loaded from possible_guesses.txt
let secretWord = ""; // Store the randomly selected single-player solution word

loadWordFiles(); // Load both word files before allowing the game to start

// Generate the game board
for (let row = 0; row < MAX_ATTEMPTS; row++) {
    // Create a row
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("board-row");
    rowDiv.setAttribute("role", "row");

    // Create the tiles within each row
    for (let column = 0; column < WORD_LENGTH; column++) {
        const tile = document.createElement("div");
        tile.classList.add("tile");
        tile.setAttribute("role", "cell");
        tile.setAttribute("aria-label", "Empty");

        rowDiv.appendChild(tile);
    }

    // Add the completed row to the board
    board.appendChild(rowDiv);
}

const boardTiles = board.querySelectorAll(".tile"); // Store all tiles on the main game board

// Generate the opponent's game board
for (let row = 0; row < MAX_ATTEMPTS; row++) {
    // Create a row
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("opponent-board-row");
    rowDiv.setAttribute("role", "row");

    // Create the tiles within each row
    for (let column = 0; column < WORD_LENGTH; column++) {
        const tile = document.createElement("div");
        tile.classList.add("opponent-tile");
        tile.setAttribute("role", "cell");
        tile.setAttribute("aria-label", "Empty");

        rowDiv.appendChild(tile);
    }

    // Add the completed row to the opponent's board
    opponentBoard.appendChild(rowDiv);
}

const opponentTiles = opponentBoard.querySelectorAll(".opponent-tile"); // Store all tiles on the opponent's game board

// Generate the on-screen game keyboard
for (const row of KEYBOARD_ROWS) {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("keyboard-row");

    for (const letter of row) {
        const keyButton = document.createElement("button");
        keyButton.textContent = letter === "BACKSPACE" ? "⌫" : letter;
        keyButton.classList.add("key");

        // Enter and Backspace keys are larger
        if (letter === "ENTER" || letter === "BACKSPACE") {
            keyButton.classList.add("wide-key");
        }

        // Give the Backspace key an accessible name
        if (letter === "BACKSPACE") {
            keyButton.setAttribute("aria-label", "Backspace");
        }

        // Handle user input
        keyButton.addEventListener("click", function() {
            handleKey(letter);
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

// Open the How to Play dialog
howToPlayButton.addEventListener("click", () => {
    howToPlayDialog.showModal();
});

// Close the How to Play dialog
closeHowToPlayButton.addEventListener("click", () => {
    howToPlayDialog.close();
});

// Physical keyboard events
document.addEventListener("keydown", function(event) {
    // Ignore keyboard input when How to Play menu is open
    if (howToPlayDialog.open) {
        return;
    }

    // Ignore game key input when typing into an input field
    if (event.target.closest("input")) {
        return;
    }

    // Ignore Enter key input when a button is focused
    if (event.target.closest("button") && event.key === "Enter") {
        return;
    }
    
    // Handle all game key input
    handleKey(event.key);
});

// Start a new single-player round or request a multiplayer rematch
playAgainButton.addEventListener("click", () => {
    if (multiplayerMode) {
        socket.emit("request-rematch");

        playAgainButton.hidden = true;
        multiplayerStatusMessage.textContent = "Waiting for opponent to accept rematch...";
    } else {
        playAgain();
    }
});

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
        boardTiles[currentTile].textContent = "";
        boardTiles[currentTile].setAttribute("aria-label", "Empty");
        return;
    }

    // Enter: submit guesses and call the checkGameEnd function to see if the game is over
    if (key === "ENTER" && currentTile === (currentRow + 1) * WORD_LENGTH) {
        let guess = "";
        const rowStart = currentRow * WORD_LENGTH;

        //Concatenate the guess into a string
        for (let i = rowStart; i < rowStart + WORD_LENGTH; i++) {
            guess += boardTiles[i].textContent;
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
        boardTiles[currentTile].textContent = key;
        boardTiles[currentTile].setAttribute("aria-label", key);
        currentTile++;
    }
}

// Check if guess is correct or not and change tile colors accordingly 
function checkGuess(guess) {
    const rowStart = currentRow * WORD_LENGTH;
    const remainingLetters = secretWord.split(""); // Convert the secret word into an array of individual letters

    // First pass: mark correct letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = boardTiles[rowStart + i];

        if (guess[i] === secretWord[i]) {
            tile.classList.add("correct");
            tile.setAttribute("aria-label", `${guess[i]}, correct position`);
            updateKeyboard(guess[i], "correct");
            remainingLetters[i] = null; //Remove letter from array, it has been accounted for
        }
    }

    // Second pass: mark present or absent letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = boardTiles[rowStart + i];

        //Letter correct, skip to next loop iteration
        if (guess[i] === secretWord[i]) {
            continue;
        }

        // Find the index of the guessed letter in the remaining unused letters
        const letterIndex = remainingLetters.indexOf(guess[i]);

        // If the letter was found, mark it present and use up that copy
        if (letterIndex !== -1) {
            tile.classList.add("present");
            tile.setAttribute("aria-label", `${guess[i]}, wrong position`);
            updateKeyboard(guess[i], "present");
            remainingLetters[letterIndex] = null; //Remove letter from array, it has been accounted for
        } else {
            tile.classList.add("absent");
            tile.setAttribute("aria-label", `${guess[i]}, not in word`);
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

            // Update the screen-reader label based on the letter's status
            if (status === "correct") {
                key.setAttribute("aria-label", `${letter}, correct position`);
            } else if (status === "present") {
                key.setAttribute("aria-label", `${letter}, wrong position`);
            } else {
                key.setAttribute("aria-label", `${letter}, not in word`);
            }

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
    for (const tile of boardTiles) {
        tile.textContent = "";
        tile.setAttribute("aria-label", "Empty");
        tile.classList.remove("correct", "present", "absent");
    }

    // Reset all opponent board tiles
    for (const tile of opponentTiles) {
        tile.setAttribute("aria-label", "Empty");
        tile.classList.remove("correct", "present", "absent");
    }

    // Reset all on-screen keyboard colors and accessibility labels
    const keys = document.querySelectorAll(".key");

    for (const key of keys) {
        key.classList.remove("correct", "present", "absent");

        // Reset accessible labels while preserving the Backspace label
        if (key.textContent !== "⌫") {
            key.removeAttribute("aria-label");
        }
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
    opponentBoardContainer.hidden = false; // Reveal opponent's game board
    opponentPresent = true; // Marks that the multiplayer opponent is present

    // Inform the player that the multiplayer game has begun
    multiplayerStatusMessage.classList.remove("opponent-departure-message");
    multiplayerStatusMessage.textContent = "Game started!";
    multiplayerStatusMessage.classList.add("game-start-message");

    // Clear the temporary game start message after 5 seconds
    setTimeout(() => {
        if (multiplayerStatusMessage.textContent === "Game started!") {
            multiplayerStatusMessage.textContent = "";
        }

        multiplayerStatusMessage.classList.remove("game-start-message");
    }, 5000);
});

// Display the result of a guess as decided by the multiplayer server
socket.on("guess-result", ({ guess, result }) => {
    const rowStart = currentRow * WORD_LENGTH;

    // Apply the server's result to each tile and keyboard letter
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = boardTiles[rowStart + i];
        tile.classList.add(result[i]);
        
        // Update the screen-reader label based on the guess result
        if (result[i] === "correct") {
            tile.setAttribute("aria-label", `${guess[i]}, correct position`);
        } else if (result[i] === "present") {
            tile.setAttribute("aria-label", `${guess[i]}, wrong position`);
        } else {
            tile.setAttribute("aria-label", `${guess[i]}, not in word`);
        }
        
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
        const tile = opponentTiles[rowStart + i];
        tile.classList.add(result[i]);

        // Update the screen-reader label without revealing the opponent's letters
        if (result[i] === "correct") {
            tile.setAttribute("aria-label", "Correct position");
        } else if (result[i] === "present") {
            tile.setAttribute("aria-label", "Wrong position");
        } else {
            tile.setAttribute("aria-label", "Not in word");
        }
    }

    // Move to the next row
    opponentRow++;
});

// Notify the player when their opponent disconnects
socket.on("opponent-disconnected", () => {
    opponentPresent = false;
    multiplayerStatusMessage.textContent = "Opponent disconnected";
    multiplayerStatusMessage.classList.remove("game-start-message");
    multiplayerStatusMessage.classList.add("opponent-departure-message");
    playAgainButton.hidden = true;
});

// Leave the current multiplayer game and return to single-player mode
leaveRoomButton.addEventListener("click", () => {
    socket.emit("leave-room"); // Tell the server to leave the room

    multiplayerMode = false; // Reset multiplayer flag

    // Remove multiplayer GUI
    leaveRoomButton.hidden = true;
    opponentBoardContainer.hidden = true;
    multiplayerStatusMessage.textContent = "";
    multiplayerStatusMessage.classList.remove("game-start-message", "opponent-departure-message");
    roomCodeDisplay.textContent = "";

    playAgain(); // Start a new single-player round
});

// Notify the player when their opponent leaves the game
socket.on("opponent-left", () => {
    opponentPresent = false;
    multiplayerStatusMessage.textContent = "Opponent left the game";
    multiplayerStatusMessage.classList.remove("game-start-message");
    multiplayerStatusMessage.classList.add("opponent-departure-message");
    playAgainButton.hidden = true;
});

// Handle the player winning the multiplayer game
socket.on("game-won", (message) => {
    gameMessage.textContent = message;
    gameOver = true;
    playAgainButton.hidden = false;
});

// Handle the player losing the multiplayer game
socket.on("game-lost", (message) => {
    gameMessage.textContent = message;
    gameOver = true;
    playAgainButton.hidden = !opponentPresent;
});

// Notify the player that their multiplayer opponent requested a rematch
socket.on("rematch-requested", () => {
    multiplayerStatusMessage.textContent = "Opponent requested a rematch.";
});