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

ACCENT = ["säge","winziger","angriff","maul","wut","tiefer","stirbt","säge","reaktion","namen","wildpferdeffekt","wildpferd","harmlos","panik","reaktion","schaden","jeden","kopf","krieg","energie","verschwendet","sekunden","weißglut","säge","wert","schick"]
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

RED = (1.0, 0.27, 0.25)
BACK = [0]
SAWY = 900

def saw(c, x0=170, x1=760, y=SAWY, a=1., cuts=0):
    c.new_path(); c.move_to(x0, y - 48); c.line_to(x1, y - 48); c.line_to(x1, y + 30)
    n = int((x1 - x0) / 24)
    for i in range(n, -1, -1):
        xx = x0 + i * 24; c.line_to(xx + 12, y + 46); c.line_to(xx, y + 30)
    c.close_path()
    lg = cairo.LinearGradient(0, y - 48, 0, y + 46); lg.add_color_stop_rgba(0, 0.46, 0.47, 0.5, a); lg.add_color_stop_rgba(1, 0.2, 0.21, 0.23, a)
    c.set_source(lg); c.fill()
    rrect(c, x1 - 10, y - 70, 170, 120, 30); c.set_source_rgba(*ACC, a); c.set_line_width(7); c.stroke()
    rrect(c, x1 + 40, y - 40, 80, 56, 22); c.set_source_rgba(*ACC, a * 0.8); c.set_line_width(5); c.stroke()
    for k in range(3):
        c.new_path(); c.arc(x1 + 20, y - 40 + k * 36, 6, 0, 2 * math.pi); c.set_source_rgba(*ACC, a); c.fill()

def snake(c, pts, alive=1., cuts=(), hi=None):
    """pts tail->head"""
    n = len(pts); g = lerp(0.4, 0.88, alive) * (0.62 if BACK[0] else 1)
    for i in range(1, n):
        if hi is not None and not hi(i): continue
        w = 8 + 30 * min(1, i / (n * 0.35))
        c.move_to(*pts[i - 1]); c.line_to(*pts[i]); c.set_line_width(w); c.set_line_cap(cairo.LINE_CAP_ROUND)
        col(c, g, 1); c.stroke()
    for i in range(6, n - 4, 6):
        if hi is not None and not hi(i): continue
        (x, y), (x2, y2) = pts[i], pts[i + 1]; ang = math.atan2(y2 - y, x2 - x)
        c.save(); c.translate(x, y); c.rotate(ang + math.pi / 4); r = 7 + 6 * min(1, i / (n * 0.35))
        c.rectangle(-r, -r, 2 * r, 2 * r); col(c, 0.12, 1); c.fill(); c.restore()
    for (ci, k) in cuts:
        if ci >= n - 1 or k <= 0: continue
        if hi is not None and not hi(ci): continue
        (x, y), (x2, y2) = pts[ci], pts[ci + 1]; ang = math.atan2(y2 - y, x2 - x) + math.pi / 2
        c.move_to(x - 22 * math.cos(ang), y - 22 * math.sin(ang)); c.line_to(x + 22 * math.cos(ang), y + 22 * math.sin(ang))
        c.set_source_rgba(*RED, k); c.set_line_width(6); c.stroke()
    if hi is None or hi(n - 1):
        (x, y), (px, py) = pts[-1], pts[-2]; ang = math.atan2(y - py, x - px)
        c.save(); c.translate(x, y); c.rotate(ang); c.scale(1.35, 1)
        c.new_path(); c.arc(0, 0, 24, 0, 2 * math.pi); col(c, g, 1); c.fill(); c.restore()
        c.save(); c.translate(x, y); c.rotate(ang)
        for s_ in (-1, 1):
            c.new_path()
            if alive > 0.5: c.arc(6, s_ * 10, 5, 0, 2 * math.pi); col(c, 0.05, 1); c.fill()
            else:
                c.move_to(1, s_ * 10 - 5); c.line_to(11, s_ * 10 + 5); c.move_to(11, s_ * 10 - 5); c.line_to(1, s_ * 10 + 5); stroke(c, 0.05, 1, 3)
        c.restore()

def path_pts(f, u0, u1, n=90): return [f(u0 + (u1 - u0) * i / (n - 1)) for i in range(n)]

