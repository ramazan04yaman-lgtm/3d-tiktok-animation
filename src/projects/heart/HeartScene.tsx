import { useMemo } from 'react';
import * as THREE from 'three';
import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { HEART, LA, LV, RA, RV, VALVES, ejectTravel, fillTravel, heartQuat, toWorld, veinTravel, vessel } from './anatomy';
import { bodyVessels, lungVessels } from './body';
import { GasExchange } from './GasExchange';
import { HeartModel } from './HeartModel';
import * as track from './script';

const BLUE = '#3f78ff';
const RED = '#ff3b2f';
type P = readonly number[];
const c3 = (pts: P[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');

/** blood paths in the heart's local frame (see anatomy.ts) */
function useHeartPaths() {
  return useMemo(() => {
    const pt: P[] = [[-0.2, -0.25, 0.01], [-0.16, -0.05, 0.04], [-0.1, 0.15, 0.1], [-0.02, 0.3, 0.15], [0.0, 0.37, 0.172], [0.04, 0.48, 0.21], [0.14, 0.63, 0.2], [0.24, 0.73, 0.1]];
    const ao: P[] = [[0.2, -0.38, -0.02], [0.16, -0.15, 0.0], [0.08, 0.05, 0.0], [0.03, 0.2, 0.0]];
    const vp = (n: string) => vessel(n).pts as P[];
    return {
      svc: c3([...vp('svc'), [-0.28, 0.42, -0.02]]),
      ivc: c3([...vp('ivc'), [-0.28, 0.36, -0.02]]),
      tricuspid: c3([[-0.29, 0.46, -0.02], [-0.26, 0.3, -0.02], [-0.25, 0.15, -0.01], [-0.23, -0.05, 0.0], [-0.2, -0.27, 0.0]]),
      pulmL: c3([...pt, ...vp('pulmonaryL').slice(1)]),
      pulmR: c3([...pt, ...vp('pulmonaryR').slice(1)]),
      pvLS: c3([...vp('pvLS'), [0.18, 0.44, -0.03]]),
      pvLI: c3([...vp('pvLI'), [0.18, 0.42, -0.03]]),
      pvR: c3([...vp('pvRS'), [0.14, 0.44, -0.04]]),
      pvRI: c3([...vp('pvRI'), [0.14, 0.42, -0.04]]),
      mitral: c3([[0.16, 0.46, -0.03], [0.165, 0.3, -0.03], [0.17, 0.12, -0.03], [0.19, -0.1, -0.02], [0.2, -0.37, -0.02]]),
      aorta: c3([...ao, ...vp('aorta').slice(2)]),
    };
  }, []);
}

function Flows() {
  const p = useHeartPaths();
  const f = track.flow;
  return (
    <group position={HEART.position} quaternion={heartQuat}>
      {/* oxygen-poor blood: venae cavae → right atrium → right ventricle → pulmonary arteries */}
      <FlowParticles curve={p.svc} intensity={f.caval} count={54} travel={(t) => veinTravel(t) * 0.42} size={0.0105} stretch={2.2} color={BLUE} glow={2.2} spread={0.035} />
      <FlowParticles curve={p.ivc} intensity={f.caval} count={70} travel={(t) => veinTravel(t) * 0.42} size={0.0105} stretch={2.2} color={BLUE} glow={2.2} spread={0.045} />
      <FlowParticles curve={p.tricuspid} intensity={f.tricuspid} count={73} travel={(t) => fillTravel(t) * 0.3} size={0.0105} stretch={2.0} color={BLUE} glow={2.2} spread={0.05} />
      <FlowParticles curve={p.pulmL} intensity={f.pulmonary} count={89} travel={(t) => ejectTravel(t) * 0.55} size={0.0105} stretch={2.4} color={BLUE} glow={2.2} spread={0.04} />
      <FlowParticles curve={p.pulmR} intensity={f.pulmonary} count={89} travel={(t) => ejectTravel(t) * 0.55 + 0.37} size={0.0105} stretch={2.4} color={BLUE} glow={2.2} spread={0.04} />
      {/* oxygen-rich blood: pulmonary veins → left atrium → left ventricle → aorta */}
      <FlowParticles curve={p.pvLS} intensity={f.pvIn} count={41} travel={(t) => veinTravel(t) * 0.36} size={0.0105} stretch={2.2} color={RED} glow={2.2} spread={0.022} />
      <FlowParticles curve={p.pvLI} intensity={f.pvIn} count={41} travel={(t) => veinTravel(t) * 0.36 + 0.2} size={0.0105} stretch={2.2} color={RED} glow={2.2} spread={0.022} />
      <FlowParticles curve={p.pvR} intensity={f.pvIn} count={48} travel={(t) => veinTravel(t) * 0.36 + 0.1} size={0.0105} stretch={2.2} color={RED} glow={2.2} spread={0.022} />
      <FlowParticles curve={p.pvRI} intensity={f.pvIn} count={48} travel={(t) => veinTravel(t) * 0.36 + 0.3} size={0.0105} stretch={2.2} color={RED} glow={2.2} spread={0.022} />
      <FlowParticles curve={p.mitral} intensity={f.mitral} count={73} travel={(t) => fillTravel(t) * 0.3} size={0.0105} stretch={2.0} color={RED} glow={2.2} spread={0.05} />
      <FlowParticles curve={p.aorta} intensity={f.aortic} count={176} travel={(t) => ejectTravel(t) * 0.8} size={0.0105} stretch={2.4} color={RED} glow={2.4} spread={0.05} />
    </group>
  );
}

/** pulmonary and systemic circulation outside the heart (world space) */
function OuterFlows() {
  const { lungArt, lungVein, art, vein } = useMemo(() => {
    const lv = lungVessels();
    const bv = bodyVessels();
    return {
      lungArt: lv.filter((b) => b.venous && b.level <= 2),
      lungVein: lv.filter((b) => !b.venous && b.level <= 2),
      art: bv.filter((b) => !b.venous),
      vein: bv.filter((b) => b.venous),
    };
  }, []);
  const f = track.flow;
  return (
    <group>
      {lungArt.map((b, i) => (
        <FlowParticles key={`la${i}`} curve={b.curve} intensity={f.lungArt} count={b.level === 0 ? 14 : 8} travel={(t) => ejectTravel(t) * 0.35 + i * 0.13} size={0.016} stretch={2.2} color={BLUE} glow={1.8} />
      ))}
      {lungVein.map((b, i) => (
        <FlowParticles key={`lv${i}`} curve={b.curve} intensity={f.lungVein} count={b.level === 0 ? 14 : 8} travel={(t) => -veinTravel(t) * 0.3 + i * 0.17} size={0.016} stretch={2.2} color={RED} glow={1.8} />
      ))}
      {art.map((b, i) => (
        <FlowParticles key={`a${i}`} curve={b.curve} intensity={f.body} count={Math.round(b.curve.getLength() * 9)} travel={(t) => ejectTravel(t) * 0.9 + i * 0.21} size={0.02} stretch={2.4} color={RED} glow={1.8} />
      ))}
      {vein.map((b, i) => (
        <FlowParticles key={`v${i}`} curve={b.curve} intensity={(t) => track.veinsBody(t) * 1.1} count={Math.round(b.curve.getLength() * 8)} travel={(t) => veinTravel(t) * 0.55 + i * 0.19} size={0.019} stretch={2.2} color={BLUE} glow={1.6} />
      ))}
    </group>
  );
}

const W = (p: P) => toWorld(p);

export function HeartScene() {
  const L = track.labels;
  return (
    <>
      <Studio background="#06070a" floorColor="#0d0f13" shadowExtent={[-4, 4, 7, -2]} fog={[30, 60]} />
      <HeartModel />
      <Flows />
      <OuterFlows />
      <GasExchange center={track.MAGNIFIER} radius={0.6} />

      <Label position={W([0.05, 0.9, 0.0])} text="Große Blutgefäße" sub="Aorta · Lungenarterie · Hohlvenen" visible={L.vessels} offset={[120, -280]} />
      <Label position={W(RA.c)} text="Rechter Vorhof" visible={L.ra} offset={[-30, -330]} accent="#6f9bff" />
      <Label position={W(LA.c)} text="Linker Vorhof" visible={L.la} offset={[120, -330]} accent="#ff6a5e" />
      <Label position={W(RV.c)} text="Rechte Kammer" visible={L.rv} offset={[-110, 300]} accent="#6f9bff" />
      <Label position={W(LV.c)} text="Linke Kammer" visible={L.lv} offset={[140, 260]} accent="#ff6a5e" />
      <Label position={W(VALVES.mitral.c)} text="Herzklappen" sub="Ventile: Blut fließt nur in eine Richtung" visible={L.valves} offset={[-260, -460]} />

      <Label position={W(vessel('svc').pts[3])} text="Obere Hohlvene" visible={L.svc} offset={[-60, -260]} accent="#6f9bff" />
      <Label position={W(vessel('ivc').pts[4])} text="Untere Hohlvene" visible={L.ivc} offset={[-60, 260]} accent="#6f9bff" />
      <Label position={W(RA.c)} text="Rechter Vorhof" sub="sammelt das sauerstoffarme Blut" visible={L.raIn} offset={[40, -380]} accent="#6f9bff" />
      <Label position={W(VALVES.tricuspid.c)} text="Trikuspidalklappe" sub="öffnet sich zur Kammer hin" visible={L.tricuspid} offset={[-200, 300]} />
      <Label position={W([-0.22, -0.12, 0.0])} text="Rechte Herzkammer" visible={L.rvIn} offset={[-160, 300]} accent="#6f9bff" />

      <Label position={W(VALVES.pulmonary.c)} text="Pulmonalklappe" sub="öffnet sich beim Pumpen" visible={L.pulmValve} offset={[-260, -260]} />
      <Label position={W([0.5, 0.77, 0.0])} text="Lungenarterie" sub="führt zur Lunge" visible={L.pulmArtery} offset={[60, -300]} accent="#6f9bff" />
      <Label position={[0.95, 4.55, 0.35]} text="Lunge" sub="Millionen Lungenbläschen" visible={L.lung} offset={[90, -330]} accent="#ff9fb0" />
      <Label position={[track.MAGNIFIER[0] - 0.05, track.MAGNIFIER[1] + 0.15, track.MAGNIFIER[2]]} text="CO₂ wird abgegeben" sub="ins Lungenbläschen" visible={L.co2} offset={[60, -330]} accent="#c7b8ff" />
      <Label position={[track.MAGNIFIER[0] + 0.25, track.MAGNIFIER[1] - 0.17, track.MAGNIFIER[2] + 0.2]} text="O₂ wird aufgenommen" sub="vom Blut" visible={L.o2} offset={[-300, 330]} accent="#9ff3ff" />

      <Label position={W(vessel('pvLS').pts[3])} text="Lungenvenen" sub="sauerstoffreiches Blut" visible={L.pulmVeins} offset={[40, -320]} accent="#ff6a5e" />
      <Label position={W(LA.c)} text="Linker Vorhof" visible={L.laIn} offset={[120, -300]} accent="#ff6a5e" />
      <Label position={W(VALVES.mitral.c)} text="Mitralklappe" sub="öffnet sich zur Kammer hin" visible={L.mitral} offset={[140, 300]} />
      <Label position={W([0.2, -0.15, -0.03])} text="Linke Herzkammer" sub="Wand ≈ 1 cm dick" visible={L.lvIn} offset={[120, 300]} accent="#ff6a5e" />

      <Label position={W([0.42, -0.15, -0.05])} text="Kräftige Muskelwand" sub="zieht sich ≈ 1-mal pro Sekunde zusammen" visible={L.wall} offset={[-60, 330]} accent="#ff6a5e" />
      <Label position={W(VALVES.aortic.c)} text="Aortenklappe" sub="öffnet sich, wenn die Kammer pumpt" visible={L.aorticValve} offset={[-240, -300]} />
      <Label position={W([0.06, 0.93, -0.07])} text="Aorta" sub="Hauptschlagader" visible={L.aorta} offset={[100, -260]} accent="#ff6a5e" />
    </>
  );
}
