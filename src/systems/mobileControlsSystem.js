// Mobile controls overlay: virtual joystick + ability/attack buttons.
// All positions are in the game's logical canvas coordinate space (960 × 540).
// Touch-to-canvas scaling is handled by _canvasCoords() using getBoundingClientRect.

// ── Button layout (logical canvas pixels) ────────────────────────────────────

export const MOBILE_LAYOUT = {
  joystick: {
    cx: 130,
    cy: 440,
    baseRadius: 65,   // visual base circle radius
    thumbRadius: 26,  // visual thumb circle radius
    touchRadius: 110, // hit-test radius (larger for comfort)
  },
  attack: {
    key: 'ATTACK',
    label: 'ATK',
    cx: 860,
    cy: 458,
    radius: 42,
  },
  abilities: [
    { key: 'Q', cx: 772, cy: 408, radius: 35 },
    { key: 'W', cx: 848, cy: 385, radius: 35 },
    { key: 'E', cx: 772, cy: 464, radius: 35 },
    { key: 'R', cx: 898, cy: 400, radius: 40 },
  ],
  // Cancel zone shown in the top-right corner while aiming.
  cancel: { cx: 878, cy: 78, radius: 52 },
};

// ── MobileControls ────────────────────────────────────────────────────────────

export class MobileControls {
  constructor(canvas) {
    this.canvas = canvas;

    // True when the device appears to support touch input.
    this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // ── Joystick state ───────────────────────────────────────────────────────
    this.joystickTouchId = null;
    // Normalised direction {x, y} while joystick is held; null when idle.
    this.joystickDir = null;
    // Current thumb position in canvas coords (for rendering).
    this._joystickThumbX = MOBILE_LAYOUT.joystick.cx;
    this._joystickThumbY = MOBILE_LAYOUT.joystick.cy;

    // ── Ability-button state ─────────────────────────────────────────────────
    this.abilityTouchId = null;
    // Which ability button is currently held ('Q'/'W'/'E'/'R' or null).
    this.activeMobileAbility = null;
    // Current aim position in canvas coords; null when no ability is being aimed.
    this.aimPosition = null;

    // ── One-shot consumed flags ──────────────────────────────────────────────
    this._attackRequested = false;
    this._abilityJustActivated = null;  // set once per touchstart on ability button
    this._abilityJustReleased = null;   // set once per touchend on ability button
    this._cancelRequested = false;

    // ── Bound handlers ────────────────────────────────────────────────────────
    this._onTouchStart = (e) => this._handleTouchStart(e);
    this._onTouchMove = (e) => this._handleTouchMove(e);
    this._onTouchEnd = (e) => this._handleTouchEnd(e);
    this._onTouchCancel = (e) => this._handleTouchEnd(e);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  attach() {
    const c = this.canvas;
    c.addEventListener('touchstart', this._onTouchStart, { passive: false });
    c.addEventListener('touchmove', this._onTouchMove, { passive: false });
    c.addEventListener('touchend', this._onTouchEnd, { passive: false });
    c.addEventListener('touchcancel', this._onTouchCancel, { passive: false });
  }

  detach() {
    const c = this.canvas;
    c.removeEventListener('touchstart', this._onTouchStart);
    c.removeEventListener('touchmove', this._onTouchMove);
    c.removeEventListener('touchend', this._onTouchEnd);
    c.removeEventListener('touchcancel', this._onTouchCancel);
  }

  reset() {
    this.joystickTouchId = null;
    this.joystickDir = null;
    this._joystickThumbX = MOBILE_LAYOUT.joystick.cx;
    this._joystickThumbY = MOBILE_LAYOUT.joystick.cy;
    this.abilityTouchId = null;
    this.activeMobileAbility = null;
    this.aimPosition = null;
    this._attackRequested = false;
    this._abilityJustActivated = null;
    this._abilityJustReleased = null;
    this._cancelRequested = false;
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────────

  // Convert a Touch object's client position to logical canvas coordinates.
  _canvasCoords(touch) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }

  _dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.hypot(dx, dy);
  }

  _inJoystick(cx, cy) {
    const j = MOBILE_LAYOUT.joystick;
    return this._dist(cx, cy, j.cx, j.cy) <= j.touchRadius;
  }

  // Returns the ability key if the point is inside an ability button, else null.
  _inAbilityButton(cx, cy) {
    for (const btn of MOBILE_LAYOUT.abilities) {
      if (this._dist(cx, cy, btn.cx, btn.cy) <= btn.radius * 1.25) {
        return btn.key;
      }
    }
    return null;
  }

