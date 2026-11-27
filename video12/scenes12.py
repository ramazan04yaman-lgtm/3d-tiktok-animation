def person(c, x, y=GY, s=1., g=1., rgb=None, a=1., rot=0., sy=1.):
    if a <= 0 or s <= 0.01: return
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s * sy)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2); c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    (c.set_source_rgba(*rgb, a) if rgb else col(c, g, a)); c.fill()
    c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill(); c.restore()

def savanna(c, T):
    lg = cairo.LinearGradient(0, H * 0.45, 0, H * 0.75)
    lg.add_color_stop_rgba(0, 1, 0.45, 0.15, 0.0); lg.add_color_stop_rgba(0.7, 1, 0.45, 0.15, 0.10); lg.add_color_stop_rgba(1, 1, 0.45, 0.15, 0.0)
    c.set_source(lg); c.paint()

def ground_fill(c):
    c.rectangle(-800, GY, 2700, 1400); col(c, 0.08, 1); c.fill()
    c.move_to(-800, GY); c.line_to(1900, GY); stroke(c, 0.5, 1, 3)
    for i in range(-6, 22):
        x = i * 90 + 30; c.move_to(x, GY + 30); c.line_to(x - 6, GY + 12); c.move_to(x + 6, GY + 30); c.line_to(x + 10, GY + 14); stroke(c, 0.3, 1, 2)
    # acacia trees silhouette
    for tx, ts in ((-150, 1.0), (1050, 0.8)):
        c.move_to(tx, GY); c.line_to(tx, GY - 220 * ts); stroke(c, 0.25, 1, 8)
        c.save(); c.translate(tx, GY - 230 * ts); c.scale(150 * ts, 30 * ts); c.new_path(); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); col(c, 0.22, 1); c.fill()

def elephant(c, x, y=GY, s=1., g=0.7, gold=0., musth=0., walk=0., T=0., a=1., face=1, fall=0.):
    if a <= 0 or s <= 0.01: return
    c.save(); c.translate(x, y); c.scale(s * face, s)
    if fall: c.translate(0, 40 * fall); c.rotate(-0.25 * fall)
    for lx, ph in ((-80, 0), (-40, 1.6), (45, 3.1), (85, 4.7)):
        sw = walk * 0.25 * math.sin(T * 7 + ph)
        c.save(); c.translate(lx, -110); c.rotate(sw); rrect(c, -20, 0, 40, 110 * (1 - 0.6 * fall), 10); col(c, g * 0.88, a); c.fill(); c.restore()
    c.new_path(); c.save(); c.translate(0, -150); c.scale(125, 75); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); col(c, g, a); c.fill()
    c.new_path(); c.arc(120, -175, 52, 0, 2 * math.pi); col(c, g, a); c.fill()
    c.new_path(); c.save(); c.translate(92, -168); c.scale(38, 54); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); col(c, g * 0.75, a); c.fill()
    tr = 0.3 * math.sin(T * 2) * (1 - fall)
    c.move_to(160, -170); c.curve_to(200, -130 + 20 * tr, 190, -70, 175 + 20 * tr, -40); c.set_line_width(26); c.set_line_cap(cairo.LINE_CAP_ROUND); col(c, g, a); c.stroke()
    c.move_to(150, -145); c.curve_to(175, -125, 195, -120, 210, -135); c.set_line_width(9); c.set_source_rgba(1, 0.97, 0.9, a); c.stroke()
    c.new_path(); c.arc(132, -190, 6, 0, 2 * math.pi)
    if musth > 0.3: c.set_source_rgba(*RED, a)
    else: col(c, 0.1, a)
    c.fill()
    if musth > 0.3:
        c.move_to(124, -184); c.line_to(118, -150); c.set_source_rgba(*RED, a * musth); c.set_line_width(5); c.stroke()
    if gold > 0:
        c.new_path(); c.save(); c.translate(0, -150); c.scale(129, 79); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()
        c.set_source_rgba(*ACC, gold * a); c.set_line_width(5); c.stroke()
        c.new_path(); c.arc(120, -175, 56, 0, 2 * math.pi); c.set_source_rgba(*ACC, gold * a); c.stroke()
    c.restore()

def rhino(c, x, y=GY, s=1., a=1., dead=1.):
    c.save(); c.translate(x, y); c.scale(s, s)
    c.new_path(); c.save(); c.translate(0, -55); c.scale(110, 48); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); col(c, 0.45, a); c.fill()
    c.new_path(); c.save(); c.translate(-115, -40); c.scale(45, 30); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); c.fill()
    c.move_to(-150, -55); c.line_to(-185, -95); c.line_to(-160, -45); c.close_path(); col(c, 0.8, a); c.fill()
    for lx in (-60, 50):
        c.move_to(lx, -20); c.line_to(lx + 40, -8); stroke(c, 0.45, a, 18)
    c.restore()

