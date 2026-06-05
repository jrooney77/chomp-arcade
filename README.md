# CHOMP

CHOMP is a retro shark maze arcade game foundation built with plain HTML, CSS, and JavaScript. The player will eventually control a cartoon shark through coral reef tunnels, collecting chum and avoiding ocean defenders.

## Current Build

- Clean browser page with a centered HTML Canvas.
- Start screen with title, subtitle, objective text, and start prompt.
- Spacebar, click, or tap input to switch into the playing screen.
- Tile-based maze rendered on the canvas.
- Cartoon player shark with smooth maze movement.
- Arrow Key, WASD, and mobile swipe controls.
- Chum and Frenzy Bait collection with score tracking.
- Remaining chum counter during gameplay.
- Dolphin Patrol enemy with maze movement.
- Lives, Game Over screen, and restart flow.
- Frenzy Mode from Frenzy Bait, with vulnerable enemies and bonus points.
- No external libraries.

## Scoring

- Chum is worth 10 points.
- Frenzy Bait is worth 50 points.
- Collected items disappear from the maze.
- Chomping a vulnerable enemy during Frenzy Mode starts at 200 bonus points.
- Each additional chomp in the same Frenzy Mode doubles up to 1600 points.

## Frenzy Mode

- Collecting Frenzy Bait starts a 7-second Frenzy Mode.
- During Frenzy Mode, the shark glows and enemies become vulnerable.
- Touching a vulnerable enemy awards bonus points and sends that enemy back to spawn.
- Losing a life or restarting clears Frenzy Mode.

## Enemies

- Dolphin Patrol moves through open maze corridors.
- The shark starts in the bottom center corridor, and Dolphin Patrol starts near the maze middle.
- The dolphin keeps moving when possible and chooses a valid new direction when blocked.
- At intersections, it sometimes picks a different valid direction.
- Touching the dolphin costs 1 life and resets the shark and dolphin positions.

## Maze Grid

The maze is stored in `script.js` as a 2D array. Each number represents one tile:

- `0` wall: coral reef or underwater rock block.
- `1` path: open dark-blue water.
- `2` chum: small red/pink collectible dot.
- `3` frenzy bait: larger glowing orange/red collectible.
- `4` empty: open water with no collectible.

The canvas uses 32-pixel tiles, with 19 columns and 15 rows. That creates an internal canvas size of 608 by 480 pixels.

## Run Locally

Open `index.html` in a browser. No build step or local server is required.

To test the game:

1. Open `index.html`.
2. Confirm the CHOMP start screen is visible.
3. Press Space, click the canvas, or tap the canvas.
4. Confirm the maze appears with the shark in the bottom center path.
5. Move with Arrow Keys or WASD.
6. On mobile, tap to start and swipe on the canvas to turn the shark.
7. Swim over chum or Frenzy Bait and confirm the score updates.
8. After Frenzy Bait, confirm the timer appears and the shark glows.
9. Touch the Dolphin Patrol during Frenzy Mode and confirm bonus points are awarded.
10. Touch the Dolphin Patrol outside Frenzy Mode and confirm lives decrease.
11. Lose all lives, then press Space or tap to restart.
