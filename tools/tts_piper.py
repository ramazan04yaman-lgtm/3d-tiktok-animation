"""
Natürliche deutsche KI-Stimme mit Piper (offline, Stimme "Thorsten", Lizenz CC0).
Aufruf: python3 tools/tts_piper.py <auftrag.json>
auftrag.json: { "modell": "tools/stimmen/de_DE-thorsten-high.onnx", "tempo": 1.0, "sprecher": null,
                "saetze": [{"text": "...", "datei": "out/stimme-00.wav"}, ...] }
"""
import json, sys, wave
from piper import PiperVoice, SynthesisConfig

job = json.load(open(sys.argv[1]))
voice = PiperVoice.load(job['modell'])
cfg = SynthesisConfig(speaker_id=job.get('sprecher'), length_scale=job.get('tempo', 1.0),
                      noise_scale=0.6, noise_w_scale=0.75, normalize_audio=True)
for s in job['saetze']:
    with wave.open(s['datei'], 'wb') as w:
        voice.synthesize_wav(s['text'], w, syn_config=cfg)
print(f"{len(job['saetze'])} Sätze gesprochen")
