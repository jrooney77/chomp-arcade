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
const gameControlsElement = document.querySelector(".game-controls");
const pauseButtonElement = document.getElementById("pauseButton");
const soundButtonElement = document.getElementById("soundButton");

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
  const controlsHeight = gameControlsElement.offsetHeight;
  const availableWidth = Math.max(280, Math.min(1120, window.innerWidth - sidePadding));
  const availableHeight = Math.max(
    240,
    viewportHeight - headerHeight - hudHeight - controlsHeight - verticalPadding
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
const HIGH_SCORE_STORAGE_KEY = "chompHighScore";
const SOUND_MUTED_STORAGE_KEY = "chompSoundMuted";
const MASTER_VOLUME = 0.18;
const REVERB_ENABLED = true;
const REVERB_DELAY_SECONDS = 0.12;
const REVERB_FEEDBACK = 0.22;
const REVERB_WET_GAIN = 0.16;
const MAX_PARTICLES = 120;
const SHARK_BUBBLE_INTERVAL_MS = 95;
const SHARK_CHOMP_BOOST_MS = 280;
// Slightly faster than the original speed of 2. The center-snap movement code
// below keeps the shark aligned to the maze grid even with this small bump.
const SHARK_MOVE_SPEED = 2.25;
const SHARK_UPPER_JAW_MAX_LIFT = 3;

const LEVEL_CLEAR_MESSAGES = [
  "Jaw-some job!",
  "That was fintastic!",
  "You're on a roll, reef ranger!",
  "Another bite-sized victory!",
  "You totally crushed that current!",
  "Shark-tacular!",
  "No one can out-swim you!",
  "You're making waves!",
  "Fin-ished in style!",
  "That level didn't stand a chance!",
  "You've got serious bite!",
  "That was o-fish-ally awesome!",
  "Reef well done!",
  "Keep chomping!",
  "Sea-riously impressive!",
  "You're the apex player!",
  "That was jaws-dropping!",
  "You're swimming circles around them!",
  "Another deep-sea dub!",
  "The reef never knew what bit it!",
  "That was fintastically fierce!",
  "Chomp champ!",
  "The ocean approves!",
  "You're on a tidal tear!",
  "You've got bite and bragging rights!",
  "This reef is your playground!",
  "Way to sink your teeth into it!",
  "Totally gnarly, shark star!",
  "That was a splash hit!",
  "You're cruising the food chain!",
  "Fins up for that finish!",
  "You made that maze look bite-sized!",
];

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
let isPaused = false;
let totalPausedTime = 0;
let pauseStartedRealTime = 0;
let pauseStartedGameTime = 0;
let particles = [];
let levelClearMessage = "";
let lastLevelClearMessage = "";
let lastSharkBubbleTime = 0;
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
  speed: SHARK_MOVE_SPEED,
  chompBoostUntil: 0,
};

let enemies = enemyStarts.map((enemyStart) => (
  createEnemy(enemyStart.type, enemyStart.row, enemyStart.col, enemyStart.direction)
));

function startGame() {
  initAudio();

  if (gameState === GAME_STATE.START) {
    playSound("select");
    gameState = GAME_STATE.PLAYING;
    updateStatusDisplay();
    return;
  }

  if (gameState === GAME_STATE.LEVEL_CLEAR && levelClearReady) {
    playSound("select");
    advanceToNextLevel();
    return;
  }

  if (gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.WIN) {
    playSound("select");
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

function loadSoundMuted() {
  try {
    return window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === "true";
  } catch (error) {
    // If localStorage is blocked, sound still works with this page-load value.
    return false;
  }
}

let isSoundMuted = loadSoundMuted();
let audioContext = null;
let masterGain = null;
let audioBus = null;
let audioUnlocked = false;

function saveSoundMuted() {
  try {
    window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(isSoundMuted));
  } catch (error) {
    // Muting still works in memory if saving is blocked.
  }
}

function updateSoundButton() {
  soundButtonElement.textContent = isSoundMuted ? "Sound: Off" : "Sound: On";
  soundButtonElement.setAttribute("aria-pressed", String(!isSoundMuted));
}

function createAudioBus() {
  const dryGain = audioContext.createGain();
  const wetInput = audioContext.createGain();
  const delay = audioContext.createDelay(0.4);
  const feedback = audioContext.createGain();
  const wetGain = audioContext.createGain();

  // Dry signal is the clean, immediate arcade sound.
  dryGain.gain.value = 1;
  dryGain.connect(masterGain);

  // Wet signal is a short delay with quiet feedback for subtle underwater space.
  wetInput.gain.value = REVERB_ENABLED ? 1 : 0;
  delay.delayTime.value = REVERB_DELAY_SECONDS;
  feedback.gain.value = REVERB_FEEDBACK;
  wetGain.gain.value = REVERB_WET_GAIN;

  wetInput.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(masterGain);

  return { dryGain, wetInput };
}

// Browsers, especially iPhone Safari, block audio until a user gesture happens.
// initAudio() is called from Space, tap, click, and button handlers so sound
// unlocks only after the player chooses to interact with the game.
function initAudio() {
  if (audioUnlocked) {
    return true;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return false;
    }

    audioContext = audioContext || new AudioContextClass();
    masterGain = masterGain || audioContext.createGain();
    masterGain.gain.value = isSoundMuted ? 0 : MASTER_VOLUME;
    masterGain.connect(audioContext.destination);
    audioBus = audioBus || createAudioBus();

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    audioUnlocked = true;
    return true;
  } catch (error) {
    return false;
  }
}

function setMuted(isMuted) {
  isSoundMuted = isMuted;
  saveSoundMuted();
  updateSoundButton();

  if (masterGain) {
    masterGain.gain.value = isSoundMuted ? 0 : MASTER_VOLUME;
  }
}

function toggleMute() {
  initAudio();
  setMuted(!isSoundMuted);

  if (!isSoundMuted) {
    playSound("select");
  }
}

