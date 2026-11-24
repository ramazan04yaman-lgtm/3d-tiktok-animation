def crown(c, x, y, s, p):
    if p <= 0: return
    c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    c.move_to(-30, 0); c.line_to(-30, -30); c.line_to(-14, -14); c.line_to(0, -38); c.line_to(14, -14); c.line_to(30, -30); c.line_to(30, 0); c.close_path()
    c.set_source_rgba(*ACC, cl(p * 2)); c.fill(); c.restore()

def gauge(c, x, y, r, val, p, label):
    if p <= 0: return
    a = cl(p * 2)
    c.new_path(); c.arc(x, y, r, math.pi, 2 * math.pi); stroke(c, 0.7, a, 6)
    for i in range(11):
        th = math.pi + i / 10 * math.pi
        c.move_to(x + (r - 18) * math.cos(th), y + (r - 18) * math.sin(th)); c.line_to(x + r * math.cos(th), y + r * math.sin(th))
    stroke(c, 0.5, a, 3)
    th = math.pi + cl(val) * math.pi
    c.move_to(x, y); c.line_to(x + (r - 30) * math.cos(th), y + (r - 30) * math.sin(th)); c.set_source_rgba(*(RED if val > 0.5 else ACC), a); c.set_line_width(7); c.stroke()
    c.new_path(); c.arc(x, y, 10, 0, 2 * math.pi); col(c, 1, a); c.fill()
    text(c, x - r, y + 34, "0", 24, a, 0.6); text(c, x + r, y + 34, "100", 24, a, 0.6)
    text(c, x, y - r - 40, label, 24, a, 0.8, spacing=3)

def wrench(c, x, y, s, a, rgb=None):
    c.save(); c.translate(x, y); c.rotate(-0.7); c.scale(s, s)
    rrect(c, -8, -10, 16, 80, 6); (c.set_source_rgba(*rgb, a) if rgb else col(c, 1, a)); c.fill()
    c.new_path(); c.arc(0, -22, 22, 0, 2 * math.pi); c.fill()
    c.rectangle(-7, -50, 14, 26); c.set_source_rgb(0.035, 0.035, 0.04); c.fill(); c.restore()

def shop(c, x, y, s, p, g=1., rgb=None, sign=True):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    setc = (lambda: c.set_source_rgba(*rgb, a)) if rgb else (lambda: col(c, g, a))
    c.move_to(-110, 0); c.line_to(-110, -150); c.line_to(110, -150); c.line_to(110, 0); setc(); c.set_line_width(5); c.stroke()
    c.move_to(-130, -150); c.line_to(0, -230); c.line_to(130, -150); setc(); c.stroke()
    rrect(c, -25, -80, 50, 80, 6); setc(); c.stroke()
    c.rectangle(-90, -120, 45, 40); c.rectangle(45, -120, 45, 40); setc(); c.set_line_width(4); c.stroke()
    if sign: wrench(c, 0, -185, 0.45, a, rgb)
    c.restore()

def phone(c, x, y, a):
    rrect(c, x - 12, y - 22, 24, 44, 5); c.set_source_rgba(0.6, 0.75, 1, a); c.fill()

def coin(c, x, y, r, a):
    c.new_path(); c.arc(x, y, r, 0, 2 * math.pi); c.set_source_rgba(*ACC, a); c.fill(); text(c, x, y, "€", r * 1.1, a, 0.05)

def likeheart(c, x, y, s, a, rgb=RED):
    c.save(); c.translate(x, y); c.scale(s, s); c.new_path()
    c.move_to(0, 14); c.curve_to(-34, -8, -20, -38, 0, -20); c.curve_to(20, -38, 34, -8, 0, 14)
    c.set_source_rgba(*rgb, a); c.fill(); c.restore()

_rc = np.random.default_rng(5)
CROWD = [(_rc.uniform(560, 1000), _rc.uniform(0, 1)) for _ in range(60)]
CROWD.sort(key=lambda p: p[1])

CAM = [(540, 960, 1.1, 1.0), (560, 940, 1.0, 1.04), (560, 940, 1.0, 1.04), (440, 960, 1.0, 1.04),
       (400, 960, 1.05, 1.1), (540, 960, 1.0, 1.08), (540, 940, 1.0, 1.04), (540, 960, 1.0, 1.04),
       (540, 920, 1.0, 1.04), (500, 960, 1.05, 1.1), (500, 960, 1.1, 1.2), (540, 960, 1.0, 1.04), (540, 940, 0.95, 1.0)]

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

