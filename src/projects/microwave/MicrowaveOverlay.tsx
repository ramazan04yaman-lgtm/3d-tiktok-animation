import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { thermalColor } from '../../engine/effects/heat';
import { envelope } from '../../engine/math';
import { useTime } from '../../engine/time';
import { MW } from './physics';
import { microwaveTimeline } from './script';
import * as track from './script';

function Meter() {
  const t = useTime((s) => s.time);
  const temp = track.foodTemp(t);
  const on = track.power(t) > 0;
  return (
    <MeterHUD
      visible={envelope(t, 12.3, 13.0, 55.2, 56.2)}
      value={temp.toFixed(0)}
      unit="°C"
      fill={(temp - 20) / 80}
      color={`#${thermalColor(temp).getHexString()}`}
      scale={['20', '40', '60', '80', '100 °C']}
      meta={
        <>
          <div className={on ? 'mx-on' : 'mx-off'}>{on ? `● ${MW.powerW} W` : '○ AUS'}</div>
          <div>≈ {MW.frequencyGHz.toFixed(2).replace('.', ',')} GHz</div>
        </>
      }
    />
  );
}

export function MicrowaveOverlay() {
  return (
    <>
      <SceneChip timeline={microwaveTimeline} hideBefore={5} />
      <IntroTitle title="Mikrowelle" />
      <Meter />
      <Captions timeline={microwaveTimeline} skip={(t) => t < 5} />
      <Disclaimer text="Vereinfachte Visualisierung · Zeitraffer · Felder & Temperatur in Falschfarben" />
    </>
  );
}
