#!/usr/bin/env python3
"""Generate combat VFX animation frames using Python Pillow (PIL).

All frames are crisp pixel-art PNGs with transparent backgrounds.
No anti-aliasing, no blur, no smooth gradients.

Output directories:
  assets/vfx/tower_blast/charge/      – tower_charge_01..04.png
  assets/vfx/tower_blast/projectile/  – tower_projectile_01..04.png
  assets/vfx/tower_blast/impact/      – tower_impact_01..05.png
  assets/vfx/basic_attack/slash/      – basic_slash_01..05.png
  assets/vfx/basic_attack/hit/        – basic_hit_01..04.png
  assets/vfx/basic_attack/windup/     – basic_windup_01..03.png

Usage:
  cd <repo-root>
  python3 tools/generate_combat_vfx.py
"""

import os
import math

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Pillow is required: pip install Pillow")

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
VFX_ROOT = os.path.join(ROOT, "assets", "vfx")


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def new_frame(size=48):
    """Create a new transparent RGBA image of the given square size."""
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))


def px(img, x, y, color):
    """Write a single RGBA pixel, clamped to the image bounds."""
    if 0 <= x < img.width and 0 <= y < img.height:
        img.load()[x, y] = color


def fill_rect(img, rx, ry, rw, rh, color):
    """Fill an axis-aligned rectangle with a solid color."""
    for dy in range(rh):
        for dx in range(rw):
            px(img, rx + dx, ry + dy, color)


def fill_square(img, cx, cy, half, color):
    """Fill a square of side (2*half+1) centred at (cx, cy)."""
    fill_rect(img, cx - half, cy - half, half * 2 + 1, half * 2 + 1, color)


def draw_ring(img, cx, cy, radius, color, step_deg=6):
    """Draw a 1-pixel-thick ring at the given radius using square pixels."""
    angle = 0.0
    while angle < 360.0:
        rad = math.radians(angle)
        x = int(round(cx + math.cos(rad) * radius))
        y = int(round(cy + math.sin(rad) * radius))
        px(img, x, y, color)
        angle += step_deg


def draw_arc(img, cx, cy, start_deg, end_deg, radius_inner, radius_outer,
             color_inner, color_outer, step_deg=4):
    """Draw a crescent-shaped arc band using square pixels.

    Pixels near radius_inner get color_inner; pixels near radius_outer get
    color_outer.  No smooth interpolation – each pixel gets one of the two
    colours based on which half of the band it falls in.
    """
    mid_radius = (radius_inner + radius_outer) / 2.0
    angle = float(start_deg)
    while angle <= float(end_deg):
        rad = math.radians(angle)
        for r in range(radius_inner, radius_outer + 1):
            x = int(round(cx + math.cos(rad) * r))
            y = int(round(cy + math.sin(rad) * r))
            color = color_inner if r <= mid_radius else color_outer
            px(img, x, y, color)
        angle += step_deg


def save(img, directory, filename):
    path = os.path.join(directory, filename)
    img.save(path)
    print(f"  wrote {os.path.relpath(path, ROOT)}")


# ─── Tower blast palette ───────────────────────────────────────────────────────
WHITE  = (248, 251, 255, 255)
LCYAN  = (125, 249, 255, 255)
CYAN   = ( 40, 215, 255, 255)
BLUE   = ( 27, 109, 255, 255)
DBLUE  = ( 18,  58, 140, 255)

# ─── Basic attack palette ──────────────────────────────────────────────────────
WWHITE = (255, 248, 232, 255)
PYELLOW= (255, 225, 138, 255)
GOLD   = (255, 184,  51, 255)
ORANGE = (216, 106,  28, 255)
DBROWN = (107,  46,  19, 255)


# ==============================================================================
# PART 1 — TOWER BLAST VFX
# ==============================================================================

