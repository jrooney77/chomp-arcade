// CHOMP - initial canvas foundation.
// This file sets up the canvas, game states, animation loop, and tile maze.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// A tile size of 32 gives us a clear retro maze grid.
const TILE_SIZE = 32;
const ROWS = 15;
const COLS = 19;

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

// Game states keep the start screen separate from the playable maze screen.
const GAME_STATE = {
  START: "start",
  PLAYING: "playing",
};

let gameState = GAME_STATE.START;

// Tile types used by the maze grid.
const TILE = {
  WALL: 0,
  PATH: 1,
  CHUM: 2,
  FRENZY_BAIT: 3,
  EMPTY: 4,
};

// Directions use both tile movement (row/col) and canvas movement (x/y).
const DIRECTIONS = {
  up: { row: -1, col: 0, x: 0, y: -1, angle: -Math.PI / 2 },
  right: { row: 0, col: 1, x: 1, y: 0, angle: 0 },
  down: { row: 1, col: 0, x: 0, y: 1, angle: Math.PI / 2 },
  left: { row: 0, col: -1, x: -1, y: 0, angle: Math.PI },
};

const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowRight: "right",
  KeyD: "right",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
};

// 0 = wall, 1 = path, 2 = chum, 3 = frenzy bait, 4 = empty water.
// This layout is intentionally simple while leaving room for later shark movement.
const maze = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 2, 2, 2, 0, 2, 2, 2, 4, 2, 2, 2, 0, 2, 2, 2, 3, 0],
  [0, 2, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 0],
  [0, 2, 0, 2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 0, 2, 0],
  [0, 2, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0],
  [0, 2, 2, 2, 0, 4, 2, 2, 2, 1, 2, 2, 2, 4, 0, 2, 2, 2, 0],
  [0, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 0],
  [0, 4, 2, 2, 2, 2, 0, 1, 1, 4, 1, 1, 0, 2, 2, 2, 2, 4, 0],
  [0, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 0, 0],
  [0, 2, 2, 2, 0, 4, 2, 2, 2, 1, 2, 2, 2, 4, 0, 2, 2, 2, 0],
  [0, 2, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0],
  [0, 2, 0, 2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 0, 2, 0],
  [0, 2, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 0],
  [0, 3, 2, 2, 2, 0, 2, 2, 2, 4, 2, 2, 2, 0, 2, 2, 2, 3, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const PLAYER_START = {
  row: 7,
  col: 9,
};

function getTileCenter(row, col) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

const playerStartCenter = getTileCenter(PLAYER_START.row, PLAYER_START.col);

const player = {
  x: playerStartCenter.x,
  y: playerStartCenter.y,
  row: PLAYER_START.row,
  col: PLAYER_START.col,
  direction: null,
  nextDirection: null,
  speed: 2,
};

function startGame() {
  if (gameState === GAME_STATE.START) {
    gameState = GAME_STATE.PLAYING;
  }
}

function setPlayerNextDirection(direction) {
  if (gameState !== GAME_STATE.PLAYING || !DIRECTIONS[direction]) {
    return;
  }

  player.nextDirection = direction;
}

// Treat anything outside the maze as a wall so the shark cannot leave the canvas.
function isWall(row, col) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    return true;
  }

  return maze[row][col] === TILE.WALL;
}

// Every non-wall tile is currently safe to swim through.
function isWalkable(row, col) {
  return !isWall(row, col);
}

// This checks the tile directly beside the player in the requested direction.
// It works best when called while the player is centered on a tile.
function canMove(directionName) {
  const direction = DIRECTIONS[directionName];

  if (!direction) {
    return false;
  }

  const nextRow = player.row + direction.row;
  const nextCol = player.col + direction.col;

  return isWalkable(nextRow, nextCol);
}

function updatePlayerTile() {
  player.row = Math.floor(player.y / TILE_SIZE);
  player.col = Math.floor(player.x / TILE_SIZE);
}

function isPlayerCenteredOnTile() {
  const center = getTileCenter(player.row, player.col);

  return (
    Math.abs(player.x - center.x) <= player.speed / 2 &&
    Math.abs(player.y - center.y) <= player.speed / 2
  );
}

function snapPlayerToTileCenter() {
  const center = getTileCenter(player.row, player.col);
  player.x = center.x;
  player.y = center.y;
}

function movePlayer() {
  updatePlayerTile();

  // Turning and wall checks happen at tile centers. This keeps movement smooth
  // while still respecting the maze grid.
  if (isPlayerCenteredOnTile()) {
    snapPlayerToTileCenter();
    updatePlayerTile();

    if (canMove(player.nextDirection)) {
      player.direction = player.nextDirection;
    }

    if (!canMove(player.direction)) {
      player.direction = null;
      return;
    }
  }

  if (!player.direction) {
    return;
  }

  const direction = DIRECTIONS[player.direction];
  player.x += direction.x * player.speed;
  player.y += direction.y * player.speed;
  updatePlayerTile();
}

