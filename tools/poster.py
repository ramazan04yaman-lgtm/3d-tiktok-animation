"""Eigenes Miami-Collage-Poster als Klemmbaustein-Mosaik (54 x 96 = 5.184 Steine).
Usage: python3 -I tools/poster.py <ausgabe-ordner> [gesetzte_steine ...]
Zeichnet die Vorlage in 540x960, rastert auf 54x96, quantisiert auf Steinfarben und rendert
Mosaik-Bilder (1080x1920, 20 px pro Stein) – fertig oder als Zwischenstand (von unten nach oben).
"""
import glob, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

GW, GH, S = 54, 96, 10           # Raster, Zeichen-Skalierung
W, H = GW * S, GH * S
PAL = {  # Steinfarben
    "black": (17, 17, 20), "white": (245, 245, 245), "lgray": (190, 195, 205), "dgray": (70, 74, 84),
    "pink": (255, 60, 158), "magenta": (194, 24, 122), "purple": (106, 61, 154), "lavender": (179, 157, 219),
    "dpurple": (52, 28, 88), "orange": (255, 138, 26), "yellow": (255, 212, 0), "lyellow": (255, 240, 160),
    "teal": (0, 184, 169), "lteal": (127, 227, 224), "blue": (30, 136, 229), "dblue": (23, 58, 122),
    "sky": (143, 211, 255), "green": (46, 157, 58), "dgreen": (27, 94, 32), "olive": (124, 143, 58),
    "brown": (110, 68, 32), "tan": (232, 201, 143), "red": (229, 57, 53), "salmon": (255, 138, 128),
}
FONT = next((f for f in ["/usr/share/fonts/opentype/inter/InterDisplay-Black.otf", "/usr/share/fonts/opentype/inter/Inter-Black.otf",
                         "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"] if os.path.exists(f)), None)


def grad(img, box, top, bot):
    x0, y0, x1, y1 = box; d = ImageDraw.Draw(img)
    for y in range(y0, y1):
        k = (y - y0) / max(1, y1 - y0 - 1); d.line([(x0, y), (x1, y)], fill=tuple(int(a + (b - a) * k) for a, b in zip(top, bot)))


def palm(d, x, y, h, col, lean=1):
    pts = [(x + lean * (i / 10) ** 2 * 18, y - h * i / 10) for i in range(11)]
    d.line(pts, fill=col, width=9)
    tx, ty = pts[-1]
    for a in range(0, 360, 45):
        r = math.radians(a)
        d.line([(tx, ty), (tx + math.cos(r) * 55, ty + math.sin(r) * 28 + 18)], fill=col, width=10)


