"""Minimal-Glow Szenario-Renderer. Usage: python3 render.py <worker> <nworkers>"""
import cairo, numpy as np, math, json, sys, os
from PIL import Image, ImageFilter

W, H, FPS = 1080, 1920, 30
TL = json.load(open('timeline.json'))
TOTAL = TL[-1]['start'] + TL[-1]['dur'] + 0.6
GY = 1250          # ground y
MX, TX = 380, 700  # Max / Tom x
FONT = "Inter"
ACC = (1.0, 0.76, 0.32)

# ---------------------------------------------------------------- bokeh + captions
_r = np.random.default_rng(7)
BOK = [(_r.uniform(0, W), _r.uniform(0, H), _r.uniform(30, 95), _r.uniform(0.025, 0.06), _r.uniform(-12, 12), _r.uniform(-8, 8)) for _ in range(16)]
def bokeh(c, T):
    for x, y, r, a, vx, vy in BOK:
        c.arc((x + vx * T) % W, (y + vy * T) % H, r, 0, 2 * math.pi)
        c.set_source_rgba(1, 0.92, 0.8, a); c.fill()

ACCENT = ["fehlern","verrückt","zurückfallen","note","regeln","niemand","funktioniert","schnellste","scheitern","aussortiert","weitergeht","folg","onlinebusiness","nicht","ignoriert","verkäufe","warum","beigebracht","wirklich","teuer","aufhörst","erkenntnis","aufbauen","lektionen","eine","falsche","richtige"]
def _n(s): return re.sub(r"[^0-9a-zäöüß]", "", s.lower())
def build_caps():
    Wd = json.load(open('words.json')); ws = []
    for w, a, b in Wd:
        if w.startswith('.') and ws: ws[-1][0] += w.rstrip('.') if w.endswith('.') and len(w) > 4 else w; ws[-1][2] = b
        else: ws.append([w, a, b])
    starts = [s['start'] + p for s in TL for p in s['phr']]
    groups = []
    for k, st in enumerate(starts):
        en = starts[k + 1] if k + 1 < len(starts) else 1e9
        g = [w for w in ws if st - 0.15 <= w[1] < en - 0.15]
        acc = ACCENT[k] if k < len(ACCENT) else ""
        n = len(g); nch = max(1, math.ceil(n / 5)); sz = math.ceil(n / nch) if n else 1
        chunks = [g[i:i + sz] for i in range(0, n, sz)] or [g]
        for j, ch in enumerate(chunks):
            cs = st if j == 0 else ch[0][1] - 0.05
            ce = chunks[j + 1][0][1] - 0.05 if j + 1 < len(chunks) else en
            groups.append((cs, ce, ch, acc))
    return groups
import re
CAPS = build_caps()
CF = "Inter"
def captions(c, T):
    for st, en, g, acc in CAPS:
        if not (st - 0.15 <= T < en - 0.1) or not g: continue
        c.select_font_face(CF, 0, cairo.FONT_WEIGHT_BOLD)
        size = 78
        words = [w[0].upper() for w in g]
        def layout(size):
            c.set_font_size(size); sp = c.text_extents(" ").x_advance * 1.1
            lines = [[]]; lw = 0
            for i, w in enumerate(words):
                ww = c.text_extents(w).x_advance
                if lines[-1] and lw + sp + ww > 960: lines.append([]); lw = 0
                lines[-1].append(i); lw += (sp if lw else 0) + ww
            return lines, sp
        lines, sp = layout(size)
        while len(lines) > 2: size -= 6; lines, sp = layout(size)
        y0 = 330 - (len(lines) - 1) * size * 0.6
        for li, line in enumerate(lines):
            tw = sum(c.text_extents(words[i]).x_advance for i in line) + sp * (len(line) - 1)
            x = W / 2 - tw / 2; y = y0 + li * size * 1.2
            for i in line:
                w = words[i]; ww = c.text_extents(w).x_advance
                k = (T - g[i][1] + 0.06) / 0.12
                if k > 0:
                    k = min(1, k); s_ = 1 + 0.18 * (1 - eout(k))
                    c.save(); c.translate(x + ww / 2, y); c.scale(s_, s_)
                    if _n(w) == acc: c.set_source_rgba(*ACC, k)
                    else: c.set_source_rgba(1, 1, 1, k)
                    c.move_to(-ww / 2, size * 0.36); c.show_text(w); c.restore()
                x += ww + sp

def cl(x, a=0., b=1.): return max(a, min(b, x))
def ease(x): x = cl(x); return x * x * (3 - 2 * x)
def eout(x): x = cl(x); return 1 - (1 - x) ** 3
def back(x):
    x = cl(x); c = 1.9
    return 0.001 if x <= 0 else 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def ap(t, t0, d=0.35): return cl((t - t0) / d)
def lerp(a, b, x): return a + (b - a) * x

def fmt(n): return f"{int(round(n)):,}".replace(",", ".") + " €"

# ---------------------------------------------------------------- primitives
def col(c, g, a): c.set_source_rgba(g, g, g, a)

def text(c, x, y, s, size, a=1, g=1.0, bold=True, align='c', spacing=0, rgb=None):
    if a <= 0: return
    c.select_font_face(FONT, cairo.FONT_SLANT_NORMAL,
                       cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    c.set_font_size(size)
    ext = c.text_extents(s)
    w = ext.x_advance + spacing * (len(s) - 1)
    x0 = x - w / 2 if align == 'c' else (x if align == 'l' else x - w)
    if rgb: c.set_source_rgba(*rgb, a)
    else: col(c, g, a)
    if spacing:
        cx = x0
        for ch in s:
            c.move_to(cx, y + size * 0.36); c.show_text(ch)
            cx += c.text_extents(ch).x_advance + spacing
    else:
        c.move_to(x0, y + size * 0.36); c.show_text(s)
    return w

def rrect(c, x, y, w, h, r):
    c.new_sub_path()
    c.arc(x + w - r, y + r, r, -math.pi / 2, 0); c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi); c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    c.close_path()

def pill(c, x, y, s, p, size=28, g=0.86):
    """pill label popping in with progress p"""
    if p <= 0: return
    c = OV[0]
    sc = back(p); a = cl(p * 2)
    c.save(); c.translate(x, y); c.scale(sc, sc)
    c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size)
    sp = size * 0.08
    w = sum(c.text_extents(ch).x_advance for ch in s) + sp * (len(s) - 1)
    pw, ph = w + size * 1.3, size * 1.75
    rrect(c, -pw / 2, -ph / 2, pw, ph, ph / 2); col(c, g, a); c.fill()
    text(c, 0, 0, s, size, a, 0.06, spacing=sp)
    c.restore()

