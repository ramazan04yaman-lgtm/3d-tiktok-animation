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

RED = (1.0, 0.3, 0.28)

def person(c, x, y=GY, s=1., g=1., sy=1., rot=0., rgb=None, a=1.):
    if s <= 0.01 or a <= 0: return
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s * sy)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2); c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    (c.set_source_rgba(*rgb, a) if rgb else col(c, g, a)); c.fill()
    c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill(); c.restore()

def star(c, x, y, r, p, rgb=ACC):
    if p <= 0: return
    c.save(); c.translate(x, y); s = back(p); c.scale(s, s); c.new_path()
    for i in range(8):
        rr = r if i % 2 == 0 else r * 0.3; th = -math.pi / 2 + i * math.pi / 4
        (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
    c.close_path(); c.set_source_rgba(*rgb, cl(p * 2)); c.fill(); c.restore()

def typed(c, x, y, s, t0, t, size=40, cps=16, rgb=None):
    n = int(max(0, (t - t0)) * cps)
    if n <= 0: return
    sh = s[:n] + ("▌" if n < len(s) or int(t * 3) % 2 else "")
    text(c, x, y, sh, size, 1, 1, spacing=size * 0.12, rgb=rgb)

def cone(c, x, ytop, ybot, w0, w1, a):
    if a <= 0: return
    c.move_to(x - w0, ytop); c.line_to(x + w0, ytop); c.line_to(x + w1, ybot); c.line_to(x - w1, ybot); c.close_path()
    lg = cairo.LinearGradient(0, ytop, 0, ybot); lg.add_color_stop_rgba(0, 1, 0.95, 0.85, 0.02 * a); lg.add_color_stop_rgba(1, 1, 0.95, 0.85, 0.12 * a)
    c.set_source(lg); c.fill()

# ---------- roots (precomputed)
_rr = np.random.default_rng(11)
ROOTS = []
def _grow(x, y, ang, ln, depth, d0):
    if depth > 6 or ln < 12: return
    x2, y2 = x + ln * math.cos(ang), y + ln * math.sin(ang)
    ROOTS.append((x, y, x2, y2, d0, 7 - depth))
    for k in range(2 if depth < 5 else 1):
        _grow(x2, y2, ang + _rr.uniform(-0.7, 0.7), ln * _rr.uniform(0.62, 0.85), depth + 1, d0 + 1)
for a0 in (1.2, 1.57, 1.95): _grow(750, GY, a0, 110, 0, 0)

# ---------- camera keyframes per scene: (t, cx, cy, z)
CAMK = [
    [(0, 540, 1150, 1.0), (1.5, 560, 1380, 1.0), (9.5, 560, 1250, 1.0), (12, 560, 1150, 1.06)],
    [(0, 540, 1050, 1.0), (5.8, 540, 1080, 1.02), (6.6, 600, 1400, 1.0), (9.0, 600, 1400, 1.0), (9.8, 600, 1000, 0.9), (12.5, 600, 980, 0.92)],
    [(0, 540, 1000, 1.0), (11, 540, 1000, 1.06)],
    [(0, 540, 980, 1.05), (11, 540, 980, 0.9)],
    [(0, 540, 1000, 1.08), (9, 540, 1000, 1.15)],
    [(0, 540, 1000, 1.0), (6.5, 540, 960, 1.12)],
]
def camera(T):
    si = scene_at(T); t = T - TL[si]['start']; K = CAMK[si]
    for i in range(len(K) - 1):
        if K[i][0] <= t <= K[i + 1][0]:
            u = ease((t - K[i][0]) / (K[i + 1][0] - K[i][0]))
            return lerp(K[i][1], K[i + 1][1], u), lerp(K[i][2], K[i + 1][2], u) - 70, lerp(K[i][3], K[i + 1][3], u) * 1.22
    k = K[-1] if t > K[-1][0] else K[0]
    return k[1], k[2] - 70, k[3] * 1.22

def scene_at(T):
    for i, s in enumerate(TL):
        if T < s['start'] + s['dur']: return i
    return len(TL) - 1

INSULTS = ["VERSAGER", "DU SCHAFFST DAS NIE", "GIB AUF", "LOL", "LOSER", "PEINLICH", "NICHT GUT GENUG", "LÄCHERLICH"]
HANDS = [("DIE VERGANGENHEIT", 170), ("FAMILIE", 15), ("ERWARTUNGEN", 62), ("GELD", 145), ("WAS ANDERE DENKEN", 38),
         ("ZWEIFEL", 118), ("DIE ZUKUNFT", -8), ("ÜBERDENKEN", 90)]

def hand(c, x, y, ang, a, label):
    c.save(); c.translate(x, y); c.rotate(ang)
    # sleeve + fist + index finger pointing along +x
    c.rectangle(-260, -26, 170, 52); col(c, 0.35, a); c.fill()
    rrect(c, -95, -34, 70, 68, 18); col(c, 1, a); c.fill()
    rrect(c, -35, -30, 70, 20, 10); c.fill()
    c.restore()
    lx = x - 150 * math.cos(ang); ly = y - 150 * math.sin(ang) - 55
    text(c, lx, ly, label, 24, a, 0.85, spacing=2)

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    if si == 0:  # ------------------------------------------ DIE GRUBE
        PX0, PX1, PD = 470, 670, 560
        # earth
        c.rectangle(-400, GY, 1880, 1200); col(c, 0.07, 1); c.fill()
        c.rectangle(PX0, GY, PX1 - PX0, PD); c.set_source_rgb(0.02, 0.02, 0.025); c.fill()
        c.move_to(-400, GY); c.line_to(PX0, GY); c.line_to(PX0, GY + PD); c.line_to(PX1, GY + PD); c.line_to(PX1, GY); c.line_to(1480, GY)
        stroke(c, 0.55, 1, 4)
        for i, x in enumerate((150, 250, 340)):
            person(c, x, GY, 0.8, 0.32)
            if 1.5 < t < 10.5 and int(t * 4 + i) % 3 == 0: text(c, x, GY - 250, "HA", 26, 0.5, 0.5)
        nb = int(cl((t - 2.0) / 0.95, 0, 8))
        top = GY + PD - 70 * nb
        for i in range(nb + 1):
            if i >= 8: break
            tt = 2.0 + i * 0.95; k = ap(t, tt - 0.6, 0.6)
            if k <= 0: continue
            by_final = GY + PD - 70 * (i + 1) + 35
            if k < 1:
                bx = lerp(300, 570, k); by = lerp(GY - 300, by_final, k) - 260 * math.sin(math.pi * k)
                rot = (1 - k) * 2.5
            else: bx, by, rot = 570, by_final, 0
            c.save(); c.translate(bx, by); c.rotate(rot)
            c.rectangle(-95, -33, 190, 66); col(c, 0.16, 1); c.fill_preserve(); stroke(c, 0.75, 1, 3)
            c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); sz = 22 if len(INSULTS[i]) < 12 else 16
            text(c, 0, 0, INSULTS[i], sz, 1, 0.85); c.restore()
        # hero
        fall = ap(t, 0.3, 0.9)
        if t < 0.3: hx, hy = lerp(330, 560, ap(t, 0, 0.3)), GY
        elif fall < 1: hx, hy = 570, lerp(GY, GY + PD, fall ** 2)
        else:
            hx, hy = 570, top
            jump = ap(t, 2.0 + (nb - 1) * 0.95, 0.3) if nb > 0 else 1
            hy = top - 40 * math.sin(math.pi * jump) if jump < 1 else top
        if nb >= 8:
            hx = lerp(570, 600, ap(t, 10, 0.5))
        person(c, hx, hy, 0.8)
        star(c, hx, hy - 260, 26, ap(t, 10.2, 0.4))
        pill(c, hx, hy - 330, "AUFGESTIEGEN", ap(t, 10.4, 0.3), 26)
    elif si == 1:  # ---------------------------------------- GEDULD
        c.rectangle(-400, GY, 1880, 1200); col(c, 0.06, 1); c.fill()
        c.move_to(-400, GY); c.line_to(1480, GY); stroke(c, 0.55, 1, 4)
        wk = "WOCHE 1" if t < 2.4 else ("WOCHE 3" if t < 4.4 else "WOCHE 5")
        pill(c, 330, 900, "UNGEDULDIG", ap(t, 0.3, 0.3) * (1 - ap(t, 5.0, 0.5)), 24, 0.7)
        pill(c, 750, 900, "GEDULDIG", ap(t, 0.5, 0.3) * (1 - ap(t, 5.8, 0.4)), 24)
        for sx in (330, 750):
            c.new_path(); c.arc(sx, GY - 6, 9, 0, 2 * math.pi); c.set_source_rgb(*ACC); c.fill()
        # impatient
        ia = 1 - ap(t, 5.0, 0.6)
        ix = 230 - 260 * ap(t, 4.6, 1.2)
        crouch = 0.7 if 2.4 <= t < 4.6 else 1
        person(c, ix, GY, 0.8, 0.85, sy=crouch, a=ia)
        if t < 2.4 and int(t * 6) % 2: 
            for k in range(3): c.new_path(); c.arc(318 + k * 10, GY - 60 + ((t * 300 + k * 30) % 50), 4, 0, 2 * math.pi); col(c, 0.8, ia); c.fill()
        # patient (waters until 5.8)
        person(c, 650, GY, 0.8)
        if t < 5.8:
            c.save(); c.translate(705, GY - 95); c.rotate(0.35); rrect(c, -10, -20, 50, 34, 6); stroke(c, 0.8, 1, 4); c.move_to(40, -10); c.line_to(70, 0); stroke(c, 0.8, 1, 4); c.restore()
            for k in range(4): c.new_path(); c.arc(748 + (k % 2) * 6, GY - 70 + ((t * 260 + k * 22) % 64), 4, 0, 2 * math.pi); c.set_source_rgba(0.7, 0.85, 1, 0.8); c.fill()
        # roots
        rp = ap(t, 6.4, 2.8)
        if rp > 0:
            md = max(r[4] for r in ROOTS) + 1
            for x1, y1, x2, y2, dd, w in ROOTS:
                k = cl(rp * md - dd)
                if k <= 0: continue
                c.move_to(x1, y1); c.line_to(lerp(x1, x2, k), lerp(y1, y2, k)); c.set_line_width(w * 0.9 + 1); c.set_source_rgba(*ACC, 0.9); c.stroke()
        if t > 9.0:
            bp = eout(ap(t, 9.4, 1.4))
            for k, (ox, hmax) in enumerate(((-26, 560), (0, 660), (28, 500))):
                h = hmax * bp
                c.move_to(750 + ox, GY); c.line_to(750 + ox, GY - h); stroke(c, 1, 1, 12)
                for n in range(1, int(h // 90) + 1):
                    yy = GY - n * 90; c.move_to(750 + ox - 9, yy); c.line_to(750 + ox + 9, yy); stroke(c, 0.4, 1, 4)
                    if n % 2 == k % 2:
                        sgn = 1 if (n + k) % 2 else -1
                        c.move_to(750 + ox, yy - 10); c.curve_to(750 + ox + 30 * sgn, yy - 40, 750 + ox + 60 * sgn, yy - 35, 750 + ox + 80 * sgn, yy - 50)
                        c.set_source_rgba(*ACC, 1); c.set_line_width(7); c.stroke()
            star(c, 650, GY - 300, 22, ap(t, 10.8, 0.4))
    elif si == 2:  # ---------------------------------------- PERFEKTIONIST VS MACHER
        ground(c, 1)
        cone(c, 330, 500, GY, 30, 230, 1); cone(c, 750, 500, GY, 30, 230, 1)
        for lx in (330, 750):
            rrect(c, lx - 50, 480, 100, 26, 13); col(c, 0.9, 1); c.fill()
        pill(c, 330, 600, "PERFEKTIONIST", ap(t, 0.2, 0.3), 26)
        pill(c, 750, 600, "MACHER", ap(t, 0.4, 0.3), 26)
        # tables
        for lx in (330, 750):
            c.move_to(lx - 190, GY - 130); c.line_to(lx + 190, GY - 130); c.move_to(lx - 170, GY - 130); c.line_to(lx - 170, GY); c.move_to(lx + 170, GY - 130); c.line_to(lx + 170, GY); stroke(c, 0.8, 1, 6)
        def canvas(x, y, prog, a=1):
            c.rectangle(x - 80, y - 110, 160, 110); c.set_source_rgba(0.5, 0.5, 0.52, a); c.fill()
            if prog > 0:
                c.save(); c.rectangle(x - 80, y - 110, 160 * prog, 110); c.clip()
                c.move_to(x - 80, y); c.line_to(x - 20, y - 70); c.line_to(x + 20, y - 30); c.line_to(x + 50, y - 55); c.line_to(x + 80, y); c.close_path(); c.set_source_rgba(0.2, 0.22, 0.28, a); c.fill()
                c.new_path(); c.arc(x + 45, y - 85, 14, 0, 2 * math.pi); c.set_source_rgba(*ACC, a); c.fill(); c.restore()
        # perfectionist: paints, erases, repaints
        cyc = (t * 0.6) % 1
        canvas(330, GY - 140, cl(cyc * 1.4) if cyc < 0.85 else 0)
        person(c, 200, GY, 0.85)
        nballs = int(t / 1.6)
        for i in range(min(nballs, 7)):
            c.new_path(); c.arc(120 + i * 38, GY - 14, 13, 0, 2 * math.pi); col(c, 0.85, 1); c.fill()
        text(c, 330, GY - 290, "#1", 40, 1, 0.8)
        # action taker
        n = min(14, 1 + int(t / 0.72))
        canvas(750, GY - 140, ((t / 0.72) % 1) * 1.5)
        person(c, 880, GY, 0.85)
        text(c, 750, GY - 290, f"#{n}", 40, 1, rgb=ACC)
        for i in range(n - 1):
            c.save(); c.translate(980 + (i % 2) * 6, GY - 8 - i * 9); c.rectangle(-60, -6, 120, 8); col(c, 0.9, 1); c.fill(); c.restore()
        pill(c, 330, 680, "WARTET AUF PERFEKT", ap(t, 6.5, 0.3), 22, 0.6)
        pill(c, 750, 680, "WIRD JEDEN TAG BESSER", ap(t, 7.5, 0.3), 22, 0.85)
    elif si == 3:  # ---------------------------------------- ZEIGEFINGER
        cone(c, 540, 300, GY, 40, 260, 1)
        ground(c, 1)
        sq = ap(t, 7.5, 2.0)
        person(c, 540, GY, 0.9, sy=lerp(1, 0.75, sq))
        for i, (lab, deg) in enumerate(HANDS):
            k = ap(t, 0.5 + i * 0.85, 0.5)
            if k <= 0: continue
            ang = math.radians(deg)
            dist = lerp(470, 270, ap(t, 0.5 + i * 0.85, 4.0)) * (1 + 0.3 * (1 - eout(k)))
            tx, ty = 540, GY - 120
            hx, hy = tx - dist * math.cos(ang), ty - dist * math.sin(ang)
            hand(c, hx, hy, ang, cl(k * 2), lab)
        k = ap(t, 9.6, 0.4)
        if k > 0:
            c.rectangle(-400, -400, 1880, 2800); c.set_source_rgba(0, 0, 0, 0.6 * k); c.fill()
            pill(c, 540, 700, "ZU VIEL IM KOPF", k, 30, 0.85)
    elif si == 4:  # ---------------------------------------- 3:07
        # window with moon
        rrect(c, 680, 580, 260, 200, 10); stroke(c, 0.6, 1, 5); c.move_to(810, 580); c.line_to(810, 780); stroke(c, 0.6, 1, 4)
        c.new_path(); c.arc(880, 640, 26, 0, 2 * math.pi); col(c, 1, 1); c.fill()
        # clock
        rrect(c, 150, 840, 220, 100, 12); col(c, 0.1, 1); c.fill_preserve(); stroke(c, 0.5, 1, 4)
        text(c, 260, 890, "03:07" if t < 5.5 else "03:08", 56, 1, rgb=RED)
        # bed
        c.rectangle(380, GY - 120, 560, 60); stroke(c, 0.8, 1, 6)
        c.move_to(380, GY - 220); c.line_to(380, GY); c.move_to(940, GY - 160); c.line_to(940, GY); stroke(c, 0.8, 1, 6)
        rrect(c, 395, GY - 165, 120, 45, 18); col(c, 0.75, 1); c.fill()
        sit = ap(t, 6.0, 0.8)
        person(c, lerp(610, 470, eout(sit)), GY - 120, 0.85, rot=lerp(-math.pi / 2, 0, eout(sit)) if sit > 0 else -math.pi / 2)
        if sit <= 0:
            c.rectangle(540, GY - 175, 390, 58); col(c, 0.55, 1); c.fill()
        thoughts = ["WAS WÄRE WENN…", "ZU SPÄT?", "NICHT GENUG", "MORGEN…", "WARUM ICH?"]
        for i, th in enumerate(thoughts):
            ph = (t * 0.32 + i / 5) % 1
            text(c, 520 + math.sin(i * 2.2) * 200, GY - 300 - ph * 420, th, 30, math.sin(math.pi * ph) * 0.9, 0.85, spacing=2)
        ground(c, 1)
    elif si == 5:  # ---------------------------------------- ENDE
        cone(c, 540, 300, GY, 40, 230, ap(t, 0, 0.8))
        ground(c, 1)
        person(c, 540, GY, 0.95)
        k = ap(t, 0.8, 1.2)
        if k > 0:
            c.new_path(); c.arc(540, GY - 130, 250, -math.pi / 2, -math.pi / 2 + 2 * math.pi * eout(k)); c.set_source_rgba(*ACC, 1); c.set_line_width(7); c.stroke()

def title(c, T):
    si = scene_at(T); t = T - TL[si]['start']
    if si == 1:
        if t < 5.8:
            wk = "WOCHE 1" if t < 2.4 else ("WOCHE 3" if t < 4.4 else "WOCHE 5")
            text(c, W / 2, 450, wk, 44, 1, 1, spacing=12)
        typed(c, W / 2, 450, "ES PASSIERT NICHTS.", 6.2, t, 40)
        if t > 9.3: typed(c, W / 2, 520, "BIS ALLES PASSIERT.", 9.4, t, 40, rgb=ACC)
    if si == 5:
        k = ap(t, 2.0, 0.5)
        c.save(); c.translate(W / 2, 560); s = 1 + 0.2 * (1 - eout(k)); c.scale(s, s)
        c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(110)
        w = c.text_extents("MENTALITÄT.").x_advance
        c.move_to(-w / 2, 40); c.set_source_rgba(1, 1, 1, k); c.show_text("MENTALITÄT"); c.set_source_rgba(*ACC, k); c.show_text(".")
        c.restore()
    else:
        c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(64)
        w = c.text_extents("MENTALITÄT.").x_advance
        c.move_to(W / 2 - w / 2, 330 + 23); c.set_source_rgba(1, 1, 1, 0.95 * cl(T / 0.5)); c.show_text("MENTALITÄT"); c.set_source_rgb(*ACC); c.show_text(".")

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
    OV[0].identity_matrix(); title(OV[0], T)
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
