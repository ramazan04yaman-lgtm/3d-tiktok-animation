import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { useTime } from '../../engine/time';
import { showerTimeline } from './script';
import * as track from './script';

function Meters() {
  const t = useTime((s) => s.time);
  const w = track.hudWeeks(t);
  if (w > 0.001) {
    const weeks = Math.floor(track.weeks(t));
    return (
      <MeterHUD
        visible={w}
        value={String(weeks)}
        unit={weeks === 1 ? ' Woche' : ' Wochen'}
        fill={Math.max(track.kalk(t) * 0.35, track.bio(t))}
        color="#c27a7c"
        scale={['neu', '', '', '', 'verstopft']}
        meta={
          <>
            <div className={track.bio(t) > 0.05 ? 'mx-on' : 'mx-off'}>{track.bio(t) > 0.05 ? '● Biofilm wächst' : '○ Kalk lagert sich ab'}</div>
            <div>Zeitraffer</div>
          </>
        }
      />
    );
  }
  const s = track.hudStudy(t);
  const k = Math.min(1, Math.max(0, (t - 43.4) / 3.5));
  return (
    <MeterHUD
      visible={s}
      value={`${Math.max(1, Math.round(100 * k))}×`}
      unit=""
      fill={0.01 + 0.99 * k}
      color="#ff5a8c"
      scale={['Leitungswasser', '', '', '', 'Duschkopf']}
      meta={
        <>
          <div className="mx-on" style={{ color: '#ff5a8c' }}>Mykobakterien</div>
          <div>in manchen Duschköpfen</div>
        </>
      }
    />
  );
}

export function ShowerOverlay() {
  return (
    <>
      <SceneChip timeline={showerTimeline} hideBefore={6.5} />
      <IntroTitle title="Dein Duschkopf" outAt={3.6} />
      <Meters />
      <Captions timeline={showerTimeline} />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Bakterien & Tröpfchen stark vergrößert" />
    </>
  );
}