function drawWaterTile(x, y) {
  ctx.fillStyle = "#06243a";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = "rgba(79, 227, 255, 0.08)";
  ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
}

function drawWallTile(x, y) {
  const gradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
  gradient.addColorStop(0, "#9c6544");
  gradient.addColorStop(0.55, "#6e4938");
  gradient.addColorStop(1, "#3f2f35");

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.strokeStyle = "rgba(255, 135, 112, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

  ctx.fillStyle = "rgba(255, 190, 150, 0.25)";
  ctx.beginPath();
  ctx.arc(x + 10, y + 10, 3, 0, Math.PI * 2);
  ctx.arc(x + 23, y + 21, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawChum(x, y) {
  ctx.fillStyle = "#ff6f91";
  ctx.beginPath();
  ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrenzyBait(x, y) {
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;

  ctx.shadowColor = "#ff4a22";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffb000";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawPlayerShark() {
  const facing = player.direction || player.nextDirection || "right";
  const direction = DIRECTIONS[facing];

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(direction.angle);

  ctx.shadowColor = "rgba(217, 251, 255, 0.45)";
  ctx.shadowBlur = 8;

  ctx.fillStyle = "#6f9fb7";
  ctx.strokeStyle = "#d9fbff";
  ctx.lineWidth = 2;

  // Tail.
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-24, -10);
  ctx.lineTo(-22, 0);
  ctx.lineTo(-24, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Top fin.
  ctx.fillStyle = "#8cb9c9";
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.lineTo(4, -18);
  ctx.lineTo(9, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White belly.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f3fbff";
  ctx.beginPath();
  ctx.ellipse(4, 4, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye and small mouth line.
  ctx.fillStyle = "#07131f";
  ctx.beginPath();
  ctx.arc(9, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1d3d4f";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 5);
  ctx.quadraticCurveTo(12, 7, 14, 3);
  ctx.stroke();

  ctx.restore();
}

function drawMaze() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = maze[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      drawWaterTile(x, y);

      if (tile === TILE.WALL) {
        drawWallTile(x, y);
      }

      if (tile === TILE.CHUM) {
        drawChum(x, y);
      }

      if (tile === TILE.FRENZY_BAIT) {
        drawFrenzyBait(x, y);
      }
    }
  }
}

function drawStartScreen() {
  const centerX = canvas.width / 2;

  ctx.fillStyle = "#041827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(79, 227, 255, 0.08)";
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 67) % canvas.width, 60 + ((i * 41) % 340), 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#4fe3ff";
  ctx.font = "bold 64px Trebuchet MS, Lucida Console, monospace";
  ctx.shadowColor = "rgba(79, 227, 255, 0.9)";
  ctx.shadowBlur = 16;
  ctx.fillText("CHOMP", centerX, 142);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffb7bf";
  ctx.font = "24px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("A Shark Maze Arcade Game", centerX, 206);

  ctx.fillStyle = "#d9fbff";
  ctx.font = "20px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("Collect the chum. Avoid the reef defenders.", centerX, 278);

  ctx.fillStyle = "#ffcf5c";
  ctx.font = "bold 22px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("Press Space or Tap to Start", centerX, 348);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
  clearCanvas();

  if (gameState === GAME_STATE.START) {
    drawStartScreen();
  }

  if (gameState === GAME_STATE.PLAYING) {
    movePlayer();
    drawMaze();
    drawPlayerShark();
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const direction = KEY_TO_DIRECTION[event.code];

  if (direction) {
    event.preventDefault();
    setPlayerNextDirection(direction);
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    startGame();
  }
});

canvas.addEventListener("click", startGame);

let touchStartX = 0;
let touchStartY = 0;
let touchStarted = false;
const SWIPE_DISTANCE = 30;

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStarted = true;
});

canvas.addEventListener("touchend", (event) => {
  event.preventDefault();

  if (!touchStarted) {
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const isSwipe = Math.max(absX, absY) >= SWIPE_DISTANCE;

  touchStarted = false;

  if (!isSwipe) {
    startGame();
    return;
  }

  if (absX > absY) {
    setPlayerNextDirection(deltaX > 0 ? "right" : "left");
  } else {
    setPlayerNextDirection(deltaY > 0 ? "down" : "up");
  }
});

canvas.addEventListener("touchcancel", () => {
  touchStarted = false;
});

gameLoop();
