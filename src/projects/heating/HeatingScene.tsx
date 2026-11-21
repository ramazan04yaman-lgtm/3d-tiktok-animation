import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { Effects } from './Effects';
import { House } from './House';
import { BURNER, FLOOR, HEAD, LENS, LENS_R, PUMP, RAD } from './script';
import * as track from './script';

const add = (p: readonly number[], dx: number, dy: number, dz = 0): [number, number, number] => [p[0] + dx, p[1] + dy, p[2] + dz];

export function HeatingScene() {
  const L = track.labels;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-5, 5, 11, -2]} fog={[30, 60]} />
      <House />
      <Effects />

      <Label position={add(HEAD, 0.1, 0.06)} text="Thermostatkopf" sub="Stufe 5 = Vollgas?" visible={L.head} offset={[-120, -300]} accent="#ffb04a" />
      <Label position={BURNER} text="Gasbrenner" sub="verbrennt Erdgas" visible={L.burner} offset={[120, -280]} accent="#5a9cff" />
      <Label position={add(BURNER, 0.25, -0.3)} text="Wärmetauscher" sub="Wasser bis 70 °C" visible={L.exchanger} offset={[100, -300]} accent="#ff7a3a" />
      <Label position={PUMP} text="Umwälzpumpe" sub="treibt den Kreislauf an" visible={L.pump} offset={[120, -300]} accent="#7fd0ff" />
      <Label position={[1.68, 3.2, -2.4]} text="Vorlauf" sub="heißes Wasser nach oben" visible={L.supply} offset={[-80, -260]} accent="#ff6a3a" />
      <Label position={[-1.05, 3.9, -2.5]} text="Rücklauf" sub="abgekühlt zurück" visible={L.ret} offset={[60, -200]} accent="#3aa0ff" />
      <Label position={[1.25, RAD.y1 - 0.1, RAD.z]} text="Heiß hinein" sub="oben ≈ 70 °C" visible={L.hot} offset={[-80, -300]} accent="#ff6a3a" />
      <Label position={[-0.7, RAD.y0 + 0.1, RAD.z]} text="Kühler zurück" sub="unten ≈ 50 °C" visible={L.cool} offset={[40, 200]} accent="#3aa0ff" />
      <Label position={[0.3, FLOOR + 2.2, 2.0]} text="Kalte Luft" sub="sinkt ab, strömt zurück" visible={L.cold} offset={[-60, -260]} accent="#3aa0ff" />
      <Label position={add(LENS.cond, 0, 0.55 * LENS_R.cond)} text="Wasserdampf" sub="aus dem Abgas" visible={L.vapour} offset={[60, -260]} accent="#bfe6ff" />
      <Label position={add(LENS.cond, 0.2 * LENS_R.cond, -0.55 * LENS_R.cond)} text="Kondensat" sub="gibt nochmal Wärme ab" visible={L.cond} offset={[60, 220]} accent="#ff9a4a" />
      <Label position={add(LENS.thermo, 0, 0.45 * LENS_R.thermo)} text="Wachskapsel" sub="dehnt sich bei Wärme aus" visible={L.wax} offset={[-60, -280]} accent="#e8a23a" />
      <Label position={add(LENS.thermo, 0, -0.4 * LENS_R.thermo)} text="Ventil" sub="wird zugedrückt" visible={L.valve} offset={[80, 240]} accent="#ff6a3a" />
      <Label position={add(LENS.s3, 0, LENS_R.cmp)} text="Stufe 3" sub="zu bei ≈ 20 °C" visible={L.s3} offset={[-40, -220]} accent="#7fd0ff" />
      <Label position={add(LENS.s5, 0, LENS_R.cmp)} text="Stufe 5" sub="zu bei ≈ 28 °C" visible={L.s5} offset={[40, -220]} accent="#ff6a3a" />
    </>
  );
}