def generate_tower_charge():
    """Glowing energy orb forming at tower – grows frame by frame with sparks."""
    out = os.path.join(VFX_ROOT, "tower_blast", "charge")
    ensure_dir(out)
    cx = cy = 24

    # ── Frame 1: tiny 3×3 blue orb, 2 cardinal sparks ────────────────────────
    img = new_frame()
    fill_square(img, cx, cy, 1, BLUE)
    px(img, cx, cy, LCYAN)
    px(img, cx - 3, cy, CYAN)
    px(img, cx + 3, cy, CYAN)
    save(img, out, "tower_charge_01.png")

    # ── Frame 2: 5×5 orb, 4 sparks ───────────────────────────────────────────
    img = new_frame()
    fill_square(img, cx, cy, 2, BLUE)
    fill_square(img, cx, cy, 1, CYAN)
    px(img, cx, cy, LCYAN)
    px(img, cx - 5, cy, CYAN)
    px(img, cx + 5, cy, CYAN)
    px(img, cx, cy - 5, CYAN)
    px(img, cx - 4, cy - 4, BLUE)
    save(img, out, "tower_charge_02.png")

    # ── Frame 3: 7×7 orb, sparks at 8 directions ─────────────────────────────
    img = new_frame()
    fill_square(img, cx, cy, 3, DBLUE)
    fill_square(img, cx, cy, 2, BLUE)
    fill_square(img, cx, cy, 1, CYAN)
    px(img, cx, cy, WHITE)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        sx = int(round(cx + math.cos(rad) * 6))
        sy = int(round(cy + math.sin(rad) * 6))
        px(img, sx, sy, CYAN)
    px(img, cx - 5, cy, LCYAN)
    px(img, cx + 5, cy, LCYAN)
    save(img, out, "tower_charge_03.png")

    # ── Frame 4: 9×9 orb, sparks radiating outward ───────────────────────────
    img = new_frame()
    fill_square(img, cx, cy, 4, DBLUE)
    fill_square(img, cx, cy, 3, BLUE)
    fill_square(img, cx, cy, 2, CYAN)
    fill_square(img, cx, cy, 1, LCYAN)
    px(img, cx, cy, WHITE)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        for r in (7, 9):
            sx = int(round(cx + math.cos(rad) * r))
            sy = int(round(cy + math.sin(rad) * r))
            px(img, sx, sy, CYAN if r == 7 else BLUE)
    save(img, out, "tower_charge_04.png")


def generate_tower_projectile():
    """Compact energy bolt facing right, bright front with trailing pixels."""
    out = os.path.join(VFX_ROOT, "tower_blast", "projectile")
    ensure_dir(out)
    cy = 24  # vertical center of 48×48

    def make_bolt(head_x, extra_sparks=False):
        img = new_frame()
        # head: 2×2 white
        fill_rect(img, head_x,     cy - 1, 2, 2, WHITE)
        # light-cyan ring around head
        fill_rect(img, head_x - 2, cy - 1, 2, 2, LCYAN)
        # cyan core
        fill_rect(img, head_x - 4, cy - 1, 2, 2, CYAN)
        # blue body
        fill_rect(img, head_x - 6, cy - 1, 2, 2, BLUE)
        # dark-blue tail segments
        fill_rect(img, head_x - 8, cy,     2, 1, DBLUE)
        px(img, head_x - 10, cy, DBLUE)
        if extra_sparks:
            # a couple of accent pixels above/below the trail for sparkle
            px(img, head_x - 3, cy - 2, LCYAN)
            px(img, head_x - 5, cy + 2, CYAN)
        return img

    # Frames 1&3 – base bolt; frames 2&4 – bolt with spark flicker
    make_bolt(30, extra_sparks=False).save(os.path.join(out, "tower_projectile_01.png"))
    make_bolt(30, extra_sparks=True ).save(os.path.join(out, "tower_projectile_02.png"))
    make_bolt(31, extra_sparks=False).save(os.path.join(out, "tower_projectile_03.png"))
    make_bolt(30, extra_sparks=True ).save(os.path.join(out, "tower_projectile_04.png"))
    print(f"  wrote assets/vfx/tower_blast/projectile/tower_projectile_01..04.png")


