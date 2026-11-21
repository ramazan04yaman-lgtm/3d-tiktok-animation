# Realistic Machine Explainer

A reusable 3D system for **60-second TikTok explainer videos** about everyday machines,
built with React, TypeScript, Three.js, React Three Fiber and Drei.
Output: **1080 × 1920 px, 9:16, 30 fps, exactly 60 s (1800 frames)**, H.264/yuv420p.

Episodes (one shared series look — same studio, materials, x-ray/section style, HUD, typography):

1. **„Wie funktioniert ein Wasserkocher?“** — `--project kettle`
2. **„Wie funktioniert eine Kaffeemaschine?“** — `--project espresso`
3. **„Wie funktioniert eine Mikrowelle?“** — `--project microwave`
4. **„Wie funktioniert das menschliche Herz?“** — `--project heart`
5. **„Warum und wie furzen Menschen?“** — `--project gut`
6. **„Warum schneidet Papier?“** — `--project papercut`
7. **„Was wächst in deinem Duschkopf?“** — `--project shower`
8. **„Der Riss im Holzlöffel“** — `--project spoon`
9. **„Wie funktioniert eine Spülmaschine?“** — `--project dishwasher`
10. **„Wie funktioniert eine Heizung?“** — `--project heating`

```bash
npm install
npm run dev            # browser preview with player (space = play, ←/→ = frame step)
npm test               # timeline, camera smoothness, physics
npm run render         # full export → out/kettle/kettle.mp4 (+ out/kettle/frames/)
npm run render:preview # quick check: every 15th frame
npm run qa             # quality checks on the finished video
npm run audio          # place voice-over segments → out/kettle/kettle_voice.mp4
npm run export:glb     # procedural model → public/models/kettle.glb (Blender-importable)
node scripts/still.mjs --times 0,22,54   # single stills → out/stills/
```

## Architecture

```
src/engine/                 reusable, project-independent
  config.ts                 video format (1080×1920, 30 fps)
  time.ts                   global timeline time (zustand) + useTimelineFrame()
  timeline.ts               scenes & captions, validated to the second (no gaps/overlaps)
  camera.ts                 CameraPath: time-parameterised Hermite spline (C¹ → no jerks), orbit() helper
  math.ts                   ramp / envelope / easing / deterministic hash & noise
  Stage.tsx                 fixed 1080×1920 canvas, post-processing (bloom, AgX tone mapping, SMAA, vignette)
  Player.tsx                preview UI (scrubbing, scene list)
  GLBExport.tsx             export any project model as .glb
  components/
    CameraRig.tsx           drives the camera from the CameraPath (+ vertical framing offset for captions)
    RenderBridge.tsx        window.__MX__.setFrame(n) for frame-accurate capture
    cutaway.ts              SectionCut (clipping planes) + fresnel x-ray material for transparent housings
    Explode.tsx             exploded views
    Label.tsx               3D-anchored callouts
    Overlay.tsx             captions, scene chip, disclaimer
    Studio.tsx              procedural studio light (Lightformers, no HDRI download), shadows, floor
    GLBModel.tsx            load Blender .glb models and access parts by object name
  effects/
    Steam.tsx               billboard steam
    Bubbles.tsx             nucleate boiling incl. subcooled collapse
    FlowParticles.tsx       particles along curves (current, convection, steam in ducts)
    HeatRings.tsx           stylised heat waves
    heat.ts                 false-colour temperature ramp, glow colour
src/projects/kettle/        the demo
  script.ts                 ★ timeline, captions, camera moves, all animation tracks (functions of t)
  physics.ts                simplified heating model
  geometry.ts / KettleModel.tsx / KettleScene.tsx / KettleOverlay.tsx
scripts/
  render.mjs                Playwright frame capture (parallel workers) → FFmpeg
  qa.mjs                    automated quality checks
  export-glb.mjs, still.mjs, lib.mjs
```

### Why the export is reproducible

* Every animated value is a **pure function of timeline time `t`** — no `Math.random()`,
  no wall-clock, no accumulated deltas. Particles (steam, bubbles, flow) are computed
  analytically from `(particle index, t)` with a deterministic hash.
* In render mode the canvas runs with `frameloop="never"`. The exporter calls
  `window.__MX__.setFrame(n)`, which sets `t = n / 30`, synchronously renders the
  3D frame and commits the HTML overlay, then screenshots the 1080×1920 stage.
* Because frames are independent, they are split across several browser workers
  and still yield identical output. FFmpeg assembles `frame_00000.jpg …` at exactly
  30 fps with libx264 (CRF 16, yuv420p, faststart).
* Fonts (Inter, JetBrains Mono) are bundled via `@fontsource`; the studio lighting is
  generated procedurally — there are no network assets that could be missing.

