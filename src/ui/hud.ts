/**
 * HUD = die Anzeige über der Erde (im 9:16-Bild, wird im Video mit aufgenommen).
 * Stil angelehnt an deine Beispielvideos: weiße, runde Boxen, fette Schrift.
 */
import { ML_PER_LITER } from '../sim/config.ts';
import { formatDuration, formatLiters, groupDE, percentExact, sci } from '../sim/format.ts';
import type { Snapshot } from '../sim/snapshot.ts';

export interface HudExtra { visualDrain: number; seaLevel: number; perFigure: number; preview: boolean; mode: string }

const B = (s: string) => BigInt(s);

export class Hud {
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div class="hud-top">
        <div class="pill title"><span class="drop">💧</span><div><b>KÖNNEN WIR DAS GANZE</b><b class="accent">WASSER DER ERDE</b><b>AUSTRINKEN?</b></div></div>
        <div class="pill day"><small>TAG</small><b data-k="day">1</b></div>
      </div>
      <div class="hud-remaining pill">
        <small>NOCH ÜBRIG</small>
        <b data-k="pct">100 %</b>
        <div class="bar"><i data-k="bar"></i></div>
        <small class="mono" data-k="remaining"></small>
      </div>
      <div class="hud-preview" data-k="preview">VORSCHAU – NICHT DER ECHTE STAND</div>
      <div class="hud-bottom">
        <div class="grid">
          <div class="card"><small>👥 EINWOHNER</small><b data-k="pop">0</b></div>
          <div class="card"><small>🥤 PRO TAG</small><b data-k="daily">0 L</b></div>
          <div class="card wide"><small>🚰 SCHON AUSGETRUNKEN</small><b data-k="consumed">0 L</b></div>
          <div class="card mini"><small>❤️ LIKES</small><b data-k="likes">0 L</b></div>
          <div class="card mini"><small>💬 KOMMENTARE</small><b data-k="comments">0 L</b></div>
          <div class="card mini"><small>🔁 SHARES</small><b data-k="shares">0 L</b></div>
        </div>
        <div class="pill eta"><small>⏳ BEI DIESEM TEMPO IST DAS WASSER LEER IN</small><b data-k="eta">∞</b></div>
        <div class="foot" data-k="foot"></div>
      </div>`;
  }

  private set(k: string, v: string): void {
    const el = this.root.querySelector<HTMLElement>(`[data-k="${k}"]`);
    if (el && el.textContent !== v) el.textContent = v;
  }

  update(s: Snapshot, x: HudExtra): void {
    const total = B(s.totalWaterMl), rem = B(s.remainingMl);
    this.set('day', groupDE(Math.max(1, s.daysProcessed)));
    this.set('pct', percentExact(rem, total, 14) + ' %');
    this.set('remaining', formatLiters(rem) + '  von ≈ ' + sci(total / ML_PER_LITER) + ' L');
    this.set('pop', groupDE(B(s.population)));
    this.set('daily', formatLiters(B(s.dailyMl)));
    this.set('consumed', formatLiters(B(s.totalConsumedMl)));
    this.set('likes', formatLiters(B(s.consumedMl.likes)));
    this.set('comments', formatLiters(B(s.consumedMl.comments)));
    this.set('shares', formatLiters(B(s.consumedMl.shares)));
    this.set('eta', formatDuration(s.daysUntilEmpty === null ? null : B(s.daysUntilEmpty)));
    const bar = this.root.querySelector<HTMLElement>('[data-k="bar"]');
    if (bar) bar.style.width = `${(1 - x.visualDrain) * 100}%`;
    const fig = x.perFigure > 1 ? ` · 1 Figur ≈ ${groupDE(x.perFigure)} Menschen` : '';
    this.set('foot', `Meeresspiegel (Darstellung): ${Math.round(x.seaLevel).toLocaleString('de-DE')} m · ` +
      `Grafik ${x.mode === 'real' ? 'unverstärkt' : 'verstärkt'}, Zahlen exakt · Startvorrat ≈ Näherungswert${fig}`);
    this.root.querySelector<HTMLElement>('[data-k="preview"]')!.style.display = x.preview ? 'block' : 'none';
  }
}
