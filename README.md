# Wordly Battles

Inspired by The New York Times’ Wordle, **Wordly Battles** is an online word-guessing game featuring a single-player mode and a real-time 1v1 multiplayer mode, where friends compete to guess the word first. With over 2,500 playable words and unlimited replays, the game offers endless word-guessing challenges on both desktop and mobile devices.

**Play Now:** [https://wordly-battles.onrender.com/](https://wordly-battles.onrender.com/)

## Features

- **Single-player:** Play unlimited word-guessing puzzles.
- **Real-time multiplayer:** Create or join a private room using a room code and compete against a friend.
- **Live opponent progress:** Track your opponent's guesses and play rematches.
- **Word validation:** Submit guesses checked against an extensive word list.
- **Responsive design:** Play on desktop or mobile devices.
- **Accessibility:** Keyboard navigation and screen-reader support.

## Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Real-time communication:** Socket.IO
- **Hosting:** Render
- **Version control:** Git and GitHub

## Running Locally
1. Ensure that Node.js is installed on your device. Otherwise, download here: [Node.js](https://nodejs.org/)
2. Clone the repository and open it in your terminal.
3. Install the server dependencies:
   ```bash
   cd server
   npm install
   ```
4. Start the server:
   ```bash
   node server.js
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

To test multiplayer locally, open the game in two browser windows. Create a room in one, and join it from the other.

## Project Structure

```text
wordly-battles/
├── public/             # Website files and word lists
├── server/             # Express and Socket.IO backend
├── data/               # Word-list source files
└── python scripts/     # Word-list processing utilities
```

## Acknowledgments

- Inspired by [Wordle](https://www.nytimes.com/games/wordle/index.html) from The New York Times. Wordly Battles is an independent project and is not affiliated with The New York Times.
- Custom word list derived from the [English Speller Database (ESDB)](https://wordlist.aspell.net/), maintained by Kevin Atkinson. Further details in the repository's [THIRD_PARTY_LICENSES](https://github.com/MarkoGutierro/Wordly-Battles/blob/main/THIRD_PARTY_LICENSES.txt) file.