function playTone(frequency, duration, options = {}) {
  if (!audioContext || !audioBus) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const echoSend = audioContext.createGain();
  const endTime = now + duration;

  oscillator.type = options.type || "square";
  oscillator.frequency.setValueAtTime(frequency, now);

  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, endTime);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(options.volume || 0.55, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  echoSend.gain.value = options.echoAmount ?? 0.45;

  oscillator.connect(gain);
  gain.connect(audioBus.dryGain);
  gain.connect(echoSend);
  echoSend.connect(audioBus.wetInput);
  oscillator.start(now);
  oscillator.stop(endTime + 0.02);
}

function playNoise(duration, options = {}) {
  if (!audioContext || !audioBus) {
    return;
  }

  const sampleRate = audioContext.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const echoSend = audioContext.createGain();
  const now = audioContext.currentTime;
  const endTime = now + duration;

  source.buffer = buffer;
  gain.gain.setValueAtTime(options.volume || 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  echoSend.gain.value = options.echoAmount ?? 0.35;
  source.connect(gain);
  gain.connect(audioBus.dryGain);
  gain.connect(echoSend);
  echoSend.connect(audioBus.wetInput);
  source.start(now);
  source.stop(endTime + 0.02);
}

function playSound(name) {
  if (isSoundMuted || !audioUnlocked || !audioContext) {
    return;
  }

  try {
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    if (name === "chum") {
      playTone(520, 0.08, { endFrequency: 780, type: "triangle", volume: 0.34, echoAmount: 0.18 });
    } else if (name === "frenzyBait") {
      playTone(360, 0.11, { endFrequency: 920, type: "sawtooth", volume: 0.4, echoAmount: 0.52 });
      setTimeout(() => playTone(720, 0.1, { endFrequency: 1180, type: "triangle", volume: 0.32, echoAmount: 0.48 }), 70);
    } else if (name === "frenzyStart") {
      [280, 420, 650].forEach((frequency, index) => {
        setTimeout(() => playTone(frequency, 0.09, {
          endFrequency: frequency * 1.45,
          volume: 0.34,
          echoAmount: 0.55,
        }), index * 70);
      });
    } else if (name === "enemyChomp") {
      playNoise(0.08, { volume: 0.24, echoAmount: 0.25 });
      playTone(190, 0.08, { endFrequency: 95, type: "square", volume: 0.34, echoAmount: 0.3 });
      setTimeout(() => playTone(560, 0.07, { endFrequency: 840, type: "triangle", volume: 0.3, echoAmount: 0.35 }), 45);
    } else if (name === "loseLife") {
      playTone(260, 0.22, { endFrequency: 110, type: "sawtooth", volume: 0.34, echoAmount: 0.38 });
    } else if (name === "levelClear") {
      [520, 660, 820].forEach((frequency, index) => {
        setTimeout(() => playTone(frequency, 0.12, { type: "triangle", volume: 0.32, echoAmount: 0.55 }), index * 95);
      });
    } else if (name === "gameOver") {
      [260, 190, 120].forEach((frequency, index) => {
        setTimeout(() => playTone(frequency, 0.16, { type: "sawtooth", volume: 0.3, echoAmount: 0.34 }), index * 120);
      });
    } else if (name === "win") {
      [460, 620, 780, 1040].forEach((frequency, index) => {
        setTimeout(() => playTone(frequency, 0.14, { type: "triangle", volume: 0.32, echoAmount: 0.62 }), index * 90);
      });
    } else if (name === "pause") {
      playTone(300, 0.06, { endFrequency: 220, type: "square", volume: 0.22, echoAmount: 0.08 });
    } else if (name === "resume" || name === "select") {
      playTone(520, 0.06, { endFrequency: 690, type: "square", volume: 0.22, echoAmount: 0.08 });
    }
  } catch (error) {
    // Sound effects are optional. Audio errors should never stop gameplay.
  }
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
  initAudio();

  if (gameState !== GAME_STATE.PLAYING) {
    return;
  }

  if (isPaused) {
    totalPausedTime += performance.now() - pauseStartedRealTime;
    pauseStartedRealTime = 0;
    pauseStartedGameTime = 0;
    isPaused = false;
    playSound("resume");
  } else {
    const now = performance.now();

    pauseStartedRealTime = now;
    pauseStartedGameTime = now - totalPausedTime;
    isPaused = true;
    playSound("pause");
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

  playSound("frenzyStart");
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
  particles = [];
  lastSharkBubbleTime = 0;
  endFrenzyMode();
  resetPlayerPosition();
  rebuildEnemies();
  updateStatusDisplay();
}

function resetGame() {
  currentLevel = 1;
  score = 0;
  lives = STARTING_LIVES;
  debugMode = false;
  isPaused = false;
  totalPausedTime = 0;
  pauseStartedRealTime = 0;
  pauseStartedGameTime = 0;
  levelClearReady = false;
  particles = [];
  levelClearMessage = "";
  lastSharkBubbleTime = 0;
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

  // The tolerance follows entity.speed, so small speed changes still snap to
  // tile centers before turns, wall checks, and pickups are handled.
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
  player.chompBoostUntil = 0;
}

function triggerSharkChomp() {
  player.chompBoostUntil = getGameTime() + SHARK_CHOMP_BOOST_MS;
}

function collectTile() {
  const tile = maze[player.row][player.col];

  // Collection happens only when the shark reaches a tile center. The tile is
  // then changed to EMPTY so it cannot be collected again.
  if (tile === TILE.CHUM) {
    maze[player.row][player.col] = TILE.EMPTY;
    remainingChum -= 1;
    triggerSharkChomp();
    playSound("chum");
    spawnChumParticles(player.x, player.y);
    updateScore(SCORE_VALUES.CHUM);
    checkLevelClear();
    return;
  }

  if (tile === TILE.FRENZY_BAIT) {
    maze[player.row][player.col] = TILE.EMPTY;
    triggerSharkChomp();
    playSound("frenzyBait");
    spawnFrenzyParticles(player.x, player.y);
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
  levelClearReady = true;
  levelClearMessage = getRandomLevelClearMessage();
  player.direction = null;
  player.nextDirection = null;
  updateScore(LEVEL_CLEAR_BONUS * currentLevel);
  playSound("levelClear");
  spawnLevelClearParticles();
  endFrenzyMode();
  updateStatusDisplay();
}

function advanceToNextLevel() {
  if (gameState !== GAME_STATE.LEVEL_CLEAR) {
    return;
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
  playSound("win");
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
  spawnSharkBubbleTrail(player.direction);
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
  playSound("loseLife");
  updateScoreDisplay();

  resetPlayerPosition();
  resetEnemies();

  if (lives <= 0) {
    lives = 0;
    updateStatusDisplay();
    gameState = GAME_STATE.GAME_OVER;
    updatePauseButton();
    playSound("gameOver");
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
    const chompScore = getFrenzyChompScore();

    triggerSharkChomp();
    playSound("enemyChomp");
    spawnEnemyChompEffect(enemy.x, enemy.y, chompScore);
    updateScore(chompScore);
    frenzyMode.chompCount += 1;
    sendEnemyToSpawn(enemy);
    return;
  }

  loseLife();
}

// Level-clear messages and effects are visual only; gameplay progression stays unchanged.
function getRandomLevelClearMessage() {
  let message = LEVEL_CLEAR_MESSAGES[Math.floor(Math.random() * LEVEL_CLEAR_MESSAGES.length)];

  // Avoid showing the same punchline twice in a row when there are alternatives.
  if (LEVEL_CLEAR_MESSAGES.length > 1) {
    while (message === lastLevelClearMessage) {
      message = LEVEL_CLEAR_MESSAGES[Math.floor(Math.random() * LEVEL_CLEAR_MESSAGES.length)];
    }
  }

  lastLevelClearMessage = message;
  return message;
}

function addParticle(particle) {
  particles.push({
    createdAt: getGameTime(),
    duration: 420,
    type: "dot",
    color: "#d9fbff",
    size: 3,
    vx: 0,
    vy: -20,
    ...particle,
  });

  if (particles.length > MAX_PARTICLES) {
    particles.splice(0, particles.length - MAX_PARTICLES);
  }
}

function spawnBurst(x, y, count, colors, options = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
    const speed = (options.minSpeed || 18) + Math.random() * (options.speedRange || 34);

    addParticle({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (options.minSize || 2) + Math.random() * (options.sizeRange || 3),
      duration: options.duration || 430,
      color: colors[i % colors.length],
    });
  }
}

// spawnChumParticles() creates a tiny pink pop when a chum bit is collected.
function spawnChumParticles(x, y) {
  spawnBurst(x, y, 8, ["#ff6f91", "#ff3f67", "#ffdce2"], {
    minSpeed: 14,
    speedRange: 28,
    minSize: 1.8,
    sizeRange: 2.2,
    duration: 360,
  });
}

// spawnFrenzyParticles() makes Frenzy Bait feel stronger than regular chum.
function spawnFrenzyParticles(x, y) {
  spawnBurst(x, y, 16, ["#ffcf5c", "#ff7a3d", "#ff3b30", "#fff4a8"], {
    minSpeed: 26,
    speedRange: 42,
    minSize: 2.4,
    sizeRange: 3.4,
    duration: 620,
  });

  addParticle({
    type: "ring",
    x,
    y,
    size: 9,
    duration: 520,
    color: "rgba(255, 207, 92, 0.9)",
  });
}

function spawnLevelClearParticles() {
  for (let i = 0; i < 34; i += 1) {
    addParticle({
      x: 64 + Math.random() * (canvas.width - 128),
      y: canvas.height + 12 + Math.random() * 38,
      vx: -12 + Math.random() * 24,
      vy: -70 - Math.random() * 80,
      size: 2 + Math.random() * 4,
      duration: 1100 + Math.random() * 550,
      color: i % 3 === 0 ? "#4fe3ff" : i % 3 === 1 ? "#ffcf5c" : "#ff9b87",
    });
  }
}

// spawnEnemyChompEffect() adds bubbles, a flash ring, and floating score text.
function spawnEnemyChompEffect(x, y, chompScore) {
  spawnBurst(x, y, 18, ["#d9fbff", "#4fe3ff", "#ffcf5c"], {
    minSpeed: 22,
    speedRange: 46,
    minSize: 2,
    sizeRange: 4,
    duration: 560,
  });

  addParticle({
    type: "ring",
    x,
    y,
    size: 12,
    duration: 430,
    color: "rgba(217, 251, 255, 0.92)",
  });

  addParticle({
    type: "text",
    x,
    y: y - 12,
    vx: 0,
    vy: -34,
    duration: 760,
    color: "#ffcf5c",
    text: `+${chompScore}`,
  });
}

function spawnSharkBubbleTrail(directionName) {
  const now = getGameTime();

  if (!directionName || now - lastSharkBubbleTime < SHARK_BUBBLE_INTERVAL_MS) {
    return;
  }

  lastSharkBubbleTime = now;

  const direction = DIRECTIONS[directionName];
  const bubbleX = player.x - direction.x * 18 + (Math.random() * 6 - 3);
  const bubbleY = player.y - direction.y * 12 + (Math.random() * 6 - 3);

  addParticle({
    x: bubbleX,
    y: bubbleY,
    vx: -direction.x * 8 + (Math.random() * 10 - 5),
    vy: -22 - Math.random() * 16,
    size: 1.7 + Math.random() * 2.4,
    duration: 520,
    color: "rgba(217, 251, 255, 0.72)",
  });
}

function updateParticles() {
  const now = getGameTime();

  particles = particles.filter((particle) => now - particle.createdAt < particle.duration);
}

// drawParticles() handles chum pops, Frenzy bursts, chomp bubbles, and score text.
function drawParticles() {
  const now = getGameTime();

  ctx.save();
  particles.forEach((particle) => {
    const progress = Math.min(1, (now - particle.createdAt) / particle.duration);
    const alpha = Math.max(0, 1 - progress);
    const x = particle.x + particle.vx * progress;
    const y = particle.y + particle.vy * progress;

    ctx.globalAlpha = alpha;

    if (particle.type === "ring") {
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, particle.size + progress * 18, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (particle.type === "text") {
      ctx.fillStyle = particle.color;
      ctx.font = "bold 18px Trebuchet MS, Lucida Console, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255, 207, 92, 0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(particle.text, x, y);
      ctx.shadowBlur = 0;
      return;
    }

    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(x, y, particle.size * (1 - progress * 0.3), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

const REEF_BUBBLES = [
  { x: 36, y: 70, size: 5 },
  { x: 132, y: 402, size: 3 },
  { x: 242, y: 118, size: 4 },
  { x: 354, y: 354, size: 3 },
  { x: 472, y: 84, size: 5 },
  { x: 554, y: 292, size: 4 },
];

const BOARD_BUBBLES = [
  { x: 58, y: 430, size: 2, speed: 18 },
  { x: 92, y: 238, size: 1.5, speed: 14 },
  { x: 176, y: 378, size: 2.5, speed: 16 },
  { x: 286, y: 186, size: 1.7, speed: 13 },
  { x: 410, y: 444, size: 2.2, speed: 20 },
  { x: 520, y: 276, size: 1.8, speed: 15 },
  { x: 572, y: 390, size: 2.6, speed: 17 },
];

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// drawFloorTiles() paints the dark water corridors before any walls or actors.
function drawWaterTile(x, y) {
  const tileColumn = x / TILE_SIZE;
  const tileRow = y / TILE_SIZE;
  const tone = (tileColumn * 7 + tileRow * 11) % 5;
  const shimmer = Math.sin(getGameTime() / 900 + tileColumn * 0.7 + tileRow * 0.45) * 0.018;
  const waterGradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);

  waterGradient.addColorStop(0, `rgba(5, 31, 52, ${0.98 + shimmer})`);
  waterGradient.addColorStop(0.55, `rgba(7, 39, 62, ${0.98 + shimmer})`);
  waterGradient.addColorStop(1, `rgba(3, 21, 36, ${0.98 + shimmer})`);
  ctx.fillStyle = waterGradient;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = tone % 2 === 0 ? "rgba(79, 227, 255, 0.045)" : "rgba(43, 214, 187, 0.035)";
  ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);

  ctx.strokeStyle = "rgba(159, 237, 255, 0.035)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 22 + tone);
  ctx.quadraticCurveTo(x + 16, y + 17 + tone, x + 25, y + 21);
  ctx.stroke();
}

function drawFloorTiles() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      drawWaterTile(col * TILE_SIZE, row * TILE_SIZE);
    }
  }
}

function drawAmbientBubbles() {
  const time = getGameTime() / 1000;

  ctx.save();
  BOARD_BUBBLES.forEach((bubble, index) => {
    const y = (bubble.y - time * bubble.speed + canvas.height) % canvas.height;
    const sway = Math.sin(time * 1.2 + index) * 5;

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(217, 251, 255, 0.58)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bubble.x + sway, y, bubble.size, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

// drawMazeWalls() keeps the walls readable while giving them reef-stone texture.
function drawWallTile(x, y) {
  const gradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
  gradient.addColorStop(0, "#59a9a1");
  gradient.addColorStop(0.42, "#2f6f6f");
  gradient.addColorStop(0.72, "#254d5f");
  gradient.addColorStop(1, "#173245");

  ctx.fillStyle = gradient;
  drawRoundedRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 7);
  ctx.fill();

  ctx.strokeStyle = "rgba(217, 251, 255, 0.22)";
  ctx.lineWidth = 2;
  drawRoundedRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6, 5);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 155, 135, 0.34)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 11);
  ctx.quadraticCurveTo(x + 14, y + 8, x + 21, y + 13);
  ctx.moveTo(x + 18, y + 23);
  ctx.quadraticCurveTo(x + 23, y + 19, x + 27, y + 24);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 207, 169, 0.3)";
  ctx.beginPath();
  ctx.arc(x + 10, y + 10, 2.2, 0, Math.PI * 2);
  ctx.arc(x + 23, y + 20, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 14, y + 25, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(4, 24, 39, 0.18)";
  ctx.fillRect(x + 5, y + TILE_SIZE - 5, TILE_SIZE - 10, 2);
}

function drawMazeWalls() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (maze[row][col] === TILE.WALL) {
        drawWallTile(col * TILE_SIZE, row * TILE_SIZE);
      }
    }
  }
}

