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

function startGame() {
  if (gameState === GAME_STATE.START) {
    gameState = GAME_STATE.PLAYING;
  }
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
    drawMaze();
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    startGame();
  }
});

canvas.addEventListener("click", startGame);
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  startGame();
});

gameLoop();
