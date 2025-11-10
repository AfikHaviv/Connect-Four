# 🎮 Connect Four Multiplayer

A full-stack **Connect Four** game built with **Node.js**, **MySQL**, and **vanilla JavaScript**.
Players can join a shared board and compete in real-time, with the game state managed by a MySQL database.

---

## Features

* Two-player online Connect Four.
* Real-time board updates using periodic sync requests.
* MySQL database stores board state and players.
* Lightweight Node.js backend (no frameworks).
* Modern UI with HTML, CSS, and Canvas.
* Local setup — no external services required.

---

## Project Structure

This is the structure of the **repository**:

```text
connect-four/
│
├─ files/
│  ├─ index.html       # Main game UI
│  ├─ script.js        # Client-side logic (drawing, syncing, gameplay)
│  └─ style.css        # Visual theme and layout
│
├─ server.js           # HTTP server for static files + API routes
├─ api.js              # Backend game logic (MySQL queries)
├─ package.json        # Node.js project configuration
├─ .gitignore          # Files ignored by Git
└─ README.md           # This file
```

You will also have **local configuration files** that are *not committed* to GitHub (explained below).

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/AfikHaviv/connect-four.git
cd connect-four
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Create the MySQL database

Start MySQL and run:

```sql
CREATE DATABASE connect4;
USE connect4;

CREATE TABLE boards (
  board_id INT AUTO_INCREMENT PRIMARY KEY,
  board JSON NOT NULL,
  player1_id VARCHAR(255),
  player2_id VARCHAR(255),
  curr_player INT DEFAULT 1,
  winner INT DEFAULT 0
);
```

### 4️⃣ Create environment variables

Create a file named `.env` in the project root (this file stays local):

```text
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=connect4
```

### 5️⃣ Create `connParams.js` (local only)

Create a file named `connParams.js` in the root directory:

```js
require('dotenv').config();

function getConnParams() {
  return {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  };
}

module.exports = { getConnParams };
```

> This file is also **not** pushed to GitHub (it’s ignored via `.gitignore`).

### 6️⃣ Start the server

```bash
npm start
```

### 7️⃣ Play the game

Open your browser and go to [http://localhost:3000](http://localhost:3000)

* The first player that joins becomes **Player 1 (Red)**.
* The second player to join becomes **Player 2 (Yellow)**.
* The third player that joins will open a new board and becomes **Player 1 (Red)**.

---

## How It Works

* **`server.js`**

  * Uses Node’s built-in `http` module to serve static files from the `files/` directory.
  * Routes any request starting with `/api/` to the functions in `api.js`.

* **`api.js`**

  * Manages all game logic and MySQL operations:

    * Creating new boards.
    * Joining available boards.
    * Handling moves and switching turns.
    * Detecting wins or draws.

* **`files/script.js`**

  * Draws the game board using HTML `<canvas>`.
  * Sends moves to the backend.
  * Polls `/api/checkWin` regularly to update the board and show the winner.

---

## Tech Stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| Backend  | Node.js (http module), MySQL2  |
| Frontend | HTML, CSS, JavaScript (Canvas) |
| Database | MySQL                          |
| Config   | dotenv (.env for credentials)  |

---

## Future Improvements

* Use WebSockets for instant updates instead of polling.
* Add persistent user profiles and leaderboards.
* Deploy backend on Render / Railway with hosted MySQL (PlanetScale, ClearDB).
* Add animations and sound effects.

---

## Author

**Afik Haviv**\
🎓 B.Sc. Computer Science @ HIT\
💼 Software Engineer / Game & Algorithm Enthusiast\
🔗 [LinkedIn](https://www.linkedin.com/in/afikhaviv) • [GitHub](https://github.com/<your-username>)

---

## 🛪️ License

This project is open-source under the [MIT License](LICENSE).
