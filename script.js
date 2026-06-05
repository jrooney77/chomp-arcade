// CHOMP - initial canvas foundation.
// This file sets up the canvas, game states, animation loop, and tile maze.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreValueElement = document.getElementById("scoreValue");
const highScoreValueElement = document.getElementById("highScoreValue");
const chumValueElement = document.getElementById("chumValue");
const livesValueElement = document.getElementById("livesValue");
const levelValueElement = document.getElementById("levelValue");
const frenzyHudElement = document.getElementById("frenzyHud");
const frenzyValueElement = document.getElementById("frenzyValue");
const debugHudElement = document.getElementById("debugHud");
const gameHeaderElement = document.querySelector(".game-header");
const gameHudElement = document.querySelector(".game-hud");
const pauseButtonElement = document.getElementById("pauseButton");

// A tile size of 32 gives us a clear retro maze grid.
const TILE_SIZE = 32;
const ROWS = 15;
const COLS = 19;

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

function resizeCanvasDisplay() {
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const sidePadding = window.innerWidth <= 520 ? 16 : 48;
  const verticalPadding = window.innerWidth <= 520 ? 20 : 56;
  const headerHeight = gameHeaderElement.offsetHeight;
  const hudHeight = gameHudElement.offsetHeight;
  const pauseButtonHeight = pauseButtonElement.offsetHeight;
  const availableWidth = Math.max(280, Math.min(1120, window.innerWidth - sidePadding));
  const availableHeight = Math.max(
    240,
    viewportHeight - headerHeight - hudHeight - pauseButtonHeight - verticalPadding
  );
  const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);

  // The canvas drawing and collision logic stay in internal canvas coordinates.
  // Only the displayed CSS size changes here, preserving the maze aspect ratio.
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}

