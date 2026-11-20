import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { useTime } from '../../engine/time';
import { spoonTimeline } from './script';
import * as track from './script';

function Meter() {
  const t = useTime((s) => s.time);
  const c = track.cycles(t);
  return (
    <MeterHUD
      visible={track.hudDish(t)}
      value={String(c)}
      unit={c === 1 ? ' Spülgang' : ' Spülgänge'}
      fill={c / 5}
      color="#ff8a5a"
      scale={['', '', '', '', '5']}
      meta={
        <>
          <div className="mx-on" style={{ color: '#ff8a5a' }}>≈ 65 °C · nass → trocken</div>
          <div>quellen · schrumpfen · reißen</div>
        </>
      }
    />
  );
}

export function SpoonOverlay() {
  return (
    <>
      <SceneChip timeline={spoonTimeline} hideBefore={7.6} />
      <IntroTitle title="Dein Holzlöffel" outAt={3.4} />
      <Meter />
      <Captions timeline={spoonTimeline} />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Holz, Riss & Bakterien stark vergrößert" />
    </>
  );
}