def crowd(c, n, a, dx=0., g=0.5, phones=False, T=0):
    for i in range(n):
        x, d = CROWD[i % len(CROWD)]
        yy = GY - 10 + d * 60; s_ = 0.32 + 0.12 * d
        figure(c, x + dx * (0.6 + d), yy, s_, g * (0.6 + 0.4 * d), a)
        if phones: phone(c, x + dx + 18 * s_ / 0.4, yy - 120 * s_ / 0.4, a * 0.9)

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    if si == 5: cta(c, t, P); return
    ground(c, 1)
    if si == 0:
        leave = ap(t, P[1], 1.2)
        for i in range(10):
            x0 = 160 + i * 85 if i < 5 else 300 + i * 70
            if abs(x0 - 540) < 70: x0 += 140
            figure(c, x0 + 900 * ease(leave) * (0.6 + i * 0.05), GY, 0.6, 0.45, 1 - leave)
        figure(c, 540, GY, 0.8)
        pill(c, 540, GY + 60, "DU", 1, 24)
        n = int(lerp(100, 1, ease(leave)))
        text(c, 540, 600, "KONKURRENZ", 24, ap(t, 0.1, 0.3), 0.6, spacing=3)
        text(c, 540, 680, str(n), 96, ap(t, 0.1, 0.3), rgb=ACC if n == 1 else None)
    elif si == 1:
        figure(c, 300, GY, 0.8)
        pill(c, 300, GY + 60, "DU", 1, 24)
        crowd(c, int(60 * ap(t, 0, 1.0)), 1)
        labs = ["INFLUENCER", "GAMER", "TRADER"]
        for i, l in enumerate(labs):
            pill(c, 780, 680 + i * 80, l, ap(t, P[1] + 0.5 * i, 0.3), 26)
        text(c, 780, 560, "100 BEWERBER", 34, ap(t, 0.3, 0.3), 0.85, spacing=2)
    elif si == 2:
        figure(c, 300, GY, 0.8)
        pill(c, 300, GY + 60, "DU", 1, 24)
        shake = 6 * math.sin(T * 30) * ap(t, 0.3, 0.5)
        crowd(c, 60, 1, dx=shake)
        for i in range(3):
            coin(c, 700 + i * 80, 820 - 20 * math.sin(T * 3 + i), 24, 1)
        for i in range(8):
            k = ap(t, P[1] + 0.1 * i, 0.25)
            if k > 0:
                x, dd = CROWD[i * 7]
                xx, yy = x, GY - 110
                c.move_to(xx - 12, yy - 12); c.line_to(xx + 12, yy + 12); c.move_to(xx + 12, yy - 12); c.line_to(xx - 12, yy + 12)
                c.set_source_rgba(*RED, k); c.set_line_width(5); c.stroke()
        pill(c, 780, 680, "FAST ALLE VERLIEREN", ap(t, P[1] + 0.4, 0.3), 26)
    elif si == 3:
        shop(c, 300, GY, 1.0, ap(t, 0, 0.4))
        pill(c, 300, GY + 60, "KLEMPNER", ap(t, 0.3, 0.3), 24)
        crowd(c, 60, 0.35, g=0.4)
        ox = 440 + 500 * ease(ap(t, P[1] + 0.6, 1.6))
        figure(c, ox, GY, 0.7, 0.75, 1 - ap(t, P[1] + 1.8, 0.4))
        pill(c, ox, GY - 230, "RENTE", ap(t, P[1] + 0.2, 0.3) * (1 - ap(t, P[1] + 1.8, 0.4)), 24)
    elif si == 4:
        shop(c, 300, GY, 1.0, 1, 0.6)
        pill(c, 300, GY + 60, "KLEMPNER", 1, 24, 0.6)
        for i in range(5):
            x = 470 + i * 75
            figure(c, x, GY, 0.5 * back(ap(t, 0.1 * i, 0.4)), 0.7)
            qmark(c, x, GY - 140, ap(t, P[1] + 0.1 * i, 0.3), 40, 0.8)
        pill(c, 600, 760, "KUNDEN BLEIBEN", ap(t, 0.3, 0.3), 26)
        pill(c, 600, 840, "NIEMAND ÜBERNIMMT", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 6:
        n = 10 if t < P[1] else 1
        for i in range(10):
            x = 140 + (i % 5) * 200; y = 820 + (i // 5) * 220
            fade = 1 if i == 0 else 1 - ap(t, P[1] - 0.3 + 0.05 * i, 0.3)
            if fade > 0:
                shop(c, x, y, 0.42, fade, 0.75 if i else 1, ACC if (i == 0 and t > P[1]) else None)
        if t > P[1]:
            figure(c, 140, GY, 0.7 * back(ap(t, P[1] + 0.2, 0.4)), rgb=None)
            pill(c, 140, GY + 60, "DU", ap(t, P[1] + 0.3, 0.3), 24)
        text(c, 540, 600, "BETRIEBE", 24, 1, 0.6, spacing=3)
        text(c, 540, 680, str(n), 96, 1, rgb=ACC if n == 1 else None)
    elif si == 7:
        shop(c, 200, GY, 0.8, 1, 1, ACC)
        figure(c, 340, GY, 0.7)
        crowd(c, 40, 1, phones=True, g=0.55)
        pill(c, 780, 700, "TRADING", ap(t, P[1], 0.3), 26)
        pill(c, 780, 780, "FILMT SICH", ap(t, P[1] + 0.4, 0.3), 26, 0.6)
    elif si == 8:
        gauge(c, 540, 820, 220, lerp(0.95, 0.0, ease(ap(t, 0.2, 1.4))), ap(t, 0, 0.3), "KONKURRENZ")
        shop(c, 380, GY, 0.6, ap(t, P[1], 0.35), 1, ACC)
        figure(c, 620, GY, 0.7 * back(ap(t, P[1] + 0.2, 0.4)))
        pill(c, 540, 960, "1 STADT · 1 ANBIETER", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 9:
        shop(c, 260, GY, 0.8, 1, 1, ACC)
        figure(c, 460, GY, 0.8)
        v = lerp(80, 180, eout(ap(t, P[1], 1.0)))
        pricetag(c, 720, 760, 1.3, ap(t, 0.2, 0.35), f"{int(v)} € / STD")
        arrow_up(c, 900, 900, ap(t, P[1] + 0.2, 0.5))
        pill(c, 720, 880, "DU BESTIMMST", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 10:
        shop(c, 280, GY, 0.8, 1, 1, ACC)
        figure(c, 500, GY, 0.9)
        crown(c, 500, GY - 250, 1.3, ap(t, P[1], 0.35))
        stamp(c, 540, 700, "MONOPOL", ap(t, P[1], 0.3), ACC)
    elif si == 11:
        figure(c, 260, GY, 0.75, 0.75); figure(c, 400, GY, 0.75, 0.75)
        pill(c, 330, GY + 60, "FREUNDE", 1, 24, 0.6)
        figure(c, 760, GY, 0.8)
        pill(c, 760, GY + 60, "DU", 1, 24)
        bubble(c, 400, GY - 330, "KOMM, WIR WERDEN INFLUENCER!", ap(t, 0.3, 0.3))
        bubble(c, 790, GY - 330, "VIEL GLÜCK.", ap(t, P[1] + 0.2, 0.3))
    elif si == 12:
        crowd(c, 40, 1, dx=-420, g=0.5)
        for i in range(5):
            likeheart(c, 160 + i * 60, 820 + 15 * math.sin(T * 4 + i), 1.0, 0.9)
        pill(c, 260, 700, "LIKES", ap(t, 0.2, 0.3), 26, 0.6)
        c.set_dash([10, 10]); c.move_to(540, 560); c.line_to(540, GY); stroke(c, 0.5, 1, 3); c.set_dash([])
        k = ap(t, P[1], 0.6)
        for i in range(4):
            shop(c, 640 + (i % 2) * 230, 880 + (i // 2) * 200, 0.42, ap(t, P[1] + 0.1 * i, 0.35), 1, ACC)
        figure(c, 820, GY, 0.75)
        for i in range(6):
            kk = ap(t, P[1] + 0.5 + 0.12 * i, 0.4)
            if kk > 0: coin(c, 640 + i * 55, 650 - 30 * eout(kk), 20, kk)
        pill(c, 800, 560, "DIE GANZE STADT", ap(t, P[1] + 0.3, 0.3), 26)
