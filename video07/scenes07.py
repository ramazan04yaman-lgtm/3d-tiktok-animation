def testsheet(c, x, y, p, nx, grade=None):
    if not card(c, x, y, 300, 400, p): return
    text(c, -60, -160, "TEST", 26, 1, 0.6)
    for i in range(6):
        c.move_to(-110, -100 + i * 50); c.line_to(40, -100 + i * 50); stroke(c, 0.45, 1, 5)
        if i < nx:
            k = 18; xx, yy = 90, -100 + i * 50
            c.move_to(xx - k, yy - k); c.line_to(xx + k, yy + k); c.move_to(xx + k, yy - k); c.line_to(xx - k, yy + k)
            c.set_source_rgba(*RED, 1); c.set_line_width(5); c.stroke()
    if grade:
        c.new_path(); c.arc(95, -165, 30, 0, 2 * math.pi); c.set_source_rgba(*RED, 1); c.set_line_width(4); c.stroke()
        text(c, 95, -165, grade, 32, 1, rgb=RED)
    c.restore()

def globe(c, x, y, r, p, rgb=None):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); s = back(p); c.scale(s, s)
    setc = (lambda: c.set_source_rgba(*rgb, a)) if rgb else (lambda: col(c, 1, a))
    c.new_path(); c.arc(0, 0, r, 0, 2 * math.pi); setc(); c.set_line_width(5); c.stroke()
    c.save(); c.scale(0.45, 1); c.new_path(); c.arc(0, 0, r, 0, 2 * math.pi); c.restore(); setc(); c.set_line_width(4); c.stroke()
    for yy in (-r * 0.5, 0, r * 0.5):
        w = math.sqrt(max(0, r * r - yy * yy)); c.move_to(-w, yy); c.line_to(w, yy)
    setc(); c.stroke(); c.restore()

def schoolhouse(c, x, y, s, p, g=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    c.move_to(-110, 0); c.line_to(-110, -120); c.line_to(0, -190); c.line_to(110, -120); c.line_to(110, 0); c.close_path(); stroke(c, g, a, 5)
    rrect(c, -22, -70, 44, 70, 6); stroke(c, g, a, 5)
    for xx in (-75, 45): c.rectangle(xx, -100, 30, 30); stroke(c, g, a, 4)
    c.move_to(0, -190); c.line_to(0, -250); stroke(c, g, a, 4); c.move_to(0, -250); c.line_to(40, -238); c.line_to(0, -226); c.close_path(); col(c, g, a); c.fill()
    c.restore()

def productbox(c, x, y, p, label, rgb=None, crossed=0., sub=None):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); s = back(p); c.scale(s, s)
    setc = (lambda al=a: c.set_source_rgba(*rgb, al)) if rgb else (lambda al=a: col(c, 1 if crossed < 0.5 else 0.5, al))
    rrect(c, -80, -80, 160, 160, 16); setc(); c.set_line_width(5); c.stroke()
    c.move_to(-30, -15); c.line_to(0, -32); c.line_to(30, -15); c.line_to(30, 22); c.line_to(0, 38); c.line_to(-30, 22); c.close_path()
    c.move_to(-30, -15); c.line_to(0, 2); c.line_to(30, -15); c.move_to(0, 2); c.line_to(0, 38); setc(); c.set_line_width(4); c.stroke()
    text(c, 0, 115, label, 24, a, 0.8, rgb=rgb)
    if sub: text(c, 0, 150, sub, 22, a, 0.55, rgb=rgb)
    c.restore()
    if crossed > 0: bigx(c, x, y, 70, crossed, 0.9)

def bulb(c, x, y, s, p, glow=1.):
    if p <= 0: return
    a = cl(p * 2); c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc)
    c.new_path(); c.arc(0, -10, 34, math.pi * 0.8, math.pi * 2.2); c.line_to(14, 30); c.line_to(-14, 30); c.close_path()
    c.set_source_rgba(*ACC, a * glow); c.fill_preserve(); c.set_source_rgba(*ACC, a); c.set_line_width(4); c.stroke()
    for yy in (38, 48): c.move_to(-12, yy); c.line_to(12, yy)
    col(c, 0.8, a); c.set_line_width(4); c.stroke(); c.restore()

