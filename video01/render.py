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

ACCENT = ["freunde","gehalt","millionär","nichts","23","3000","gehaltserhöhung","500","gönnt","auto","bisher","investiert",
          "aus","wohnung","urlaube","steigt","nichts","lacht","altes","86000","20","260000","sieht","härter","million","222000",
          "genauso","nichts","verdient","behält","also","du"]
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
        groups.append((st, en, g, ACCENT[k] if k < len(ACCENT) else ""))
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

# ---------------------------------------------------------------- scenes
CAM = [(540, 1000, 1.18, 1.0), (540, 920, 1.0, 1.03), (540, 960, 1.0, 1.02), (540, 940, 1.02, 1.04),
       (380, 1020, 1.12, 1.18), (700, 1020, 1.12, 1.18), (440, 920, 1.05, 1.1), (540, 900, 1.0, 1.03),
       (540, 920, 1.0, 1.03), (650, 960, 1.08, 1.13), (540, 860, 1.0, 1.04), (600, 920, 1.0, 1.05),
       (420, 960, 1.08, 1.14), (540, 900, 1.0, 1.04), (560, 1000, 0.95, 1.1)]

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

def jar_fill(si, t, d, P):
    if si < 5: return None
    if si == 5: return 0.02 + 0.04 * ap(t, P[1], d - P[1])
    if si in (6, 7): return 0.06
    if si == 8: return lerp(0.06, 0.12, ap(t, P[2], 1.0))
    if si == 9: return lerp(0.12, 0.3, ap(t, P[1], 1.2))
    if si == 10: return 0.3
    if si == 11: return lerp(0.3, 1.0, eout(ap(t, 0.1, P[1])))
    return 1.0

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    chart_scene = si in (7, 10)
    # ------------------------------------------- persistent world
    ground(c, ap(T, 0, 0.5))
    gmax = 1.0; gtom = 1.0
    if si == 1: gmax = lerp(1, 0.35, ap(t, P[1], 0.4))
    if si == 4: gtom = 0.3
    if si == 5: gmax = 0.3
    if si in (6, 8): gtom = 0.45
    if si == 11: gmax = 0.35
    if si == 12: gmax = lerp(1, 0.35, ap(t, P[1], 0.5)); gtom = 0.35
    if chart_scene: gmax = gtom = 0.25
    fa = back(ap(T, 0.05, 0.4)); fb = back(ap(T, 0.2, 0.4))
    figure(c, MX, GY, fa, gmax); figure(c, TX, GY, fb, gtom)
    if si >= 2:
        k = ap(T, TL[2]['start'], 0.35) if si == 2 else 1
        pill(c, MX, GY + 60, "MAX", k, 26, 0.75 * (0.5 if chart_scene else 1)); pill(c, TX, GY + 60, "TOM", k, 26, 0.75 * (0.5 if chart_scene else 1))
    if si >= 4:
        k = ap(t, P[1], 0.4) if si == 4 else 1
        car(c, 200, GY, 0.85, k, 0.3 if chart_scene or si in (5, 11) else 1)
    jf = jar_fill(si, t, d, P)
    if jf is not None:
        k = ap(t, P[1], 0.4) if si == 5 else 1
        drop = 1 if (si == 5 and t > P[1]) or si in (8, 9, 11) else 0
        jar(c, 880, GY, k, jf, T, 0.35 if chart_scene else 1, drop * (0.3 if chart_scene else 1))

    # ------------------------------------------- per scene
    if si == 0:
        k = ap(t, 0.25, 0.35)
        text(c, 540, GY - 110, "=", 90, k, 0.7)
        pill(c, 540, 640, "GLEICHER JOB", ap(t, P[1], 0.3), 32)
        pill(c, 540, 730, "GLEICHES GEHALT", ap(t, P[1] + 0.45, 0.3), 32)
    elif si == 1:
        pill(c, 540, 560, "MIT 60", ap(t, 0, 0.3), 32)
        k = ap(t, 0.15, P[1] - 0.2)
        spotlight(c, TX, ap(t, 0.1, 0.5))
        val = 1_000_000 * eout(k) ** 1.5
        text(c, TX, 800, fmt(val), 74, ap(t, 0.1, 0.2), rgb=ACC)
        pill(c, TX, 710, "MILLIONÄR", ap(t, P[1] - 0.3, 0.3), 28)
        text(c, MX, 960, "0 €", 74, ap(t, P[1], 0.3), 0.55)
        pill(c, MX, 880, "PLEITE", ap(t, P[1] + 0.25, 0.3), 28, 0.55)
    elif si == 2:
        pill(c, 540, 600, "23 JAHRE ALT", ap(t, 0.2, 0.3), 32)
        for x, dl in ((MX, 0), (TX, 0.15)):
            k = ap(t, P[1] + dl, 0.35)
            pill(c, x, 790, "GEHALT", k, 24, 0.6)
            text(c, x, 870, "3.000 €", 66, cl(k * 2))
    elif si == 3:
        up = ap(t, P[1], 0.6)
        for x, dl in ((MX, 0), (TX, 0.15)):
            pill(c, x, 790, "GEHALT", 1, 24, 0.6)
            text(c, x, 870, fmt(3000 + 500 * eout(ap(t, P[1] + 0.2 + dl, 0.6))), 66)
            pill(c, x, 690, "+500 €", ap(t, P[1] + dl, 0.35), 30)
            arrow_up(c, x - 150, 870, ap(t, 0.5 + dl, 0.4))
        pill(c, 540, 540, "GEHALTSERHÖHUNG", ap(t, 0.2, 0.3), 32)
    elif si == 4:
        k = ap(t, 0.1, 0.3)
        pill(c, MX, 790, "+500 €", k * (1 - ap(t, P[1] + 0.5, 0.3)), 30)
        # money flies into car
        f = eout(ap(t, P[1] + 0.5, 0.5))
        if 0 < f < 1:
            c.arc(lerp(MX, 200, f), lerp(790, GY - 120, f), 18 * (1 - f) + 6, 0, 2 * math.pi); col(c, 1, 1 - f); c.fill()
        pill(c, 200, GY - 200, "NEUES AUTO", ap(t, P[1] + 0.2, 0.3), 26)
        pill(c, 200, GY - 270, "−500 € / MONAT", ap(t, P[1] + 0.9, 0.3), 24, 0.55)
    elif si == 5:
        pill(c, TX, 790, "+500 €", ap(t, 0.1, 0.3) * (1 - ap(t, P[1] + 0.4, 0.3)), 30)
        pill(c, 880, GY - 330, "INVESTIERT", ap(t, P[1] + 0.2, 0.3), 26)
        pill(c, 880, GY - 400, "500 € / MONAT", ap(t, P[1] + 0.6, 0.3), 24, 0.55)
        pill(c, TX, 690, "LEBT WIE VORHER", ap(t, 0.5, 0.3), 26, 0.6)
    elif si == 6:
        pill(c, 540, 600, "MEHR VERDIENT = MEHR AUSGEGEBEN", ap(t, 0.3, 0.3), 26)
        house(c, 300, 860, 0.9, ap(t, P[1], 0.35))
        pill(c, 300, 905, "−1.400 €", ap(t, P[1] + 0.25, 0.3), 24, 0.6)
        plane(c, 500, 760, 0.9, ap(t, P[2], 0.35))
        pill(c, 500, 905, "−4.000 €", ap(t, P[2] + 0.25, 0.3), 24, 0.6)
    elif si == 7:
        chart(c, ap(t, 0, 0.4), (ap(t, 0.2, P[1] - 0.2 + 0.6), ap(t, P[1], 1.2)), 'lifestyle', t, ("EINKOMMEN", "AUSGABEN"))
        pill(c, 540, 400, "KONTO: 0 €", ap(t, P[1] + 1.0, 0.3), 32)
    elif si == 8:
        pill(c, 540, 470, "JAHRE SPÄTER", ap(t, 0, 0.3), 24, 0.6)
        text(c, 540, 560, "+10", 110, ap(t, 0.1, 0.3))
        bubble(c, MX + 90, GY - 290, "HAHA", ap(t, 0.8, 0.3))
        pill(c, TX, GY - 270, "ALTES AUTO", ap(t, P[1] + 0.2, 0.3), 24, 0.6)
        text(c, 790, 820, fmt(86542 * eout(ap(t, P[2], 1.0))), 52, ap(t, P[2], 0.2), rgb=ACC)
        pill(c, 790, 740, "DEPOT", ap(t, P[2], 0.3), 24, 0.6)
    elif si == 9:
        pill(c, 540, 470, "JAHRE SPÄTER", 1, 24, 0.6)
        text(c, 540, 560, "+20", 110, 1)
        text(c, 800, 820, fmt(lerp(86542, 260463, eout(ap(t, 0.2, P[1] + 0.6)))), 56, rgb=ACC)
        pill(c, 800, 740, "DEPOT", 1, 24, 0.6)
    elif si == 10:
        chart(c, ap(t, 0, 0.4), (ap(t, 0.2, d - 0.6), ap(t, 0.4, d - 1.2)), 'compound', t, ("", "EINGEZAHLT"))
        pill(c, 540, 400, "ZINSESZINS", ap(t, P[1], 0.3), 32)
    elif si == 11:
        spotlight(c, 790, ap(t, 0, 0.6))
        pill(c, 600, 470, "MIT 60", ap(t, 0, 0.3), 30)
        text(c, 600, 600, fmt(lerp(260463, 1048272, eout(ap(t, 0.1, P[1])))), 92, rgb=ACC)
        pill(c, 600, 720, "EINGEZAHLT: 222.000 €", ap(t, P[1] + 0.3, 0.3), 28, 0.6)
    elif si == 12:
        pill(c, MX, 700, "GENAUSO VIEL VERDIENT", ap(t, 0.3, 0.3), 26)
        check_circle(c, MX, 820, 46, ap(t, 0.6, 0.35), True)
        pill(c, MX, 950, "BEHALTEN: 0 €", ap(t, P[1] + 0.1, 0.3), 26)
        check_circle(c, MX + 230, 950, 40, ap(t, P[1] + 0.3, 0.35), False)
    elif si == 13:
        for i, (lab, ok, t0) in enumerate((("VERDIENEN", False, 0.4), ("BEHALTEN", True, P[1] + 0.2))):
            y = 560 + i * 260; k = ap(t, t0, 0.4)
            if k <= 0: continue
            g = 1.0 if ok else lerp(1, 0.45, ap(t, P[1], 0.4))
            c.save(); c.translate(540, y); s_ = back(k); c.scale(s_, s_)
            rrect(c, -330, -90, 660, 180, 18); stroke(c, g, cl(k * 2), 5)
            text(c, -40, 0, lab, 64, cl(k * 2), g, rgb=ACC if ok else None)
            c.restore()
            check_circle(c, 800, y, 44, ap(t, t0 + 0.4, 0.35), ok, g)
        pill(c, 540, 400, "WAS REICH MACHT", ap(t, 0.1, 0.3), 26, 0.6)
    elif si == 14:
        for x, dl in ((MX, 0.2), (TX, 0.45)):
            k = ap(t, P[1] + dl, 0.35)
            if k > 0:
                c.save(); c.translate(x, GY - 300); s_ = back(k); c.scale(s_, s_); text(c, 0, 0, "?", 110, cl(k * 2)); c.restore()
        pill(c, 540, 620, "WER BIST DU?", ap(t, P[1] + 0.8, 0.35), 40)

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
