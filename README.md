# Pixel-league

Simple 2D top-down pixel-style MOBA prototype scaffold built with:
- HTML
- CSS
- Vanilla JavaScript (Canvas API)

## Setup

### Option 1: Open directly
Open `/home/runner/work/Pixel-league/Pixel-league/index.html` in a browser.

### Option 2: Run with a local server
From `/home/runner/work/Pixel-league/Pixel-league`:

```bash
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

## Project structure

```text
/src
  main.js
  game.js
  config.js
  input.js
  renderer.js
  camera.js
  utils.js
  /entities
    Hero.js
    Minion.js
    Tower.js
    Base.js
  /systems
    movementSystem.js
    combatSystem.js
    spawnSystem.js
    collisionSystem.js
    healthSystem.js
  /world
    map.js
    lane.js
/index.html
/styles.css
```

## Notes

- `main.js` bootstraps the game.
- `game.js` owns update/render loop and coordinates systems.
- `config.js` centralizes tunable constants.
- `renderer.js` wraps common canvas drawing helpers.
- `input.js` tracks keyboard state.
- Architecture is intentionally beginner-friendly so real assets and richer logic can be added later.
