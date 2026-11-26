import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip, SubscribeCTA } from '../../engine/components/Overlay';
import { envelope } from '../../engine/math';
import { useTime } from '../../engine/time';
import { brainTimeline } from './script';
import * as track from './script';

function Meters() {
  const t = useTime((s) => s.time);
  const w = envelope(t, 1.6, 2.2, 6.4, 7.0);
  if (w > 0.001) return <MeterHUD visible={w} value="20" unit=" W" fill={20 / 60} color="#ffc27a" scale={['0', '', '', '', '60 W']} meta={<><div className="mx-on" style={{ color: '#ffc27a' }}>● Gehirn</div><div>≈ 20 % deiner Energie</div></>} />;
  const s = track.speed(t);
  return <MeterHUD visible={track.hudSpeed(t)} value={String(Math.round(s))} unit=" km/h" fill={s / 450} color="#9fe0ff" scale={['0', '', '', '', '450']} meta={<><div className="mx-on">● Impuls</div><div>auf dem Axon</div></>} />;
}

export function BrainOverlay() {
  return (
    <>
      <SceneChip timeline={brainTimeline} hideBefore={track.T.neurons[0]} />
      <IntroTitle title="Das Gehirn" outAt={3.6} />
      <Meters />
      <Captions timeline={brainTimeline} />
      <SubscribeCTA at={track.T.cta[0]} duration={5.6} line="Mehr Maschinen von innen" />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Zellen und Moleküle stark vergrößert" />
    </>
  );
}
