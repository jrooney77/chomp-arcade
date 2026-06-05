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
- Dolphin Patrol, Electric Eel, and Diver Drone enemies with maze movement.
- Lives, Game Over screen, and restart flow.
- Frenzy Mode from Frenzy Bait, with vulnerable enemies and bonus points.
- Larger responsive arcade display for desktop, tablets, and phones.
- Three-level progression with Level Clear and You Win screens.
- Debug mode for faster local testing.
- No external libraries.

## Scoring

- Chum is worth 10 points.
- Frenzy Bait is worth 50 points.
- Collected items disappear from the maze.
- Chomping a vulnerable enemy during Frenzy Mode starts at 200 bonus points.
- Each additional chomp in the same Frenzy Mode doubles up to 1600 points.

## Frenzy Mode

- Collecting Frenzy Bait starts a 7-second Frenzy Mode.
- Later levels shorten Frenzy Mode slightly.
- During Frenzy Mode, the shark glows and enemies become vulnerable.
- Touching a vulnerable enemy awards bonus points and sends that enemy back to spawn.
- Losing a life, changing levels, or restarting clears Frenzy Mode.

## Enemies

- The shark starts in the bottom center corridor, and enemies start near the maze middle.
- Dolphin Patrol keeps moving when possible and sometimes turns at intersections.
- Electric Eel moves more erratically and changes direction more often.
- Diver Drone uses simple chase behavior by choosing tiles that move it closer to the shark.
- Touching any normal enemy costs 1 life and resets the shark and enemies.
- Touching any vulnerable enemy during Frenzy Mode awards bonus points and sends that enemy back to spawn.

## Screen Size

- The internal canvas still uses the 19 by 15 tile maze, so collision and drawing stay aligned.
- CSS plus a small resize helper scale the canvas larger on desktop for a fuller arcade feel.
- On tablets and phones, the canvas scales to fit the viewport without distorting the maze.
- Touch controls use swipe distance, so visual scaling does not break mobile movement.

## Levels

- The game has 3 levels.
- Collecting all chum clears the current level. Frenzy Bait is optional for clearing.
- Score and lives carry forward between levels.
- The maze, shark position, and enemy positions reset for each new level.
- Level 3 increases enemy speed while keeping movement aligned to the tile grid.
- Clearing level 3 shows the You Win screen.

## Debug Mode

- Press `D` to toggle Debug Mode.
- When Debug Mode is on, enemies are hidden, do not move, and cannot collide with the shark.
- Press `L` while Debug Mode is on to instantly clear the current level.
- Debug Mode is for local testing and does not remove collectibles or skip score/life reset behavior.

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
9. Touch enemies during Frenzy Mode and confirm bonus points are awarded.
10. Touch enemies outside Frenzy Mode and confirm lives decrease.
11. Lose all lives, then press Space or tap to restart.
12. Try the game in a narrow browser window or on a phone and confirm the canvas stays centered and playable.
13. Press `D`, then `L` to quickly test Level Clear, level progression, and the You Win screen.
