let mysql = require('mysql2');
let connPa = require('./connParams.js');
let connParams = connPa.getConnParams();

let numRows = 6;
let numCols = 7;


let pool = mysql.createPool(connParams);


let defaultBoard = [[0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0],
             [0, 0, 0, 0, 0, 0, 0]];

function newPlayer(req, res, q) {
    let playerName = q['player'];
    if (!playerName) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: "Missing player name"}));
        return;
    }
    pool.getConnection((err, conn) => {
        if (err) {
            console.error("Error getting connection from pool: ", err); 
            res.writeHead(500);
            res.end();
            return;
        }
        conn.query("SELECT board_id FROM boards WHERE player2_id IS NULL AND player1_id IS NOT NULL", [], (err, result) => {
            if (err) {
                console.error("Error executing query: ", err);
                conn.release();
                res.writeHead(500);
                res.end();
                return;
            }
            if (result.length != 0) {
                // If there's an available board, join it
                let boardId = result[0].board_id;
                conn.query("UPDATE boards SET player2_id = ? WHERE board_id = ?", [playerName, boardId], (err, result) => {
                    conn.release();
                    if (err) {
                        console.error("Error executing query: ", err);
                        res.writeHead(500);
                        res.end();
                        return;
                    }
                    if (result.affectedRows != 1) {
                        res.writeHead(404);
                        res.end();
                        return;
                    }
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({
                        board_id: boardId,
                        player_id: playerName,
                        my_player: 2   // you are Player 2
                    }));
                });
            } else {
                conn.release();
                // No available board, create a new one
                createNewBoard(req, res, q);
            }
        });
    });
}

function createNewBoard(req, res, q) {
    let player1_id = q['player'];
    if (!player1_id) {
        res.writeHead(500);
        res.end();
        return;
    }
    pool.getConnection((err, conn) => {
        if (err) {
            console.error("Error getting connection from pool: ", err);
            res.writeHead(500);
            res.end();
            return;
        }
        conn.query("INSERT INTO boards (board, player1_id, curr_player) VALUES (?, ?, ?)", [JSON.stringify(defaultBoard), player1_id, 1], (err, result) => {
            if (err) {
                console.error("Error executing query: ", err);
                conn.release();
                res.writeHead(500);
                res.end();
                return;
            }
            conn.release();
            console.log("New board created with ID: ", result.insertId);
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
                board_id: result.insertId,
                player_id: player1_id,
                my_player: 1   // you are Player 1
            }));
            return;
        });
    });
}

function makeMove(req, res, q) {
    let column = parseInt(q['column']);
    let playerId = q['player'];
    let boardId = parseInt(q['board_id']);
    processMove(column, playerId, boardId, res);
}

function processMove(column, playerId, boardId, res) {
    if (isNaN(column) || column < 0 || column >= numCols || !playerId || isNaN(boardId)) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: "Invalid move"}));
        return;
    }
    pool.getConnection((err, conn) => {
        if (err) {
            console.error("Error getting connection from pool: ", err);
            res.writeHead(500);
            res.end();
            return;
        }
        conn.query("SELECT board, player1_id, player2_id, curr_player, winner FROM boards WHERE board_id = ?", [boardId], (err, result) => {
            if (err) {
                console.error("Error executing query: ", err);
                conn.release();
                res.writeHead(500);
                res.end();
                return;
            }
            if (result.length != 1) {
                conn.release();
                res.writeHead(404);
                res.end();
                return;
            }
            if (result[0].winner) {
                conn.release();
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: "Game over"}));
                return;
            }
            if (result[0].player2_id == null) {
                conn.release();
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: "Waiting for Player 2"}));
                return;
            }
            if (playerId != result[0].player1_id && playerId != result[0].player2_id) {
                conn.release();
                res.writeHead(404);
                res.end();
                return;
            }
            let playerNum;
            if(playerId == result[0].player1_id) playerNum = 1;
            else playerNum = 2;
            if (playerNum != result[0].curr_player) {
                conn.release();
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: "Not your turn"}));
                return;
            }
            console.log("Current board state: ", result[0].board);
            let currBoard = result[0].board; 
            let targetRow = -1;

            for (let row = numRows - 1; row >= 0; row--) {
                if (currBoard[row][column] == 0) {
                    targetRow = row;
                    break;
                }
            }
            if (targetRow == -1) {
                conn.release();
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: "Column is full"}));
                return; // Column is full
            }

            currBoard[targetRow][column] = playerNum;
            let winningPos = detectWinner(currBoard);
            if (winningPos.winner != 0) {
                // If there's a winner, set curr_player to 0
                conn.query("UPDATE boards SET board = ?, curr_player = 0, winner = ? WHERE board_id = ?", [JSON.stringify(currBoard), winningPos.winner, boardId], (err, result) => {
                    conn.release();
                    if (err || result.affectedRows != 1) {
                        console.error("Error executing query: ", err);
                        res.writeHead(500);
                        res.end();
                        return;
                    }
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({board: currBoard, winner: winningPos.winner, winningPositions: winningPos.positions}));
                    return;
                });
            }
            conn.query("UPDATE boards SET board = ?, curr_player = ? WHERE board_id = ?", [JSON.stringify(currBoard), playerNum == 1 ? 2 : 1, boardId], (err, result) => {
                conn.release();
                if (err) {
                    console.error("Error executing query: ", err);
                    res.writeHead(500);
                    res.end();
                    return;
                }
                if (result.affectedRows != 1) {
                    res.writeHead(500);
                    res.end();
                    return;
                }
                if (winningPos.winner == 0) {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({board: currBoard, winner: winningPos.winner, curr_player: playerNum == 1 ? 2 : 1}));
                    return;
                }
            });
        });
    });
}