def panel_art(i):
    """Inhalt eines Bildfelds (volle Leinwand, wird später maskiert)."""
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im); P = PAL
    if i == 0:  # Skyline am Wasser + Hubschrauber
        grad(im, (0, 0, W, 300), P["sky"], P["salmon"])
        for k, (x, w, h) in enumerate([(0, 40, 150), (45, 35, 200), (85, 45, 130), (135, 30, 230), (170, 40, 160)]):
            d.rectangle([x, 300 - h, x + w, 300], fill=P["dblue"] if k % 2 else P["blue"])
            for wy in range(300 - h + 12, 290, 22): d.line([(x + 6, wy), (x + w - 6, wy)], fill=P["lteal"], width=3)
        d.rectangle([0, 290, W, 360], fill=P["teal"])
        d.ellipse([40, 70, 140, 125], fill=P["red"]); d.ellipse([90, 78, 132, 108], fill=P["sky"])
        d.line([(40, 95), (0, 80)], fill=P["red"], width=12); d.line([(10, 50), (170, 44)], fill=P["black"], width=8); d.line([(90, 50), (90, 70)], fill=P["black"], width=8)
        d.line([(55, 140), (135, 140)], fill=P["black"], width=8)
    elif i == 1:  # Sonnenuntergang mit Palmen
        grad(im, (0, 0, W, 330), P["purple"], P["orange"]); d.ellipse([215, 170, 335, 290], fill=P["yellow"])
        for k in range(4): d.line([(190, 230 + k * 20), (380, 230 + k * 20)], fill=P["orange"], width=6)
        palm(d, 215, 340, 250, P["dpurple"], 1); palm(d, 340, 340, 210, P["dpurple"], -1)
    elif i == 2:  # Polizeiauto mit Blaulicht
        grad(im, (0, 0, W, 330), P["dpurple"], P["purple"]); d.rectangle([370, 250, W, 330], fill=P["dgray"])
        d.polygon([(385, 250), (395, 200), (430, 180), (490, 180), (520, 200), (540, 205), (540, 250)], fill=P["white"])
        d.rectangle([385, 225, 540, 252], fill=P["black"]); d.polygon([(435, 186), (488, 186), (505, 203), (425, 203)], fill=P["sky"])
        d.rectangle([440, 165, 460, 178], fill=P["blue"]); d.rectangle([462, 165, 482, 178], fill=P["red"])
        for cx in (415, 515): d.ellipse([cx - 20, 235, cx + 20, 275], fill=P["black"]); d.ellipse([cx - 8, 247, cx + 8, 263], fill=P["lgray"])
        d.ellipse([390, 100, 470, 150], fill=P["blue"]); d.ellipse([460, 100, 540, 150], fill=P["red"])
    elif i == 3:  # pinkes Cabrio
        grad(im, (0, 330, 190, 560), P["salmon"], P["pink"]); d.rectangle([0, 560, 190, 660], fill=P["dgray"])
        d.polygon([(5, 520), (25, 488), (80, 478), (100, 462), (125, 462), (130, 480), (185, 492), (190, 540), (5, 545)], fill=P["pink"])
        d.rectangle([5, 512, 190, 522], fill=P["teal"]); d.polygon([(100, 462), (112, 440), (118, 440), (110, 470)], fill=P["sky"])
        for cx in (45, 150): d.ellipse([cx - 24, 520, cx + 24, 568], fill=P["black"]); d.ellipse([cx - 10, 534, cx + 10, 554], fill=P["white"])
        d.rectangle([180, 498, 190, 508], fill=P["lyellow"])
    elif i == 4:  # Art-déco-Hotel mit Neon
        grad(im, (170, 300, 375, 640), P["lavender"], P["salmon"])
        d.rectangle([200, 350, 345, 640], fill=P["lteal"]); d.rectangle([245, 320, 300, 352], fill=P["lteal"])
        for wy in range(380, 640, 30):
            for wx in (215, 250, 285, 320): d.rectangle([wx, wy, wx + 14, wy + 16], fill=P["blue"])
        d.rectangle([262, 330, 283, 620], fill=P["pink"])
    elif i == 5:  # Flamingo am Wasser
        grad(im, (370, 300, W, 630), P["sky"], P["blue"])
        d.ellipse([405, 530, 495, 580], fill=P["pink"]); d.line([(478, 538), (500, 490), (478, 465)], fill=P["pink"], width=14)
        d.ellipse([462, 450, 495, 478], fill=P["pink"]); d.polygon([(465, 466), (445, 476), (462, 478)], fill=P["black"])
        d.line([(440, 578), (440, 625)], fill=P["salmon"], width=6); d.line([(455, 578), (470, 625)], fill=P["salmon"], width=6)
        d.polygon([(405, 552), (378, 530), (415, 540)], fill=P["magenta"])
    elif i == 6:  # Alligator im Sumpf
        grad(im, (0, 640, 190, H), P["olive"], P["dgreen"])
        d.polygon([(0, 790), (140, 760), (185, 780), (150, 800), (0, 820)], fill=P["green"])
        d.polygon([(0, 830), (150, 815), (185, 830), (140, 850), (0, 860)], fill=P["green"])
        for x in range(20, 160, 18): d.polygon([(x, 800), (x + 7, 815), (x + 14, 800)], fill=P["white"]); d.polygon([(x, 830), (x + 7, 818), (x + 14, 830)], fill=P["white"])
        d.ellipse([20, 740, 50, 770], fill=P["yellow"]); d.ellipse([30, 748, 42, 762], fill=P["black"])
        d.rectangle([0, 880, 190, H], fill=P["teal"])
    elif i == 7:  # Strand mit Sonnenschirm
        grad(im, (180, 610, 375, 780), P["sky"], P["lteal"]); d.rectangle([180, 760, 375, 830], fill=P["teal"])
        d.rectangle([180, 830, 375, H], fill=P["tan"])
        d.pieslice([200, 760, 330, 880], 180, 360, fill=P["red"]); d.pieslice([230, 760, 300, 880], 180, 360, fill=P["white"])
        d.line([(265, 820), (265, 930)], fill=P["white"], width=7)
        palm(d, 350, 900, 230, P["dgreen"], -1)
    elif i == 8:  # Speedboot mit Gischt
        grad(im, (360, 610, W, H), P["lteal"], P["dblue"])
        d.polygon([(380, 820), (520, 760), (540, 780), (420, 860)], fill=P["white"])
        d.polygon([(400, 800), (500, 760), (510, 775), (420, 830)], fill=P["blue"])
        d.polygon([(470, 770), (490, 745), (505, 762)], fill=P["sky"])
        for k in range(5): d.line([(360 + k * 8, 840 + k * 14), (420 + k * 4, 860)], fill=P["white"], width=8)
    return im


