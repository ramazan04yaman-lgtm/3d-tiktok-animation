def day_at(t):
    if t < 2.0: return 0
    if t < 20.0: return 1 + int((t - 2.0) / 2.5)
    return int(lerp(8, 365, ease(ap(t, 20.0, 6.0))))

def nbooks(t):
    d = day_at(t)
    return int(round(14 * (d / 365) ** 0.5)) if d > 0 else 0

BOOKC = [(0.45, 0.7, 1.0), ACC, (0.5, 0.9, 0.6), (1, 0.55, 0.5), (0.8, 0.6, 1.0)]

def book_stack(c, x, n, a=1.):
    for i in range(n):
        w = 80 - (i % 3) * 8; off = ((i * 7) % 5 - 2) * 3
        c.rectangle(x - w / 2 + off, GY - 20 - i * 20, w, 17); c.set_source_rgba(*BOOKC[i % 5], 0.85 * a); c.fill()

def stairs(c, k, a=1.):
    for j in range(5):
        x = RX - 40 + j * 52; h = 60 * (j + 1) * eout(cl(k * 1.5 - j * 0.12))
        if h <= 0: continue
        nb = int(h // 20)
        for i in range(nb):
            c.rectangle(x - 24, GY - 20 - i * 20, 48, 17); c.set_source_rgba(*BOOKC[(i + j) % 5], 0.85 * a); c.fill()

def couch(c, x):
    c.move_to(x - 90, GY); c.line_to(x - 90, GY - 90); c.line_to(x - 70, GY - 90); c.line_to(x - 70, GY - 45); c.line_to(x + 70, GY - 45); c.line_to(x + 70, GY - 90); c.line_to(x + 90, GY - 90); c.line_to(x + 90, GY)
    c.move_to(x - 70, GY - 90); c.line_to(x - 64, GY - 130); c.line_to(x + 64, GY - 130); c.line_to(x + 70, GY - 90)
    c.set_source_rgba(*RED, 0.9); c.set_line_width(4); c.stroke()

def tvset(c, x, T, on=1.):
    flick = 0.6 + 0.4 * abs(math.sin(T * 7) * math.sin(T * 3.1))
    c.move_to(x - 70, GY - 160); c.line_to(x + 70, GY - 160); c.line_to(x + 230, GY); c.line_to(x - 230, GY); c.close_path()
    c.set_source_rgba(0.45, 0.65, 1, 0.08 * on * flick); c.fill()
    rrect(c, x - 70, GY - 260, 140, 90, 8); c.set_source_rgba(0.45, 0.65, 1, (0.35 + 0.5 * flick) * on); c.fill()
    c.move_to(x, GY - 170); c.line_to(x, GY - 100); c.move_to(x - 40, GY - 100); c.line_to(x + 40, GY - 100); stroke(c, 0.6, 1, 4)

def desk(c, x):
    c.move_to(x - 80, GY - 100); c.line_to(x + 80, GY - 100); c.move_to(x - 70, GY - 100); c.line_to(x - 70, GY); c.move_to(x + 70, GY - 100); c.line_to(x + 70, GY); stroke(c, 0.8, 1, 5)
    c.move_to(x + 40, GY - 100); c.line_to(x + 40, GY - 180); c.line_to(x + 10, GY - 200); stroke(c, 0.8, 1, 4)
    c.move_to(x + 10, GY - 200); c.line_to(x - 60, GY - 100); c.line_to(x + 30, GY - 100); c.close_path()
    c.set_source_rgba(*ACC, 0.18); c.fill()
    c.new_path(); c.arc(x + 10, GY - 200, 10, 0, 2 * math.pi); c.set_source_rgba(*ACC, 1); c.fill()

def wallclock(c, x, y, ang, a=1.):
    c.new_path(); c.arc(x, y, 26, 0, 2 * math.pi); stroke(c, 0.85, a, 3)
    c.move_to(x, y); c.line_to(x + 18 * math.sin(ang), y - 18 * math.cos(ang)); stroke(c, 0.85, a, 3)
    c.move_to(x, y); c.line_to(x + 11 * math.sin(ang / 12), y - 11 * math.cos(ang / 12)); stroke(c, 0.85, a, 3)

def draw(c, T):
    t = T
    bokeh(c, T)
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    c.move_to(-200, GY + 4); c.line_to(1300, GY + 4); stroke(c, 0.35, 1, 3)
    house(c, LX); house(c, RX)
    gold = ap(t, 33.0, 1.0)
    if gold > 0:
        c.move_to(RX - HW - 20, GY - 380); c.line_to(RX, GY - 480); c.line_to(RX + HW + 20, GY - 380)
        c.move_to(RX - HW, GY - 380); c.line_to(RX - HW, GY); c.move_to(RX + HW, GY - 380); c.line_to(RX + HW, GY)
        c.set_source_rgba(*ACC, gold); c.set_line_width(7); c.stroke()
    pill(c, LX, GY + 70, "KONSUMIERT", ap(t, 0.5, 0.3), 24, 0.6)
    pill(c, RX, GY + 70, "INVESTIERT", ap(t, 0.8, 0.3), 24)
    d = day_at(t)
    ang = (t * 2 * math.pi / 2.5) if t < 26 else 0
    wallclock(c, LX + 150, GY - 320, ang); wallclock(c, RX - 150, GY - 320, ang)
    # LEFT: couch + TV
    couch(c, LX - 70)
    tvset(c, LX + 140, T, on=1.0)
    ga = lerp(1, 0.55, ap(t, 8, 20))
    lin = ap(t, 0.2, 1.2)
    lx = lerp(LX - 170, LX - 70, ease(lin))
    person(c, lx, GY - (45 if lin >= 1 else 0), 0.68, g=ga, sy=0.78 if lin >= 1 else 1)
    k = ap(t, 36.0, 0.35) * (1 - ap(t, 43.5, 0.4))
    if k > 0: bubble(c, LX - 10, GY - 330, "DER HATTE HALT GLÜCK.", k)
    # RIGHT: desk + books
    desk(c, RX - 100)
    sk = ap(t, 27.0, 1.5)
    if sk < 1: book_stack(c, RX + 150, nbooks(t), 1 - sk)
    if sk > 0: stairs(c, sk)
    climb = ap(t, 29.0, 3.0)
    if climb <= 0:
        rin = ap(t, 0.4, 1.2)
        rxp = lerp(RX + 170, RX - 150, ease(rin))
        person(c, rxp, GY, 0.68, sy=0.85 if rin >= 1 else 1)
        if rin >= 1:  # book in hands
            c.save(); c.translate(rxp + 45, GY - 125); c.rotate(-0.2 + 0.05 * math.sin(T * 2)); c.rectangle(-22, -14, 44, 28); c.set_source_rgba(*ACC, 1); c.fill(); c.restore()
    else:
        st = 5 * climb; j = min(4, int(st)); f = st - int(st)
        px = RX - 40 + min(st, 4.99) * 52; py = GY - 60 * (j + 1 if st >= 1 else 0) - 20 * math.sin(math.pi * f)
        if st < 1: py = GY - 60 * f
        person(c, px, py, 0.6)
        if climb >= 1:
            star(c, px, py - 190, 22, ap(t, 32.2, 0.4))
    pill(c, RX, GY - 430, "BEFÖRDERT", ap(t, 32.5, 0.3), 26)
    popup(c, RX + 60, GY - 500, "+1.500 € / MONAT", t, 33.0, ACC) if t < 35 else (text(c, RX + 40, GY - 520, "+1.500 € / MONAT", 30, 1 - ap(t, 44, 0.5), rgb=ACC))
    # book +1 popups
    if 2 < t < 20 and ((t - 2.0) % 2.5) > 1.9:
        popup(c, RX + 150, GY - 60 - nbooks(t) * 20, "+1 BUCH", t, 2.0 + int((t - 2.0) / 2.5) * 2.5 + 1.9, ACC)

def star(c, x, y, r, p, rgb=ACC):
    if p <= 0: return
    c.save(); c.translate(x, y); s = back(p); c.scale(s, s); c.new_path()
    for i in range(8):
        rr = r if i % 2 == 0 else r * 0.3; th = -math.pi / 2 + i * math.pi / 4
        (c.move_to if i == 0 else c.line_to)(rr * math.cos(th), rr * math.sin(th))
    c.close_path(); c.set_source_rgba(*rgb, cl(p * 2)); c.fill(); c.restore()

def title(c, T):
    t = T
    a = cl(T / 0.6) * (1 - ap(t, 44.0, 0.4))
    c.select_font_face(FONT, 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(64)
    w = c.text_extents("ZEIT.").x_advance
    c.move_to(W / 2 - w / 2, 330 + 23); c.set_source_rgba(1, 1, 1, 0.95 * a); c.show_text("ZEIT"); c.set_source_rgba(*ACC, a); c.show_text(".")
    d = day_at(t)
    if d > 0 and t < 27.5:
        k = 1 - ap(t, 27.0, 0.4)
        text(c, W / 2, 430, f"TAG {d}", 40, k, 1, spacing=6, rgb=ACC if d >= 365 else None)
        if t < 20: text(c, W / 2, 485, "20:00 – 23:00 UHR", 24, k * 0.8, 0.7, spacing=3)
    # mid CTA
    k = ap(t, 21.0, 0.4) * (1 - ap(t, 25.8, 0.4))
    if k > 0:
        c.save(); c.translate(W / 2, 560); c.scale(back(min(1, k * 1.2)), back(min(1, k * 1.2)))
        c.new_path(); c.save(); c.translate(-170, 0); c.scale(1.3, 1.3); c.move_to(0, 14); c.curve_to(-34, -8, -20, -38, 0, -20); c.curve_to(20, -38, 34, -8, 0, 14); c.restore()
        c.set_source_rgba(*ACC, k); c.fill()
        pressed = t > 23.4
        rrect(c, -80, -38, 260, 76, 38)
        if pressed: c.set_source_rgba(*ACC, k); c.fill(); text(c, 50, 0, "✓ GEFOLGT", 30, k, 0.05)
        else: c.set_source_rgba(*ACC, k); c.set_line_width(5); c.stroke(); text(c, 50, 0, "FOLGEN", 32, k, rgb=ACC)
        kk = ap(t, 22.4, 0.8)
        if kk > 0 and not pressed:
            px, py = lerp(260, 80, eout(kk)), lerp(120, 10, eout(kk))
            c.new_path(); c.move_to(px, py); c.line_to(px, py + 48); c.line_to(px + 12, py + 36); c.line_to(px + 29, py + 41); c.close_path(); c.set_source_rgba(1, 1, 1, k); c.fill()
        c.restore()
    typed(c, W / 2, 440, "BEIDE HATTEN JEDEN ABEND 3 STUNDEN.", 44.5, t, 42, cps=24)
    typed(c, W / 2, 515, "NUR EINER HAT SIE INVESTIERT.", 46.6, t, 42, cps=24, rgb=ACC)