def generate_tower_impact():
    """Blue/white burst expanding outward with a pixel ring and sparks."""
    out = os.path.join(VFX_ROOT, "tower_blast", "impact")
    ensure_dir(out)
    cx = cy = 24

    # ── Frame 1: tiny center flash + 4 close sparks ───────────────────────────
    img = new_frame()
    fill_square(img, cx, cy, 2, WHITE)
    fill_square(img, cx, cy, 1, WHITE)
    for a in (0, 90, 180, 270):
        rad = math.radians(a)
        px(img, int(round(cx + math.cos(rad) * 4)), int(round(cy + math.sin(rad) * 4)), LCYAN)
    save(img, out, "tower_impact_01.png")

    # ── Frame 2: small ring (r=6) + cardinal sparks at r=8 ───────────────────
    img = new_frame()
    fill_square(img, cx, cy, 2, WHITE)
    draw_ring(img, cx, cy, 6, CYAN, step_deg=8)
    draw_ring(img, cx, cy, 7, BLUE, step_deg=8)
    for a in (0, 90, 180, 270):
        rad = math.radians(a)
        sx = int(round(cx + math.cos(rad) * 9))
        sy = int(round(cy + math.sin(rad) * 9))
        px(img, sx, sy, LCYAN)
        px(img, sx + int(math.cos(rad)), sy + int(math.sin(rad)), CYAN)
    save(img, out, "tower_impact_02.png")

    # ── Frame 3: medium ring (r=11) + 8-way sparks ───────────────────────────
    img = new_frame()
    px(img, cx, cy, LCYAN)
    draw_ring(img, cx, cy, 10, BLUE,  step_deg=7)
    draw_ring(img, cx, cy, 11, CYAN,  step_deg=7)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        sx = int(round(cx + math.cos(rad) * 13))
        sy = int(round(cy + math.sin(rad) * 13))
        px(img, sx, sy, CYAN)
        px(img, sx - int(round(math.cos(rad))), sy - int(round(math.sin(rad))), BLUE)
    save(img, out, "tower_impact_03.png")

    # ── Frame 4: larger ring (r=15) fading, sparks spreading ─────────────────
    img = new_frame()
    draw_ring(img, cx, cy, 14, DBLUE, step_deg=7)
    draw_ring(img, cx, cy, 15, BLUE,  step_deg=7)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        sx = int(round(cx + math.cos(rad) * 17))
        sy = int(round(cy + math.sin(rad) * 17))
        px(img, sx, sy, BLUE)
    save(img, out, "tower_impact_04.png")

    # ── Frame 5: faint scatter pixels only ───────────────────────────────────
    img = new_frame()
    for a in range(0, 360, 60):
        rad = math.radians(a)
        sx = int(round(cx + math.cos(rad) * 19))
        sy = int(round(cy + math.sin(rad) * 19))
        px(img, sx, sy, DBLUE)
        px(img, sx + 1, sy + 1, DBLUE)
    save(img, out, "tower_impact_05.png")


# ==============================================================================
# PART 2 — BASIC ATTACK VFX
# ==============================================================================

def generate_basic_slash():
    """Crescent slash arc facing right, built with square pixel steps."""
    out = os.path.join(VFX_ROOT, "basic_attack", "slash")
    ensure_dir(out)
    cx = cy = 24

    # Arc sweeps from -80° (upper-right) to +80° (lower-right).
    ARC_START = -80
    ARC_END   =  80

    # ── Frame 1: top 40% of arc, narrow band ─────────────────────────────────
    img = new_frame()
    arc_end_1 = ARC_START + (ARC_END - ARC_START) * 0.4
    draw_arc(img, cx, cy, ARC_START, arc_end_1, 12, 15, WWHITE, PYELLOW)
    save(img, out, "basic_slash_01.png")

    # ── Frame 2: top 70% of arc ───────────────────────────────────────────────
    img = new_frame()
    arc_end_2 = ARC_START + (ARC_END - ARC_START) * 0.7
    draw_arc(img, cx, cy, ARC_START, arc_end_2, 12, 17, WWHITE, GOLD)
    save(img, out, "basic_slash_02.png")

    # ── Frame 3: full crescent + bright centre highlights ─────────────────────
    img = new_frame()
    draw_arc(img, cx, cy, ARC_START, ARC_END, 12, 19, WWHITE, ORANGE)
    # bright 3×3 highlights at a few points along the arc mid-line
    for a in range(ARC_START, ARC_END + 1, 20):
        rad = math.radians(a)
        hx = int(round(cx + math.cos(rad) * 15))
        hy = int(round(cy + math.sin(rad) * 15))
        fill_square(img, hx, hy, 1, WWHITE)
    save(img, out, "basic_slash_03.png")

    # ── Frame 4: arc expanded + colour shifts toward gold ─────────────────────
    img = new_frame()
    draw_arc(img, cx, cy, ARC_START, ARC_END, 14, 21, PYELLOW, GOLD)
    save(img, out, "basic_slash_04.png")

    # ── Frame 5: fading pixel scatter along arc ───────────────────────────────
    img = new_frame()
    for a in range(ARC_START, ARC_END + 1, 16):
        rad = math.radians(a)
        x1 = int(round(cx + math.cos(rad) * 18))
        y1 = int(round(cy + math.sin(rad) * 18))
        x2 = int(round(cx + math.cos(rad) * 21))
        y2 = int(round(cy + math.sin(rad) * 21))
        px(img, x1, y1, GOLD)
        px(img, x2, y2, ORANGE)
    save(img, out, "basic_slash_05.png")


