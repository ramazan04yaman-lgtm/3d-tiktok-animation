import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip, SubscribeCTA } from '../../engine/components/Overlay';
import { useTime } from '../../engine/time';
import { airconTimeline } from './script';
import * as track from './script';

function Meters() {
  const t = useTime((s) => s.time);
  const c = track.hudComp(t);
  if (c > 0.001) {
    const temp = track.compTemp(t);
    return <MeterHUD visible={c} value={String(Math.round(temp))} unit=" °C" fill={temp / 80} color="#ff6a3a" scale={['0', '', '', '', '80 °C']} meta={<><div className="mx-on" style={{ color: '#ff6a3a' }}>● Kompressor an</div><div>Gas nach dem Verdichten</div></>} />;
  }
  const v = track.hudValve(t);
  if (v > 0.001) {
    const temp = track.valveTemp(t);
    return <MeterHUD visible={v} value={String(Math.round(temp))} unit=" °C" fill={temp / 80} color="#3a9cff" scale={['0', '', '', '', '80 °C']} meta={<><div>Kältemittel</div><div>nach dem Ventil</div></>} />;
  }
  const h = track.humidity(t);
  return <MeterHUD visible={track.hudHum(t)} value={String(Math.round(h))} unit=" %" fill={h / 100} color="#7fd0ff" scale={['0', '', '', '', '100 %']} meta={<><div>Luftfeuchte</div><div>in der Druckerei</div></>} />;
}

export function AirconOverlay() {
  return (
    <>
      <SceneChip timeline={airconTimeline} hideBefore={track.T.loop[0]} />
      <IntroTitle title="Die Klimaanlage" outAt={3.6} />
      <Meters />
      <Captions timeline={airconTimeline} />
      <SubscribeCTA at={track.T.cta[0]} duration={4.8} line="Mehr Maschinen von innen" />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Teilchen stark vergrößert" />
    </>
  );
}