PANELS = [
    [(0, 0), (190, 0), (170, 330), (0, 350)], [(190, 0), (370, 0), (370, 300), (170, 330)], [(370, 0), (540, 0), (540, 320), (370, 300)],
    [(0, 350), (170, 330), (180, 640), (0, 660)], [(170, 330), (370, 300), (375, 610), (180, 640)], [(370, 300), (540, 320), (540, 630), (375, 610)],
    [(0, 660), (180, 640), (185, 960), (0, 960)], [(180, 640), (375, 610), (360, 960), (185, 960)], [(375, 610), (540, 630), (540, 960), (360, 960)],
]


def design(title="MIAMI"):
    canvas = Image.new("RGB", (W, H), PAL["black"])
    for i, poly in enumerate(PANELS):
        mask = Image.new("L", (W, H)); ImageDraw.Draw(mask).polygon(poly, fill=255)
        canvas.paste(panel_art(i), (0, 0), mask)
    d = ImageDraw.Draw(canvas)
    for poly in PANELS: d.line(poly + [poly[0]], fill=PAL["black"], width=12)
    d.rectangle([0, 0, W - 1, H - 1], outline=PAL["black"], width=12)
    # Schriftzug-Banner
    d.polygon([(0, 335), (W, 305), (W, 445), (0, 475)], fill=PAL["black"])
    d.polygon([(0, 347), (W, 317), (W, 433), (0, 463)], fill=PAL["magenta"])
    font = ImageFont.truetype(FONT, 118)
    txt = Image.new("L", (W, 200)); td = ImageDraw.Draw(txt)
    bw = td.textlength(title, font=font); td.text(((W - bw) / 2, 20), title, font=font, fill=255)
    txt = txt.rotate(3.2, resample=Image.BICUBIC)
    outline = txt.filter(ImageFilter.MaxFilter(17))
    canvas.paste(Image.new("RGB", (W, 200), PAL["black"]), (0, 292), outline)
    canvas.paste(Image.new("RGB", (W, 200), PAL["yellow"]), (0, 292), txt)
    return canvas


def to_grid(img):
    a = np.asarray(img.resize((GW, GH), Image.BOX), dtype=np.float32)
    names = list(PAL); cols = np.array([PAL[n] for n in names], np.float32)
    idx = ((a[:, :, None, :] - cols[None, None]) ** 2).sum(-1).argmin(-1)
    return [[names[i] for i in row] for row in idx]


def render(grid, placed=None, px=20):
    """Mosaik mit Noppen. placed = Anzahl gesetzter Steine (von unten links, zeilenweise nach oben)."""
    N = GW * GH; placed = N if placed is None else placed
    im = Image.new("RGB", (GW * px, GH * px), (26, 22, 34)); d = ImageDraw.Draw(im)
    for r in range(GH):
        for c in range(GW):
            order = (GH - 1 - r) * GW + c
            col = np.array(PAL[grid[r][c]], float)
            if order >= placed: col = col * .16 + np.array([26, 22, 34]) * .84
            x, y = c * px, r * px
            base = tuple(int(v) for v in col)
            d.rectangle([x, y, x + px - 1, y + px - 1], fill=tuple(int(v * .78) for v in col))
            d.rectangle([x + 1, y + 1, x + px - 2, y + px - 2], fill=base)
            if order < placed:
                d.ellipse([x + 4, y + 4, x + px - 4, y + px - 4], fill=tuple(int(min(255, v * .8)) for v in col))
                d.ellipse([x + 4, y + 3, x + px - 5, y + px - 6], fill=tuple(int(min(255, v * 1.12 + 12)) for v in col))
    return im


if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    img = design(); img.save(os.path.join(out, "vorlage.png"))
    grid = to_grid(img); json.dump(grid, open(os.path.join(out, "grid.json"), "w"))
    render(grid).save(os.path.join(out, "poster_fertig.png"))
    for n in sys.argv[2:]: render(grid, int(n)).save(os.path.join(out, f"poster_{n}.png"))
    print("Steine:", GW * GH)
