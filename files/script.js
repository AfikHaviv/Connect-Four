
let canvas = document.getElementById('connectFourCanvas');
let ctx = canvas.getContext('2d');
let currentPlayerLabel = document.getElementById('currentPlayerLabel');
let myName = document.getElementById('myName');


let numRows = 6;
let numCols = 7;
let cellSize = 100; // Size of each cell (including padding for circles)
let boardColor = '#1a2046'; // color for the board
let player1Color = '#ff6b6b';
let player2Color = '#f7d154';
let circleRadius = cellSize / 2 - 5; // Radius of the holes/circles

newPlayer();

function sendHttpGetRequest(url, callback) {
    let request = new XMLHttpRequest();
    request.onreadystatechange = ()=>{
        if (request.readyState == 4 && (request.status == 200 || request.status == 400)) {
            callback(request.responseText);
        }
    };
    request.open("GET", url, true);
    request.send();
}

function newPlayer(){
    let playerName = prompt("Enter your name:");
    if (!playerName) return;

    sendHttpGetRequest('/api/newPlayer?player=' + playerName, function(response){
        let result = JSON.parse(response);
        if (!result.player_id || !result.board_id || !result.my_player) {
            alert("Error creating player. Please try again.");
            return;
        }
        window.player_id = result.player_id;
        window.board_id   = result.board_id;
        window.my_player  = result.my_player;
        myName.innerHTML = "Name: " + playerName + (result.my_player == 1 ? " (Player 1 - red)" : " (Player 2 - yellow)");

        drawBoard();
        startSync(window.board_id, window.my_player); //start pulling from server
    });
}

function setButtonsEnabled(enabled) {
    let buttons = document.getElementsByClassName('columnSelection');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = !enabled;
    }
}

function drawMoves(board){
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            if (board[r][c] == 1) {
                ctx.fillStyle = player1Color;
            } else if (board[r][c] == 2) {
                ctx.fillStyle = player2Color;
            } else {
                ctx.fillStyle = 'white';
            }
            let centerX = c * cellSize + cellSize / 2;
            let centerY = r * cellSize + cellSize / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function drawWinningPositions(positions, winner) {
    ctx.strokeStyle = "lime";
    let color = (winner == 1) ? player1Color : player2Color;
    ctx.lineWidth = 5;

    positions.forEach(pos => {
        let centerX = pos[1] * cellSize + cellSize / 2;
        let centerY = pos[0] * cellSize + cellSize / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
    });
}

function startSync(board_id, my_player) {
    function sync(){
        sendHttpGetRequest('/api/checkWin?board_id=' + board_id, (response) => {
            let result = JSON.parse(response);
            let board = result.board;
            let win = result.winner || 0;
            let turn = result.curr_player || 1;
            let error = result.error || null;
            let winningPositions = result.winningPositions || null;
            
            drawBoard();
            if(board){
                drawMoves(board);
            }
            if (winningPositions && win != 0){
                drawWinningPositions(winningPositions, win);
            }

            if (error) {
                currentPlayerLabel.innerHTML = error;
                setButtonsEnabled(false); // disable buttons while waiting for second player
                setTimeout(sync, 1000);
                return;
            }
           
            if (win == 3) {
                currentPlayerLabel.innerHTML = "It's a tie! Refresh the page to play again.";
                currentPlayerLabel.style.color = "orange";
                setButtonsEnabled(false);
                return;
            } else if (win == 1 || win == 2) {
                if ( win == my_player ) {
                    currentPlayerLabel.innerHTML = "Congratulations! You are the winner!";
                    myName.innerHTML = "Refresh the page to play again";
                    myName.style.color = "white";
                    currentPlayerLabel.style.color = "lime";
                } else {
                    currentPlayerLabel.innerHTML = "You lost! Player " + win + " won";
                    myName.innerHTML = "Refresh the page to play again";
                    myName.style.color = "white";
                    currentPlayerLabel.style.color = "red";
                }
                setButtonsEnabled(false);
                return;
            } else {
            currentPlayerLabel.innerHTML = "Current Player: Player " + turn;
            let myTurn = (turn == my_player);
            setButtonsEnabled(myTurn);
            }
            setTimeout(sync, 500);
        });     
    }
    sync();
}

function makeMove(btn) {
    if (btn.disabled) return;
    let col = parseInt(btn.id.replace('column',''), 10);
    sendHttpGetRequest('/api/makeMove?board_id=' + window.board_id + '&column=' + col + '&player=' + window.player_id, (response) => {
        let result = JSON.parse(response);
        if (result && result.board) {
            drawBoard();
            drawMoves(result.board);
        }
        if (result.error) {
            currentPlayerLabel.innerHTML = "Error: " + result.error;
            startSync(window.board_id, window.my_player); // restart sync to get back in sync with server
        }
        if (result.winner){
            if (result.winner == 3){
                currentPlayerLabel.innerHTML = "It's a tie! Refresh the page to play again.";
                setButtonsEnabled(false);
                return;
            }
            else{
                currentPlayerLabel.innerHTML = "Winner: Player " + result.winner + ". Refresh the page to play again.";
                setButtonsEnabled(false);
                return;
            }
        }
    });
}

function drawBoard() {
    // Draw the main blue rectangle
    ctx.fillStyle = boardColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw the circular holes
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const centerX = col * cellSize + cellSize / 2;
            const centerY = row * cellSize + cellSize / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
        }
    }   
}


