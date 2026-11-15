"""Code-gezeichnete Szenen (SVG) im Graustufen-Comic-Stil mit roten Glow-Akzenten."""
import math
import random

W, H = 1080, 1920
INK = "#0d0d0d"
RED = "#ff2b2b"


def drips(seed=1, color="#111", top=True):
    r = random.Random(seed)
    x = 1080
    d = "M0,0 L1080,0 "
    pts = []
    while x > 0:
        w = r.randint(40, 130)
        nx = max(0, x - w)
        if r.random() < 0.45:
            ln = r.randint(50, 170)
            mid = (x + nx) / 2
            dw = min(28, w / 3)
            pts.append(f"L{x},{r.randint(18, 40)} Q{mid + dw},{r.randint(20, 40)} {mid + dw * 0.6},{ln} "
                       f"A{dw * 0.6},{dw * 0.6} 0 0 1 {mid - dw * 0.6},{ln} Q{mid - dw},{r.randint(20, 40)} {nx},{r.randint(18, 40)} ")
        else:
            pts.append(f"Q{(x + nx) / 2},{r.randint(30, 70)} {nx},{r.randint(18, 40)} ")
        x = nx
    d += "L1080,30 " + "".join(pts) + "Z"
    return f'<path d="{d}" fill="{color}" stroke="{INK}" stroke-width="6" filter="url(#rough)"/>'


