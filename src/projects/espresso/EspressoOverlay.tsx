import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { thermalColor } from '../../engine/effects/heat';
import { envelope } from '../../engine/math';
import { useTime } from '../../engine/time';
import { ESPRESSO } from './physics';
import { espressoTimeline } from './script';
import * as track from './script';

function Meter() {
  const t = useTime((s) => s.time);
  const temp = track.followedTemp(t);
  const bar = track.pressure(t);
  const on = track.power(t) > 0;
  return (
    <MeterHUD
      visible={envelope(t, 7.8, 8.5, 54.2, 55.2)}
      value={temp.toFixed(0)}
      unit="°C"
      fill={(temp - 20) / 80}
      color={`#${thermalColor(temp).getHexString()}`}
      scale={['20', '40', '60', '80', '100 °C']}
      meta={
        <>
          <div className={on ? 'mx-on' : 'mx-off'}>{on ? `● ${ESPRESSO.heaterW} W` : '○ AUS'}</div>
          <div>◔ {bar.toFixed(1).replace('.', ',')} bar</div>
        </>
      }
    />
  );
}

export function EspressoOverlay() {
  return (
    <>
      <SceneChip timeline={espressoTimeline} hideBefore={5} />
      <IntroTitle title="Kaffeemaschine" />
      <Meter />
      <Captions timeline={espressoTimeline} skip={(t) => t < 5} />
      <Disclaimer text="Vereinfachte Visualisierung · Zeitraffer · Temperatur in Falschfarben" />
    </>
  );
}
