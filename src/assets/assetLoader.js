// Asset loader: loads ability sprite-frame PNGs and UI icon images.
// All loads are gracefully fallback-safe: missing files resolve to null
// so the game never crashes due to absent artwork.

// Load a single image; resolves to null on error.
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Load a numbered frame sequence (0-indexed PNG files).
// prefix: e.g. 'assets/abilities/q_slash/q_slash_arc'
// count:  number of frames
// Returns Promise<Array<HTMLImageElement|null>>
function loadFrames(prefix, count) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(loadImage(`${prefix}_${i}.png`));
  }
  return Promise.all(promises);
}

// Loads all ability animation frames and UI ability icons.
// Returns: {
//   frames: { [animKey]: Array<HTMLImageElement|null> },
//   icons:  { Q: HTMLImageElement|null, F, E, R }
// }
export async function loadAbilityAssets() {
  // [animKey, file-prefix, frameCount]
  const frameManifest = [
    ['q_slash_arc',        'assets/abilities/q_slash/q_slash_arc',        5],
    ['q_slash_spark',      'assets/abilities/q_slash/q_slash_spark',      4],
    ['q_slash_ring',       'assets/abilities/q_slash/q_slash_ring',       4],
    ['f_dash_start',       'assets/abilities/f_dash/f_dash_start',        3],
    ['f_dash_trail',       'assets/abilities/f_dash/f_dash_trail',        5],
    ['f_dash_end',         'assets/abilities/f_dash/f_dash_end',          4],
    ['e_blast_charge',     'assets/abilities/e_blast/e_blast_charge',     4],
    ['e_blast_projectile', 'assets/abilities/e_blast/e_blast_projectile', 6],
    ['e_blast_impact',     'assets/abilities/e_blast/e_blast_impact',     5],
    ['r_burst_charge',     'assets/abilities/r_burst/r_burst_charge',     5],
    ['r_burst_explosion',  'assets/abilities/r_burst/r_burst_explosion',  7],
    ['r_burst_aftershock', 'assets/abilities/r_burst/r_burst_aftershock', 4],
  ];

  const iconManifest = {
    Q: 'assets/ui/ui_q_icon.png',
    F: 'assets/ui/ui_f_icon.png',
    E: 'assets/ui/ui_e_icon.png',
    R: 'assets/ui/ui_r_icon.png',
  };

  const [frameEntries, iconEntries] = await Promise.all([
    Promise.all(
      frameManifest.map(([key, prefix, count]) =>
        loadFrames(prefix, count).then((frames) => [key, frames])
      )
    ),
    Promise.all(
      Object.entries(iconManifest).map(([key, src]) =>
        loadImage(src).then((img) => [key, img])
      )
    ),
  ]);

  return {
    frames: Object.fromEntries(frameEntries),
    icons: Object.fromEntries(iconEntries),
  };
}
