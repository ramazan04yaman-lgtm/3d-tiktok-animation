"""
Bereitet die Erd-Daten fuer die 3D-Simulation vor (einmalig ausfuehren).

Quellen (alle frei nutzbar / Public Domain):
  - ETOPO1 (NOAA) Hoehen + Meerestiefen, 10-Bogenminuten-Raster (via pyvista/vtk-data)
  - NASA Blue Marble (Farbbild der Erde), Nachtlichter (via three.js), Wolken (via three-globe/globe.gl)
  - Natural Earth (Seen, Fluesse, Staedte)

Aufruf:  python3 tools/prepare_assets.py <ordner-mit-rohdaten>
Erzeugt Dateien in public/assets/.
"""
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
os.makedirs(OUT, exist_ok=True)
Image.MAX_IMAGE_PIXELS = None

# ---------------------------------------------------------------- 1. Hoehenraster
raw = np.load(os.path.join(SRC, 'etopo.npz'))['alt'].reshape(1081, 2161).astype(np.float64)
# Knoten (Lon 0..360, Lat 90..-90) -> Zellmittelpunkte, Lon -180..180
cells = 0.25 * (raw[:-1, :-1] + raw[1:, :-1] + raw[:-1, 1:] + raw[1:, 1:])  # 1080 x 2160
elev = np.roll(cells, 1080, axis=1)
H, W = elev.shape
lat = 90 - (np.arange(H) + 0.5) * 180 / H
lon = -180 + (np.arange(W) + 0.5) * 360 / W

def rc(la, lo):
    return int((90 - la) / 180 * H), int((lo + 180) / 360 * W)

# Ozean = alle Zellen unter 0 m, die mit dem Weltmeer verbunden sind (Ost-West-Rand umlaufend)
below = elev < 0
tiled = np.concatenate([below, below, below], axis=1)
lab, _ = ndimage.label(tiled)
r, c = rc(0, -150)  # Pazifik
ocean = (lab == lab[r, c + W])[:, W:2 * W] | (lab == lab[r, c + W])[:, :W] | (lab == lab[r, c + W])[:, 2 * W:]
# Kaspisches Meer (Wasserspiegel ca. -28 m) als eigenes Binnenmeer
lab2, _ = ndimage.label(elev < -28)
r, c = rc(42, 50.5)
caspian = lab2 == lab2[r, c]
print('Ozeanzellen:', ocean.sum(), ' Kaspi-Zellen:', caspian.sum())

# Hoehen als Int16 (Meter), Zeilen Nord->Sued, Spalten West->Ost
elev.round().astype('<i2').tofile(os.path.join(OUT, 'elevation_2160x1080.i16'))

# ---------------------------------------------------------------- 2. Hypsometrie (Volumen vs. Meeresspiegel)
R_KM = 6371.0
cell_area = (R_KM ** 2) * np.radians(360 / W) * np.radians(180 / H) * np.cos(np.radians(lat))[:, None]  # km^2
levels = np.arange(-11000, 1, 10)
oe = elev[ocean]; oa = np.broadcast_to(cell_area, elev.shape)[ocean]
order = np.argsort(oe); oe = oe[order]; oa = oa[order]
cumA = np.cumsum(oa); cumAE = np.cumsum(oa * oe)
vols = []; areas = []
for h in levels:
    areas.append(cumA[np.searchsorted(oe, h) - 1] if np.searchsorted(oe, h) > 0 else 0.0)
    k = np.searchsorted(oe, h)
    vols.append(0.0 if k == 0 else (h * cumA[k - 1] - cumAE[k - 1]) / 1000.0)  # km^3
vols = np.array(vols)
print('Ozeanvolumen aus ETOPO: %.4g km^3' % vols[-1])
areas = np.array(areas)
json.dump({'levels_m': levels.tolist(), 'volume_fraction': (vols / vols[-1]).round(7).tolist(),
           'area_fraction': (areas / areas[-1]).round(7).tolist(),
           'ocean_volume_km3_etopo': float(vols[-1])},
          open(os.path.join(OUT, 'hypsometry.json'), 'w'))

# ---------------------------------------------------------------- 3. Wassermasken (4096 x 2048)
TW, TH = 4096, 2048
def lonlat_to_px(lo, la):
    return ((lo + 180) / 360 * TW, (90 - la) / 180 * TH)

def draw_geoms(draw, geom, kind, width=1):
    polys = []
    t = geom['type']
    if t == 'Polygon': polys = [geom['coordinates']]
    elif t == 'MultiPolygon': polys = geom['coordinates']
    elif t == 'LineString': polys = [[geom['coordinates']]]
    elif t == 'MultiLineString': polys = [[l] for l in geom['coordinates']]
    for poly in polys:
        for i, ring in enumerate(poly):
            pts = [lonlat_to_px(p[0], p[1]) for p in ring]
            if kind == 'poly':
                draw.polygon(pts, fill=0 if i > 0 else 255)
            else:
                draw.line(pts, fill=255, width=width)