// Game states keep the start screen separate from the playable maze screen.
const GAME_STATE = {
  START: "start",
  PLAYING: "playing",
  LEVEL_CLEAR: "levelClear",
  GAME_OVER: "gameOver",
  WIN: "win",
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

const SCORE_VALUES = {
  CHUM: 10,
  FRENZY_BAIT: 50,
};

const STARTING_LIVES = 3;
const PLAYER_HIT_DISTANCE = 22;
const BASE_FRENZY_DURATION_MS = 7000;
const MIN_FRENZY_DURATION_MS = 5500;
const FRENZY_CHOMP_SCORES = [200, 400, 800, 1600];
const ENEMY_RETURN_MS = 1000;
const TOTAL_LEVELS = 3;
const LEVEL_CLEAR_BONUS = 500;
const LEVEL_CLEAR_DELAY_MS = 1200;
const HIGH_SCORE_STORAGE_KEY = "chompHighScore";

const ENEMY_SPEEDS = {
  dolphinPatrol: 1,
  electricEel: 1,
  diverDrone: 1,
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
// Each level owns its maze, shark start, and enemy starts. The loader clones
// the maze so collection can edit the current level without changing templates.
const LEVELS = [
  {
    maze: [
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
    ],
    playerStart: { row: 13, col: 9 },
    enemyStarts: [
      { type: "dolphinPatrol", row: 7, col: 10, direction: "right" },
      { type: "electricEel", row: 7, col: 17, direction: "left" },
      { type: "diverDrone", row: 5, col: 9, direction: "left" },
    ],
  },
  {
    maze: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 2, 2, 2, 2, 2, 0, 3, 2, 4, 2, 3, 0, 2, 2, 2, 2, 2, 0],
      [0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0],
      [0, 2, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 2, 0],
      [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
      [0, 3, 2, 2, 2, 2, 0, 2, 2, 4, 2, 2, 0, 2, 2, 2, 2, 3, 0],
      [0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0],
      [0, 2, 2, 2, 2, 2, 2, 1, 1, 4, 1, 1, 2, 2, 2, 2, 2, 2, 0],
      [0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0],
      [0, 3, 2, 2, 2, 2, 0, 2, 2, 4, 2, 2, 0, 2, 2, 2, 2, 3, 0],
      [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
      [0, 2, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 2, 0],
      [0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0],
      [0, 2, 2, 2, 2, 2, 0, 2, 2, 4, 2, 2, 0, 2, 2, 2, 2, 2, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    playerStart: { row: 13, col: 9 },
    enemyStarts: [
      { type: "dolphinPatrol", row: 7, col: 8, direction: "right" },
      { type: "electricEel", row: 5, col: 17, direction: "left" },
      { type: "diverDrone", row: 9, col: 1, direction: "right" },
    ],
  },
  {
    maze: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 2, 2, 2, 0, 2, 2, 2, 3, 2, 2, 2, 0, 2, 2, 2, 3, 0],
      [0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0],
      [0, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 0],
      [0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0, 0, 0, 2, 0, 0],
      [0, 2, 2, 2, 2, 0, 2, 2, 2, 4, 2, 2, 2, 0, 2, 2, 2, 2, 0],
      [0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0],
      [0, 2, 2, 0, 2, 2, 2, 1, 1, 4, 1, 1, 2, 2, 2, 0, 2, 2, 0],
      [0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0],
      [0, 2, 2, 2, 2, 0, 2, 2, 2, 4, 2, 2, 2, 0, 2, 2, 2, 2, 0],
      [0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0, 0, 0, 2, 0, 0],
      [0, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 0],
      [0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2, 0],
      [0, 3, 2, 2, 2, 0, 2, 2, 2, 4, 2, 2, 2, 0, 2, 2, 2, 3, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    playerStart: { row: 13, col: 9 },
    enemyStarts: [
      { type: "dolphinPatrol", row: 7, col: 10, direction: "right" },
      { type: "electricEel", row: 5, col: 1, direction: "right" },
      { type: "diverDrone", row: 9, col: 17, direction: "left" },
    ],
  },
];

let currentLevel = 1;
let currentLayout = LEVELS[0];
let maze = cloneMaze(currentLayout.maze);
let score = 0;
let highScore = loadHighScore();
let lives = STARTING_LIVES;
let remainingChum = countRemainingChum();
let debugMode = false;
let levelClearReady = false;
let levelClearTimeoutId = null;
let isPaused = false;
let totalPausedTime = 0;
let pauseStartedRealTime = 0;
let pauseStartedGameTime = 0;
let frenzyMode = {
  active: false,
  endTime: 0,
  chompCount: 0,
};

let playerStart = { ...currentLayout.playerStart };
let enemyStarts = currentLayout.enemyStarts.map((enemyStart) => ({ ...enemyStart }));

function getTileCenter(row, col) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

const playerStartCenter = getTileCenter(playerStart.row, playerStart.col);

const player = {
  x: playerStartCenter.x,
  y: playerStartCenter.y,
  row: playerStart.row,
  col: playerStart.col,
  direction: null,
  nextDirection: null,
  speed: 2,
};

let enemies = enemyStarts.map((enemyStart) => (
  createEnemy(enemyStart.type, enemyStart.row, enemyStart.col, enemyStart.direction)
));

function startGame() {
  if (gameState === GAME_STATE.START) {
    gameState = GAME_STATE.PLAYING;
    updateStatusDisplay();
    return;
  }

  if (gameState === GAME_STATE.LEVEL_CLEAR && levelClearReady) {
    advanceToNextLevel();
    return;
  }

  if (gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.WIN) {
    resetGame();
  }
}

function loadHighScore() {
  try {
    const savedHighScore = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const parsedHighScore = Number.parseInt(savedHighScore, 10);

    return Number.isFinite(parsedHighScore) && parsedHighScore > 0 ? parsedHighScore : 0;
  } catch (error) {
    // Some browser settings block localStorage. The game still works with the
    // highScore variable in memory for the current page load.
    return 0;
  }
}

function saveHighScore() {
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(highScore));
  } catch (error) {
    // If saving is blocked, keep playing with the in-memory high score.
  }
}

function updateHighScore() {
  if (score <= highScore) {
    return;
  }

  highScore = score;
  saveHighScore();
}

// Game timers use this clock instead of raw performance.now(). While paused,
// the clock returns the same value every frame so Frenzy Mode, enemy return
// delays, and simple canvas animations do not keep counting down.
function getGameTime() {
  if (isPaused) {
    return pauseStartedGameTime;
  }

  return performance.now() - totalPausedTime;
}

function updatePauseButton() {
  pauseButtonElement.disabled = gameState !== GAME_STATE.PLAYING;
  pauseButtonElement.textContent = isPaused ? "Resume" : "Pause";
  pauseButtonElement.setAttribute("aria-pressed", String(isPaused));
}

function togglePause() {
  if (gameState !== GAME_STATE.PLAYING) {
    return;
  }

  if (isPaused) {
    totalPausedTime += performance.now() - pauseStartedRealTime;
    pauseStartedRealTime = 0;
    pauseStartedGameTime = 0;
    isPaused = false;
  } else {
    const now = performance.now();

    pauseStartedRealTime = now;
    pauseStartedGameTime = now - totalPausedTime;
    isPaused = true;
  }

  updateFrenzyDisplay();
  updatePauseButton();
}

function cloneMaze(sourceMaze) {
  return sourceMaze.map((row) => row.slice());
}

function countRemainingChum() {
  let total = 0;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (maze[row][col] === TILE.CHUM) {
        total += 1;
      }
    }
  }

  return total;
}

