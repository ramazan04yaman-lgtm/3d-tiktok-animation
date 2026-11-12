import json, subprocess, wave, sys
D=sys.argv[1]; B=sys.argv[2]; GAP=float(sys.argv[3]) if len(sys.argv)>3 else 0.12
S=json.load(open(f'{D}/script.json')); t=0.1; segs=[]; files=[]
for i,s in enumerate(S):
    f=f'{B}/vo_{i}.wav'
    subprocess.run(['python3','-m','piper','-m','/tmp/tts/de-thorsten-low.onnx','--length_scale','0.86','--sentence_silence','0.15','-f',f],input=s['text'].encode(),check=True,capture_output=True)
    # trim leading/trailing silence
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f,'-af','silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',f+'.t.wav'],check=True)
    subprocess.run(['mv',f+'.t.wav',f])
    w=wave.open(f); d=w.getnframes()/w.getframerate(); w.close()
    segs.append(dict(s,start=round(t,3),dur=round(d,3))); files.append((f,t)); t+=d+GAP
total=t+1.0
json.dump({"total":total,"segs":segs},open(f'{B}/timeline.json','w'),ensure_ascii=False,indent=1)
inputs=sum([['-i',f] for f,_ in files],[])
flt=''.join(f'[{k}]adelay={int(st*1000)}|{int(st*1000)}[a{k}];' for k,(f,st) in enumerate(files))
flt+=''.join(f'[a{k}]' for k in range(len(files)))+f'amix=inputs={len(files)}:normalize=0,aresample=44100,apad=whole_dur={total}[o]'
subprocess.run(['ffmpeg','-y','-loglevel','error',*inputs,'-filter_complex',flt,'-map','[o]','-ac','1',f'{B}/voice.wav'],check=True)
print(total)
