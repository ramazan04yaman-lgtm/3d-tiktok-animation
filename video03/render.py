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

ACCENT = ["dollar","nein","konzern","millionen","schlau","hälfte","weg","weg","dollar","dollar","lieben","helden","ehrlich","umsonst","aktien","millionen","trick","wachsen","nie","keinen","geld","leben","bank","kredit","null","bescheiden","folg"]
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

CAM = [(540, 960, 1.12, 1.0), (540, 940, 1.0, 1.04), (540, 940, 1.0, 1.04), (560, 920, 1.04, 1.1),
       (540, 940, 1.0, 1.05), (540, 960, 1.0, 1.04), (540, 980, 1.08, 1.14), (540, 940, 1.0, 1.04),
       (560, 920, 1.0, 1.05), (560, 940, 1.0, 1.04), (540, 960, 1.0, 1.04), (560, 940, 1.0, 1.05),
       (540, 960, 1.0, 1.1)]

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

CROWD = [140, 260, 820, 940]

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    ground(c, ap(T, 0, 0.5))
    RX = 540
    if si == 0:
        for i in range(9):
            ph = (T * 0.35 + i / 9) % 1
            x = 180 + i * 90 + math.sin(i * 3) * 20; y = 380 + ph * 900
            c.save(); c.translate(x, y); c.scale(math.cos(T * 4 + i), 1); c.new_path(); c.arc(0, 0, 18, 0, 2 * math.pi)
            c.set_source_rgba(*ACC, 0.7 * (1 - ph)); c.set_line_width(4); c.stroke(); c.restore()
        richard(c, RX, GY, back(ap(t, 0, 0.4)))
        pill(c, RX, 560, "CEO-GEHALT", ap(t, 0.1, 0.3), 26)
        k = ap(t, 0.2, 0.35)
        if k > 0:
            c.save(); c.translate(RX, 700); c.scale(back(k), back(k)); text(c, 0, 0, "1 $", 150, cl(k * 2), rgb=ACC); c.restore()
        pill(c, RX, 830, "PRO JAHR", ap(t, 0.5, 0.3), 24, 0.6)
        pill(c, 300, GY - 300, "ZUCKERBERG", ap(t, 1.4, 0.3), 22, 0.6)
        pill(c, RX, GY + 70, "BESCHEIDEN?", ap(t, P[1], 0.3), 26)
        check_circle(c, RX + 190, GY + 70, 30, ap(t, P[1] + 1.0, 0.3), False)
    elif si == 1:
        tower(c, 820, GY, ap(t, 0, 0.8))
        pill(c, 820, GY - 660, "KONZERN", ap(t, 0.6, 0.3), 24, 0.6)
        richard(c, RX)
        pill(c, RX, GY + 70, "RICHARD", ap(t, 0.1, 0.3), 26)
        for i, x in enumerate([150, 260, 370]):
            figure(c, x - 40, GY, 0.75 * back(ap(t, P[1] + 0.1 * i, 0.4)), 0.4)
        pill(c, 220, GY + 60, "VORSTAND", ap(t, P[1] + 0.3, 0.3), 22, 0.5)
        if card(c, RX, 640, 560, 190, ap(t, P[1] + 0.3, 0.35)):
            text(c, 0, -50, "GEHALTSANGEBOT", 24, 1, 0.6)
            text(c, 0, 25, fmt(1e7 * eout(ap(t, P[1] + 0.5, 1.0))).replace("€", "$"), 66, 1, rgb=ACC); c.restore()
    elif si == 2:
        richard(c, 300)
        k = ap(t, 0.2, 0.4)
        if k > 0:
            text(c, 350, 600, "NORMALES GEHALT", 24, k, 0.6)
            sp = eout(ap(t, P[1] + 0.3, 0.8))
            c.rectangle(160, 640, 180, 90); c.set_source_rgba(*ACC, k); c.set_line_width(6); c.stroke()
            c.rectangle(350 + sp * 340, 640 + sp * 260, 180, 90); c.set_source_rgba(*(RED if sp > 0.3 else ACC), k); c.stroke()
        columns_building(c, 790, GY, 1.0, ap(t, P[1], 0.4), RED, "STAAT")
        pill(c, 790, 860, "≈ 50 % STEUERN", ap(t, P[1] + 0.9, 0.3), 26)
    elif si == 3:
        richard(c, 300, g=0.8)
        columns_building(c, 790, GY, 1.0, 1, RED, "STAAT")
        text(c, 540, 680, "−" + fmt(4.9e6 * eout(ap(t, 0.1, P[1]))).replace("€", "$"), 90, ap(t, 0.1, 0.2), rgb=RED)
        pill(c, 540, 800, "WEG", ap(t, P[1], 0.3), 32)
        pill(c, 380, 880, "ER BEHÄLT 5,1 MIO $", ap(t, P[1] + 0.5, 0.3), 22, 0.6)
    elif si == 4:
        richard(c, RX)
        if card(c, RX, 640, 560, 190, 1):
            text(c, 0, -50, "GEHALTSANGEBOT", 24, 1, 0.6); text(c, 0, 25, "10.000.000 $", 66, 1, rgb=ACC); c.restore()
        stamp(c, RX, 650, "NEIN", ap(t, 0.3, 0.3))
        k = ap(t, P[1] + 0.2, 0.35)
        if k > 0:
            bubble(c, RX + 120, GY - 330, "NUR 1 $", k)
    elif si == 5:
        for i, x in enumerate(CROWD):
            figure(c, x, GY, 0.8 * back(ap(t, 0.1 * i, 0.35)), 0.45)
        richard(c, RX)
        for i in range(10):
            ph = (t * 0.6 + i / 10) % 1
            heart(c, RX + math.sin(i * 2.1) * 260, GY - 200 - ph * 500, 1.2, ap(t, 0.2 + i * 0.05, 0.2) * (1 - ph))
        if card(c, RX, 560, 640, 160, ap(t, 0.1, 0.35)):
            text(c, 0, -45, "SCHLAGZEILE", 22, 1, 0.6); text(c, 0, 20, "CEO VERZICHTET AUF GEHALT", 36, 1); c.restore()
        pill(c, RX, 720, "SELBSTLOSER HELD", ap(t, P[1] + 0.3, 0.3), 30)
        halo(c, RX, GY - 220, ap(t, P[1] + 0.6, 0.4))
    elif si == 6:
        richard(c, RX)
        k = ap(t, P[1], 0.6)
        halo(c, RX, lerp(GY - 220, GY + 40, eout(k) ** 2), 1 - k)
        pill(c, RX, 720, "ARBEITET NICHT UMSONST", ap(t, P[1] + 0.3, 0.3), 28)
    elif si == 7:
        richard(c, 300)
        k = ap(t, 0.1, 0.35)
        if k > 0:
            for i in range(3): bill(c, 300 + (i - 1) * 60, 700 - i * 10, -0.1 + i * 0.1, cl(k * 2) * 0.8)
            bigx(c, 300, 700, 90, ap(t, 0.6, 0.5), 1)
        pill(c, 300, 820, "KEIN GELD", ap(t, 0.8, 0.3), 24, 0.6)
        share_grid(c, 770, GY - 60, 7, 10, ap(t, 0.9, d - 1.2))
        pill(c, 770, 700, "AKTIEN", ap(t, 1.0, 0.3), 26)
        text(c, 770, 620, f"{int(7_800_000 * eout(ap(t, P[1], 1.2))):,}".replace(",", "."), 52, ap(t, P[1], 0.2), rgb=ACC)
    elif si == 8:
        richard(c, 300)
        pill(c, 540, 520, "DER TRICK", ap(t, 0, 0.3), 30)
        g = 1 + 0.55 * eout(ap(t, P[1], 2.0))
        c.save(); c.translate(780, GY); c.scale(g * 0.7, g * 0.7); share_grid(c, 0, -60, 7, 10, 1); c.restore()
        v = lerp(20, 500, eout(ap(t, P[1], 2.0)) ** 2)
        text(c, 340, 760, f"{int(v)} MIO $", 60, ap(t, 0.2, 0.2), rgb=ACC)
        pill(c, 340, 860, "WERT SEINER AKTIEN", ap(t, 0.3, 0.3), 22, 0.6)
    elif si == 9:
        richard(c, 300)
        c.save(); c.translate(780, GY); c.scale(1.4 * 0.7, 1.4 * 0.7); share_grid(c, 0, -60, 7, 10, 1); c.restore()
        k = ap(t, 0.1, 0.35)
        if k > 0:  # lock
            c.save(); c.translate(780, 640); c.scale(back(k), back(k))
            rrect(c, -50, -30, 100, 80, 10); c.set_source_rgba(1, 1, 1, 1); c.set_line_width(6); c.stroke()
            c.new_path(); c.arc(0, -30, 32, math.pi, 2 * math.pi); c.stroke(); c.restore()
        pill(c, 780, 540, "NIE VERKAUFT", ap(t, 0.3, 0.3), 26)
        if card(c, 300, 680, 400, 190, ap(t, P[1], 0.35), rgb=ACC):
            text(c, 0, -50, "STEUERN AUF GEWINN", 22, 1, 0.6); text(c, 0, 25, "0 $", 80, 1, rgb=ACC); c.restore()
    elif si == 10:
        richard(c, RX)
        pill(c, RX, 560, "BRAUCHT TROTZDEM GELD", ap(t, 0.2, 0.3), 26)
        house(c, 220, 860, 1.0, ap(t, P[1], 0.35))
        pill(c, 220, 905, "VILLA", ap(t, P[1] + 0.2, 0.3), 22, 0.6)
        car(c, 540, 860, 1.0, ap(t, P[1] + 0.6, 0.35))
        pill(c, 540, 905, "SPORTWAGEN", ap(t, P[1] + 0.8, 0.3), 22, 0.6)
        plane(c, 860, 790, 0.9, ap(t, P[1] + 1.2, 0.35))
        pill(c, 860, 905, "LIFESTYLE", ap(t, P[1] + 1.4, 0.3), 22, 0.6)
    elif si == 11:
        k = eout(ap(t, 0.2, 1.4))
        rx = lerp(280, 520, k)
        richard(c, rx, GY - (4 * abs(math.sin(T * 9)) if 0 < k < 1 else 0))
        columns_building(c, 820, GY, 1.1, ap(t, 0.1, 0.4), None, "BANK")
        if t < P[1] + 0.6:
            g_ = eout(ap(t, P[1], 0.6))
            c.save(); c.translate(lerp(rx, 820, g_), lerp(GY - 300, GY - 130, g_)); c.scale(0.35 * (1 - 0.5 * g_), 0.35 * (1 - 0.5 * g_))
            share_grid(c, 0, 0, 5, 5, 1); c.restore()
        pill(c, 820, 860, "AKTIEN ALS SICHERHEIT", ap(t, P[1] + 0.3, 0.3), 22, 0.6)
        if t > P[1] + 0.5:
            for i in range(10):
                ph = ((t - P[1] - 0.5) * 0.8 + i / 10) % 1
                bill(c, lerp(760, 300, ph) + math.sin(i * 1.9) * 40, lerp(GY - 200, 520, ph) + math.sin(ph * 6 + i) * 40, ph * 3 + i, 0.9 * (1 - ph))
        if card(c, 540, 640, 520, 190, ap(t, P[2], 0.35), rgb=ACC):
            text(c, 0, -50, "EINKOMMENSTEUER", 22, 1, 0.6); text(c, 0, 25, "0 $", 80, 1, rgb=ACC); c.restore()
        pill(c, 540, 770, "KREDIT ≠ EINKOMMEN", ap(t, P[2] + 0.5, 0.3), 26)
    elif si == 12:
        for i, x in enumerate(CROWD):
            figure(c, x, GY, 0.8, 0.45); heart(c, x, GY - 230, 1.0, ap(t, 0.2 + 0.1 * i, 0.3))
        richard(c, RX); halo(c, RX, GY - 220, ap(t, 0.3, 0.4))
        pill(c, RX, 620, "„EINFACH NUR BESCHEIDEN“", ap(t, 0.4, 0.3), 26)
        follow_btn(c, RX, 800, ap(t, P[1], 0.4), t > P[1] + 2.2)
        k = ap(t, P[1] + 1.5, 0.6)
        if k > 0:  # cursor
            px, py = lerp(760, RX + 60, eout(k)), lerp(1000, 820, eout(k))
            c.new_path(); c.move_to(px, py); c.line_to(px, py + 56); c.line_to(px + 14, py + 42); c.line_to(px + 34, py + 48); c.close_path()
            col(c, 1, 1); c.fill()

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