function updateScore(points) {
  score += points;
  updateHighScore();
  updateScoreDisplay();
}

function updateScoreDisplay() {
  scoreValueElement.textContent = score;
  highScoreValueElement.textContent = highScore;
  chumValueElement.textContent = remainingChum;
  livesValueElement.textContent = lives;
  levelValueElement.textContent = currentLevel;
}

function updateDebugDisplay() {
  if (debugMode) {
    debugHudElement.classList.remove("is-hidden");
  } else {
    debugHudElement.classList.add("is-hidden");
  }
}

function updateStatusDisplay() {
  updateScoreDisplay();
  updateDebugDisplay();
  updatePauseButton();
}

// Debug mode is intentionally simple and local-test friendly. It hides enemies,
// stops enemy movement, and skips enemy collision without changing collectibles
// or level progression.
function toggleDebugMode() {
  debugMode = !debugMode;
  updateDebugDisplay();
  resizeCanvasDisplay();
}

function debugClearCurrentLevel() {
  if (!debugMode || gameState !== GAME_STATE.PLAYING || isPaused) {
    return;
  }

  remainingChum = 0;
  updateStatusDisplay();
  startLevelClear();
}

function updateFrenzyDisplay() {
  if (!frenzyMode.active || gameState !== GAME_STATE.PLAYING) {
    frenzyHudElement.classList.add("is-hidden");
    frenzyValueElement.textContent = "";
    return;
  }

  const secondsLeft = Math.max(0, (frenzyMode.endTime - getGameTime()) / 1000);
  frenzyHudElement.classList.remove("is-hidden");
  frenzyValueElement.textContent = `${secondsLeft.toFixed(1)}s`;
}

function startFrenzyMode() {
  if (gameState !== GAME_STATE.PLAYING) {
    return;
  }

  frenzyMode.active = true;
  frenzyMode.endTime = getGameTime() + getFrenzyDuration();
  frenzyMode.chompCount = 0;

  enemies.forEach((enemy) => {
    if (enemy.state !== "returning") {
      enemy.state = "vulnerable";
      enemy.isVulnerable = true;
    }
  });

  updateFrenzyDisplay();
  resizeCanvasDisplay();
}

function endFrenzyMode() {
  frenzyMode.active = false;
  frenzyMode.endTime = 0;
  frenzyMode.chompCount = 0;

  enemies.forEach((enemy) => {
    if (enemy.state !== "returning") {
      enemy.state = "normal";
      enemy.isVulnerable = false;
    }
  });

  updateFrenzyDisplay();
  resizeCanvasDisplay();
}

function updateFrenzyMode() {
  if (!frenzyMode.active || gameState !== GAME_STATE.PLAYING) {
    updateFrenzyDisplay();
    return;
  }

  if (getGameTime() >= frenzyMode.endTime) {
    endFrenzyMode();
    return;
  }

  updateFrenzyDisplay();
}

function getLevelConfig(levelNumber) {
  const levelIndex = (levelNumber - 1) % LEVELS.length;
  return LEVELS[levelIndex];
}

function getLevelEnemySpeed(type) {
  const baseSpeed = ENEMY_SPEEDS[type] || 1;

  // Enemy speed stays tile-safe: 1 and 2 both divide evenly into 32px tiles,
  // so enemies still snap cleanly to corridor centers.
  if (currentLevel >= 3) {
    return Math.min(2, baseSpeed + 1);
  }

  return baseSpeed;
}

function getFrenzyDuration() {
  const levelReduction = (currentLevel - 1) * 350;
  return Math.max(MIN_FRENZY_DURATION_MS, BASE_FRENZY_DURATION_MS - levelReduction);
}

function loadLevel(levelNumber) {
  currentLevel = levelNumber;
  currentLayout = getLevelConfig(currentLevel);
  maze = cloneMaze(currentLayout.maze);
  playerStart = { ...currentLayout.playerStart };
  enemyStarts = currentLayout.enemyStarts.map((enemyStart) => ({ ...enemyStart }));
  remainingChum = countRemainingChum();
  levelClearReady = false;
  endFrenzyMode();
  resetPlayerPosition();
  rebuildEnemies();
  updateStatusDisplay();
}