Rendering in this container uses software WebGL (SwiftShader) at ≈2 s/frame/worker.
On a machine with a GPU set `MX_GPU=1 npm run render` to use hardware acceleration.

### Creating a new video

1. Copy `src/projects/kettle/` → `src/projects/<machine>/`.
2. Edit `script.ts`: scenes (must cover 0–60 s), captions, camera keys (`orbit(t, target, azimuth, elevation, distance)`), tracks.
3. Build the model procedurally or load a Blender export with `<GLBModel url="/models/x.glb" onParts={…} />`
   (Blender object names are preserved; name parts e.g. `HeatingElement`, `Lid`).
4. Register the project in `src/projects/registry.ts`, then `npm run render -- --project <machine>`.

## Voice-over

`audio/kettle-voice.json` lists the voice-over segments: where each one sits in the source
file (found with `ffmpeg -af silencedetect`), when it starts in the video, and an optional
`tempo`. `npm run audio` refuses overlapping segments, copies the video stream untouched,
mixes the audio, loudness-normalises it for TikTok (≈ -14 LUFS) and writes AAC 48 kHz.
The current voice is ElevenLabs "Felix Serenitas" — check that your ElevenLabs plan
allows commercial use before monetising the video.

## Kettle demo — storyboard

| Time | Scene | What happens |
|---|---|---|
| 0–5 s | 01 Der Wasserkocher | hero shot of the complete kettle, title |
| 5–11 s | 02 Kamerafahrt & Einschalten | dolly to the device, rocker switch, LED on, timer starts |
| 11–18 s | 03 Technische Schnittansicht | section plane sweeps through housing & handle, removed half as x-ray ghost |
| 18–27 s | 04 Das Heizelement | exploded view: base, skirt, plate + tubular element, current flow, heat rings |
| 27–38 s | 05 Erwärmung | false-colour water temperature, convection streams, thermometer HUD |
| 38–45 s | 06 Aufsteigende Blasen | subcooled bubbles collapse, then reach the surface at 100 °C (t = 44 s) |
| 45–51 s | 07 Dampf | steam from spout & lid, steam enters the duct in the handle |
| 51–60 s | 08 Thermoschalter & Abschaltung | bimetal disc snaps (t = 53.5 s), contacts open, LED off, element cools, pull-back |

## Honest disclosure: what is simplified

* **Model:** no licensed high-quality kettle asset was available, so the kettle is a
  **procedural replacement model** (lathe/tube geometry, physically based materials).
  It is exported as `public/models/kettle.glb` so it can be refined in Blender.
* **Heating:** a lumped-capacitance energy balance
  `m·c·dT/dt = η·P − k·(T − T_amb)` (2000 W, η = 0.92, 1 l water, k = 3 W/K) → 100 °C after ≈ 195 s.
  One uniform water temperature, no stratification. The video is a **time-lapse**; the HUD shows the simulated real time.
* **Bubbles, steam, convection, current flow** are deterministic particle
  **visualisations**, not CFD or electrical simulation. Bubble rise speeds (≈ 14–30 cm/s)
  and the subcooled-collapse behaviour are physically motivated but not simulated.
* **Colours:** the water colour and the glow of the element are **false colours** —
  real water does not change colour and a concealed element (≈ 300 °C) does not visibly glow.
  The video states this on screen.
* **Thermostat:** modelled after a typical steam-sensing bimetal control (steam duct
  in the handle → snap-action disc → contacts), geometrically simplified.

## Episode 2 — Kaffeemaschine (espresso)

| Time | Scene | What happens |
|---|---|---|
| 0–5 s | 01 Die Kaffeemaschine | complete machine on a stone countertop, title |
| 5–11 s | 02 Kamerafahrt & Einschalten | dolly in, power button + LED, thermoblock pre-heats |
| 11–17 s | 03 Transparentes Gehäuse | housing cross-fades to the x-ray look |
| 17–24 s | 04 Wassertank & Zulauf | brew button, tank level drops, water flows to the pump |
| 24–31 s | 05 Pumpe baut Druck auf | pump sectioned, (slowed) piston, manometer rises to 9 bar |
| 31–38 s | 06 Das Heizsystem | thermoblock sectioned: water helix heats 20 → 93 °C (false colour) |
| 38–46 s | 07 Durch das Kaffeepulver | group head & portafilter sectioned: shower screen, wetting front through the puck |
| 46–54 s | 08 Kaffee läuft in die Tasse | first drips, two streams, cup fills, pump stops at 53.6 s |
| 54–60 s | 09 Frisch gebrüht | housing solid again, close-up of the cup with crema and steam |

Simplifications (also shown on screen / in `src/projects/espresso/index.ts`): procedural replacement
model; pressure and temperature are scripted curves (≈ 9 bar, ≈ 93 °C), in reality pressure only builds
against the coffee puck; the pump piston is shown ≈ 20× slower than its real 50 Hz stroke; water, coffee
streams, drops and steam are deterministic visualisations, not fluid simulation.

