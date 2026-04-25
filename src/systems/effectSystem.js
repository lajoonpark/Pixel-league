// Lightweight transient-effect pool for visual-only particles (slash arc, hit spark).
// Effects are plain objects: { type, x, y, startMs, durationMs, ...extra }.
export class EffectSystem {
  constructor() {
    this.effects = [];
  }

  // Add a new effect to the pool.
  spawn(type, x, y, nowMs, extra = {}) {
    this.effects.push({ type, x, y, startMs: nowMs, ...extra });
  }

  // Remove effects whose lifetime has elapsed.  Effects missing durationMs are
  // dropped immediately since they would never expire.
  update(nowMs) {
    this.effects = this.effects.filter(
      (e) => typeof e.durationMs === 'number' && nowMs - e.startMs < e.durationMs
    );
  }
}
