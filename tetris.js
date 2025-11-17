const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPiece');
const nextPieceCtx = nextPieceCanvas.getContext('2d');

// Game constants
const ROWS = 20;
const COLUMNS = 10;
const BLOCK_SIZE = 30;
const COLORS = ['#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];
const INITIAL_FALL_SPEED = 800;
const SPEED_INCREASE_INTERVAL = 30000;
const SPEED_INCREASE_FACTOR = 0.85;
const MOVE_DELAY = 100;
const INITIAL_MOVE_DELAY = 200;

// Game state
let board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
let currentShape;
let currentPosition;
let currentColor;
let nextShape;
let nextColor;
let score = 0;
let gameOver = false;
let isPaused = false;
let lastTime = 0;
let dropCounter = 0;
let gameLoopId;
let fallSpeed = INITIAL_FALL_SPEED;
let lastSpeedIncreaseTime = 0;
let completedLines = [];
let lastMoveTime = 0;
let isFirstMove = true;

// Mobile controls state
const mobileButtons = {
    left: false,
    right: false,
    up: false,
    down: false
};

// Tetris shapes
const SHAPES = [
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1], [1, 1]],        // O
    [[1, 1, 0], [0, 1, 1]],  // S
    [[0, 1, 1], [1, 1, 0]],  // Z
    [[1, 1, 1, 1]],          // I
    [[1, 0, 0], [1, 1, 1]],  // L
    [[0, 0, 1], [1, 1, 1]]   // J
];

// Initialize game
function init() {
    // Set canvas sizes
    canvas.width = COLUMNS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    nextPieceCanvas.width = 5 * BLOCK_SIZE;
    nextPieceCanvas.height = 5 * BLOCK_SIZE;
    
    // Adjust for mobile screens
    if (window.innerWidth <= 768) {
        const gameContainer = document.getElementById('gameContainer');
        const viewportHeight = window.innerHeight;
        gameContainer.style.minHeight = `${viewportHeight}px`;
    }
    
    startGame();
    setupEventListeners();
}

// Start new game
function startGame() {
    board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
    score = 0;
    updateScore();
    gameOver = false;
    isPaused = false;
    fallSpeed = INITIAL_FALL_SPEED;
    lastSpeedIncreaseTime = 0;
    completedLines = [];
    lastMoveTime = 0;
    isFirstMove = true;
    
    nextShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    nextColor = COLORS[SHAPES.indexOf(nextShape)];
    generateNewShape();
    
    document.getElementById('gameOver').style.display = 'none';
    
    lastTime = performance.now();
    dropCounter = 0;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = window.requestAnimationFrame(gameLoop);
}

// Generate new tetromino
function generateNewShape() {
    currentShape = nextShape;
    currentColor = nextColor;
    currentPosition = { 
        x: Math.floor(COLUMNS / 2) - Math.floor(currentShape[0].length / 2), 
        y: 0 
    };
    
    nextShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    nextColor = COLORS[SHAPES.indexOf(nextShape)];
    drawNextPiece();
    
    if (collision()) {
        gameOver = true;
        showGameOver();
    }
}

// Main game loop
function gameLoop(time = 0) {
    if (gameOver) return;
    if (isPaused) {
        gameLoopId = window.requestAnimationFrame(gameLoop);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;

    // Increase speed over time
    if (time - lastSpeedIncreaseTime > SPEED_INCREASE_INTERVAL) {
        fallSpeed *= SPEED_INCREASE_FACTOR;
        lastSpeedIncreaseTime = time;
    }

    // Handle mobile controls
    if (mobileButtons.left && canMove('left', time)) {
        movePiece(-1, 0);
        lastMoveTime = time;
    }
    if (mobileButtons.right && canMove('right', time)) {
        movePiece(1, 0);
        lastMoveTime = time;
    }
    if (mobileButtons.up && canMove('up', time)) {
        rotatePiece();
        lastMoveTime = time;
    }
    if (mobileButtons.down && canMove('down', time)) {
        movePiece(0, 1);
        lastMoveTime = time;
    }
    
    // Automatic falling
    dropCounter += deltaTime;
    if (dropCounter > fallSpeed) {
        movePiece(0, 1);
        dropCounter = 0;
    }

    draw();
    gameLoopId = window.requestAnimationFrame(gameLoop);
}

// Check if enough time has passed for next move
function canMove(direction, currentTime) {
    return currentTime - lastMoveTime >= (isFirstMove ? INITIAL_MOVE_DELAY : MOVE_DELAY);
}

// Draw game state
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMatrix(board, {x: 0, y: 0});
    if (!gameOver) {
        drawPiece(currentShape, currentPosition, currentColor);
    }
}

// Draw the game board
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const isCompletedLine = completedLines.includes(y);
                ctx.fillStyle = isCompletedLine ? '#FFFFFF' : value;
                ctx.fillRect(
                    (x + offset.x) * BLOCK_SIZE, 
                    (y + offset.y) * BLOCK_SIZE, 
                    BLOCK_SIZE, 
                    BLOCK_SIZE
                );
                ctx.strokeStyle = '#000';
                ctx.strokeRect(
                    (x + offset.x) * BLOCK_SIZE, 
                    (y + offset.y) * BLOCK_SIZE, 
                    BLOCK_SIZE, 
                    BLOCK_SIZE
                );
            }
        });
    });
}