def figure(c, x, y, s=1., g=1., a=1., cap=False):
    if a <= 0 or s <= 0.01: return
    c.save(); c.translate(x, y); c.scale(s, s)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2)
    c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    col(c, g, a); c.fill()
    c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill()
    c.restore()

def ground(c, p, g=0.55):
    if p <= 0: return
    w = 1400 * eout(p)
    c.set_dash([14, 12]); c.set_line_width(3); col(c, g, 0.9)
    c.move_to(540 - w / 2, GY); c.line_to(540 + w / 2, GY); c.stroke(); c.set_dash([])

def stroke(c, g=1., a=1., lw=6):
    c.set_line_width(lw); c.set_line_join(cairo.LINE_JOIN_ROUND); c.set_line_cap(cairo.LINE_CAP_ROUND)
    col(c, g, a); c.stroke()

def car(c, x, y, s, p, g=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); c.scale(s * back(p), s * back(p))
    c.move_to(-110, -30); c.line_to(-110, -62); c.line_to(-70, -66); c.line_to(-40, -105)
    c.line_to(40, -105); c.line_to(72, -66); c.line_to(110, -58); c.line_to(110, -30)
    stroke(c, g, a)
    for wx in (-62, 62):
        c.arc(wx, -28, 22, 0, 2 * math.pi); stroke(c, g, a)
    c.move_to(-28, -95); c.line_to(-48, -68); c.line_to(52, -68); c.line_to(34, -95); c.close_path()
    stroke(c, g, a * 0.7, 4)
    c.restore()

def house(c, x, y, s, p, g=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); c.scale(s * back(p), s * back(p))
    c.move_to(-80, 0); c.line_to(-80, -110); c.line_to(0, -175); c.line_to(80, -110); c.line_to(80, 0); c.close_path()
    stroke(c, g, a)
    rrect(c, -22, -62, 44, 62, 6); stroke(c, g, a, 5)
    rrect(c, 34, -100, 28, 28, 4); stroke(c, g, a, 4); rrect(c, -62, -100, 28, 28, 4); stroke(c, g, a, 4)
    c.restore()

def plane(c, x, y, s, p, g=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); c.scale(s * back(p), s * back(p)); c.rotate(-0.35)
    c.move_to(-90, 0); c.curve_to(-60, -14, 60, -14, 92, 0); c.curve_to(60, 14, -60, 14, -90, 0)
    stroke(c, g, a, 5)
    c.move_to(-10, -8); c.line_to(-40, -70); c.line_to(-15, -70); c.line_to(30, -8); stroke(c, g, a, 5)
    c.move_to(-10, 8); c.line_to(-40, 70); c.line_to(-15, 70); c.line_to(30, 8); stroke(c, g, a, 5)
    c.move_to(-82, -2); c.line_to(-95, -40); c.line_to(-75, -40); c.line_to(-62, -8); stroke(c, g, a, 5)
    c.restore()

def jar(c, x, y, p, fill, t, g=1., coins_drop=0.):
    """glass container standing on ground at (x,y). fill 0..1"""
    if p <= 0: return
    a = cl(p * 2); w, h = 150, 230
    c.save(); c.translate(x, y); s = back(p); c.scale(s, s)
    if fill > 0:
        fh = (h - 16) * cl(fill)
        lg = cairo.LinearGradient(0, -fh, 0, 0); lg.add_color_stop_rgba(0, *ACC, 0.95 * a); lg.add_color_stop_rgba(1, *ACC, 0.35 * a)
        c.move_to(-w / 2 + 8, -8)
        for i in range(31):
            xx = -w / 2 + 8 + (w - 16) * i / 30
            c.line_to(xx, -8 - fh + 5 * math.sin(i * 0.6 + t * 5) * (1 if fill < 0.99 else 0.3))
        c.line_to(w / 2 - 8, -8); c.close_path(); c.set_source(lg); c.fill()
    rrect(c, -w / 2, -h, w, h, 22); stroke(c, g, a * 0.9, 5)
    c.move_to(-w / 2 + 14, -h - 12); c.line_to(w / 2 - 14, -h - 12); stroke(c, g, a * 0.9, 5)
    # falling coins
    if coins_drop > 0:
        for i in range(6):
            ph = (t * 1.6 + i / 6) % 1
            cy = -h - 120 + ph * (h + 110 - (h - 16) * fill)
            cx = math.sin(i * 2.3) * 35
            c.save(); c.translate(cx, cy); c.scale(1, 0.45 + 0.25 * math.sin(t * 9 + i))
            c.arc(0, 0, 13, 0, 2 * math.pi); col(c, 1, a * coins_drop * (1 - ph ** 6)); c.fill(); c.restore()
    c.restore()

def check_circle(c, x, y, r, p, ok=True, g=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.new_path(); c.translate(x, y); s = back(p); c.scale(s, s)
    c.arc(0, 0, r, 0, 2 * math.pi); stroke(c, g, a, 5)
    if ok:
        c.move_to(-r * .42, 0); c.line_to(-r * .1, r * .32); c.line_to(r * .45, -r * .35)
    else:
        k = r * .38; c.move_to(-k, -k); c.line_to(k, k); c.move_to(k, -k); c.line_to(-k, k)
    stroke(c, g, a, 6); c.restore()

def arrow_up(c, x, y, p, g=1.):
    if p <= 0: return
    a = cl(p * 2); dy = -30 * eout(p)
    c.move_to(x, y + dy + 40); c.line_to(x, y + dy - 30); stroke(c, g, a, 6)
    c.move_to(x - 20, y + dy - 10); c.line_to(x, y + dy - 32); c.line_to(x + 20, y + dy - 10); stroke(c, g, a, 6)

def spotlight(c, x, a):
    if a <= 0: return
    c.move_to(x - 40, 300); c.line_to(x + 40, 300); c.line_to(x + 190, GY); c.line_to(x - 190, GY); c.close_path()
    lg = cairo.LinearGradient(0, 300, 0, GY); lg.add_color_stop_rgba(0, 1, 1, 1, 0.0); lg.add_color_stop_rgba(1, 1, 1, 1, 0.10 * a)
    c.set_source(lg); c.fill()

def bubble(c, x, y, s, p):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p); c.scale(sc, sc)
    c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(34)
    w = c.text_extents(s).x_advance + 44
    rrect(c, -w / 2, -34, w, 68, 22); stroke(c, 1, a, 4)
    c.move_to(-w / 2 + 26, 34); c.line_to(-w / 2 + 10, 58); c.line_to(-w / 2 + 48, 34); stroke(c, 1, a, 4)
    text(c, 0, 0, s, 34, a); c.restore()