def pool(c, x, y, r, a=1.):
    if r <= 0: return
    c.save(); c.translate(x, y); c.scale(1, 0.16); c.new_path()
    for i in range(41):
        th = i / 40 * 2 * math.pi; rr = r * (1 + 0.12 * math.sin(th * 5 + 1.3))
        (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
    c.close_path(); c.restore(); c.set_source_rgba(0.75, 0.08, 0.1, 0.85 * a); c.fill()

def ranger(c, x, a=1., aim=0.):
    person(c, x, GY, 0.8, g=0.75, a=a)
    c.move_to(x - 50, GY - 205); c.line_to(x + 50, GY - 205); c.set_source_rgba(0.7, 0.6, 0.4, a); c.set_line_width(8); c.stroke()
    c.new_path(); c.arc(x, GY - 210, 26, math.pi, 2 * math.pi); c.close_path(); c.fill()
    if aim > 0:
        c.move_to(x - 20, GY - 120); c.line_to(x - 20 - 160 * aim, GY - 135); stroke(c, 0.6, a, 7)

def truck(c, x, a=1.):
    rrect(c, x - 170, GY - 170, 230, 130, 8); c.set_source_rgba(0.6, 0.45, 0.3, a); c.set_line_width(5); c.stroke()
    for i in range(4): c.move_to(x - 160, GY - 150 + i * 30); c.line_to(x + 50, GY - 150 + i * 30)
    c.set_source_rgba(0.6, 0.45, 0.3, 0.6 * a); c.set_line_width(3); c.stroke()
    rrect(c, x + 70, GY - 130, 90, 90, 10); stroke(c, 0.6, a, 5)
    for wx in (x - 120, x + 20, x + 120):
        c.new_path(); c.arc(wx, GY - 30, 26, 0, 2 * math.pi); stroke(c, 0.7, a, 5)

def hormone(c, x, y, lvl, a=1.):
    rrect(c, x - 18, y - 200, 36, 200, 10); stroke(c, 0.6, a, 3)
    h = 196 * cl(lvl)
    rgb = RED if lvl > 0.5 else (0.45, 0.85, 0.5)
    rrect(c, x - 14, y - 2 - h, 28, h, 8); c.set_source_rgba(*rgb, a); c.fill()
    text(c, x, y + 24, "HORMON", 16, a, 0.6, spacing=2)

def counters(c, rh, bulls, a, yr=None, rh_label="TOTE NASHÖRNER"):
    if a <= 0: return
    for x, lab, val, rgb in ((260, rh_label, rh, RED), (820, "ALTE BULLEN", bulls, ACC)):
        rrect(c, x - 150, 410, 300, 110, 14); c.set_source_rgba(0.05, 0.05, 0.06, 0.85 * a); c.fill()
        text(c, x, 440, lab, 18, a, 0.6, spacing=2)
        text(c, x, 485, str(val), 44, a, rgb=rgb)

CAM = [(540, 960, 1.1, 1.0), (540, 960, 1.0, 1.03), (540, 960, 1.0, 1.03), (540, 960, 1.0, 1.04),
       (540, 960, 1.0, 1.04), (540, 960, 1.0, 1.06), (520, 940, 1.25, 1.35), (540, 960, 1.0, 1.04),
       (540, 960, 0.95, 1.0), (540, 960, 1.0, 1.05), (540, 960, 1.05, 1.1), (540, 960, 1.0, 1.04),
       (540, 960, 1.0, 1.04), (540, 960, 1.0, 1.1)]

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

def rh_count(si, t, P, d):
    if si == 0: return int(40 * eout(ap(t, 0.3, P[1])))
    if si == 1: return "40+"
    if si in (2, 3, 4): return "40+"
    if si in (6, 7): return "40+"
    if si == 8: return "40+"
    if si == 9: return "40+" if t < P[1] + 0.3 else "0"
    return None

def bulls_count(si, t, P):
    if si < 8: return 0
    if si == 8: return min(6, int(cl((t - P[1]) / 0.35, 0, 6)))
    return 6

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    if si <= 10 or si >= 12: savanna(c, T)
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    if si == 5: cta(c, t, P); return
    if si <= 10 or si >= 12: ground_fill(c)
    else: ground(c, 1)
    if si == 0:
        pool(c, 380, GY + 6, 200, 1); rhino(c, 380, GY, 1.0)
        elephant(c, 720, GY, 0.85, g=0.7, musth=1, T=T)
        pill(c, 540, 720, "FRISST KEIN FLEISCH", ap(t, P[1] + 0.2, 0.3), 26)
    elif si == 1:
        pill(c, 540, 640, "WAHRE GESCHICHTE · SÜDAFRIKA", ap(t, 0.1, 0.3), 24)
        k = ap(t, P[1], 0.3)
        ranger(c, 860, k, aim=ap(t, P[1] + 0.2, 0.4))
        el_a = 1 - 0.7 * ap(t, P[1] + 1.2, 0.5)
        elephant(c, 380, GY, 0.8, g=0.7, musth=1, T=T, a=el_a, fall=ap(t, P[1] + 1.0, 0.6))
        if 1.0 < t - P[1] < 1.25: starburst(c, 690, GY - 135, 30, 1)
        rhino(c, 560, GY, 0.7, a=ap(t, P[1] + 2.0, 0.5)); pool(c, 560, GY + 6, 130 * ap(t, P[1] + 2.0, 0.8))
        pill(c, 540, 760, "DAS TÖTEN GING WEITER", ap(t, P[1] + 2.2, 0.3), 24, 0.85)
    elif si == 2:
        for i in range(5):
            elephant(c, 120 + i * 190 + 40 * t, GY, 0.5, g=0.7, walk=1, T=T + i)
        qmark(c, 540, 700, ap(t, 0.3, 0.3) * (1 - ap(t, P[1], 0.2)), 90)
        pill(c, 540, 700, "WAISEN", ap(t, P[1], 0.3), 34)
    elif si == 3:
        pill(c, 540, 600, "FRÜHER · KRÜGER-PARK", ap(t, 0.1, 0.3) * (1 - ap(t, P[1], 0.3)), 24, 0.7)
        if t < P[1] + 0.3:
            fa = 1 - ap(t, 1.6, 1.0)
            for i, x in enumerate((220, 540, 860)):
                elephant(c, x - 60, GY, 0.85, g=0.62, a=fa); elephant(c, x + 70, GY, 0.42, g=0.75)
            stamp(c, 540, 820, "ZU VIELE", ap(t, 1.2, 0.3) * (1 - ap(t, P[1], 0.3)))
        else:
            tx = lerp(-200, 560, ease(ap(t, P[1], 1.6)))
            truck(c, tx)
            for i in range(2): elephant(c, tx - 110 + i * 90, GY - 50, 0.32, g=0.75)
            pill(c, 540, 700, "KRÜGER → PILANESBERG", ap(t, P[1] + 0.6, 0.3), 26)
    elif si == 4:
        sc = lerp(0.42, 0.62, ap(t, 0, d))
        for i in range(5): elephant(c, 120 + i * 200, GY, sc, g=0.72, T=T + i)
        text(c, 540, 640, str(int(lerp(1985, 1994, ap(t, 0, d)))), 64, ap(t, 0.1, 0.3), 0.9, spacing=4)
        pill(c, 540, 740, "KEIN EINZIGER ALTER BULLE", ap(t, P[1], 0.3), 24)
    elif si == 6:
        lvl = ap(t, 0.5, 2.5)
        elephant(c, 440, GY, 1.0, g=0.72, musth=lvl, T=T)
        hormone(c, 880, GY - 60, lvl)
        pill(c, 600, 640, "MUSTH", ap(t, 0.3, 0.3), 32)
        pill(c, 600, 720, "NORMAL: MITTE 20", ap(t, P[1], 0.3), 24, 0.6)
        pill(c, 600, 790, "BEI IHNEN: 10 JAHRE FRÜHER", ap(t, P[1] + 1.2, 0.3), 24)
    elif si == 7:
        ex = lerp(260, 470, ease(ap(t, 0.2, 1.2)))
        elephant(c, ex, GY, 0.8, g=0.72, musth=1, walk=1 if t < 1.4 else 0, T=T)
        rhino(c, 780, GY, 0.8, a=1); pool(c, 780, GY + 6, 150 * ap(t, 1.2, 0.8))
        c.set_dash([12, 10]); c.new_path(); c.save(); c.translate(160, GY - 180); c.scale(130, 110); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()
        c.set_source_rgba(*ACC, 0.7 * ap(t, P[1], 0.4)); c.set_line_width(4); c.stroke(); c.set_dash([])
        qmark(c, 160, GY - 180, ap(t, P[1] + 0.2, 0.3), 80, 0.8)
        pill(c, 160, GY + 60, "NIEMAND", ap(t, P[1] + 0.3, 0.3), 24)
    elif si == 8:
        text(c, 540, 640, "1998", 96, ap(t, 0.1, 0.3), rgb=ACC)
        tx = lerp(-200, 250, ease(ap(t, 0.5, 1.5)))
        truck(c, tx)
        for i in range(6):
            k = ap(t, P[1] + i * 0.35, 0.4)
            elephant(c, 470 + (i % 3) * 180 + (i // 3) * 90, GY - (i // 3) * 0 + (i // 3) * 0, 0.55 * back(k), g=0.68, gold=1, a=cl(k * 2))
    elif si == 9:
        lvl = 1 - ap(t, P[1], 1.0)
        elephant(c, 260, GY, 0.7, g=0.72, musth=lvl, T=T)
        bx = lerp(900, 560, ease(ap(t, 0.2, 1.2)))
        elephant(c, bx, GY, 1.0, g=0.65, gold=1, T=T, face=-1, walk=1 if t < 1.4 else 0)
        hormone(c, 80, GY - 60, lvl)
        if t > P[1] + 0.3:
            pill(c, 540, 720, "SEIT 1998: 0 TOTE NASHÖRNER", ap(t, P[1] + 0.4, 0.3), 24)
    elif si == 10:
        elephant(c, 300, GY, 0.6, g=0.72, T=T)
        elephant(c, 620, GY, 0.95, g=0.65, gold=1, T=T, face=-1)
        stamp(c, 540, 700, "BESTIEN?", ap(t, 0.2, 0.3) * (1 - ap(t, P[1], 0.3)))
        pill(c, 540, 680, "NICHT BÖSE", ap(t, P[1], 0.3), 28)
        pill(c, 540, 760, "WOHIN MIT DER KRAFT?", ap(t, P[1] + 1.4, 0.3), 26, 0.85)
    elif si == 11:
        rage = ap(t, P[0] + 2.4, 0.4) * (1 - ap(t, P[1], 0.3))
        for i, x in enumerate((260, 540, 820)):
            rgb = RED if (i == 1 and rage > 0.5) else None
            person(c, x, GY, 0.8, g=0.75, rgb=rgb)
        if rage > 0: starburst(c, 540, GY - 300, 40, rage); pill(c, 540, GY - 380, "WUT", rage, 26)
        k = ap(t, P[1], 0.4)
        if k > 0:
            c.rectangle(-300, 400, 1680, 1100); c.set_source_rgba(0.035, 0.035, 0.04, 0.92 * k); c.fill()
            person(c, 540, GY, 0.9, rgb=(1, lerp(1, 0.4, ap(t, P[1] + 0.8, 1)), lerp(1, 0.38, ap(t, P[1] + 0.8, 1))), a=k)
            pill(c, 540, GY + 60, "DU", k, 24)
            hormone(c, 200, GY - 60, ap(t, P[1] + 0.6, 1.6), k)
    elif si == 12:
        lvl = 0.9 if t < P[1] + 0.5 else 0.9 - 0.75 * ap(t, P[1] + 0.5, 1.2)
        person(c, 420, GY, 0.9, rgb=(1, lerp(0.4, 1, 1 - lvl), lerp(0.38, 1, 1 - lvl)))
        hormone(c, 160, GY - 60, lvl)
        stamp(c, 420, 680, "STRAFE", ap(t, 0.3, 0.3) * (1 - ap(t, P[1], 0.3)))
        if t > 1.2 and t < P[1]: pill(c, 420, 800, "ÄNDERT NICHTS", ap(t, 1.2, 0.3), 24, 0.6)
        elephant(c, 760, GY, 0.85 * back(ap(t, P[1], 0.4)), g=0.65, gold=1, face=-1, T=T)
        pill(c, 760, 700, "BLEIBT RUHIG", ap(t, P[1] + 0.6, 0.3), 24)
    elif si == 13:
        person(c, 380, GY, 0.9)
        elephant(c, 700, GY, 0.9, g=0.65, gold=1, face=-1, T=T)
        if card(c, 540, 700, 600, 150, ap(t, P[1] - 0.2, 0.35), rgb=ACC):
            text(c, 0, -28, "DEIN ALTER ELEFANT", 30, 1, 0.8, spacing=2); text(c, 0, 30, "?", 56, 1, rgb=ACC); c.restore()
    # counters (top)
    rc = rh_count(si, t, P, d)
    if rc is not None:
        lab = "TOTE NASHÖRNER"
        if si == 9 and t > P[1] + 0.3: lab = "SEIT 1998"
        counters(c, rc, bulls_count(si, t, P), ap(T, 0.2, 0.4), rh_label=lab) if False else None