def generate_basic_hit():
    """Small star-like impact spark on a 32×32 canvas."""
    out = os.path.join(VFX_ROOT, "basic_attack", "hit")
    ensure_dir(out)
    cx = cy = 16

    # ── Frame 1: bright center flash ──────────────────────────────────────────
    img = new_frame(32)
    fill_square(img, cx, cy, 3, GOLD)
    fill_square(img, cx, cy, 1, WWHITE)
    save(img, out, "basic_hit_01.png")

    # ── Frame 2: 4-pointed star ───────────────────────────────────────────────
    img = new_frame(32)
    fill_square(img, cx, cy, 1, WWHITE)
    # cardinal spikes
    for a in (0, 90, 180, 270):
        rad = math.radians(a)
        for r in range(1, 7):
            x = int(round(cx + math.cos(rad) * r))
            y = int(round(cy + math.sin(rad) * r))
            px(img, x, y, PYELLOW if r < 4 else GOLD)
    # diagonal short sparks
    for a in (45, 135, 225, 315):
        rad = math.radians(a)
        for r in range(1, 5):
            x = int(round(cx + math.cos(rad) * r))
            y = int(round(cy + math.sin(rad) * r))
            px(img, x, y, ORANGE)
    save(img, out, "basic_hit_02.png")

    # ── Frame 3: expanding sparks ─────────────────────────────────────────────
    img = new_frame(32)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        for r in range(4, 9):
            x = int(round(cx + math.cos(rad) * r))
            y = int(round(cy + math.sin(rad) * r))
            px(img, x, y, GOLD if r < 6 else ORANGE)
    save(img, out, "basic_hit_03.png")

    # ── Frame 4: fading outer dots ────────────────────────────────────────────
    img = new_frame(32)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        x = int(round(cx + math.cos(rad) * 11))
        y = int(round(cy + math.sin(rad) * 11))
        px(img, x, y, DBROWN)
        px(img, x + 1, y, DBROWN)
    save(img, out, "basic_hit_04.png")


def generate_basic_windup():
    """Subtle arc flash in front of hero showing attack is starting (32×32)."""
    out = os.path.join(VFX_ROOT, "basic_attack", "windup")
    ensure_dir(out)
    cx = cy = 16

    # ── Frame 1: tiny arc hint at right (±30°) ────────────────────────────────
    img = new_frame(32)
    for a in range(-30, 31, 10):
        rad = math.radians(a)
        x = int(round(cx + math.cos(rad) * 8))
        y = int(round(cy + math.sin(rad) * 8))
        px(img, x, y, GOLD)
    save(img, out, "basic_windup_01.png")

    # ── Frame 2: slightly larger arc (±40°, 2-pixel band) ─────────────────────
    img = new_frame(32)
    for a in range(-40, 41, 8):
        rad = math.radians(a)
        for r in (8, 9):
            x = int(round(cx + math.cos(rad) * r))
            y = int(round(cy + math.sin(rad) * r))
            px(img, x, y, PYELLOW if r == 8 else GOLD)
    save(img, out, "basic_windup_02.png")

    # ── Frame 3: medium glow arc (±50°, 3-pixel band) ─────────────────────────
    img = new_frame(32)
    for a in range(-50, 51, 6):
        rad = math.radians(a)
        for r, col in ((9, WWHITE), (10, PYELLOW), (11, GOLD)):
            x = int(round(cx + math.cos(rad) * r))
            y = int(round(cy + math.sin(rad) * r))
            px(img, x, y, col)
    save(img, out, "basic_windup_03.png")


# ==============================================================================
# Main
# ==============================================================================

if __name__ == "__main__":
    print("Generating tower_blast/charge …")
    generate_tower_charge()

    print("Generating tower_blast/projectile …")
    generate_tower_projectile()

    print("Generating tower_blast/impact …")
    generate_tower_impact()

    print("Generating basic_attack/slash …")
    generate_basic_slash()

    print("Generating basic_attack/hit …")
    generate_basic_hit()

    print("Generating basic_attack/windup …")
    generate_basic_windup()

    print("\nAll VFX frames generated successfully.")
    print(f"Output root: {os.path.relpath(VFX_ROOT, ROOT)}/")
