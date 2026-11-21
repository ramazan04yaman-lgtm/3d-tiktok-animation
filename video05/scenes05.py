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
HANDS = [("DIE VERGANGENHEIT", 200), ("FAMILIE", -20), ("ERWARTUNGEN", -60), ("GELD", 160), ("WAS ANDERE DENKEN", 20),
         ("ZWEIFEL", -110), ("DIE ZUKUNFT", 130), ("ÜBERDENKEN", -150)]

def hand(c, x, y, ang, a, label):
    c.save(); c.translate(x, y); c.rotate(ang)
    # sleeve + fist + index finger pointing along +x
    c.rectangle(-260, -26, 170, 52); col(c, 0.35, a); c.fill()
    rrect(c, -95, -34, 70, 68, 18); col(c, 1, a); c.fill()
    rrect(c, -35, -30, 70, 20, 10); c.fill()
    c.restore()
    lx = x - 300 * math.cos(ang); ly = y - 300 * math.sin(ang) - 50
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
        if t < 5.8: text(c, 540, 560, wk, 46, 1, 1, spacing=12)
        pill(c, 330, 820, "UNGEDULDIG", ap(t, 0.3, 0.3) * (1 - ap(t, 5.0, 0.5)), 24, 0.7)
        pill(c, 750, 820, "GEDULDIG", ap(t, 0.5, 0.3), 24)
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
        typed(c, 600, 1150 if t < 9.0 else 470, "ES PASSIERT NICHTS.", 6.2, t, 38)
        # roots
        rp = ap(t, 6.4, 2.8)
        if rp > 0:
            md = max(r[4] for r in ROOTS) + 1
            for x1, y1, x2, y2, dd, w in ROOTS:
                k = cl(rp * md - dd)
                if k <= 0: continue
                c.move_to(x1, y1); c.line_to(lerp(x1, x2, k), lerp(y1, y2, k)); c.set_line_width(w * 0.9 + 1); c.set_source_rgba(*ACC, 0.9); c.stroke()
        if t > 9.0:
            typed(c, 600, 540, "BIS ALLES PASSIERT.", 9.4, t, 38, rgb=ACC)
            bp = eout(ap(t, 9.4, 1.4))
            for k, (ox, hmax) in enumerate(((-26, 760), (0, 900), (28, 680))):
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
        cone(c, 330, 380, GY, 30, 240, 1); cone(c, 750, 380, GY, 30, 240, 1)
        for lx in (330, 750):
            rrect(c, lx - 50, 360, 100, 26, 13); col(c, 0.9, 1); c.fill()
        pill(c, 330, 520, "PERFEKTIONIST", ap(t, 0.2, 0.3), 26)
        pill(c, 750, 520, "MACHER", ap(t, 0.4, 0.3), 26)
        # tables
        for lx in (330, 750):
            c.move_to(lx - 190, GY - 130); c.line_to(lx + 190, GY - 130); c.move_to(lx - 170, GY - 130); c.line_to(lx - 170, GY); c.move_to(lx + 170, GY - 130); c.line_to(lx + 170, GY); stroke(c, 0.8, 1, 6)
        def canvas(x, y, prog, a=1):
            c.rectangle(x - 80, y - 110, 160, 110); c.set_source_rgba(0.95, 0.95, 0.95, a); c.fill()
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
        pill(c, 330, 600, "WARTET AUF PERFEKT", ap(t, 6.5, 0.3), 22, 0.6)
        pill(c, 750, 600, "WIRD JEDEN TAG BESSER", ap(t, 7.5, 0.3), 22, 0.85)
    elif si == 3:  # ---------------------------------------- ZEIGEFINGER
        cone(c, 540, 300, GY, 40, 260, 1)
        ground(c, 1)
        sq = ap(t, 7.5, 2.0)
        person(c, 540, GY, 0.9, sy=lerp(1, 0.75, sq))
        for i, (lab, deg) in enumerate(HANDS):
            k = ap(t, 0.5 + i * 0.85, 0.5)
            if k <= 0: continue
            ang = math.radians(deg)
            dist = lerp(560, 300, ap(t, 0.5 + i * 0.85, 4.0)) * (1 + 0.3 * (1 - eout(k)))
            tx, ty = 540, GY - 120
            hx, hy = tx - dist * math.cos(ang), ty - dist * math.sin(ang)
            hand(c, hx, hy, ang, cl(k * 2), lab)
        k = ap(t, 9.6, 0.4)
        if k > 0:
            c.rectangle(-400, -400, 1880, 2800); c.set_source_rgba(0, 0, 0, 0.6 * k); c.fill()
            pill(c, 540, 700, "ZU VIEL IM KOPF", k, 30, 0.85)
    elif si == 4:  # ---------------------------------------- 3:07
        # window with moon
        rrect(c, 680, 480, 260, 200, 10); stroke(c, 0.6, 1, 5); c.move_to(810, 480); c.line_to(810, 680); stroke(c, 0.6, 1, 4)
        c.new_path(); c.arc(880, 540, 26, 0, 2 * math.pi); col(c, 1, 1); c.fill()
        # clock
        rrect(c, 150, 840, 220, 100, 12); col(c, 0.1, 1); c.fill_preserve(); stroke(c, 0.5, 1, 4)
        text(c, 260, 890, "03:07" if t < 5.5 else "03:08", 56, 1, rgb=RED)
        # bed
        c.rectangle(380, GY - 120, 560, 60); stroke(c, 0.8, 1, 6)
        c.move_to(380, GY - 220); c.line_to(380, GY); c.move_to(940, GY - 160); c.line_to(940, GY); stroke(c, 0.8, 1, 6)
        rrect(c, 395, GY - 165, 120, 45, 18); col(c, 0.75, 1); c.fill()
        sit = ap(t, 6.0, 0.8)
        person(c, 470, GY - 120, 0.85, rot=lerp(-math.pi / 2, 0, eout(sit)) if sit > 0 else -math.pi / 2)
        if sit <= 0:
            c.rectangle(520, GY - 175, 400, 58); col(c, 0.55, 1); c.fill()
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
