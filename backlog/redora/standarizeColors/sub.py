from PIL import Image
import numpy as np

# ==== CONFIG ====
INPUT_PATH = "output.png"
OUTPUT_PATH = "output.png"

# Cor que você quer substituir (HEX)
COR_ALVO_HEX = "#9895da"

# Cor nova (HEX)
COR_NOVA_HEX = "#9491e3"

# Tolerância (quanto parecido com a cor alvo é considerado)
TOLERANCIA = 10
# =================

# Função para converter HEX -> RGB
def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

COR_ALVO = np.array(hex_to_rgb(COR_ALVO_HEX))
COR_NOVA = np.array(hex_to_rgb(COR_NOVA_HEX))

# Abre imagem e converte para RGB
img = Image.open(INPUT_PATH).convert("RGB")
data = np.array(img)

# Calcula distância da cor alvo
diff = np.linalg.norm(data - COR_ALVO, axis=2)

# Substitui só pixels dentro da tolerância
mask = diff <= TOLERANCIA
data[mask] = COR_NOVA

# Salva resultado
new_img = Image.fromarray(data)
new_img.save(OUTPUT_PATH)

print("✅ Substituição concluída!")