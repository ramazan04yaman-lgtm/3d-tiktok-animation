RED = (1.0, 0.32, 0.3)
X0, Y0, SW, SH = 60, 1500, 100, 58

def stair_xy(s):
    i = math.floor(s); f = s - i
    x = X0 + s * SW + 50
    y = Y0 - i * SH - 30 * math.sin(math.pi * f) ** 2 * (1 if f > 0.05 else 0)
    return x, y

def person(c, x, y, s=0.62, g=1., rgb=None, a=1., rot=0., sy=1.):
    if a <= 0: return
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s * sy)
    bw, bh = 96, 118
    c.move_to(-bw / 2, 0); c.line_to(-bw / 2, -bh + bw / 2); c.arc(0, -bh + bw / 2, bw / 2, math.pi, 2 * math.pi); c.line_to(bw / 2, 0); c.close_path()
    (c.set_source_rgba(*rgb, a) if rgb else col(c, g, a)); c.fill()
    c.arc(0, -bh - 46, 36, 0, 2 * math.pi); c.fill(); c.restore()

def crown(c, x, y, a=1.):
    c.move_to(x - 22, y); c.line_to(x - 22, y - 22); c.line_to(x - 10, y - 10); c.line_to(x, y - 28); c.line_to(x + 10, y - 10); c.line_to(x + 22, y - 22); c.line_to(x + 22, y); c.close_path()
    c.set_source_rgba(*ACC, a); c.fill()

def label(c, x, y, s, a=1., rgb=None, g=0.9):
    if a > 0: text(c, x, y, s, 22, a, g, spacing=2, rgb=rgb)

def cone(c, x, ytop, ybot, w0, w1, a, rgb=(1, 0.97, 0.9)):
    if a <= 0: return
    c.move_to(x - w0, ytop); c.line_to(x + w0, ytop); c.line_to(x + w1, ybot); c.line_to(x - w1, ybot); c.close_path()
    lg = cairo.LinearGradient(0, ytop, 0, ybot); lg.add_color_stop_rgba(0, *rgb, 0.0); lg.add_color_stop_rgba(1, *rgb, 0.16 * a)
    c.set_source(lg); c.fill()

def typed(c, x, y, s, t0, t, size=40, cps=18, rgb=None):
    n = int(max(0, (t - t0)) * cps)
    if n <= 0: return
    sh = s[:n] + ("▌" if n < len(s) else "")
    text(c, x, y, sh, size, 1, 1, spacing=size * 0.1, rgb=rgb)

def scene_at(T): return 0

# --- character tracks (steps as function of t)
def s_dis(t):
    s = 0.9 + 1.15 * t
    hit = ap(t, 10.0, 0.4) * (1 - ap(t, 10.6, 1.2))   # pushed back by Rückschlag
    return s - 1.2 * hit
def s_mot(t):
    if t < 2.6: return 2.4 + 4.2 * t - 0.4 * t * t
    if t < 3.6: return s_mot(2.59)
    return s_mot(2.59) - 9 * ap(t, 3.6, 1.4) ** 1.5
def s_ego(t):
    if t < 5.4: return 3.2 + 2.4 * t
    return 3.2 + 2.4 * 5.4 - 12 * ap(t, 5.6, 1.6) ** 1.5
def s_tal(t):
    return 1.8 + 1.9 * min(t, 6.5) + 0.4 * ap(t, 6.5, 1.0)

OBST = [(20, "MORGEN"), (24, "AUSREDEN"), (28, "PERFEKTER MOMENT")]

def camera(T):
    sd = s_dis(T); x, y = stair_xy(sd)
    k = ease(ap(T, 0, 6))
    cx = lerp(560, x + 170, k); cy = lerp(1080, y - 260, k)
    z = lerp(0.78, 1.0, ease(ap(T, 0, 5)))
    return cx, cy - 70, z * 1.22

