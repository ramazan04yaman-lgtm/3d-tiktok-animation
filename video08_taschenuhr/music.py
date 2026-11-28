# Original procedural score with a tension arc that follows the story (reads build/plan.json)
import numpy as np, wave, json
sr=44100; P=json.load(open('build/plan.json')); D=P['duration']+0.5
T=json.load(open('build/timeline.json'))['sentences']; st=[s['t0'] for s in T]
bpm=104; beat=60/bpm; N=int(D*sr); out=np.zeros(N); rng=np.random.default_rng(1)
def note(f,dur,kind):
    t=np.arange(int(dur*sr))/sr
    if kind=='mar': s=(np.sin(2*np.pi*f*t)+0.3*np.sin(2*np.pi*f*4*t)*np.exp(-t*30))*np.exp(-t*7)
    elif kind=='piz': s=(np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*2*f*t)+0.2*np.sin(2*np.pi*3*f*t))*np.exp(-t*9)
    elif kind=='bass': s=np.tanh(1.5*np.sin(2*np.pi*f*t))*np.exp(-t*4)
    elif kind=='kick': s=np.sin(2*np.pi*(50+90*np.exp(-t*25))*t)*np.exp(-t*12)
    elif kind=='hat': s=rng.standard_normal(len(t))*np.exp(-t*60); s=np.diff(s,prepend=0)
    elif kind=='snap': s=rng.standard_normal(len(t))*np.exp(-t*35)
    elif kind=='pad': s=sum(np.sin(2*np.pi*f*k*t+k)/k for k in (1,2,3))*np.minimum(1,t/0.3)*np.minimum(1,(dur-t)/0.3)
    elif kind=='acc':
        vib=1+0.004*np.sin(2*np.pi*5.5*t); s=sum((np.sin(2*np.pi*f*k*vib*t)+np.sin(2*np.pi*f*k*1.004*vib*t))/k**1.3 for k in (1,2,3,4,5))*np.minimum(1,t/0.03)*np.exp(-t*1.2)*(1+0.15*np.sin(2*np.pi*6*t))
    elif kind=='tick': s=rng.standard_normal(len(t))*np.exp(-t*400)
    elif kind=='pulse': s=np.tanh(2*np.sin(2*np.pi*f*t))*np.exp(-t*10)
    a=int(0.003*sr); s[:a]*=np.linspace(0,1,a); return s
def put(t,s,g):
    i=int(t*sr); j=min(N,i+len(s))
    if 0<=i<N: out[i:j]+=s[:j-i]*g
m=lambda n:440*2**((n-69)/12)
MIN=[(50,[62,65,69]),(46,[58,62,65]),(53,[60,65,69]),(45,[61,64,69])]
MAJ=[(50,[62,66,69]),(55,[62,67,71]),(57,[61,64,69]),(50,[62,66,69])]
mel=[74,None,77,76,74,None,72,74, 70,None,74,72,70,69,None,None, 72,None,77,76,72,None,69,72, 73,None,76,73,69,None,None,None]
melM=[78,None,81,78,74,None,76,78, 79,None,78,76,74,None,None,None, 76,None,78,76,73,None,69,73, 74,None,None,None,None,None,None,None]
def sec(t):
    i=max(k for k in range(len(st)) if st[k]<=t+1e-6) if t>=st[0] else 0
    return i
# section -> (drums, bass, chords, melody, pad, pulse, level, major)
S={0:(1,1,1,1,0,1,1.0,0),1:(0,1,1,1,1,0,0.7,0),2:(1,1,1,1,0,1,0.9,0),3:(0,1,0,0,1,1,0.7,0),4:(1,1,1,1,0,1,1.05,0),5:(1,1,1,1,0,0,0.9,0),
   6:(0,1,1,0,1,0,0.6,1),7:(0,1,1,1,1,0,0.75,0),8:(1,1,1,1,0,0,0.85,1),9:(1,1,1,1,0,1,1.0,0),10:(0,1,0,0,1,1,0.8,0),11:(0,1,1,1,1,0,0.65,0),
   12:(1,1,1,1,0,1,1.05,0),13:(0,1,1,1,1,0,0.7,1),14:(0,1,1,1,1,0,0.7,0),15:(1,1,1,1,1,0,1.1,1),16:(1,1,1,1,1,0,1.05,1),17:(0,1,1,1,1,0,0.55,1)}
RAMP={4:1.1,9:1.1,12:1.15,15:1.15}
nb=int(D/beat)+1
for b in range(nb):
    t=b*beat; i=sec(t); dr,ba,chd,me,pa,pu,lv,maj=S[i]; lv*=RAMP.get(i,1.0)
    prog=MAJ if maj else MIN; root,ch=prog[(b//4)%4]; M=melM if maj else mel
    if ba: put(t,note(m(root-12),beat*0.9,'bass'),(0.35 if b%2==0 else 0.2)*lv)
    if i in (0,3,10,12,17): put(t,note(0,0.02,'tick'),0.25*lv); put(t+beat/2,note(0,0.02,'tick'),0.15*lv)
    if dr:
        put(t,note(60,0.4,'kick'),(0.55 if b%4 in (0,2) else 0)*lv); put(t+beat*0.66,note(0,0.06,'hat'),0.12*lv); put(t,note(0,0.04,'hat'),0.06*lv)
        if b%4 in (1,3): put(t,note(0,0.15,'snap'),0.18*lv)
        if i in (4,9,12,15) : put(t+beat/4,note(0,0.04,'hat'),0.08*lv); put(t+3*beat/4,note(0,0.04,'hat'),0.08*lv)
    if chd: [put(t+beat/2,note(m(n),beat*0.45,'piz'),0.07*lv) for n in ch]
    if pu: put(t,note(m(root),beat*0.3,'pulse'),0.10*lv); put(t+beat/2,note(m(root),beat*0.3,'pulse'),0.07*lv)
    if pa and b%4==0: [put(t,note(m(n-12),beat*4,'pad'),0.035*lv) for n in ch]
    if me:
        for h in (0,1):
            n=M[(b*2+h)%32]
            if n: put(t+h*beat*0.66,note(m(n),beat*(0.9 if h==0 else 0.5),'acc'),0.07*lv); put(t+h*beat*0.66,note(m(n),beat*0.5,'mar'),0.04*lv)
# hits on key moments
sh_=lambda n:[x for x in P['shots'] if x['n']==n][0]['t0']
for tt_ in [0.15, sh_('sink'), sh_('order'), sh_('dent'), sh_('finale_title')]: put(tt_, note(m(38),1.5,'bass'),0.6); put(tt_, note(60,0.6,'kick'),0.8)
fi=int(0.05*sr); out[:fi]*=np.linspace(0,1,fi); fo=int(2.5*sr); out[-fo:]*=np.linspace(1,0,fo)
out=out/np.abs(out).max()*0.9
stc=np.stack([out,np.roll(out,int(0.012*sr))],1)
w=wave.open('build/music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((stc*32767).astype(np.int16).tobytes()); print('music ok')