// Draw current tetromino
function drawPiece(shape, pos, color) {
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = color;
                ctx.fillRect(
                    (pos.x + x) * BLOCK_SIZE,
                    (pos.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                ctx.strokeStyle = '#000';
                ctx.strokeRect(
                    (pos.x + x) * BLOCK_SIZE,
                    (pos.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// Draw next piece preview
function drawNextPiece() {
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    const offsetX = (5 - nextShape[0].length) / 2;
    const offsetY = (5 - nextShape.length) / 2;
    
    nextShape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                nextPieceCtx.fillStyle = nextColor;
                nextPieceCtx.fillRect(
                    (x + offsetX) * BLOCK_SIZE,
                    (y + offsetY) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                nextPieceCtx.strokeStyle = '#000';
                nextPieceCtx.strokeRect(
                    (x + offsetX) * BLOCK_SIZE,
                    (y + offsetY) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// Move tetromino
function movePiece(dx, dy) {
    const newPos = {
        x: currentPosition.x + dx,
        y: currentPosition.y + dy
    };
    
    if (!collision(newPos, currentShape)) {
        currentPosition = newPos;
        return true;
    } else if (dy > 0) {
        placePiece();
        checkCompletedLines();
        generateNewShape();
    }
    return false;
}

// Rotate tetromino
function rotatePiece() {
    const rotated = rotateMatrix(currentShape);
    if (!collision(currentPosition, rotated)) {
        currentShape = rotated;
    }
}

// Matrix rotation helper
function rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const newMatrix = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            newMatrix[c][rows - 1 - r] = matrix[r][c];
        }
    }
    return newMatrix;
}

// Check for collisions
function collision(pos = currentPosition, shape = currentShape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const x = pos.x + c;
                const y = pos.y + r;
                
                if (x < 0 || x >= COLUMNS || y >= ROWS) {
                    return true;
                }
                
                if (y >= 0 && board[y][x]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Place tetromino on board
function placePiece() {
    currentShape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const py = currentPosition.y + y;
                const px = currentPosition.x + x;
                if (py >= 0) {
                    board[py][px] = currentColor;
                }
            }
        });
    });
}

// Check for completed lines
function checkCompletedLines() {
    completedLines = [];
    
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== null)) {
            completedLines.push(r);
        }
    }
    
    if (completedLines.length > 0) {
        score += completedLines.length * 100;
        updateScore();
        
        setTimeout(() => {
            for (let r of completedLines) {
                for (let y = r; y > 0; y--) {
                    board[y] = [...board[y-1]];
                }
                board[0] = Array(COLUMNS).fill(null);
            }
            completedLines = [];
        }, 600);
    }
}

// Hard drop function
function hardDrop() {
    while(movePiece(0, 1));
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
}

// Show game over screen
function showGameOver() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'flex';
}

// Toggle pause state
function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
    
    if (!isPaused) {
        lastTime = performance.now();
        dropCounter = 0;
        gameLoopId = window.requestAnimationFrame(gameLoop);
    }
}

// Handle mobile button press
function handleMobileAction(action) {
    switch(action) {
        case 'move-left': 
            mobileButtons.left = true;
            isFirstMove = true;
            break;
        case 'move-right': 
            mobileButtons.right = true;
            isFirstMove = true;
            break;
        case 'rotate': 
            mobileButtons.up = true;
            isFirstMove = true;
            break;
        case 'move-down':
            mobileButtons.down = true;
            isFirstMove = true;
            break;
        case 'hard-drop':
            hardDrop();
            break;
    }
}

// Handle mobile button release
function handleMobileRelease(action) {
    isFirstMove = true;
    switch(action) {
        case 'move-left': mobileButtons.left = false; break;
        case 'move-right': mobileButtons.right = false; break;
        case 'rotate': mobileButtons.up = false; break;
        case 'move-down': mobileButtons.down = false; break;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', e => {
        if (gameOver && e.key === 'Enter') {
            startGame();
            return;
        }
        
        if (isPaused && e.key !== 'p') return;
        
        switch(e.key) {
            case 'ArrowLeft': movePiece(-1, 0); break;
            case 'ArrowRight': movePiece(1, 0); break;
            case 'ArrowDown': movePiece(0, 1); break;
            case 'ArrowUp': rotatePiece(); break;
            case ' ': hardDrop(); break;
            case 'p': togglePause(); break;
        }
    });
    
    // Button controls
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    
    // Mobile touch controls
    const mobileBtns = document.querySelectorAll('.mobile-btn');
    mobileBtns.forEach(btn => {
        const action = btn.dataset.action;
        
        // Touch events
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleMobileAction(action);
            btn.classList.add('active');
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleMobileRelease(action);
            btn.classList.remove('active');
        });
        
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            handleMobileRelease(action);
            btn.classList.remove('active');
        });
        
        // Mouse events (for testing on desktop)
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleMobileAction(action);
            btn.classList.add('active');
        });
        
        btn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            handleMobileRelease(action);
            btn.classList.remove('active');
        });
        
        btn.addEventListener('mouseleave', (e) => {
            e.preventDefault();
            handleMobileRelease(action);
            btn.classList.remove('active');
        });
    });
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', init);