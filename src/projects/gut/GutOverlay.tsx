import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip } from '../../engine/components/Overlay';
import { useTime } from '../../engine/time';
import { pocketR } from './gas';
import { gutTimeline } from './script';
import * as track from './script';

/** gas in the colon + what it consists of / what the sphincters do */
function Meter() {
  const t = useTime((s) => s.time);
  const fill = Math.min(1, (pocketR(0, t) / 0.13) ** 3 * 0.75 + 0.25 * (pocketR(1, t) / 0.09) ** 3);
  const T = track.T;
  let meta;
  if (t < T.smell[0]) {
    meta = (
      <>
        <div className={t > T.ferment[0] + 1 ? 'mx-on' : 'mx-off'}>{t > T.ferment[0] + 1 ? '● Fermentation läuft' : '○ Luft geschluckt'}</div>
        <div>≈ 0,5–1,5 l Gas pro Tag</div>
      </>
    );
  } else if (t < T.peristalsis[0]) {
    meta = (
      <>
        <div>&gt; 99 % geruchlos: N₂ · H₂ · CO₂ · CH₄</div>
        <div className="mx-on" style={{ color: '#ffd84a' }}>&lt; 1 % Schwefel → Geruch</div>
      </>
    );
  } else {
    const open = track.external(t) > 0.3;
    const sample = track.internal(t) > 0.3 && !open;
    meta = (
      <>
        <div className={open || sample ? 'mx-on' : 'mx-off'}>{open ? '● Schließmuskel offen' : sample ? '● Innerer Muskel prüft' : '○ Schließmuskel zu'}</div>
        <div>Gas wird Richtung Ausgang geschoben</div>
      </>
    );
  }
  return <MeterHUD visible={track.hud(t)} value="Gas" unit="" fill={fill} color="#7fd0ff" scale={['wenig', '', '', '', 'viel']} meta={meta} />;
}

export function GutOverlay() {
  return (
    <>
      <SceneChip timeline={gutTimeline} hideBefore={5} />
      <IntroTitle title="Darmgase" />
      <Meter />
      <Captions timeline={gutTimeline} skip={(t) => t < 5} />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Bakterien, Moleküle & Gasblasen stark vergrößert" />
    </>
  );
}
