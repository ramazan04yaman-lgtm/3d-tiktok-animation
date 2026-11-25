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

def typed(c, x, y, s, t0, t, size=40, cps=18, rgb=None):
    n = int(max(0, (t - t0)) * cps)
    if n <= 0: return
    sh = s[:n] + ("▌" if n < len(s) else "")
    text(c, x, y, sh, size, 1, 1, spacing=size * 0.1, rgb=rgb)

RED = (1.0, 0.3, 0.28)
LX, RX = 280, 800      # house centers
HW = 230               # half width
TRIPS = [2.0, 8.5, 15.0, 21.5]
TRIP_LEN = 3.0

def person(c, x, y=GY, s=0.75, g=1., a=1., sy=1.):
    if a <= 0: return
    c.save(); c.translate(x, y); c.scale(s, s * sy)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2); c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    col(c, g, a); c.fill(); c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill(); c.restore()

def hat(c, x, y, a):
    c.save(); c.translate(x, y)
    c.move_to(-46, 0); c.line_to(46, 0); c.set_source_rgba(*ACC, a); c.set_line_width(8); c.stroke()
    c.new_path(); c.arc(0, 0, 24, math.pi, 2 * math.pi); c.close_path(); c.fill(); c.restore()

def suitcase(c, x, y, a, rgb=(0.45, 0.7, 1.0)):
    rrect(c, x - 30, y - 44, 60, 44, 6); c.set_source_rgba(*rgb, a); c.set_line_width(4); c.stroke()
    c.move_to(x - 10, y - 44); c.line_to(x - 10, y - 54); c.line_to(x + 10, y - 54); c.line_to(x + 10, y - 44); c.stroke()

def house(c, cx):
    c.move_to(cx - HW - 20, GY - 380); c.line_to(cx, GY - 480); c.line_to(cx + HW + 20, GY - 380); stroke(c, 0.75, 1, 6)
    c.move_to(cx - HW, GY - 380); c.line_to(cx - HW, GY); c.move_to(cx + HW, GY - 380); c.line_to(cx + HW, GY); stroke(c, 0.6, 1, 6)
    c.move_to(cx - HW - 10, GY); c.line_to(cx + HW + 10, GY); stroke(c, 0.75, 1, 6)
    # lamp cone
    c.move_to(cx - 12, GY - 372); c.line_to(cx + 12, GY - 372); c.line_to(cx + 150, GY); c.line_to(cx - 150, GY); c.close_path()
    lg = cairo.LinearGradient(0, GY - 372, 0, GY); lg.add_color_stop_rgba(0, 1, 0.95, 0.85, 0.12); lg.add_color_stop_rgba(1, 1, 0.95, 0.85, 0.02); c.set_source(lg); c.fill()

def door(c, x, a=1.):
    rrect(c, x - 40, GY - 190, 80, 190, 6); stroke(c, 0.6, a, 4); c.new_path(); c.arc(x + 25, GY - 95, 5, 0, 2 * math.pi); col(c, 0.6, a); c.fill()

