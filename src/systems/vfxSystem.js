// VFX system: manages sprite-frame animated one-shot effects.
// Effects are plain data objects; the Renderer reads them each frame to draw.
// Falls back to a simple placeholder rectangle when sprite frames are unavailable.
export class VfxSystem {
  constructor() {
    this.effects = [];
  }

  // Spawn a sprite-frame animation at world position (x, y).
  //
  // type          – descriptive key (used for debugging / fallback colour lookup).
  // x, y          – world-space centre position.
  // nowMs         – current timestamp in milliseconds.
  // frames        – Array<HTMLImageElement|null> from assetLoader, or null for no sprites.
  // options:
  //   frameDuration  – milliseconds per frame (default 80).
  //   loop           – whether the animation loops (default false).
  //   width, height  – draw size in world pixels (default 64 × 64).
  //   color          – fallback placeholder colour when frames are absent (default '#ffffff').
  //   ...extra       – any additional fields stored on the effect object.
  spawn(type, x, y, nowMs, frames, options = {}) {
    const {
      frameDuration = 80,
      loop = false,
      width = 64,
      height = 64,
      color = '#ffffff',
      ...extra
    } = options;

    const validFrames =
      Array.isArray(frames) && frames.some((f) => f !== null) ? frames : null;

    this.effects.push({
      type,
      x,
      y,
      startMs: nowMs,
      frames: validFrames,
      frameDuration,
      loop,
      totalFrames: validFrames ? validFrames.length : 1,
      width,
      height,
      color,
      ...extra,
    });
  }

  // Remove expired non-looping effects.
  update(nowMs) {
    this.effects = this.effects.filter((e) => {
      if (e.loop) { return true; }
      return nowMs - e.startMs < e.frameDuration * e.totalFrames;
    });
  }
}
