KX = 620   # knife x

def person(c, x, y=GY, s=1., g=1., rgb=None, a=1., rot=0., sy=1.):
    if a <= 0 or s <= 0.01: return
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s * sy)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2); c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    (c.set_source_rgba(*rgb, a) if rgb else col(c, g, a)); c.fill()
    c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill(); c.restore()

def night(c, T, dawn=0.):
    # stars + moon (world-independent, drawn before camera)
    r = np.random.default_rng(3)
    for i in range(50):
        x, y = r.uniform(0, W), r.uniform(0, H * 0.55)
        c.new_path(); c.arc(x, y, r.uniform(1, 2.6), 0, 2 * math.pi); col(c, 1, (0.25 + 0.35 * abs(math.sin(T * 0.8 + i))) * (1 - dawn)); c.fill()
    if dawn > 0:
        lg = cairo.LinearGradient(0, 0, 0, H); lg.add_color_stop_rgba(0, 0.25, 0.12, 0.2, 0.0); lg.add_color_stop_rgba(0.6, 0.85, 0.45, 0.3, 0.22 * dawn); lg.add_color_stop_rgba(1, 0.85, 0.45, 0.3, 0.0)
        c.set_source(lg); c.paint()
    c.new_path(); c.arc(860, 300, 52, 0, 2 * math.pi); col(c, 1, 0.9 * (1 - dawn)); c.fill()

def snow(c):
    c.rectangle(-600, GY, 2400, 1400); col(c, 0.11, 1); c.fill()
    c.move_to(-600, GY); c.line_to(1800, GY); stroke(c, 0.6, 1, 3)

def knife(c, x, y, s, coat, a=1., shine=0.):
    """coat 0..1 (red ice layer thickness), handle down at y"""
    c.save(); c.translate(x, y); c.scale(s, s)
    c.rectangle(-16, -70, 32, 70); c.set_source_rgba(*ACC, a); c.fill()
    c.rectangle(-30, -82, 60, 14); c.fill()
    c.move_to(-18, -82); c.line_to(-18, -280); c.line_to(0, -330); c.line_to(18, -280); c.line_to(18, -82); c.close_path()
    lg = cairo.LinearGradient(-18, 0, 18, 0); lg.add_color_stop_rgba(0, 0.95, 0.95, 0.97, a); lg.add_color_stop_rgba(1, 0.55, 0.56, 0.6, a)
    c.set_source(lg); c.fill()
    if coat > 0:
        e = 4 + 22 * coat
        c.move_to(-18 - e, -82); c.line_to(-18 - e, -280); c.line_to(0, -330 - e * 1.4); c.line_to(18 + e, -280); c.line_to(18 + e, -82); c.close_path()
        c.set_source_rgba(0.72, 0.08, 0.1, (0.55 + 0.4 * coat) * a); c.fill()
        for k in range(int(6 * coat)):
            yy = -100 - k * 34; c.move_to(-18 - e, yy); c.line_to(18 + e, yy - 8); c.set_source_rgba(1, 0.5, 0.5, 0.35 * a); c.set_line_width(2); c.stroke()
    c.restore()
    if shine > 0:
        c.save(); c.translate(x + 10 * s, y - 250 * s); c.rotate(0.3); c.new_path()
        for i in range(8):
            rr = 46 if i % 2 == 0 else 8; th = i * math.pi / 4
            (c.move_to if i == 0 else c.line_to)(rr * math.cos(th) * shine, rr * math.sin(th) * shine)
        c.close_path(); col(c, 1, shine); c.fill(); c.restore()

def ice(c, x, y, s=1.):
    c.save(); c.translate(x, y); c.scale(s, s)
    c.move_to(-60, 0); c.line_to(-40, -14); c.line_to(40, -14); c.line_to(60, 0); c.close_path(); c.set_source_rgba(0.8, 0.9, 1, 0.8); c.fill(); c.restore()

