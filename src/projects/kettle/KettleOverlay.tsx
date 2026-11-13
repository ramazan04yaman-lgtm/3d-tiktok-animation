import { envelope, ramp } from '../../engine/math';
import { thermalColor } from '../../engine/effects/heat';
import { useTime } from '../../engine/time';
import { Captions, SceneChip, Disclaimer } from '../../engine/components/Overlay';
import { kettleTimeline } from './script';
import * as track from './script';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Horizontal HUD under the scene chip: temperature, bar, power, simulated real time. */
function Thermometer() {
  const t = useTime((s) => s.time);
  const vis = envelope(t, 7.3, 8.0, 58.2, 59.2);
  if (vis <= 0.001) return null;
  const temp = track.waterTemp(t);
  const sim = track.simSeconds(t);
  const fill = (temp - 20) / 80;
  const col = `#${thermalColor(temp).getHexString()}`;
  const on = track.power(t) > 0;
  return (
    <div className="kx-hud" style={{ opacity: vis, transform: `translateY(${(1 - vis) * -20}px)` }}>
      <div className="kx-temp" style={{ color: col }}>
        {temp.toFixed(0)}
        <span>°C</span>
      </div>
      <div className="kx-barwrap">
        <div className="kx-bar">
          <div className="kx-fill" style={{ width: `${Math.max(3, fill * 100)}%`, background: `linear-gradient(90deg, #1f4fff, ${col})` }} />
        </div>
        <div className="kx-scale">
          <span>20</span><span>40</span><span>60</span><span>80</span><span>100 °C</span>
        </div>
      </div>
      <div className="kx-meta">
        <div className={on ? 'kx-on' : 'kx-off'}>{on ? '● 2000 W' : '○ AUS'}</div>
        <div>⏱ {mmss(sim)} min</div>
      </div>
    </div>
  );
}

function IntroTitle() {
  const t = useTime((s) => s.time);
  const v = envelope(t, 0.3, 1.2, 4.2, 5.0);
  if (v <= 0.001) return null;
  return (
    <div className="kx-intro" style={{ opacity: v, transform: `translateY(${(1 - ramp(t, 0.3, 1.4)) * 30}px)` }}>
      <div className="kx-kicker">SO FUNKTIONIERT'S</div>
      <div className="kx-title">Wasserkocher</div>
    </div>
  );
}

export function KettleOverlay() {
  return (
    <>
      <style>{css}</style>
      <SceneChip timeline={kettleTimeline} hideBefore={5} />
      <IntroTitle />
      <Thermometer />
      <Captions timeline={kettleTimeline} skip={(t) => t < 5} />
      <Disclaimer text="Vereinfachte Visualisierung · Zeitraffer · Temperatur in Falschfarben" />
    </>
  );
}

const css = `
.kx-intro { position:absolute; top:250px; left:0; right:0; text-align:center; }
.kx-kicker { font: 700 34px Inter, sans-serif; letter-spacing: 8px; color:#58c4ff; }
.kx-title { font: 800 128px/1.05 Inter, sans-serif; color:#fff; letter-spacing:-3px; text-shadow: 0 6px 40px rgba(0,0,0,0.6); }
.kx-hud { position:absolute; left:56px; right:140px; top:262px; padding:16px 24px; border-radius:22px; background:rgba(8,12,18,0.7); border:2px solid rgba(255,255,255,0.12); display:flex; align-items:center; gap:24px; }
.kx-temp { font: 800 60px/1 Inter, sans-serif; font-variant-numeric: tabular-nums; width: 150px; }
.kx-temp span { font-size: 28px; margin-left: 2px; }
.kx-barwrap { flex: 1; }
.kx-bar { position:relative; height:18px; border-radius:9px; background:rgba(255,255,255,0.08); overflow:hidden; }
.kx-fill { position:absolute; left:0; top:0; bottom:0; border-radius:9px; box-shadow: 0 0 20px rgba(255,120,60,0.5); }
.kx-scale { display:flex; justify-content:space-between; margin-top:6px; font: 500 18px 'JetBrains Mono', monospace; color:#7d8a99; }
.kx-meta { font: 600 24px/1.45 Inter, sans-serif; color:#cfd8e3; text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap; }
.kx-on { color:#58c4ff; } .kx-off { color:#8899aa; }
`;