lakes_img = Image.new('L', (TW, TH), 0)
d = ImageDraw.Draw(lakes_img)
for f in json.load(open(os.path.join(SRC, 'lakes.json')))['features']:
    draw_geoms(d, f['geometry'], 'poly')
cas_big = np.array(Image.fromarray((caspian * 255).astype(np.uint8)).resize((TW, TH), Image.BILINEAR)) > 127
lake = (np.array(lakes_img) > 127) | cas_big
# "Tiefe" eines Sees ~ Abstand zum Ufer (normiert je See) -> Seen schrumpfen vom Ufer her
dist = ndimage.distance_transform_edt(lake)
llab, n = ndimage.label(lake)
maxd = ndimage.maximum(dist, llab, index=np.arange(1, n + 1))
maxd_img = np.zeros_like(dist); maxd_img[lake] = np.array(maxd)[llab[lake] - 1]
lake_depth = np.where(lake, np.clip(dist / np.maximum(maxd_img, 1), 0, 1), 0)
lake_depth = np.where(lake, 0.08 + 0.92 * lake_depth, 0)

riv_img = Image.new('L', (TW, TH), 0)
d = ImageDraw.Draw(riv_img)
for f in json.load(open(os.path.join(SRC, 'rivers.json')))['features']:
    sr = f['properties'].get('scalerank', 5) or 5
    draw_geoms(d, f['geometry'], 'line', width=3 if sr <= 3 else 2)
riv_img = riv_img.filter(ImageFilter.GaussianBlur(1.2))

# Maske leicht ausweiten + weichzeichnen: die Küstenlinie selbst kommt dann aus den
# (glatten) Höhendaten und nicht aus dem groben Maskenraster.
ocean_soft = ndimage.binary_dilation(ocean, iterations=2) & ~(below & ~ocean)  # nicht in Senken im Binnenland
ocean_soft = ndimage.gaussian_filter(ocean_soft.astype(np.float32), 0.8) * 255
ocean_big = np.array(Image.fromarray(ocean_soft.astype(np.uint8)).resize((TW, TH), Image.BILINEAR))
mask = np.dstack([ocean_big, (lake_depth * 255).astype(np.uint8), np.array(riv_img), np.full((TH, TW), 255, np.uint8)])
Image.fromarray(mask, 'RGBA').save(os.path.join(OUT, 'water_mask.png'), optimize=True)

# ---------------------------------------------------------------- 4. Landfarbe ohne Ozean (Blue Marble, Wasser mit Landfarbe aufgefuellt)
bm = np.array(Image.open(os.path.join(SRC, 'bm.jpg')).convert('RGB').resize((TW, TH), Image.LANCZOS))
water_big = (ndimage.binary_dilation(ocean_big > 60, iterations=3)) | ndimage.binary_dilation(lake, iterations=3)
# zusaetzlich: alles was im Bild "blau" ist und nahe am Meer liegt
b = bm.astype(int); blue = (b[..., 2] > b[..., 0] + 15) & (b[..., 2] > b[..., 1])
water_big |= blue & (ndimage.binary_dilation(ocean_big > 60, iterations=12) | ndimage.binary_dilation(lake, iterations=20))
_, (iy, ix) = ndimage.distance_transform_edt(water_big, return_indices=True)
filled = bm[iy, ix]
# Harte Kanten der Fuellung weich machen: im Wasserbereich stark weichgezeichnete Farbe
soft = np.array(Image.fromarray(filled).filter(ImageFilter.GaussianBlur(18))).astype(np.float32)
dw = ndimage.distance_transform_edt(water_big)
t = np.clip(dw / 10.0, 0, 1)[..., None]
filled = (filled.astype(np.float32) * (1 - t) + soft * t).clip(0, 255).astype(np.uint8)
Image.fromarray(filled).save(os.path.join(OUT, 'land_color.jpg'), quality=88)

# ---------------------------------------------------------------- 5. Wolken + Nachtlichter
cl = Image.open(os.path.join(SRC, 'c_clouds.png')).convert('RGBA').getchannel('A').resize((TW, TH), Image.LANCZOS)
cl.save(os.path.join(OUT, 'clouds.jpg'), quality=85)
Image.open(os.path.join(SRC, 'lights.png')).convert('L').resize((TW, TH), Image.LANCZOS).save(os.path.join(OUT, 'night_lights.jpg'), quality=85)

# ---------------------------------------------------------------- 6. Staedte (fuer die Einwohner)
cities = []
for f in json.load(open(os.path.join(SRC, 'places.json')))['features']:
    p = f['properties']
    cities.append({'name': p['name'], 'country': p['adm0name'], 'lat': round(p['latitude'], 4),
                   'lon': round(p['longitude'], 4), 'pop': int(p['pop_max'])})
cities.sort(key=lambda x: -x['pop'])
json.dump(cities[:400], open(os.path.join(OUT, 'cities.json'), 'w'), ensure_ascii=False)
print('fertig')