def pool(c, x, y, r, a=1.):
    if r <= 0: return
    c.save(); c.translate(x, y); c.scale(1, 0.18); c.new_path()
    for i in range(41):
        th = i / 40 * 2 * math.pi; rr = r * (1 + 0.12 * math.sin(th * 5 + 1.3))
        (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
    c.close_path(); c.restore(); c.set_source_rgba(0.75, 0.08, 0.1, 0.9 * a); c.fill()

def wolf(c, x, y, s=1., lower=0., lick=0., fold=0., walk=0., T=0., a=1., tongue=0.):
    c.save(); c.translate(x, y); c.scale(s, s); c.translate(0, 95 * fold)
    g = 0.82
    for lx, ph in ((-115, 0), (-85, 1.6), (70, 3.1), (100, 4.7)):
        sw = walk * 0.4 * math.sin(T * 9 + ph)
        L = 135 * (1 - 0.7 * fold)
        c.save(); c.translate(lx, -135); c.rotate(sw + (1.3 * fold if lx > 0 else -1.3 * fold))
        rrect(c, -11, 0, 22, L, 9); col(c, g * 0.9, a); c.fill(); c.restore()
    c.new_path(); c.save(); c.translate(-10, -160); c.scale(150, 52); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); col(c, g, a); c.fill()
    # tail
    c.move_to(-150, -175); c.curve_to(-210, -160, -230, -110, -215, -80); c.set_line_width(26); c.set_line_cap(cairo.LINE_CAP_ROUND); col(c, g * 0.85, a); c.stroke()
    # neck + head
    hy = lerp(-215, -70, lower) + lick * 10 * math.sin(T * 14)
    hx = lerp(190, 205, lower)
    c.move_to(90, -190); c.line_to(130, -130); c.line_to(hx - 10, hy + 25); c.line_to(hx - 45, hy - 25); c.close_path(); col(c, g, a); c.fill()
    c.save(); c.translate(hx, hy); c.rotate(lerp(0.15, 0.9, lower) + 0.5 * fold)
    c.move_to(-55, -30); c.line_to(10, -32); c.line_to(70, -8); c.line_to(72, 6); c.line_to(10, 22); c.line_to(-50, 24); c.close_path(); col(c, g, a); c.fill()
    c.move_to(-48, -28); c.line_to(-38, -70); c.line_to(-20, -30); c.close_path(); c.fill()
    c.move_to(-25, -30); c.line_to(-12, -64); c.line_to(2, -31); c.close_path(); c.fill()
    c.new_path()
    if fold > 0.5: c.move_to(-4, -16); c.line_to(10, -6); stroke(c, 0.1, a, 4)
    else: c.arc(2, -12, 5, 0, 2 * math.pi); c.set_source_rgba(*ACC, a); c.fill()
    c.new_path(); c.arc(72, 0, 7, 0, 2 * math.pi); col(c, 0.1, a); c.fill()
    if tongue > 0:
        c.move_to(55, 12); c.curve_to(70, 30 + 20 * tongue, 60, 40 + 30 * tongue, 45, 35 + 30 * tongue); c.set_source_rgba(*RED, a); c.set_line_width(12); c.stroke()
    c.restore(); c.restore()

def phone_icon(c, x, y, s, a, glow=1.):
    c.save(); c.translate(x, y); c.scale(s, s)
    rrect(c, -50, -90, 100, 180, 16); c.set_source_rgba(0.55, 0.75, 1.0, 0.9 * a * glow); c.fill()
    rrect(c, -50, -90, 100, 180, 16); col(c, 1, a); c.set_line_width(4); c.stroke(); c.restore()

CAM = [(560, 980, 1.1, 1.0), (520, 960, 1.0, 1.04), (620, 980, 1.6, 1.8), (520, 960, 1.0, 1.03),
       (520, 980, 1.0, 1.04), (600, 1020, 1.25, 1.35), (540, 960, 1.0, 1.06), (660, 1050, 1.7, 1.85),
       (620, 1020, 1.3, 1.4), (600, 980, 1.1, 1.15), (560, 980, 1.0, 1.08), (540, 960, 1.0, 1.04),
       (540, 960, 1.0, 1.04), (540, 940, 1.0, 1.05), (540, 960, 1.0, 1.08)]

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

