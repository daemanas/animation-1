"""Segment the reference tree image into independent transparent layers."""
import json, os
import numpy as np
from PIL import Image, ImageFilter

SRC = "public/reference.jpg"
OUT = "public/layers"
os.makedirs(OUT, exist_ok=True)
PREV = "tools/preview"
os.makedirs(PREV, exist_ok=True)

W, H = 776, 621

img = Image.open(SRC).convert("RGB")
rgb = np.asarray(img).astype(np.float32) / 255.0

# ---------- HSV ----------
maxc = rgb.max(axis=2)
minc = rgb.min(axis=2)
delta = maxc - minc + 1e-6
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.zeros_like(maxc)
m_r = (maxc == r)
m_g = (maxc == g) & ~m_r
m_b = (maxc == b) & ~m_r & ~m_g
hue[m_r] = (60 * ((g - b) / delta) % 360)[m_r]
hue[m_g] = (60 * ((b - r) / delta) + 120)[m_g]
hue[m_b] = (60 * ((r - g) / delta) + 240)[m_b]
sat = delta / (maxc + 1e-6)
val = maxc

ys, xs = np.mgrid[0:H, 0:W]
u = xs / (W - 1)
v = ys / (H - 1)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def soft_rect(cx, cy, rx, ry, feather=0.09):
    d = np.sqrt(((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2)
    return 1 - smoothstep(1 - feather, 1 + feather, d)


def alpha_img(alpha, name, crop=None, blur=1.2):
    """alpha float 0..1 -> PIL RGBA webp."""
    a = np.clip(alpha, 0, 1)
    a_img = Image.fromarray((a * 255).astype(np.uint8), "L")
    if blur:
        a_img = a_img.filter(ImageFilter.GaussianBlur(blur))
    rgba = np.dstack([np.asarray(img), np.asarray(a_img)])
    out = Image.fromarray(rgba.astype(np.uint8), "RGBA")
    if crop:
        out = out.crop(crop)
    path = os.path.join(OUT, name)
    out.save(path, "WEBP", quality=90, method=6)
    return {
        "src": f"/layers/{name}",
        "x": crop[0] if crop else 0,
        "y": crop[1] if crop else 0,
        "w": out.width,
        "h": out.height,
    }


def bbox_of(alpha, thresh=0.06, pad=6):
    m = alpha > thresh
    if not m.any():
        return (0, 0, W, H)
    yy, xx = np.where(m)
    x0, x1 = max(0, xx.min() - pad), min(W, xx.max() + pad + 1)
    y0, y1 = max(0, yy.min() - pad), min(H, yy.max() + pad + 1)
    return (int(x0), int(y0), int(x1), int(y1))


# ---------- per-row sky reference from far edges ----------
side_cols = np.r_[0:22, W - 22:W]
row_bg = np.median(rgb[:, side_cols, :], axis=1)  # H x 3
row_bg_img = row_bg[:, None, :]
color_dist = np.abs(rgb - row_bg_img).max(axis=2)

# allowed region for the tree subject (avoid mountains / edge bokeh)
zone = (
    smoothstep(0.03, 0.08, v)  # below very top
    * (1 - smoothstep(0.80, 0.90, v))
    * smoothstep(0.05, 0.12, u)
    * (1 - smoothstep(0.87, 0.94, u))
)
zone_low = smoothstep(0.25, 0.32, u) * (1 - smoothstep(0.71, 0.78, u))
zone = np.maximum(zone * (1 - smoothstep(0.62, 0.72, v)), zone_low * smoothstep(0.62, 0.72, v))

# pink/magenta identification
pink_hue = (hue > 292) | (hue < 22)
pinkish = pink_hue & (sat > 0.30) & (val > 0.12)
solid = color_dist > 0.085

subject_raw = (pinkish & solid & (v < 0.80) & (np.abs(u - 0.49) < 0.39)) | (
    (val < 0.42) & (sat > 0.25) & (v > 0.33) & (v < 0.92) & (np.abs(u - 0.49) < 0.36)
)
subject_raw = subject_raw & (zone > 0.05)

sm = Image.fromarray((subject_raw * 255).astype(np.uint8), "L")
sm = sm.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
sm = sm.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))  # close
subject = np.asarray(sm).astype(np.float32) / 255.0
subject = subject * zone

