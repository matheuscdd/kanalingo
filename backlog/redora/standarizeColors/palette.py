from PIL import Image

def extract_palette(image_path, num_colors=8):
    img = Image.open(image_path).convert("RGB")

    # reduz tamanho pra acelerar
    img = img.resize((200, 200))

    # converte para modo com paleta adaptativa
    result = img.convert("P", palette=Image.ADAPTIVE, colors=num_colors)

    palette = result.getpalette()[:num_colors * 3]

    colors = []
    for i in range(0, len(palette), 3):
        r, g, b = palette[i:i+3]
        colors.append(f"#{r:02x}{g:02x}{b:02x}")

    return colors

print("Cores estimadas:", extract_palette("ref.jpg", 12))