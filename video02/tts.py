import json, subprocess, wave, numpy as np, sys
V=sys.argv[1]; S=json.load(open('script.json')); SR=22050
GAP=0.12; SCENE_GAP=0.18
out=[]; tl=[]; t=0.0
def say(txt):
    subprocess.run(['python3','-m','piper','-m',V,'-f','/tmp/_p.wav','--length-scale','0.88','--sentence-silence','0'],input=txt.encode(),check=True,capture_output=True)
    w=wave.open('/tmp/_p.wav'); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
    # trim silence
    idx=np.where(np.abs(a)>0.01)[0]; a=a[max(0,idx[0]-200):idx[-1]+800]
    return a
for si,sc in enumerate(S):
    st=t; ph=[]
    for k,p in enumerate(sc):
        a=say(p); ph.append(round(t-st,3)); out.append(a); t+=len(a)/SR
        g=GAP if k<len(sc)-1 else SCENE_GAP
        out.append(np.zeros(int(g*SR),np.float32)); t+=g
    tl.append({'start':round(st,3),'dur':round(t-st,3),'phr':ph})
a=np.concatenate(out); a=a/np.abs(a).max()*0.9
w=wave.open('vo.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a*32767).astype(np.int16).tobytes())
json.dump(tl,open('timeline.json','w'),indent=0); print('total',t)
