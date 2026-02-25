from PIL import Image
import numpy as np

def estimate_color_count(image_path, tolerance=10):
    img = Image.open(image_path).convert("RGB")
    img = img.resize((200, 200))

    data = np.array(img).reshape(-1, 3)

    # reduz variação de tons (agrupa cores próximas)
    quantized = (data // tolerance) * tolerance

    unique_colors = np.unique(quantized, axis=0)

    return len(unique_colors)


num_colors = estimate_color_count("ref.jpg")
print("Cores estimadas:", num_colors)