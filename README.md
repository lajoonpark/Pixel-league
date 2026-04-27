# Pixel-league

Simple 2D top-down pixel-style MOBA prototype scaffold built with:
- HTML
- CSS
- Vanilla JavaScript (Canvas API)

## Setup

### Local development

```bash
npm install
npm run dev
```

Then open: `http://localhost:5173`

### Build for production

```bash
npm run build
npm run preview   # preview the built output locally
```

## Controls

### Desktop Controls

| Key / Input | Action |
|-------------|--------|
| Right Click | Move hero |
| Left Click | Basic attack (or confirm selected ability) |
| Q | Select Slash ability (then left click to cast) |
| W | Select Dash ability (then left click to cast) |
| E | Select Energy Blast ability (then left click to cast) |
| R | Select Energy Burst ability (then left click to cast) |
| F | Cancel ability targeting |
| Esc | Cancel ability targeting |
| R *(after game ends)* | Restart match |

> **Tip:** You can move and aim abilities at the same time — right-click to reposition while keeping an ability selected.

### Mobile Controls (landscape recommended)

| Touch gesture | Action |
|--------------|--------|
| Left joystick | Move hero continuously in that direction |
| ATK button | Basic attack nearest enemy |
| Hold Q/W/E/R button | Aim that ability (shows range/direction indicator) |
| Drag while holding ability button | Adjust aim |
| Release ability button | Cast ability at aimed position |
| Drag to **CANCEL** zone (top-right) while aiming | Cancel cast |

> **Tip:** Landscape orientation is recommended for the best experience.
> Desktop keyboard/mouse controls still work even when mobile touch controls are active.

### How targeting modes work (desktop)

Pressing **Q / W / E / R** enters that ability's *targeting mode*:

- A range circle appears around the hero showing cast range.
- A hit-area preview appears near the mouse cursor (circle, destination marker, or AoE).
- **Left click** confirms the cast toward the mouse position and exits targeting mode.
- **Right click** moves the hero **without** cancelling targeting — you can reposition while aiming.
- **F** or **Esc** cancels targeting without moving.
- Pressing a *different* ability key while in targeting mode switches to that ability.
- The selected ability slot in the HUD is highlighted in gold with "ACTIVE" status.

### Basic attack (left click)

When no ability is selected, left-clicking near an enemy triggers a basic attack:

- If the enemy is within attack range, the hero attacks immediately.
- If the enemy is out of range, the hero moves toward it and attacks automatically when close enough.
- Clicking empty space with no ability selected does nothing.

### Hit area / range indicators

| Ability | Indicator |
|---------|-----------|
| Basic attack | Attack range circle when range circle is shown |
| Q Slash | Cast range circle around hero + small hit-area circle at slash endpoint |
| W Dash | Max dash range circle around hero + dashed line to destination + diamond marker |
| E Energy Blast | Dashed line from hero toward mouse (capped at cast range) + small impact circle |
| R Energy Burst | Cast range circle around hero + AoE circle at mouse (turns red when out of range) |

### Tuning mobile button positions and sizes

Mobile button layout is defined in `src/systems/mobileControlsSystem.js` under `MOBILE_LAYOUT`.
All coordinates are in the game's logical canvas space (960 × 540 pixels).

```js
// Joystick (bottom-left)
joystick: { cx: 130, cy: 440, baseRadius: 65, thumbRadius: 26, touchRadius: 110 }

// Basic attack button (bottom-right)
attack: { cx: 860, cy: 458, radius: 42 }

// Ability buttons (surrounding the attack button)
{ key: 'Q', cx: 772, cy: 408, radius: 35 }
{ key: 'W', cx: 848, cy: 385, radius: 35 }
{ key: 'E', cx: 772, cy: 464, radius: 35 }
{ key: 'R', cx: 898, cy: 400, radius: 40 }  // R is intentionally larger

// Cancel zone (top-right, shown only while aiming)
cancel: { cx: 878, cy: 78, radius: 52 }
```

The corresponding visual positions in `renderer.js` (`drawMobileHUD`) mirror these
constants.  Update both files if you change the layout.



All ability parameters live in `src/systems/abilitySystem.js` inside `createHeroAbilities()`:

```js
// Q – Slash
castRange: 80,   // distance of slash endpoint from hero
hitRadius: 35,   // radius of hit-area circle at endpoint

// W – Dash
distance: 150,   // max dash distance in pixels

// E – Energy Blast (Power Shot)
castRange: 400,  // max projectile travel distance

// R – Energy Burst
castRange: 200,  // max distance from hero the AoE center can be placed
aoeRadius: 80,   // radius of the explosion
```

## Project structure

```text
/public
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
    mobileControlsSystem.js  – Virtual joystick, ability buttons, attack button for touch devices
  /world
    map.js
    lane.js
/index.html
/styles.css
```

## Ability assets

### Where they are stored

```
public/assets/abilities/<ability_folder>/<animKey>_<frameIndex>.png
public/assets/ui/ui_<key>_icon.png
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

1. **Create the PNG frames** — name them `<animKey>_0.png`, `<animKey>_1.png`, … and place them in `public/assets/abilities/<folder>/`.

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

4. **Add a HUD icon** (optional): place `ui_<key>_icon.png` in `public/assets/ui/` and add its entry to `iconManifest` in `assetLoader.js`.

---

## Combat VFX (tower blast & basic attack)

### Generating the VFX assets

All combat VFX frames are produced programmatically with Python Pillow — no AI images, no external asset packs.

```bash
# Install Pillow (one-time)
pip install Pillow