## Episode 3 — Mikrowelle (microwave)

| Time | Scene | What happens |
|---|---|---|
| 0–5 s | 01 Die Mikrowelle | microwave on the countertop, slow approach, title |
| 5–12 s | 02 Das Innenleben | housing + door to x-ray; door mesh, cavity, turntable, magnetron, HV parts, waveguide labelled |
| 12–22 s | 03 Entstehung der Mikrowellen | start (display counts down), magnetron sectioned: glowing cathode, rotating electron spokes; wave travels through the waveguide, fronts spread inside the metal cavity |
| 22–37 s | 04 Das Essen wird warm | standing-wave field slice; magnified water dipoles partially follow the alternating field with a lag + thermal jiggling; thermal map of the soup |
| 37–48 s | 05 Der Drehteller | close-ups of the rotating plate; fixed hot-spot pattern vs. moving food |
| 48–56 s | 06 Die fertige Mahlzeit | "End", camera pulls out, housing solid again, door opens, steam |
| 56–60 s | 07 Abschluss | close-up of the steaming soup |

Physics notes / simplifications: 2.45 GHz, λ ≈ 12.2 cm (the waveguide ribbon and the spacing of the
expanding fronts use this wavelength; hot spots ≈ λ/2 ≈ 6 cm apart). Heating is shown as dielectric loss:
dipoles only partly align and lag behind the field — no free "propeller" rotation. Everything oscillating is
slowed down by many orders of magnitude. The cavity field is a plausible superposition of two modes, not a
Maxwell solution; the soup heat map is |E|² sampled along the rotating bowl plus diffusion, scaled to the
scripted mean temperature. Procedural replacement model.

## Episode 4 — Das menschliche Herz (heart)

| Time | Scene | What happens |
|---|---|---|
| 0–5 s | 01 Das Herz | anatomical torso (bust) on a plinth, slow approach to the chest, title |
| 5–13 s | 02 Das Herz sichtbar machen | skin → x-ray, ribcage fades, beating heart; four-chamber section opens; great vessels, both atria, both ventricles and the valves labelled |
| 13–25 s | 03 Blut kommt zum Herzen | blue: venae cavae → right atrium → tricuspid valve (opens in diastole) → right ventricle |
| 25–37 s | 04 Blut zur Lunge | pulmonary valve opens in systole → pulmonary trunk → lungs; magnifier: alveolus + capillary, CO₂ out, O₂ in, red blood cells turn blue → red |
| 37–48 s | 05 Sauerstoffreiches Blut | red: pulmonary veins → left atrium → mitral valve → left ventricle |
| 48–56 s | 06 Das Herz pumpt | close-up of the thick left-ventricular wall, aortic valve, aorta; arteries of the trunk light up |
| 56–60 s | 07 Abschluss | section closes, beating heart in the transparent torso |

How it is built: the heart, lungs and torso are signed-distance models meshed with
`src/engine/geometry/surfaceNets.ts` (smooth gradient normals, narrow-band evaluation). The heart is modelled in its
own frame so that one plane is a true four-chamber section (RA, RV, LA, LV, both AV valves, ascending aorta); in the
chest it is rotated so the apex points left, down and forward. The vessels outside the heart follow the body axes
(cavae and descending aorta vertical, pulmonary vessels to the hila). The beat is a vertex-shader deformation (AV-plane
descent, radial squeeze with wall thickening, atrial contraction) — the same function exists in TypeScript for the
valves and chordae. Cardiac cycle in real time, 60 /min: atrial kick → AV valves close → ejection with semilunar valves
open → relaxation → AV valves open, filling. Blood particles move only while the corresponding valve is open
(cumulative flow integrals), so the flow is pulsatile and always in the correct direction.

Simplifications: procedural replacement model, not a licensed medical scan; anatomy simplified (no pericardium,
no conduction system, coronary vessels only main branches, lung vessel trees procedural). Blue/red is the usual
colour code for oxygen-poor/-rich blood — real blood is dark to bright red. The gas exchange is strongly magnified and
slowed down. LV volume in the HUD: typical values (EDV ≈ 120 ml, ESV ≈ 50 ml, stroke volume ≈ 70 ml).

## Episode 5 — Darmgase (gut)

"Warum und wie furzen Menschen?" — 60 s, timed to the narration (`audio/gut-voice.json`, Felix take shortened pauses + 1.12× so the voice fills the full 60 s).

