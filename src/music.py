# Original dark-cinematic bed: drone + pulse + hits on every scene cut (no third-party audio)
import json, numpy as np, wave
TL = json.load(open('build/timeline.json')); SR = 44100; T = TL['total']; n = int(SR*T)
t = np.arange(n)/SR; rng = np.random.default_rng(1)
out = np.zeros((n,2))
def env_ar(x, a, r): return np.clip(x/a,0,1)*np.exp(-np.maximum(x-a,0)/r)
# chord progression Am - F - C - G (low pads), 2 bars each at 100 bpm
bpm=100; beat=60/bpm; bar=4*beat
chords=[[57,60,64],[53,57,60],[48,55,60],[55,59,62]]
f=lambda m:440*2**((m-69)/12)
pad=np.zeros(n)
for ci in range(int(T/(2*bar))+1):
    s=ci*2*bar; e=s+2*bar; m=(t>=s)&(t<e+1)
    if not m.any(): continue
    ch=chords[ci%4]; x=t[m]-s
    w=np.clip(x/0.8,0,1)*np.clip((2*bar+1-x)/1.0,0,1)
    for note in ch:
        for det in (-0.12,0.12):
            ph=2*np.pi*f(note-12)*(1+det/100)*t[m]
            pad[m]+=w*(np.sin(ph)+0.3*np.sin(2*ph)+0.12*np.sin(3*ph))*0.05
# sub drone
pad+=0.10*np.sin(2*np.pi*55*t)*(0.6+0.4*np.sin(2*np.pi*0.1*t))
# pulse: 8th-note filtered plucks after the hook
pulse=np.zeros(n); start=TL['segs'][1]['start']
k=0
while start+k*beat/2<T-1.5:
    s=start+k*beat/2; i=int(s*SR); L=int(0.25*SR); x=np.arange(L)/SR
    ci=int(s/(2*bar))%4; note=chords[ci][0]-24+(12 if k%4==2 else 0)
    seg=np.sin(2*np.pi*f(note)*x)*np.exp(-x/0.07)*0.16
    pulse[i:i+L]+=seg[:max(0,min(L,n-i))]; k+=1
# kick on every beat after hook
kick=np.zeros(n); k=0
while start+k*beat<T-1.5:
    i=int((start+k*beat)*SR); L=int(0.35*SR); x=np.arange(L)/SR
    fr=50+90*np.exp(-x/0.03); seg=np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-x/0.12)*0.35
    kick[i:i+L]+=seg[:max(0,min(L,n-i))]; k+=1
mono=pad+pulse+kick
# hits (boom + noise whoosh) at scene starts; riser into first cut
hits=np.zeros(n)
for j,sg in enumerate(TL['segs']):
    s=sg['start']-0.05 if j else 1.55  # first impact at moon vanish
    i=int(s*SR); L=int(2.5*SR); x=np.arange(L)/SR
    boom=np.sin(2*np.pi*np.cumsum(40+60*np.exp(-x/0.08))/SR)*np.exp(-x/0.7)*0.6
    nz=rng.standard_normal(L)*np.exp(-x/0.25)*0.08
    seg=boom+nz; hits[i:i+L]+=seg[:max(0,min(L,n-i))]
    # whoosh before
    W=int(0.6*SR); i0=max(0,i-W); xx=np.linspace(0,1,i-i0)
    hits[i0:i]+=rng.standard_normal(i-i0)*xx**3*0.12
# reverse riser in hook
rs=int(0.3*SR); re_=int(1.55*SR); xx=np.linspace(0,1,re_-rs)
hits[rs:re_]+=np.sin(2*np.pi*np.cumsum(200+1800*xx**2)/SR)*xx**2*0.08
mono=mono+hits
# simple stereo widening of pad
out[:,0]=mono+0.02*np.roll(pad,300); out[:,1]=mono-0.02*np.roll(pad,300)
fade=np.clip((T-t)/1.5,0,1); out*=fade[:,None]
out/=np.abs(out).max()*1.05
wv=wave.open('build/music.wav','wb'); wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
wv.writeframes((out*32767).astype('<i2').tobytes()); wv.close()
