# Voice-over (Piper TTS) + word timings (faster-whisper alignment, proportional fallback)
import json, subprocess, wave, numpy as np, sys, os, re
V=sys.argv[1]; out=sys.argv[2]; os.makedirs(out,exist_ok=True)
S=json.load(open('script.json')); sr=22050; LS=os.environ.get('LS','0.86'); TAIL=float(os.environ.get('TAIL','3.6'))
try:
    from faster_whisper import WhisperModel; WM=WhisperModel("small",device="cpu",compute_type="int8")
except Exception as e: WM=None; print('no whisper',e)
audio=[]; t=0.12; timeline=[]; audio.append(np.zeros(int(0.12*sr),np.float32))
for i,s in enumerate(S):
    f=f'/tmp/s{i}.wav'
    subprocess.run(['python3','-m','piper','-m',V,'--length-scale',LS,'--noise-scale','0.55','--sentence-silence','0.18','-f',f],input=s['say'].encode(),check=True,capture_output=True)
    w=wave.open(f); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32); sr=w.getframerate()
    idx=np.where(np.abs(a)>600)[0]; a=a[max(0,idx[0]-200):idx[-1]+400]; d=len(a)/sr
    words=s['cap'].split(); sw=s['say'].split()
    wts=[max(2,len(x.strip('.,:!?'))) + (6 if x[-1] in '.,:!?' else 0) for x in sw]
    if len(sw)!=len(words): wts=[max(2,len(x)) for x in words]
    tot=sum(wts); acc=0; wl=[]
    for wd,wt in zip(words,wts): wl.append([wd.strip(',.:'),acc/tot*d,(acc+wt)/tot*d]); acc+=wt
    if WM:
        a16=np.interp(np.arange(0,len(a),sr/16000),np.arange(len(a)),a)/32768.0
        segs,_=WM.transcribe(a16.astype(np.float32),language='de',word_timestamps=True,initial_prompt=s['say'])
        ww=[x for sg in segs for x in sg.words]
        if len(ww)==len(words): wl=[[words[k].strip(',.:'),x.start,x.end] for k,x in enumerate(ww)]; src='whisper-exact'
        elif ww:
            # character-position interpolation: map each spoken word's char span onto whisper's char timeline
            import re
            norm=lambda x: re.sub(r'[^a-zäöüß0-9]','',x.lower())
            wc=[]; pos=0
            for x in ww: n=max(1,len(norm(x.word))); wc.append((pos,pos+n,x.start,x.end)); pos+=n
            totw=pos; spk=[max(1,len(norm(x))) for x in sw]; tots=sum(spk)
            def tat(cp):
                cp=cp/tots*totw
                for c0,c1,t0,t1 in wc:
                    if cp<=c1: return t0+(t1-t0)*max(0,min(1,(cp-c0)/(c1-c0)))
                return wc[-1][3]
            acc=0; wl=[]
            for k,wd in enumerate(words):
                n=spk[k] if len(sw)==len(words) else max(1,len(norm(wd)))
                wl.append([wd.strip(',.:'),tat(acc),tat(acc+n)]); acc+=n
            src=f'whisper-interp({len(ww)}/{len(words)})'
        else: src='prop'
        print(i,src)
    timeline.append({"t0":round(t,3),"t1":round(t+d,3),"shots":s['shots'],"words":[{"w":x[0],"t0":round(t+x[1],3),"t1":round(t+x[2],3)} for x in wl]})
    gap=s.get('pause',0.12); audio.append(a); audio.append(np.zeros(int(gap*sr),np.float32)); t+=d+gap
A=np.concatenate(audio+[np.zeros(int(TAIL*sr),np.float32)]); A=A/np.abs(A).max()*0.95
w=wave.open(out+'/voice.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((A*32767).astype(np.int16).tobytes())
json.dump({"duration":round(len(A)/sr,3),"sentences":timeline},open(out+'/timeline.json','w'),indent=1,ensure_ascii=False)
print('duration',len(A)/sr)
