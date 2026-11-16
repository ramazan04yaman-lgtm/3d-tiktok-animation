# Original procedural backing track: quirky "storytime" pizzicato/marimba groove, 112 BPM
import numpy as np, wave, json, sys
sr=44100; D=json.load(open('build/timeline.json'))['duration']+0.5
bpm=112; beat=60/bpm; N=int(D*sr); out=np.zeros(N)
def note(f,dur,kind):
    t=np.arange(int(dur*sr))/sr
    if kind=='mar': s=(np.sin(2*np.pi*f*t)+0.3*np.sin(2*np.pi*f*4*t)*np.exp(-t*30))*np.exp(-t*7)
    elif kind=='piz': s=(np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*2*f*t)+0.2*np.sin(2*np.pi*3*f*t))*np.exp(-t*9)
    elif kind=='bass': s=np.tanh(1.5*np.sin(2*np.pi*f*t))*np.exp(-t*4)
    elif kind=='kick': s=np.sin(2*np.pi*(50+90*np.exp(-t*25))*t)*np.exp(-t*12)
    elif kind=='hat': s=np.random.default_rng(1).standard_normal(len(t))*np.exp(-t*60); s=np.diff(s,prepend=0)
    elif kind=='snap': s=np.random.default_rng(2).standard_normal(len(t))*np.exp(-t*35)
    a=int(0.003*sr); s[:a]*=np.linspace(0,1,a); return s
def put(t,s,g):
    i=int(t*sr); j=min(N,i+len(s));
    if i<N: out[i:j]+=s[:j-i]*g
m=lambda n:440*2**((n-69)/12)
# progression in D minor: Dm Bb F A (8 beats each? 4 beats each)
prog=[(50,[62,65,69]),(46,[58,62,65]),(53,[60,65,69]),(45,[61,64,69])]
mel=[74,None,77,76,74,None,72,74, 70,None,74,72,70,69,None,None, 72,None,77,76,72,None,69,72, 73,None,76,73,69,None,None,None]
nb=int(D/beat)+1
for b in range(nb):
    t=b*beat; bar=(b//4)%4; root,ch=prog[bar]
    put(t,note(m(root-12),beat*0.9,'bass'),0.35 if b%2==0 else 0.2)
    put(t,note(60,0.4,'kick'),0.55 if b%4 in (0,2) else 0)
    put(t+beat/2,note(0,0.06,'hat'),0.12); put(t,note(0,0.04,'hat'),0.06)
    if b%4 in (1,3): put(t,note(0,0.15,'snap'),0.18)
    for k,n in enumerate(ch): put(t+beat/2,note(m(n),beat*0.45,'piz'),0.07)
    for h in (0,1):
        n=mel[(b*2+h)%32]
        if n and b>=4: put(t+h*beat/2,note(m(n),beat*0.8,'mar'),0.16)
# fade
fi=int(0.3*sr); out[:fi]*=np.linspace(0,1,fi); fo=int(1.5*sr); out[-fo:]*=np.linspace(1,0,fo)
out=out/np.abs(out).max()*0.9
st=np.stack([out,np.roll(out,int(0.012*sr))],1)
w=wave.open('build/music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype(np.int16).tobytes())
