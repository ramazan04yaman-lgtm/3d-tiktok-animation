/**
 * Spielt eine Zeitleiste ab: setzt für jeden Zeitpunkt t Kamera, Wasser,
 * Figur, Untertitel und Sticker. Alles hängt nur von t ab -> jedes Bild
 * ist reproduzierbar (wichtig für die Video-Aufnahme).
 */
import * as THREE from 'three';
import type { EarthScene } from '../earth/scene.ts';
import { People } from '../earth/people.ts';
import { latLonToVec3 } from '../earth/geo.ts';
import { SHOTS } from '../earth/camera.ts';
import { formatLiters, formatMenge, groupDE, mlToLitersExact, percentExact } from '../sim/format.ts';
import type { Snapshot } from '../sim/snapshot.ts';
import { naechsteText, parseWords } from './script.ts';
import { statistikHTML } from '../ui/hud.ts';
import type { Sticker, Timeline, TimelineBeat } from './types.ts';

const easeOutBack = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function parseNum(v: string | number | undefined): number {
  if (v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export class StoryPlayer {
  private beatIndex = -1;
  private namenEl!: HTMLElement;
  private namenSchilder: HTMLElement[] = [];
  /** Gleiche Sticker in aufeinanderfolgenden Sätzen bleiben einfach stehen (kein erneutes Einblenden). */
  private stickerKey = '';
  private stickerStart = 0;
  private layer: HTMLElement;
  private captionEl: HTMLElement;
  private stickerEl: HTMLElement;
  private timeline: Timeline;
  private scene: EarthScene;
  private realDrain: () => number;
  private dayLabel: () => string;
  private snapshot: Snapshot;

  constructor(timeline: Timeline, scene: EarthScene, layer: HTMLElement, realDrain: () => number, dayLabel: () => string, snapshot: Snapshot) {
    this.timeline = timeline; this.scene = scene; this.layer = layer; this.snapshot = snapshot;
    this.realDrain = realDrain; this.dayLabel = dayLabel;
    layer.innerHTML = '<div class="namen"></div><div class="stickers"></div><div class="caption"></div>';
    this.namenEl = layer.querySelector('.namen')!;
    if (timeline.ankunft) scene.updateNeueShot(timeline.ankunft.von, timeline.ankunft.bis);
    document.body.classList.toggle('kompakt', timeline.anzeige === 'kompakt');
    scene.people.stil = timeline.figuren ?? 'menschen';
    this.stickerEl = layer.querySelector('.stickers')!;
    this.captionEl = layer.querySelector('.caption')!;
  }

  get dauer(): number { return this.timeline.dauer; }

  private beatAt(t: number): number {
    const b = this.timeline.beats;
    for (let i = 0; i < b.length; i++) if (t < b[i].end) return i;
    return b.length - 1;
  }

  /** Muss VOR scene.render(t) aufgerufen werden. */
  apply(t: number): void {
    const i = this.beatAt(t);
    const beat = this.timeline.beats[i];
    if (i !== this.beatIndex) {
      this.beatIndex = i;
      const shot = beat.kamera;
      // Vorschau mit mehr Menschen (oder zurück zur echten Einwohnerzahl)
      this.scene.people.setPopulation(BigInt(beat.vorschauEinwohner ?? this.snapshot.population));
      if (shot === 'gruppe') this.scene.updateGroupShot();
      if (shot === 'namen' && SHOTS.namen) {
        // Kamerafahrt durch die Reihen dauert genau so lange wie die Sätze mit dieser Kamera
        let ende = beat.end;
        for (let j = i + 1; j < this.timeline.beats.length && this.timeline.beats[j].kamera === 'namen'; j++) ende = this.timeline.beats[j].end;
        SHOTS.namen.pathSeconds = Math.max(3, ende - beat.start - (beat.uebergang || 0) * 0.5);
      }
      this.scene.setFreeCamera(false);
      this.scene.director.setShot(shot, beat.start, beat.uebergang > 0 ? beat.uebergang : 0.0001);
      const key = JSON.stringify(beat.sticker);
      if (key !== this.stickerKey || !beat.sticker.length) {
        this.stickerKey = key; this.stickerStart = beat.start;
        this.stickerEl.innerHTML = beat.sticker.map((s, k) => this.stickerHTML(s, k)).join('');
      }
    }
    const local = t - beat.start;
    document.body.classList.toggle('hud-aus', !!beat.anzeigeAus);
    // Ankunft der neuen Einwohner (vorher unsichtbar)
    const an = this.timeline.ankunft;
    this.scene.people.ankunft = an ? { von: an.von, bis: an.bis, abstand: an.abstand, t: t - an.start } : null;
    // Wasserstand
    const val = (v: number | 'jetzt') => (v === 'jetzt' ? this.realDrain() : v);
    const k = easeInOut(clamp01(local / Math.max(0.5, beat.end - beat.start - 0.2)));
    const drain = val(beat.wasser.von) + (val(beat.wasser.bis) - val(beat.wasser.von)) * k;
    this.scene.drainTarget = this.scene.drainShown = drain;
    // Vorschau nur, wenn ein ANDERER als der echte Stand gezeigt wird (Zeitraffer 0 -> heute ist echt)
    // 0 = Starttag des Experiments (echter früherer Zustand, z. B. für Vorher/Nachher)
    const echt = (v: number | 'jetzt') => v === 'jetzt' || v === 0;
    this.scene.previewActive = !echt(beat.wasser.bis) || !echt(beat.wasser.von) || !!beat.vorschauEinwohner;
    // Figur + Strohhalm
    this.scene.mascotVisible = beat.kamera === 'kapitaen';
    this.scene.mascot.talking = t >= beat.sprechen.start && t <= beat.sprechen.end;
    this.scene.mascot.waving = beat.aktion === 'winken';
    this.scene.mascot.drinking = beat.aktion === 'trinken';
    this.scene.strawVisible = beat.strohhalm;
    this.animateStickers(beat, t - this.stickerStart);
    this.updateCaption(t);
  }

  private updateCaption(t: number): void {
    const c = this.timeline.captions.find((c) => t >= c.start && t < c.end);
    if (!c) { this.captionEl.innerHTML = ''; return; }
    const html = c.words.map((w) => `<span class="${w.farbe ?? ''}">${esc(w.text.toUpperCase())}</span>`).join(' ');
    if (this.captionEl.dataset.key !== String(c.start)) {
      this.captionEl.innerHTML = html; this.captionEl.dataset.key = String(c.start);
      // Lange Wörter (z. B. "VIERHUNDERTFÜNFZIGTAUSEND") automatisch verkleinern -> nie abgeschnitten
      const len = c.words.map((w) => w.text).join(' ').length;
      const longest = Math.max(...c.words.map((w) => w.text.length));
      this.captionEl.style.fontSize = `${Math.min(3.7, 64 / len, 52 / Math.max(1, longest))}cqh`;
    }
    const s = easeOutBack(clamp01((t - c.start) / 0.14));
    this.captionEl.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * s})`;
  }

  private stickerHTML(s: Sticker, k: number): string {
    const id = `data-i="${k}"`;
    switch (s.typ) {
      case 'tag': return `<div class="st st-tag" ${id}>TAG ${esc(this.dayLabel())}</div>`;
      case 'schild': return `<div class="st st-schild ${s.farbe ?? 'weissrot'}" ${id} style="top:${(s.y ?? 30) + 8}%" data-rot="${s.drehung ?? -4}">${esc(s.text)}</div>`;
      case 'zahl': return `<div class="st st-zahl ${s.farbe ?? 'gruen'}" ${id}><div class="lbl">${esc(s.label)}</div><div class="num" data-num="1">0</div></div>`;
      case 'info': return `<div class="st st-info" ${id} style="top:${(s.y ?? 30) + 8}%">${s.zeilen.map((z) => `<div>${esc(z)}</div>`).join('')}</div>`;
      case 'zeiger': return `<div class="st st-zeiger" ${id}><div class="box">${esc(s.text)}</div><div class="arrow"></div></div>`;
      case 'namensschild': return `<div class="st st-name" ${id}><div class="ico">💧</div><div><b>${esc(s.name)}</b><small>${esc(s.titel)}</small></div></div>`;
      case 'profil': return `<div class="st st-profil" ${id}><div class="ava">💧</div><div class="pname">${esc(this.timeline.konto)}</div>
        <div class="pstats"><div><b data-k="follower-n">0</b><small>Follower</small></div></div>
        <div class="pbtn">Folgen</div><div class="prule">1 Follower = 1 Mensch 🌍</div></div>`;
      case 'statistik': return `<div class="st st-stats" ${id}>${statistikHTML()}</div>`;
      case 'titel': return `<div class="st st-titel" ${id}>${s.zeilen.map((z, i) => `<div class="tz" data-z="${i}" style="font-size:${
        Math.min(4.4, 70 / Math.max(1, parseWords(z).map((w) => w.text).join(' ').length))}cqh">${
        parseWords(z).map((w) => `<span class="${w.farbe ?? ''}">${esc(w.text.toUpperCase())}</span>`).join(' ')}</div>`).join('')}</div>`;
      case 'szenario': return `<div class="st st-szenario" ${id}><div class="sz-kopf">WAS WÄRE, WENN …</div>${
        (s.zeilen ?? []).map((z, i) => `<div class="sz-z sz-${i}">${esc(z)}</div>`).join('')}</div>`;
      case 'zahlen': return this.zahlenHTML(id);
      case 'stufen': return this.stufenHTML(id);
      case 'ergebnis': return `<div class="st st-ergebnis" ${id}><div class="eg-kopf">${esc(s.titel ?? '📊 ERGEBNIS AUS VIDEO 1')}</div>${
        (s.zeilen ?? []).map((z) => `<div class="eg-z${z.leise ? ' leise' : ''}"><span class="eg-i">${z.ico}</span><span class="eg-l">${esc(z.label)}</span><b class="eg-n">${esc(z.anzahl)}</b><span class="eg-m">${esc(z.menge)}</span></div>`).join('')}
        <div class="eg-sum"><span>💧 EXTRA-VERBRAUCH</span><b>${esc(s.summe ?? '')}</b></div></div>`;
    }
  }

  private stufenHTML(id: string): string {
    const s = this.snapshot, B = (x: string) => BigInt(x), st = s.stufe;
    const n0 = s.naechste[0];
    const fehlt = B(n0.follower) - B(s.followers);
    const zeile = (ico: string, lbl: string, val: string, stufe: string) =>
      `<div class="sf-z"><span>${ico} ${lbl}</span><b>${esc(val)}</b><i>Stufe ${esc(stufe)}</i></div>`;
    return `<div class="st st-stufen" ${id}>
      <div class="sf-kopf">⚡ SO VIEL KOSTET ES JETZT<br><small>BEI ${groupDE(B(s.followers))} FOLLOWERN</small></div>
      ${zeile('🥤', 'Pro Einwohner/Tag', formatMenge(B(st.trinkMl)), st.meilensteine.trinken)}
      ${zeile('❤️', 'Pro Like', formatMenge(B(st.likeMl)), st.meilensteine.like)}
      ${zeile('💬', 'Pro Kommentar', formatMenge(B(st.kommentarMl)), st.meilensteine.kommentar)}
      ${zeile('🔁', 'Pro Share', formatMenge(B(st.shareMl)), st.meilensteine.share)}
      <div class="sf-next"><small>🎯 NÄCHSTER MEILENSTEIN</small><b>${groupDE(B(n0.follower))} FOLLOWER</b>
        <span>noch ${groupDE(fehlt)} · dann ${esc(naechsteText(n0))}</span></div>
      <div class="sf-weg">${s.naechste.slice(1).map((n) => `<div>${groupDE(B(n.follower))} → ${esc(naechsteText(n))}</div>`).join('')}
        <div class="sf-max">🥤 ×2 je 1.000 Follower bis 10.000, danach je 10.000</div></div>
    </div>`;
  }

  private zahlenHTML(id: string): string {
    const s = this.snapshot, B = (x: string) => BigInt(x);
    const kachel = (ico: string, lbl: string, val: string, cls = '', anim?: string) =>
      `<div class="zk ${cls}"><small>${ico} ${lbl}</small><b ${anim ? `data-count="${anim}"` : ''}>${esc(val)}</b></div>`;
    return `<div class="st st-zahlen" ${id}>
      <div class="zk-kopf">💧 STAND ${esc(s.lastProcessedDay.split('-').reverse().join('.'))}</div>
      ${kachel('👥', 'EINWOHNER', groupDE(B(s.population)), 'gross gruen', s.population)}
      ${kachel('🥤', 'VERBRAUCH PRO TAG', formatLiters(B(s.dailyMl)), 'gross blau')}
      ${kachel('🚰', 'SCHON AUSGETRUNKEN', formatLiters(B(s.totalConsumedMl)), 'breit')}
      ${kachel('🌊', 'NOCH ÜBRIG (EXAKT)', mlToLitersExact(B(s.remainingMl)) + ' L', 'breit lang')}
      <div class="zk-pct">${percentExact(B(s.remainingMl), B(s.totalWaterMl), 14)} % übrig</div>
      ${kachel('❤️', `${groupDE(B(s.likes))} LIKES`, formatMenge(B(s.consumedMl.likes)), 'klein')}
      ${kachel('💬', `${groupDE(B(s.comments))} KOMM.`, formatMenge(B(s.consumedMl.comments)), 'klein')}
      ${kachel('🔁', `${groupDE(B(s.shares))} SHARES`, formatMenge(B(s.consumedMl.shares)), 'klein')}
      ${kachel('🔖', `${groupDE(B(s.saves ?? '0'))} GESPEICH.`, '0 L', 'klein')}
    </div>`;
  }

  private animateStickers(beat: TimelineBeat, local: number): void {
    const els = this.stickerEl.querySelectorAll<HTMLElement>('.st');
    els.forEach((el) => {
      const k = Number(el.dataset.i);
      const s = beat.sticker[k];
      const delay = k * 0.12;
      const p = easeOutBack(clamp01((local - delay) / 0.3));
      const rot = Number(el.dataset.rot ?? 0);
      el.style.opacity = local < delay ? '0' : '1';
      if (s.typ === 'zeiger') {
        let pos: THREE.Vector3;
        if (s.ziel === 'einwohner1') {
          const f = this.scene.people.firstPerson();
          pos = this.scene.people.positionOf(0) ?? latLonToVec3(f.lat, f.lon, 1.002);
        } else pos = latLonToVec3(s.lat ?? 0, s.lon ?? 0, 1.002);
        const cam = this.scene.camera;
        const visible = pos.clone().normalize().dot(cam.position.clone().sub(pos).normalize()) > 0.05;
        const v = pos.project(cam);
        el.style.left = `${(v.x * 0.5 + 0.5) * 100}%`;
        el.style.top = `${(-v.y * 0.5 + 0.5) * 100}%`;
        el.style.transform = `translate(-50%, -100%) scale(${p})`;
        if (!visible) el.style.opacity = '0';
        return;
      }
      el.style.transform = `translateX(-50%) rotate(${rot}deg) scale(${p})`;
      if (s.typ === 'zahl') {
        const n = el.querySelector<HTMLElement>('[data-num]')!;
        let txt: string;
        if (typeof s.bis === 'string' && !/^[\d.]+$/.test(s.bis)) txt = s.bis;
        else {
          const from = parseNum(s.von), to = parseNum(s.bis);
          const q = easeInOut(clamp01((local - delay - 0.2) / 1.3));
          txt = groupDE(Math.round(from + (to - from) * q)) + (s.einheit ? ' ' + s.einheit : '');
        }
        if (n.textContent !== txt) n.textContent = txt;
      }
      if (s.typ === 'titel' || s.typ === 'zahlen' || s.typ === 'szenario' || s.typ === 'stufen' || s.typ === 'ergebnis') {
        // Zeilen/Kacheln nacheinander einblenden
        el.querySelectorAll<HTMLElement>('.tz, .zk, .zk-pct, .sz-z, .sf-z, .sf-next, .sf-weg, .eg-z, .eg-sum').forEach((z, j) => {
          const q = easeOutBack(clamp01((local - delay - 0.12 - j * 0.13) / 0.32));
          z.style.transform = `scale(${q})`; z.style.opacity = q > 0.02 ? '1' : '0';
        });
        el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
          const target = Number(n.dataset.count);
          if (target > 1 && Number.isSafeInteger(target)) {
            const q = easeInOut(clamp01((local - delay - 0.3) / 1.4));
            n.textContent = groupDE(Math.round(target * q));
          }
        });
      }
      if (s.typ === 'profil') {
        const n = el.querySelector<HTMLElement>('[data-k="follower-n"]')!;
        const target = Number((document.querySelector('[data-k="pop"]')?.textContent ?? '0').replace(/\./g, ''));
        n.textContent = groupDE(Math.round(target * easeInOut(clamp01((local - 0.3) / 1.2))));
      }
    });
  }

  /**
   * NAMENSSCHILDER über den Figuren der Gemeinschaft (nach dem Rendern aufrufen – dann stimmen
   * Kamera und Figurenpositionen genau). Nahe Schilder zuerst; überlappt ein Schild ein schon
   * platziertes, rutscht es ein Stück nach oben. Unter der Anzeige oben wird nichts gezeigt.
   */
  nachRender(): void {
    const namen = this.timeline.namen ?? [];
    const beat = this.timeline.beats[this.beatIndex];
    const people = this.scene.people;
    // Nur wenn die Kamera wirklich bei den Figuren ist (nicht während des Anflugs aus dem All)
    const k0 = people.positionOf(0);
    const nahDran = !!k0 && this.scene.camera.position.distanceTo(k0) < people.figureSize * 75;
    const zeigen = namen.length > 0 && people.nah && nahDran && !!beat && !beat.vorschauEinwohner && !this.scene.mascotVisible;
    this.namenEl.style.display = zeigen ? '' : 'none';
    if (!zeigen) return;
    if (!this.namenSchilder.length) {
      const anzahlSchilder = Math.max(namen.length, this.timeline.ankunft?.bis ?? 0);
      this.namenSchilder = Array.from({ length: anzahlSchilder }, (_, i) => namen[i] ?? null).map((n, i) => {
        const el = document.createElement('div');
        el.className = 'nm' + (this.timeline.ankunft && i >= this.timeline.ankunft.von ? ' neu' : '');
        el.style.setProperty('--farbe', People.gemeinschaftsLook(i).shirt);
        // neue Einwohner ohne bekannten Namen: "Nr. 42"
        const neuOhneName = !n && this.timeline.ankunft && i >= this.timeline.ankunft.von && i < this.timeline.ankunft.bis;
        el.textContent = n ?? (neuOhneName ? `Nr. ${i + 1}` : '');
        if (n || neuOhneName) this.namenEl.appendChild(el);
        return el;
      });
    }
    const cam = this.scene.camera;
    const W = 56.25;                      // Breite in cqh (9:16)
    const n = Math.min(this.namenSchilder.length, people.anzahl);
    const kandidaten: { i: number; x: number; y: number; fs: number; tiefe: number }[] = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < this.namenSchilder.length; i++) {
      const el = this.namenSchilder[i];
      // In der Einstellung "neue" nur die Schilder der Neuen (übersichtlich)
      const nurNeue = (beat.kamera === 'neue' || beat.kamera === 'neu1') && this.timeline.ankunft;
      const kopf = i < n && this.namenSchilder[i].textContent && !(nurNeue && i < nurNeue.von) ? people.positionOf(i) : null;
      if (!kopf) { el.style.display = 'none'; continue; }
      // positionOf liegt ~0,25 Figuren-Einheiten über dem Scheitel -> Schild direkt auf den Kopf setzen
      const oben = kopf.clone().normalize().multiplyScalar(people.figureSize * 0.6);
      a.copy(kopf).add(oben.clone().multiplyScalar(-0.3)).project(cam);
      b.copy(kopf).add(oben.clone().multiplyScalar(0.7)).project(cam);
      if (a.z < -1 || a.z > 1 || Math.abs(a.x) > 1.15 || Math.abs(a.y) > 1.15) { el.style.display = 'none'; continue; }
      const proEinheit = Math.abs(b.y - a.y) * 50;            // cqh je 0,6 Figuren-Einheiten
      kandidaten.push({ i, x: (a.x + 1) / 2 * 100, y: (1 - a.y) / 2 * 100, fs: Math.min(2.7, Math.max(1.5, proEinheit * 0.7)), tiefe: a.z });
    }
    kandidaten.sort((p, q) => p.tiefe - q.tiefe);
    const belegt: { l: number; r: number; o: number; u: number }[] = [];
    for (const k of kandidaten) {
      const el = this.namenSchilder[k.i];
      // Positionen in % des Bildes: x in % der Breite (Breite = W cqh), y in % der Höhe (= cqh)
      const em = el.textContent!.length * 0.6 + (el.classList.contains('neu') ? 4 : 1.6);
      let y = k.y, fs = k.fs;
      const breite = () => (em * fs) / W * 100, hoehe = () => fs * 1.75;
      // am Bildrand nach innen schieben statt ausblenden
      // TikTok-Sicherheitsbereich: rechts (ab ~86 %) liegen zwischen 38 % und 88 % Höhe die Like-/Kommentar-Knöpfe
      const rechts = y > 36 && y < 90 ? 86 : 99.5;
      const mitteX = () => Math.min(rechts - breite() / 2, Math.max(0.5 + breite() / 2, k.x));
      const box = () => ({ l: mitteX() - breite() / 2, r: mitteX() + breite() / 2, o: y - hoehe(), u: y });
      const kollidiert = () => { const q = box(); return belegt.some((p) => q.l < p.r && q.r > p.l && q.o < p.u && q.u > p.o); };
      // Platz suchen: erst etwas kleiner, dann nach oben stapeln
      suche: for (const f of [1, 0.85, 0.72]) {
        fs = Math.max(1.3, k.fs * f);
        for (let v = 0; v < 6; v++) { y = k.y - v * hoehe() * 0.55; if (!kollidiert()) break suche; }
      }
      const q = box();
      // nicht unter der oberen Anzeige und nicht aus dem Bild
      // nicht unter der oberen Anzeige / TikTok-Kopfzeile und nicht unter der TikTok-Beschriftung unten (ab ~84 %)
      const oben = document.body.classList.contains('kompakt') ? 18.5 : 21;
      if (kollidiert() || q.o < oben || q.l < 0.4 || q.r > 99.6 || q.u > 84) { el.style.display = 'none'; continue; }
      belegt.push(q);
      el.style.display = '';
      el.style.left = `${mitteX()}%`; el.style.top = `${y}%`; el.style.fontSize = `${fs}cqh`;
      el.style.zIndex = String(1000 - Math.round(k.tiefe * 500));
    }
  }

  dispose(): void { this.layer.innerHTML = ''; this.scene.people.ankunft = null; this.scene.people.stil = 'menschen'; document.body.classList.remove('kompakt', 'hud-aus'); }
}