function drawBoardFrame() {
  ctx.save();
  ctx.strokeStyle = "rgba(79, 227, 255, 0.55)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(79, 227, 255, 0.75)";
  ctx.shadowBlur = 12;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 155, 135, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  ctx.restore();
}

// drawChum() makes each collectible a tiny organic bit instead of a plain dot.
function drawChum(x, y) {
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;

  ctx.save();
  ctx.shadowColor = "rgba(255, 95, 109, 0.55)";
  ctx.shadowBlur = 5;

  ctx.fillStyle = "#ff6f91";
  ctx.beginPath();
  ctx.ellipse(centerX - 2, centerY, 4, 3, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff3f67";
  ctx.beginPath();
  ctx.ellipse(centerX + 3, centerY + 2, 3, 2.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 220, 226, 0.78)";
  ctx.beginPath();
  ctx.arc(centerX - 3, centerY - 1, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// drawFrenzyBait() gives the power item a stronger pulsing arcade glow.
function drawFrenzyBait(x, y) {
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  const pulse = Math.sin(getGameTime() / 130);
  const glowSize = 11 + pulse * 1.5;
  const baitGradient = ctx.createRadialGradient(centerX - 2, centerY - 3, 2, centerX, centerY, 10);

  baitGradient.addColorStop(0, "#fff4a8");
  baitGradient.addColorStop(0.42, "#ffb23b");
  baitGradient.addColorStop(1, "#ff3b30");

  ctx.save();
  ctx.shadowColor = "rgba(255, 74, 34, 0.95)";
  ctx.shadowBlur = 18 + pulse * 5;
  ctx.strokeStyle = "rgba(255, 207, 92, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, glowSize, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = baitGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 244, 168, 0.9)";
  ctx.beginPath();
  ctx.arc(centerX - 2, centerY - 3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCollectibles() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = maze[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (tile === TILE.CHUM) {
        drawChum(x, y);
      }

      if (tile === TILE.FRENZY_BAIT) {
        drawFrenzyBait(x, y);
      }
    }
  }
}

function getSharkChompAmount() {
  const now = getGameTime();
  const isBoosted = now < player.chompBoostUntil;
  const isMoving = gameState === GAME_STATE.PLAYING && Boolean(player.direction);

  if (isBoosted) {
    return 1;
  }

  if (isMoving) {
    // Smoothly cycles between a partly closed and wide-open arcade chomp.
    return 0.18 + ((Math.sin(now / 85) + 1) / 2) * 0.82;
  }

  // A tiny idle twitch keeps the shark alive without looking busy.
  return Math.sin(now / 700) > 0.94 ? 0.26 : 0.04;
}

function getSharkUpperJawLift(chompAmount) {
  // The mouth starts almost closed, so the nose should stay in its normal spot.
  // Once the chomp opens, this lifts the upper jaw/nose a few pixels too.
  const openAmount = Math.max(0, (chompAmount - 0.14) / 0.86);
  return openAmount * SHARK_UPPER_JAW_MAX_LIFT;
}

function drawSharkTeeth(chompAmount, upperLipY, lowerLipY) {
  const topToothHeight = 2.4 + chompAmount * 2.2;
  const bottomToothHeight = 2 + chompAmount * 1.8;

  ctx.fillStyle = "#f3fbff";

  // Top teeth point downward from the upper jaw.
  [16, 19.5, 22.5].forEach((toothX) => {
    ctx.beginPath();
    ctx.moveTo(toothX - 1.2, upperLipY + 0.4);
    ctx.lineTo(toothX + 1.2, upperLipY + 0.4);
    ctx.lineTo(toothX, upperLipY + topToothHeight);
    ctx.closePath();
    ctx.fill();
  });

  // Bottom teeth point upward from the lower jaw.
  [17.5, 21].forEach((toothX) => {
    ctx.beginPath();
    ctx.moveTo(toothX - 1.1, lowerLipY - 0.4);
    ctx.lineTo(toothX + 1.1, lowerLipY - 0.4);
    ctx.lineTo(toothX, lowerLipY - bottomToothHeight);
    ctx.closePath();
    ctx.fill();
  });
}

function drawSharkMouth(chompAmount, isFrenzy) {
  const upperJawLift = getSharkUpperJawLift(chompAmount);
  const upperLipY = 2 - chompAmount * 5.5 - upperJawLift * 0.25;
  const lowerLipY = 3.5 + chompAmount * 7;
  const mouthBackX = 12.5;
  const mouthTipX = 23;

  if (chompAmount < 0.18) {
    // Closed-mouth pose with a hint of teeth.
    ctx.strokeStyle = isFrenzy ? "#7f1f1b" : "#1d3d4f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, 3 - upperJawLift * 0.15);
    ctx.quadraticCurveTo(17, 7, 22, 2 - upperJawLift * 0.4);
    ctx.stroke();

    ctx.strokeStyle = "#f3fbff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(17, 6);
    ctx.moveTo(19, 4);
    ctx.lineTo(20, 5.5);
    ctx.stroke();
    return;
  }

  // Open-mouth pose: dark wedge, bright lips, and visible cartoon teeth.
  ctx.fillStyle = isFrenzy ? "#4f130f" : "#07131f";
  ctx.beginPath();
  ctx.moveTo(mouthBackX, 1.5 - upperJawLift * 0.15);
  ctx.lineTo(mouthTipX, upperLipY);
  ctx.lineTo(mouthTipX - 1, lowerLipY);
  ctx.quadraticCurveTo(17, lowerLipY + 1.5, mouthBackX, 4.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = isFrenzy ? "#ffd4c7" : "#d9fbff";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(mouthBackX, 1.5 - upperJawLift * 0.15);
  ctx.lineTo(mouthTipX, upperLipY);
  ctx.moveTo(mouthBackX, 4.5);
  ctx.quadraticCurveTo(17, lowerLipY + 1.5, mouthTipX - 1, lowerLipY);
  ctx.stroke();

  drawSharkTeeth(chompAmount, upperLipY, lowerLipY);
}

function drawSharkTail() {
  // Two clear tail lobes with no center prong or star-like middle point.
  ctx.beginPath();
  ctx.moveTo(-17, -1.2);
  ctx.quadraticCurveTo(-24, -4.5, -29, -11);
  ctx.quadraticCurveTo(-27, -3.6, -19, -0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-17, 1.2);
  ctx.quadraticCurveTo(-24, 4.5, -29, 11);
  ctx.quadraticCurveTo(-27, 3.6, -19, 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSharkBody(chompAmount) {
  const upperJawLift = getSharkUpperJawLift(chompAmount);

  // Longer torpedo body with an arched back and flatter underside. During an
  // open chomp, the nose tip and upper snout lift slightly with the upper jaw.
  ctx.beginPath();
  ctx.moveTo(-18, -6.4);
  ctx.quadraticCurveTo(-2, -13.2, 18, -5.2 - upperJawLift * 0.35);
  ctx.quadraticCurveTo(24, -2.6 - upperJawLift * 0.75, 26, -upperJawLift);
  ctx.quadraticCurveTo(20, 3.8, 6, 5.8);
  ctx.lineTo(-12, 5.8);
  ctx.quadraticCurveTo(-19, 4.2, -21, 0.4);
  ctx.quadraticCurveTo(-21, -3.2, -18, -6.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSharkDorsalFin(isFrenzy) {
  // Lower, wider swept-back dorsal fin integrated into the body.
  ctx.fillStyle = isFrenzy ? "#ffcf5c" : "#b7d9e6";
  ctx.beginPath();
  ctx.moveTo(-9, -7.3);
  ctx.lineTo(-3.5, -13.2);
  ctx.quadraticCurveTo(0, -10.2, 8.5, -6.8);
  ctx.lineTo(-1.5, -6.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSharkBelly() {
  // White belly follows a smooth, shallow lower curve instead of a round bulge.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f3fbff";
  ctx.beginPath();
  ctx.moveTo(-5, 4.3);
  ctx.quadraticCurveTo(7, 3.1, 19, 1.1);
  ctx.quadraticCurveTo(15, 4.8, 5, 5.7);
  ctx.lineTo(-8, 5.6);
  ctx.quadraticCurveTo(-9.5, 5.1, -5, 4.3);
  ctx.closePath();
  ctx.fill();
}

function drawSharkEye(chompAmount) {
  const upperJawLift = getSharkUpperJawLift(chompAmount);
  const eyeY = -5 - upperJawLift * 0.35;

  // The eye rides with the upper jaw so the whole snout feels hinged upward.
  ctx.fillStyle = "#f8fdff";
  ctx.beginPath();
  ctx.arc(11, eyeY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#07131f";
  ctx.beginPath();
  ctx.arc(12, eyeY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d9fbff";
  ctx.beginPath();
  ctx.arc(10.6, eyeY - 1.1, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerShark() {
  const facing = player.direction || player.nextDirection || "right";
  const direction = DIRECTIONS[facing];
  const isFrenzy = frenzyMode.active && gameState === GAME_STATE.PLAYING;
  const pulse = isFrenzy ? Math.sin(getGameTime() / 100) : 0;
  const chompAmount = getSharkChompAmount();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(direction.angle);

  const bodyGradient = ctx.createLinearGradient(-18, -12, 18, 12);
  bodyGradient.addColorStop(0, isFrenzy ? "#ffb15f" : "#9ac4d4");
  bodyGradient.addColorStop(0.42, isFrenzy ? "#ff7a3d" : "#6f9fb7");
  bodyGradient.addColorStop(1, isFrenzy ? "#c93c34" : "#375f75");

  ctx.shadowColor = isFrenzy ? "rgba(255, 111, 64, 0.95)" : "rgba(217, 251, 255, 0.45)";
  ctx.shadowBlur = isFrenzy ? 18 + pulse * 5 : 8;

  if (isFrenzy) {
    ctx.strokeStyle = "rgba(255, 207, 92, 0.68)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 21 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = "#d9fbff";
  ctx.lineWidth = 2;

  drawSharkTail();
  drawSharkBody(chompAmount);
  drawSharkDorsalFin(isFrenzy);
  drawSharkBelly();

  drawSharkEye(chompAmount);

  // Animated jaws: the lower jaw drops while the upper jaw/nose lifts, all in
  // local shark coordinates before direction rotation is restored.
  drawSharkMouth(chompAmount, isFrenzy);

  ctx.restore();
}

function drawDolphinPatrol(enemy) {
  const direction = DIRECTIONS[enemy.direction || enemy.startDirection];
  const isVulnerable = enemy.state === "vulnerable";
  const isReturning = enemy.state === "returning";
  const bob = Math.sin(getGameTime() / 260 + enemy.startRow) * 1.3;
  const bodyColor = isVulnerable ? "#8494ac" : "#7fd8ff";
  const finColor = isVulnerable ? "#c4cfdd" : "#b7ecff";
  const strokeColor = isVulnerable ? "#eef4ff" : "#d9fbff";

  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);
  ctx.rotate(direction.angle);
  ctx.globalAlpha = isReturning ? 0.55 : 1;

  ctx.shadowColor = isVulnerable ? "rgba(217, 251, 255, 0.7)" : "rgba(79, 227, 255, 0.45)";
  ctx.shadowBlur = isVulnerable ? 14 : 7;

  if (isVulnerable) {
    ctx.strokeStyle = "rgba(217, 251, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Forked tail.
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.lineTo(-25, -10);
  ctx.lineTo(-21, -1);
  ctx.lineTo(-26, 7);
  ctx.lineTo(-15, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Smooth body and rounded dolphin nose.
  const bodyGradient = ctx.createLinearGradient(-15, -10, 17, 10);
  bodyGradient.addColorStop(0, finColor);
  bodyGradient.addColorStop(0.5, bodyColor);
  bodyGradient.addColorStop(1, isVulnerable ? "#5f7189" : "#2f99c7");

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 15, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(13, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Curved dorsal fin and small lower fin.
  ctx.fillStyle = finColor;
  ctx.beginPath();
  ctx.moveTo(-5, -7);
  ctx.quadraticCurveTo(0, -18, 8, -7);
  ctx.lineTo(1, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(7, 13);
  ctx.lineTo(8, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Belly, eye, and smile.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f4fdff";
  ctx.beginPath();
  ctx.ellipse(5, 4, 9, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#06243a";
  ctx.beginPath();
  ctx.arc(13, -4, 1.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#17617b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 4);
  ctx.quadraticCurveTo(15, 7, 19, 3);
  ctx.stroke();

  ctx.restore();
}

function drawElectricEel(enemy) {
  const direction = DIRECTIONS[enemy.direction || enemy.startDirection];
  const isVulnerable = enemy.state === "vulnerable";
  const isReturning = enemy.state === "returning";
  const pulse = Math.sin(getGameTime() / 90);
  const bob = Math.cos(getGameTime() / 230 + enemy.startCol) * 1.4;
  const bodyColor = isVulnerable ? "#879f95" : "#b9f15a";
  const bellyColor = isVulnerable ? "#d7dfd5" : "#f7ff6a";
  const sparkColor = isVulnerable ? "rgba(217, 251, 255, 0.7)" : "#fff3a1";

  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);
  ctx.rotate(direction.angle);
  ctx.globalAlpha = isReturning ? 0.55 : 1;
  ctx.shadowColor = isVulnerable ? "rgba(217, 251, 255, 0.65)" : "rgba(247, 255, 106, 0.85)";
  ctx.shadowBlur = isVulnerable ? 12 : 13 + pulse * 4;

  if (isVulnerable) {
    ctx.strokeStyle = "rgba(217, 251, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Long curvy eel body.
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-22, 4);
  ctx.quadraticCurveTo(-14, -8, -5, 1);
  ctx.quadraticCurveTo(4, 10, 13, -1);
  ctx.quadraticCurveTo(18, -7, 22, -3);
  ctx.stroke();

  ctx.strokeStyle = bellyColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, 1);
  ctx.lineTo(-11, -5);
  ctx.moveTo(-6, 1);
  ctx.lineTo(-1, 6);
  ctx.moveTo(5, 2);
  ctx.lineTo(10, -4);
  ctx.moveTo(14, -2);
  ctx.lineTo(18, -6);
  ctx.stroke();

  // Small electric sparks when dangerous, soft warning ticks when vulnerable.
  if (!isVulnerable && !isReturning) {
    ctx.strokeStyle = sparkColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -13);
    ctx.lineTo(-5, -8);
    ctx.lineTo(-9, -5);
    ctx.moveTo(5, 12);
    ctx.lineTo(11, 7);
    ctx.lineTo(7, 4);
    ctx.moveTo(18, 5);
    ctx.lineTo(23, 1);
    ctx.lineTo(20, -2);
    ctx.stroke();
  }

  // Eye.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f7ff6a";
  ctx.beginPath();
  ctx.arc(19, -5, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#08283d";
  ctx.beginPath();
  ctx.arc(20, -5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDiverDrone(enemy) {
  const direction = DIRECTIONS[enemy.direction || enemy.startDirection];
  const isVulnerable = enemy.state === "vulnerable";
  const isReturning = enemy.state === "returning";
  const bob = Math.sin(getGameTime() / 240 + enemy.startCol) * 1.2;
  const bodyColor = isVulnerable ? "#9a978e" : "#ff9d33";
  const trimColor = isVulnerable ? "#d5d0c6" : "#ffdf75";
  const darkTrim = isVulnerable ? "#5f625f" : "#854c1c";
  const spin = getGameTime() / 90;

  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);
  ctx.rotate(direction.angle);
  ctx.globalAlpha = isReturning ? 0.55 : 1;
  ctx.shadowColor = isVulnerable ? "rgba(217, 251, 255, 0.65)" : "rgba(255, 177, 59, 0.75)";
  ctx.shadowBlur = isVulnerable ? 12 : 13;

  if (isVulnerable) {
    ctx.strokeStyle = "rgba(217, 251, 255, 0.48)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Compact mechanical body.
  const bodyGradient = ctx.createLinearGradient(-12, -10, 13, 10);
  bodyGradient.addColorStop(0, trimColor);
  bodyGradient.addColorStop(0.46, bodyColor);
  bodyGradient.addColorStop(1, darkTrim);

  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = "#fff0bd";
  ctx.lineWidth = 2;
  drawRoundedRect(-13, -9, 25, 18, 5);
  ctx.fill();
  ctx.stroke();

  // Metal side rails.
  ctx.strokeStyle = darkTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, -5);
  ctx.lineTo(5, -5);
  ctx.moveTo(-9, 5);
  ctx.lineTo(5, 5);
  ctx.stroke();

  // Front sensor light.
  ctx.shadowColor = isVulnerable ? "rgba(217, 251, 255, 0.7)" : "rgba(79, 227, 255, 0.75)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#08283d";
  ctx.beginPath();
  ctx.arc(9, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isVulnerable ? "#d9fbff" : "#4fe3ff";
  ctx.beginPath();
  ctx.arc(10, -1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Propeller pod and spinning blades.
  ctx.fillStyle = darkTrim;
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-13, -11, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.translate(-13, -11);
  ctx.rotate(spin);
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.restore();

  // Side fins help the drone read as a little underwater machine.
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = "#fff0bd";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(-17, 13);
  ctx.lineTo(-6, 12);
  ctx.closePath();
  ctx.moveTo(4, 8);
  ctx.lineTo(15, 12);
  ctx.lineTo(8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

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
  drawFloorTiles();
  drawAmbientBubbles();
  drawMazeWalls();
  drawCollectibles();
  drawBoardFrame();
}

function drawOverlayBackdrop(accentColor, isTransparent) {
  const backdropGradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    40,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 1.2
  );

  backdropGradient.addColorStop(0, isTransparent ? "rgba(8, 40, 61, 0.78)" : "#0b3650");
  backdropGradient.addColorStop(0.56, isTransparent ? "rgba(4, 24, 39, 0.82)" : "#041827");
  backdropGradient.addColorStop(1, isTransparent ? "rgba(3, 17, 31, 0.9)" : "#020b14");

  ctx.fillStyle = backdropGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  REEF_BUBBLES.forEach((bubble, index) => {
    const drift = (getGameTime() / (26 + index * 4)) % 38;
    const y = ((bubble.y - drift) + canvas.height) % canvas.height;

    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.13;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bubble.x, y, bubble.size + index % 3, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

function drawOverlayPanel(width, height) {
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  const panelGradient = ctx.createLinearGradient(x, y, x, y + height);

  panelGradient.addColorStop(0, "rgba(9, 56, 76, 0.92)");
  panelGradient.addColorStop(1, "rgba(3, 17, 31, 0.94)");

  ctx.save();
  ctx.shadowColor = "rgba(79, 227, 255, 0.42)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = panelGradient;
  drawRoundedRect(x, y, width, height, 12);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(79, 227, 255, 0.82)";
  ctx.lineWidth = 2;
  drawRoundedRect(x + 4, y + 4, width - 8, height - 8, 10);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 155, 135, 0.58)";
  ctx.lineWidth = 1;
  drawRoundedRect(x + 10, y + 10, width - 20, height - 20, 8);
  ctx.stroke();
  ctx.restore();
}

// drawOverlay() is shared by start, pause, level clear, game over, and win screens.
function drawOverlay(options) {
  const centerX = canvas.width / 2;
  const panelWidth = options.panelWidth || 492;
  const panelHeight = options.panelHeight || 332;
  const panelTop = (canvas.height - panelHeight) / 2;

  drawOverlayBackdrop(options.accentColor, options.transparent);
  drawOverlayPanel(panelWidth, panelHeight);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = options.titleColor;
  ctx.font = options.titleFont || "bold 56px Trebuchet MS, Lucida Console, monospace";
  ctx.shadowColor = options.glowColor;
  ctx.shadowBlur = 16;
  ctx.fillText(options.title, centerX, panelTop + 70);

  ctx.shadowBlur = 0;
  ctx.fillStyle = options.subtitleColor || "#ffd4c7";
  ctx.font = options.subtitleFont || "bold 22px Trebuchet MS, Lucida Console, monospace";
  ctx.fillText(options.subtitle, centerX, panelTop + 128);

  ctx.fillStyle = "#d9fbff";
  ctx.font = "20px Trebuchet MS, Lucida Console, monospace";
  options.lines.forEach((line, index) => {
    ctx.fillText(line, centerX, panelTop + 184 + index * 36);
  });

  ctx.fillStyle = "#ffcf5c";
  ctx.font = "bold 21px Trebuchet MS, Lucida Console, monospace";
  ctx.shadowColor = "rgba(255, 207, 92, 0.6)";
  ctx.shadowBlur = 10;
  ctx.fillText(options.action, centerX, panelTop + panelHeight - 42);
  ctx.restore();
}

function drawStartScreen() {
  drawOverlay({
    title: "CHOMP",
    subtitle: "A Shark Maze Arcade Game",
    lines: [
      "Collect chum. Avoid reef defenders.",
      `High Score: ${highScore}`,
    ],
    action: "Press Space or Tap to Start",
    titleColor: "#4fe3ff",
    glowColor: "rgba(79, 227, 255, 0.9)",
    accentColor: "rgba(79, 227, 255, 0.9)",
    titleFont: "bold 64px Trebuchet MS, Lucida Console, monospace",
  });
}

function drawGameOverScreen() {
  drawOverlay({
    title: "GAME OVER",
    subtitle: `Final Score: ${score}`,
    lines: [
      `High Score: ${highScore}`,
    ],
    action: "Press Space or Tap to Restart",
    titleColor: "#ff5f6d",
    glowColor: "rgba(255, 95, 109, 0.9)",
    accentColor: "rgba(255, 95, 109, 0.9)",
    subtitleColor: "#d9fbff",
    titleFont: "bold 56px Trebuchet MS, Lucida Console, monospace",
  });
}

function drawLevelClearOverlay() {
  drawOverlay({
    title: "LEVEL CLEAR!",
    subtitle: `Level ${currentLevel} Complete`,
    lines: [
      levelClearMessage || "Jaw-some job!",
      `Bonus: ${LEVEL_CLEAR_BONUS * currentLevel}`,
    ],
    action: "Press Space or Tap to Continue",
    titleColor: "#4fe3ff",
    glowColor: "rgba(79, 227, 255, 0.9)",
    accentColor: "rgba(79, 227, 255, 0.9)",
    subtitleColor: "#d9fbff",
  });
}

function drawLevelClearScreen() {
  drawLevelClearOverlay();
}

function drawWinScreen() {
  drawOverlay({
    title: "YOU WIN!",
    subtitle: `Final Score: ${score}`,
    lines: [
      `Levels Cleared: ${TOTAL_LEVELS}`,
      `High Score: ${highScore}`,
    ],
    action: "Press Space or Tap to Restart",
    titleColor: "#ffcf5c",
    glowColor: "rgba(255, 207, 92, 0.9)",
    accentColor: "rgba(255, 207, 92, 0.9)",
    subtitleColor: "#d9fbff",
    titleFont: "bold 64px Trebuchet MS, Lucida Console, monospace",
  });
}

function drawPauseOverlay() {
  drawOverlay({
    title: "PAUSED",
    subtitle: "Reef current held",
    lines: [
      "Press P or tap Resume",
    ],
    action: "Ready when you are",
    titleColor: "#4fe3ff",
    glowColor: "rgba(79, 227, 255, 0.9)",
    accentColor: "rgba(79, 227, 255, 0.9)",
    transparent: true,
    panelWidth: 430,
    panelHeight: 260,
    titleFont: "bold 54px Trebuchet MS, Lucida Console, monospace",
  });
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

  updateParticles();

  if (gameState === GAME_STATE.PLAYING) {
    drawMaze();
    drawPlayerShark();
    drawEnemies();
    drawParticles();

    if (isPaused) {
      drawPauseOverlay();
    }
  }

  if (gameState === GAME_STATE.GAME_OVER) {
    drawGameOverScreen();
    drawParticles();
  }

  if (gameState === GAME_STATE.LEVEL_CLEAR) {
    drawLevelClearScreen();
    drawParticles();
  }

  if (gameState === GAME_STATE.WIN) {
    drawWinScreen();
    drawParticles();
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
soundButtonElement.addEventListener("click", toggleMute);

let touchStartX = 0;
let touchStartY = 0;
let touchStarted = false;
const SWIPE_DISTANCE = 30;

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  initAudio();
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
updateSoundButton();
resizeCanvasDisplay();
gameLoop();
