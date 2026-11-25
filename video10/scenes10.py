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
    typed(c, W / 2, 470, "ER HAT SEINE REISEN ZWEIMAL BEZAHLT.", 46.8, t, 40, cps=24)
    typed(c, W / 2, 540, "SEINE ERSPARNISSE HABEN SEINE BEZAHLT.", 48.6, t, 40, cps=24, rgb=ACC)