def funnel(c, x, y, p):
    if p <= 0: return
    a = cl(p * 2)
    c.move_to(x - 200, y - 200); c.line_to(x - 30, y); c.line_to(x - 30, y + 60)
    c.move_to(x + 200, y - 200); c.line_to(x + 30, y); c.line_to(x + 30, y + 60); stroke(c, 1, a, 6)

def bin_(c, x, y, a, n):
    c.move_to(x - 80, y - 100); c.line_to(x - 70, y); c.line_to(x + 70, y); c.line_to(x + 80, y - 100); stroke(c, 0.7, a, 5)
    for i in range(n):
        r_, k = divmod(i, 5); c.new_path(); c.arc(x - 52 + k * 26, y - 16 - r_ * 26, 11, 0, 2 * math.pi); col(c, 0.6, a); c.fill()

def pricetag(c, x, y, s, p, label, rgb=ACC, dark=True):
    if p <= 0: return
    c.save(); c.translate(x, y); sc = back(p) * s; c.scale(sc, sc); a = cl(p * 2)
    c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(30); w = c.text_extents(label).x_advance + 70
    c.move_to(-w / 2 + 30, -36); c.line_to(w / 2, -36); c.line_to(w / 2, 36); c.line_to(-w / 2 + 30, 36); c.line_to(-w / 2, 0); c.close_path()
    c.set_source_rgba(*rgb, a); c.set_line_width(4); c.stroke()
    c.new_path(); c.arc(-w / 2 + 26, 0, 6, 0, 2 * math.pi); c.set_source_rgba(*rgb, a); c.fill()
    text(c, 15, 0, label, 30, a, rgb=rgb); c.restore()

def arrow_r(c, x0, x1, y, p, g=0.7):
    if p <= 0: return
    xe = lerp(x0, x1, eout(p)); c.move_to(x0, y); c.line_to(xe, y); stroke(c, g, 1, 4)
    c.move_to(xe - 12, y - 10); c.line_to(xe, y); c.line_to(xe - 12, y + 10); stroke(c, g, 1, 4)

