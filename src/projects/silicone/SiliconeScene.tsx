import { Studio } from '../../engine/components/Studio';
import { Tag } from '../../engine/components/Tag';
import { Bathroom } from './Bathroom';
import { Section } from './Section';
import { BLOCK, JOINT, RIM } from './script';
import * as track from './script';

/** block-local profile point (u towards the room, v up) → world (block is turned 90° about y) */
const B = (u: number, v: number): [number, number, number] => [BLOCK[0] + u, BLOCK[1] + v, BLOCK[2] + 1.12];

export function SiliconeScene() {
  const G = track.tags;
  return (
    <>
      <Studio background="#d4dbe1" floorColor="#c4cbd1" shadowExtent={[-2, 12, 14, -2]} fog={[40, 80]} />
      <hemisphereLight args={['#ffffff', '#9aa3ad', 0.45]} />
      <directionalLight position={[8, 14, 10]} intensity={1.0} />
      <Bathroom />
      <Section />

      <Tag position={[4.3, RIM + 0.25, 0.1]} text="Schimmel" tone="bad" visible={G.mould} />
      <Tag position={B(0.15, 0.25)} text="wächst ins Silikon" tone="bad" visible={G.hyphae} />
      <Tag position={B(0.15, 0.2)} text="klebt an 3 Seiten" tone="bad" visible={G.three} />
      <Tag position={B(0.2, 0.25)} text="reißt" tone="bad" visible={G.tears} tilt={3} />
      <Tag position={B(-0.3, 0.7)} text="Wasser dahinter" tone="bad" visible={G.water} />
      <Tag position={[4.0, RIM + 0.15, 0.4]} text="Seifenreste" tone="bad" visible={G.soap} />
      <Tag position={[4.4, RIM + 0.2, 0.1]} text="Futter für Schimmel" tone="bad" visible={G.food} />
      <Tag position={[JOINT.x0 + 3.5, RIM + 0.25, 0.1]} text="alles raus" tone="good" visible={G.cutAll} />
      <Tag position={[4.5, RIM + 0.25, 0.2]} text="mit Alkohol" visible={G.alcohol} />
      <Tag position={[4.5, RIM + 0.25, 0.2]} text="gut trocknen" visible={G.dry} />
      <Tag position={B(0.15, -0.1)} text="Rundschnur" visible={G.rod} tilt={3} />
      <Tag position={B(0.15, 0.2)} text="nur 2 Seiten" tone="good" visible={G.two} />
      <Tag position={[3.6, RIM + 0.45, 0.05]} text="Klebeband" visible={G.tape} />
      <Tag position={[5.0, RIM + 0.45, 0.1]} text="Sanitärsilikon" visible={G.sanitary} />
      <Tag position={[6.0, RIM + 0.35, 0.1]} text="mit Spülwasser" visible={G.water2} />
      <Tag position={[6.0, RIM + 0.45, 0.1]} text="sofort abziehen" tone="good" visible={G.tapeOff} />
      <Tag position={[4.5, RIM + 2.5, 1.5]} text="24 h nicht duschen" visible={G.h24} />
      <Tag position={[4.5, RIM + 5.2, 0.3]} text="abziehen" tone="good" visible={G.wipe} />
      <Tag position={[7.5, RIM + 6.5, 2.5]} text="lüften" tone="good" visible={G.vent} tilt={3} />
      <Tag position={[4.5, RIM + 0.25, 0.1]} text="Wartungsfuge" visible={G.maint} />
      <Tag position={[4.5, RIM + 0.25, 0.1]} text="alle paar Jahre neu" visible={G.renew} />
    </>
  );
}