def draw(c, T):
    t = T
    bokeh(c, T)
    gold = ap(t, 13.0, 3.0)
    if gold > 0:
        rg = cairo.RadialGradient(W / 2, H * 0.55, 100, W / 2, H * 0.55, 1300)
        rg.add_color_stop_rgba(0, *ACC, 0.10 * gold); rg.add_color_stop_rgba(1, *ACC, 0.0); c.set_source(rg); c.paint()
    cx, cy, z = camera(T)
    for cc in (c, OV[0]):
        cc.translate(W / 2, H / 2); cc.scale(z, z); cc.translate(-cx, -cy)
    # staircase
    c.new_path(); c.move_to(X0 - 400, Y0 + 2000); c.line_to(X0 - 400, Y0)
    for i in range(0, 45):
        c.line_to(X0 + i * SW, Y0 - i * SH); c.line_to(X0 + (i + 1) * SW, Y0 - i * SH)
    c.line_to(X0 + 45 * SW, Y0 + 2000); c.close_path(); col(c, 0.075, 1); c.fill()
    c.new_path(); c.move_to(X0 - 400, Y0)
    for i in range(0, 45):
        c.line_to(X0 + i * SW, Y0 - i * SH); c.line_to(X0 + (i + 1) * SW, Y0 - i * SH)
    stroke(c, 0.42, 1, 3)
    # obstacles
    for st, lab in OBST:
        x, y = stair_xy(st)
        passed = s_dis(t) > st + 0.6
        a = 0.55 * ap(t, 8 + st * 0.2, 0.6) * (1 - 0.6 * ap(t, (st - 0.9) / 1.15 + 1.5, 0.8))
        person(c, x + 20, y, 0.58, 0.45, a=a, sy=0.78 if lab == "MORGEN" else 1)
        label(c, x + 20, y - 170, lab, a, g=0.7)
    # Rückschlag ball
    rb = ap(t, 8.6, 1.4)
    if 0 < rb < 1 or (t > 10 and t < 11.5):
        sb = lerp(s_dis(10.0) + 7, s_dis(10.0) + 0.3, rb) if t < 10 else s_dis(10.0) + 0.3 + 4 * ap(t, 10, 1.2)
        bx, by = stair_xy(sb); by -= 36 + 30 * abs(math.sin(t * 9))
        a = 1 - ap(t, 10.6, 0.8)
        c.new_path(); c.arc(bx, by, 30, 0, 2 * math.pi); c.set_source_rgba(*RED, a); c.set_line_width(5); c.stroke()
        c.move_to(bx - 12, by - 12); c.line_to(bx + 12, by + 12); c.move_to(bx + 12, by - 12); c.line_to(bx - 12, by + 12); c.stroke()
        label(c, bx, by - 55, "RÜCKSCHLAG", a, rgb=RED)
    # characters
    # Talent
    s = s_tal(t); x, y = stair_xy(s); sit = ap(t, 6.5, 0.8)
    ta = 1 - 0.55 * ap(t, 13, 1.0)
    person(c, x, y, 0.62, 0.85, a=ta, sy=lerp(1, 0.75, sit))
    label(c, x, y - lerp(180, 140, sit), "TALENT", ta)
    if t > 7: label(c, x, y - lerp(180, 140, sit) - 34, "BEQUEM", ta * ap(t, 7.2, 0.4) * 0.8, g=0.6)
    # Ego
    s = s_ego(t); x, y = stair_xy(s); fall = ap(t, 5.6, 1.6)
    ea = 1 - ap(t, 6.6, 0.8)
    person(c, x, y, 0.62, a=ea, rot=fall * 7)
    crown(c, x + (fall * 60), y - 140 - (0 if fall == 0 else -fall * 80), ea)
    label(c, x, y - 190, "EGO", ea * (1 - fall))
    # Motivation
    s = s_mot(t); x, y = stair_xy(s); fall = ap(t, 3.6, 1.4)
    ma = 1 - ap(t, 4.4, 0.8)
    cone(c, x, y - 900, y + 20, 30, 130, ma * (1 - fall), RED)
    person(c, x, y, 0.62, rgb=RED, a=ma, rot=fall * 6, sy=1 - 0.2 * ap(t, 2.6, 0.5) * (1 - fall))
    if 2.6 < t < 3.6:
        for k in range(3):
            c.new_path(); c.arc(x + 30 + k * 12, y - 120 + ((t * 120 + k * 20) % 40), 4, 0, 2 * math.pi); c.set_source_rgba(0.7, 0.85, 1, 0.8); c.fill()
    label(c, x, y - 180, "MOTIVATION", ma * (1 - fall), rgb=RED)
    # Disziplin
    s = s_dis(t); x, y = stair_xy(s)
    rgb = (lerp(1, ACC[0], gold), lerp(1, ACC[1], gold), lerp(1, ACC[2], gold))
    cone(c, x, y - 900, y + 20, 30, 140, 1, (1, lerp(0.97, 0.85, gold), lerp(0.9, 0.55, gold)))
    stag = ap(t, 10.0, 0.25) * (1 - ap(t, 10.4, 0.6))
    person(c, x, y, 0.62, rgb=rgb, rot=-0.35 * stag)
    label(c, x, y - 180, "DISZIPLIN", 1, rgb=ACC if gold > 0.5 else None)

def title(c, T):
    t = T
    a = 1 - ap(t, 15.6, 0.4)
    if a > 0:
        c.save(); c.push_group(); typed(c, W / 2, 330, "WER KOMMT OBEN AN?", 0.2, t, 52); c.pop_group_to_source(); c.paint_with_alpha(a); c.restore()
    typed(c, W / 2, 330, "DISZIPLIN RENNT NICHT.", 16.2, t, 52)
    typed(c, W / 2, 410, "SIE HÖRT NUR NICHT AUF.", 18.0, t, 52, rgb=ACC)