# ---------- sky background (reconstruct) ----------
mask = subject > 0.35
# also clear the stone base and the trunk corridor (they are not pink enough to key)
structural = np.clip(
    soft_rect(0.495, 0.885, 0.215, 0.145, 0.3)
    + soft_rect(0.35, 0.93, 0.13, 0.085, 0.3)
    + soft_rect(0.64, 0.92, 0.14, 0.09, 0.3),
    0,
    1,
) * smoothstep(0.64, 0.74, v)
trunk_band2 = (1 - smoothstep(0.03, 0.11, np.abs(u - 0.49))) * smoothstep(0.40, 0.47, v) * (1 - smoothstep(0.78, 0.85, v))
mask = (np.clip(mask.astype(np.float32) + structural + trunk_band2 * 0.95, 0, 1) > 0.35)
# widen mask over the canopy halo so no dark ring survives
m_dil = Image.fromarray((mask * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(13))
mask_w = np.asarray(m_dil).astype(np.float32) / 255.0 > 0.5

safe = (np.abs(u - 0.49) > 0.44) & (subject < 0.12) & (v < 0.84)
rows_l = np.full((H, 3), np.nan, np.float32)
rows_r = np.full((H, 3), np.nan, np.float32)
for y in range(H):
    ml = safe[y] & (u[y] < 0.47)
    mr = safe[y] & (u[y] >= 0.47)
    if ml.sum() > 6:
        rows_l[y] = np.median(rgb[y][ml], axis=0)
    if mr.sum() > 6:
        rows_r[y] = np.median(rgb[y][mr], axis=0)

def fill_rows(rows):
    idx = np.arange(H)
    out = rows.copy()
    for c in range(3):
        good = ~np.isnan(rows[:, c])
        out[:, c] = np.interp(idx, idx[good], rows[good, c])
    # smooth vertically
    k = np.exp(-0.5 * (np.arange(-30, 31) / 13.0) ** 2)
    k /= k.sum()
    for c in range(3):
        out[:, c] = np.convolve(np.pad(out[:, c], 30, mode='edge'), k, mode='valid')
    return out

rl = fill_rows(rows_l)
rr = fill_rows(rows_r)
wt = np.clip((u - 0.3) / 0.4, 0, 1)[:, :, None]
fill = rl[:, None, :] * (1 - wt) + rr[:, None, :] * wt

# warm sunset bloom where the tree once stood
glow = np.exp(-((((u - 0.5) / 0.33) ** 2) + (((v - 0.52) / 0.26) ** 2)))
fill = fill * (1 + (0.08 * glow)[..., None]) + (np.array([0.045, 0.004, 0.012]) * glow[..., None])

w_soft = np.asarray(
    Image.fromarray((mask_w * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(38))
).astype(np.float32) / 255.0
w_soft = np.clip(w_soft * 1.3, 0, 1)[..., None]

# ground rose texture mirrored from the undisturbed petals at the sides
xm = np.where(u < 0.5, np.clip(0.30 - (u - 0.30), 0.01, 0.99), np.clip(0.70 + (0.70 - u), 0.01, 0.99))
xidx = np.clip((xm * (W - 1)).astype(int), 0, W - 1)
gtex = rgb[np.arange(H)[:, None], xidx]
gtex = np.asarray(
    Image.fromarray((gtex * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(8))
).astype(np.float32) / 255.0
ground_px = rgb[(v > 0.94) & ((u < 0.24) | (u > 0.76))]
ground_fill = np.median(ground_px, axis=0) if len(ground_px) > 100 else np.array([0.62, 0.34, 0.45], np.float32)
gtex = gtex * 0.55 + ground_fill[None, None, :] * 0.45
mixg = (smoothstep(0.68, 0.88, v) * 0.92)[..., None]
fill = fill * (1 - mixg) + gtex * mixg

# soft procedural cloud texture so the reconstructed area never looks flat
rng = np.random.default_rng(11)
nr = rng.normal(0, 1, (H // 10, W // 10)).astype(np.float32)
nr = (nr - nr.min()) / (np.ptp(nr) + 1e-6)
noise_img = Image.fromarray((nr * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
noise = (np.asarray(noise_img).astype(np.float32) / 255 - 0.5) * 0.05
fill = fill + noise[..., None]

sky = np.clip(rgb * (1 - w_soft) + fill * w_soft, 0, 1)
sky_img = Image.fromarray((sky * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
sky_img = sky_img.resize((W * 2, H * 2), Image.LANCZOS)
sky_img.save(os.path.join(OUT, "sky.webp"), "WEBP", quality=86, method=6)
sky_img.resize((W, H), Image.LANCZOS).save(os.path.join(PREV, "sky.jpg"), quality=88)
Image.fromarray((w_soft[..., 0] * 255).astype(np.uint8)).save(os.path.join(PREV, "mask.jpg"), quality=88)

# ---------- mountains ----------
mnt_l = soft_rect(0.10, 0.745, 0.23, 0.10) * (u < 0.30) * (val < 0.99)
mnt_r = soft_rect(0.93, 0.80, 0.20, 0.10) * (u > 0.72)
mountain_l = alpha_img(mnt_l, "mountain-left.webp", bbox_of(mnt_l), 4.0)
mountain_r = alpha_img(mnt_r, "mountain-right.webp", bbox_of(mnt_r), 4.0)

# ---------- canopy ----------
canopy = subject * pinkish * smoothstep(0.30, 0.60, sat) * (v < 0.80)
# strengthen inside known canopy area
canopy_core = soft_rect(0.485, 0.365, 0.375, 0.285, 0.12)
canopy = np.maximum(canopy * 0.9, canopy_core * (subject > 0.5) * 0.95)
canopy = np.clip(canopy, 0, 1)
# remove trunk-ish dark center low area from canopy
trunk_band = (np.abs(u - 0.49) < 0.055) * smoothstep(0.58, 0.70, v)
canopy *= 1 - trunk_band * 0.9

split = 0.485
left_w = 1 - smoothstep(split - 0.012, split + 0.012, u)
right_w = smoothstep(split - 0.012, split + 0.012, u)
can_l = canopy * left_w
can_r = canopy * right_w
# lobes must include inner branch area
can_l = np.clip(can_l * 1.05, 0, 1)
can_r = np.clip(can_r * 1.05, 0, 1)
left_lobe = alpha_img(can_l, "canopy-left.webp", bbox_of(can_l, 0.10, 4), 1.1)
right_lobe = alpha_img(can_r, "canopy-right.webp", bbox_of(can_r, 0.10, 4), 1.1)

# bloom pieces: feathered elliptical discs across each lobe
def bloom_pieces(alpha, bbox, tag, cols, rows, start, outward_order=True):
    x0, y0, x1, y1 = bbox
    pieces = []
    cw = (x1 - x0) / cols
    ch = (y1 - y0) / rows
    cells = []
    for j in range(rows):
        for i in range(cols):
            cx = x0 + cw * (i + 0.5)
            cy = y0 + ch * (j + 0.5)
            cells.append((cx, cy))
    # bloom from inside-out (near inner-bottom of lobe = branch connections)
    icx = x0 + (x1 - x0) * (0.72 if tag == "l" else 0.28)
    icy = y0 + (y1 - y0) * 0.86
    cells.sort(key=lambda c: ((c[0] - icx) ** 2 + (c[1] - icy) ** 2) ** 0.5)
    for idx, (cx, cy) in enumerate(cells):
        rx = cw * 0.78
        ry = ch * 0.80
        d = np.sqrt(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2)
        fall = np.clip(1 - smoothstep(0.55, 1.0, d), 0, 1)
        a = alpha * fall
        b = bbox_of(a, 0.12, 2)
        if b[2] - b[0] < 10 or b[3] - b[1] < 10:
            continue
        pieces.append(alpha_img(a, f"bloom-{tag}-{idx:02d}.webp", b, 1.6))
    return pieces

blooms_l = bloom_pieces(can_l, bbox_of(can_l, 0.10, 4), "l", 4, 3, 0)
blooms_r = bloom_pieces(can_r, bbox_of(can_r, 0.10, 4), "r", 4, 3, 0)

# ---------- rocks ----------
rock_zone = ((u > 0.28) & (u < 0.74) & (v > 0.70) & (v < 0.995))
rock_core = soft_rect(0.495, 0.885, 0.185, 0.11, 0.16)
rock_alpha = np.clip((subject * 1.1 + rock_core * 0.9) * rock_zone, 0, 1)
rock_alpha = np.clip(rock_alpha, 0, 1)

def rock_crop(cx, cy, rx, ry, name):
    m = rock_alpha * soft_rect(cx, cy, rx, ry, 0.18)
    return alpha_img(m, name, bbox_of(m, 0.10, 3), 2.0)

rock_c = rock_crop(0.495, 0.885, 0.155, 0.115, "rock-center.webp")
rock_l = rock_crop(0.355, 0.925, 0.115, 0.075, "rock-left.webp")
rock_r = rock_crop(0.635, 0.915, 0.115, 0.075, "rock-right.webp")

# small foreground boulders outside the main rock (bottom corners)
small_l = soft_rect(0.075, 0.905, 0.085, 0.055, 0.2)
small_r = soft_rect(0.945, 0.845, 0.07, 0.05, 0.2)
boulder_l = alpha_img(small_l, "boulder-left.webp", bbox_of(small_l), 4.0)
boulder_r = alpha_img(small_r, "boulder-right.webp", bbox_of(small_r), 4.0)

# ---------- trunk texture ----------
def rot_ellipse(cx, cy, rx, ry, ang_deg, feather=0.12):
    a = np.deg2rad(ang_deg)
    xr = (u - cx) * np.cos(a) + (v - cy) * np.sin(a)
    yr = -(u - cx) * np.sin(a) + (v - cy) * np.cos(a)
    d = np.sqrt((xr / rx) ** 2 + (yr / ry) ** 2)
    return 1 - smoothstep(1 - feather, 1 + feather, d)

trunk_poly = np.clip(
    rot_ellipse(0.492, 0.700, 0.072, 0.245, 0)
    + rot_ellipse(0.450, 0.437, 0.048, 0.095, 24)
    + rot_ellipse(0.538, 0.430, 0.048, 0.095, -26)
    + rot_ellipse(0.492, 0.905, 0.085, 0.075, 0),
    0,
    1,
)
trunk_dark = np.clip(smoothstep(0.60, 0.38, val) * 1.15, 0, 1)
trunk_hue_ok = ((hue > 288) | (hue < 28) | (sat > 0.5)).astype(np.float32)
trunk_a = trunk_poly * trunk_dark * trunk_hue_ok
# close pinholes so bright bark highlights don't punch see-through gaps
trunk_fill = np.asarray(
    Image.fromarray((np.clip(trunk_poly * trunk_dark, 0, 1) * 255).astype(np.uint8), "L")
    .filter(ImageFilter.MaxFilter(5))
    .filter(ImageFilter.MinFilter(3))
    .filter(ImageFilter.GaussianBlur(1.1))
).astype(np.float32) / 255.0
base_gate = smoothstep(0.74, 0.84, v)
trunk_a = np.maximum(trunk_a, trunk_fill * 0.92 + trunk_poly * base_gate)
trunk_a = np.asarray(
    Image.fromarray((np.clip(trunk_a, 0, 1) * 255).astype(np.uint8), "L")
    .filter(ImageFilter.MaxFilter(3))
    .filter(ImageFilter.GaussianBlur(0.9))
).astype(np.float32) / 255.0
trunk_a = np.clip(trunk_a * 1.1, 0, 1)
# fade the bokeh skirt out of the layer bottom — the photographic trunk should
# end where the crown of roots meets the stone
trunk_a *= 1 - smoothstep(0.915, 0.952, v)
trunk_layer = alpha_img(trunk_a, "trunk.webp", bbox_of(trunk_a, 0.13, 3), 0.7)

# ---------- full reference reveal ----------
ref = Image.open(SRC).convert("RGB").resize((W * 2, H * 2), Image.LANCZOS)
ref.save(os.path.join(OUT, "reference.webp"), "WEBP", quality=88, method=6)

manifest = {
    "artboard": {"w": W, "h": H},
    "sky": {"src": "/layers/sky.webp"},
    "reference": {"src": "/layers/reference.webp"},
    "mountains": {"left": mountain_l, "right": mountain_r},
    "rocks": [rock_l, rock_c, rock_r],
    "boulders": [boulder_l, boulder_r],
    "canopy": {"left": left_lobe, "right": right_lobe},
    "blooms": {"left": blooms_l, "right": blooms_r},
    "trunk": trunk_layer,
}
with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)

# ---------- contact sheet preview ----------
def checker(size, sq=16):
    w, h = size
    c = np.zeros((h, w, 3), np.uint8)
    yy, xx = np.mgrid[0:h, 0:w]
    chk = ((xx // sq + yy // sq) % 2).astype(np.uint8) * 40 + 50
    c[..., 0] = chk
    c[..., 1] = chk
    c[..., 2] = chk
    return c

tiles = []
for name in ["canopy-left.webp", "canopy-right.webp", "rock-center.webp", "trunk.webp"]:
    im = Image.open(os.path.join(OUT, name)).convert("RGBA")
    bg = Image.fromarray(checker(im.size))
    bg.paste(im, (0, 0), im)
    bg.thumbnail((360, 360))
    tiles.append((name, bg))

sheet = Image.new("RGB", (740, 2 * 400), (30, 30, 30))
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for i, (name, t) in enumerate(tiles):
    x = (i % 2) * 370 + 5
    y = (i // 2) * 400 + 24
    sheet.paste(t, (x, y))
    d.text((x, y - 16), name, fill=(255, 255, 255))
sheet.save(os.path.join(PREV, "layers.jpg"), quality=88)

# composed test over sky
sky_i = Image.open(os.path.join(PREV, "sky.jpg")).convert("RGB")
comp = sky_i.copy()
for key in [("mountains", "left"), ("mountains", "right")]:
    li = Image.open(os.path.join(OUT, manifest[key[0]][key[1]]["src"].split("/")[-1])).convert("RGBA")
    comp.paste(li, (manifest[key[0]][key[1]]["x"], manifest[key[0]][key[1]]["y"]), li)
for rk in manifest["rocks"] + manifest["boulders"]:
    li = Image.open(os.path.join(OUT, rk["src"].split("/")[-1])).convert("RGBA")
    comp.paste(li, (rk["x"], rk["y"]), li)
for k in ["left", "right"]:
    b = manifest["canopy"][k]
    li = Image.open(os.path.join(OUT, b["src"].split("/")[-1])).convert("RGBA")
    comp.paste(li, (b["x"], b["y"]), li)
b = manifest["trunk"]
li = Image.open(os.path.join(OUT, b["src"].split("/")[-1])).convert("RGBA")
comp.paste(li, (b["x"], b["y"]), li)
comp.save(os.path.join(PREV, "composite.jpg"), quality=90)

print("DONE", len(blooms_l), len(blooms_r))
for k in ["canopy", "trunk", "mountains"]:
    print(k, manifest[k])
print("rock alpha coverage", float(mask.mean()))