def chart(c, p_axes, p_line, kind, t, labels):
    """chart in box x 140..940, y 470..1060"""
    x0, x1, y0, y1 = 150, 930, 1040, 480
    if p_axes > 0:
        c.move_to(x0, y1 - 20); c.line_to(x0, y0); c.line_to(x0 + (x1 - x0 + 20) * eout(p_axes), y0); stroke(c, 0.6, p_axes, 4)
    n = 80
    def pts(fn, pr):
        k = max(2, int(n * pr))
        return [(x0 + (x1 - x0) * i / n, y0 - (y0 - y1) * fn(i / n)) for i in range(k)]
    if kind == 'lifestyle':
        inc = lambda u: 0.12 + 0.78 * u + 0.03 * math.sin(u * 20)
        exp = lambda u: inc(u) - 0.035
        for fn, prog, g, dash, lab in ((inc, p_line[0], 1.0, None, labels[0]), (exp, p_line[1], 0.55, [16, 12], labels[1])):
            if prog <= 0: continue
            P = pts(fn, eout(prog)); c.move_to(*P[0])
            for q in P[1:]: c.line_to(*q)
            if dash: c.set_dash(dash)
            stroke(c, g, 1, 6); c.set_dash([])
            ex, ey = P[-1]; c.arc(ex, ey, 11, 0, 2 * math.pi); col(c, g, 1); c.fill()
            text(c, ex - 20, ey + (-50 if fn is inc else 50), lab, 30, cl(prog * 3), g, align='r')
    else:
        r = 0.07 / 12
        def fv(u):
            m = u * 444; return 500 * ((1 + r) ** m - 1) / r / 1.1e6
        lin = lambda u: u * 222000 / 1.1e6
        pr = eout(p_line[0])
        if p_line[1] > 0:
            P = pts(lin, eout(p_line[1])); c.move_to(*P[0])
            for q in P[1:]: c.line_to(*q)
            c.set_dash([14, 12]); stroke(c, 0.5, 1, 5); c.set_dash([])
            text(c, P[-1][0] - 10, P[-1][1] + 44, labels[1], 28, cl(p_line[1] * 3), 0.55, align='r')
        if pr > 0:
            P = pts(fv, pr); c.move_to(x0, y0)
            for q in P: c.line_to(*q)
            c.line_to(P[-1][0], y0); c.close_path()
            lg = cairo.LinearGradient(0, y1, 0, y0); lg.add_color_stop_rgba(0, *ACC, 0.25); lg.add_color_stop_rgba(1, *ACC, 0.0)
            c.set_source(lg); c.fill()
            c.move_to(*P[0])
            for q in P[1:]: c.line_to(*q)
            c.set_line_width(6); c.set_source_rgb(*ACC); c.stroke()
            for i in range(1, 6):
                u = i / 6
                if u < pr: c.arc(x0 + (x1 - x0) * u, y0 - (y0 - y1) * fv(u), 8, 0, 2 * math.pi); col(c, 1, 0.9); c.fill()
            ex, ey = P[-1]; c.arc(ex, ey, 16, 0, 2 * math.pi); c.set_source_rgb(*ACC); c.fill()
            yrs = int(23 + 37 * pr)
            text(c, ex - 30, ey - 50, f"{yrs} J.", 30, 1, 1, align='r')

# ---------------------------------------------------------------- scenes (video02)
HX, OX = 380, 760   # Held (Schlaumeier) / der Andere

def hero(c, x, y=GY, s=1., g=1., capp=1.):
    figure(c, x, y, s, g)
    if capp <= 0 or s <= 0.01: return
    c.save(); c.translate(x, y - 200 * s); c.scale(s, s)
    c.move_to(-58, 0); c.line_to(0, -24); c.line_to(58, 0); c.line_to(0, 24); c.close_path(); col(c, g, capp); c.fill()
    c.rectangle(-30, 4, 60, 22); c.fill()
    c.move_to(44, 4); c.line_to(48, 40); stroke(c, g, capp, 4)
    c.restore()

def other(c, x, y=GY, s=1., a=1.):
    if a <= 0 or s <= 0.01: return
    c.save(); c.translate(x, y); c.scale(s, s)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2)
    c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    c.set_source_rgba(*ACC, a); c.fill()
    c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill(); c.restore()

def brain(c, x, y, s, p):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    for side in (-1, 1):
        c.new_path()
        for i in range(61):
            th = i / 60 * math.pi
            r = 70 * (1 + 0.09 * math.sin(th * 9))
            px = side * (6 + r * math.sin(th)); py = -r * math.cos(th) * 0.82
            (c.move_to if i == 0 else c.line_to)(px, py)
        stroke(c, 1, a, 6)
        c.move_to(side * 20, -30); c.curve_to(side * 50, -40, side * 30, 0, side * 55, 5); stroke(c, 1, a, 5)
        c.move_to(side * 18, 25); c.curve_to(side * 40, 15, side * 45, 45, side * 60, 35); stroke(c, 1, a, 5)
    c.restore()

def wallet(c, x, y, s, p, rgb=None):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc); c.rotate(0.06)
    rrect(c, -85, -60, 170, 120, 16)
    (c.set_source_rgba(*rgb, a) if rgb else col(c, 1, a)); c.set_line_width(6); c.stroke()
    rrect(c, 30, -24, 70, 48, 12); (c.set_source_rgba(*rgb, a) if rgb else col(c, 1, a)); c.stroke()
    c.arc(56, 0, 7, 0, 2 * math.pi); c.fill(); c.restore()

def card(c, x, y, w, h, p, g=1., rgb=None, lw=5):
    if p <= 0: return False
    a = cl(p * 2); c.save(); c.translate(x, y); s = back(p); c.scale(s, s)
    rrect(c, -w / 2, -h / 2, w, h, 18)
    c.set_source_rgba(0.03, 0.03, 0.035, 0.85 * a); c.fill_preserve()
    (c.set_source_rgba(*rgb, a) if rgb else col(c, g, a)); c.set_line_width(lw); c.stroke()
    return True

