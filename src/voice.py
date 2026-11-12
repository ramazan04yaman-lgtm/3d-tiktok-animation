import json, subprocess, wave, sys
S = json.load(open('src/script.json'))
GAP = 0.35
t = 0.4; segs = []; files = []
for i, s in enumerate(S):
    f = f'build/vo_{i}.wav'
    subprocess.run(['python3','-m','piper','-m','/tmp/tts/de-thorsten-low.onnx','--length_scale','0.88','-f',f], input=s['text'].encode(), check=True, capture_output=True)
    w = wave.open(f); d = w.getnframes()/w.getframerate(); w.close()
    segs.append(dict(s, start=round(t,3), dur=round(d,3))); files.append((f,t))
    t += d + GAP
total = t + 1.2
json.dump({"total": total, "segs": segs}, open('build/timeline.json','w'), ensure_ascii=False, indent=1)
# mix voice track
inputs = sum([['-i', f] for f,_ in files], [])
flt = ''.join(f'[{k}]adelay={int(st*1000)}|{int(st*1000)}[a{k}];' for k,(f,st) in enumerate(files))
flt += ''.join(f'[a{k}]' for k in range(len(files))) + f'amix=inputs={len(files)}:normalize=0,aresample=44100,apad=whole_dur={total}[o]'
subprocess.run(['ffmpeg','-y','-loglevel','error',*inputs,'-filter_complex',flt,'-map','[o]','-ac','1','build/voice.wav'], check=True)
print(total)
