import json, subprocess, wave, numpy as np, sys, os
V=sys.argv[1]; out=sys.argv[2]
S=json.load(open('script.json')); sr=22050
audio=[]; t=0.0; timeline=[]; GAP=0.08
for i,s in enumerate(S):
    f=f'/tmp/s{i}.wav'
    subprocess.run(['python3','-m','piper','-m',V,'--length-scale','0.82','--sentence-silence','0.15','-f',f],input=s['say'].encode(),check=True,capture_output=True)
    w=wave.open(f); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32); sr=w.getframerate()
    env=np.abs(a)>600; idx=np.where(env)[0]; a=a[max(0,idx[0]-200):idx[-1]+400]
    d=len(a)/sr
    # word timings proportional to char weight
    words=s['cap'].split(); sw=s['say'].split()
    wts=[max(2,len(x.strip('.,:!?'))) + (6 if x[-1] in '.,:!?' else 0) for x in sw]
    # map caption words to spoken weights (numbers longer spoken)
    if len(sw)!=len(words): wts=[max(2,len(x)) for x in words]
    tot=sum(wts); acc=0; wl=[]
    for wd,wt in zip(words,wts):
        wl.append({"w":wd.strip(',.:'),"t0":round(t+acc/tot*d,3),"t1":round(t+(acc+wt)/tot*d,3)}); acc+=wt
    timeline.append({"t0":round(t,3),"t1":round(t+d,3),"shots":s['shots'],"words":wl})
    audio.append(a); audio.append(np.zeros(int(GAP*sr),np.float32)); t+=d+GAP
A=np.concatenate(audio+[np.zeros(int(1.2*sr),np.float32)]); A=A/np.abs(A).max()*0.95
w=wave.open(out+'/voice.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((A*32767).astype(np.int16).tobytes())
json.dump({"duration":round(len(A)/sr,3),"sentences":timeline},open(out+'/timeline.json','w'),indent=1,ensure_ascii=False)
print(len(A)/sr)
