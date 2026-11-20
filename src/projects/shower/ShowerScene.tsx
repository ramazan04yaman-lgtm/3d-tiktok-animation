import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { Biofilm } from './Biofilm';
import { HEAD, NOZZLES, PLATE } from './head';
import { Person } from './Person';
import { ShowerHead } from './ShowerHead';
import * as track from './script';

const h = (x: number, y: number, z: number): [number, number, number] => [HEAD.x + x, HEAD.y + y, HEAD.z + z];
const clogged = NOZZLES.find((n) => n.clogged && n.p.x > 0.1 && n.p.z > 0)! ?? NOZZLES[10];

export function ShowerScene() {
  const L = track.labels;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-5, 5, 10, -2]} fog={[30, 60]} />
      <ShowerHead />
      <Person />
      <Biofilm center={track.MAG} radius={0.3} />

      <Label position={h(clogged.p.x + clogged.dir.x * 0.6, clogged.p.y - 0.6, clogged.p.z + clogged.dir.z * 0.6)} text="Schiefer Strahl" visible={L.jet} offset={[80, -240]} accent="#9fe0ff" />
      <Label position={h(clogged.p.x, clogged.p.y, clogged.p.z)} text="Dunkle Punkte" sub="in den Düsen" visible={L.dots} offset={[-120, 260]} accent="#c9a26a" />
      <Label position={h(-0.05, PLATE.top + 0.012, 0.1)} text="Restwasser" sub="bleibt nach dem Duschen stehen" visible={L.rest} offset={[-100, -280]} accent="#7fc4ff" />
      <Label position={h(-0.05, 0.06, -0.1)} text="Dunkel · feucht · warm" sub="ideal für Bakterien" visible={L.climate} offset={[-60, -300]} accent="#ffb04a" />
      <Label position={h(-0.03, PLATE.top + 0.004, 0.3)} text="Kalk" sub="lagert sich zuerst ab" visible={L.kalk} offset={[-120, 260]} accent="#e9e4d8" />
      <Label position={[track.MAG[0], track.MAG[1] + 0.12, track.MAG[2]]} text="Biofilm" sub="Bakterien in Schleim" visible={L.bio} offset={[-80, -300]} accent="#c27a7c" />
      <Label position={h(clogged.p.x, clogged.p.y, clogged.p.z)} text="Verstopfte Düse" sub="der Strahl wird abgelenkt" visible={L.clog} offset={[-100, 260]} accent="#c9a26a" />
      <Label position={h(0.1, -0.9, 0.2)} text="Biofilm-Partikel" sub="werden mitgerissen" visible={L.flakes} offset={[100, -220]} accent="#c9a26a" />
      <Label position={[0, 7.45, 0.85]} text="Aerosol" sub="winzige Tröpfchen im Dampf" visible={L.aerosol} offset={[90, -260]} accent="#c9f27a" />
      <Label position={[0.35, 5.9, 0.0]} text="Lunge" sub="feinste Tröpfchen gelangen tief hinein" visible={L.lung} offset={[90, 220]} accent="#ff9fb0" />
      <Label position={[track.MAG[0], track.MAG[1] + 0.05, track.MAG[2]]} text="Mykobakterien" sub="lieben Duschkopf-Biofilm" visible={L.myco} offset={[-100, -300]} accent="#ff5a8c" />
      <Label position={h(0, PLATE.bottom - 0.03, 0.12)} text="Düsen abreiben" sub="Gummidüsen mit dem Finger" visible={L.rub} offset={[80, 260]} accent="#9fe0ff" />
      <Label position={h(-0.05, PLATE.top + 0.01, 0.2)} text="Entkalken" sub="z. B. mit Zitronensäure" visible={L.descale} offset={[-80, -280]} accent="#e9e4d8" />
      <Label position={h(0, -0.5, 0.1)} text="Heiß vorlaufen lassen" sub="nicht direkt darunter stehen" visible={L.hot} offset={[60, 260]} accent="#ffb04a" />
    </>
  );
}
