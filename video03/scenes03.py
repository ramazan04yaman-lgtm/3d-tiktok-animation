RED = (1.0, 0.36, 0.36)

def richard(c, x, y=GY, s=1., g=1.):
    figure(c, x, y, s, g)
    if s <= 0.01: return
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
            text(c, 300, 600, "NORMALES GEHALT", 24, k, 0.6)
            sp = eout(ap(t, P[1] + 0.3, 0.8))
            c.rectangle(110, 640, 190, 90); c.set_source_rgba(*ACC, k); c.set_line_width(6); c.stroke()
            c.rectangle(310 + sp * 380, 640 + sp * 260, 190, 90); c.set_source_rgba(*(RED if sp > 0.3 else ACC), k); c.stroke()
        columns_building(c, 790, GY, 1.0, ap(t, P[1], 0.4), RED, "STAAT")
        pill(c, 790, 860, "≈ 50 % STEUERN", ap(t, P[1] + 0.9, 0.3), 26)
    elif si == 3:
        richard(c, 300, g=0.8)
        columns_building(c, 790, GY, 1.0, 1, RED, "STAAT")
        text(c, 540, 680, "−" + fmt(4.9e6 * eout(ap(t, 0.1, P[1]))).replace("€", "$"), 90, ap(t, 0.1, 0.2), rgb=RED)
        pill(c, 540, 800, "WEG", ap(t, P[1], 0.3), 32)
        pill(c, 300, 870, "DU BEHÄLTST 5,1 MIO $", ap(t, P[1] + 0.5, 0.3), 22, 0.6)
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
        g = 1 + 1.4 * eout(ap(t, P[1], 2.0))
        c.save(); c.translate(780, GY); c.scale(g * 0.7, g * 0.7); share_grid(c, 0, -60, 7, 10, 1); c.restore()
        v = lerp(20, 500, eout(ap(t, P[1], 2.0)) ** 2)
        text(c, 300, 760, f"{int(v)} MIO $", 70, ap(t, 0.2, 0.2), rgb=ACC)
        pill(c, 300, 860, "WERT SEINER AKTIEN", ap(t, 0.3, 0.3), 22, 0.6)
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