def ecg(c, x, y, T, rate, a=1., dead=False):
    if a <= 0: return
    rrect(c, x - 170, y - 42, 340, 84, 14); c.set_source_rgba(0.05, 0.05, 0.06, 0.9 * a); c.fill_preserve()
    c.set_source_rgba(*RED, a); c.set_line_width(3); c.stroke()
    hx = x - 135; c.save(); c.translate(hx, y); s = 1 + (0 if dead else 0.25 * max(0, math.sin(T * rate * 6.28)) ** 8); c.scale(s * 0.6, s * 0.6)
    c.move_to(0, 12); c.curve_to(-30, -8, -18, -34, 0, -18); c.curve_to(18, -34, 30, -8, 0, 12); c.set_source_rgba(*RED, a); c.fill(); c.restore()
    c.new_path()
    for i in range(121):
        u = i / 120; xx = x - 100 + 250 * u
        ph = (u * 3 - T * rate) % 1
        yy = 0 if dead else (-30 if 0.45 < ph < 0.5 else (22 if 0.5 <= ph < 0.55 else 0))
        (c.move_to if i == 0 else c.line_to)(xx, y + yy)
    c.set_source_rgba(*RED, a); c.set_line_width(4); c.stroke()

def horse(c, x, y, s=1., rear=0., run=0., fold=0., T=0., a=1.):
    c.save(); c.translate(x, y); c.scale(s, s)
    c.translate(0, 110 * fold)
    if rear: c.translate(-95, 0); c.rotate(-0.55 * rear); c.translate(95, 0)
    col(c, 1, a)
    legs = [(-115, 0), (-80, 1.6), (85, 3.1), (120, 4.7)]
    for lx, ph in legs:
        sw = run * 0.5 * math.sin(T * 14 + ph) + (0.9 if rear and lx > 0 else 0) * rear
        L = 165 * (1 - 0.7 * fold)
        c.save(); c.translate(lx, -165); c.rotate(-sw if lx > 0 else sw * 0.6)
        if fold: c.rotate(1.2 * fold * (1 if lx > 0 else -1))
        rrect(c, -12, 0, 24, L, 10); col(c, 0.92, a); c.fill(); c.restore()
    c.new_path(); c.save(); c.translate(0, -195); c.scale(155, 66); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); col(c, 1, a); c.fill()
    c.save(); c.translate(100, -215); c.rotate(0.9 * fold)
    c.move_to(-15, 5); c.line_to(35, 40); c.line_to(105, -95); c.line_to(60, -125); c.close_path(); col(c, 1, a); c.fill()
    c.move_to(60, -128); c.line_to(105, -95); c.line_to(175, -45); c.curve_to(190, -55, 192, -68, 180, -78); c.line_to(120, -140); c.close_path(); c.fill()
    c.move_to(72, -128); c.line_to(80, -165); c.line_to(95, -132); c.close_path(); c.fill()
    c.new_path(); c.arc(128, -112, 6, 0, 2 * math.pi); col(c, 0.05, a); c.fill()
    c.move_to(55, -125); c.curve_to(30, -80, 10, -40, -12, 0); c.set_line_width(16); col(c, 0.6, a); c.stroke()
    c.restore()
    c.move_to(-150, -215); c.curve_to(-200, -190, -205, -130, -190 + 20 * math.sin(T * 6) * run, -90); c.set_line_width(18); col(c, 0.6, a); c.stroke()
    c.restore()

def bat(c, x, y, s, T, a=1.):
    if a <= 0: return
    c.save(); c.translate(x, y); c.scale(s, s * (0.7 + 0.3 * math.sin(T * 20)))
    c.move_to(0, -8); c.curve_to(-20, -30, -55, -25, -70, -5); c.curve_to(-55, -8, -45, 5, -40, 10); c.curve_to(-30, 0, -15, 5, 0, 12)
    c.curve_to(15, 5, 30, 0, 40, 10); c.curve_to(45, 5, 55, -8, 70, -5); c.curve_to(55, -25, 20, -30, 0, -8)
    c.set_source_rgba(0.2, 0.2, 0.22, a); c.fill_preserve(); col(c, 1, a); c.set_line_width(3); c.stroke(); c.restore()

def person(c, x, y=GY, s=1., rgb=(1, 1, 1), a=1.):
    c.save(); c.translate(x, y); c.scale(s, s)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2)
    c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    c.set_source_rgba(*rgb, a); c.fill(); c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill(); c.restore()