  _inAttackButton(cx, cy) {
    const a = MOBILE_LAYOUT.attack;
    return this._dist(cx, cy, a.cx, a.cy) <= a.radius * 1.25;
  }

  _inCancelZone(cx, cy) {
    const c = MOBILE_LAYOUT.cancel;
    return this._dist(cx, cy, c.cx, c.cy) <= c.radius;
  }

  // ── Joystick internals ────────────────────────────────────────────────────────

  _updateJoystick(cx, cy) {
    const j = MOBILE_LAYOUT.joystick;
    const dx = cx - j.cx;
    const dy = cy - j.cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      this.joystickDir = null;
      this._joystickThumbX = j.cx;
      this._joystickThumbY = j.cy;
    } else {
      const normX = dx / dist;
      const normY = dy / dist;
      this.joystickDir = { x: normX, y: normY };
      // Clamp thumb visual to the base circle.
      const clampedDist = Math.min(dist, j.baseRadius);
      this._joystickThumbX = j.cx + normX * clampedDist;
      this._joystickThumbY = j.cy + normY * clampedDist;
    }
  }

  // ── Touch event handlers ──────────────────────────────────────────────────────

  _handleTouchStart(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      const { x: cx, y: cy } = this._canvasCoords(touch);
      const id = touch.identifier;

      // ── Joystick (left thumb area) ────────────────────────────────────────
      if (this.joystickTouchId === null && this._inJoystick(cx, cy)) {
        this.joystickTouchId = id;
        this._updateJoystick(cx, cy);
        continue;
      }

      // ── Ability buttons (right side, second finger) ───────────────────────
      if (this.abilityTouchId === null) {
        const abilityKey = this._inAbilityButton(cx, cy);
        if (abilityKey) {
          this.abilityTouchId = id;
          this.activeMobileAbility = abilityKey;
          this.aimPosition = { x: cx, y: cy };
          this._abilityJustActivated = abilityKey;
          continue;
        }

        // ── Attack button ─────────────────────────────────────────────────
        if (this._inAttackButton(cx, cy)) {
          this._attackRequested = true;
        }
      }
    }
  }

  _handleTouchMove(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      const id = touch.identifier;
      const { x: cx, y: cy } = this._canvasCoords(touch);

      if (id === this.joystickTouchId) {
        this._updateJoystick(cx, cy);
      } else if (id === this.abilityTouchId) {
        this.aimPosition = { x: cx, y: cy };
      }
    }
  }

  _handleTouchEnd(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      const id = touch.identifier;
      const { x: cx, y: cy } = this._canvasCoords(touch);

      if (id === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.joystickDir = null;
        this._joystickThumbX = MOBILE_LAYOUT.joystick.cx;
        this._joystickThumbY = MOBILE_LAYOUT.joystick.cy;

      } else if (id === this.abilityTouchId) {
        const releasedKey = this.activeMobileAbility;

        if (this._inCancelZone(cx, cy)) {
          // Finger released in cancel zone → cancel cast.
          this._cancelRequested = true;
        } else if (releasedKey) {
          // Finger released normally → confirm cast at current aim position.
          this.aimPosition = { x: cx, y: cy };
          this._abilityJustReleased = releasedKey;
        }

        this.abilityTouchId = null;
        this.activeMobileAbility = null;
      }
    }
  }

  // ── Consumed-state getters ────────────────────────────────────────────────────

  // True if the attack button was tapped since the last read.  Resets on read.
  get attackRequested() {
    const v = this._attackRequested;
    this._attackRequested = false;
    return v;
  }

  // Ability key that was just pressed ('Q'/'W'/'E'/'R') or null.  Resets on read.
  get abilityJustActivated() {
    const v = this._abilityJustActivated;
    this._abilityJustActivated = null;
    return v;
  }

  // Ability key that was just released (cast trigger) or null.  Resets on read.
  get abilityJustReleased() {
    const v = this._abilityJustReleased;
    this._abilityJustReleased = null;
    return v;
  }

  // True if a cancel gesture was detected since the last read.  Resets on read.
  get cancelRequested() {
    const v = this._cancelRequested;
    this._cancelRequested = false;
    return v;
  }

  // Current thumb position in canvas coordinates for rendering.
  get joystickThumbPos() {
    return { x: this._joystickThumbX, y: this._joystickThumbY };
  }
}
