import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { useTime } from '../../engine/time';
import { papercutTimeline } from './script';
import * as track from './script';

/** pressure at the edge: 1 N on 1 cm × 0.065 mm ≈ 1.5 N/mm² ≈ 15 bar (flat finger: ≈ 0.1 bar) */
function Meter() {
  const t = useTime((s) => s.time);
  const p = track.press(t);
  const bar = Math.round(15 * Math.min(1, p));
  return (
    <MeterHUD
      visible={track.hud(t)}
      value={`${bar}`}
      unit=" bar"
      fill={Math.min(1, p)}
      color="#ffb04a"
      scale={['0', '', '', '', '15 bar']}
      meta={
        <>
          <div>1 Newton auf der Papierkante</div>
          <div className="mx-on" style={{ color: '#ffb04a' }}>≈ 150× mehr als flach</div>
        </>
      }
    />
  );
}

export function PapercutOverlay() {
  return (
    <>
      <SceneChip timeline={papercutTimeline} hideBefore={7.6} />
      <IntroTitle title="Papierschnitt" outAt={3.6} />
      <Meter />
      <Captions timeline={papercutTimeline} />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Fasern & Hautschichten stark vergrößert" />
    </>
  );
}
