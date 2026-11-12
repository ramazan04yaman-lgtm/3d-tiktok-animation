/**
 * HUD = Anzeige über der Erde. Stil wie in den Vorbild-Videos:
 * kleine weiße Leiste oben (Einwohner + Wasser), Bild bleibt frei.
 * Die ausführliche Statistik-Karte kann zusätzlich eingeblendet werden.
 */
import { ML_PER_LITER } from '../sim/config.ts';
import { formatDuration, formatLiters, groupDE, percentExact, sci } from '../sim/format.ts';
import type { Snapshot } from '../sim/snapshot.ts';

export interface HudExtra { visualDrain: number; seaLevel: number; perFigure: number; preview: boolean; mode: string; demo?: boolean }

const B = (s: string) => BigInt(s);

export function statistikHTML(): string {
  return `
    <div class="stat-card">
      <div class="stat-row"><span>🌍 Startvorrat (≈)</span><b data-k="total"></b></div>
      <div class="stat-row"><span>💧 Noch übrig</span><b data-k="remaining"></b></div>
      <div class="stat-row"><span>🚰 Schon ausgetrunken</span><b data-k="consumed"></b></div>
      <div class="stat-row"><span>🥤 Verbrauch pro Tag</span><b data-k="daily"></b></div>
      <div class="stat-row"><span>👥 Einwohner</span><b data-k="pop2"></b></div>
      <div class="stat-row"><span>❤️ durch Likes</span><b data-k="likes"></b></div>
      <div class="stat-row"><span>💬 durch Kommentare</span><b data-k="comments"></b></div>
      <div class="stat-row"><span>🔁 durch Shares</span><b data-k="shares"></b></div>
      <div class="stat-row eta"><span>⏳ Leer in</span><b data-k="eta"></b></div>
    </div>`;
}

export class Hud {
  private root: HTMLElement;
  /** Detail-Statistik dauerhaft zeigen (Studio). Im Video steuert das Drehbuch. */
  showStats = true;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div class="hud-bar">
        <div class="tag-live"><i></i>EXPERIMENT</div>
        <div class="hud-bar-text"><small>WASSER DER ERDE</small><span>EINWOHNER: <b data-k="pop">0</b></span></div>
        <div class="hud-house">🏠</div>
      </div>
      <div class="hud-water"><small>WASSER ÜBRIG</small><b data-k="pct">100 %</b><div class="bar"><i data-k="bar"></i></div></div>
      <div class="hud-stats" data-k="stats">${statistikHTML()}</div>
      <div class="hud-preview" data-k="preview">VORSCHAU – NICHT DER ECHTE STAND</div>
      <div class="hud-foot" data-k="foot"></div>`;
  }

  private setAll(k: string, v: string): void {
    document.querySelectorAll<HTMLElement>(`[data-k="${k}"]`).forEach((el) => { if (el.textContent !== v) el.textContent = v; });
  }

  update(s: Snapshot, x: HudExtra): void {
    const total = B(s.totalWaterMl), rem = B(s.remainingMl);
    this.setAll('pop', groupDE(B(s.population)));
    this.setAll('pop2', groupDE(B(s.population)));
    this.setAll('pct', percentExact(rem, total, 13) + ' %');
    this.setAll('total', sci(total / ML_PER_LITER) + ' L');
    this.setAll('remaining', formatLiters(rem));
    this.setAll('daily', formatLiters(B(s.dailyMl)));
    this.setAll('consumed', formatLiters(B(s.totalConsumedMl)));
    this.setAll('likes', formatLiters(B(s.consumedMl.likes)));
    this.setAll('comments', formatLiters(B(s.consumedMl.comments)));
    this.setAll('shares', formatLiters(B(s.consumedMl.shares)));
    this.setAll('eta', formatDuration(s.daysUntilEmpty === null ? null : B(s.daysUntilEmpty)));
    const bar = this.root.querySelector<HTMLElement>('[data-k="bar"]');
    if (bar) bar.style.width = `${Math.max(0.5, (1 - x.visualDrain) * 100)}%`;
    const fig = x.perFigure > 1 ? ` · 1 Figur ≈ ${groupDE(x.perFigure)} Menschen` : '';
    this.setAll('foot', (x.demo ? 'PROBEVIDEO MIT BEISPIELZAHLEN · ' : '') +
      `Grafik ${x.mode === 'real' ? 'unverstärkt' : 'verstärkt'}, Zahlen exakt · Wassermenge ≈ Näherungswert${fig}`);
    this.root.querySelector<HTMLElement>('[data-k="preview"]')!.style.display = x.preview ? 'block' : 'none';
    this.root.querySelector<HTMLElement>('[data-k="stats"]')!.style.display = this.showStats ? '' : 'none';
  }
}
