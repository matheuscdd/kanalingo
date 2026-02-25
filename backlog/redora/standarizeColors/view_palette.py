def save_palette_preview(colors):
    from PIL import Image

    swatch_size = 100
    img = Image.new("RGB", (swatch_size * len(colors), swatch_size))

    for i, color in enumerate(colors):
        block = Image.new("RGB", (swatch_size, swatch_size), color)
        img.paste(block, (i * swatch_size, 0))

    img.save("palette_preview.png")

save_palette_preview(['#e9eefa', '#e0c8d2', '#7679ed', '#6e78f3', '#6e76f5', '#6e76f3', '#6e76f2', '#6d77f1', '#686deb', 
'#505ad4', '#4654cd', '#344192'])