import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { SpoonModel } from './SpoonModel';
import { Vessels, WoodBlock } from './WoodBlock';
import { BLOCK, BW, CRACK } from './wood';
import * as track from './script';

const b = (x: number, y: number, z: number): [number, number, number] => [BLOCK.x + x, BLOCK.y + y, BLOCK.z + z];

export function SpoonScene() {
  const L = track.labels;
  const M = track.MAGV;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-4, 4, 8, -2]} fog={[30, 60]} />
      <SpoonModel />
      <WoodBlock />
      <Vessels center={M} radius={0.38} />

      <Label position={[CRACK.x, 5.0, 0.12]} text="Dunkle Linie" visible={L.line} offset={[110, -240]} accent="#d8a46c" />
      <Label position={[CRACK.x + 0.02, 5.3, 0.1]} text="Ein Riss im Holz" sub="Essensreste sitzen darin" visible={L.crack} offset={[-120, -280]} accent="#ff8a5a" />
      <Label position={[M[0], M[1] + 0.2, M[2]]} text="Holzgefäße" sub="winzige Röhren saugen Flüssigkeit auf" visible={L.tubes} offset={[60, -300]} accent="#7fc4ff" />
      <Label position={b(-0.4, BW.y / 2, 0.3)} text="Quillt auf" sub="Holz nimmt Wasser auf" visible={L.swell} offset={[-100, -280]} accent="#7fc4ff" />
      <Label position={b(-0.4, BW.y / 2, 0.3)} text="Schrumpft" sub="beim Trocknen" visible={L.shrink} offset={[-100, -280]} accent="#d8a46c" />
      <Label position={b(0.3, BW.y / 2, 0)} text="Es reißt" sub="Spannung im Holz" visible={L.breaks} offset={[80, -280]} accent="#ff8a5a" />
      <Label position={b(0.45, BW.y / 2 - 0.08, 0)} text="Soße, Fleischsaft, Fett" sub="werden in den Riss gedrückt" visible={L.food} offset={[-140, -300]} accent="#ff8a5a" />
      <Label position={b(0.5, 0.0, 0)} text="Riss wird tiefer" sub="mit jedem Spülgang" visible={L.deeper} offset={[60, 260]} accent="#ff8a5a" />
      <Label position={b(0.6, BW.y / 2 - 0.12, 0)} text="Bakterien" sub="feucht & geschützt im Spalt" visible={L.bugs} offset={[-120, -300]} accent="#9be07f" />
      <Label position={b(0.2, BW.y / 2 + 0.02, 0.05)} text="Spülwasser" sub="kommt kaum hinein" visible={L.rinse} offset={[-100, -280]} accent="#7fc4ff" />
      <Label position={b(0.45, BW.y / 2, -0.25)} text="In die Poren gezogen" sub="intaktes Holz saugt sie auf" visible={L.pores} offset={[-120, -300]} accent="#9be07f" />
      <Label position={b(0.45, BW.y / 2, -0.25)} text="Holz trocknet" sub="Bakterien sterben meist ab" visible={L.dies} offset={[-120, -300]} accent="#c9d4e0" />
      <Label position={[0, 5.3, 0.15]} text="Von Hand spülen" sub="nicht in die Spülmaschine" visible={L.hand} offset={[100, -260]} accent="#7fc4ff" />
      <Label position={[0, 4.6, 0.1]} text="Gut trocknen lassen" visible={L.dryL} offset={[100, -220]} accent="#d8a46c" />
      <Label position={[-0.35, 5.3, -0.5]} text="Gerissen? Austauschen" sub="neuer Löffel" visible={L.swap} offset={[-60, -300]} accent="#ff8a5a" />
    </>
  );
}