def comment(c, x, y, s, p, red=False):
    if p <= 0: return
    c.save(); c.translate(x, y); sc = back(p); c.scale(sc, sc); a = cl(p * 2)
    c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(30); w = c.text_extents(s).x_advance + 110
    rrect(c, -w / 2, -40, w, 80, 16); c.set_source_rgba(0.06, 0.06, 0.07, 0.95 * a); c.fill_preserve()
    (c.set_source_rgba(*RED, a) if red else col(c, 0.8, a)); c.set_line_width(4); c.stroke()
    c.new_path(); c.arc(-w / 2 + 40, 0, 18, 0, 2 * math.pi); col(c, 0.6, a); c.fill()
    text(c, 25, 0, s, 30, a); c.restore()

def battery(c, x, y, lvl, label, a=1.):
    if a <= 0: return
    rrect(c, x - 110, y - 38, 220, 76, 12); col(c, 1, a); c.set_line_width(5); c.stroke()
    c.rectangle(x + 112, y - 16, 12, 32); c.fill()
    for i in range(5):
        if i < round(lvl * 5):
            c.rectangle(x - 98 + i * 41, y - 26, 34, 52)
            c.set_source_rgba(*(RED if lvl < 0.35 else (1, 1, 1)), a); c.fill()
    text(c, x, y - 64, label, 24, a, 0.7)

def starburst(c, x, y, r, p):
    if p <= 0: return
    c.save(); c.translate(x, y); c.scale(back(p), back(p)); c.new_path()
    for i in range(24):
        rr = r if i % 2 == 0 else r * 0.55; th = i * math.pi / 12
        (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
    c.close_path(); c.set_source_rgba(*RED, cl(p * 2)); c.fill(); c.restore()

def stopwatch(c, x, y, r, val, p, rgb=None):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); c.scale(back(p), back(p))
    c.new_path(); c.arc(0, 0, r, 0, 2 * math.pi); col(c, 0.4, a); c.set_line_width(8); c.stroke()
    c.new_path(); c.arc(0, 0, r, -math.pi / 2, -math.pi / 2 + 2 * math.pi * min(1, val / 2.0))
    (c.set_source_rgba(*rgb, a) if rgb else col(c, 1, a)); c.stroke()
    c.rectangle(-14, -r - 26, 28, 14); col(c, 1, a); c.fill()
    text(c, 0, 0, f"{val:.1f} s".replace(".", ","), 56, a, rgb=rgb); c.restore()

def share_arrow(c, x, y, s, p):
    if p <= 0: return
    c.save(); c.translate(x, y); c.scale(back(p) * s, back(p) * s)
    c.move_to(-70, 60); c.curve_to(-70, -10, -20, -40, 30, -40); c.set_source_rgba(*ACC, cl(p * 2)); c.set_line_width(22); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    c.move_to(20, -90); c.line_to(85, -40); c.line_to(20, 10); c.close_path(); c.fill(); c.restore()

CAM = [(470, 900, 1.15, 1.08), (520, 880, 1.1, 1.15), (520, 900, 1.1, 1.18), (520, 900, 1.05, 1.0),
       (560, 1000, 1.0, 1.05), (600, 1000, 0.95, 0.98), (540, 900, 1.0, 1.05), (540, 960, 1.05, 1.1),
       (540, 940, 1.0, 1.04), (540, 920, 1.0, 1.05), (540, 960, 1.0, 1.06), (540, 960, 1.0, 1.1)]

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

def slide_path(u):  # snake approach path, crosses saw around u~0.6
    return (lerp(90, 640, u) + 60 * math.sin(u * 9), lerp(1500, 560, u) + 25 * math.sin(u * 13))

