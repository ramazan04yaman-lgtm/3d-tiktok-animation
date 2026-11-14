import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { useTime } from '../../engine/time';
import { BPM, isSystole, lvVolume } from './anatomy';
import { heartTimeline } from './script';
import * as track from './script';

/** Pulse + left-ventricular volume (rises in diastole, falls in systole). */
function Meter() {
  const t = useTime((s) => s.time);
  const vol = lvVolume(t);
  const sys = isSystole(t);
  return (
    <MeterHUD
      visible={track.hud(t)}
      value={String(BPM)}
      unit="/min"
      fill={(vol - 40) / 90}
      color="#ff5a4e"
      scale={['Linke Kammer', '50 ml', '', '', '120 ml']}
      meta={
        <>
          <div className={sys ? 'mx-on' : 'mx-off'}>{sys ? '● Systole · pumpt' : '○ Diastole · füllt'}</div>
          <div>≈ 70 ml pro Schlag</div>
        </>
      }
    />
  );
}

export function HeartOverlay() {
  return (
    <>
      <SceneChip timeline={heartTimeline} hideBefore={5} />
      <IntroTitle title="Das Herz" />
      <Meter />
      <Captions timeline={heartTimeline} skip={(t) => t < 5} />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Blau/Rot = sauerstoffarm/-reich (Farbcode)" />
    </>
  );
}
