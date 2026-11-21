import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { Lenses } from './Lenses';
import { Machine } from './Machine';
import { Water } from './Water';
import { DISPENSER, HUB_LOW, LENS, PUMP, SUMP } from './script';
import * as track from './script';

export function DishScene() {
  const L = track.labels;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-5, 5, 9, -2]} fog={[30, 60]} />
      <Machine />
      <Water />
      <Lenses />

      <Label position={[HUB_LOW[0] + 1.2, HUB_LOW[1], HUB_LOW[2]]} text="Sprüharm" sub="dreht sich ohne eigenen Motor" visible={L.arm} offset={[60, -260]} accent="#7fd0ff" />
      <Label position={[-2.0, 0.35, -2.3]} text="Wasserzulauf" sub="≈ 10 Liter pro Spülgang" visible={L.inlet} offset={[60, -280]} accent="#7fd0ff" />
      <Label position={[LENS.soft[0], LENS.soft[1] + 0.5, LENS.soft[2]]} text="Enthärter" sub="Harzkugeln tauschen Kalk gegen Natrium" visible={L.soft} offset={[-60, -300]} accent="#ffd27a" />
      <Label position={[PUMP[0] - 0.3, PUMP[1], PUMP[2] + 0.1]} text="Heizung" sub="im Pumpenkreislauf · bis 70 °C" visible={L.heater} offset={[-120, -280]} accent="#ff7a3a" />
      <Label position={[PUMP[0], PUMP[1] + 0.2, PUMP[2]]} text="Umwälzpumpe" sub="drückt das Wasser zu den Armen" visible={L.pump} offset={[60, -300]} accent="#7fd0ff" />
      <Label position={[HUB_LOW[0] + 1.6, HUB_LOW[1] + 0.3, HUB_LOW[2]]} text="Rückstoß" sub="schräger Strahl → Arm dreht sich" visible={L.jet} offset={[-80, -300]} accent="#ffb04a" />
      <Label position={DISPENSER} text="Tab-Fach öffnet sich" sub="Reiniger mit Enzymen" visible={L.tab} offset={[-120, -280]} accent="#9fe0ff" />
      <Label position={[LENS.enzyme[0], LENS.enzyme[1] + 0.45, LENS.enzyme[2]]} text="Enzyme" sub="zerschneiden Stärke & Eiweiß" visible={L.enzyme} offset={[-80, -300]} accent="#5cc46a" />
      <Label position={[SUMP[0], 0.7, SUMP[2]]} text="Sieb" sub="fängt Essensreste ab" visible={L.sieve} offset={[80, -280]} accent="#2a8cff" />
      <Label position={[LENS.rinse[0], LENS.rinse[1] + 0.45, LENS.rinse[2]]} text="Klarspüler" sub="Wasser läuft als Film ab" visible={L.rinse} offset={[60, -300]} accent="#bfe6ff" />
      <Label position={[2.18, 3.6, 0.6]} text="Kühlere Wände" sub="Dampf kondensiert hier" visible={L.walls} offset={[-140, -280]} accent="#bfe6ff" />
      <Label position={[-1.3, 1.4, 3.4]} text="Spülmaschine" sub="≈ 10 l" visible={L.machine} offset={[-120, -280]} accent="#7fd0ff" />
      <Label position={[1.3, 5.3, 3.4]} text="Von Hand" sub="oft ≈ 40 l" visible={L.hand} offset={[40, -220]} accent="#7fd0ff" />
    </>
  );
}
