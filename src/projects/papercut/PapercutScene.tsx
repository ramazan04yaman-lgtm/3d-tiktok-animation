import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { EDGE } from './finger';
import { Micro } from './Micro';
import { PapercutModel } from './PapercutModel';
import { SkinBlock, YT, ZC } from './SkinBlock';
import { SHEETS, Study } from './Study';
import * as track from './script';

/** skin block: u across the cut, h depth below the surface (on the section face) */
const pt = (u: number, h: number): [number, number, number] => [u, YT - h, ZC - 0.02];

export function PapercutScene() {
  const L = track.labels;
  const R = track.RIG;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-6, 10, 8, -3]} fog={[30, 60]} />
      <PapercutModel />
      <Micro />
      <SkinBlock />
      <Study origin={R} />

      <Label position={[EDGE.x - 0.1, EDGE.y - 0.02, EDGE.z + 0.05]} text="Zellulosefasern" sub="Papierkante, stark vergrößert" visible={L.edge} offset={[-120, -300]} accent="#e8e2d0" />
      <Label position={[EDGE.x + 0.2, EDGE.y - 0.03, EDGE.z + 0.02]} text="Rau wie eine Säge" sub="Faserenden ragen heraus" visible={L.saw} offset={[60, 280]} accent="#e8e2d0" />
      <Label position={[EDGE.x - 0.3, EDGE.y, EDGE.z]} text="Hauchdünne Linie" sub="die ganze Kraft auf ≈ 0,1 mm" visible={L.lineL} offset={[-120, 280]} accent="#ffb04a" />

      <Label position={pt(0, 0.1)} text="Flacher Schnitt" sub="durch die Oberhaut" visible={L.shallow} offset={[-80, -300]} accent="#ff8a7a" />
      <Label position={pt(0.22, 0.33)} text="Blutgefäße" sub="liegen meist tiefer" visible={L.vessels} offset={[80, 260]} accent="#ff5a4e" />
      <Label position={pt(-0.16, 0.08)} text="Nervenenden" sub="reichen bis in die Oberhaut" visible={L.nerves} offset={[-120, -280]} accent="#ffd84a" />
      <Label position={pt(-0.25, 0)} text="Fingerkuppe" sub="besonders dicht mit Nerven" visible={L.tip} offset={[-80, -300]} accent="#ffd84a" />
      <Label position={pt(0.02, 0.1)} text="Nerven liegen offen" sub="kaum Blut deckt die Wunde ab" visible={L.open} offset={[60, -300]} accent="#ff7a3a" />

      <Label position={[R[0] + SHEETS[1].dx, R[1] + 1.2, R[2]]} text="≈ 0,065 mm" sub="schneidet am leichtesten" visible={L.mid} offset={[60, -260]} accent="#7fd0ff" />
      <Label position={[R[0] + SHEETS[0].dx, R[1] + 1.0, R[2]]} text="Dünner" sub="knickt weg" visible={L.thin} offset={[-60, -280]} accent="#c9d4e0" />
      <Label position={[R[0] + SHEETS[2].dx, R[1] + 1.0, R[2]]} text="Dicker" sub="drückt die Haut nur ein" visible={L.thick} offset={[-120, -280]} accent="#c9d4e0" />
    </>
  );
}
