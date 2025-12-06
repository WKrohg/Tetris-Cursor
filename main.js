/**
 * Tetris Clone - Refactored Architecture
 * 
 * Architecture Overview:
 * - Board: Manages the 10×20 game board state and rendering
 * - Piece: Handles tetromino operations (rotation, movement, collision)
 * - Game: Coordinates game loop, input, gravity, scoring, and state management
 * 
 * All algorithms are constant-time with respect to board size:
 * - Collision detection only inspects current piece cells
 * - Line clearing scans only the 20 rows
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 30; // Each cell is 30x30 pixels

// Tetromino definitions (shapes as 2D arrays)
// Each tetromino is defined by its shape matrix and color
const TETROMINOS = {
    I: {
        shape: [[1, 1, 1, 1]],
        color: '#00f0f0' // Cyan
    },
    O: {
        shape: [
            [2, 2],
            [2, 2]
        ],
        color: '#f0f000' // Yellow
    },
    T: {
        shape: [
            [0, 3, 0],
            [3, 3, 3]
        ],
        color: '#a000f0' // Purple
    },
    S: {
        shape: [
            [0, 4, 4],
            [4, 4, 0]
        ],
        color: '#00f000' // Green
    },
    Z: {
        shape: [
            [5, 5, 0],
            [0, 5, 5]
        ],
        color: '#f00000' // Red
    },
    J: {
        shape: [
            [6, 0, 0],
            [6, 6, 6]
        ],
        color: '#0000f0' // Blue
    },
    L: {
        shape: [
            [0, 0, 7],
            [7, 7, 7]
        ],
        color: '#f0a000' // Orange
    }
};

// Color mapping for board cells
// 0 = empty, positive integers = filled (1=I, 2=O, 3=T, 4=S, 5=Z, 6=J, 7=L)
const COLORS = {
    0: '#000',      // Empty
    1: '#00f0f0',   // I - Cyan
    2: '#f0f000',   // O - Yellow
    3: '#a000f0',   // T - Purple
    4: '#00f000',   // S - Green
    5: '#f00000',   // Z - Red
    6: '#0000f0',   // J - Blue
    7: '#f0a000'    // L - Orange
};

// ============================================================================
// BOARD MODULE
// ============================================================================
// Manages the 10×20 game board state and rendering operations

const Board = {
    // Board state: 10 columns × 20 rows
    // 0 = empty, positive integers = filled cells
    cells: [],
    
    // Initialize empty board
    init() {
        this.cells = [];
        for (let row = 0; row < ROWS; row++) {
            this.cells[row] = [];
            for (let col = 0; col < COLS; col++) {
                this.cells[row][col] = 0;
            }
        }
    },
    
    // Get cell value at position
    getCell(row, col) {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
            return -1; // Out of bounds
        }
        return this.cells[row][col];
    },
    
    // Set cell value at position
    setCell(row, col, value) {
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            this.cells[row][col] = value;
        }
    },
    
    // Render the board on canvas
    draw(ctx) {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cellValue = this.cells[row][col];
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                
                // Draw cell
                ctx.fillStyle = COLORS[cellValue] || '#000';
                ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
                
                // Draw grid lines
                ctx.strokeStyle = '#333';
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    },
    
    // Clear full lines and return number of lines cleared
    // Constant-time: only scans the 20 rows
    clearFullLines() {
        const linesToClear = [];
        
        // Find all full lines
        for (let row = 0; row < ROWS; row++) {
            let isFull = true;
            for (let col = 0; col < COLS; col++) {
                if (this.cells[row][col] === 0) {
                    isFull = false;
                    break;
                }
            }
            if (isFull) {
                linesToClear.push(row);
            }
        }
        
        if (linesToClear.length === 0) return 0;
        
        // Remove full lines (shift rows down)
        for (let i = linesToClear.length - 1; i >= 0; i--) {
            const rowToRemove = linesToClear[i];
            this.cells.splice(rowToRemove, 1);
            this.cells.unshift(new Array(COLS).fill(0));
        }
        
        return linesToClear.length;
    }
};

// ============================================================================
// PIECE MODULE
// ============================================================================
// Handles tetromino operations: collision detection, rotation, movement

const Piece = {
    // Check if piece can move to specified position
    // Constant-time: only inspects current piece's cells
    canMove(piece, board, dx, dy, rotatedShape = null) {
        const shape = rotatedShape || piece.shape;
        const newX = piece.x + dx;
        const newY = piece.y + dy;
        
        // Check each cell of the piece
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardCol = newX + col;
                    const boardRow = newY + row;
                    
                    // Check boundaries
                    if (boardCol < 0 || boardCol >= COLS || boardRow >= ROWS) {
                        return false;
                    }
                    
                    // Check collision with board (only check if within bounds)
                    if (boardRow >= 0 && board.getCell(boardRow, boardCol) !== 0) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    },
    
    // Rotate a 2D matrix 90 degrees (clockwise or counter-clockwise)
    rotateMatrix(matrix, clockwise) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = [];
        
        if (clockwise) {
            // Clockwise: new[row][col] = old[rows-1-col][row]
            for (let row = 0; row < cols; row++) {
                rotated[row] = [];
                for (let col = 0; col < rows; col++) {
                    rotated[row][col] = matrix[rows - 1 - col][row];
                }
            }
        } else {
            // Counter-clockwise: new[row][col] = old[col][cols-1-row]
            for (let row = 0; row < cols; row++) {
                rotated[row] = [];
                for (let col = 0; col < rows; col++) {
                    rotated[row][col] = matrix[col][cols - 1 - row];
                }
            }
        }
        
        return rotated;
    },
    
    // Rotate piece with wall kicks
    rotate(piece, board, clockwise) {
        if (!piece) return false;
        
        // O piece doesn't need rotation (it's a square)
        if (piece.type === 'O') return false;
        
        // Create rotated shape
        const rotated = this.rotateMatrix(piece.shape, clockwise);
        
        // Try to place rotated piece at current position
        if (this.canMove(piece, board, 0, 0, rotated)) {
            piece.shape = rotated;
            return true;
        }
        
        // Wall kicks - try shifting left/right if rotation fails
        if (this.canMove(piece, board, -1, 0, rotated)) {
            piece.x -= 1;
            piece.shape = rotated;
            return true;
        }
        
        if (this.canMove(piece, board, 1, 0, rotated)) {
            piece.x += 1;
            piece.shape = rotated;
            return true;
        }
        
        // Try shifting up (for I piece especially)
        if (this.canMove(piece, board, 0, -1, rotated)) {
            piece.y -= 1;
            piece.shape = rotated;
            return true;
        }
        
        return false;
    },
    
    // Draw the piece on canvas
    draw(ctx, piece) {
        if (!piece) return;
        
        const shape = piece.shape;
        const color = piece.color;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const x = (piece.x + col) * CELL_SIZE;
                    const y = (piece.y + row) * CELL_SIZE;
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
                    
                    ctx.strokeStyle = '#333';
                    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    },
    
    // Spawn a new tetromino
    spawn() {
        const types = Object.keys(TETROMINOS);
        const type = types[Math.floor(Math.random() * types.length)];
        const tetromino = TETROMINOS[type];
        
        // Create a deep copy of the shape
        const shape = tetromino.shape.map(row => [...row]);
        
        // Spawn at top center
        return {
            shape: shape,
            x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
            y: 0,
            type: type,
            color: tetromino.color
        };
    },
    
    // Lock piece into board
    lock(piece, board) {
        if (!piece) return;
        
        // Merge piece into board
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col] !== 0) {
                    const boardRow = piece.y + row;
                    const boardCol = piece.x + col;
                    board.setCell(boardRow, boardCol, piece.shape[row][col]);
                }
            }
        }
    }
};

// ============================================================================
// GAME MODULE
// ============================================================================
// Main game logic: loop, input, gravity, scoring, state management

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const Game = {
    // Game state
    state: 'ready', // 'ready', 'playing', 'paused', 'gameOver'
    lastTime: 0,
    
    // Game stats
    score: 0,
    linesCleared: 0,
    level: 1,
    fallInterval: 1000, // Milliseconds between gravity drops
    fallTimer: 0,
    
    // Current active piece
    currentPiece: null,
    
    // Input handling
    keys: {},
    keyState: {},
    
    // Initialize game
    init() {
        Board.init();
        this.state = 'ready';
        this.score = 0;
        this.linesCleared = 0;
        this.level = 1;
        this.fallInterval = 1000;
        this.fallTimer = 0;
        this.currentPiece = null;
        this.updateUI();
    },
    
    // Start playing
    start() {
        this.state = 'playing';
        this.currentPiece = Piece.spawn();
        
        // Check if spawn position collides (game over)
        if (!Piece.canMove(this.currentPiece, Board, 0, 0)) {
            this.state = 'gameOver';
            this.currentPiece = null;
        }
        
        this.updateUI();
    },
    
    // Restart game
    restart() {
        this.init();
        this.start();
    },
    
    // Main game loop
    gameLoop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(dt);
        this.draw(ctx);
        
        requestAnimationFrame((ts) => this.gameLoop(ts));
    },
    
    // Update game state
    update(dt) {
        if (this.state !== 'playing') {
            return;
        }
        
        // Handle input
        this.handleInput();
        
        // Gravity system
        this.fallTimer += dt;
        if (this.fallTimer >= this.fallInterval) {
            this.fallTimer = 0;
            
            // Try to move piece down
            if (this.currentPiece && Piece.canMove(this.currentPiece, Board, 0, 1)) {
                this.currentPiece.y += 1;
            } else if (this.currentPiece) {
                // Lock the piece
                this.lockPiece();
            }
        }
    },
    
    // Draw game state
    draw(ctx) {
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        Board.draw(ctx);
        
        // Draw current piece
        if (this.currentPiece) {
            Piece.draw(ctx, this.currentPiece);
        }
    },
    
    // Lock piece and handle line clearing
    lockPiece() {
        if (!this.currentPiece) return;
        
        // Lock piece into board
        Piece.lock(this.currentPiece, Board);
        
        // Clear full lines
        const linesCleared = Board.clearFullLines();
        
        if (linesCleared > 0) {
            // Update stats
            this.linesCleared += linesCleared;
            
            // Scoring: 100 * (lines cleared) * (level + 1)
            this.score += 100 * linesCleared * (this.level + 1);
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.linesCleared / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                // Decrease fall interval (speed up) - minimum 100ms
                this.fallInterval = Math.max(100, 1000 - (this.level - 1) * 50);
            }
            
            this.updateUI();
        }
        
        // Spawn next piece
        this.currentPiece = Piece.spawn();
        
        // Check if spawn position collides (game over)
        if (!Piece.canMove(this.currentPiece, Board, 0, 0)) {
            this.state = 'gameOver';
            this.currentPiece = null;
            this.updateUI();
        }
    },
    
    // Handle player input
    handleInput() {
        if (!this.currentPiece) return;
        
        // Left arrow
        if (this.keys['ArrowLeft'] && !this.keyState['ArrowLeft']) {
            this.keyState['ArrowLeft'] = true;
            if (Piece.canMove(this.currentPiece, Board, -1, 0)) {
                this.currentPiece.x -= 1;
            }
        }
        
        // Right arrow
        if (this.keys['ArrowRight'] && !this.keyState['ArrowRight']) {
            this.keyState['ArrowRight'] = true;
            if (Piece.canMove(this.currentPiece, Board, 1, 0)) {
                this.currentPiece.x += 1;
            }
        }
        
        // Down arrow (soft drop)
        if (this.keys['ArrowDown'] && !this.keyState['ArrowDown']) {
            this.keyState['ArrowDown'] = true;
            if (Piece.canMove(this.currentPiece, Board, 0, 1)) {
                this.currentPiece.y += 1;
                this.score += 1; // Bonus for soft drop
                this.updateUI();
            }
        }
        
        // Up arrow / X for clockwise rotation
        if ((this.keys['ArrowUp'] || this.keys['x']) && 
            (!this.keyState['ArrowUp'] && !this.keyState['x'])) {
            this.keyState['ArrowUp'] = true;
            this.keyState['x'] = true;
            Piece.rotate(this.currentPiece, Board, true);
        }
        
        // Z for counter-clockwise rotation
        if (this.keys['z'] && !this.keyState['z']) {
            this.keyState['z'] = true;
            Piece.rotate(this.currentPiece, Board, false);
        }
        
        // Space for hard drop
        if (this.keys[' '] && !this.keyState[' ']) {
            this.keyState[' '] = true;
            this.hardDrop();
        }
    },
    
    // Hard drop: instantly drop piece to bottom
    hardDrop() {
        if (!this.currentPiece) return;
        
        let dropDistance = 0;
        while (Piece.canMove(this.currentPiece, Board, 0, 1)) {
            this.currentPiece.y += 1;
            dropDistance += 1;
        }
        
        // Bonus points for hard drop
        this.score += dropDistance * 2;
        this.updateUI();
        
        // Lock immediately
        this.lockPiece();
    },
    
    // Update UI elements
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lines').textContent = this.linesCleared;
        document.getElementById('level').textContent = this.level;
        
        const statusEl = document.getElementById('status');
        if (this.state === 'playing') {
            statusEl.textContent = 'Playing';
        } else if (this.state === 'paused') {
            statusEl.textContent = 'Paused';
        } else if (this.state === 'gameOver') {
            statusEl.textContent = 'Game Over - Press R to restart';
        } else {
            statusEl.textContent = 'Ready - Press any key to start';
        }
    }
};

// ============================================================================
// EVENT HANDLERS
// ============================================================================

document.addEventListener('keydown', (e) => {
    Game.keys[e.key] = true;
    
    // Pause/unpause
    if (e.key === 'p' || e.key === 'P') {
        if (Game.state === 'playing') {
            Game.state = 'paused';
        } else if (Game.state === 'paused') {
            Game.state = 'playing';
        }
        Game.updateUI();
    }
    
    // Restart from game over
    if ((e.key === 'r' || e.key === 'R') && Game.state === 'gameOver') {
        Game.restart();
    }
    
    // Start game
    if (Game.state === 'ready') {
        Game.start();
    }
});

document.addEventListener('keyup', (e => {
    Game.keys[e.key] = false;
    Game.keyState[e.key] = false;
}));

// ============================================================================
// INITIALIZATION
// ============================================================================

Game.init();
Game.updateUI();
requestAnimationFrame((ts) => Game.gameLoop(ts));