def svg(body, bg=("#3c3c3c", "#1d1d1d"), drip=True, vig=0.7, seed=1, overlay=""):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="{seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="45"/></filter>
<filter id="glowS" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9"/><feColorMatrix type="saturate" values="0"/></filter>
<radialGradient id="vig" cx="50%" cy="48%" r="72%"><stop offset="50%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="{vig}"/></radialGradient>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bg[0]}"/><stop offset="1" stop-color="{bg[1]}"/></linearGradient>
<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<g filter="url(#rough)" stroke="{INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">{body}</g>
{overlay}
{drips(seed) if drip else ""}
<rect width="{W}" height="{H}" fill="url(#vig)"/>
<rect width="{W}" height="{H}" filter="url(#grain)" opacity="0.06"/>
</svg>'''


def glow(cx, cy, r, color=RED, op=0.75, f="glow"):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" opacity="{op}" stroke="none" filter="url(#{f})"/>'


# ---------------------------------------------------------------- Figur
def face(expr="scared", look=(0, 0), s=1.0):
    lx, ly = look
    out = []
    for sx in (-1, 1):
        ex = sx * 33
        if expr == "wide":
            out.append(f'<ellipse cx="{ex}" cy="2" rx="24" ry="29" fill="#f4f4f4" stroke-width="5"/>')
            out.append(f'<circle cx="{ex + lx}" cy="{2 + ly}" r="5" fill="{INK}" stroke="none"/>')
        else:
            out.append(f'<ellipse cx="{ex}" cy="4" rx="17" ry="21" fill="#f4f4f4" stroke-width="5"/>')
            out.append(f'<circle cx="{ex + lx}" cy="{6 + ly}" r="9" fill="{INK}" stroke="none"/>')
            out.append(f'<circle cx="{ex + lx + 3}" cy="{2 + ly}" r="3" fill="#fff" stroke="none"/>')
        if expr in ("scared", "wide"):
            out.append(f'<path d="M{ex - sx * 22},{-30} Q{ex},{-44} {ex + sx * 20},{-38}" fill="none" stroke-width="6"/>')
        else:
            out.append(f'<path d="M{ex - 20},{-28} L{ex + 20},{-28}" fill="none" stroke-width="6"/>')
    if expr in ("scared", "wide"):
        out.append('<path d="M-16,50 Q0,40 16,50 Q10,64 0,64 Q-10,64 -16,50Z" fill="#2a2a2a" stroke-width="5"/>')
        out.append('<path d="M-40,-62 Q-30,-70 -22,-60" fill="none" stroke-width="3" opacity="0.6"/>')
    else:
        out.append('<path d="M-14,52 Q0,48 14,52" fill="none" stroke-width="5"/>')
    return "".join(out)


def person(x, y, s=1.0, view="front", expr="scared", look=(0, 0), body=True, extra=""):
    g = [f'<g transform="translate({x},{y}) scale({s})">']
    if body:
        g.append('<path d="M-72,70 C-160,100 -185,210 -195,520 L195,520 C185,210 160,100 72,70 Z" fill="#2c2c2c"/>')
        g.append('<path d="M-72,70 C-160,100 -185,210 -195,520 L195,520 C185,210 160,100 72,70 Z" fill="url(#shade)" stroke="none"/>')
    g.append('<ellipse cx="0" cy="-5" rx="118" ry="122" fill="#242424"/>')
    if view == "front":
        g.append('<ellipse cx="0" cy="0" rx="84" ry="96" fill="#d2d2d2"/>')
        g.append('<path d="M-88,-8 C-96,-92 -30,-122 10,-118 C74,-116 100,-62 88,-6 C64,-52 24,-66 -6,-50 C-34,-66 -62,-44 -88,-8Z" fill="#141414"/>')
        g.append(face(expr, look))
        if body:
            g.append('<path d="M-30,110 L-36,200 M30,110 L36,200" fill="none" stroke="#bbb" stroke-width="5"/>')
    else:
        g.append('<ellipse cx="0" cy="0" rx="86" ry="96" fill="#161616"/>')
        g.append('<path d="M-60,-40 Q-20,-70 30,-50" fill="none" stroke="#333" stroke-width="5"/>')
    g.append(extra)
    g.append("</g>")
    return "".join(g)


def mask_face(x, y, s=1.0, op=1.0):
    return (f'<g transform="translate({x},{y}) scale({s})" opacity="{op}">'
            '<ellipse cx="0" cy="0" rx="90" ry="118" fill="#efefef"/>'
            '<ellipse cx="-30" cy="-22" rx="9" ry="14" fill="#0d0d0d" stroke="none"/>'
            '<ellipse cx="30" cy="-22" rx="9" ry="14" fill="#0d0d0d" stroke="none"/>'
            '<path d="M-48,40 L-34,26 L-20,44 L-6,26 L8,44 L22,26 L36,44 L48,30" fill="none" stroke-width="6"/>'
            '</g>')


# ---------------------------------------------------------------- Requisiten
def phone(x, y, w, h, rot=0, screen="", glow_on=True, glow_col=RED):
    g = f'<g transform="translate({x},{y}) rotate({rot})">'
    if glow_on:
        g += f'<rect x="{-w * 0.6}" y="{-h * 0.6}" width="{w * 1.2}" height="{h * 1.2}" rx="60" fill="{glow_col}" opacity="0.55" stroke="none" filter="url(#glow)"/>'
    g += f'<rect x="{-w / 2}" y="{-h / 2}" width="{w}" height="{h}" rx="{w * 0.12}" fill="#151515"/>'
    g += f'<rect x="{-w / 2 + w * 0.06}" y="{-h / 2 + w * 0.08}" width="{w * 0.88}" height="{h - w * 0.16}" rx="{w * 0.07}" fill="#3a1414" stroke-width="3"/>'
    g += f'<rect x="{-w / 2 + w * 0.06}" y="{-h / 2 + w * 0.08}" width="{w * 0.88}" height="{h - w * 0.16}" rx="{w * 0.07}" fill="{glow_col}" opacity="0.28" stroke="none"/>'
    g += screen + "</g>"
    return g


def txt(x, y, s, size, fill="#fff", weight=700, anchor="middle", op=1, family="Inter"):
    return (f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'text-anchor="{anchor}" stroke="none" opacity="{op}">{s}</text>')


def car_rear(x, y, s=1.0, lights=True):
    g = f'<g transform="translate({x},{y}) scale({s})">'
    if lights:
        g += glow(-110, -60, 60, op=0.8, f="glowS") + glow(110, -60, 60, op=0.8, f="glowS")
    g += '<path d="M-150,-110 Q-140,-200 -100,-210 L100,-210 Q140,-200 150,-110 L165,-20 L-165,-20 Z" fill="#5a5a5a"/>'
    g += '<path d="M-110,-120 Q-100,-190 -80,-195 L80,-195 Q100,-190 110,-120Z" fill="#202020"/>'
    g += '<rect x="-170" y="-110" width="340" height="95" rx="16" fill="#6d6d6d"/>'
    g += f'<rect x="-150" y="-85" width="70" height="30" rx="8" fill="{RED}" stroke-width="5"/>'
    g += f'<rect x="80" y="-85" width="70" height="30" rx="8" fill="{RED}" stroke-width="5"/>'
    g += '<rect x="-45" y="-75" width="90" height="34" rx="4" fill="#ddd" stroke-width="4"/>'
    g += '<rect x="-160" y="-20" width="60" height="45" rx="10" fill="#111"/><rect x="100" y="-20" width="60" height="45" rx="10" fill="#111"/>'
    g += '</g>'
    return g


def window_grid(x0, y0, x1, y1, cols, rows, lit_p=0.0, seed=1, fill="#1a1a1a"):
    r = random.Random(seed)
    out = []
    cw, rh = (x1 - x0) / cols, (y1 - y0) / rows
    for i in range(cols):
        for j in range(rows):
            lit = r.random() < lit_p
            c = "#e6e6e6" if lit else fill
            out.append(f'<rect x="{x0 + i * cw + cw * 0.18:.0f}" y="{y0 + j * rh + rh * 0.15:.0f}" width="{cw * 0.64:.0f}" height="{rh * 0.62:.0f}" fill="{c}" stroke-width="4"/>')
            if lit:
                out.append(f'<rect x="{x0 + i * cw:.0f}" y="{y0 + j * rh:.0f}" width="{cw:.0f}" height="{rh:.0f}" fill="#fff" opacity="0.18" stroke="none" filter="url(#glowS)"/>')
    return "".join(out)


def skew_windows(xa, xb, top_a, bot_a, top_b, bot_b, cols, rows, fill="#1c1c1c"):
    """Fenster auf einer perspektivischen Fassade (links/rechts der Straße)."""
    out = []
    for i in range(cols):
        for j in range(rows):
            u0, u1 = (i + 0.2) / cols, (i + 0.8) / cols
            v0, v1 = (j + 0.2) / rows, (j + 0.75) / rows

            def P(u, v):
                x = xa + (xb - xa) * u
                t = top_a + (top_b - top_a) * u
                b = bot_a + (bot_b - bot_a) * u
                return f"{x:.0f},{t + (b - t) * v:.0f}"
            out.append(f'<polygon points="{P(u0, v0)} {P(u1, v0)} {P(u1, v1)} {P(u0, v1)}" fill="{fill}" stroke-width="4"/>')
    return "".join(out)


# ---------------------------------------------------------------- Szenen
def s_bed():
    b = []
    b.append('<rect x="0" y="0" width="1080" height="1920" fill="#4a4a4a" stroke="none"/>')
    # Fenster mit grauem Morgenlicht
    b.append('<rect x="560" y="260" width="380" height="520" fill="#bdbdbd"/><path d="M750,260 L750,780 M560,520 L940,520" fill="none" stroke-width="10"/>')
    b.append('<polygon points="560,780 940,780 1080,1300 300,1300" fill="#fff" opacity="0.08" stroke="none"/>')
    b.append('<path d="M520,240 Q540,600 500,820 L560,820 L560,240Z" fill="#2c2c2c"/>')
    # Bett
    b.append('<rect x="-20" y="1180" width="1120" height="760" fill="#cfcfcf"/>')
    b.append('<path d="M60,1050 Q300,980 560,1060 L560,1210 L60,1210Z" fill="#e8e8e8"/>')
    b.append(person(380, 1050, 1.25, "front", "wide", look=(-6, -2), body=False))
    b.append('<path d="M-40,1180 Q200,1100 420,1170 Q700,1120 1120,1200 L1120,1940 L-40,1940Z" fill="#dadada"/>')
    b.append('<path d="M100,1350 Q300,1300 500,1420 M600,1300 Q800,1260 1000,1380 M200,1600 Q500,1520 900,1650" fill="none" stroke-width="5" opacity="0.6"/>')
    b.append('<path d="M240,1190 Q260,1150 300,1170 Q330,1140 360,1180" fill="#d2d2d2" stroke-width="6"/>')
    # Nachttisch + Handy
    b.append('<rect x="780" y="1080" width="300" height="400" fill="#2a2a2a"/>')
    b.append(phone(900, 1060, 110, 46, rot=-8, glow_on=True))
    b.append('<path d="M840,1010 l-14,-26 M900,996 l0,-30 M960,1010 l14,-26" fill="none" stroke="#ff6060" stroke-width="6"/>')
    return svg("".join(b), bg=("#555", "#2a2a2a"), seed=11)


def s_street(overgrown=False):
    b = []
    sky = ("#d9d9d9", "#9a9a9a") if not overgrown else ("#e4e4e4", "#a8ada6")
    b.append(f'<rect width="1080" height="900" fill="{sky[0]}" stroke="none"/>')
    # Hintergrund-Skyline am Fluchtpunkt
    r = random.Random(3)
    x = 380
    while x < 700:
        w = r.randint(40, 90)
        h = r.randint(160, 420)
        b.append(f'<rect x="{x}" y="{850 - h}" width="{w}" height="{h + 20}" fill="#8a8a8a" stroke-width="5"/>')
        x += w
    # Straße
    b.append('<polygon points="470,850 610,850 1380,1920 -300,1920" fill="#555"/>')
    b.append('<polygon points="400,850 470,850 -300,1920 -500,1920" fill="#7a7a7a"/>')
    b.append('<polygon points="610,850 680,850 1580,1920 1380,1920" fill="#7a7a7a"/>')
    for k in range(7):
        t0, t1 = (k / 7) ** 1.6, ((k + 0.5) / 7) ** 1.6
        y0, y1 = 850 + 1070 * t0, 850 + 1070 * t1
        w0, w1 = 4 + 30 * t0, 4 + 30 * t1
        b.append(f'<polygon points="{540 - w0},{y0} {540 + w0},{y0} {540 + w1},{y1} {540 - w1},{y1}" fill="#e2e2e2" stroke-width="4"/>')
    # Fassaden links / rechts
    b.append('<polygon points="-10,-10 400,520 400,860 -10,1500" fill="#6a6a6a"/>')
    b.append(skew_windows(20, 380, 40, 1380, 530, 840, 4, 6))
    b.append('<polygon points="1090,-10 680,520 680,860 1090,1500" fill="#5e5e5e"/>')
    b.append(skew_windows(1060, 700, 40, 1380, 530, 840, 4, 6))
    # Ampel
    b.append('<rect x="760" y="560" width="14" height="420" fill="#222"/><rect x="738" y="520" width="58" height="140" rx="12" fill="#222"/>')
    b.append(glow(767, 550, 34, op=0.9, f="glowS") + f'<circle cx="767" cy="550" r="17" fill="{RED}" stroke-width="4"/>')
    # Verlassene Autos
    b.append(car_rear(470, 1080, 0.55, lights=not overgrown))
    b.append(car_rear(640, 1460, 1.05, lights=not overgrown))
    # Müll
    b.append('<path d="M200,1650 l40,-10 l10,30 l-45,8Z M860,1250 l30,-6 l6,22 l-32,4Z" fill="#ddd" stroke-width="4"/>')
    if overgrown:
        g = "#5f7a58"
        gd = "#3f5a3b"
        for (vx, vy, ln) in [(60, 200, 900), (220, 420, 700), (330, 560, 380), (1000, 180, 900), (860, 380, 650), (740, 540, 380)]:
            d = f"M{vx},{vy} " + " ".join(f"q{(-1) ** k * 26},{ln / 12} 0,{ln / 6}" for k in range(6))
            b.append(f'<path d="{d}" fill="none" stroke="{gd}" stroke-width="12"/>')
            for k in range(6):
                b.append(f'<ellipse cx="{vx + (-1) ** k * 24}" cy="{vy + k * ln / 6 + 20}" rx="26" ry="14" fill="{g}" stroke-width="4" transform="rotate({(-1) ** k * 30} {vx + (-1) ** k * 24} {vy + k * ln / 6 + 20})"/>')
        # Risse + Gras
        b.append('<path d="M540,1100 l-30,90 l40,60 l-60,120 l30,90 M300,1500 l80,40 l20,90 M780,1300 l-40,80 l60,70" fill="none" stroke-width="8"/>')
        rr = random.Random(5)
        for _ in range(70):
            gx = rr.randint(-50, 1130)
            gy = rr.randint(1000, 1950)
            sz = 20 + (gy - 900) / 18
            b.append(f'<path d="M{gx - sz / 2},{gy} l{sz / 4},{-sz * 1.4} l{sz / 4},{sz * 1.2} l{sz / 4},{-sz * 1.6} l{sz / 4},{sz * 1.6}Z" fill="{g if rr.random() < 0.6 else gd}" stroke-width="4"/>')
        # Baum aus dem Asphalt
        b.append(f'<path d="M520,1210 Q500,1000 530,860 L560,860 Q590,1000 580,1210Z" fill="#3a3a3a"/>')
        for (cx, cy, rad) in [(545, 780, 160), (430, 860, 110), (660, 860, 115), (545, 640, 110)]:
            b.append(f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="{g}"/>')
            b.append(f'<circle cx="{cx - rad * 0.3}" cy="{cy - rad * 0.3}" r="{rad * 0.35}" fill="#8aa383" stroke="none" opacity="0.7"/>')
    return svg("".join(b), bg=("#cfcfcf", "#888"), seed=21 if not overgrown else 22, vig=0.65)


def s_phone_hand():
    b = []
    b.append('<rect width="1080" height="1920" fill="#1c1c1c" stroke="none"/>')
    scr = (txt(0, -300, "07:12", 110, "#fff", 800) +
           txt(0, -235, "Sonntag, 16. November", 34, "#ffd0d0", 500) +
           '<rect x="-200" y="-110" width="400" height="150" rx="30" fill="#000" opacity="0.45" stroke="none"/>' +
           txt(0, -50, "0 Nachrichten", 50, "#fff", 800) +
           txt(0, 5, "0 verpasste Anrufe", 34, "#ffbdbd", 500) +
           '<g transform="translate(-60,160)">' +
           "".join(f'<rect x="{i * 34}" y="{-20 - i * 20}" width="22" height="{30 + i * 20}" fill="#ffffff" opacity="0.35" stroke="none"/>' for i in range(4)) +
           f'<path d="M-15,-90 L130,30 M130,-90 L-15,30" stroke="{RED}" stroke-width="14"/></g>' +
           txt(0, 280, "KEIN NETZ", 56, "#fff", 900))
    b.append(phone(560, 860, 500, 1020, rot=-5, screen=scr))
    # Hand
    b.append('<path d="M180,1900 Q200,1500 300,1290 Q330,1240 380,1260 L420,1330 Q470,1380 460,1600 L520,1960Z" fill="#cfcfcf"/>')
    for k, fy in enumerate([1100, 1210, 1320]):
        b.append(f'<rect x="{770 - k * 8}" y="{fy}" width="150" height="86" rx="43" fill="#d8d8d8" transform="rotate(-8 {840} {fy + 40})"/>')
    b.append('<path d="M760,1360 Q900,1380 900,1500 Q880,1700 760,1960 L480,1960 Q520,1600 560,1440Z" fill="#cfcfcf"/>')
    b.append('<path d="M330,1300 Q380,1240 420,1260 Q450,1300 410,1340" fill="#d8d8d8"/>')
    b.append('<path d="M180,1960 Q220,1700 300,1600 L520,1960Z" fill="#2b2b2b"/>')
    return svg("".join(b), bg=("#222", "#111"), seed=31, vig=0.8)


def s_car():
    b = []
    b.append('<rect width="1080" height="1100" fill="#b5b5b5" stroke="none"/>')
    b.append('<rect x="-10" y="250" width="1100" height="820" fill="#777"/>')
    b.append(window_grid(40, 320, 1040, 1000, 6, 4, 0.0, seed=4, fill="#3a3a3a"))
    b.append('<rect x="-10" y="1060" width="1100" height="900" fill="#4d4d4d"/>')
    b.append('<path d="M-10,1500 L1090,1500" stroke="#ddd" stroke-width="18" stroke-dasharray="120 90"/>')
    g = '<g transform="translate(540,1420) scale(1.55)">'
    g += '<path d="M-320,0 L-320,-60 C-310,-95 -270,-105 -215,-110 L-140,-180 C-118,-196 80,-196 112,-180 L200,-110 C270,-104 315,-84 320,-40 L320,0 Z" fill="#8f8f8f"/>'
    g += '<path d="M-320,0 L-320,-60 C-310,-95 -270,-105 -215,-110 L-140,-180 C-118,-196 80,-196 112,-180 L200,-110 C270,-104 315,-84 320,-40 L320,0 Z" fill="url(#shade)" stroke="none"/>'
    g += '<path d="M-200,-112 L-135,-170 L-20,-170 L-20,-112Z" fill="#262626"/><path d="M0,-112 L0,-170 L100,-170 L175,-112Z" fill="#262626"/>'
    g += '<circle cx="-200" cy="0" r="58" fill="#151515"/><circle cx="-200" cy="0" r="24" fill="#888"/>'
    g += '<circle cx="200" cy="0" r="58" fill="#151515"/><circle cx="200" cy="0" r="24" fill="#888"/>'
    g += '<polygon points="300,-80 600,-160 600,40 300,-10" fill="#fff" opacity="0.35" stroke="none" filter="url(#soft)"/>'
    g += '<ellipse cx="305" cy="-62" rx="16" ry="12" fill="#fff"/>'
    # offene Tür
    g += '<path d="M-20,-112 L-150,-150 L-150,-30 L-20,-20Z" fill="#a6a6a6"/><path d="M-30,-108 L-140,-140 L-140,-100 L-30,-80Z" fill="#2e2e2e"/>'
    g += '</g>'
    b.append(g)
    # Abgas-Wolken
    for k, (cx, cy, rr) in enumerate([(-10, 1380, 60), (-60, 1310, 80), (-40, 1220, 100)]):
        b.append(f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="#e0e0e0" opacity="{0.8 - k * 0.2}" stroke-width="5"/>')
    b.append(glow(1000, 1320, 110, "#ffffff", 0.35))
    return svg("".join(b), bg=("#999", "#444"), seed=41)


def s_door():
    b = []
    b.append('<rect width="1080" height="1920" fill="#3d3d3d" stroke="none"/>')
    b.append('<polygon points="0,1500 1080,1500 1080,1920 0,1920" fill="#2a2a2a"/>')
    b.append('<rect x="300" y="380" width="480" height="1130" fill="#f2f2f2"/>')
    b.append('<polygon points="300,1510 780,1510 1080,1920 0,1920" fill="#fff" opacity="0.25" stroke="none"/>')
    b.append('<path d="M300,380 L520,330 L520,1560 L300,1510Z" fill="#5a5a5a"/>')
    b.append('<circle cx="490" cy="960" r="16" fill="#bbb"/>')
    b.append('<rect x="280" y="360" width="520" height="1160" fill="none" stroke-width="16"/>')
    b.append(txt(640, 330, "Nr. 4", 46, "#bbb", 800))
    b.append(glow(620, 900, 260, "#ffffff", 0.35))
    b.append(person(150, 1370, 1.5, "back"))
    b.append('<path d="M250,1500 Q340,1300 420,1200" fill="none" stroke="#2c2c2c" stroke-width="60"/><circle cx="430" cy="1185" r="34" fill="#cfcfcf"/>')
    return svg("".join(b), bg=("#444", "#222"), seed=51)


def s_coffee():
    b = []
    b.append('<rect width="1080" height="1920" fill="#5a5a5a" stroke="none"/>')
    b.append('<rect x="0" y="0" width="1080" height="900" fill="#6a6a6a" stroke="none"/>')
    b.append('<path d="M120,650 L120,980 M260,650 L260,980 M120,700 L260,700" fill="none" stroke-width="12"/>')
    b.append('<polygon points="-20,1000 1100,1000 1100,1940 -20,1940" fill="#bcbcbc"/>')
    for k in range(5):
        b.append(f'<path d="M-20,{1150 + k * 170} L1100,{1150 + k * 170}" stroke-width="4" opacity="0.5"/>')
    # Zeitung + Teller
    b.append('<polygon points="620,1300 980,1250 1040,1520 680,1580" fill="#e4e4e4"/>')
    for k in range(6):
        b.append(f'<path d="M{700 + k * 4},{1340 + k * 34} L{960 + k * 6},{1300 + k * 34}" stroke-width="5" opacity="0.6"/>')
    b.append('<ellipse cx="260" cy="1600" rx="200" ry="70" fill="#e6e6e6"/><ellipse cx="260" cy="1592" rx="130" ry="40" fill="#d0d0d0"/>')
    b.append('<path d="M200,1590 q30,-20 70,0 q20,10 0,20 q-50,10 -70,-20" fill="#a0a0a0" stroke-width="4"/>')
    # Tasse
    b.append('<ellipse cx="540" cy="1390" rx="190" ry="55" fill="#2a2a2a"/>')
    b.append('<path d="M400,1130 L410,1360 Q540,1430 670,1360 L680,1130Z" fill="#f0f0f0"/>')
    b.append('<path d="M680,1180 Q790,1180 780,1260 Q770,1330 670,1320" fill="none" stroke-width="22"/>')
    b.append('<ellipse cx="540" cy="1130" rx="140" ry="36" fill="#f0f0f0"/><ellipse cx="540" cy="1134" rx="118" ry="26" fill="#2b2016"/>')
    b.append(glow(540, 900, 180, "#ffffff", 0.25))
    for k, sx in enumerate([480, 545, 610]):
        b.append(f'<path d="M{sx},1090 q-40,-70 0,-140 q40,-70 0,-140 q-40,-70 0,-140" fill="none" stroke="#f4f4f4" stroke-width="{14 - k * 2}" opacity="0.85"/>')
    return svg("".join(b), bg=("#666", "#333"), seed=61)


def s_blackout():
    b = []
    b.append('<rect width="1080" height="1920" fill="#141414" stroke="none"/>')
    b.append('<circle cx="820" cy="300" r="90" fill="#cfcfcf" stroke-width="6"/>')
    r = random.Random(8)
    x = -20
    while x < 1100:
        w = r.randint(110, 220)
        h = r.randint(500, 1100)
        b.append(f'<rect x="{x}" y="{1400 - h}" width="{w}" height="{h + 600}" fill="#262626"/>')
        b.append(window_grid(x + 10, 1430 - h, x + w - 10, 1380, max(2, w // 50), max(4, h // 90), 0.06, seed=x, fill="#1a1a1a"))
        x += w - 6
    # Strommast
    b.append('<path d="M440,1960 L540,700 L640,1960 M470,1600 L610,1600 M490,1300 L590,1300 M510,1000 L570,1000 M370,850 L710,850 M400,1100 L680,1100 M470,1600 L590,1300 L490,1300 L610,1600 M490,1300 L570,1000 L510,1000 L590,1300" fill="none" stroke="#0b0b0b" stroke-width="16"/>')
    b.append('<path d="M370,850 Q100,950 -40,900 M710,850 Q950,960 1120,900 M400,1100 Q150,1200 -40,1150 M680,1100 Q900,1200 1120,1160" fill="none" stroke="#0b0b0b" stroke-width="7"/>')
    b.append(glow(540, 690, 70, op=1, f="glowS") + f'<circle cx="540" cy="690" r="22" fill="{RED}" stroke-width="5"/>')
    b.append('<path d="M700,850 l30,-40 l-10,40 l40,-30 l-30,50 l45,-10" fill="none" stroke="#fff" stroke-width="6"/>')
    b.append(glow(730, 830, 60, "#ffffff", 0.6, "glowS"))
    return svg("".join(b), bg=("#1a1a1a", "#0a0a0a"), seed=71, vig=0.8)


def dog(x, y, s, flip=False):
    sc = -s if flip else s
    g = f'<g transform="translate({x},{y}) scale({sc},{s})" fill="#090909" stroke="#090909">'
    g += '<ellipse cx="0" cy="0" rx="150" ry="62"/>'
    g += '<path d="M-110,-30 Q-150,-90 -185,-95 L-260,-80 L-275,-55 L-200,-25 Z"/>'
    g += '<polygon points="-190,-95 -205,-150 -165,-100"/><polygon points="-160,-95 -150,-150 -135,-95"/>'
    g += '<rect x="-120" y="20" width="28" height="140" rx="12"/><rect x="-70" y="20" width="28" height="140" rx="12"/>'
    g += '<rect x="80" y="20" width="28" height="140" rx="12"/><rect x="115" y="10" width="28" height="150" rx="12"/>'
    g += '<path d="M140,-20 Q220,-60 240,-120" fill="none" stroke-width="20"/>'
    g += '<path d="M-60,-50 l10,-30 l10,26 l12,-30 l10,30 l12,-26 l10,30" fill="#090909" stroke-width="6"/>'
    g += '</g>'
    ex = x - 205 * sc
    g += glow(ex, y - 72 * s, 26 * s, op=1, f="glowS")
    g += f'<ellipse cx="{ex}" cy="{y - 72 * s}" rx="{12 * s}" ry="{7 * s}" fill="{RED}" stroke="none"/>'
    g += f'<path d="M{x - 268 * sc},{y - 50 * s} l{12 * sc},{18 * s} l{10 * sc},{-14 * s}" fill="#fff" stroke="none"/>'
    return g


def s_dogs():
    b = []
    b.append('<rect width="1080" height="1920" fill="#2a2a2a" stroke="none"/>')
    b.append('<polygon points="0,0 360,600 360,1250 0,1920" fill="#1e1e1e"/>')
    b.append('<polygon points="1080,0 720,600 720,1250 1080,1920" fill="#232323"/>')
    b.append('<polygon points="360,1250 720,1250 1080,1920 0,1920" fill="#3a3a3a"/>')
    b.append('<rect x="360" y="600" width="360" height="650" fill="#5e5e5e"/>')
    b.append(glow(540, 900, 200, "#ffffff", 0.3))
    b.append('<rect x="800" y="1250" width="160" height="260" fill="#333"/><path d="M800,1300 L960,1300" stroke-width="6"/>')
    b.append(dog(470, 1210, 0.45))
    b.append(dog(650, 1280, 0.55, flip=True))
    b.append(dog(320, 1500, 0.9))
    b.append(dog(820, 1650, 1.05, flip=True))
    return svg("".join(b), bg=("#2a2a2a", "#111"), seed=81, vig=0.85)


def s_market():
    b = []
    b.append('<rect width="1080" height="1920" fill="#1f1f1f" stroke="none"/>')
    b.append('<polygon points="0,1920 1080,1920 640,1000 440,1000" fill="#4a4a4a"/>')
    r = random.Random(12)
    for side in (-1, 1):
        xo, xi = (0, 440) if side < 0 else (1080, 640)
        b.append(f'<polygon points="{xo},100 {xi},700 {xi},1000 {xo},1920" fill="#3a3a3a"/>')
        for k in range(6):
            t = k / 6
            y_o = 300 + t * 1300
            y_i = 720 + t * 260
            b.append(f'<path d="M{xo},{y_o} L{xi},{y_i}" stroke-width="9"/>')
            for p in range(7):
                u = p / 7
                px = xo + (xi - xo) * u
                py = y_o + (y_i - y_o) * u
                sz = 70 * (1 - u * 0.75)
                c = r.choice(["#9a9a9a", "#bdbdbd", "#777", "#d6d6d6"])
                if r.random() < 0.55:
                    b.append(f'<rect x="{px - sz / 2 if side < 0 else px - sz / 2}" y="{py - sz * 1.3}" width="{sz * 0.8}" height="{sz * 1.25}" fill="{c}" stroke-width="3"/>')
    for (cx, cy) in [(380, 1650), (700, 1760), (560, 1500), (300, 1820)]:
        b.append(f'<rect x="{cx}" y="{cy}" width="70" height="90" fill="#aaa" stroke-width="4" transform="rotate({r.randint(-40, 40)} {cx} {cy})"/>')
    b.append('<polygon points="560,1180 300,560 820,560" fill="url(#beam)" stroke="none"/>')
    b.append(person(560, 1370, 0.9, "back"))
    return svg("".join(b), bg=("#222", "#0c0c0c"), seed=91, vig=0.85)


def s_rot():
    b = []
    b.append('<rect width="1080" height="1920" fill="#3a3a3a" stroke="none"/>')
    b.append('<rect x="-20" y="1250" width="1120" height="700" fill="#6b6b6b"/>')
    # Kiste mit verfaultem Obst
    b.append('<rect x="80" y="1050" width="560" height="380" fill="#8c8c8c"/>')
    for k in range(3):
        b.append(f'<path d="M80,{1120 + k * 110} L640,{1120 + k * 110}" stroke-width="6"/>')
    r = random.Random(4)
    for (cx, cy) in [(170, 1020), (280, 990), (400, 1010), (520, 1000), (230, 940), (360, 930), (470, 945)]:
        b.append(f'<circle cx="{cx}" cy="{cy}" r="68" fill="#a4a4a4"/>')
        for _ in range(3):
            b.append(f'<ellipse cx="{cx + r.randint(-35, 35)}" cy="{cy + r.randint(-35, 35)}" rx="{r.randint(12, 24)}" ry="{r.randint(8, 18)}" fill="#3b3b3b" stroke="none"/>')
    b.append('<path d="M140,900 Q300,820 460,900" fill="none" stroke="#2a2a2a" stroke-width="30"/>')
    # Fliegen
    for _ in range(14):
        fx, fy = r.randint(100, 620), r.randint(620, 880)
        b.append(f'<circle cx="{fx}" cy="{fy}" r="7" fill="#0b0b0b" stroke="none"/><ellipse cx="{fx - 6}" cy="{fy - 8}" rx="7" ry="4" fill="#ddd" stroke-width="2"/><ellipse cx="{fx + 6}" cy="{fy - 8}" rx="7" ry="4" fill="#ddd" stroke-width="2"/>')
        b.append(f'<path d="M{fx},{fy + 10} q{r.randint(-30, 30)},20 {r.randint(-40, 40)},40" fill="none" stroke-width="2" stroke-dasharray="6 8" opacity="0.6"/>')
    # Konserven
    for (cx, cy) in [(800, 1400), (950, 1400), (875, 1180)]:
        b.append(f'<rect x="{cx - 70}" y="{cy - 200}" width="140" height="200" fill="#c9c9c9"/>')
        b.append(f'<rect x="{cx - 70}" y="{cy - 150}" width="140" height="90" fill="#e8e8e8" stroke-width="4"/>')
        b.append(txt(cx, cy - 92, "BOHNEN", 26, "#222", 900))
        b.append(f'<ellipse cx="{cx}" cy="{cy - 200}" rx="70" ry="18" fill="#dcdcdc"/>')
    b.append(glow(875, 1250, 220, "#ffffff", 0.2))
    return svg("".join(b), bg=("#444", "#1f1f1f"), seed=101)


def s_corner():
    b = []
    b.append('<polygon points="0,0 540,600 540,1920 0,1920" fill="#2f2f2f" stroke="none"/>')
    b.append('<polygon points="1080,0 540,600 540,1920 1080,1920" fill="#262626" stroke="none"/>')
    b.append('<path d="M540,600 L540,1920" stroke-width="6"/>')
    b.append('<polygon points="0,1500 540,1300 1080,1500 1080,1920 0,1920" fill="#1a1a1a"/>')
    b.append(mask_face(200, 600, 0.9, 0.85))
    b.append(mask_face(880, 520, 0.75, 0.6))
    b.append(mask_face(860, 1100, 0.6, 0.45))
    b.append(mask_face(180, 1150, 0.55, 0.35))
    # Kritzel
    r = random.Random(7)
    for (cx, cy) in [(320, 900), (780, 820)]:
        d = f"M{cx},{cy} " + " ".join(f"l{r.randint(-60, 60)},{r.randint(-50, 50)}" for _ in range(22))
        b.append(f'<path d="{d}" fill="none" stroke="#d6d6d6" stroke-width="4" opacity="0.7"/>')
    # sitzende Figur, Hände an den Ohren
    b.append('<path d="M330,1700 Q330,1430 400,1320 L680,1320 Q750,1430 750,1700Z" fill="#2c2c2c"/>')
    b.append('<path d="M360,1700 Q380,1480 470,1450 Q540,1500 540,1700Z M720,1700 Q700,1480 610,1450 Q540,1500 540,1700Z" fill="#3b3b3b"/>')
    b.append(person(540, 1200, 1.15, "front", "wide", look=(10, 0), body=False))
    b.append('<path d="M420,1330 Q380,1250 420,1170" fill="none" stroke="#2c2c2c" stroke-width="56"/><path d="M660,1330 Q700,1250 660,1170" fill="none" stroke="#2c2c2c" stroke-width="56"/>')
    b.append('<circle cx="445" cy="1200" r="30" fill="#bdbdbd"/><circle cx="635" cy="1200" r="30" fill="#bdbdbd"/>')
    return svg("".join(b), bg=("#2a2a2a", "#111"), seed=111, vig=0.85)


def s_eyes():
    b = []
    b.append('<rect width="1080" height="1920" fill="#111" stroke="none"/>')
    b.append(glow(1080, 900, 420, op=0.5))
    b.append('<ellipse cx="540" cy="980" rx="560" ry="700" fill="#cfcfcf"/>')
    b.append('<path d="M-30,480 C40,120 380,40 560,60 C860,80 1080,260 1110,520 C900,340 640,330 520,420 C380,330 160,360 -30,480Z" fill="#141414"/>')
    for sx in (-1, 1):
        ex = 540 + sx * 230
        b.append(f'<ellipse cx="{ex}" cy="900" rx="170" ry="190" fill="#f6f6f6" stroke-width="10"/>')
        b.append(f'<circle cx="{ex + 8}" cy="905" r="22" fill="{INK}" stroke="none"/>')
        b.append(f'<path d="M{ex - 150},{700} Q{ex},{620} {ex + 150},{680}" fill="none" stroke-width="16"/>')
        b.append(f'<path d="M{ex - 140},{1110} Q{ex},{1170} {ex + 140},{1100} M{ex - 110},{1150} Q{ex},{1200} {ex + 110},{1140}" fill="none" stroke-width="7" opacity="0.7"/>')
    b.append('<path d="M470,1400 Q540,1340 610,1400 Q590,1480 540,1480 Q490,1480 470,1400Z" fill="#2a2a2a" stroke-width="8"/>')
    b.append('<path d="M900,620 Q930,700 910,740 Q880,760 870,720 Q870,680 900,620Z" fill="#eaeaea" stroke-width="5"/>')
    b.append('<path d="M180,1500 l60,-40 M840,1500 l-60,-40" stroke-width="8" opacity="0.6"/>')
    b.append('<ellipse cx="540" cy="980" rx="560" ry="700" fill="#ff2b2b" opacity="0.12" stroke="none"/>')
    return svg("".join(b), bg=("#111", "#000"), seed=121, vig=0.9)


def s_ring():
    b = []
    b.append('<rect width="1080" height="1920" fill="#7a7a7a" stroke="none"/>')
    for k in range(7):
        b.append(f'<rect x="{-40 + k * 170}" y="-20" width="170" height="1960" fill="{"#737373" if k % 2 else "#808080"}" stroke-width="5"/>')
        b.append(f'<path d="M{20 + k * 170},{300 + k * 90} q30,40 0,80 M{60 + k * 170},{1300 - k * 60} q-30,40 0,80" fill="none" stroke-width="4" opacity="0.5"/>')
    scr = (txt(0, -230, "07:12", 90, "#fff", 800) +
           '<circle cx="0" cy="0" r="90" fill="#000" opacity="0.4" stroke="none"/>' +
           '<path d="M-45,30 Q-45,-60 0,-65 Q45,-60 45,30 L60,45 L-60,45Z M-15,55 Q0,75 15,55" fill="#fff" stroke="none"/>' +
           txt(0, 200, "1 neue Nachricht", 46, "#fff", 800))
    b.append(phone(540, 960, 460, 900, rot=12, screen=scr))
    for sx in (-1, 1):
        for k in range(3):
            b.append(f'<path d="M{540 + sx * (300 + k * 50)},{760 + k * 10} q{sx * 40},200 0,400" fill="none" stroke="{INK}" stroke-width="10"/>')
    b.append('<ellipse cx="200" cy="1560" rx="140" ry="50" fill="#555"/><path d="M90,1360 L110,1560 Q200,1610 290,1560 L310,1360Z" fill="#e8e8e8"/>')
    return svg("".join(b), bg=("#777", "#444"), seed=131, vig=0.8)


def msg_screen(reveal):
    s = ('<rect x="-205" y="-430" width="410" height="120" fill="#000" opacity="0.35" stroke="none"/>' +
         '<circle cx="-140" cy="-370" r="40" fill="#ddd" stroke-width="4"/>' +
         '<circle cx="-140" cy="-382" r="14" fill="#555" stroke="none"/><path d="M-165,-345 Q-140,-375 -115,-345" fill="#555" stroke="none"/>' +
         txt(-80, -378, "Ich", 46, "#fff", 800, "start") +
         txt(-80, -335, "Meine Nummer", 28, "#ffbcbc", 600, "start"))
    if reveal:
        s += ('<rect x="-190" y="-120" width="360" height="130" rx="40" fill="#f2f2f2" stroke-width="4"/>' +
              txt(-10, -40, "Dreh dich", 54, "#111", 900) + txt(-10, 20, "", 10) +
              '<rect x="-190" y="30" width="360" height="110" rx="40" fill="#f2f2f2" stroke-width="4"/>' +
              txt(-10, 103, "nicht um.", 54, RED, 900) +
              txt(140, 180, "07:12", 26, "#ffbcbc", 600))
    else:
        s += ('<rect x="-190" y="-80" width="360" height="160" rx="40" fill="#f2f2f2" stroke-width="4"/>' +
              '<circle cx="-80" cy="0" r="18" fill="#888" stroke="none"/><circle cx="-10" cy="0" r="18" fill="#aaa" stroke="none"/><circle cx="60" cy="0" r="18" fill="#ccc" stroke="none"/>')
    return s


def s_msg(reveal=False):
    b = []
    b.append('<rect width="1080" height="1920" fill="#111" stroke="none"/>')
    b.append(phone(540, 700, 520, 1080, rot=-3, screen=msg_screen(reveal)))
    b.append('<path d="M140,1960 Q160,1560 260,1400 Q300,1350 330,1400 L360,1960Z" fill="#cfcfcf"/>')
    b.append('<path d="M800,1300 Q900,1340 900,1460 Q880,1700 820,1960 L560,1960 Q600,1620 640,1470Z" fill="#cfcfcf"/>')
    return svg("".join(b), bg=("#1a1a1a", "#050505"), seed=141 + reveal, vig=0.85)


def s_behind():
    b = []
    b.append('<rect width="1080" height="1920" fill="#0e0e0e" stroke="none"/>')
    # Gestalt hinter der Figur
    b.append('<path d="M140,1960 Q120,900 300,520 Q540,240 780,520 Q960,900 940,1960Z" fill="#050505" stroke="#050505"/>')
    b.append('<path d="M300,700 Q200,1100 120,1500 M780,700 Q880,1100 960,1500" fill="none" stroke="#050505" stroke-width="60"/>')
    b.append('<path d="M110,1500 l-20,90 M130,1505 l0,100 M150,1500 l20,90 M970,1500 l20,90 M950,1505 l0,100 M930,1500 l-20,90" stroke="#050505" stroke-width="14"/>')
    b.append(mask_face(540, 560, 1.4))
    # Figur vorn, Gesicht rot vom Handy beleuchtet
    b.append(glow(540, 1400, 300, op=0.7))
    b.append(person(540, 1250, 1.35, "front", "wide", look=(0, 8)))
    b.append(phone(540, 1560, 150, 90, rot=0, glow_on=True))
    b.append('<path d="M330,1700 Q380,1580 470,1570 M750,1700 Q700,1580 610,1570" fill="none" stroke="#2c2c2c" stroke-width="60"/>')
    b.append('<ellipse cx="540" cy="1250" rx="114" ry="130" fill="#ff2b2b" opacity="0.18" stroke="none"/>')
    return svg("".join(b), bg=("#111", "#000"), seed=151, vig=0.9)


SCENES = {
    "bed": s_bed, "street": s_street, "phone": s_phone_hand, "car": s_car, "door": s_door,
    "coffee": s_coffee, "blackout": s_blackout, "dogs": s_dogs, "market": s_market, "rot": s_rot,
    "corner": s_corner, "eyes": s_eyes, "green": lambda: s_street(True), "ring": s_ring,
    "msg": lambda: s_msg(False), "msg2": lambda: s_msg(True), "behind": s_behind,
}
