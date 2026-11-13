import { useMemo } from 'react';
import * as THREE from 'three';
import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { Drops } from '../../engine/effects/Drops';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { HeatRings } from '../../engine/effects/HeatRings';
import { LiquidStream } from '../../engine/effects/LiquidStream';
import { Steam } from '../../engine/effects/Steam';
import { thermalColor } from '../../engine/effects/heat';
import { lerp } from '../../engine/math';
import { EspressoModel } from './EspressoModel';
import { P, pipeTankToPump, pressurePath } from './geometry';
import * as track from './script';

export function EspressoScene() {
  const curves = useMemo(() => {
    const pressure = pressurePath();
    // coffee seeping through the puck: short vertical paths inside the (cut) basket
    const seep = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI - Math.PI * 0.05;
      const r = 0.06 + (i % 3) * 0.08;
      const x = P.group.x + Math.cos(a) * r;
      const z = P.group.z - Math.abs(Math.sin(a)) * r * 0.9;
      return new THREE.LineCurve3(new THREE.Vector3(x, 1.985, z), new THREE.Vector3(x * 0.6, 1.8, P.group.z));
    });
    return { pressure, seep };
  }, []);
  // colour along the pressure path: cold → heated in the thermoblock section (≈ 7 %–80 % of the path)
  const pressureColor = useMemo(
    () => (_t: number, u: number, out: THREE.Color) => thermalColor(lerp(20, 93, Math.min(1, Math.max(0, (u - 0.08) / 0.7))), 20, 100, out),
    [],
  );
  const flowVisible = (t: number) => track.pumping(t) * Math.max(track.xray(t), track.internalCut(t));

  return (
    <>
      <Studio surface="counter" shadowExtent={[-3.5, 3.5, 4, -2.5]} />
      <EspressoModel />

      {/* water path */}
      <FlowParticles curve={pipeTankToPump} intensity={flowVisible} count={22} speed={0.45} size={0.016} color="#6fb6ff" glow={1.6} stretch={2.5} />
      <FlowParticles curve={curves.pressure} intensity={flowVisible} count={150} speed={0.9} size={0.015} color={pressureColor} glow={1.6} stretch={2.5} />
      <HeatRings position={[P.block.x, P.block.y - 0.5, P.block.z]} intensity={(t) => track.blockHeat(t) * track.internalCut(t)} radius={[0.22, 0.42]} rise={0.9} rings={4} period={1.8} />

      {/* extraction */}
      <Drops origin={[P.group.x, 2.115, P.group.z - 0.05]} radius={0.24} height={0.12} intensity={(t) => track.showerFlow(t) * track.groupCut(t)} count={90} size={0.009} color="#ffb07a" emissive={0.3} />
      {curves.seep.map((c, i) => (
        <FlowParticles key={i} curve={c} intensity={(t) => track.puckFlow(t) * track.groupCut(t)} count={5} speed={0.12} size={0.012} color="#8a4a1e" glow={1.1} stretch={2} />
      ))}
      <Drops origin={[-0.07, P.spoutY, P.group.z]} height={P.spoutY - 0.58} intensity={track.spoutDrips} count={6} size={0.016} color="#3a1d0c" />
      <Drops origin={[0.07, P.spoutY, P.group.z]} height={P.spoutY - 0.58} intensity={track.spoutDrips} count={6} size={0.016} color="#3a1d0c" />
      {[-0.07, 0.07].map((x, i) => (
        <LiquidStream
          key={x}
          from={[x, P.spoutY, P.group.z]}
          toY={(t) => P.cup.y - 0.41 + lerp(P.cupInnerBottom, P.cupFullY, track.cupFill(t))}
          flow={track.stream}
          radius={0.017}
          seed={i * 2.1}
        />
      ))}
      <Steam origin={[P.cup.x, P.cup.y - 0.41 + P.cupFullY + 0.03, P.cup.z]} intensity={track.cupSteam} count={60} lifetime={3.4} riseSpeed={0.4} drift={[0.04, 0, 0.0]} spread={0.22} size={0.24} opacity={0.17} />

      {/* labels */}
      <Label position={[P.powerBtn.x, P.powerBtn.y, P.powerBtn.z + 0.05]} text="Ein/Aus" sub="Thermoblock heizt vor" visible={track.labels.power} offset={[60, 260]} />
      <Label position={[-0.75, 1.9, -0.98]} text="Wassertank" sub="≈ 1,2 Liter" visible={track.labels.tank} offset={[60, 260]} />
      <Label position={[P.pump.x + 0.1, P.pump.y + 0.15, P.pump.z + 0.05]} text="Vibrationspumpe" sub="Kolben verlangsamt dargestellt" visible={track.labels.pump} offset={[-80, -320]} accent="#58c4ff" />
      <Label position={[P.gauge.x - 0.12, P.gauge.y + 0.12, P.gauge.z + 0.05]} text="Manometer" sub="≈ 9 bar Brühdruck" visible={track.labels.gauge} offset={[-150, 230]} />
      <Label position={[P.block.x - 0.12, P.block.y + 0.2, P.block.z]} text="Thermoblock" sub="Wasser fließt durch eine Heizspirale" visible={track.labels.block} offset={[120, 260]} accent="#ff7a3a" />
      <Label position={[-0.28, 1.9, 0.8]} text="Siebträger" sub="≈ 18 g Kaffeepulver" visible={track.labels.portafilter} offset={[170, 290]} accent="#c48a52" />
      <Label position={[0.2, 2.12, P.group.z]} text="Duschsieb" sub="verteilt das heiße Wasser" visible={track.labels.shower} offset={[-260, -70]} accent="#ff9a4a" />
      <Label position={[0.12, P.cupFullY, P.cup.z + 0.1]} text="Crema" sub="Öle & feine CO₂-Bläschen" visible={track.labels.crema} offset={[-200, 150]} accent="#c48a52" />
    </>
  );
}
