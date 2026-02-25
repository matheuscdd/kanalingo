import os
from PIL import Image
import numpy as np
from tqdm import tqdm
from palette import extract_palette

# ==== CONFIG ====
INPUT_DIR = "input"
OUTPUT_DIR = "output"

PALETTE = [
    "#6e76f3",
    "#5f67f0",
    "#24569f",
    "#fefffb",
    "#fad6c6",
    "#fbb8b2",
    "#c45450",
    "#ea777c",
    "#f2b0a4",
    "#373737",
    "#e6edfd",
    "#c3d8f3",
    "#bbbcf8",
    "#9592e3",
    "#283c9f",
    "#275597"
]
# =================

palette_rgb = np.array([
    tuple(int(c[i:i+2], 16) for i in (1, 3, 5))
    for c in PALETTE
])

def closest_color(pixel):
    distances = np.sqrt(((palette_rgb - pixel) ** 2).sum(axis=1))
    return palette_rgb[np.argmin(distances)]

os.makedirs(OUTPUT_DIR, exist_ok=True)

files = [
    f for f in os.listdir(INPUT_DIR)
    if f.lower().endswith((".png", ".jpg", ".jpeg"))
]

for file in tqdm(files, desc="🎨 Processando imagens", unit="img"):
    img = Image.open(os.path.join(INPUT_DIR, file)).convert("RGB")
    data = np.array(img)

    new_data = np.array([
        [closest_color(pixel) for pixel in row]
        for row in data
    ], dtype=np.uint8)

    new_img = Image.fromarray(new_data)
    new_img.save(os.path.join(OUTPUT_DIR, file))

print("✅ Processamento concluído!")