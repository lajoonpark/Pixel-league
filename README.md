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

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move hero |
| Space | Basic attack |
| Q | Slash (instant melee damage) |
| F | Dash (burst movement in current direction) |
| E | Energy Blast (fire projectile) |
| R | Energy Burst (AoE damage around hero) |
| R *(after game ends)* | Restart match |

> **Note**: W is reserved for movement. Abilities use Q, F, E, and R only.

## Project structure

```text
/assets
  /abilities
    /q_slash/       – Q Slash animation frames (arc, spark, ring)
    /f_dash/        – F Dash animation frames (start, trail, end)
    /e_blast/       – E Energy Blast frames (charge, projectile, impact)
    /r_burst/       – R Energy Burst frames (charge, explosion, aftershock)
  /ui
    ui_q_icon.png   – HUD icon for Q ability
    ui_f_icon.png   – HUD icon for F ability
    ui_e_icon.png   – HUD icon for E ability
    ui_r_icon.png   – HUD icon for R ability
/src
  main.js
  game.js
  config.js
  input.js
  renderer.js
  camera.js
  utils.js
  sprites.js
  /assets
    assetLoader.js  – Async PNG loader; missing files resolve to null (no crash)
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
    abilitySystem.js  – Ability definitions, cast logic, VFX spawn hooks
    effectSystem.js   – Lightweight programmatic effect pool (slash arc, hit spark)
    vfxSystem.js      – Sprite-frame one-shot VFX pool
    projectileSystem.js
  /world
    map.js
    lane.js
/index.html
/styles.css
```

## Ability assets

### Where they are stored

```
assets/abilities/<ability_folder>/<animKey>_<frameIndex>.png
assets/ui/ui_<key>_icon.png
```

### Animation naming convention

Each animation is a numbered PNG sequence starting at `_0`:

| Ability | Animation key | Frames | Description |
|---------|--------------|--------|-------------|
| Q Slash | `q_slash_arc` | 5 | Slash arc sweep at hero |
| Q Slash | `q_slash_spark` | 4 | Hit spark at target |
| F Dash | `f_dash_start` | 3 | Dust at dash origin |
| F Dash | `f_dash_trail` | 5 | Trail puffs along dash path |
| F Dash | `f_dash_end` | 4 | Dust at dash destination |
| E Energy Blast | `e_blast_charge` | 4 | Charge glow at hero on cast |
| E Energy Blast | `e_blast_projectile` | 6 | Looping frames on flying projectile |
| E Energy Blast | `e_blast_impact` | 5 | Explosion at hit position |
| R Energy Burst | `r_burst_charge` | 5 | Charge burst at hero |
| R Energy Burst | `r_burst_explosion` | 7 | Explosion at each enemy hit |
| R Energy Burst | `r_burst_aftershock` | 4 | Fading ground ring at hero |

### How to add new ability effects

1. **Create the PNG frames** — name them `<animKey>_0.png`, `<animKey>_1.png`, … and place them in `assets/abilities/<folder>/`.

2. **Register the animation** in `src/assets/assetLoader.js` by adding a row to `frameManifest`:
   ```js
   ['my_anim_key', 'assets/abilities/<folder>/my_anim_key', frameCount],
   ```

3. **Spawn the effect** from the relevant cast function in `src/systems/abilitySystem.js`:
   ```js
   vfxCtx.vfxSystem.spawn(
     'my_anim_key',
     x, y,
     vfxCtx.nowMs,
     vfxCtx.assets?.frames?.['my_anim_key'] ?? null,
     { frameDuration: 80, width: 64, height: 64, color: '#ffffff' }
   );
   ```
   If the PNG files are missing the renderer falls back to a coloured placeholder rectangle — no crash.

4. **Add a HUD icon** (optional): place `ui_<key>_icon.png` in `assets/ui/` and add its entry to `iconManifest` in `assetLoader.js`.

## Notes

- `main.js` bootstraps the game and pre-loads all ability assets before the first frame.
- `game.js` owns update/render loop and coordinates systems.
- `config.js` centralizes tunable constants.
- `renderer.js` wraps common canvas drawing helpers; `imageSmoothingEnabled = false` is set globally for pixel-art fidelity.
- `input.js` tracks keyboard state.
- Architecture is intentionally beginner-friendly so real assets and richer logic can be added later.
