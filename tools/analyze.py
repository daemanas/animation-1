from PIL import Image
import numpy as np

im = Image.open("public/reference.jpg").convert("RGB")
a = np.asarray(im).astype(np.float32) / 255.0

def px(x, y):
    c = a[y, x]
    return tuple(round(v * 255) for v in c)

pts = {
    "sky_top": (400, 15),
    "sky_mid": (60, 200),
    "sky_glow": (400, 300),
    "canopy_dark": (230, 180),
    "canopy_bright": (500, 140),
    "canopy_edge": (120, 300),
    "trunk": (380, 400),
    "trunk_dark": (350, 460),
    "rock": (300, 560),
    "rock2": (480, 555),
    "mountain_left": (60, 470),
    "mountain_right": (720, 490),
    "ground_pink": (400, 610),
    "bokeh": (100, 600),
}
for k, (x, y) in pts.items():
    print(f"{k:16s} ({x},{y}) -> {px(x, y)}")

# HSV histogram rough regions
import colorsys
def hsv_at(x, y):
    r, g, b = a[y, x]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return round(h*360), round(s*100), round(v*100)
print()
for k, (x, y) in pts.items():
    print(f"{k:16s} H S V -> {hsv_at(x, y)}")
