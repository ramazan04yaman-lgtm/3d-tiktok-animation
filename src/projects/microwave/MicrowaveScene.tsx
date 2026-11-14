import { useMemo } from 'react';
import * as THREE from 'three';
import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { FieldSlice } from '../../engine/effects/FieldSlice';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { Steam } from '../../engine/effects/Steam';
import { WaveFronts } from '../../engine/effects/WaveFronts';
import { WaveRibbon } from '../../engine/effects/WaveRibbon';
import { hash2 } from '../../engine/math';
import { useTimelineFrame } from '../../engine/time';
import { Molecules } from './Molecules';
import { M, MicrowaveModel } from './MicrowaveModel';
import { CAVITY, FIELD_GLSL, MW } from './physics';
import * as track from './script';

const c3 = (...p: [number, number, number][]) => new THREE.CatmullRomCurve3(p.map((x) => new THREE.Vector3(...x)), false, 'centripetal');

/** Electron "spokes" rotating in the magnetron's interaction space (5 spokes for a 10-vane anode). */
function ElectronCloud() {
  const N = 5 * 14;
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#7fe0ff', toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), N);
    m.frustumCulled = false;
    m.renderOrder = 17;
    return m;
  }, [N]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color('#7fe0ff') }), []);
  useTimelineFrame((t) => {
    const k = track.electrons(t);
    mesh.visible = k > 0.002;
    for (let i = 0; i < N; i++) {
      const spoke = i % 5;
      const s = hash2(i, 1);
      const r = 0.026 + 0.05 * s;
      const a = 1.6 * t + (spoke / 5) * Math.PI * 2 + s * 1.3;
      const x = M.magnetron.x - 0.13 + hash2(i, 2) * 0.26;
      tmp.p.set(x, M.magnetron.y + Math.cos(a) * r, Math.sin(a) * r);
      tmp.s.setScalar(0.011 * k);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

export function MicrowaveScene() {
  const curves = useMemo(() => {
    const guide = c3([M.antennaTip.x, M.antennaTip.y, 0], [1.0, 1.55, 0], [1.0, 1.82, 0], [0.96, 1.94, 0], [0.86, 1.96, 0], [0.4, 1.96, 0]);
    const hv = c3([M.transformer.x, M.transformer.y + 0.22, M.transformer.z + 0.2], [M.capacitor.x - 0.1, M.capacitor.y + 0.2, M.capacitor.z - 0.2], [M.capacitor.x + 0.4, M.capacitor.y + 0.2, M.capacitor.z - 0.1], [M.magnetron.x + 0.43, M.magnetron.y - 0.3, 0.12], [M.magnetron.x + 0.43, M.magnetron.y - 0.2, 0.05]);
    return { guide, hv };
  }, []);
  const cycles = curves.guide.getLength() / MW.wavelengthDm;
  const fieldY = M.soupY + 0.02;

  return (
    <>
      <Studio surface="counter" shadowExtent={[-5, 5, 5, -3]} fog={[22, 46]} counter={{ size: [60, 44], z: 4 }} />
      <MicrowaveModel />

      {/* high voltage supply (visual current flow) */}
      <mesh geometry={useMemo(() => new THREE.TubeGeometry(curves.hv, 60, 0.018, 8), [curves.hv])}>
        <meshStandardMaterial color="#b02a1f" roughness={0.5} />
      </mesh>
      <FlowParticles curve={curves.hv} intensity={track.heatWires} count={36} speed={0.8} size={0.014} color="#ffe27a" glow={2.5} stretch={2} />

      {/* magnetron: electrons + waves */}
      <ElectronCloud />
      {[0, Math.PI / 2].map((tw, i) => (
        <WaveRibbon key={i} curve={curves.guide} head={track.guideHead} intensity={(t) => Math.max(track.guideWave(t), track.guideWaveFaint(t))} amplitude={0.08} cycles={cycles} speed={0.9} width={0.02} twist={tw} phase={i * 0.4} />
      ))}
      <WaveFronts origin={[M.window.x, M.window.y, 0]} intensity={track.fronts} box={{ min: CAVITY.min, max: CAVITY.max }} maxRadius={3.66} count={3} period={2.8} />

      {/* standing-wave field around the food */}
      <FieldSlice min={[CAVITY.min[0], CAVITY.min[2]]} max={[CAVITY.max[0], CAVITY.max[2]]} y={fieldY} pattern={FIELD_GLSL} intensity={track.field} oscillation={track.E_VIS_HZ} />

      <Molecules center={[-0.6, 1.25, 0.25]} />

      <Steam origin={[-0.6, M.soupY + 0.05, 0]} intensity={track.steam} count={90} lifetime={3.2} riseSpeed={0.42} drift={[0.02, 0, 0.06]} spread={0.3} size={0.3} opacity={0.2} />

      {/* labels */}
      <Label position={[-0.4, 1.35, 1.88]} text="Metallgitter in der Tür" sub="Löcher ≪ Wellenlänge – Wellen bleiben drin" visible={track.labels.doorMesh} offset={[-40, -330]} />
      <Label position={[-1.5, 1.9, -1.0]} text="Garraum" sub="Metallwände reflektieren die Wellen" visible={track.labels.cavity} offset={[30, -330]} />
      <Label position={[-1.5, 0.31, 0.6]} text="Drehteller" sub="mit Glasplatte" visible={track.labels.turntable} offset={[60, -170]} />
      <Label position={[M.magnetron.x, M.magnetron.y + 0.3, 0.1]} text="Magnetron" sub="erzeugt die Mikrowellen" visible={track.labels.magnetron} offset={[-160, -330]} accent="#58c4ff" />
      <Label position={[M.transformer.x, M.transformer.y + 0.2, M.transformer.z + 0.3]} text="Hochspannung" sub="Trafo, Kondensator, Diode ≈ 4 000 V" visible={track.labels.transformer} offset={[-260, 200]} accent="#ff9a4a" />
      <Label position={[1.0, 1.8, 0.4]} text="Wellenleiter" sub="führt die Wellen zum Garraum" visible={track.labels.waveguide} offset={[110, -260]} />
      <Label position={[M.magnetron.x - 0.05, M.magnetron.y, 0]} text="Elektronen kreisen" sub="Magnetfeld + Hochspannung (verlangsamt)" visible={track.labels.cathode} offset={[-50, 250]} accent="#7fe0ff" />
      <Label position={[0.86, 1.96, 0]} text="2,45 GHz" sub="Wellenlänge ≈ 12 cm" visible={track.labels.freq} offset={[-220, 230]} />
      <Label position={[-0.85, 0.95, 0.3]} text="Wassermoleküle" sub="Dipole – vergrößert dargestellt" visible={track.labels.molecules} offset={[40, 160]} accent="#e5484d" />
      <Label position={[-0.85, 0.95, 0.3]} text="Wechselfeld" sub="polt sich 2,45 Mrd.-mal/s um (verlangsamt)" visible={track.labels.field} offset={[40, 160]} />
      <Label position={[-0.35, M.soupY, 0.3]} text="Heiße & kühle Stellen" sub="stehende Wellen, Abstand ≈ 6 cm" visible={track.labels.hotspots} offset={[-80, -300]} accent="#ff7a3a" />
    </>
  );
}
