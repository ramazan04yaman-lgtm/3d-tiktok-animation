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

CAM = [(540, 980, 1.12, 1.0),   # 0 hook
       (540, 960, 1.0, 1.05),   # 1 class
       (560, 940, 1.0, 1.04),   # 2 sicher
       (540, 960, 1.05, 1.1),   # 3 +20
       (540, 940, 1.0, 1.04),   # 4 keiner versteht
       (540, 920, 1.0, 1.03),   # 5 regeln
       (500, 940, 1.0, 1.05),   # 6 test
       (500, 940, 1.0, 1.06),   # 7 fehler
       (540, 900, 1.0, 1.03),   # 8 andersrum
       (620, 960, 1.0, 1.05),   # 9 versuchen
       (600, 960, 1.0, 1.04),   # 10 markt
       (560, 960, 1.0, 1.04),   # 11 plan / peinlich
       (600, 920, 1.0, 1.12)]   # 12 glueck

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

CROWD = [140, 270, 810, 940]
EDGE = 600

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    # ---------------- ground (cliff from scene 9)
    if si < 9:
        ground(c, ap(T, 0, 0.5))
    else:
        c.set_dash([14, 12]); c.set_line_width(3); col(c, 0.55, 0.9)
        c.move_to(-300, GY); c.line_to(EDGE, GY); c.stroke(); c.set_dash([])
        c.move_to(EDGE, GY); c.line_to(EDGE - 20, GY + 90); stroke(c, 0.4, 1, 3)
        # tiles appear under the walker
        if si == 9: wx = lerp(EDGE - 60, 900, ease(ap(t, P[1], d - P[1] + 0.3)))
        else: wx = 900
        n = int(max(0, wx + 50 - EDGE) // 62)
        for i in range(n + 1):
            x0 = EDGE + 6 + i * 62
            if x0 > wx + 60: break
            fa = cl((wx + 60 - x0) / 40)
            c.rectangle(x0, GY - 4, 54, 14); c.set_source_rgba(*ACC, 0.9 * fa); c.fill()
        if si == 9: fog(c, 900, GY - 250, 1 - 0.6 * ap(t, P[1], 2), T)
    # ---------------- per scene
    if si == 0:
        hero(c, 540, GY, back(ap(t, 0.0, 0.4)))
        brain(c, 380, 760, 1.0, ap(t, 0.15, 0.35))
        pill(c, 380, 640, "SEHR KLUG", ap(t, 0.25, 0.3), 26)
        text(c, 380, 880, "IQ " + str(int(lerp(100, 160, eout(ap(t, 0.2, 1.4))))), 64, ap(t, 0.2, 0.2))
        wallet(c, 720, 760, 0.9, ap(t, 1.6, 0.35), ACC)
        pill(c, 720, 640, "PLEITE", ap(t, 1.8, 0.3), 26)
        text(c, 720, 880, "0 €", 64, ap(t, 1.8, 0.2), rgb=ACC)
        k = ap(t, P[1], 0.5)
        if k > 0:
            c.set_dash([10, 10]); c.move_to(460, 760); c.line_to(lerp(460, 535, k), 700); c.move_to(640, 760); c.line_to(lerp(640, 565, k), 700)
            stroke(c, 0.6, k, 3); c.set_dash([])
            c.new_path(); c.arc(550, 690, 40, 0, 2 * math.pi); stroke(c, 1, k, 4)
            text(c, 550, 690, "?", 50, k)
        pill(c, 550, 590, "DER GRUND?", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 1:
        for i, x in enumerate(CROWD): figure(c, x, GY, 0.8 * back(ap(t, 0.1 * i, 0.4)), 0.3)
        hero(c, 540)
        spotlight(c, 540, ap(t, 0, 0.5))
        star(c, 540, GY - 300, 26, ap(t, 0.4, 0.3))
        pill(c, 540, GY - 380, "DER KLÜGSTE", ap(t, 0.5, 0.3), 26)
        if card(c, 540, 640, 760, 170, ap(t, P[1] - 0.2, 0.35)):
            full = "WIE VIEL IST 17 × 3 ?"; stop = P[1] + 1.4
            n = int(cl((min(t, stop) - P[1]) / 1.4) * 15)
            text(c, -330, 0, full[:n] + ("|" if int(T * 3) % 2 else ""), 46, 1, align='l')
            c.restore()
        bubble(c, 650, GY - 330, "51!", ap(t, P[1] + 1.4, 0.3))
    elif si == 2:
        labs = ["LEHRER", "ELTERN", "FREUNDE", "NACHBARN"]
        for i, x in enumerate(CROWD):
            figure(c, x, GY, 0.8, 0.45); pill(c, x, GY + 50, labs[i], ap(t, 0.1 + 0.1 * i, 0.3), 20, 0.5)
        hero(c, 540)
        pill(c, 540, 560, "ALLE WAREN SICHER", ap(t, 0.1, 0.3), 28)
        k = eout(ap(t, P[1] - 0.2, 1.2))
        if k > 0:
            c.set_dash([12, 10]); c.new_path()
            for i in range(int(60 * k) + 1):
                u = i / 60; x = lerp(560, 960, u); y = lerp(GY - 220, 680, u ** 2)
                (c.move_to if i == 0 else c.line_to)(x, y)
            c.set_line_width(5); c.set_source_rgb(*ACC); c.stroke(); c.set_dash([])
        star(c, 960, 660, 34, ap(t, P[1] + 1.0, 0.35))
        pill(c, 900, 590, "ERFOLG", ap(t, P[1] + 1.1, 0.3), 24)
    elif si == 3:
        pill(c, 540, 470, "JAHRE SPÄTER", ap(t, 0, 0.3), 24, 0.6)
        text(c, 540, 560, "+20", 110, ap(t, 0.1, 0.3))
        hero(c, 380)
        # desk + monitor
        k = ap(t, P[1], 0.4)
        if k > 0:
            c.move_to(470, GY - 90); c.line_to(700, GY - 90); c.move_to(490, GY - 90); c.line_to(490, GY); c.move_to(680, GY - 90); c.line_to(680, GY)
            stroke(c, 1, k, 5); rrect(c, 540, GY - 200, 110, 80, 8); stroke(c, 1, k, 5)
        # bell curve
        kb = eout(ap(t, P[1] + 0.3, 1.0))
        if kb > 0:
            c.new_path()
            for i in range(int(80 * kb) + 1):
                u = i / 80; x = lerp(260, 820, u); y = 900 - 190 * math.exp(-((u - 0.5) / 0.17) ** 2)
                (c.move_to if i == 0 else c.line_to)(x, y)
            stroke(c, 1, 1, 5)
            c.move_to(260, 900); c.line_to(820, 900); stroke(c, 0.5, kb, 3)
        k2 = ap(t, P[1] + 1.2, 0.4)
        if k2 > 0:
            c.set_dash([8, 8]); c.move_to(540, 900); c.line_to(540, 710); c.set_line_width(4); c.set_source_rgba(*ACC, k2); c.stroke(); c.set_dash([])
            c.arc(540, 710, 12, 0, 2 * math.pi); c.set_source_rgba(*ACC, k2); c.fill()
        pill(c, 540, 650, "DURCHSCHNITT", ap(t, P[1] + 1.3, 0.3), 26)
    elif si == 4:
        for i, x in enumerate(CROWD):
            figure(c, x, GY, 0.8, 0.45); qmark(c, x, GY - 250, ap(t, 0.2 + 0.15 * i, 0.3), 60, 0.7)
        hero(c, 540)
        if card(c, 540, 700, 600, 330, ap(t, P[1] - 0.3, 0.35)):
            text(c, 0, -110, "WAS LIEF SCHIEF?", 30, 1, 0.6)
            text(c, -230, -20, "DÜMMER GEWORDEN", 38, 1, align='l'); text(c, -230, 80, "FAUL GEWORDEN", 38, 1, align='l')
            c.restore()
        check_circle(c, 790, 680, 30, ap(t, P[1] + 0.3, 0.3), False)
        check_circle(c, 790, 780, 30, ap(t, P[1] + 1.5, 0.3), False)
    elif si == 5:
        hero(c, 540)
        k = ap(t, 0.2, 0.4)
        # cap icon (Schule)
        if k > 0:
            c.save(); c.translate(300, 700); c.scale(back(k) * 1.6, back(k) * 1.6)
            c.move_to(-58, 0); c.line_to(0, -24); c.line_to(58, 0); c.line_to(0, 24); c.close_path(); stroke(c, 1, cl(k * 2), 4)
            c.move_to(-30, 12); c.line_to(-30, 40); c.curve_to(-10, 52, 10, 52, 30, 40); c.line_to(30, 12); stroke(c, 1, cl(k * 2), 4)
            c.restore()
        text(c, 300, 840, "SCHULE", 40, cl(k * 2))
        k = ap(t, 0.6, 0.4)
        if k > 0:
            c.save(); c.translate(780, 700); c.scale(back(k), back(k)); c.new_path(); c.arc(0, 0, 75, 0, 2 * math.pi)
            c.set_line_width(6); c.set_source_rgba(*ACC, cl(k * 2)); c.stroke(); text(c, 0, 0, "€", 76, cl(k * 2), rgb=ACC); c.restore()
        text(c, 780, 840, "GELD", 40, cl(k * 2), rgb=ACC)
        kd = eout(ap(t, P[1], 0.8))
        if kd > 0:
            c.set_dash([10, 10]); c.move_to(540, 560); c.line_to(540, 560 + 400 * kd); stroke(c, 0.6, 1, 3); c.set_dash([])
        pill(c, 540, 500, "ENTGEGENGESETZTE REGELN", ap(t, P[1] + 0.4, 0.3), 26)
    elif si == 6:
        hero(c, 300)
        if card(c, 700, 800, 400, 520, ap(t, 0, 0.35)):
            c.move_to(-150, -210); c.line_to(0, -210); stroke(c, 0.5, 1, 6)
            text(c, -160, -110, "1.  17 × 3 = 51", 38, ap(t, 0.3, 0.3), align='l')
            text(c, -160, 10, "2.  √1764 = 41 ?", 38, ap(t, P[1], 0.3), align='l')
            c.restore()
        check_circle(c, 840, 690, 26, ap(t, 0.8, 0.3), True)
        k = ap(t, 1.2, 0.35)
        if k > 0:
            c.save(); c.translate(840, 580); c.scale(back(k), back(k)); c.new_path(); c.arc(0, 0, 42, 0, 2 * math.pi)
            c.set_line_width(5); c.set_source_rgba(*ACC, 1); c.stroke(); text(c, 0, 0, "1+", 40, 1, rgb=ACC); c.restore()
        bigx(c, 700, 810, 140, ap(t, P[1] + 0.6, 0.6))
        pill(c, 300, 920, "BELOHNT FÜRS WISSEN", ap(t, 0.5, 0.3), 24)
        star(c, 300, 1010, 24, ap(t, 0.7, 0.3))
        pill(c, 300, 820, "BESTRAFT FÜRS RATEN", ap(t, P[1] + 0.4, 0.3), 24, 0.6)
    elif si == 7:
        hero(c, 300)
        k = ap(t, 0.1, 0.35)
        if k > 0:
            c.save(); c.translate(600, 720); c.scale(back(k), back(k)); c.new_path(); c.arc(0, 0, 90, 0, 2 * math.pi); stroke(c, 1, 1, 7)
            c.move_to(-36, -36); c.line_to(36, 36); c.move_to(36, -36); c.line_to(-36, 36); stroke(c, 1, 1, 8); c.restore()
        pill(c, 600, 860, "FEHLER", ap(t, 0.3, 0.3), 28)
        k = eout(ap(t, P[1] + 0.2, 0.5))
        if k > 0:
            c.move_to(660, 785); c.line_to(lerp(660, 800, k), lerp(785, 960, k)); stroke(c, 0.7, 1, 3)
        k = ap(t, P[1] + 0.6, 0.35)
        if k > 0:
            c.save(); c.translate(860, 990); c.rotate(-0.12); c.scale(back(k), back(k))
            c.move_to(-120, -36); c.line_to(100, -36); c.line_to(130, 0); c.line_to(100, 36); c.line_to(-120, 36); c.close_path()
            c.set_source_rgba(*ACC, 1); c.fill(); text(c, -10, 0, "UNBEZAHLBAR", 30, 1, 0.05); c.restore()
        pill(c, 600, 540, "DAS TEUERSTE ÜBERHAUPT", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 8:
        hero(c, 300)
        if card(c, 540, 560, 640, 150, ap(t, 0.0, 0.35), 0.5):
            text(c, 0, -45, "SCHULE", 22, 1, 0.5); text(c, 0, 15, "WISSEN  →  HANDELN", 46, 1, 0.5); c.restore()
        if card(c, 540, 760, 640, 150, ap(t, 0.6, 0.35), rgb=ACC):
            text(c, 0, -45, "GELD", 22, 1, rgb=ACC); text(c, 0, 15, "HANDELN  →  WISSEN", 46, 1); c.restore()
        fog(c, 820, GY - 180, ap(t, P[1], 0.8), T)
        qmark(c, 820, GY - 180, ap(t, P[1] + 0.3, 0.3), 90, 0.8)
        pill(c, 760, 920, "NIEMAND WEISS ES VORHER", ap(t, P[1] + 0.5, 0.3), 24)
    elif si == 9:
        hero(c, 300, g=0.6)
        k = ap(t, P[1], d - P[1] + 0.3)
        wx = lerp(EDGE - 60, 900, ease(k))
        other(c, wx, GY - 4 + (4 * abs(math.sin(T * 9)) if 0 < k < 1 else 0), back(ap(t, 0.2, 0.4)))
        pill(c, 760, 560, "DIE ANTWORT ENTSTEHT BEIM MACHEN", ap(t, P[1] + 0.2, 0.3), 24)
    elif si == 10:
        hero(c, 300, g=lerp(0.6, 1.0, ap(t, P[1], 0.4)))
        other(c, 900, GY - 4)
        for i in range(5):
            tt = 0.3 + i * 0.35
            k = ap(t, tt, 0.5)
            if 0 < k:
                y = GY - 300 - 160 * eout(k); a = 1 - ap(t, tt + 0.9, 0.4)
                c.new_path(); c.arc(900 + (i - 2) * 45, y, 26, 0, 2 * math.pi); c.set_source_rgba(*ACC, a); c.fill()
                text(c, 900 + (i - 2) * 45, y, "€", 30, a, 0.05)
        pill(c, 860, 560, "BEZAHLT FÜRS HANDELN", ap(t, 0.2, 0.3), 26)
        pill(c, 300, 900, "SEIN LEBEN LANG VERMIEDEN", ap(t, P[1] + 0.3, 0.3), 24, 0.6)
        bigx(c, 300, 780, 40, ap(t, P[1] + 0.7, 0.4), 0.8)
    elif si == 11:
        hero(c, 300)
        # desk with growing paper stack
        c.move_to(330, GY - 90); c.line_to(520, GY - 90); c.move_to(350, GY - 90); c.line_to(350, GY); c.move_to(500, GY - 90); c.line_to(500, GY); stroke(c, 1, 1, 5)
        n = int(2 + 10 * ap(t, 0.2, d))
        for i in range(n):
            c.rectangle(380 + math.sin(i * 3.1) * 6, GY - 104 - i * 14, 110, 9); col(c, 1, 0.9); c.fill()
        clock(c, 435, GY - 360, 40, T)
        pill(c, 300, 640, "SUCHT DEN PERFEKTEN PLAN", ap(t, 0.3, 0.3), 24)
        other(c, 820, GY - 4)
        pill(c, 820, GY - 270, "WENIGER BEGABT", ap(t, P[1] + 0.3, 0.3), 22, 0.6)
        k = ap(t, P[1] + 1.2, 0.4)
        if k > 0:
            c.save(); c.translate(930, GY - 70); c.rotate(-0.15); c.scale(back(k), back(k))
            rrect(c, -60, -60, 120, 120, 10); c.set_line_width(5); c.set_source_rgba(*ACC, 1); c.stroke()
            text(c, 0, -8, "V1", 40, 1, rgb=ACC); c.restore()
        pill(c, 930, 820, "PEINLICH", ap(t, P[1] + 1.6, 0.3), 26)
    elif si == 12:
        hero(c, 300, g=0.45)
        other(c, 760, GY - 4)
        # growth: bars behind him
        for i in range(7):
            k = eout(ap(t, P[1] + i * 0.18, 0.5)) if i >= 2 else eout(ap(t, i * 0.4, 0.5))
            h = (40 + 18 * i * i) * k
            if h > 0:
                rrect(c, 620 + i * 52 - 20, GY - 30 - h, 40, h, 6) if False else c.rectangle(560 + i * 62, GY - 300 - h, 44, h)
                c.set_source_rgba(*ACC, 0.25 + 0.1 * i); c.fill()
        pill(c, 760, GY - 260, "LERNT UNTERWEGS", ap(t, 0.2, 0.3), 24)
        k = ap(t, P[2], 0.4)
        if k > 0:
            c.save(); c.translate(560, 560); c.scale(back(k), back(k)); text(c, 0, 0, "„GLÜCK“", 120, cl(k * 2), rgb=ACC); c.restore()
        if 2 * eout(ap(t, P[2] + 0.4, 0.3)) > 0: pill(c, 560, 680, "NENNEN ES ALLE", ap(t, P[2] + 0.4, 0.3), 26, 0.6)