CAM = [(540, 940, 1.1, 1.0), (540, 940, 1.0, 1.04), (540, 940, 1.0, 1.04), (540, 920, 1.0, 1.05),
       (540, 900, 1.0, 1.04), (540, 920, 1.0, 1.03), (560, 920, 1.0, 1.05), (540, 900, 1.0, 1.05),
       (540, 980, 1.05, 1.12), (540, 960, 1.0, 1.03), (540, 940, 1.0, 1.04), (540, 900, 0.95, 1.0)]

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

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    if si in (1, 2, 8, 9, 10): ground(c, 1)
    if si == 0:
        nx = int(cl(t / 0.25, 0, 6))
        testsheet(c, 330, 800, ap(t, 0, 0.35), nx)
        pill(c, 330, 1040, "MEISTE FEHLER", ap(t, 1.0, 0.3), 26)
        k = ap(t, 1.6, 0.4)
        if k > 0:
            text(c, 760, 640, fmt(1238239 * eout(ap(t, 1.6, P[1] - 1.4))), 56, cl(k * 2), rgb=ACC)
            c.new_path()
            for i in range(41):
                u = i / 40 * eout(ap(t, 1.6, 1.5)); xx = lerp(600, 920, u); yy = 900 - 200 * u ** 2.2
                (c.move_to if i == 0 else c.line_to)(xx, yy)
            c.set_source_rgba(*ACC, 1); c.set_line_width(6); c.stroke()
        pill(c, 760, 1040, "MEISTES GELD", ap(t, 2.4, 0.3), 26)
        qmark(c, 540, 470, ap(t, P[1], 0.3), 80)
    elif si == 1:
        xs = [180, 360, 540, 720, 900]
        back_ = ap(t, 1.0, 0.8)
        for i, x in enumerate(xs):
            if i == 2:
                figure(c, x, GY + 140 * eout(back_), 0.8, lerp(1, 0.55, back_))
            else: figure(c, x, GY, 0.8, 0.85)
        pill(c, 540, 640, "DIE MEISTEN GLAUBEN", ap(t, 0.1, 0.3), 24, 0.6)
        pill(c, 540, GY + 250, "ZURÜCKGEFALLEN", ap(t, 1.4, 0.3), 24)
        k = ap(t, P[1], 0.4)
        if k > 0:
            c.rectangle(-300, 400, 1680, 700); c.set_source_rgba(0.035, 0.035, 0.04, 0.9 * k); c.fill()
            schoolhouse(c, 300, 1000, 1.0, k)
            grades = ["1", "2", "3", "4", "5"]
            gi = min(4, int(max(0, t - P[1] - 0.4) / 0.55))
            testsheet(c, 760, 800, k, gi + 1, grades[gi])
            pill(c, 760, 1040, "JEDER FEHLER = SCHLECHTERE NOTE", ap(t, P[1] + 1.0, 0.3), 22)
    elif si == 2:
        schoolhouse(c, 250, GY, 0.8, 1, 0.4)
        text(c, 250, GY + 60, "SCHULE", 24, 1, 0.4)
        c.set_dash([10, 10]); c.move_to(440, 520); c.line_to(440, GY); stroke(c, 0.5, ap(t, 0.2, 0.4), 3); c.set_dash([])
        globe(c, 760, 700, 90, ap(t, 0.4, 0.4), ACC)
        text(c, 760, 840, "ECHTE WELT", 30, ap(t, 0.5, 0.3), rgb=ACC)
        figure(c, 760, GY, 0.8)
        for i in range(7):
            k = ap(t, P[1] + 0.1 * i, 0.3) * (1 - ap(t, P[1] + 1.6, 0.6))
            ang = i / 7 * 2 * math.pi + t * 0.5; xx = 760 + 190 * math.cos(ang); yy = GY - 120 + 120 * math.sin(ang)
            if k > 0:
                c.move_to(xx - 14, yy - 14); c.line_to(xx + 14, yy + 14); c.move_to(xx + 14, yy - 14); c.line_to(xx - 14, yy + 14)
                c.set_source_rgba(*RED, k); c.set_line_width(5); c.stroke()
        pill(c, 760, 560, "NIEMAND ZÄHLT MIT", ap(t, P[1] + 1.2, 0.3), 26)
    elif si == 3:
        for i in range(6):
            k = ap(t, 0.1 * i, 0.3)
            x = 240 + i * 120; c.new_path(); c.arc(x, 720, 12, 0, 2 * math.pi)
            if i == 5: c.set_source_rgba(*ACC, k)
            else: col(c, 0.45, k)
            c.fill()
        check_circle(c, 840, 620, 40, ap(t, 0.9, 0.35), True)
        pill(c, 540, 560, "NUR DAS ERGEBNIS ZÄHLT", ap(t, 0.5, 0.3), 26)
        funnel(c, 540, 1080, ap(t, P[1], 0.4))
        pill(c, 540, 850, "SCHNELLSTER WEG", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 4:
        funnel(c, 540, 900, 1)
        pill(c, 540, 600, "SCHNELLSTER WEG", 1, 26)
        n = int(cl((t - 0.2) / 0.45, 0, 99)); bad = 0
        for i in range(n + 1):
            tt = 0.2 + i * 0.45; k = ap(t, tt, 0.6)
            if k <= 0 or k >= 1 and i < n: continue
            good = (tt > P[1] + 1.2)
            if good and i < n: continue
            yy = lerp(640, 920, eout(k)); xx = 540 + (0 if good else lerp(0, 260, ap(t, tt + 0.4, 0.3)))
            c.new_path(); c.arc(xx, yy, 16, 0, 2 * math.pi)
            if good: c.set_source_rgba(*ACC, 1)
            else: col(c, 0.85, 1 - ap(t, tt + 0.6, 0.1))
            c.fill()
        nb = min(n, sum(1 for i in range(n) if 0.2 + i * 0.45 + 0.7 < t and 0.2 + i * 0.45 <= P[1] + 1.2))
        bin_(c, 820, 1120, 1, nb)
        pill(c, 820, 1170, "AUSSORTIERT", ap(t, 0.8, 0.3), 22, 0.6)
        if t > P[1] + 1.6:
            check_circle(c, 540, 1060, 40, ap(t, P[1] + 1.8, 0.35), True)
            pill(c, 540, 1140, "FUNKTIONIERT", ap(t, P[1] + 2.0, 0.3), 26)
    elif si == 5:
        k = ap(t, 0, 0.4)
        if card(c, 540, 600, 420, 220, k * (1 - ap(t, P[1] - 0.4, 0.3))):
            c.rectangle(-210, -110, 420, 36); col(c, 0.2, 1); c.fill()
            text(c, 0, 20, "ONLINE-BUSINESS", 34, 1); c.restore()
        figure(c, 540, GY, 0.8 * back(ap(t, 0.2, 0.4)))
        productbox(c, 300, 800, ap(t, P[1], 0.35), "PRODUKT 1", crossed=ap(t, P[1] + 1.0, 0.5), sub="0 VERKÄUFE")
        productbox(c, 780, 800, ap(t, P[2], 0.35), "PRODUKT 2", crossed=ap(t, P[2] + 0.8, 0.5), sub="IGNORIERT")
    elif si == 6:
        productbox(c, 230, 800, 1, "PRODUKT 1", crossed=1)
        productbox(c, 540, 800, 1, "PRODUKT 2", crossed=1)
        productbox(c, 850, 800, ap(t, 0, 0.35), "PRODUKT 3", ACC, sub="3 VERKÄUFE")
        for i in range(3):
            k = ap(t, 0.8 + i * 0.4, 0.4)
            if k > 0:
                c.new_path(); c.arc(810 + i * 40, 680 - 30 * eout(k), 18, 0, 2 * math.pi); c.set_source_rgba(*ACC, 1); c.fill()
                text(c, 810 + i * 40, 680 - 30 * eout(k), "€", 20, 1, 0.05)
        qmark(c, 960, 640, ap(t, P[1], 0.3), 60, 0.8)
        figure(c, 540, GY, 0.8)
    elif si == 7:
        for i, (x, lab) in enumerate(((240, "VERSUCH 1"), (540, "VERSUCH 2"), (840, "VERSUCH 3"))):
            productbox(c, x, 620, 1, lab, ACC if i == 2 else None, crossed=1 if i < 2 else 0)
            k = ap(t, 0.4 + 0.3 * i, 0.6)
            if k > 0:
                c.move_to(x, 760); c.line_to(lerp(x, 540, eout(k)), lerp(760, 900, eout(k))); c.set_dash([8, 8]); stroke(c, 0.6, 1, 3); c.set_dash([])
        bulb(c, 540, 960, 1.6, ap(t, 1.3, 0.4), glow=lerp(0.2, 1, ap(t, P[1], 0.5)))
        pill(c, 540, 1100, "WAS DIE LEUTE WOLLEN", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 8:
        k = ap(t, 0, d)
        stop = ap(t, P[1], 0.3)
        fx = lerp(200, 520, ease(min(1, t / max(0.1, P[1]))))
        figure(c, fx, GY, 0.8, lerp(1, 0.6, stop))
        for i in range(8):
            c.new_path(); c.arc(fx + 120 + i * 60, GY - 10, 5, 0, 2 * math.pi); col(c, 0.5, 1 - stop); c.fill()
        pricetag(c, 760, 760, 1.3, ap(t, P[1] + 0.2, 0.35), "TEUER", RED)
        pill(c, 540, 600, "SCHEITERN IST NUR TEUER…", ap(t, 0.2, 0.3), 24, 0.6)
        pill(c, 760, 880, "…WENN DU AUFHÖRST", ap(t, P[1] + 0.5, 0.3), 26)
    elif si == 9:
        # staircase of insights
        x0, y0 = 160, GY
        for i in range(6):
            c.move_to(x0 + i * 100, y0 - i * 70); c.line_to(x0 + (i + 1) * 100, y0 - i * 70); c.line_to(x0 + (i + 1) * 100, y0 - (i + 1) * 70)
        c.line_to(x0 + 6 * 100, y0); stroke(c, 0.6, 1 - ap(t, P[1], 0.4), 4)
        st = 6 * ap(t, 0.3, P[1] - 0.5)
        if t < P[1] + 0.3:
            fx, fy = x0 + st * 100 + 50, y0 - math.floor(st) * 70
            figure(c, fx, fy, 0.6, a=1 - ap(t, P[1], 0.3))
            for i in range(int(st)):
                bulb(c, x0 + i * 100 + 50, y0 - i * 70 - 200, 0.7, 1 - ap(t, P[1], 0.3))
        pill(c, 540, 560, "WEITERMACHEN", ap(t, 0.2, 0.3) * (1 - ap(t, P[1], 0.3)), 26)
        k = ap(t, P[1] + 0.2, 0.4)
        if k > 0:
            figure(c, 300, GY, 0.8 * back(k), 0.7); figure(c, 780, GY, 0.8 * back(k))
            for i in range(2):
                c.save(); c.translate(250 + i * 90, 760 + 30 * math.sin(T * 5 + i)); c.rotate(T * 2 + i); rrect(c, -26, -26, 52, 52, 8); stroke(c, 0.7, k, 4)
                c.new_path(); c.arc(0, 0, 5, 0, 2 * math.pi); col(c, 0.7, k); c.fill(); c.restore()
            nb = int(6 * ap(t, P[1] + 0.6, 2.0))
            for i in range(nb):
                c.rectangle(860, GY - 40 - i * 44, 120, 38); c.set_source_rgba(*ACC, 0.9); c.set_line_width(4); c.stroke()
            pill(c, 300, 1050, "RATEN", ap(t, P[1] + 0.5, 0.3), 26, 0.6)
            pill(c, 780, 1050, "AUFBAUEN", ap(t, P[1] + 0.7, 0.3), 26)
    elif si == 10:
        for i in range(10):
            r_, k_ = divmod(i, 5); x = 300 + k_ * 120; y = 620 + r_ * 130
            conv = ap(t, 0.8 + i * 0.12, 0.3)
            if conv < 1:
                c.new_path(); c.arc(x, y, 36, 0, 2 * math.pi); col(c, 0.7, ap(t, 0.05 * i, 0.3) * (1 - conv)); c.set_line_width(4); c.stroke()
                c.move_to(x - 13, y - 13); c.line_to(x + 13, y + 13); c.move_to(x + 13, y - 13); c.line_to(x - 13, y + 13); c.stroke()
            bulb(c, x, y, 0.8, conv)
        pill(c, 540, 500, "10 × GESCHEITERT = 10 LEKTIONEN", ap(t, 1.4, 0.3), 24)
        figure(c, 300, GY, 0.8)
        k = ap(t, P[1], 0.4)
        figure(c, 780, GY, 0.8 * back(k), 0.7)
        if card(c, 780, GY - 330, 220, 110, k):
            text(c, 0, -22, "BILANZ", 20, 1, 0.6); text(c, 0, 20, "100 %", 40, 1); c.restore()
        pill(c, 780, GY - 440, "0 LEKTIONEN", ap(t, P[1] + 0.8, 0.3), 24, 0.6)
    elif si == 11:
        y1, y2 = 640, 900
        schoolhouse(c, 190, y1 + 60, 0.5, ap(t, 0, 0.3), 0.7)
        arrow_r(c, 260, 360, y1, ap(t, 0.3, 0.3))
        check_circle(c, 420, y1, 36, ap(t, 0.5, 0.3), False, 0.8)
        arrow_r(c, 470, 560, y1, ap(t, 0.7, 0.3))
        pricetag(c, 680, y1, 1.0, ap(t, 0.9, 0.35), "PREIS", (0.8, 0.8, 0.8))
        arrow_r(c, 790, 860, y1, ap(t, 1.3, 0.3))
        k = ap(t, 1.5, 0.3)
        if k > 0: text(c, 920, y1, "6", 56, k, rgb=RED)
        text(c, 540, y1 + 110, "FALSCHE ANTWORT", 22, ap(t, 1.6, 0.3), 0.5, spacing=2)
        globe(c, 190, y2, 50, ap(t, P[1], 0.3), ACC)
        arrow_r(c, 260, 360, y2, ap(t, P[1] + 0.3, 0.3))
        check_circle(c, 420, y2, 36, ap(t, P[1] + 0.5, 0.3), False, 0.8)
        arrow_r(c, 470, 560, y2, ap(t, P[1] + 0.7, 0.3))
        pricetag(c, 680, y2, 1.0, ap(t, P[1] + 0.9, 0.35), "PREIS", ACC)
        arrow_r(c, 790, 860, y2, ap(t, P[1] + 1.3, 0.3))
        k = ap(t, P[1] + 1.5, 0.35)
        if k > 0:
            c.new_path(); c.arc(920, y2, 40, 0, 2 * math.pi); c.set_source_rgba(*ACC, k); c.fill()
            c.move_to(902, y2); c.line_to(915, y2 + 14); c.line_to(940, y2 - 14); stroke(c, 0.05, k, 6)
        text(c, 540, y2 + 110, "RICHTIGE ANTWORT", 22, ap(t, P[1] + 1.6, 0.3), rgb=ACC, spacing=2)
