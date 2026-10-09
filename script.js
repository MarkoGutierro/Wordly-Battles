//Global Vars
const board = document.getElementById("board"); // Game board
const keyboard = document.getElementById("keyboard"); // Game keyboard
const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"]
]; // Store the three rows of keyboard letters
const endMessage = document.getElementById("end-message"); // Message when game is over
const playAgainButton = document.getElementById("play-again"); // Get the Play Again button
const socket = io("http://localhost:3000"); // Connect to the multiplayer server
const multiplayerButton = document.getElementById("multiplayer-button"); // Multiplayer button
const roomCodeDisplay = document.getElementById("room-code-display"); // Multiplayer room code
const roomCodeInput = document.getElementById("room-code-input"); //  // Room code input field
const joinRoomButton = document.getElementById("join-room-button");// Join multiplayer room button
const multiplayerErrorMessage = document.getElementById("multiplayer-error-message"); // Temporary multiplayer error messages
const gameStartingMessage = document.getElementById("game-starting-message"); // Let players know a multiplayer game is starting 

let currentTile = 0; // Track the current tile the player can type into
let currentRow = 0; // Track the row the player is currently guessing on
let filesReady = false; // Tracks whether both word files have finished loading
let gameOver = false; // Tracks if game is still ongoing
let gameWords = []; // Stores all possible solution words loaded from game_words.txt
let possibleGuesses = []; // Stores all valid guess words loaded from possible_guesses.txt
let secretWord = ""; // Stores the randomly selected solution for the current game

loadWordFiles(); // Load both word files before allowing the game to start

// Generate the game board
for (let i = 0; i < 30; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    board.appendChild(tile);
}

// Generate the on-screen game keyboard
for (const row of keyboardRows) {
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
    if (key === "BACKSPACE" && currentTile > currentRow * 5) {
        currentTile--;
        board.children[currentTile].textContent = "";
        return;
    }

    // Enter: submit guesses and call the checkGameEnd function to see if the game is over
    if (key === "ENTER" && currentTile === (currentRow + 1) * 5) {
        let guess = "";
        const rowStart = currentRow * 5;

        //Concatenate the guess into a string
        for (let i = rowStart; i < rowStart + 5; i++) {
            guess += board.children[i].textContent;
        }

        // Reject the guess if it is not in the valid guess list
        if (!possibleGuesses.includes(guess)) {
            endMessage.textContent = "Not a valid word";

            setTimeout(() => {
                endMessage.textContent = "";
            }, 2000);

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
        currentTile < (currentRow + 1) * 5 &&
        currentRow < 6
    ) {
        board.children[currentTile].textContent = key;
        currentTile++;
    }
}

// Check if guess is correct or not and change tile colors accordingly 
function checkGuess(guess) {
    const rowStart = currentRow * 5;
    const remainingLetters = secretWord.split(""); // Convert the secret word into an array of individual letters

    // First pass: mark correct letters
    for (let i = 0; i < 5; i++) {
        const tile = board.children[rowStart + i];

        if (guess[i] === secretWord[i]) {
            tile.classList.add("correct");
            updateKeyboard(guess[i], "correct");
            remainingLetters[i] = null; //Remove letter from array, it has been accounted for
        }
    }

    // Second pass: mark present or absent letters
    for (let i = 0; i < 5; i++) {
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
        endMessage.textContent = "You win!";
        gameOver = true;
        playAgainButton.hidden = false;
        return;
    }

    //loser :(
    if (currentRow === 6) {
        endMessage.textContent = `Game over! The word was ${secretWord}.`;
        gameOver = true;
        playAgainButton.hidden = false;
    }
}

// Reset the game and choose a new solution word
function playAgain() {
    // Reset global game vars back to starting values
    currentTile = 0;
    currentRow = 0;
    gameOver = false;

    // Generate a new solution word
    secretWord = gameWords[Math.floor(Math.random() * gameWords.length)];

    // Remove play again button and end message
    endMessage.textContent = "";
    playAgainButton.hidden = true;

    // Reset tile board 
    for (const tile of board.children) {
        tile.textContent = "";
        tile.classList.remove("correct", "present", "absent");
    }

    const keys = document.querySelectorAll(".key");

    // Reset on-screen keyboard
    for (const key of keys) {
        key.classList.remove("correct", "present", "absent");
    }

    console.log(secretWord); // Display new solution word
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
    multiplayerErrorMessage.textContent = message; // Display the error message

    // Error message only displays for 2 seconds
    setTimeout(() => {
        multiplayerErrorMessage.textContent = "";
    }, 2000);
});

// Start a multiplayer game once two players are connected to the same room
socket.on("game-start", (multiplayerSecretWord) => {
    secretWord = multiplayerSecretWord; // Use the server-selected multiplayer solution word

    // Inform the player that the multiplayer game is about to begin
    gameStartingMessage.textContent = "Opponent connected! Starting game...";
    console.log(`Multiplayer secret word: ${secretWord}`);
});