function resetGame() {
  if (levelClearTimeoutId) {
    clearTimeout(levelClearTimeoutId);
    levelClearTimeoutId = null;
  }

  currentLevel = 1;
  score = 0;
  lives = STARTING_LIVES;
  debugMode = false;
  isPaused = false;
  totalPausedTime = 0;
  pauseStartedRealTime = 0;
  pauseStartedGameTime = 0;
  levelClearReady = false;
  loadLevel(currentLevel);
  gameState = GAME_STATE.PLAYING;
  updateStatusDisplay();
}

function setPlayerNextDirection(direction) {
  if (gameState !== GAME_STATE.PLAYING || isPaused || !DIRECTIONS[direction]) {
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

function updateEnemyTile(enemy) {
  enemy.row = Math.floor(enemy.y / TILE_SIZE);
  enemy.col = Math.floor(enemy.x / TILE_SIZE);
}

function isEntityCenteredOnTile(entity) {
  const center = getTileCenter(entity.row, entity.col);

  return (
    Math.abs(entity.x - center.x) <= entity.speed / 2 &&
    Math.abs(entity.y - center.y) <= entity.speed / 2
  );
}

function isPlayerCenteredOnTile() {
  return isEntityCenteredOnTile(player);
}

function snapEntityToTileCenter(entity) {
  const center = getTileCenter(entity.row, entity.col);
  entity.x = center.x;
  entity.y = center.y;
}

function snapPlayerToTileCenter() {
  snapEntityToTileCenter(player);
}

function resetPlayerPosition() {
  const center = getTileCenter(playerStart.row, playerStart.col);

  player.x = center.x;
  player.y = center.y;
  player.row = playerStart.row;
  player.col = playerStart.col;
  player.direction = null;
  player.nextDirection = null;
}

function collectTile() {
  const tile = maze[player.row][player.col];

  // Collection happens only when the shark reaches a tile center. The tile is
  // then changed to EMPTY so it cannot be collected again.
  if (tile === TILE.CHUM) {
    maze[player.row][player.col] = TILE.EMPTY;
    remainingChum -= 1;
    updateScore(SCORE_VALUES.CHUM);
    checkLevelClear();
    return;
  }

  if (tile === TILE.FRENZY_BAIT) {
    maze[player.row][player.col] = TILE.EMPTY;
    updateScore(SCORE_VALUES.FRENZY_BAIT);
    startFrenzyMode();
  }
}

function checkLevelClear() {
  if (remainingChum <= 0 && gameState === GAME_STATE.PLAYING) {
    startLevelClear();
  }
}

function startLevelClear() {
  gameState = GAME_STATE.LEVEL_CLEAR;
  levelClearReady = false;
  player.direction = null;
  player.nextDirection = null;
  updateScore(LEVEL_CLEAR_BONUS * currentLevel);
  endFrenzyMode();
  updateStatusDisplay();

  if (levelClearTimeoutId) {
    clearTimeout(levelClearTimeoutId);
  }

  levelClearTimeoutId = setTimeout(() => {
    levelClearReady = true;
    advanceToNextLevel();
  }, LEVEL_CLEAR_DELAY_MS);
}

function advanceToNextLevel() {
  if (gameState !== GAME_STATE.LEVEL_CLEAR) {
    return;
  }

  if (levelClearTimeoutId) {
    clearTimeout(levelClearTimeoutId);
    levelClearTimeoutId = null;
  }

  if (currentLevel >= TOTAL_LEVELS) {
    startWin();
    return;
  }

  gameState = GAME_STATE.PLAYING;
  loadLevel(currentLevel + 1);
}

function startWin() {
  gameState = GAME_STATE.WIN;
  levelClearReady = false;
  endFrenzyMode();
  resetPlayerPosition();
  resetEnemies();
  updateStatusDisplay();
}

function movePlayer() {
  updatePlayerTile();

  // Turning and wall checks happen at tile centers. This keeps movement smooth
  // while still respecting the maze grid.
  if (isPlayerCenteredOnTile()) {
    snapPlayerToTileCenter();
    updatePlayerTile();
    collectTile();

    if (gameState !== GAME_STATE.PLAYING) {
      return;
    }

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

function createEnemy(type, row, col, direction) {
  if (!isWalkable(row, col)) {
    throw new Error(`${type} cannot spawn inside a wall at row ${row}, col ${col}.`);
  }

  const center = getTileCenter(row, col);

  return {
    x: center.x,
    y: center.y,
    row,
    col,
    direction,
    speed: getLevelEnemySpeed(type),
    type,
    state: "normal",
    isVulnerable: false,
    returnUntil: 0,
    startRow: row,
    startCol: col,
    startDirection: direction,
  };
}

function getValidDirections(row, col) {
  return Object.keys(DIRECTIONS).filter((directionName) => {
    const direction = DIRECTIONS[directionName];
    return isWalkable(row + direction.row, col + direction.col);
  });
}

function chooseRandomDirection(validDirections) {
  return validDirections[Math.floor(Math.random() * validDirections.length)];
}

function chooseDolphinDirection(enemy, validDirections) {
  const canContinue = validDirections.includes(enemy.direction);
  const isIntersection = validDirections.length > 2;

  if (!canContinue) {
    return chooseRandomDirection(validDirections);
  }

  // Dolphin Patrol usually keeps going, but sometimes turns at intersections.
  if (isIntersection && Math.random() < 0.25) {
    return chooseRandomDirection(validDirections);
  }

  return enemy.direction;
}

function chooseElectricEelDirection(enemy, validDirections) {
  const canContinue = validDirections.includes(enemy.direction);
  const isIntersection = validDirections.length > 2;

  if (!canContinue) {
    return chooseRandomDirection(validDirections);
  }

  // Electric Eel is erratic: it changes course much more often than Dolphin
  // Patrol, especially at intersections, but still only chooses open tiles.
  if (isIntersection && Math.random() < 0.7) {
    return chooseRandomDirection(validDirections);
  }

  if (Math.random() < 0.35) {
    return chooseRandomDirection(validDirections);
  }

  return enemy.direction;
}

function getTileDistanceToPlayer(row, col) {
  return Math.abs(player.row - row) + Math.abs(player.col - col);
}

function chooseDiverDroneDirection(enemy, validDirections) {
  const canContinue = validDirections.includes(enemy.direction);

  // Diver Drone has simple chase behavior. It looks one tile ahead in each
  // valid direction and prefers the move that gets closest to the shark.
  if (Math.random() < 0.18 && canContinue) {
    return enemy.direction;
  }

  if (Math.random() < 0.12) {
    return chooseRandomDirection(validDirections);
  }

  let bestDistance = Infinity;
  let bestDirections = [];

  validDirections.forEach((directionName) => {
    const direction = DIRECTIONS[directionName];
    const nextRow = enemy.row + direction.row;
    const nextCol = enemy.col + direction.col;
    const distance = getTileDistanceToPlayer(nextRow, nextCol);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestDirections = [directionName];
      return;
    }

    if (distance === bestDistance) {
      bestDirections.push(directionName);
    }
  });

  return chooseRandomDirection(bestDirections);
}

function chooseEnemyDirection(enemy) {
  const validDirections = getValidDirections(enemy.row, enemy.col);

  if (validDirections.length === 0) {
    return null;
  }

  if (enemy.type === "electricEel") {
    return chooseElectricEelDirection(enemy, validDirections);
  }

  if (enemy.type === "diverDrone") {
    return chooseDiverDroneDirection(enemy, validDirections);
  }

  return chooseDolphinDirection(enemy, validDirections);
}

function updateEnemies() {
  if (debugMode) {
    return;
  }

  enemies.forEach((enemy) => {
    if (enemy.state === "returning") {
      if (getGameTime() >= enemy.returnUntil) {
        enemy.state = frenzyMode.active ? "vulnerable" : "normal";
        enemy.isVulnerable = frenzyMode.active;
      }

      return;
    }

    updateEnemyTile(enemy);

    // Like the shark, enemies make turns only at tile centers. They reuse the
    // same walkable-tile checks so they cannot swim through reef walls. The
    // dolphin does not check walls mid-tile, because that can stop it before it
    // reaches the next tile center where it is allowed to turn.
    if (isEntityCenteredOnTile(enemy)) {
      snapEntityToTileCenter(enemy);
      updateEnemyTile(enemy);
      enemy.direction = chooseEnemyDirection(enemy);
    }

    if (!enemy.direction) {
      return;
    }

    const direction = DIRECTIONS[enemy.direction];
    enemy.x += direction.x * enemy.speed;
    enemy.y += direction.y * enemy.speed;
    updateEnemyTile(enemy);
  });
}

function resetEnemyPosition(enemy) {
  const center = getTileCenter(enemy.startRow, enemy.startCol);

  enemy.x = center.x;
  enemy.y = center.y;
  enemy.row = enemy.startRow;
  enemy.col = enemy.startCol;
  enemy.direction = enemy.startDirection;
  enemy.speed = getLevelEnemySpeed(enemy.type);
  enemy.state = "normal";
  enemy.isVulnerable = false;
  enemy.returnUntil = 0;
}

function rebuildEnemies() {
  enemies = enemyStarts.map((enemyStart) => (
    createEnemy(enemyStart.type, enemyStart.row, enemyStart.col, enemyStart.direction)
  ));
}

function resetEnemies() {
  enemies.forEach(resetEnemyPosition);
}

function loseLife() {
  endFrenzyMode();
  lives -= 1;
  updateScoreDisplay();

  resetPlayerPosition();
  resetEnemies();

  if (lives <= 0) {
    lives = 0;
    updateStatusDisplay();
    gameState = GAME_STATE.GAME_OVER;
    updatePauseButton();
    return;
  }
}

function checkPlayerEnemyCollision() {
  if (debugMode) {
    return;
  }

  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);

    // A simple circle-distance check is enough for these cartoon shapes.
    if (distance < PLAYER_HIT_DISTANCE) {
      handleEnemyCollision(enemy);
      return;
    }
  }
}

function getFrenzyChompScore() {
  const scoreIndex = Math.min(frenzyMode.chompCount, FRENZY_CHOMP_SCORES.length - 1);
  return FRENZY_CHOMP_SCORES[scoreIndex];
}

function sendEnemyToSpawn(enemy) {
  const center = getTileCenter(enemy.startRow, enemy.startCol);

  enemy.x = center.x;
  enemy.y = center.y;
  enemy.row = enemy.startRow;
  enemy.col = enemy.startCol;
  enemy.direction = enemy.startDirection;
  enemy.state = "returning";
  enemy.isVulnerable = false;
  enemy.returnUntil = getGameTime() + ENEMY_RETURN_MS;
}

function handleEnemyCollision(enemy) {
  if (enemy.state === "returning") {
    return;
  }

  // During Frenzy Mode, vulnerable enemies are worth bonus points instead of
  // costing a life. The score doubles with each chomp in the same Frenzy Mode.
  if (enemy.isVulnerable) {
    updateScore(getFrenzyChompScore());
    frenzyMode.chompCount += 1;
    sendEnemyToSpawn(enemy);
    return;
  }

  loseLife();
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
  const pulse = Math.sin(getGameTime() / 140) * 3;

  ctx.shadowColor = "#ff4a22";
  ctx.shadowBlur = 18 + pulse;
  ctx.fillStyle = "#ffb000";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 9 + pulse * 0.2, 0, Math.PI * 2);
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
  const isFrenzy = frenzyMode.active && gameState === GAME_STATE.PLAYING;
  const pulse = isFrenzy ? Math.sin(getGameTime() / 110) * 4 : 0;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(direction.angle);

  ctx.shadowColor = isFrenzy ? "rgba(255, 111, 64, 0.9)" : "rgba(217, 251, 255, 0.45)";
  ctx.shadowBlur = isFrenzy ? 18 + pulse : 8;

  if (isFrenzy) {
    ctx.strokeStyle = "rgba(255, 207, 92, 0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 20 + pulse * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = isFrenzy ? "#ff805c" : "#6f9fb7";
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
  ctx.fillStyle = isFrenzy ? "#ffb15f" : "#8cb9c9";
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

function drawDolphinPatrol(enemy) {
  const direction = DIRECTIONS[enemy.direction || enemy.startDirection];
  const isVulnerable = enemy.state === "vulnerable";
  const isReturning = enemy.state === "returning";
  const bodyColor = isVulnerable ? "#7f91a5" : "#7fd8ff";
  const finColor = isVulnerable ? "#a8b3c0" : "#b7ecff";
  const strokeColor = isVulnerable ? "#d8e0e8" : "#d9fbff";

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(direction.angle);
  ctx.globalAlpha = isReturning ? 0.55 : 1;

  ctx.shadowColor = isVulnerable ? "rgba(180, 190, 205, 0.55)" : "rgba(79, 227, 255, 0.45)";
  ctx.shadowBlur = isVulnerable ? 12 : 7;

  // Tail.
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-23, -8);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-23, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body and rounded nose.
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(12, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Curved dorsal fin.
  ctx.fillStyle = finColor;
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.quadraticCurveTo(0, -17, 8, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Belly, eye, and smile.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f4fdff";
  ctx.beginPath();
  ctx.ellipse(4, 4, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#06243a";
  ctx.beginPath();
  ctx.arc(12, -4, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#17617b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 4);
  ctx.quadraticCurveTo(14, 7, 18, 4);
  ctx.stroke();

  ctx.restore();
}

function drawElectricEel(enemy) {
  const direction = DIRECTIONS[enemy.direction || enemy.startDirection];
  const isVulnerable = enemy.state === "vulnerable";
  const isReturning = enemy.state === "returning";
  const pulse = Math.sin(getGameTime() / 90);
  const bodyColor = isVulnerable ? "#8fa09b" : "#b9f15a";
  const stripeColor = isVulnerable ? "#d7dfd5" : "#f7ff6a";

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(direction.angle);
  ctx.globalAlpha = isReturning ? 0.55 : 1;
  ctx.shadowColor = isVulnerable ? "rgba(205, 215, 205, 0.55)" : "rgba(247, 255, 106, 0.8)";
  ctx.shadowBlur = isVulnerable ? 10 : 12 + pulse * 3;

  // Curvy eel body.
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.quadraticCurveTo(-9, -8, 0, 1);
  ctx.quadraticCurveTo(9, 10, 18, -2);
  ctx.stroke();

  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-13, 2);
  ctx.lineTo(-8, -5);
  ctx.moveTo(-2, 1);
  ctx.lineTo(3, 7);
  ctx.moveTo(9, 2);
  ctx.lineTo(14, -5);
  ctx.stroke();

  // Small electric sparks when dangerous.
  if (!isVulnerable && !isReturning) {
    ctx.strokeStyle = "#fff3a1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -13);
    ctx.lineTo(0, -8);
    ctx.lineTo(-3, -5);
    ctx.moveTo(10, 10);
    ctx.lineTo(15, 6);
    ctx.lineTo(12, 3);
    ctx.stroke();
  }

  // Eye.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#08283d";
  ctx.beginPath();
  ctx.arc(15, -5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDiverDrone(enemy) {
  const direction = DIRECTIONS[enemy.direction || enemy.startDirection];
  const isVulnerable = enemy.state === "vulnerable";
  const isReturning = enemy.state === "returning";
  const bodyColor = isVulnerable ? "#9a978e" : "#ffb13b";
  const trimColor = isVulnerable ? "#d5d0c6" : "#ffdf75";
  const spin = getGameTime() / 90;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(direction.angle);
  ctx.globalAlpha = isReturning ? 0.55 : 1;
  ctx.shadowColor = isVulnerable ? "rgba(210, 205, 195, 0.55)" : "rgba(255, 177, 59, 0.7)";
  ctx.shadowBlur = isVulnerable ? 10 : 12;

  // Drone body.
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = "#fff0bd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-11, -8, 22, 16);
  ctx.fill();
  ctx.stroke();

  // Front sensor.
  ctx.fillStyle = "#06243a";
  ctx.beginPath();
  ctx.arc(8, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = trimColor;
  ctx.beginPath();
  ctx.arc(9, -1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Propellers.
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 2;
  [-12, 12].forEach((offsetX) => {
    ctx.save();
    ctx.translate(offsetX, -10);
    ctx.rotate(spin);
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();
    ctx.restore();
  });

  // Side fins.
  ctx.fillStyle = trimColor;
  ctx.beginPath();
  ctx.moveTo(-8, 7);
  ctx.lineTo(-15, 12);
  ctx.lineTo(-5, 10);
  ctx.closePath();
  ctx.moveTo(4, 7);
  ctx.lineTo(14, 11);
  ctx.lineTo(9, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawEnemies() {
  if (debugMode) {
    return;
  }

  enemies.forEach((enemy) => {
    if (enemy.type === "dolphinPatrol") {
      drawDolphinPatrol(enemy);
    }

    if (enemy.type === "electricEel") {
      drawElectricEel(enemy);
    }

    if (enemy.type === "diverDrone") {
      drawDiverDrone(enemy);
    }
  });
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

  ctx.fillStyle = "#d9fbff";
  ctx.font = "bold 20px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(`High Score: ${highScore}`, centerX, 318);

  ctx.fillStyle = "#ffcf5c";
  ctx.font = "bold 22px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("Press Space or Tap to Start", centerX, 372);
}

function drawGameOverScreen() {
  const centerX = canvas.width / 2;

  ctx.fillStyle = "#041827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 95, 109, 0.1)";
  for (let i = 0; i < 16; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 83) % canvas.width, 70 + ((i * 47) % 330), 20, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#ff5f6d";
  ctx.font = "bold 58px Trebuchet MS, Lucida Console, monospace";
  ctx.shadowColor = "rgba(255, 95, 109, 0.9)";
  ctx.shadowBlur = 14;
  ctx.fillText("GAME OVER", centerX, 154);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#d9fbff";
  ctx.font = "bold 24px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(`Final Score: ${score}`, centerX, 232);

  ctx.fillStyle = "#d9fbff";
  ctx.font = "bold 22px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(`High Score: ${highScore}`, centerX, 272);

  ctx.fillStyle = "#ffcf5c";
  ctx.font = "bold 22px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("Press Space or Tap to Restart", centerX, 336);
}

function drawLevelClearScreen() {
  const centerX = canvas.width / 2;

  ctx.fillStyle = "#041827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(79, 227, 255, 0.1)";
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 71) % canvas.width, 55 + ((i * 53) % 360), 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#4fe3ff";
  ctx.font = "bold 56px Trebuchet MS, Lucida Console, monospace";
  ctx.shadowColor = "rgba(79, 227, 255, 0.9)";
  ctx.shadowBlur = 14;
  ctx.fillText("LEVEL CLEAR!", centerX, 150);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#d9fbff";
  ctx.font = "bold 24px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(`Level ${currentLevel} Complete`, centerX, 226);

  ctx.fillStyle = "#ffcf5c";
  ctx.font = "20px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(`Bonus: ${LEVEL_CLEAR_BONUS * currentLevel}`, centerX, 274);

  ctx.fillStyle = "#ffb7bf";
  ctx.font = "bold 20px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("Next level loading...", centerX, 340);
}

function drawWinScreen() {
  const centerX = canvas.width / 2;

  ctx.fillStyle = "#041827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 207, 92, 0.12)";
  for (let i = 0; i < 20; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 59) % canvas.width, 50 + ((i * 67) % 380), 20, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#ffcf5c";
  ctx.font = "bold 64px Trebuchet MS, Lucida Console, monospace";
  ctx.shadowColor = "rgba(255, 207, 92, 0.9)";
  ctx.shadowBlur = 16;
  ctx.fillText("YOU WIN!", centerX, 140);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#d9fbff";
  ctx.font = "bold 24px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(`Final Score: ${score}`, centerX, 226);
  ctx.fillText(`Levels Cleared: ${TOTAL_LEVELS}`, centerX, 266);

  ctx.fillStyle = "#d9fbff";
  ctx.font = "bold 22px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(`High Score: ${highScore}`, centerX, 306);

  ctx.fillStyle = "#ffb7bf";
  ctx.font = "bold 22px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("Press Space or Tap to Restart", centerX, 362);
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(4, 24, 39, 0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#4fe3ff";
  ctx.font = "bold 58px Trebuchet MS, Lucida Console, monospace";
  ctx.shadowColor = "rgba(79, 227, 255, 0.9)";
  ctx.shadowBlur = 14;
  ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 18);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#d9fbff";
  ctx.font = "20px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText("Press P or tap Resume", canvas.width / 2, canvas.height / 2 + 42);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
  clearCanvas();

  if (gameState === GAME_STATE.START) {
    drawStartScreen();
  }

  if (gameState === GAME_STATE.PLAYING && !isPaused) {
    updateFrenzyMode();
    movePlayer();
    updateEnemies();
    checkPlayerEnemyCollision();
  }

  if (gameState === GAME_STATE.PLAYING) {
    drawMaze();
    drawPlayerShark();
    drawEnemies();

    if (isPaused) {
      drawPauseOverlay();
    }
  }

  if (gameState === GAME_STATE.GAME_OVER) {
    drawGameOverScreen();
  }

  if (gameState === GAME_STATE.LEVEL_CLEAR) {
    drawLevelClearScreen();
  }

  if (gameState === GAME_STATE.WIN) {
    drawWinScreen();
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const direction = KEY_TO_DIRECTION[event.code];

  if (event.code === "KeyD") {
    event.preventDefault();
    toggleDebugMode();
    return;
  }

  if (event.code === "KeyL") {
    event.preventDefault();
    debugClearCurrentLevel();
    return;
  }

  if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
    return;
  }

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
pauseButtonElement.addEventListener("click", togglePause);

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

window.addEventListener("resize", resizeCanvasDisplay);
window.addEventListener("orientationchange", resizeCanvasDisplay);

updateStatusDisplay();
updateFrenzyDisplay();
resizeCanvasDisplay();
gameLoop();
