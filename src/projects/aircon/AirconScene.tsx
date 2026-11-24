import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { Effects } from './Effects';
import { Units } from './Units';
import { COMP, FAN_IN, FAN_OUT, IN, LENS, LENS_R, OUT, PRESS, VALVE } from './script';
import * as track from './script';

export function AirconScene() {
  const L = track.labels;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-5, 5, 7, -2]} fog={[30, 60]} />
      <directionalLight position={[6, 7, 3]} intensity={1.2} color="#ffd9a0" />
      <Units />
      <Effects />

      <Label position={[FAN_OUT[0] + 0.3, FAN_OUT[1] + 0.6, 1.4]} text="Wärme" sub="wird nach draußen getragen" visible={L.heat} offset={[-60, -260]} accent="#ff6a3a" />
      <Label position={[0.3, 2.6, 0.05]} text="Kältemittel" sub="kreist zwischen innen & außen" visible={L.refrig} offset={[-200, -240]} accent="#7fd0ff" />
      <Label position={FAN_IN} text="Lüfter" sub="saugt warme Raumluft an" visible={L.fan} offset={[-120, -300]} accent="#ff8a5a" />
      <Label position={[-0.52, 4.22, IN.z1 - 0.1]} text="Lamellen" sub="eiskalt ≈ 5 °C" visible={L.fins} offset={[-160, 220]} accent="#7fd0ff" />
      <Label position={[LENS.evap[0], LENS.evap[1] + 0.3 * LENS_R.evap, LENS.evap[2]]} text="Kältemittel verdampft" sub="schluckt dabei Wärme" visible={L.evap} offset={[-40, -300]} accent="#7fd0ff" />
      <Label position={[-0.45, 3.9, 0.4]} text="Kondenswasser" sub="tropft in die Wanne" visible={L.water} offset={[-160, 240]} accent="#9fd4ff" />
      <Label position={[COMP[0], COMP[1] + 0.2, COMP[2]]} text="Kompressor" sub="presst das Gas zusammen" visible={L.comp} offset={[80, -300]} accent="#ff6a3a" />
      <Label position={[FAN_OUT[0], FAN_OUT[1] + 0.3, OUT.z1]} text="Ventilator" sub="bläst Wärme nach draußen" visible={L.fanOut} offset={[-80, -300]} accent="#ffa040" />
      <Label position={[2.0, 1.1, OUT.z0 + 0.08]} text="Verflüssiger" sub="Gas wird wieder flüssig" visible={L.cond} offset={[-120, -300]} accent="#ffa040" />
      <Label position={[LENS.valve[0], LENS.valve[1] + 0.3 * LENS_R.valve, LENS.valve[2]]} text="Expansionsventil" sub="enge Stelle, Druck fällt" visible={L.valve} offset={[-40, -300]} accent="#7fd0ff" />
      <Label position={[PRESS[0], 0.95, PRESS[2]]} text="Druckerei 1902" sub="Papier quillt bei Feuchte" visible={L.press} offset={[60, -300]} accent="#e8c48a" />
      <Label position={[PRESS[0] - 1.3, 1.2, PRESS[2] - 0.55]} text="Carriers Anlage" sub="entzog der Luft Wasser" visible={L.carrier} offset={[80, -280]} accent="#7fd0ff" />
    </>
  );
}
void VALVE;
