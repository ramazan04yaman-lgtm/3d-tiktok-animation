import { useMemo } from 'react';
import * as THREE from 'three';
import { Label } from '../../engine/components/Label';
import { Studio } from '../../engine/components/Studio';
import { Explode } from '../../engine/components/Explode';
import { Bubbles } from '../../engine/effects/Bubbles';
import { FlowParticles } from '../../engine/effects/FlowParticles';
import { HeatRings } from '../../engine/effects/HeatRings';
import { Steam } from '../../engine/effects/Steam';
import { thermalColor } from '../../engine/effects/heat';
import { DIM, convectionLoop, currentLoopCurve, glassRadius, steamDuctCurve } from './geometry';
import { KettleModel } from './KettleModel';
import * as track from './script';

export function KettleScene() {
  const curves = useMemo(
    () => ({
      current: currentLoopCurve(),
      convection: [0.4, 0.4 + Math.PI / 2, 0.4 + Math.PI, 0.4 + (3 * Math.PI) / 2].map(convectionLoop),
    }),
    [],
  );
  const convColor = useMemo(
    () => (_t: number, u: number, out: THREE.Color) => thermalColor(60 + 40 * Math.sin(u * Math.PI * 2 + 0.6), 20, 100, out),
    [],
  );

  return (
    <>
      <Studio />
      <KettleModel />

      {/* Effects that live inside the kettle body move with the exploded view */}
      <Explode offset={[0, 0.95, 0]} amount={track.explode}>
        <FlowParticles curve={curves.current} intensity={(t) => track.current(t) * track.cut(t)} count={60} speed={0.9} size={0.016} color="#ffe27a" glow={2.5} stretch={2} />
        <HeatRings position={[0, DIM.plateTop + 0.02, 0]} intensity={track.heatRings} radius={[0.3, 0.72]} rise={0.35} />
        {curves.convection.map((c, i) => (
          <FlowParticles key={i} curve={c} intensity={track.convection} count={16} speed={0.32} size={0.011} color={convColor} glow={1.6} stretch={5} closed />
        ))}
        <Bubbles
          floorY={DIM.plateTop}
          surfaceY={DIM.waterTop}
          radius={glassRadius(0.55) - 0.08}
          intensity={track.bubbleIntensity}
          reach={track.bubbleReach}
          count={360}
        />
        <FlowParticles curve={steamDuctCurve} intensity={track.ductFlow} count={30} speed={0.55} size={0.014} color="#fff2e0" glow={1.3} stretch={2.5} />

        {/* Labels */}
        <Label position={[-1.21, 0.5, 0.08]} text="Ein/Aus-Schalter" sub="schließt den Stromkreis" visible={track.labels.switch} offset={[90, 230]} />
        <Label position={[0.78, 1.2, 0.15]} text="Glaskörper" sub="hitzebeständiges Borosilikat" visible={track.labels.glass} offset={[-60, -230]} />
        <Label position={[-1.3, 1.55, 0]} text="Dampfkanal" sub="im Griff" visible={track.labels.duct} offset={[60, 330]} accent="#ffd36a" />
        <Label position={[0.15, DIM.element.y - 0.02, 0.47]} text="Heizelement" sub="Rohrheizkörper ≈ 2000 W" visible={track.labels.element} offset={[150, 210]} accent="#ff7a3a" />
        <Label position={[-0.45, DIM.plateTop, 0.55]} text="Bodenplatte" sub="Edelstahl – leitet Wärme ins Wasser" visible={track.labels.plate} offset={[-40, -230]} accent="#ffb36a" />
        <Label position={[0, 0.17, 0.12]} text="Kontakt" sub="360°-Steckverbindung" visible={track.labels.contact} offset={[-170, 160]} />
        <Label position={[-1.25, 1.45, 0]} text="Dampfkanal" sub="führt Dampf zum Schalter" visible={track.labels.steamDuct} offset={[60, -240]} accent="#ffd36a" />
        <Label position={[DIM.bimetal.x, DIM.bimetal.y + 0.03, 0.06]} text="Bimetallscheibe" sub="springt bei ≈ 100 °C Dampf um" visible={track.labels.bimetal} offset={[-60, -380]} accent="#ff9a4a" />
      </Explode>

      <Steam origin={[DIM.spoutTip.x, DIM.spoutTip.y, 0]} intensity={track.steam} count={150} lifetime={3.4} riseSpeed={0.8} drift={[0.18, 0, 0.02]} spread={0.3} size={0.5} opacity={0.42} />
      <Steam origin={[0.0, 2.33, 0]} intensity={(t) => track.steam(t) * 0.35} count={60} lifetime={2.6} riseSpeed={0.55} drift={[0.05, 0, 0]} spread={0.4} size={0.4} opacity={0.25} />
    </>
  );
}