def bigx(c, x, y, r, p, g=1.):
    if p <= 0: return
    k = eout(p); col(c, g, 1)
    c.move_to(x - r, y - r); c.line_to(x - r + 2 * r * k, y - r + 2 * r * k); stroke(c, g, 1, 9)
    if p > 0.5:
        k2 = eout((p - 0.5) * 2); c.move_to(x + r, y - r); c.line_to(x + r - 2 * r * k2, y - r + 2 * r * k2); stroke(c, g, 1, 9)

def star(c, x, y, r, p, rgb=ACC):
    if p <= 0: return
    c.save(); c.translate(x, y); s = back(p); c.scale(s, s); c.new_path()
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45; th = -math.pi / 2 + i * math.pi / 5
        (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
    c.close_path(); c.set_source_rgba(*rgb, cl(p * 2)); c.fill(); c.restore()

def qmark(c, x, y, p, size=80, g=1.):
    if p <= 0: return
    c.save(); c.translate(x, y); s = back(p); c.scale(s, s); text(c, 0, 0, "?", size, cl(p * 2), g); c.restore()

def fog(c, x, y, a, T):
    if a <= 0: return
    for i in range(9):
        px = x + math.sin(i * 1.7 + T * 0.4) * 140; py = y + math.cos(i * 2.3 + T * 0.3) * 70
        rg = cairo.RadialGradient(px, py, 0, px, py, 130)
        rg.add_color_stop_rgba(0, 1, 1, 1, 0.07 * a); rg.add_color_stop_rgba(1, 1, 1, 1, 0)
        c.set_source(rg); c.arc(px, py, 130, 0, 2 * math.pi); c.fill()

def clock(c, x, y, r, T, a=1.):
    c.new_path(); c.arc(x, y, r, 0, 2 * math.pi); stroke(c, 1, a, 5)
    th = T * 3; c.move_to(x, y); c.line_to(x + r * 0.7 * math.sin(th), y - r * 0.7 * math.cos(th)); stroke(c, 1, a, 5)
    th = T * 0.25; c.move_to(x, y); c.line_to(x + r * 0.45 * math.sin(th), y - r * 0.45 * math.cos(th)); stroke(c, 1, a, 5)

RED = (1.0, 0.36, 0.36)

def richard(c, x, y=GY, s=1., g=1.):
    figure(c, x, y, s, g)
    if s <= 0.01: return
    c = OV[0]
    c.save(); c.translate(x, y); c.scale(s, s)
    c.move_to(-8, -112); c.line_to(8, -112); c.line_to(12, -40); c.line_to(0, -26); c.line_to(-12, -40); c.close_path()
    c.set_source_rgba(*ACC, 1 if g > 0.5 else 0.5); c.fill(); c.restore()

def columns_building(c, x, y, s, p, rgb=None, label=None):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    setc = (lambda: c.set_source_rgba(*rgb, a)) if rgb else (lambda: col(c, 1, a))
    c.move_to(-120, -170); c.line_to(0, -240); c.line_to(120, -170); c.close_path(); setc(); c.set_line_width(5); c.stroke()
    for i in range(5):
        xx = -96 + i * 48; c.move_to(xx, -150); c.line_to(xx, -30); setc(); c.set_line_width(7); c.stroke()
    c.rectangle(-130, -30, 260, 30); setc(); c.set_line_width(5); c.stroke()
    c.rectangle(-120, -170, 240, 20); c.stroke()
    if label: text(c, 0, -195, label, 22, a, rgb=rgb) if rgb else text(c, 0, -195, label, 22, a)
    c.restore()

def tower(c, x, y, p):
    if p <= 0: return
    h = 620 * eout(p); c.rectangle(x - 110, y - h, 220, h); stroke(c, 0.5, 1, 4)
    for r in range(int(h // 60)):
        for k in range(3):
            c.rectangle(x - 80 + k * 60, y - 50 - r * 60, 36, 30); col(c, 0.5, 0.35); c.fill()

def heart(c, x, y, s, a):
    if a <= 0: return
    c.save(); c.translate(x, y); c.scale(s, s); c.new_path()
    c.move_to(0, 12); c.curve_to(-30, -8, -18, -34, 0, -18); c.curve_to(18, -34, 30, -8, 0, 12)
    c.set_source_rgba(*RED, a); c.set_line_width(4); c.stroke(); c.restore()

def halo(c, x, y, a, g=1.):
    if a <= 0: return
    c.save(); c.translate(x, y); c.scale(1, 0.3); c.new_path(); c.arc(0, 0, 50, 0, 2 * math.pi); c.restore()
    c.set_source_rgba(*ACC, a); c.set_line_width(5); c.stroke()

def share_grid(c, x, y, cols, rows, p, cell=34, gap=8):
    n = int(cols * rows * cl(p)); w = cols * (cell + gap)
    for i in range(n):
        r, k = divmod(i, cols)
        c.rectangle(x - w / 2 + k * (cell + gap), y - r * (cell + gap), cell, cell)
        c.set_source_rgba(*ACC, 0.55 + 0.45 * ((i * 7) % 5) / 4); c.fill()

def bill(c, x, y, rot, a):
    c.save(); c.translate(x, y); c.rotate(rot)
    rrect(c, -46, -22, 92, 44, 6); c.set_source_rgba(*ACC, a); c.set_line_width(4); c.stroke()
    text(c, 0, 0, "$", 26, a, rgb=ACC); c.restore()

def stamp(c, x, y, s, p, rgb=RED):
    if p <= 0: return
    c.save(); c.translate(x, y); c.rotate(-0.18); k = 1 + 1.5 * (1 - eout(p)); c.scale(k, k)
    a = cl(p * 2); c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(70)
    w = c.text_extents(s).x_advance + 50
    rrect(c, -w / 2, -55, w, 110, 14); c.set_source_rgba(*rgb, a); c.set_line_width(7); c.stroke()
    text(c, 0, 0, s, 70, a, rgb=rgb); c.restore()

def follow_btn(c, x, y, p, pressed):
    if p <= 0: return
    c.save(); c.translate(x, y); s = back(p) * (0.92 if pressed else 1); c.scale(s, s)
    rrect(c, -190, -50, 380, 100, 50)
    if pressed: c.set_source_rgba(*ACC, 1); c.fill(); text(c, 0, 0, "✓ GEFOLGT", 40, 1, 0.05)
    else: c.set_source_rgba(*ACC, 1); c.set_line_width(6); c.stroke(); text(c, 0, 0, "FOLGEN", 40, 1, rgb=ACC)
    c.restore()

def testsheet(c, x, y, p, nx, grade=None):
    if not card(c, x, y, 300, 400, p): return
    text(c, -60, -160, "TEST", 26, 1, 0.6)
    for i in range(6):
        c.move_to(-110, -100 + i * 50); c.line_to(40, -100 + i * 50); stroke(c, 0.45, 1, 5)
        if i < nx:
            k = 18; xx, yy = 90, -100 + i * 50
            c.move_to(xx - k, yy - k); c.line_to(xx + k, yy + k); c.move_to(xx + k, yy - k); c.line_to(xx - k, yy + k)
            c.set_source_rgba(*RED, 1); c.set_line_width(5); c.stroke()
    if grade:
        c.new_path(); c.arc(95, -165, 30, 0, 2 * math.pi); c.set_source_rgba(*RED, 1); c.set_line_width(4); c.stroke()
        text(c, 95, -165, grade, 32, 1, rgb=RED)
    c.restore()

def globe(c, x, y, r, p, rgb=None):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); s = back(p); c.scale(s, s)
    setc = (lambda: c.set_source_rgba(*rgb, a)) if rgb else (lambda: col(c, 1, a))
    c.new_path(); c.arc(0, 0, r, 0, 2 * math.pi); setc(); c.set_line_width(5); c.stroke()
    c.save(); c.scale(0.45, 1); c.new_path(); c.arc(0, 0, r, 0, 2 * math.pi); c.restore(); setc(); c.set_line_width(4); c.stroke()
    for yy in (-r * 0.5, 0, r * 0.5):
        w = math.sqrt(max(0, r * r - yy * yy)); c.move_to(-w, yy); c.line_to(w, yy)
    setc(); c.stroke(); c.restore()

def schoolhouse(c, x, y, s, p, g=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    c.move_to(-110, 0); c.line_to(-110, -120); c.line_to(0, -190); c.line_to(110, -120); c.line_to(110, 0); c.close_path(); stroke(c, g, a, 5)
    rrect(c, -22, -70, 44, 70, 6); stroke(c, g, a, 5)
    for xx in (-75, 45): c.rectangle(xx, -100, 30, 30); stroke(c, g, a, 4)
    c.move_to(0, -190); c.line_to(0, -250); stroke(c, g, a, 4); c.move_to(0, -250); c.line_to(40, -238); c.line_to(0, -226); c.close_path(); col(c, g, a); c.fill()
    c.restore()

def productbox(c, x, y, p, label, rgb=None, crossed=0., sub=None):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); s = back(p); c.scale(s, s)
    setc = (lambda al=a: c.set_source_rgba(*rgb, al)) if rgb else (lambda al=a: col(c, 1 if crossed < 0.5 else 0.5, al))
    rrect(c, -80, -80, 160, 160, 16); setc(); c.set_line_width(5); c.stroke()
    c.move_to(-30, -15); c.line_to(0, -32); c.line_to(30, -15); c.line_to(30, 22); c.line_to(0, 38); c.line_to(-30, 22); c.close_path()
    c.move_to(-30, -15); c.line_to(0, 2); c.line_to(30, -15); c.move_to(0, 2); c.line_to(0, 38); setc(); c.set_line_width(4); c.stroke()
    text(c, 0, 115, label, 24, a, 0.8, rgb=rgb)
    if sub: text(c, 0, 150, sub, 22, a, 0.55, rgb=rgb)
    c.restore()
    if crossed > 0: bigx(c, x, y, 70, crossed, 0.9)

def bulb(c, x, y, s, p, glow=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    c.new_path(); c.arc(0, -10, 34, math.pi * 0.8, math.pi * 2.2); c.line_to(14, 30); c.line_to(-14, 30); c.close_path()
    c.set_source_rgba(*ACC, a * glow); c.fill_preserve(); c.set_source_rgba(*ACC, a); c.set_line_width(4); c.stroke()
    for yy in (38, 48): c.move_to(-12, yy); c.line_to(12, yy)
    col(c, 0.8, a); c.set_line_width(4); c.stroke(); c.restore()

def funnel(c, x, y, p):
    if p <= 0: return
    a = cl(p * 2)
    c.move_to(x - 200, y - 200); c.line_to(x - 30, y); c.line_to(x - 30, y + 60)
    c.move_to(x + 200, y - 200); c.line_to(x + 30, y); c.line_to(x + 30, y + 60); stroke(c, 1, a, 6)

def bin_(c, x, y, a, n):
    c.move_to(x - 80, y - 100); c.line_to(x - 70, y); c.line_to(x + 70, y); c.line_to(x + 80, y - 100); stroke(c, 0.7, a, 5)
    for i in range(n):
        r_, k = divmod(i, 5); c.new_path(); c.arc(x - 52 + k * 26, y - 16 - r_ * 26, 11, 0, 2 * math.pi); col(c, 0.6, a); c.fill()

def pricetag(c, x, y, s, p, label, rgb=ACC, dark=True):
    if p <= 0: return
    c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc); a = cl(p * 2)
    c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(30); w = c.text_extents(label).x_advance + 70
    c.move_to(-w / 2 + 30, -36); c.line_to(w / 2, -36); c.line_to(w / 2, 36); c.line_to(-w / 2 + 30, 36); c.line_to(-w / 2, 0); c.close_path()
    c.set_source_rgba(*rgb, a); c.set_line_width(4); c.stroke()
    c.new_path(); c.arc(-w / 2 + 26, 0, 6, 0, 2 * math.pi); c.set_source_rgba(*rgb, a); c.fill()
    text(c, 15, 0, label, 30, a, rgb=rgb); c.restore()

def arrow_r(c, x0, x1, y, p, g=0.7):
    if p <= 0: return
    xe = lerp(x0, x1, eout(p)); c.move_to(x0, y); c.line_to(xe, y); stroke(c, g, 1, 4)
    c.move_to(xe - 12, y - 10); c.line_to(xe, y); c.line_to(xe - 12, y + 10); stroke(c, g, 1, 4)

def cta(c, t, P):
    ground(c, 1)
    figure(c, 540, GY, 0.85)
    k = ap(t, P[1] - 0.1, 0.35)
    if k > 0:  # like heart
        c.save(); c.translate(380, 700); s_ = back(k) * (1 + 0.12 * math.sin(max(0, t - P[1]) * 10) * (1 - ap(t, P[1] + 0.8, 0.3))); c.scale(s_ * 2.6, s_ * 2.6)
        c.new_path(); c.move_to(0, 14); c.curve_to(-34, -8, -20, -38, 0, -20); c.curve_to(20, -38, 34, -8, 0, 14)
        c.set_source_rgba(*ACC, cl(k * 2)); c.fill(); c.restore()
        text(c, 380, 820, "LIKE", 30, cl(k * 2), rgb=ACC, spacing=3)
    follow_btn(c, 720, 720, ap(t, P[1] + 0.6, 0.35), t > P[1] + 1.9)
    k2 = ap(t, P[1] + 1.2, 0.6)
    if k2 > 0:
        px, py = lerp(900, 760, eout(k2)), lerp(960, 740, eout(k2))
        c.new_path(); c.move_to(px, py); c.line_to(px, py + 56); c.line_to(px + 14, py + 42); c.line_to(px + 34, py + 48); c.close_path()
        col(c, 1, 1); c.fill()
    pill(c, 540, 560, "KURZE PAUSE", ap(t, 0.3, 0.3), 26)

CAM = [(540, 940, 1.1, 1.0), (540, 940, 1.0, 1.04), (540, 940, 1.0, 1.04), (540, 920, 1.0, 1.05),
       (540, 900, 1.0, 1.04), (540, 960, 1.0, 1.08), (540, 920, 1.0, 1.03), (540, 920, 1.0, 1.04), (540, 900, 1.0, 1.05),
       (540, 980, 1.05, 1.12), (540, 960, 1.0, 1.03), (540, 940, 1.0, 1.04), (540, 900, 0.95, 1.0)]

def camera(T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; u = t / s['dur']
    cx, cy, z0, z1 = CAM[si]
    z = lerp(z0, z1, ease(u) * 0.6 + u * 0.4)
    if si > 0:
        px, py, pz0, pz1 = CAM[si - 1]
        k = ease(t / 0.55)
        cx, cy, z = lerp(px, cx, k), lerp(py, cy, k), lerp(pz1, z, k)
    return cx, cy - 70, z * 1.22

def scene_at(T):
    for i, s in enumerate(TL):
        if T < s['start'] + s['dur']: return i
    return len(TL) - 1

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    if si == 5: cta(c, t, P); return
    if si > 5: si -= 1
    if si in (1, 2, 8, 9, 10): ground(c, 1)
    if si == 0:
        nx = int(cl(t / 0.25, 0, 6))
        testsheet(c, 330, 800, ap(t, 0, 0.35), nx)
        pill(c, 330, 1040, "MEISTE FEHLER", ap(t, 1.0, 0.3), 26)
        k = ap(t, 1.6, 0.4)
        if k > 0:
            text(c, 760, 640, fmt(1238239 * eout(ap(t, 1.6, P[1] - 1.4))), 56, cl(k * 2), rgb=ACC)
            c.new_path()
            for i in range(41):
                u = i / 40 * eout(ap(t, 1.6, 1.5)); xx = lerp(600, 920, u); yy = 900 - 200 * u ** 2.2
                (c.move_to if i == 0 else c.line_to)(xx, yy)
            c.set_source_rgba(*ACC, 1); c.set_line_width(6); c.stroke()
        pill(c, 760, 1040, "MEISTES GELD", ap(t, 2.4, 0.3), 26)
        qmark(c, 540, 470, ap(t, P[1], 0.3), 80)
    elif si == 1:
        xs = [180, 360, 540, 720, 900]
        back_ = ap(t, 1.0, 0.8)
        for i, x in enumerate(xs):
            if i == 2:
                figure(c, x, GY + 140 * eout(back_), 0.8, lerp(1, 0.55, back_))
            else: figure(c, x, GY, 0.8, 0.85)
        pill(c, 540, 640, "DIE MEISTEN GLAUBEN", ap(t, 0.1, 0.3) * (1 - ap(t, P[1], 0.2)), 24, 0.6)
        pill(c, 540, GY + 250, "ZURÜCKGEFALLEN", ap(t, 1.4, 0.3), 24)
        k = ap(t, P[1], 0.4)
        if k > 0:
            c.rectangle(-300, 400, 1680, 700); c.set_source_rgba(0.035, 0.035, 0.04, 0.9 * k); c.fill()
            schoolhouse(c, 300, 1000, 1.0, k)
            grades = ["1", "2", "3", "4", "5"]
            gi = min(4, int(max(0, t - P[1] - 0.4) / 0.55))
            testsheet(c, 760, 800, k, gi + 1, grades[gi])
            pill(c, 540, 1080, "JEDER FEHLER = SCHLECHTERE NOTE", ap(t, P[1] + 1.0, 0.3), 22)
    elif si == 2:
        schoolhouse(c, 250, GY, 0.8, 1, 0.4)
        text(c, 250, GY + 60, "SCHULE", 24, 1, 0.4)
        c.set_dash([10, 10]); c.move_to(440, 520); c.line_to(440, GY); stroke(c, 0.5, ap(t, 0.2, 0.4), 3); c.set_dash([])
        globe(c, 760, 700, 90, ap(t, 0.4, 0.4), ACC)
        text(c, 760, 840, "ECHTE WELT", 30, ap(t, 0.5, 0.3), rgb=ACC)
        figure(c, 760, GY, 0.8)
        for i in range(7):
            k = ap(t, P[1] + 0.1 * i, 0.3) * (1 - ap(t, P[1] + 1.6, 0.6))
            ang = i / 7 * 2 * math.pi + t * 0.5; xx = 760 + 190 * math.cos(ang); yy = GY - 120 + 120 * math.sin(ang)
            if k > 0:
                c.move_to(xx - 14, yy - 14); c.line_to(xx + 14, yy + 14); c.move_to(xx + 14, yy - 14); c.line_to(xx - 14, yy + 14)
                c.set_source_rgba(*RED, k); c.set_line_width(5); c.stroke()
        pill(c, 760, 560, "NIEMAND ZÄHLT MIT", ap(t, P[1] + 1.2, 0.3), 26)
    elif si == 3:
        for i in range(6):
            k = ap(t, 0.1 * i, 0.3)
            x = 240 + i * 120; c.new_path(); c.arc(x, 720, 12, 0, 2 * math.pi)
            if i == 5: c.set_source_rgba(*ACC, k)
            else: col(c, 0.45, k)
            c.fill()
        check_circle(c, 840, 620, 40, ap(t, 0.9, 0.35), True)
        pill(c, 540, 560, "NUR DAS ERGEBNIS ZÄHLT", ap(t, 0.5, 0.3), 26)
        funnel(c, 540, 1080, ap(t, P[1], 0.4))
        pill(c, 540, 850, "SCHNELLSTER WEG", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 4:
        funnel(c, 540, 900, 1)
        pill(c, 540, 600, "SCHNELLSTER WEG", 1, 26)
        n = int(cl((t - 0.2) / 0.45, 0, 99)); bad = 0
        for i in range(n + 1):
            tt = 0.2 + i * 0.45; k = ap(t, tt, 0.6)
            if k <= 0 or k >= 1 and i < n: continue
            good = (tt > P[1] + 1.2)
            if good and i < n: continue
            yy = lerp(640, 920, eout(k)); xx = 540 + (0 if good else lerp(0, 260, ap(t, tt + 0.4, 0.3)))
            c.new_path(); c.arc(xx, yy, 16, 0, 2 * math.pi)
            if good: c.set_source_rgba(*ACC, 1)
            else: col(c, 0.85, 1 - ap(t, tt + 0.6, 0.1))
            c.fill()
        nb = min(n, sum(1 for i in range(n) if 0.2 + i * 0.45 + 0.7 < t and 0.2 + i * 0.45 <= P[1] + 1.2))
        bin_(c, 820, 1120, 1, nb)
        pill(c, 820, 1170, "AUSSORTIERT", ap(t, 0.8, 0.3), 22, 0.6)
        if t > P[1] + 1.6:
            check_circle(c, 540, 1060, 40, ap(t, P[1] + 1.8, 0.35), True)
            pill(c, 540, 1140, "FUNKTIONIERT", ap(t, P[1] + 2.0, 0.3), 26)
    elif si == 5:
        k = ap(t, 0, 0.4)
        if card(c, 540, 600, 420, 220, k * (1 - ap(t, P[1] - 0.4, 0.3))):
            c.rectangle(-210, -110, 420, 36); col(c, 0.2, 1); c.fill()
            text(c, 0, 20, "ONLINE-BUSINESS", 34, 1); c.restore()
        figure(c, 540, GY, 0.8 * back(ap(t, 0.2, 0.4)))
        productbox(c, 300, 800, ap(t, P[1], 0.35), "PRODUKT 1", crossed=ap(t, P[1] + 1.0, 0.5), sub="0 VERKÄUFE")
        productbox(c, 780, 800, ap(t, P[2], 0.35), "PRODUKT 2", crossed=ap(t, P[2] + 0.8, 0.5), sub="IGNORIERT")
    elif si == 6:
        productbox(c, 250, 800, 1, "PRODUKT 1", crossed=1)
        productbox(c, 540, 800, 1, "PRODUKT 2", crossed=1)
        productbox(c, 830, 800, ap(t, 0, 0.35), "PRODUKT 3", ACC, sub="3 VERKÄUFE")
        for i in range(3):
            k = ap(t, 0.8 + i * 0.4, 0.4)
            if k > 0:
                c.new_path(); c.arc(790 + i * 40, 680 - 30 * eout(k), 18, 0, 2 * math.pi); c.set_source_rgba(*ACC, 1); c.fill()
                text(c, 790 + i * 40, 680 - 30 * eout(k), "€", 20, 1, 0.05)
        qmark(c, 930, 640, ap(t, P[1], 0.3), 60, 0.8)
        figure(c, 540, GY, 0.8)
    elif si == 7:
        for i, (x, lab) in enumerate(((240, "VERSUCH 1"), (540, "VERSUCH 2"), (840, "VERSUCH 3"))):
            productbox(c, x, 620, 1, lab, ACC if i == 2 else None, crossed=1 if i < 2 else 0)
            k = ap(t, 0.4 + 0.3 * i, 0.6)
            if k > 0:
                c.move_to(x, 760); c.line_to(lerp(x, 540, eout(k)), lerp(760, 900, eout(k))); c.set_dash([8, 8]); stroke(c, 0.6, 1, 3); c.set_dash([])
        bulb(c, 540, 960, 1.6, ap(t, 1.3, 0.4), glow=lerp(0.2, 1, ap(t, P[1], 0.5)))
        pill(c, 540, 1100, "WAS DIE LEUTE WOLLEN", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 8:
        k = ap(t, 0, d)
        stop = ap(t, P[1], 0.3)
        fx = lerp(200, 520, ease(min(1, t / max(0.1, P[1]))))
        figure(c, fx, GY, 0.8, lerp(1, 0.6, stop))
        for i in range(8):
            c.new_path(); c.arc(fx + 120 + i * 60, GY - 10, 5, 0, 2 * math.pi); col(c, 0.5, 1 - stop); c.fill()
        pricetag(c, 760, 760, 1.3, ap(t, P[1] + 0.2, 0.35), "TEUER", RED)
        pill(c, 540, 600, "SCHEITERN IST NUR TEUER…", ap(t, 0.2, 0.3), 24, 0.6)
        pill(c, 640, 880, "…WENN DU AUFHÖRST", ap(t, P[1] + 0.5, 0.3), 26)
    elif si == 9:
        # staircase of insights
        x0, y0 = 160, GY
        for i in range(6):
            c.move_to(x0 + i * 100, y0 - i * 70); c.line_to(x0 + (i + 1) * 100, y0 - i * 70); c.line_to(x0 + (i + 1) * 100, y0 - (i + 1) * 70)
        c.line_to(x0 + 6 * 100, y0); stroke(c, 0.6, 1 - ap(t, P[1], 0.4), 4)
        st = 6 * ap(t, 0.3, P[1] - 0.5)
        if t < P[1] + 0.3:
            fx, fy = x0 + st * 100 + 50, y0 - math.floor(st) * 70
            figure(c, fx, fy, 0.6, a=1 - ap(t, P[1], 0.3))
            for i in range(int(st)):
                bulb(c, x0 + i * 100 + 50, y0 - i * 70 - 200, 0.7, 1 - ap(t, P[1], 0.3))
        pill(c, 540, 560, "WEITERMACHEN", ap(t, 0.2, 0.3) * (1 - ap(t, P[1], 0.3)), 26)
        k = ap(t, P[1] + 0.2, 0.4)
        if k > 0:
            figure(c, 300, GY, 0.8 * back(k), 0.7); figure(c, 780, GY, 0.8 * back(k))
            for i in range(2):
                c.save(); c.translate(250 + i * 90, 760 + 30 * math.sin(T * 5 + i)); c.rotate(T * 2 + i); rrect(c, -26, -26, 52, 52, 8); stroke(c, 0.7, k, 4)
                c.new_path(); c.arc(0, 0, 5, 0, 2 * math.pi); col(c, 0.7, k); c.fill(); c.restore()
            nb = int(6 * ap(t, P[1] + 0.6, 2.0))
            for i in range(nb):
                c.rectangle(850, GY - 40 - i * 44, 100, 38); c.set_source_rgba(*ACC, 0.9); c.set_line_width(4); c.stroke()
            pill(c, 300, 1050, "RATEN", ap(t, P[1] + 0.5, 0.3), 26, 0.6)
            pill(c, 780, 1050, "AUFBAUEN", ap(t, P[1] + 0.7, 0.3), 26)
    elif si == 10:
        for i in range(10):
            r_, k_ = divmod(i, 5); x = 300 + k_ * 120; y = 620 + r_ * 130
            conv = ap(t, 0.8 + i * 0.12, 0.3)
            if conv < 1:
                c.new_path(); c.arc(x, y, 36, 0, 2 * math.pi); col(c, 0.7, ap(t, 0.05 * i, 0.3) * (1 - conv)); c.set_line_width(4); c.stroke()
                c.move_to(x - 13, y - 13); c.line_to(x + 13, y + 13); c.move_to(x + 13, y - 13); c.line_to(x - 13, y + 13); c.stroke()
            bulb(c, x, y, 0.8, conv)
        pill(c, 540, 500, "10 × GESCHEITERT = 10 LEKTIONEN", ap(t, 1.4, 0.3), 24)
        figure(c, 300, GY, 0.8)
        k = ap(t, P[1], 0.4)
        figure(c, 780, GY, 0.8 * back(k), 0.7)
        if card(c, 780, GY - 330, 220, 110, k):
            text(c, 0, -22, "BILANZ", 20, 1, 0.6); text(c, 0, 20, "100 %", 40, 1); c.restore()
        pill(c, 780, GY + 60, "0 LEKTIONEN", ap(t, P[1] + 0.8, 0.3), 24, 0.6)
    elif si == 11:
        y1, y2 = 640, 900
        schoolhouse(c, 190, y1 + 60, 0.5, ap(t, 0, 0.3), 0.7)
        arrow_r(c, 260, 360, y1, ap(t, 0.3, 0.3))
        check_circle(c, 420, y1, 36, ap(t, 0.5, 0.3), False, 0.8)
        arrow_r(c, 470, 560, y1, ap(t, 0.7, 0.3))
        pricetag(c, 680, y1, 1.0, ap(t, 0.9, 0.35), "PREIS", (0.8, 0.8, 0.8))
        arrow_r(c, 790, 860, y1, ap(t, 1.3, 0.3))
        k = ap(t, 1.5, 0.3)
        if k > 0: text(c, 920, y1, "6", 56, k, rgb=RED)
        text(c, 540, y1 + 110, "FALSCHE ANTWORT", 22, ap(t, 1.6, 0.3), 0.5, spacing=2)
        globe(c, 190, y2, 50, ap(t, P[1], 0.3), ACC)
        arrow_r(c, 260, 360, y2, ap(t, P[1] + 0.3, 0.3))
        check_circle(c, 420, y2, 36, ap(t, P[1] + 0.5, 0.3), False, 0.8)
        arrow_r(c, 470, 560, y2, ap(t, P[1] + 0.7, 0.3))
        pricetag(c, 680, y2, 1.0, ap(t, P[1] + 0.9, 0.35), "PREIS", ACC)
        arrow_r(c, 790, 860, y2, ap(t, P[1] + 1.3, 0.3))
        k = ap(t, P[1] + 1.5, 0.35)
        if k > 0:
            c.new_path(); c.arc(920, y2, 40, 0, 2 * math.pi); c.set_source_rgba(*ACC, k); c.fill()
            c.move_to(902, y2); c.line_to(915, y2 + 14); c.line_to(940, y2 - 14); stroke(c, 0.05, k, 6)
        text(c, 540, y2 + 110, "RICHTIGE ANTWORT", 22, ap(t, P[1] + 1.6, 0.3), rgb=ACC, spacing=2)


# ---------------------------------------------------------------- post
OV = [None]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = np.clip(1.15 - 0.85 * (((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.48) / (H * 0.62)) ** 2), 0.25, 1)[..., None]
rng = np.random.default_rng(1)
GRAIN = [rng.normal(0, 4.5, (H // 2, W // 2, 1)).astype(np.float32) for _ in range(6)]

def render(T):
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H)
    c = cairo.Context(surf); c.set_source_rgb(0.035, 0.035, 0.04); c.paint()
    ov = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); OV[0] = cairo.Context(ov)
    draw(c, T)
    OV[0].identity_matrix(); captions(OV[0], T)
    o = np.ndarray((H, W, 4), np.uint8, ov.get_data()).astype(np.float32)
    oa = o[..., 3:4] / 255.; orgb = o[..., :3][..., ::-1]
    a = np.ndarray((H, W, 4), np.uint8, surf.get_data())[..., :3][..., ::-1].astype(np.float32)
    im = Image.fromarray(a.astype(np.uint8)).resize((W // 4, H // 4), Image.BILINEAR)
    g1 = np.asarray(im.filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.BILINEAR), np.float32)
    g2 = np.asarray(im.resize((W // 16, H // 16), Image.BILINEAR).filter(ImageFilter.GaussianBlur(5)).resize((W, H), Image.BILINEAR), np.float32)
    out = a + g1 * 0.9 + g2 * 1.2
    out = out * VIG
    og = np.asarray(Image.fromarray(orgb.astype(np.uint8)).resize((W // 8, H // 8), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4)).resize((W, H), Image.BILINEAR), np.float32)
    out = out * (1 - oa) + orgb * VIG + og * 0.35
    gr = GRAIN[int(T * FPS) % 6]; out = out + np.repeat(np.repeat(gr, 2, 0), 2, 1)
    # fade in/out
    out *= cl(T / 0.15) * cl((TOTAL - T) / 0.5)
    return np.clip(out, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    if sys.argv[1] == 'still':
        for T in map(float, sys.argv[2:]):
            Image.fromarray(render(T)).save(f'still_{T:05.1f}.png')
        sys.exit()
    wi, nw = int(sys.argv[1]), int(sys.argv[2])
    N = int(TOTAL * FPS); os.makedirs('frames', exist_ok=True)
    for f in range(wi, N, nw):
        p = f'frames/{f:05d}.jpg'
        if not os.path.exists(p): Image.fromarray(render(f / FPS)).save(p, quality=93)
