"""Genera las portadas ficticias de ejemplo (ejemplos/*.jpg). Solo para el prototipo."""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SALIDA = Path(__file__).resolve().parent.parent / "ejemplos"
W, H = 1200, 675


def degradado(c1, c2):
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = (x / W * 0.6 + y / H * 0.4)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))
    return img


def naipes():
    img = degradado((40, 90, 60), (12, 40, 28))
    d = ImageDraw.Draw(img, "RGBA")
    random.seed(3)
    for i in range(7):
        cx, cy = 300 + i * 110, 380 + random.randint(-40, 40)
        ang = -30 + i * 10
        carta = Image.new("RGBA", (180, 260), (0, 0, 0, 0))
        dc = ImageDraw.Draw(carta)
        dc.rounded_rectangle((0, 0, 179, 259), 16, fill=(250, 247, 240, 255), outline=(180, 160, 120, 255), width=3)
        dc.rounded_rectangle((14, 14, 165, 245), 10, outline=(196, 18, 48, 200), width=4)
        dc.ellipse((60, 100, 120, 160), fill=(196, 18, 48, 230) if i % 2 else (34, 61, 113, 230))
        carta = carta.rotate(ang, expand=True, resample=Image.BICUBIC)
        sombra = Image.new("RGBA", carta.size, (0, 0, 0, 0))
        sombra.paste((0, 0, 0, 90), mask=carta.split()[3])
        sombra = sombra.filter(ImageFilter.GaussianBlur(8))
        img.paste(sombra, (cx - carta.width // 2 + 8, cy - carta.height // 2 + 10), sombra)
        img.paste(carta, (cx - carta.width // 2, cy - carta.height // 2), carta)
    return img


def moleculas():
    img = degradado((15, 94, 110), (10, 40, 70))
    d = ImageDraw.Draw(img, "RGBA")
    random.seed(7)
    puntos = [(random.randint(80, W - 80), random.randint(60, H - 60)) for _ in range(26)]
    for i, p in enumerate(puntos):
        for q in puntos[i + 1:]:
            if math.dist(p, q) < 230:
                d.line((p, q), fill=(255, 255, 255, 90), width=4)
    for p in puntos:
        r = random.choice((14, 20, 28))
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=(255, 255, 255, 210))
    return img


def auditorio():
    img = degradado((34, 61, 113), (16, 28, 56))
    d = ImageDraw.Draw(img, "RGBA")
    for fila in range(9):
        y = 330 + fila * 38
        n = 14 + fila * 2
        ancho = 700 + fila * 60
        for k in range(n):
            x = W / 2 - ancho / 2 + k * ancho / (n - 1)
            d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=(255, 255, 255, 60 + fila * 12))
    d.rectangle((420, 70, 780, 260), fill=(255, 255, 255, 230))
    for i in range(5):
        d.rectangle((460, 110 + i * 28, 460 + random.randint(140, 280), 124 + i * 28), fill=(34, 61, 113, 200))
    return img


def main():
    SALIDA.mkdir(exist_ok=True)
    for nombre, f in (("mus", naipes), ("latex", moleculas), ("salidas", auditorio)):
        f().save(SALIDA / f"{nombre}.jpg", quality=84, optimize=True, progressive=True)
        print("ok", nombre)


if __name__ == "__main__":
    main()
