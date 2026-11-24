"""Convert raw Flow downloads (assets/raw/*.jpg) into game assets.
Usage: python tools/process_assets.py [name ...]   (no names = everything)
 - backgrounds -> assets/bg/<name>.png (upscaled to 1920 wide; skies made horizontally tileable)
 - sprites     -> assets/sprites/<name>.png (flat background removed, trimmed, <=512px)
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
BG = os.path.join(ROOT, "assets", "bg")
SP = os.path.join(ROOT, "assets", "sprites")

BACKGROUNDS = ["menu", "map", "sky_canyon", "sky_acid", "sky_crystal", "sky_castle"]
TILEABLE = {"sky_canyon", "sky_acid", "sky_crystal", "sky_castle"}
SPRITES = ["hero", "hero_jump", "alien", "drone", "blob", "robot_chef", "pizzeria", "ufo",
           "pizza_slice", "pizza_whole", "coin", "powerup", "box", "crate", "spikes", "bounce_pad"]


def make_tileable(img, frac=0.15):
    a = np.asarray(img).astype(np.float32)
    h, w, _ = a.shape
    ov = int(w * frac)
    out = a[:, : w - ov].copy()
    t = np.linspace(0, 1, ov, dtype=np.float32)[None, :, None]
    out[:, :ov] = a[:, :ov] * t + a[:, w - ov:] * (1 - t)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def do_bg(name):
    im = Image.open(os.path.join(RAW, name + ".jpg")).convert("RGB")
    if name in TILEABLE:
        im = make_tileable(im)
    scale = 1920 / im.width
    im = im.resize((1920, round(im.height * scale)), Image.LANCZOS)
    im.save(os.path.join(BG, name + ".png"), optimize=True)
    print("bg", name, im.size)


def do_sprite(name, tol_lo=45, tol_hi=115):
    im = Image.open(os.path.join(RAW, name + ".jpg")).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    cand = dist < 70
    lab, n = ndi.label(cand)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgconn = np.isin(lab, list(edge_labels))
    # enclosed holes of the key colour (cheese holes, gaps between parts): strict tolerance, min size
    lab2, n2 = ndi.label(dist < 55)
    sizes = ndi.sum(np.ones_like(lab2), lab2, index=np.arange(1, n2 + 1))
    big = np.isin(lab2, [i + 1 for i, sz in enumerate(sizes) if sz >= 40])
    bgconn = bgconn | big
    region = ndi.binary_dilation(bgconn, iterations=3)
    alpha = np.ones((h, w), np.float32)
    soft = np.clip((dist - tol_lo) / (tol_hi - tol_lo), 0, 1)
    alpha[region] = soft[region]
    alpha[bgconn] = 0
    # decontaminate edge pixels
    m = region & (alpha > 0) & (alpha < 1)
    af = np.maximum(alpha[..., None], 0.05)
    dec = bg + (a - bg) / af
    a2 = a.copy()
    a2[m] = np.clip(dec[m], 0, 255)
    # shave a pixel of fringe
    alpha = ndi.grey_erosion(alpha, size=(2, 2))
    rgba = np.dstack([a2, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    bbox = Image.fromarray((alpha > 0.03).astype(np.uint8) * 255).getbbox()
    out = out.crop(bbox)
    pad = 2
    canvas = Image.new("RGBA", (out.width + 2 * pad, out.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(out, (pad, pad))
    s = 512 / max(canvas.size)
    if s < 1:
        canvas = canvas.resize((round(canvas.width * s), round(canvas.height * s)), Image.LANCZOS)
    canvas.save(os.path.join(SP, name + ".png"), optimize=True)
    print("sprite", name, canvas.size, "bg", bg.astype(int))


if __name__ == "__main__":
    os.makedirs(BG, exist_ok=True)
    os.makedirs(SP, exist_ok=True)
    names = sys.argv[1:] or BACKGROUNDS + SPRITES
    for n in names:
        (do_bg if n in BACKGROUNDS else do_sprite)(n)
