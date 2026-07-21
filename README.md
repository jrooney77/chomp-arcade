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
- Optional Golden Fish bonus item worth 500 points.
- Remaining chum counter during gameplay.
- Dolphin Patrol, Electric Eel, Diver Drone, and Puffer Guard enemies with maze movement.
- Lives, Game Over screen, and restart flow.
- Frenzy Mode from Frenzy Bait, with vulnerable enemies and bonus points.
- Larger responsive arcade display for desktop, tablets, and phones.
- Data-driven level progression with Level Clear and You Win screens.
- Debug mode for faster local testing.
- No external libraries.

## Scoring

- Chum is worth 10 points.
- Frenzy Bait is worth 50 points.
- Golden Fish is worth 500 bonus points and is not required to clear a level.
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
- Puffer Guard appears on Level 2, moves a little slower, pauses to inflate, and becomes larger and more dangerous while puffed up.
- Touching any normal enemy costs 1 life and resets the shark and enemies.
- Touching any vulnerable enemy during Frenzy Mode awards bonus points and sends that enemy back to spawn.

## Screen Size

- The internal canvas still uses the 19 by 15 tile maze, so collision and drawing stay aligned.
- CSS plus a small resize helper scale the canvas larger on desktop for a fuller arcade feel.
- On tablets and phones, the canvas scales to fit the viewport without distorting the maze.
- Touch controls use swipe distance, so visual scaling does not break mobile movement.

## Levels

- The game currently has 10 configured levels.
- The level data is organized so future updates can add more levels without new gameplay functions.
- The roadmap may eventually grow the game toward 50 levels, but those levels have not been created yet.
- Collecting all chum clears the current level. Frenzy Bait is optional for clearing.
- Score and lives carry forward between levels.
- The maze, shark position, and enemy positions reset for each new level.
- Level 3 uses its level data to increase enemy speed while keeping movement aligned to the tile grid.
- Clearing the last configured level shows the You Win screen.

### Level Progression

- Level 1, Coral Warmup: basic maze movement with the starting enemy mix.
- Level 2, Puffer Crossing: introduces the Puffer Guard in the center routes.
- Level 3, Deep Current: increases enemy speed through level data.
- Level 4, Current Split: adds branching paths and one Puffer Guard.
- Level 5, Drone Channels: emphasizes Diver Drone pressure in long corridors.
- Level 6, Puffer Passage: tightens central passages with a faster enemy set.
- Level 7, Electric Reef: emphasizes Electric Eel routing with multiple safe paths.
- Level 8, Guarded Depths: uses two Puffers in alternate corridors.
- Level 9, Predator Maze: creates the hardest non-final chase layout in this batch.
- Level 10, Apex Chomp Gauntlet: milestone challenge with all current enemy types.

### Adding Future Levels

Levels live in the `LEVELS` array in `script.js`. To add Level 11 later, copy an existing level object, paste it after Level 10, and update its data:

```js
{
  id: 11,
  name: "New Reef",
  theme: "newTheme",
  enemySpeedModifier: 1,
  goldenFish: {
    firstChumTrigger: 12,
    chumInterval: 28,
    durationMs: 8000,
  },
  maze: [
    // 15 rows, each with 19 tile numbers
  ],
  playerStart: { row: 13, col: 9 },
  enemyStarts: [
    { type: "dolphinPatrol", row: 7, col: 10, direction: "right" },
    { type: "puffer", row: 7, col: 11, direction: "left" },
  ],
}
```

Each level can define its maze layout, player start, enemy types and spawn positions, enemy speed modifier, Frenzy Bait tiles through the maze value `3`, Golden Fish timing, and optional Puffer Guard appearances.

When the game loads, it validates configured levels in the browser console. Validation checks maze size, player and enemy spawn tiles, known enemy types, Frenzy Bait conflicts, unreachable collectibles, and isolated passable tiles.

## Debug Mode

- Press Backquote (`) to toggle Debug Mode.
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
8. After collecting some chum, confirm the Golden Fish can appear, disappear if ignored, and award 500 points when collected.
9. After Frenzy Bait, confirm the timer appears and the shark glows.
10. Touch enemies during Frenzy Mode and confirm bonus points are awarded.
11. On Level 2, confirm the Puffer Guard pauses, inflates with spikes, then deflates and moves again.
12. Touch enemies outside Frenzy Mode and confirm lives decrease.
13. Lose all lives, then press Space or tap to restart.
14. Try the game in a narrow browser window or on a phone and confirm the canvas stays centered and playable.
15. Press Backquote (`), then `L` to quickly test Level Clear, level progression, and the You Win screen.
