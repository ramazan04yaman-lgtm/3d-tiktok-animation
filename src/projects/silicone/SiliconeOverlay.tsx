import { EndCard, SeriesChip, SubscribeCTA, Verdict } from '../../engine/components/Overlay';
import { WordCaptions, type Word } from '../../engine/components/WordCaptions';
import { useTime } from '../../engine/time';
import { DURATION } from './script';
import * as track from './script';
import words from './words.json';

/** years passing on the new joint (reveal) */
function Years() {
  const t = useTime((s) => s.time);
  const v = track.years(t);
  if (v < 0.005) return null;
  const y = 2026 + Math.round(5 * track.aging(t));
  return (
    <div className="rg-verdict rg-good" style={{ background: '#1f8fff', opacity: v, top: 300 }}>
      📅 {y}
    </div>
  );
}

export function SiliconeOverlay() {
  return (
    <>
      <SeriesChip series="RICHTIG GEMACHT" title="Silikonfuge" />
      <Verdict kind="bad" text="Falsch gemacht" visible={track.verdictBad} />
      <Verdict kind="good" text="So geht’s richtig" visible={track.verdictGood} />
      <Years />
      <WordCaptions words={words as Word[]} highlight={['Schimmel', 'Silikon', 'drei', 'zwei', 'Rundschnur', 'Wartungsfuge', 'Alkohol', 'vierundzwanzig', 'lüften', 'falsch', 'richtig']} hide={(t) => t > DURATION - 1.4} />
      <SubscribeCTA at={track.T.cta[0]} duration={4.0} line="Mehr Tipps: richtig gemacht" />
      <EndCard at={DURATION - 1.4} title="Richtig gemacht" line="Folge für mehr Tipps 👆" />
    </>
  );
}
