import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { ANAL, S, W } from './anatomy';
import { GutContents } from './Contents';
import { Ferment } from './Ferment';
import { GutModel } from './GutModel';
import * as track from './script';

/** magnifier in front of the caecum (world space) */
export const MAGNIFIER: [number, number, number] = [-0.06, 4.6, 0.72];
const MR = 0.3;
const A = (k: number) => W(ANAL.top.clone().addScaledVector(ANAL.dir, k).toArray());

export function GutScene() {
  const L = track.labels;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-5, 5, 9, -2]} fog={[30, 60]} />
      <GutModel />
      <group scale={S}>
        <GutContents />
      </group>
      <Ferment center={MAGNIFIER} radius={MR} />

      <Label position={W([0.78, 11.9, 0.15])} text="Magen" visible={L.stomach} offset={[110, -240]} accent="#ff9c8a" />
      <Label position={W([0.35, 9.75, 0.3])} text="Dünndarm" sub="≈ 5–6 m lang" visible={L.small} offset={[120, 120]} accent="#ffb49a" />
      <Label position={W([-0.97, 10.3, 0.16])} text="Dickdarm" sub="≈ 1,5 m lang" visible={L.colon} offset={[-90, -200]} accent="#e9c9a7" />
      <Label position={W([0, 8.6, -0.55])} text="Enddarm" visible={L.rectum} offset={[-150, 170]} accent="#e9c9a7" />

      <Label position={W([0.02, 13.4, -0.42])} text="Speiseröhre" sub="verschluckte Luft gelangt in den Magen" visible={L.esophagus} offset={[-120, -150]} accent="#9fd8ff" />
      <Label position={W([0.6, 12.42, -0.05])} text="Luftblase im Magen" sub="meist wieder aufgestoßen" visible={L.stomachAir} offset={[90, -230]} accent="#9fd8ff" />
      <Label position={W([-0.86, 9.15, 0.3])} text="Blinddarm" sub="Anfang des Dickdarms" visible={L.caecum} offset={[-80, 230]} accent="#e9c9a7" />
      <Label position={[MAGNIFIER[0] - 0.08, MAGNIFIER[1] + 0.1, MAGNIFIER[2]]} text="Darmbakterien" sub="Billionen im Dickdarm" visible={L.bacteria} offset={[-120, -300]} accent="#9be07f" />
      <Label position={[MAGNIFIER[0] + 0.15, MAGNIFIER[1] - 0.08, MAGNIFIER[2]]} text="Ballaststoffe" sub="für uns unverdaulich" visible={L.fibre} offset={[90, 280]} accent="#e6d27a" />
      <Label position={[MAGNIFIER[0] + 0.05, MAGNIFIER[1] + 0.18, MAGNIFIER[2]]} text="H₂ · CO₂ · CH₄" sub="Wasserstoff · Kohlendioxid · Methan" visible={L.gases} offset={[60, -330]} accent="#9fd8ff" />
      <Label position={[MAGNIFIER[0] - 0.1, MAGNIFIER[1] - 0.05, MAGNIFIER[2]]} text="H₂S & Co." sub="Schwefelverbindungen · < 1 % · Geruch" visible={L.sulfur} offset={[-80, 300]} accent="#ffd84a" />
      <Label position={W([0.1, 10.5, 0.42])} text="Darmbewegungen" sub="Muskelwellen schieben das Gas weiter" visible={L.waves} offset={[-60, 260]} accent="#ff9c8a" />

      <Label position={W([0, 8.55, -0.55])} text="Enddarm" sub="füllt sich mit Gas" visible={L.rectumIn} offset={[-160, -240]} accent="#e9c9a7" />
      <Label position={A(0.15)} text="Innerer Schließmuskel" sub="öffnet sich kurz – unbewusst" visible={L.internalSph} offset={[-120, -260]} accent="#f0b8aa" />
      <Label position={A(0.12)} text="Feine Nerven" sub="prüfen: Gas oder Stuhl?" visible={L.nerves} offset={[60, -320]} accent="#ffe27a" />
      <Label position={A(0.32)} text="Äußerer Schließmuskel" sub="wird bewusst entspannt" visible={L.externalSph} offset={[-100, 240]} accent="#ff7a6a" />
      <Label position={A(0.42)} text="Gewebe schwingt" sub="so entsteht das Geräusch" visible={L.vibration} offset={[60, 250]} accent="#ffc65c" />
    </>
  );
}
