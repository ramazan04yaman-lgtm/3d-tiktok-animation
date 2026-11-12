/** Bedienfeld neben dem Video: Zahlen eingeben, Kamera wählen, Vorschau. */
import { type ApiState, type EntryForm, api } from '../api.ts';
import { SHOTS } from '../earth/camera.ts';
import { groupDE } from '../sim/format.ts';
import type { VisualMode } from '../sim/visualScale.ts';

export interface PanelCallbacks {
  onState(s: ApiState): void;
  onShot(name: string): void;
  onFreeCamera(on: boolean): void;
  onPreview(v: number | null): void;
  onVisualMode(m: VisualMode): void;
  onToggle(what: 'hud' | 'clouds' | 'people' | 'stats' | 'straw' | 'mascot', on: boolean): void;
  onPlay(folge: string): Promise<void>;
  onStop(): void;
}

export class Panel {
  private root: HTMLElement;
  private cb: PanelCallbacks;

  constructor(root: HTMLElement, cb: PanelCallbacks) {
    this.root = root;
    this.cb = cb;
    root.innerHTML = `
      <h2>📥 Neue TikTok-Zahlen</h2>
      <p class="hint">Zahlen bitte <b>selbst</b> aus der TikTok-App ablesen. Es besteht <b>keine</b> Live-Verbindung zu TikTok.</p>
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="mode" value="new" checked> Neu dazugekommen</label>
        <label><input type="radio" name="mode" value="totals"> Gesamtstand laut TikTok</label>
      </div>
      <form id="entry">
        <label>👥 Follower <input name="followers" inputmode="numeric" placeholder="0"></label>
        <label>❤️ Likes <input name="likes" inputmode="numeric" placeholder="0"></label>
        <label>💬 Kommentare <input name="comments" inputmode="numeric" placeholder="0"></label>
        <label>🔁 Shares <input name="shares" inputmode="numeric" placeholder="0"></label>
        <label>📅 Datum <input name="day" type="date"></label>
        <label>🏷️ Referenz (optional) <input name="ref" placeholder="z. B. video-07"></label>
        <button type="submit">Eintragen & speichern</button>
      </form>
      <div id="msg" class="msg"></div>

      <h2>🎞️ Folge abspielen (Vorschau)</h2>
      <p class="hint">Spielt ein Drehbuch aus dem Ordner <b>folgen/</b> mit deinen echten Zahlen ab – ohne Ton.
      Das fertige Video (mit Stimme) erzeugt <code>npm run video</code>.</p>
      <div class="row"><select id="folge"></select><button id="play">▶ Abspielen</button><button id="stop">■</button></div>

      <h2>🎬 Kamera</h2>
      <div class="shots">${Object.entries(SHOTS).map(([k, s]) => `<button data-shot="${k}">${s.label}</button>`).join('')}
        <button data-free="1">🖱️ Freie Kamera (Maus)</button></div>

      <h2>👁️ Darstellung</h2>
      <label class="row">Skalierung
        <select id="vmode">
          <option value="log">Verstärkt (logarithmisch) – empfohlen</option>
          <option value="boost">Verstärkt (linear ×10¹²)</option>
          <option value="real">Echt (unverstärkt, kaum sichtbar)</option>
        </select></label>
      <label class="row">Vorschau Austrocknung <input id="preview" type="range" min="0" max="1000" value="0"></label>
      <div class="row"><button id="previewOff">Vorschau aus (echter Stand)</button> <span id="pv"></span></div>
      <label class="row"><input type="checkbox" id="hud" checked> HUD</label>
      <label class="row"><input type="checkbox" id="clouds" checked> Wolken</label>
      <label class="row"><input type="checkbox" id="people" checked> Menschen</label>
      <label class="row"><input type="checkbox" id="stats" checked> Detail-Statistik im Bild</label>
      <label class="row"><input type="checkbox" id="straw"> Riesen-Strohhalm</label>
      <label class="row"><input type="checkbox" id="mascot"> Kapitän Durst</label>

      <h2>📒 Logbuch</h2>
      <div id="log" class="log"></div>`;

    const form = root.querySelector<HTMLFormElement>('#entry')!;
    form.addEventListener('submit', (ev) => { ev.preventDefault(); void this.submit(form); });
    root.querySelectorAll<HTMLButtonElement>('[data-shot]').forEach((b) => b.addEventListener('click', () => cb.onShot(b.dataset.shot!)));
    root.querySelector('[data-free]')!.addEventListener('click', () => cb.onFreeCamera(true));
    const prev = root.querySelector<HTMLInputElement>('#preview')!;
    const pv = root.querySelector<HTMLElement>('#pv')!;
    prev.addEventListener('input', () => { const v = Number(prev.value) / 1000; pv.textContent = `${(v * 100).toFixed(1)} % ausgetrocknet`; cb.onPreview(v); });
    root.querySelector('#previewOff')!.addEventListener('click', () => { prev.value = '0'; pv.textContent = ''; cb.onPreview(null); });
    root.querySelector<HTMLSelectElement>('#vmode')!.addEventListener('change', (e) => cb.onVisualMode((e.target as HTMLSelectElement).value as VisualMode));
    for (const k of ['hud', 'clouds', 'people', 'stats', 'straw', 'mascot'] as const) {
      root.querySelector<HTMLInputElement>('#' + k)!.addEventListener('change', (e) => cb.onToggle(k, (e.target as HTMLInputElement).checked));
    }
    root.querySelector('#play')!.addEventListener('click', () => void this.play(root.querySelector<HTMLSelectElement>('#folge')!.value));
    root.querySelector('#stop')!.addEventListener('click', () => cb.onStop());
    root.querySelector('#log')!.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).dataset.del;
      if (id && confirm('Diesen Eintrag wirklich löschen? Der Stand wird neu berechnet.')) void this.run(() => api.remove(id), 'Eintrag gelöscht.');
    });
  }

  private msg(text: string, kind: 'ok' | 'err' | 'warn' = 'ok'): void {
    const m = this.root.querySelector<HTMLElement>('#msg')!;
    m.textContent = text;
    m.className = 'msg ' + kind;
  }

  private async run(fn: () => Promise<ApiState>, okText: string): Promise<void> {
    try {
      const s = await fn();
      this.setState(s);
      this.cb.onState(s);
      this.msg(s.warnings?.length ? okText + ' ⚠️ ' + s.warnings.join(' ') : okText, s.warnings?.length ? 'warn' : 'ok');
    } catch (e) {
      this.msg('❌ ' + (e as Error).message, 'err');
    }
  }

  private async submit(form: HTMLFormElement): Promise<void> {
    const fd = new FormData(form);
    const num = (k: string) => {
      const raw = String(fd.get(k) ?? '').replace(/[.\s_]/g, '');
      if (raw === '') return undefined;
      const n = Number(raw);
      if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Ungültige Zahl bei ${k}`);
      return n;
    };
    try {
      const mode = (this.root.querySelector<HTMLInputElement>('input[name=mode]:checked')!.value) as EntryForm['mode'];
      const f: EntryForm = {
        mode, followers: num('followers'), likes: num('likes'), comments: num('comments'), shares: num('shares'),
        day: String(fd.get('day') || '') || undefined, ref: String(fd.get('ref') || '') || undefined,
      };
      if ([f.followers, f.likes, f.comments, f.shares].every((v) => v === undefined)) throw new Error('Bitte mindestens eine Zahl eingeben.');
      await this.run(() => api.add(f), '✅ Gespeichert.');
      form.reset();
    } catch (e) {
      this.msg('❌ ' + (e as Error).message, 'err');
    }
  }

  setFolgen(list: string[]): void {
    this.root.querySelector<HTMLSelectElement>('#folge')!.innerHTML = list.map((f) => `<option>${f}</option>`).join('');
  }

  async play(folge: string): Promise<void> {
    if (!folge) return this.msg('Keine Folge gefunden (Ordner folgen/).', 'warn');
    try { await this.cb.onPlay(folge); this.msg('▶ ' + folge); } catch (e) { this.msg('❌ ' + (e as Error).message, 'err'); }
  }

  setState(s: ApiState): void {
    const day = this.root.querySelector<HTMLInputElement>('input[name=day]')!;
    day.max = s.today; day.min = s.startDay;
    if (!day.value) day.placeholder = s.today;
    const log = this.root.querySelector<HTMLElement>('#log')!;
    const rows = [...s.entries].reverse().map((e) => `<div class="entry"><span>${e.day}${e.ref ? ' · ' + e.ref : ''}</span>
      <span>+${groupDE(e.followers)} 👥 +${groupDE(e.likes)} ❤️ +${groupDE(e.comments)} 💬 +${groupDE(e.shares)} 🔁</span>
      <button data-del="${e.id}" title="Löschen">✕</button></div>`);
    log.innerHTML = rows.length ? rows.join('') : '<p class="hint">Noch keine Einträge. Start der Simulation: ' + s.startDay + '</p>';
  }

  offline(reason: string): void {
    this.msg('⚠️ Kein Speicher-Server erreichbar (' + reason + '). Starte die App mit „npm run dev“, um Zahlen einzugeben.', 'warn');
    this.root.querySelector<HTMLButtonElement>('#entry button')!.disabled = true;
  }
}