| Zeit | Szene |
|---|---|
| 0–6 s | Hook: Oberkörper, Kamera fährt auf den Bauch |
| 6–12 s | Bauchdecke wird transparent: Magen, Dünndarm, Dickdarm (Haustren, Tänien), Enddarm |
| 12–24 s | Längsschnitt; verschluckte Luft (Speiseröhre → Magenblase → Dünndarm); Lupe: Bakterien zersetzen Ballaststoffe |
| 24–39.6 s | Gase H₂ · CO₂ · CH₄ (Kugel-Stab-Moleküle), Schwefelverbindungen < 1 % (H₂S), Peristaltik sammelt Bläschen zu Gasblasen |
| 39.6–50.5 s | Gasblase wandert ins Rektum; Sagittalschnitt: innerer Schließmuskel öffnet kurz (Abtastreflex), Nerven prüfen, äußerer Schließmuskel entspannt |
| 50.5–55.6 s | Austritt, Schwingung des Gewebes am Ausgang, Schallwellen |
| 55.6–60 s | Rückfahrt zur ganzen (transparenten) Figur |

Construction: full-figure mannequin (heart-episode torso + legs, arms, head via Surface Nets), organ tubes with parallel-transport frames (`tube.ts`) and a tissue shader with peristaltic contraction rings, longitudinal section and mucosa back faces (`materials.ts`); gas pockets, bubbles and contents are pure functions of time (`gas.ts`, `Contents.tsx`).

Simplifications: procedural model (no medical scan); small intestine strongly shortened; motility hugely accelerated; bacteria, molecules and bubbles magnified; neutral mannequin without sex characteristics.

## Episode 6 — Papierschnitt (papercut)

Narration `audio/papercut-voice.json` (Felix, natural speed). Hook: edge slides over the fingertip and opens a cut (0–3 s); microscope dive into the fibre edge; pressure on a line (1 N on 1 cm × 0.065 mm ≈ 15 bar, ≈ 150× a flat finger); textbook skin section (epidermis, dermis with capillary loops, fat, free nerve endings; shallow V cut, severed endings send pain signals); surprise: 2024 DTU study — ≈ 65 µm paper slices, thinner buckles, thicker dents (thicknesses exaggerated on screen).

## Episode 7 — Duschkopf (shower)

Narration `audio/shower-voice.json` (Felix, natural speed). Hook: crooked jets + clogged rubber nozzles (0–6 s); section through the head with residual water; time-lapse (weeks HUD): limescale crystals, pink/brown biofilm, biofilm magnifier, clogged nozzles deflect the jets; x-ray figure (gut episode) inhales aerosol into the lungs ("meist harmlos"); surprise: mycobacteria up to > 100× above tap water in some showerheads (Feazel et al., PNAS 2009 — verify before publishing); fix: rub nozzles, descale, run hot water.

## Episode 8 — Holzlöffel (spoon)

Narration `audio/spoon-voice.json` (Felix, natural speed). Hook: dark line in the bowl = crack (0–7 s); magnified wood block (rings, open pores) + vessel magnifier (water, then fat creep in by capillarity); swelling/shrinking until the block cracks; sauce, meat juice and fat pressed into the V crack; dishwasher cycles (HUD) deepen it; bacteria colonise the moist gap, rinse water stays on top; surprise: on intact wood bacteria are drawn into the pores and mostly die as it dries (wooden-board studies, Univ. of Wisconsin, 1990s); fix: hand wash, dry, replace cracked spoons.

## Episode 9 — Spülmaschine (dishwasher)

Narration `audio/dishwasher-voice.json` (Felix, natural speed). Hook: spray arm spins with no motor of its own (0–6 s); inlet (~10 l HUD); softener magnifier (resin beads swap calcium for sodium); heater ring up to 70 °C; circulation pump feeds both spray arms; recoil arrows show the angled nozzles driving the arm; detergent flap opens, enzyme magnifier (amylase/protease cut starch and protein); sieve and recirculation; rinse-aid magnifier (droplets spread into a film); drying: steam condenses on the cooler walls; surprise: washing by hand often uses about four times as much water (water columns ≈ 10 l vs ≈ 40 l).

## Episode 10 — Heizung (heating)

Narration `audio/heating-voice.json` (Felix, natural speed). Hook: thermostat head turned from 3 to 5 — "Auf 5 = schneller warm?" (0–5 s); camera drops through the floor slab into the basement; gas condensing boiler turns to x-ray (blue burner flames, heat-exchanger coil, supply HUD to 70 °C); circulation pump, red supply / blue return pipes; radiator section (hot at the top, cooler at the bottom); convection roll in the room; mid-video like & subscribe CTA (`SubscribeCTA`); magnifier: water vapour in the exhaust condenses on the cold return-water tube and releases heat; magnifier: wax capsule expands, pin closes the valve as the room reaches 20 °C; surprise: setting 3 and 5 are equally open while the room is cold — 5 only means "close at ≈ 28 °C".