# Regenerate all frames from the repo root
python3 tools/generate_combat_vfx.py
```

### Where VFX assets live

```
public/assets/vfx/
  tower_blast/
    charge/      – tower_charge_01..04.png   (48×48, cyan orb forming)
    projectile/  – tower_projectile_01..04.png (48×48, bolt facing right)
    impact/      – tower_impact_01..05.png   (48×48, energy burst)
  basic_attack/
    slash/       – basic_slash_01..05.png    (48×48, crescent arc)
    hit/         – basic_hit_01..04.png      (32×32, star spark)
    windup/      – basic_windup_01..03.png   (32×32, subtle arc flash)
```

### VFX naming convention for future effects

VFX frame sequences use **1-indexed**, zero-padded filenames:

```
<vfx_key>_01.png  <vfx_key>_02.png  …  <vfx_key>_NN.png
```

Register new sequences in `src/assets/assetLoader.js` under `vfxManifest`:

```js
['my_vfx_key', 'assets/vfx/<folder>', 'my_vfx_key', frameCount],
```

> Place the PNG files in `public/assets/vfx/<folder>/`.

Load them in game code via `this.assets?.vfxFrames?.my_vfx_key`.

The helper `loadFrameSequence(basePath, prefix, count)` is exported from `assetLoader.js` for use elsewhere.

### How tower blast animations work

1. **Charge** – when a tower's attack cooldown expires and it fires, a `tower_charge` sprite-frame animation plays at the tower's world position (4 frames, ~80 ms each).
2. **Projectile** – simultaneously a visual-only projectile with `tower_projectile` sprite frames is added to the projectile pool.  It travels at `energyBlast.speedPxPerSec` toward the target with `skipCollision: true` (no extra damage) and is rotated in the travel direction.  The existing procedural comet effect still plays underneath as a fallback.
3. **Impact** – a deferred `tower_impact` VFX spawn is scheduled for the moment the projectile arrives at the target (travel distance / speed).  It plays a 5-frame blue energy burst at the target's position.

Damage itself is applied instantly by `combatSystem.js` (unchanged behaviour).

### How basic attack animations work

| Event | VFX spawned | Location |
|-------|-------------|----------|
| Space pressed (wind-up starts) | `basic_windup` (3 frames, 32×32) | Hero centre |
| Swing phase ends → follow-through | `basic_slash` (5 frames, 48×48) | 16 px ahead of hero in last-move direction |
| Damage lands (`pendingHitTarget`) | `basic_hit` (4 frames, 32×32) | Target centre |

All sprite-frame VFX are drawn by `vfxSystem` / `renderer.drawVfxEffects()` with `imageSmoothingEnabled = false` for crisp pixel art.  If any PNG files are missing, a coloured placeholder rectangle is drawn and a warning is logged to the console — the game never crashes.

---

## Multiplayer Setup (Vercel + Supabase Realtime)

The game supports 2-player realtime multiplayer using **Supabase Realtime** for room and player sync.  No custom backend server is needed — the frontend communicates directly with Supabase from the browser.

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com) and create a free project.
2. After the project is ready, go to **Settings → API**.
3. Copy your **Project URL** and **anon public** key.

> ⚠️ Only use the `anon` / `public` key.  Never paste the `service_role` key into client code.

### 2. Set Environment Variables

**Local development** — copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```ini
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

`.env` is gitignored and never committed.

**Vercel** — add the same variables in the Vercel dashboard:

1. Open your project in [vercel.com](https://vercel.com).
2. Go to **Settings → Environment Variables**.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Production** (and optionally Preview).
4. Redeploy so the new env vars take effect.

### 3. Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Vercel auto-detects the `vercel.json` — it runs `npm run build` and serves `dist/`.
4. Add your environment variables (step 2 above) and deploy.

The **Create Room** and **Join Room** buttons are enabled automatically once both variables are present.  Without them, multiplayer buttons show *"Multiplayer is not configured yet"* and single-player still works normally.

### Multiplayer Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | Right click | Left joystick |
| Basic attack | Left click on enemy | ATK button |
| Abilities | Q / W / E / R | Hold ability button |
| Cancel ability | F or Esc | Drag to CANCEL zone |

### How Rooms Work

| Step | Description |
|------|-------------|
| **Create Room** | Generates a 6-character room code.  Creator is Player 1 (blue). |
| **Join Room** | Enter the code shared by the host. Joiner is Player 2 (red). |
| **Start Game** | Host clicks *Start Game* when 2 players are present. |
| **Leave / Disband** | Either player can leave; host disbanding returns both players to the menu. |

### Multiplayer Notes

- **Prototype client-sync only** — no server-authoritative gameplay.  Each client simulates AI independently (towers, minions, bases).
- **Max 2 players** per room.
- **Player 1** = blue hero.  **Player 2** = red hero.
- Player positions, health, and ability/attack events are broadcast at ~20 Hz via Supabase Realtime Broadcast.
- Remote hero position is smoothly interpolated between received packets.
- If Supabase credentials are missing, multiplayer buttons are hidden and single-player still works normally.

---

## Notes

- `main.js` bootstraps the game and pre-loads all ability assets before the first frame.
- `game.js` owns update/render loop and coordinates systems.
- `config.js` centralizes tunable constants.
- `renderer.js` wraps common canvas drawing helpers; `imageSmoothingEnabled = false` is set globally for pixel-art fidelity.
- `input.js` tracks keyboard state.
- Architecture is intentionally beginner-friendly so real assets and richer logic can be added later.