def fridge(c, x, broken=0., fixed=0., a=1., sold=0.):
    if sold > 0: c.set_dash([8, 8])
    rrect(c, x - 34, GY - 170, 68, 170, 6); stroke(c, 0.85 * (1 - 0.5 * sold), a, 4)
    c.move_to(x - 34, GY - 110); c.line_to(x + 34, GY - 110); stroke(c, 0.85 * (1 - 0.5 * sold), a, 3); c.set_dash([])
    if broken > 0 and fixed < 1:
        c.save(); c.translate(x, GY - 140); c.scale(broken, broken); c.new_path()
        for i in range(14):
            rr = 34 if i % 2 == 0 else 14; th = i * math.pi / 7
            (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
        c.close_path(); c.set_source_rgba(*RED, 1 - fixed); c.fill(); c.restore()

def armchair(c, x, sold=0.):
    if sold > 0: c.set_dash([8, 8])
    c.move_to(x - 50, GY); c.line_to(x - 50, GY - 80); c.line_to(x - 36, GY - 80); c.line_to(x - 36, GY - 40); c.line_to(x + 36, GY - 40); c.line_to(x + 36, GY - 80); c.line_to(x + 50, GY - 80); c.line_to(x + 50, GY)
    c.move_to(x - 36, GY - 80); c.line_to(x - 30, GY - 120); c.line_to(x + 30, GY - 120); c.line_to(x + 36, GY - 80)
    c.set_source_rgba(*(RED if sold == 0 else (0.5, 0.5, 0.5)), 1 - 0.5 * sold); c.set_line_width(4); c.stroke(); c.set_dash([])

def tv(c, x, y, sold=0.):
    if sold > 0: c.set_dash([8, 8])
    rrect(c, x - 44, y - 30, 88, 60, 6); c.set_source_rgba(0.55, 0.75, 1, 0.9 * (1 - 0.6 * sold)); c.set_line_width(4); c.stroke(); c.set_dash([])

def photo(c, x, y, k, i):
    if k <= 0: return
    c.save(); c.translate(x, y); s = back(k); c.scale(s, s)
    c.rectangle(-26, -20, 52, 40); col(c, 0.9, 1); c.set_line_width(3); c.stroke()
    c.move_to(-22, 16); c.line_to(-6, -2); c.line_to(6, 8); c.line_to(22, -8); c.line_to(22, 16); c.close_path()
    c.set_source_rgba(*[(0.45, 0.7, 1.0), ACC, (0.5, 0.9, 0.6), (1, 0.6, 0.5)][i % 4], 0.9); c.fill()
    c.restore()

def debtbag(c, x, y, s, a):
    if s <= 0: return
    c.save(); c.translate(x, y); c.scale(s, s)
    c.new_path(); c.arc(0, 0, 40, 0, 2 * math.pi); c.set_source_rgba(*RED, a); c.fill()
    c.move_to(-14, -38); c.line_to(0, -52); c.line_to(14, -38); c.fill()
    text(c, 0, 2, "SCHULDEN", 15, a, 1.0); c.restore()

def jar(c, x, fill, a=1.):
    w, h = 90, 140
    if fill > 0:
        fh = (h - 10) * cl(fill)
        n = int(fill * 24)
        for i in range(n):
            r_, k = divmod(i, 3)
            c.new_path(); c.arc(x - 26 + k * 26, GY - 70 - 12 - r_ * 14, 12, 0, 2 * math.pi); c.set_source_rgba(*ACC, 0.95); c.fill()
    rrect(c, x - w / 2, GY - 70 - h, w, h, 14); stroke(c, 0.9, a, 4)
    # cabinet under jar
    c.rectangle(x - 55, GY - 70, 110, 70); stroke(c, 0.6, a, 4)

def tree(c, x, y, g):
    if g <= 0: return
    h = 120 * g
    c.move_to(x, y); c.line_to(x, y - h); c.set_source_rgba(0.45, 0.85, 0.5, 1); c.set_line_width(6); c.stroke()
    for i, (dx, dy, r) in enumerate(((0, -h - 20, 34), (-30, -h, 26), (30, -h + 4, 26))):
        c.new_path(); c.arc(x + dx * g, y + dy, r * g, 0, 2 * math.pi); c.set_source_rgba(0.35, 0.75, 0.42, 0.9); c.fill()
    if g > 0.6:
        for dx, dy in ((-12, -h - 26), (16, -h - 6), (-30, -h + 2)):
            c.new_path(); c.arc(x + dx, y + dy, 8, 0, 2 * math.pi); c.set_source_rgba(*ACC, cl((g - 0.6) * 3)); c.fill()

def popup(c, x, y, s, t, t0, rgb):
    k = ap(t, t0, 0.3) * (1 - ap(t, t0 + 1.2, 0.4))
    if k > 0: text(c, x, y - 40 * ap(t, t0, 1.6), s, 30, k, rgb=rgb)

def camera(T):
    return 540, 980 - 70, 1.0 * 1.12

def scene_at(T): return 0

def draw(c, T):
    t = T
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    c.move_to(-200, GY + 4); c.line_to(1300, GY + 4); stroke(c, 0.35, 1, 3)
    house(c, LX); house(c, RX)
    pill(c, LX, GY + 70, "GIBT AUS", ap(t, 0.5, 0.3), 26, 0.6)
    pill(c, RX, GY + 70, "SPART", ap(t, 0.8, 0.3), 26)
    # ---------------- LEFT house
    door(c, LX - 160)
    sold_chair = ap(t, 34.5, 0.4); sold_tv = ap(t, 36.5, 0.4)
    armchair(c, LX + 30, sold_chair)
    tv(c, LX + 30, GY - 230, sold_tv)
    fridge(c, LX + 170, broken=ap(t, 30.0, 0.3), fixed=0, sold=ap(t, 38.5, 0.4))
    ntrip = sum(1 for tt in TRIPS if t > tt + TRIP_LEN - 0.3)
    for i in range(4):
        photo(c, LX - 120 + (i % 2) * 64, GY - 320 + (i // 2) * 52, ap(t, TRIPS[i] + TRIP_LEN - 0.3, 0.3), i)
    bag = 0 if ntrip == 0 else 0.6 + 0.18 * ntrip + 0.35 * ap(t, 30.5, 1.0) + 0.2 * ap(t, 34.5, 1.0)
    bx, by = LX + 120, GY - 330
    if bag > 0:
        for i in range(ntrip):
            px, py = LX - 120 + (i % 2) * 64, GY - 320 + (i // 2) * 52
            c.move_to(bx, by); c.line_to(px + 20, py); c.set_source_rgba(*RED, 0.6); c.set_line_width(2); c.stroke()
        debtbag(c, bx, by, bag, 1)
    # left person: away during trips
    away = 0; hatk = 0; lx = LX - 60
    for tt in TRIPS:
        if tt <= t < tt + TRIP_LEN:
            u = (t - tt) / TRIP_LEN
            hatk = 1
            if u < 0.3: lx = lerp(LX - 60, LX - 160, u / 0.3); away = ap(u, 0.2, 0.1)
            elif u < 0.75: away = 1
            else: lx = lerp(LX - 160, LX - 60, (u - 0.75) / 0.25); away = 1 - ap(u, 0.75, 0.08)
    kneel = ap(t, 40.0, 0.6)
    person(c, lx, GY, 0.72, a=1 - away, sy=lerp(1, 0.62, kneel))
    if hatk and away < 1:
        hat(c, lx, GY - 205 * 0.72 - 12, 1 - away); suitcase(c, lx + 50, GY - 10, 1 - away)
    for i, tt in enumerate(TRIPS):
        popup(c, LX, GY - 420, "−2.000 €", t, tt + TRIP_LEN - 0.3, RED)
    popup(c, LX + 170, GY - 220, "−800 €", t, 30.6, RED)
    for tt, s in ((34.5, "VERKAUFT"), (36.5, "VERKAUFT"), (38.5, "VERKAUFT")):
        popup(c, LX, GY - 260, s, t, tt, (0.8, 0.8, 0.8))
    # ---------------- RIGHT house
    door(c, RX + 170)
    armchair(c, RX - 120)
    tv(c, RX - 120, GY - 230)
    fridge(c, RX - 190 + 10, broken=ap(t, 30.0, 0.3), fixed=ap(t, 32.5, 0.4))
    nco = int(cl((t - 1.0) / 1.25, 0, 22))
    spent = 6 if t > 31.5 else 0
    fill = cl((nco - spent) / 24 + 0.35 * ap(t, 38, 3.0), 0, 1.0)
    jx = RX + 40
    jar(c, jx, fill)
    tree(c, jx, GY - 210, cl((nco - 2) / 16) * 1.0 + 0.25 * ap(t, 38, 3))
    # coin drop
    if 1.0 < t < 28.5:
        ph = ((t - 1.0) / 1.25) % 1
        if ph < 0.5:
            c.new_path(); c.arc(jx, GY - 360 + ph * 2 * 130, 11, 0, 2 * math.pi); c.set_source_rgba(*ACC, 1); c.fill()
    # coins to fridge
    k = ap(t, 31.0, 1.4)
    if 0 < k < 1:
        for i in range(4):
            u = cl(k * 1.4 - i * 0.12)
            c.new_path(); c.arc(lerp(jx, RX - 180, u), lerp(GY - 200, GY - 140, u) - 60 * math.sin(math.pi * u), 11, 0, 2 * math.pi); c.set_source_rgba(*ACC, 1 - ap(u, 0.9, 0.1)); c.fill()
    check_circle(c, RX - 180, GY - 230, 22, ap(t, 32.6, 0.3) * (1 - ap(t, 35, 0.5)), True)
    # overflow pile
    pk = ap(t, 39.5, 3.5)
    if pk > 0:
        for i in range(int(30 * pk)):
            r_, k_ = divmod(i, 8)
            c.new_path(); c.arc(jx - 80 + k_ * 22 + (r_ % 2) * 11, GY - 12 - r_ * 18, 11, 0, 2 * math.pi); c.set_source_rgba(*ACC, 0.95); c.fill()
    # right person
    go = ap(t, 44.0, 2.5)
    rxp = lerp(RX - 40, RX + 170, ease(go))
    person(c, rxp, GY, 0.72, a=1 - ap(t, 46.3, 0.4))
    if t > 43.0:
        hk = ap(t, 43.0, 0.4) * (1 - ap(t, 46.3, 0.4))
        hat(c, rxp, GY - 205 * 0.72 - 12, hk); suitcase(c, rxp + 50, GY - 10, hk)
    popup(c, RX, GY - 420, "+ URLAUB", t, 44.5, ACC)
    if 2 < t < 27:
        if int(t / 1.25) % 4 == 0: popup(c, jx, GY - 400, "+100 €", t, int(t / 1.25) * 1.25, ACC)

def title(c, T):
    t = T
    a = cl(T / 0.6) * (1 - ap(t, 46.5, 0.4))
    c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(64)
    w = c.text_extents("FOKUS.").x_advance
    c.move_to(W / 2 - w / 2, 330 + 23); c.set_source_rgba(1, 1, 1, 0.95 * a); c.show_text("FOKUS"); c.set_source_rgba(*ACC, a); c.show_text(".")
    # mid CTA
    k = ap(t, 24.0, 0.4) * (1 - ap(t, 28.6, 0.4))
    if k > 0:
        c.save(); c.translate(W / 2, 470); c.scale(back(min(1, k * 1.2)), back(min(1, k * 1.2)))
        c.new_path(); c.save(); c.translate(-170, 0); c.scale(1.3, 1.3); c.move_to(0, 14); c.curve_to(-34, -8, -20, -38, 0, -20); c.curve_to(20, -38, 34, -8, 0, 14); c.restore()
        c.set_source_rgba(*ACC, k); c.fill()
        pressed = t > 26.2
        rrect(c, -80, -38, 260, 76, 38)
        if pressed: c.set_source_rgba(*ACC, k); c.fill(); text(c, 50, 0, "✓ GEFOLGT", 30, k, 0.05)
        else: c.set_source_rgba(*ACC, k); c.set_line_width(5); c.stroke(); text(c, 50, 0, "FOLGEN", 32, k, rgb=ACC)
        kk = ap(t, 25.2, 0.8)
        if kk > 0 and not pressed:
            px, py = lerp(260, 80, eout(kk)), lerp(120, 10, eout(kk))
            c.new_path(); c.move_to(px, py); c.line_to(px, py + 48); c.line_to(px + 12, py + 36); c.line_to(px + 29, py + 41); c.close_path(); c.set_source_rgba(1, 1, 1, k); c.fill()
        c.restore()
    # ending text
    typed(c, W / 2, 470, "ER HAT SEINE REISEN ZWEIMAL BEZAHLT.", 46.8, t, 43, cps=24)
    typed(c, W / 2, 545, "SEINE ERSPARNISSE HABEN SEINE BEZAHLT.", 48.6, t, 43, cps=24, rgb=ACC)

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
