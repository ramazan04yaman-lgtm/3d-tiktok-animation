# Realistic Machine Explainer

Before planning, scripting or rendering any new episode, read and follow `docs/PRODUCTION_GUIDE.md`
(series style reference, hook, label size, ≤ 2 callouts at once, close-ups, transitions,
surprising fact at the end, continuous ≥ 60 s German narration, 1080×1920 @ 30 fps).

- Render: `node scripts/render.mjs --project <id> --workers 4`, QA: `node scripts/qa.mjs --project <id>`
- Voice: `node scripts/mux-audio.mjs --config audio/<id>-voice.json` (fails on silence > 0.8 s)
