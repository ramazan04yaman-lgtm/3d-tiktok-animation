/**
 * Spielt eine Zeitleiste ab: setzt für jeden Zeitpunkt t Kamera, Wasser,
 * Figur, Untertitel und Sticker. Alles hängt nur von t ab -> jedes Bild
 * ist reproduzierbar (wichtig für die Video-Aufnahme).
 */
import * as THREE from 'three';
import type { EarthScene } from '../earth/scene.ts';
import { latLonToVec3 } from '../earth/geo.ts';
import { ML_PER_LITER } from '../sim/config.ts';
import { formatLiters, formatMenge, groupDE, percentExact, sci } from '../sim/format.ts';
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
    layer.innerHTML = '<div class="stickers"></div><div class="caption"></div>';
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
      this.scene.setFreeCamera(false);
      this.scene.director.setShot(shot, beat.start, beat.uebergang > 0 ? beat.uebergang : 0.0001);
      this.stickerEl.innerHTML = beat.sticker.map((s, k) => this.stickerHTML(s, k)).join('');
    }
    const local = t - beat.start;
    // Wasserstand
    const val = (v: number | 'jetzt') => (v === 'jetzt' ? this.realDrain() : v);
    const k = easeInOut(clamp01(local / Math.max(0.5, beat.end - beat.start - 0.2)));
    const drain = val(beat.wasser.von) + (val(beat.wasser.bis) - val(beat.wasser.von)) * k;
    this.scene.drainTarget = this.scene.drainShown = drain;
    this.scene.previewActive = beat.wasser.von !== 'jetzt' || beat.wasser.bis !== 'jetzt' || !!beat.vorschauEinwohner;
    // Figur + Strohhalm
    this.scene.mascotVisible = beat.kamera === 'kapitaen';
    this.scene.mascot.talking = t >= beat.sprechen.start && t <= beat.sprechen.end;
    this.scene.mascot.waving = beat.aktion === 'winken';
    this.scene.mascot.drinking = beat.aktion === 'trinken';
    this.scene.strawVisible = beat.strohhalm;
    this.animateStickers(beat, local);
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
      case 'schild': return `<div class="st st-schild ${s.farbe ?? 'weissrot'}" ${id} style="top:${s.y ?? 30}%" data-rot="${s.drehung ?? -4}">${esc(s.text)}</div>`;
      case 'zahl': return `<div class="st st-zahl ${s.farbe ?? 'gruen'}" ${id}><div class="lbl">${esc(s.label)}</div><div class="num" data-num="1">0</div></div>`;
      case 'info': return `<div class="st st-info" ${id} style="top:${s.y ?? 30}%">${s.zeilen.map((z) => `<div>${esc(z)}</div>`).join('')}</div>`;
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
    }
  }

  private stufenHTML(id: string): string {
    const s = this.snapshot, B = (x: string) => BigInt(x), st = s.stufe;
    const n0 = s.naechste[0];
    const fehlt = B(n0.follower) - B(s.followers);
    const zeile = (ico: string, lbl: string, val: string, stufe: string) =>
      `<div class="sf-z"><span>${ico} ${lbl}</span><b>${esc(val)}</b><i>Stufe ${esc(stufe)}</i></div>`;
    return `<div class="st st-stufen" ${id}>
      <div class="sf-kopf">⚡ VERBRAUCHSSTUFE JETZT</div>
      ${zeile('🥤', 'Pro Einwohner/Tag', formatMenge(B(st.trinkMl)), st.meilensteine.trinken)}
      ${zeile('❤️', 'Pro Like', formatMenge(B(st.likeMl)), st.meilensteine.like)}
      ${zeile('💬', 'Pro Kommentar', formatMenge(B(st.kommentarMl)), st.meilensteine.kommentar)}
      ${zeile('🔁', 'Pro Share', formatMenge(B(st.shareMl)), st.meilensteine.share)}
      <div class="sf-next"><small>🎯 NÄCHSTER MEILENSTEIN</small><b>${groupDE(B(n0.follower))} FOLLOWER</b>
        <span>noch ${groupDE(fehlt)} · dann ${esc(naechsteText(n0))}</span></div>
      <div class="sf-weg">${s.naechste.slice(1).map((n) => `<div>${groupDE(B(n.follower))} → ${esc(naechsteText(n))}</div>`).join('')}
        <div class="sf-max">🥤 ×2 alle 10.000 Follower – für alle Einwohner</div></div>
    </div>`;
  }

  private zahlenHTML(id: string): string {
    const s = this.snapshot, B = (x: string) => BigInt(x);
    const kachel = (ico: string, lbl: string, val: string, cls = '', anim?: string) =>
      `<div class="zk ${cls}"><small>${ico} ${lbl}</small><b ${anim ? `data-count="${anim}"` : ''}>${esc(val)}</b></div>`;
    return `<div class="st st-zahlen" ${id}>
      <div class="zk-kopf">💧 DER STAND HEUTE</div>
      ${kachel('👥', 'EINWOHNER', groupDE(B(s.population)), 'gross gruen', s.population)}
      ${kachel('🥤', 'VERBRAUCH PRO TAG', formatLiters(B(s.dailyMl)), 'gross blau')}
      ${kachel('🚰', 'SCHON AUSGETRUNKEN', formatLiters(B(s.totalConsumedMl)), 'breit')}
      ${kachel('🌊', 'NOCH ÜBRIG', sci(B(s.remainingMl) / ML_PER_LITER) + ' L', 'breit')}
      <div class="zk-pct">${percentExact(B(s.remainingMl), B(s.totalWaterMl), 14)} % übrig</div>
      ${kachel('❤️', 'LIKES', formatLiters(B(s.consumedMl.likes)), 'klein')}
      ${kachel('💬', 'KOMMENTARE', formatLiters(B(s.consumedMl.comments)), 'klein')}
      ${kachel('🔁', 'SHARES', formatLiters(B(s.consumedMl.shares)), 'klein')}
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
      if (s.typ === 'titel' || s.typ === 'zahlen' || s.typ === 'szenario' || s.typ === 'stufen') {
        // Zeilen/Kacheln nacheinander einblenden
        el.querySelectorAll<HTMLElement>('.tz, .zk, .zk-pct, .sz-z, .sf-z, .sf-next, .sf-weg').forEach((z, j) => {
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

  dispose(): void { this.layer.innerHTML = ''; }
}
