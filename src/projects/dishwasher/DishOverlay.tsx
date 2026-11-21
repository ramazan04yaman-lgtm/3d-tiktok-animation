import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { useTime } from '../../engine/time';
import { dishTimeline } from './script';
import * as track from './script';

function Meters() {
  const t = useTime((s) => s.time);
  const w = track.hudWater(t);
  if (w > 0.001) {
    const l = track.litres(t);
    return <MeterHUD visible={w} value={l.toFixed(1).replace('.', ',')} unit=" l" fill={l / 12} color="#4fa3dc" scale={['0', '', '', '', '12 l']} meta={<><div className="mx-on">● Wasser läuft ein</div><div>über den Enthärter</div></>} />;
  }
  const temp = track.temperature(t);
  const dry = t > track.T.dry[0] - 0.5;
  return (
    <MeterHUD
      visible={track.hudTemp(t)}
      value={String(Math.round(temp))}
      unit=" °C"
      fill={(temp - 15) / 60}
      color="#ff7a3a"
      scale={['20', '', '', '', '70 °C']}
      meta={dry ? <><div className="mx-off">○ Heizung aus</div><div>Dampf kondensiert</div></> : <><div className="mx-on" style={{ color: '#ff7a3a' }}>● Heizung an</div><div>Fett löst sich besser</div></>}
    />
  );
}

export function DishOverlay() {
  return (
    <>
      <SceneChip timeline={dishTimeline} hideBefore={track.T.inlet[0]} />
      <IntroTitle title="Die Spülmaschine" outAt={3.6} />
      <Meters />
      <Captions timeline={dishTimeline} />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Moleküle & Ionen stark vergrößert" />
    </>
  );
}
