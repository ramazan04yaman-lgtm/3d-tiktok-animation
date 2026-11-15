# Production guide — rules for every new episode

The finished episodes (kettle, espresso, microwave, heart, gut) are the **binding style reference**:
photorealistic studio look, dark background, x-ray/section views, same captions, chip, HUD, callouts.
Improve the technical quality; never change the visual language.

## 1. Hook (first 3 seconds)
- The first sentence must create curiosity within ≤ 3 s (a surprising number, a paradox, a question
  that is answered later in the video). No slow "today we look at…" openings.
- Picture and caption must support the hook from frame 0 (caption visible from ≈ 0.4 s).

## 2. Readability on phones
- Callouts use the enlarged series style (`.mx-label-*` in `src/styles.css`: title 46 px, sub 31 px).
- Sub-lines ≤ ~38 characters; titles ≤ 3 words.
- Callouts stay inside `LABEL_SAFE` (automatic clamping in `Label.tsx`).

## 3. Less information at once
- At most **2 callouts** visible at the same time (4 only for a short "name the parts" overview).
- Each callout ≥ 2 s on screen, fades ≥ 0.4 s, appears when the narration names the thing.
- One caption at a time; HUD only when it carries the scene's key number.

## 4. Camera
- Every episode contains at least one **extreme close-up** (subject fills ≥ 60 % of the frame) and
  slow push-ins/orbit moves between keys; no static shots longer than ~4 s.
- `camera.test.ts` must pass (speed/acceleration limits) — add the new camera there.

## 5. Transitions
- No hard cuts: scene changes are camera moves + cross-fades (x-ray, section cut, magnifier scale-in).
- Effects ramp in/out over ≥ 0.6 s; QA scene-change score must stay < 12.

## 6. Realistic inner processes
- Section views with wall thickness, wet/physical materials, motion driven by real mechanisms
  (pressure, peristalsis, valves, convection …), magnifiers for micro scales with honest labels
  ("stark vergrößert", "beschleunigt").

## 7. Ending
- At least **one surprising, correct scientific fact** in the last 8–10 s (narration + caption),
  then the pull-back to the full object.

## 8. Narration (German, Felix via ElevenLabs — produced by the user)
- Continuous speech for the whole 60 s; no silence > 0.8 s (`mux-audio.mjs` checks this and fails).
- Felix (calm voice) speaks ≈ 125 words per minute including pauses
  (heart: 122 words → 53 s; gut: 147 words → 70.7 s). **Write 125–135 words** for a 60 s video
  and ask for speed 1.0; adjust with ≤ 5 % `tempo` in the voice config, never more than 12 %.
- Workflow: write text → user records → `silencedetect` → place sentences → **retime the animation
  to the real sentence times** → render → mux → QA.

## 9. Export
- 1080 × 1920, 30 fps, exactly 60 s, H.264 yuv420p, AAC 48 kHz, −14 LUFS.
- `node scripts/qa.mjs --project <id>` (10 checks) and the narration coverage check must pass.

## 10. Science & honesty
- Facts checked; simplifications named in the project's `disclaimer`, the on-screen disclaimer and the README.
- Respectful, non-sexualised anatomy (neutral mannequin), humour only through wording, never through cartoon looks.
