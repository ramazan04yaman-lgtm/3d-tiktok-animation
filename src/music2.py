# Original eerie bed: sustained high tone + dark pad + sparse music-box notes (no third-party audio)
import json, numpy as np, wave, sys
B=sys.argv[1]; TL=json.load(open(f'{B}/timeline.json')); SR=44100; T=TL['total']; n=int(SR*T); t=np.arange(n)/SR
rng=np.random.default_rng(3); f=lambda m:440*2**((m-69)/12)
out=np.zeros(n)
# sustained tone (C#5) with slow tremolo
out+=0.05*np.sin(2*np.pi*f(73)*t)*(0.75+0.25*np.sin(2*np.pi*0.3*t))
# dark pad C#m - A - F#m - G#  (4s each)
ch=[[49,52,56],[45,49,52],[42,45,49],[44,48,51]]
for i in range(int(T/4)+1):
    s=i*4; m=(t>=s)&(t<s+5); x=t[m]-s; w=np.clip(x/1.2,0,1)*np.clip((5-x)/1.2,0,1)
    for nt in ch[i%4]:
        for d in (-.15,.15): out[m]+=w*0.035*np.sin(2*np.pi*f(nt-12)*(1+d/100)*t[m])
out+=0.06*np.sin(2*np.pi*f(37)*t)  # sub
# music box: sparse high notes
mel=[73,76,80,78,76,73,71,73]; k=0; s=0.5
while s<T-2:
    i=int(s*SR); L=int(1.8*SR); x=np.arange(L)/SR; fr=f(mel[k%len(mel)])
    seg=(np.sin(2*np.pi*fr*x)+.3*np.sin(2*np.pi*2*fr*x))*np.exp(-x/0.6)*0.05
    e=min(n,i+L); out[i:e]+=seg[:e-i]; k+=1; s+=1.0 if k%4 else 2.0
# low boom on hook + soft noise breath
L=int(3*SR); x=np.arange(L)/SR; out[:L]+=np.sin(2*np.pi*np.cumsum(35+40*np.exp(-x/.1))/SR)*np.exp(-x/1.0)*0.35
out+=np.convolve(rng.standard_normal(n),np.ones(200)/200,'same')*0.15
out*=np.clip((T-t)/1.5,0,1); out/=np.abs(out).max()*1.05
st=np.stack([out,np.roll(out,250)],1)
wv=wave.open(f'{B}/music.wav','wb'); wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((st*32767).astype('<i2').tobytes()); wv.close()