def coil_pts(t, amp):
    pts = []
    for i in range(140):
        u = i / 139; x = lerp(220, 720, u)
        y = SAWY + amp * math.sin(u * 3.5 * 2 * math.pi + 1.2)
        pts.append((x, y))
    hx, hy = pts[-1]; pts.append((hx + 20, hy - 60)); pts.append((hx + 30, hy - 90))
    return pts

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    bokeh(c, T)
    # red rage tint
    rage = 0
    if si == 2: rage = ap(t, 0.3, 1.0) * (1 - 0.6 * ap(t, P[2], 0.8))
    if si == 10: rage = ap(t, 0.5, 1.0) * (1 - ap(t, P[1], 0.6))
    if si == 8: rage = 0.5 * ap(t, 0.8, 0.8) * (1 - ap(t, P[1], 0.5))
    if rage > 0:
        rg = cairo.RadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1100)
        rg.add_color_stop_rgba(0, *RED, 0.0); rg.add_color_stop_rgba(1, *RED, 0.16 * rage); c.set_source(rg); c.paint()
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    if si in (5, 7, 8, 9, 10, 11) or si == 4: ground(c, 1)
    if si == 0:
        saw(c)
        uh = lerp(0.35, 1.0, eout(ap(t, 0, d)))
        pts = path_pts(slide_path, uh - 0.55, uh)
        ci = None
        if t > P[1]:
            ci = min(range(len(pts)), key=lambda i: abs(pts[i][1] - (SAWY - 48)))
        # draw: part below saw top edge behind? snake goes over the saw -> draw after saw
        snake(c, pts, 1, [(ci, ap(t, P[1], 0.2))] if ci else ())
        if t > P[1]:
            for k in range(3):
                c.new_path(); c.arc(pts[ci][0] + 30 + k * 14, pts[ci][1] - 20 - k * 18 - t * 10 % 20, 6 - k, 0, 2 * math.pi); c.set_source_rgba(*RED, 1); c.fill()
        pill(c, 470, 1120, "WINZIGER SCHNITT", ap(t, P[1] + 0.3, 0.3), 26, 0.85)
    elif si == 1:
        saw(c)
        ecg(c, 520, 1150, T, lerp(1.2, 2.2, ap(t, 0, d)), ap(t, 0, 0.3))
        bite = ap(t, P[1], 0.25)
        def f(u): return slide_path(u)
        pts = path_pts(f, 0.45, 1.0)
        hx, hy = pts[-1]; tx, ty = 520, SAWY - 60
        k = eout(bite) if t < P[1] + 0.8 else 1
        pts = pts[:-12] + [(lerp(pts[-12 + i][0], tx + (i - 11) * 6, k * i / 11), lerp(pts[-12 + i][1], ty - (11 - i) * 8, k * i / 11)) for i in range(12)]
        ci = min(range(len(pts)), key=lambda i: abs(pts[i][1] - (SAWY - 48)))
        snake(c, pts, 1, [(ci, 1)] + ([(len(pts) - 2, ap(t, P[1] + 0.2, 0.2))] if t > P[1] else []))
        if t > P[1] + 0.2:
            for k2 in range(6):
                ph = ((t - P[1]) * 1.5 + k2 / 6) % 1
                c.new_path(); c.arc(tx + math.sin(k2 * 2) * 40, ty - 20 - ph * 60, 7 * (1 - ph), 0, 2 * math.pi); c.set_source_rgba(*RED, 1 - ph); c.fill()
        pill(c, 330, 640, "ANGRIFF?", ap(t, 0.5, 0.3), 30)
        pill(c, 700, 640, "BEISST ZU", ap(t, P[1] + 0.3, 0.3), 28, 0.85)
    elif si == 2:
        dead = ap(t, P[2], 0.6)
        ecg(c, 520, 1150, T, lerp(2.2, 4.0, ap(t, 0, P[2])), 1, dead > 0.5)
        amp = lerp(135, 70, ease(ap(t, P[1], P[2] - P[1])))
        coil = eout(ap(t, 0, 0.9))
        pts = coil_pts(t, amp * coil)
        cuts = [(i, ap(t, P[1] + 0.15 * j, 0.2)) for j, i in enumerate(range(15, 130, 13))]
        front = lambda i: math.cos((i / 139) * 3.5 * 2 * math.pi + 1.2) >= 0 or i >= 139
        BACK[0] = 1; snake(c, pts, 1 - dead, cuts, hi=lambda i: not front(i)); BACK[0] = 0
        saw(c)
        snake(c, pts, 1 - dead, cuts, hi=front)
        pill(c, 520, 1140, "WUT", ap(t, 0.3, 0.3), 30, 0.85) if False else None
        pill(c, 520, 1270, "JE FESTER, DESTO TIEFER", ap(t, P[1], 0.3) * (1 - ap(t, P[2], 0.2)), 26)
        pill(c, 520, 1270, "TOT", ap(t, P[2] + 0.2, 0.3), 30, 0.85)
    elif si == 3:
        ecg(c, 520, 1150, T, 0, 1 - ap(t, 0, 0.4), True)
        pts = coil_pts(0, 70)
        front = lambda i: math.cos((i / 139) * 3.5 * 2 * math.pi + 1.2) >= 0 or i >= 139
        BACK[0] = 1; snake(c, pts, 0, [], hi=lambda i: not front(i)); BACK[0] = 0; saw(c); snake(c, pts, 0, [], hi=front)
        pill(c, 450, 640, "NICHT DIE SÄGE", ap(t, 0.2, 0.3), 30)
        check_circle(c, 680, 640, 32, ap(t, 0.6, 0.3), False)
        k = ap(t, P[1], 0.35)
        if k > 0:
            c.save(); c.translate(520, 1270); c.scale(back(k), back(k)); text(c, 0, 0, "SONDERN IHRE REAKTION", 52, cl(k * 2), rgb=RED); c.restore()
    elif si == 4:
        horse(c, 560, GY, 1.0, T=T, a=ap(t, 0, 0.5))
        pill(c, 560, 640, "PSYCHOLOGIE", ap(t, 0.2, 0.3), 24, 0.6)
        k = ap(t, P[1], 0.35)
        if k > 0:
            c.save(); c.translate(560, 760); c.scale(back(k), back(k)); text(c, 0, 0, "DER WILDPFERD-EFFEKT", 58, cl(k * 2), rgb=ACC); c.restore()
            c.move_to(260, 810); c.line_to(lerp(260, 860, eout(k)), 810); c.set_source_rgba(*RED, 1); c.set_line_width(5); c.stroke()
    elif si == 5:
        runk = ap(t, P[2] + 0.4, 1.4); fold = ap(t, d - 1.2, 0.8)
        rear = ap(t, P[2], 0.3) * (1 - ap(t, P[2] + 0.5, 0.3))
        hx = 470 + 300 * ease(runk) - 0 * fold
        horse(c, hx, GY, 1.0, rear=rear, run=(1 if 0 < runk < 1 else 0), fold=fold, T=T)
        if 0 < runk < 1:
            for i in range(5):
                yy = GY - 100 - i * 45; c.move_to(hx - 260 - i * 20, yy); c.line_to(hx - 360 - i * 30, yy); stroke(c, 0.6, 0.6, 4)
        bx = lerp(150, 430, eout(ap(t, 0, P[0] + 1.2))); by = lerp(600, GY - 120, eout(ap(t, 0, P[0] + 1.2)))
        bat(c, bx, by, 0.9, T, 1 - ap(t, P[1] + 0.6, 0.4))
        if t > 1.3:
            c.new_path(); c.arc(440, GY - 120, 7, 0, 2 * math.pi); c.set_source_rgba(*RED, 1); c.fill()
        pill(c, 440, 640, "KLEINER BISS", ap(t, 1.3, 0.3), 26)
        pill(c, 440, 720, "HARMLOS", ap(t, P[1] + 0.2, 0.3), 26, 0.6)
        pill(c, 700, 560, "PANIK", ap(t, P[2] + 0.2, 0.3), 30, 0.85)
        pill(c, 760, 560, "ZUSAMMENGEBROCHEN", ap(t, d - 1.0, 0.3), 26)
    elif si == 6:
        c.new_path(); k = ap(t, 0.1, 0.3); c.arc(540, 560, 14 * back(k), 0, 2 * math.pi); c.set_source_rgba(*RED, k); c.fill()
        text(c, 540, 630, "KLEINE WUNDE", 34, k, 0.8)
        text(c, 540, 720, "+", 70, ap(t, 0.6, 0.3), 0.7)
        starburst(c, 540, 840, 90, ap(t, 0.8, 0.35))
        text(c, 540, 970, "GROSSE REAKTION", 34, ap(t, 0.9, 0.3), 0.8)
        text(c, 540, 1060, "=", 70, ap(t, P[1], 0.3), 0.7)
        k = ap(t, P[1] + 0.3, 0.35)
        if card(c, 540, 1190, 620, 130, k, rgb=RED):
            text(c, 0, 0, "DER ECHTE SCHADEN", 46, 1, rgb=RED); c.restore()
    elif si == 7:
        red = ap(t, P[1] + 1.0, 0.6)
        person(c, 540, GY, 1.0, (1, lerp(1, 0.3, red), lerp(1, 0.28, red)))
        pill(c, 540, 540, "JEDEN TAG", ap(t, 0.1, 0.3), 26)
        comment(c, 540, 660, "SCHLECHTESTES VIDEO EVER.", ap(t, P[1], 0.35))
        comment(c, 540, 780, "WER HAT DICH GEFRAGT?", ap(t, P[1] + 1.3, 0.35), True)
        k = ap(t, P[1] + 2.6, 1.0)
        if k > 0:  # sun travelling = whole day
            ang = math.pi * (1 - ap(t, P[1] + 2.6, d - P[1] - 2.6))
            sx, sy = 540 + 300 * math.cos(ang), GY - 120 - 300 * math.sin(ang) * 0.5
            c.new_path(); c.arc(sx, sy, 26, 0, 2 * math.pi); c.set_source_rgba(*ACC, cl(k * 2)); c.fill()
            pill(c, 540, 890, "DEN GANZEN TAG IM KOPF", ap(t, P[1] + 2.8, 0.3), 24, 0.6)
    elif si == 8:
        esc = ap(t, 0.8, 1.2) * (1 - ap(t, P[1], 0.4))
        person(c, 380, GY, 1.0, (1, lerp(1, 0.35, esc), lerp(1, 0.3, esc)))
        person(c, 700, GY, 1.0, (lerp(1, 0.6, esc),) * 3)
        bubble(c, 420, GY - 320, "WAS?", ap(t, 0.2, 0.3) * (1 - ap(t, P[1], 0.2)))
        bubble(c, 740, GY - 320, "EIGENTLICH…", ap(t, 0.5, 0.3) * (1 - ap(t, P[1], 0.2)))
        if esc > 0:
            for i in range(3):
                starburst(c, 540 + (i - 1) * 50, GY - 160 - (i % 2) * 60, 40 + 10 * math.sin(T * 10 + i), esc)
        for i, (lab, d0) in enumerate((("DEIN LEBEN", 0), ("DEINE ZEIT", 0.5), ("DEINE ENERGIE", 1.0))):
            k = ap(t, P[1] + d0, 0.3)
            if k > 0: battery(c, 540, 560 + i * 150, 1.0, lab, k)
    elif si == 9:
        person(c, 540, GY, 1.0, (0.8, 0.8, 0.8))
        for i, lab in enumerate(("DEIN LEBEN", "DEINE ZEIT", "DEINE ENERGIE")):
            battery(c, 540, 560 + i * 150, lerp(1, 0.15, eout(ap(t, 0.1 + 0.2 * i, 1.2))), lab, 1 - ap(t, P[1], 0.3))
        pill(c, 540, 470, "VERSCHWENDET", ap(t, 0.3, 0.3), 28, 0.85)
        k = ap(t, P[1] + 0.1, 0.3)
        stopwatch(c, 540, 760, 120, 2.0 * eout(ap(t, P[1] + 0.3, 1.2)), k, ACC)
        pill(c, 540, 940, "LOSLASSEN", ap(t, P[1] + 1.4, 0.3), 28)
    elif si == 10:
        boil = ap(t, 0.3, 1.2) * (1 - ap(t, P[1], 0.4))
        person(c, 540, GY, 1.0, (1, lerp(1, 0.3, boil), lerp(1, 0.28, boil)))
        if boil > 0:
            for i in range(6):
                ph = (T * 0.9 + i / 6) % 1
                c.new_path(); c.arc(540 + math.sin(i * 2.4 + T) * 30, GY - 260 - ph * 160, 14 + 20 * ph, 0, 2 * math.pi)
                col(c, 0.8, 0.3 * (1 - ph) * boil); c.fill()
        comment(c, 540, 700, "WER HAT DICH GEFRAGT?", ap(t, 0.1, 0.35) * (1 - ap(t, P[1], 0.3)), True)
        k = ap(t, P[1], 0.4)
        if k > 0:
            c.save(); c.translate(540, 700); c.scale(0.55, 0.55); c.translate(-470, -SAWY)
            saw(c, a=k); pts = path_pts(slide_path, 0.35, 0.95); snake(c, [(x, y + (SAWY - 560) * 0) for x, y in pts], 1)
            c.restore()
            pill(c, 540, 900, "SCHLANGE & SÄGE", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 11:
        person(c, 540, GY, 1.0)
        c.save(); c.translate(540, GY - 230); c.scale(1, 0.3); c.new_path(); c.arc(0, 0, 50, 0, 2 * math.pi); c.restore()
        c.set_source_rgba(*ACC, ap(t, 0.3, 0.5)); c.set_line_width(5); c.stroke()
        k = ap(t, 0.2, 0.35)
        if card(c, 540, 640, 760, 150, k, rgb=ACC):
            text(c, 0, -22, "NICHT JEDER KAMPF", 44, 1); text(c, 0, 32, "IST ES WERT.", 44, 1, rgb=ACC); c.restore()
        share_arrow(c, 540, 880, 1.0, ap(t, P[1], 0.4))
        pill(c, 540, 1000, "SCHICK ES WEITER", ap(t, P[1] + 0.4, 0.3), 26)

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
