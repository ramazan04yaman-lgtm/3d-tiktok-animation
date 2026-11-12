# Creepy, clear German narrator: Coqui Thorsten-VITS (local) + pronunciation fixes + FX.
# usage: /tmp/tts/venv/bin/python src/voice3.py src/v3 build/v3 [gap]
import json, subprocess, sys, wave, re
from TTS.api import TTS
D, B = sys.argv[1], sys.argv[2]; GAP = float(sys.argv[3]) if len(sys.argv) > 3 else 0.22
M = '/tmp/tts/coqui/tts_models--de--thorsten--vits'
tts = TTS(model_path=M + '/model_file.pth', config_path=M + '/config.json', progress_bar=False)
model = tts.synthesizer.tts_model; model.length_scale = 0.97           # clear but keeps the fast reference pacing
ph = model.tokenizer.phonemizer; orig = ph.phonemize
FIX = [('ʔaeːnʔɛːɐ', 'ʔaɪnɐ'), ('aeː', 'aɪ'), ('aoː', 'aʊ'), ('ɔɔʏ', 'ɔʏ'), ('bəʃtɐ', 'bɛstɐ'), ('vəiːtɐ', 'vaɪtɐ'),
       ('gəgəszən', 'gəgɛsən'), ('ləʔɔn', 'leːɔn'), ('kləɪnəs', 'klaɪnəs'), ('mɪllɪoːnən', 'mɪlioːnən'),
       ('koːmmɛntaʁən', 'kɔmɛntaːʁən'), ('handyː', 'hɛndi'), ('nʊmmɐ', 'nʊmɐ'), ('ʁanntə', 'ʁantə'),
       ('kanal', 'kanaːl'), ('diːəsəm', 'diːzəm'), ('diːzəʁ', 'diːzɐ'), ('ʔeːs', 'ʔɛs'), ('ʔɛɐstn', 'ʔeːɐstən'), ('fandn', 'fandən')]
def fixed(text, *a, **k):
    out = orig(text, *a, **k)
    for x, y in FIX: out = out.replace(x, y)
    return out
ph.phonemize = fixed
S = json.load(open(f'{D}/script.json')); t = 0.15; segs = []; files = []
FX = ('aresample=44100,highpass=f=75,equalizer=f=280:t=q:w=1:g=-2.5,equalizer=f=3500:t=q:w=1.2:g=3.5,equalizer=f=7000:t=q:w=1:g=1.5,'
      'acompressor=threshold=-20dB:ratio=2.5:attack=5:release=120,'
      'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse')
for i, s in enumerate(S):
    raw = f'{B}/raw_{i}.wav'; f = f'{B}/vo_{i}.wav'
    tts.tts_to_file(text=s['text'], file_path=raw)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-filter_complex',
                    f'[0:a]{FX}[o]',
                    '-map', '[o]', '-ac', '1', '-ar', '44100', f], check=True)
    w = wave.open(f); d = w.getnframes() / w.getframerate(); w.close()
    segs.append(dict(s, start=round(t, 3), dur=round(d, 3))); files.append((f, t)); t += d + GAP
total = t + 1.2
json.dump({'total': total, 'segs': segs}, open(f'{B}/timeline.json', 'w'), ensure_ascii=False, indent=1)
inputs = sum([['-i', f] for f, _ in files], [])
flt = ''.join(f'[{k}]adelay={int(st*1000)}|{int(st*1000)}[a{k}];' for k, (f, st) in enumerate(files))
flt += ''.join(f'[a{k}]' for k in range(len(files))) + f'amix=inputs={len(files)}:normalize=0,apad=whole_dur={total}[o]'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', flt, '-map', '[o]', '-ac', '1', f'{B}/voice.wav'], check=True)
print(round(total, 2))
