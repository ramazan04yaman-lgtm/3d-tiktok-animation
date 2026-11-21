import cairo, math, numpy as np
from PIL import Image, ImageFilter
S = 1080; ACC = (1.0, 0.76, 0.32)
def fig(c, x, y, s, rgb=(1, 1, 1)):
    c.save(); c.translate(x, y); c.scale(s, s); bw, bh = 96, 118
    c.move_to(-bw/2, 0); c.line_to(-bw/2, -bh+bw/2); c.arc(0, -bh+bw/2, bw/2, math.pi, 2*math.pi); c.line_to(bw/2, 0); c.close_path()
    c.set_source_rgb(*rgb); c.fill(); c.arc(0, -bh-46, 36, 0, 2*math.pi); c.fill(); c.restore()
def bokeh(c):
    r = np.random.default_rng(4)
    for _ in range(14):
        x, y, rr = r.uniform(0, S), r.uniform(0, S), r.uniform(25, 80)
        c.arc(x, y, rr, 0, 2*math.pi); c.set_source_rgba(1, .92, .8, r.uniform(.03, .06)); c.fill()
def post(surf, name):
    a = np.ndarray((S, S, 4), np.uint8, surf.get_data())[..., :3][..., ::-1].astype(np.float32)
    im = Image.fromarray(a.astype(np.uint8)).resize((S//4, S//4))
    g1 = np.asarray(im.filter(ImageFilter.GaussianBlur(6)).resize((S, S)), np.float32)
    g2 = np.asarray(im.resize((S//16, S//16)).filter(ImageFilter.GaussianBlur(4)).resize((S, S)), np.float32)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    vig = np.clip(1.2 - 0.9*(((xx-S/2)/(S*.62))**2 + ((yy-S/2)/(S*.62))**2), .3, 1)[..., None]
    out = np.clip((a*0.93 + g1*.32 + g2*.55) * vig, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(name)
def base():
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, S, S); c = cairo.Context(s)
    c.set_source_rgb(.035, .035, .04); c.paint(); bokeh(c); return s, c
# A: Figur mit Spotlight + goldene Krawatte
s, c = base()
c.move_to(470, 80); c.line_to(610, 80); c.line_to(800, 900); c.line_to(280, 900); c.close_path()
lg = cairo.LinearGradient(0, 80, 0, 900); lg.add_color_stop_rgba(0, 1, 1, 1, 0); lg.add_color_stop_rgba(1, 1, 1, 1, .13); c.set_source(lg); c.fill()
c.set_dash([18, 14]); c.set_line_width(5); c.set_source_rgba(.55, .55, .55, .9); c.move_to(120, 900); c.line_to(960, 900); c.stroke(); c.set_dash([])
fig(c, 540, 900, 3.0)
c.move_to(518, 900-3*114); c.line_to(562, 900-3*114); c.line_to(552, 900-3*100); c.line_to(575, 900-3*38); c.line_to(540, 900-3*20); c.line_to(505, 900-3*38); c.line_to(528, 900-3*100); c.close_path(); c.set_source_rgb(0.86, 0.55, 0.12); c.fill()
post(s, "profil_A_spotlight.png")
# B: Figur im goldenen Ring
s, c = base()
c.arc(540, 540, 400, 0, 2*math.pi); c.set_source_rgb(*ACC); c.set_line_width(12); c.stroke()
c.arc(540, 540, 400, 0, 2*math.pi); c.clip()
fig(c, 540, 900, 3.2)
c.reset_clip()
post(s, "profil_B_ring.png")
# C: weiße + goldene Figur (Kontrast-Szenario)
s, c = base()
c.set_dash([16, 12]); c.set_line_width(5); c.set_source_rgba(.55, .55, .55, .9); c.move_to(100, 860); c.line_to(980, 860); c.stroke(); c.set_dash([])
fig(c, 370, 860, 2.4, (1, 1, 1)); fig(c, 710, 860, 2.4, ACC)
c.select_font_face("Inter", 0, cairo.FONT_WEIGHT_BOLD); c.set_font_size(150)
e = c.text_extents("?"); c.move_to(540 - e.x_advance/2, 330); c.set_source_rgb(1, 1, 1); c.show_text("?")
post(s, "profil_C_zwei.png")
