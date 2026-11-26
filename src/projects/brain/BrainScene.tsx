import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { Brain } from './Brain';
import { Lenses } from './Lenses';
import { AXON, Neurons } from './Neurons';
import { BULB, LENS, LENS_R, NA, NB, SYN } from './script';
import * as track from './script';

const add = (p: readonly number[], dx: number, dy: number, dz = 0): [number, number, number] => [p[0] + dx, p[1] + dy, p[2] + dz];

export function BrainScene() {
  const L = track.labels;
  const ax = AXON.getPointAt(0.3);
  const my = AXON.getPointAt(0.62);
  const R = LENS_R.syn, S = LENS_R.skin;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-5, 5, 7, -2]} fog={[30, 60]} />
      <Brain />
      <Neurons />
      <Lenses />

      <Label position={[1.2, 3.2, 1.6]} text="Gehirn" sub="≈ 1,4 kg · nur 20 Watt" visible={L.brain} offset={[-60, 200]} accent="#ff9ab8" />
      <Label position={add(BULB, 0.3, 0.8)} text="Glühbirne" sub="meist 40 – 60 Watt" visible={L.bulb} offset={[80, -120]} accent="#ffc27a" />
      <Label position={NA} text="Nervenzelle" sub="eine von 86 Milliarden" visible={L.neuron} offset={[80, -300]} accent="#9fd4ff" />
      <Label position={add(NA, -0.12, 0.1)} text="Dendriten" sub="empfangen Signale" visible={L.dendrites} offset={[-60, 240]} accent="#9fe0ff" />
      <Label position={[ax.x, ax.y, ax.z]} text="Axon" sub="leitet den Impuls weiter" visible={L.axon} offset={[-40, -300]} accent="#ffffff" />
      <Label position={[my.x, my.y + 0.02, my.z]} text="Myelin" sub="Isolierung · Impuls springt" visible={L.myelin} offset={[-120, -300]} accent="#f1e9da" />
      <Label position={SYN} text="Synapse" sub="Spalt ≈ 20 Millionstel mm" visible={L.synapse} offset={[-60, -320]} accent="#ffd27a" />
      <Label position={add(LENS.syn, 0.15 * R, 0.45 * R)} text="Bläschen" sub="voller Botenstoffe" visible={L.vesicle} offset={[60, -300]} accent="#ffd23a" />
      <Label position={add(LENS.syn, 0.3 * R, -0.08 * R)} text="Rezeptoren" sub="fangen die Botenstoffe" visible={L.receptor} offset={[60, 240]} accent="#5cc46a" />
      <Label position={NB} text="Bis zu 10 000" sub="Kontakte pro Nervenzelle" visible={L.contacts} offset={[-60, -300]} accent="#ffd27a" />
      <Label position={SYN} text="Stärkere Verbindung" sub="gemeinsam gefeuert" visible={L.strong} offset={[-60, -300]} accent="#ffd27a" />
      <Label position={add(LENS.skin, 0.25 * S, 0.56 * S, 0.3 * S)} text="Kopfhaut & Hirnhaut" sub="haben Schmerzsensoren" visible={L.scalp} offset={[-80, -260]} accent="#ffd23a" />
      <Label position={add(LENS.skin, 0.2 * S, -0.4 * S, 0.3 * S)} text="Hirngewebe" sub="keine Schmerzsensoren" visible={L.tissue} offset={[-60, 240]} accent="#ff9ab8" />
    </>
  );
}
void NB;