function checkWin(req, res, q) {
    let boardId = parseInt(q['board_id']);
    if (isNaN(boardId)) {
        res.writeHead(500);
        res.end();
        return;
    }
    pool.getConnection((err, conn) => {
        if (err) {
            console.error("Error getting connection from pool: ", err);
            res.writeHead(500);
            res.end();
            return;
        }
        conn.query("SELECT board, curr_player, winner, player2_id, player1_id FROM boards WHERE board_id = ?", [boardId], (err, result) => {
            if (err) {
                console.error("Error executing query: ", err);
                conn.release();
                res.writeHead(500);
                res.end();
                return;
            }
            if (result.length != 1) {
                res.writeHead(404);
                conn.release();
                res.end();
                return;
            }
            if (!result[0].player2_id) {
                conn.release();
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: "Waiting for Player 2..."}));
                return;
            }

            let currBoard = result[0].board;
            let curr = result[0].curr_player || 1;

            let actualWinner = detectWinner(currBoard);

            if (actualWinner.winner != 0) {
                conn.query("UPDATE boards SET winner = ? WHERE board_id = ?", [actualWinner.winner, boardId], (err, result) => {
                    conn.release();
                    if (err) {
                        console.error("Error executing query: ", err);
                        res.writeHead(500);
                        res.end();
                        return;
                    }   
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({board: currBoard, winner: actualWinner.winner, winningPositions: actualWinner.positions, curr_player: curr}));
                    return;
                });
            }
            else{
                conn.release();
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({board: currBoard, winner: actualWinner.winner || 0, curr_player: curr}));
                return;
            }
        });
    });
}

function detectWinner(board){
    // 0 = game continues, 1/2 = winner, 3 = draw
    let hasEmpty = false;
    let winningPositions = {positions: [], winner: 0};

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            let p = board[row][col];
            if (p == 0) { 
                hasEmpty = true; 
                continue; 
            }
            // horizontal →
            if (col <= numCols - 4 && board[row][col+1] == p && board[row][col+2] == p && board[row][col+3] == p){
                winningPositions = {positions: [[row, col], [row, col+1], [row, col+2], [row, col+3]],
                    winner: p
                };
                return winningPositions;
            }

            // vertical ↓
            if (row <= numRows - 4 && board[row+1][col] == p && board[row+2][col] == p && board[row+3][col] == p) {
                winningPositions = {positions: [[row, col], [row+1, col], [row+2, col], [row+3, col]],
                    winner: p
                };
                return winningPositions;
            }

            // diagonal ↘
            if (row <= numRows - 4 && col <= numCols - 4 && board[row+1][col+1] == p && board[row+2][col+2] == p && board[row+3][col+3] == p) {
                winningPositions = {positions: [[row, col], [row+1, col+1], [row+2, col+2], [row+3, col+3]],
                    winner: p
                };
                return winningPositions;
            }

            // diagonal ↙
            if (row <= numRows - 4 && col >= 3 && board[row+1][col-1] == p && board[row+2][col-2] == p && board[row+3][col-3] == p) {
                winningPositions = {positions: [[row, col], [row+1, col-1], [row+2, col-2], [row+3, col-3]],
                    winner: p
                };
                return winningPositions;
            }
        }
    }
    if (hasEmpty) 
        return {positions: [], winner: 0}; // game continues
    else    
        return {positions: [], winner: 3};
}



exports.newPlayer = newPlayer;
exports.makeMove = makeMove;
exports.checkWin = checkWin;

    