def coat_at(si, t, d, P):
    if si <= 1: return 0.0
    if si == 2: return min(1, 0.15 + t / max(0.5, P[1]) * 0.85)
    if si in (3, 4): return 1.0
    if si == 5: return lerp(1.0, 0.45, ap(t, 0.2, d))
    if si == 6: return 0.45
    if si == 7: return lerp(0.45, 0.0, ap(t, 0, P[1]))
    return 0.0

def draw(c, T):
    si = scene_at(T); s = TL[si]; t = T - s['start']; d = s['dur']; P = s['phr']
    outdoor = si <= 10 or si == 14
    if outdoor: night(c, T, dawn=ap(t, 0, 1.5) if si == 10 else 0)
    else: bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    if si == 6: cta(c, t, P); return
    if outdoor: snow(c)
    else: ground(c, 1)
    coat = coat_at(si, t, d, P)
    if si == 0:
        pool(c, KX, GY + 4, 160 + 20 * math.sin(T), 1)
        ice(c, KX, GY); knife(c, KX, GY, 0.8, 0.2)
        wolf(c, KX - 205, GY, 1.0, lower=1, lick=1, T=T, tongue=1, a=1 - 0.6 * ap(t, P[1], 0.4))
        pill(c, 540, 600, "SEIN EIGENES BLUT", ap(t, 0.6, 0.3), 26)
        k = ap(t, P[1], 0.4)
        if k > 0:
            person(c, 860, GY, 0.75 * back(k)); phone_icon(c, 900, GY - 120, 0.35, k)
            pill(c, 860, GY + 60, "DU", k, 24)
    elif si == 1:
        text(c, 540, 560, "ALASKA · −40 °C", 46, ap(t, 0.2, 0.4), 0.95, spacing=6)
        person(c, 380, GY, 0.85, sy=0.85)
        # bowl
        c.move_to(470, GY - 60); c.curve_to(480, GY, 600, GY, 610, GY - 60); c.close_path(); col(c, 0.75, 1); c.fill()
        pool(c, 540, GY - 60, 60 * ap(t, 0.5, 0.4), 1)
        dip = 0.5 + 0.5 * math.cos(max(0, t - P[1]) * 3)
        knife(c, 540, GY - 160 - 120 * dip, 0.55, ap(t, P[1] + 0.8, 1.5) * 0.3)
        pill(c, 380, GY + 60, "JÄGER", ap(t, 0.4, 0.3), 24, 0.7)
    elif si == 2:
        ice(c, KX, GY)
        knife(c, KX, GY, 1.0, coat)
        n = min(6, 1 + int(t / 0.6))
        text(c, KX + 180, 860, f"SCHICHT {n}", 30, ap(t, 0.2, 0.3), 0.85, spacing=2)
    elif si == 3:
        ice(c, KX, GY); knife(c, KX, GY, 0.8, coat)
        hx = 480 - 600 * ease(ap(t, 0.8, 2.5))
        person(c, hx, GY, 0.85, sy=0.85, a=1 - ap(t, 2.5, 0.8))
        for i, (lab, dl) in enumerate((("KEIN GEWEHR", 0.0), ("KEINE FALLE", 0.5))):
            k = ap(t, P[1] + dl, 0.3)
            pill(c, 380, 640 + i * 90, lab, k, 26, 0.7)
            check_circle(c, 560, 640 + i * 90, 26, ap(t, P[1] + dl + 0.2, 0.3), False, 0.8)
        pill(c, 540, 860, "NUR DIESES MESSER", ap(t, P[1] + 1.2, 0.3), 28)
    elif si == 4:
        ice(c, KX, GY); knife(c, KX, GY, 0.8, coat)
        wx = lerp(-200, KX - 330, ease(ap(t, 0.2, d - 0.8)))
        wolf(c, wx, GY, 0.95, walk=1 if t < d - 0.6 else 0, T=T)
        k = ap(t, P[1], 0.5)
        if k > 0:
            for j in range(3):
                c.new_path()
                for i in range(30):
                    u = i / 29; xx = lerp(KX - 20, wx + 190, u); yy = GY - 200 - j * 26 + 10 * math.sin(u * 12 - T * 5)
                    (c.move_to if i == 0 else c.line_to)(xx, yy)
                c.set_dash([10, 10]); c.set_source_rgba(*RED, 0.7 * k); c.set_line_width(3); c.stroke(); c.set_dash([])
        pill(c, 300, 640, "RIECHT DAS BLUT", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 5:
        ice(c, KX, GY); knife(c, KX, GY, 0.8, coat)
        wolf(c, KX - 205, GY, 1.0, lower=1, lick=lerp(0.5, 1.4, ap(t, 0, d)), T=T * lerp(1, 1.8, ap(t, P[1], 1)), tongue=1)
        pill(c, 600, 640, "SCHMECKT", ap(t, 0.5, 0.3), 26)
        pill(c, 600, 720, "SCHNELLER", ap(t, P[1], 0.3), 26, 0.7)
    elif si == 7:
        ice(c, KX, GY); knife(c, KX, GY, 0.8, coat)
        wolf(c, KX - 205, GY, 1.0, lower=1, lick=1.4, T=T * 1.8, tongue=1)
        if t > P[0] + 1.0:
            starburst(c, KX + 5, GY - 190, 26, ap(t, 1.0, 0.25) * (1 - ap(t, 1.4, 0.3)))
        pill(c, 760, 820, "TAUB", ap(t, P[1], 0.3), 28)
        # snowflake
        k = ap(t, P[1] + 0.2, 0.3)
        if k > 0:
            for i in range(3):
                th = i * math.pi / 3; c.move_to(860 - 26 * math.cos(th), 820 - 26 * math.sin(th)); c.line_to(860 + 26 * math.cos(th), 820 + 26 * math.sin(th))
            stroke(c, 0.9, k, 4)
    elif si == 8:
        pool(c, KX, GY + 4, 40 + 90 * ap(t, 0.3, d), 1)
        ice(c, KX, GY); knife(c, KX, GY, 0.8, 0)
        for i in range(6):
            ph = (t * 1.2 + i / 6) % 1
            c.new_path(); c.arc(KX + math.sin(i * 2) * 10, GY - 200 + ph * 190, 7 * (1 - ph * 0.5), 0, 2 * math.pi); c.set_source_rgba(*RED, 1 - ph * 0.3); c.fill()
        wolf(c, KX - 205, GY, 1.0, lower=1, lick=1.6, T=T * lerp(1.8, 2.6, ap(t, P[1], 1)), tongue=1)
        pill(c, 760, 760, "WARM", ap(t, 1.0, 0.3), 28, 0.85)
        pill(c, 760, 840, "NOCH SCHNELLER", ap(t, P[1], 0.3), 26)
    elif si == 9:
        pool(c, KX, GY + 4, 130 + 120 * ap(t, 0, d), 1)
        ice(c, KX, GY); knife(c, KX, GY, 0.8, 0)
        wolf(c, KX - 205, GY, 1.0, lower=1, lick=1.2, T=T * 2.2, tongue=1, a=1 - 0.3 * ap(t, P[1], 2))
        hrs = 1 + int(4 * ap(t, 0.3, d - 0.6))
        if card(c, 300, 600, 220, 120, ap(t, 0.2, 0.3)):
            text(c, 0, -30, "STUNDEN", 20, 1, 0.6); text(c, 0, 18, str(hrs), 54, 1, rgb=RED); c.restore()
        pill(c, 680, 640, "ES TUT NIE WEH", ap(t, P[1], 0.3), 26)
    elif si == 10:
        pool(c, KX - 40, GY + 6, 330, 1)
        ice(c, KX, GY); knife(c, KX, GY, 0.8, 0, shine=ap(t, P[1] + 0.3, 0.4) * (0.7 + 0.3 * math.sin(T * 6)))
        wolf(c, KX - 260, GY, 1.0, lower=1, fold=1, T=T)
        pill(c, 540, 640, "AM MORGEN", ap(t, 0.2, 0.3), 26, 0.7)
        pill(c, KX, 760, "BLITZSAUBER", ap(t, P[1] + 0.3, 0.3), 26)
    elif si == 11:
        pill(c, 540, 560, "DUMMER WOLF?", ap(t, 0.1, 0.3), 30)
        k = ap(t, P[1], 0.4)
        if k > 0:
            c.rectangle(300, GY - 120, 520, 50); stroke(c, 0.8, k, 5)
            c.move_to(300, GY - 200); c.line_to(300, GY); c.move_to(820, GY - 140); c.line_to(820, GY); stroke(c, 0.8, k, 5)
            person(c, 560, GY - 120, 0.7, rot=-math.pi / 2, a=k)
            phone_icon(c, 520, GY - 290, 0.45, k, 0.8 + 0.2 * math.sin(T * 7))
            if card(c, 300, 760, 200, 100, k):
                text(c, 0, 0, "02:00", 46, 1, rgb=RED); c.restore()
            pill(c, 760, 760, "AUGEN BRENNEN", ap(t, P[1] + 1.2, 0.3), 24, 0.7)
    elif si == 12:
        mx = lerp(300, 620, ease(ap(t, 0.3, 2.2)))
        person(c, mx, GY, 0.8)
        person(c, 800, GY, 0.8, rgb=RED, a=0.85)
        pill(c, 800, GY + 60, "TUT DIR WEH", ap(t, 0.6, 0.3), 22, 0.6)
        k = ap(t, 1.5, 0.4)
        if k > 0:
            c.save(); c.translate(720, GY - 320); c.scale(1.6 * back(k), 1.6 * back(k)); c.new_path()
            c.move_to(0, 14); c.curve_to(-34, -8, -20, -38, 0, -20); c.curve_to(20, -38, 34, -8, 0, 14); c.set_source_rgba(*RED, cl(k * 2)); c.fill(); c.restore()
        pill(c, 540, 600, "FÜHLT SICH AN WIE BELOHNUNG", ap(t, P[1] + 1.0, 0.3), 24)
    elif si == 13:
        k = ap(t, 0, 0.4)
        if k > 0:
            c.save(); c.translate(540, 820); c.scale(back(k), back(k))
            rrect(c, -170, -300, 340, 600, 40); c.set_source_rgba(0.05, 0.05, 0.07, 1); c.fill_preserve(); col(c, 1, 1); c.set_line_width(6); c.stroke()
            for i in range(9):
                r_, k_ = divmod(i, 3)
                rrect(c, -120 + k_ * 90, -230 + r_ * 100, 60, 60, 14)
                if i == 4: c.set_source_rgba(*RED, 1)
                else: col(c, 0.35 + 0.1 * (i % 3), 1)
                c.fill()
            c.restore()
            knife(c, 540, 820 - 140, 0.28, 0.6 * (1 - ap(t, P[1], 1.5)))
        pill(c, 540, 470, "KEIN GEWEHR NÖTIG", ap(t, 0.6, 0.3), 26)
        pill(c, 540, 1180, "NUR WAS DU WILLST", ap(t, P[1] + 0.2, 0.3), 26)
    elif si == 14:
        ice(c, KX, GY); knife(c, KX, GY, 0.6, 0.5)
        wolf(c, KX - 160, GY, 0.75, lower=1, lick=1, T=T, tongue=1, a=0.6)
        share_arrow(c, 540, 700, 1.0, ap(t, 0.2, 0.4))
        pill(c, 540, 830, "SCHICK ES WEITER", ap(t, 0.5, 0.3), 26)

def starburst(c, x, y, r, p):
    if p <= 0: return
    c.save(); c.translate(x, y); c.scale(back(p), back(p)); c.new_path()
    for i in range(16):
        rr = r if i % 2 == 0 else r * 0.45; th = i * math.pi / 8
        (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
    c.close_path(); col(c, 1, cl(p * 2)); c.fill(); c.restore()

def share_arrow(c, x, y, s, p):
    if p <= 0: return
    c.save(); c.translate(x, y); c.scale(back(p) * s, back(p) * s)
    c.move_to(-70, 60); c.curve_to(-70, -10, -20, -40, 30, -40); c.set_source_rgba(*ACC, cl(p * 2)); c.set_line_width(22); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    c.move_to(20, -90); c.line_to(85, -40); c.line_to(20, 10); c.close_path(); c.fill(); c.restore()
