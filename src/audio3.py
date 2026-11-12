# Original music bed + procedural SFX for v3 (no third-party audio). usage: python3 src/audio3.py build/v3
import json, numpy as np, wave, sys
B=sys.argv[1]; TL=json.load(open(f'{B}/timeline.json')); SFX=json.load(open(f'{B}/sfx.json'))
SR=44100; T=TL['total']; n=int(SR*T); t=np.arange(n)/SR; rng=np.random.default_rng(7); f=lambda m:440*2**((m-69)/12)
def put(buf,s,seg):
    i=int(s*SR); e=min(len(buf),i+len(seg))
    if i<len(buf): buf[i:e]+=seg[:e-i]
def env(L,a,d): x=np.arange(L)/SR; return np.clip(x/a,0,1)*np.exp(-x/d)
# ---- music: suspense bed (Dm), pulsing bass, music box, rises toward the reveal ----
mus=np.zeros(n); bpm=92; beat=60/bpm
chords=[[50,53,57],[46,50,53],[48,52,55],[45,49,52]]
for i in range(int(T/(4*beat))+2):
    s=i*4*beat; L=int(4.6*beat*SR); x=np.arange(L)/SR; w=np.clip(x/.6,0,1)*np.clip((4.6*beat-x)/.8,0,1); seg=np.zeros(L)
    for nt in chords[i%4]:
        for d in(-.12,.12): seg+=np.sin(2*np.pi*f(nt-12)*(1+d/100)*x)*.03
    put(mus,s,seg*w)
reveal=next(s['start'] for s in TL['segs'] if s['text'].startswith('Es war Leon'))
k=0
while k*beat/2<T-1:
    s=k*beat/2; L=int(.22*SR); x=np.arange(L)/SR; nt=chords[int(s/(4*beat))%4][0]-24
    amp=.05+.09*np.clip((s-20)/(reveal-20),0,1) if s<reveal else .14
    put(mus,s,np.sin(2*np.pi*f(nt)*x)*np.exp(-x/.06)*amp); k+=1
mel=[74,77,81,79,77,74,72,74]; k=0; s=.3
while s<T-1.5:
    L=int(1.5*SR); x=np.arange(L)/SR; fr=f(mel[k%8]); put(mus,s,(np.sin(2*np.pi*fr*x)+.3*np.sin(4*np.pi*fr*x))*np.exp(-x/.5)*.045); k+=1; s+=beat*(1 if k%4 else 2)
mus*=np.clip((T-t)/1.5,0,1)
# ---- sfx ----
sfx=np.zeros(n)
def tone(fr,L,d,a=1): x=np.arange(int(L*SR))/SR; return np.sin(2*np.pi*fr*x)*np.exp(-x/d)*a
def noise(L,d,a=1,lp=1): z=rng.standard_normal(int(L*SR)); z=np.convolve(z,np.ones(lp)/lp,'same'); return z*env(len(z),.005,d)*a
def sweep(f0,f1,L,a=1): x=np.linspace(0,1,int(L*SR)); return np.sin(2*np.pi*np.cumsum(f0+(f1-f0)*x)/SR)*a
def A(*xs):
    L=max(len(x) for x in xs); o=np.zeros(L)
    for x in xs: o[:len(x)]+=x
    return o
S={}
L=int(.9*SR); x=np.arange(L)/SR; S['buzz']=np.sin(2*np.pi*165*x)*(np.sin(2*np.pi*165*x)>0)*((x%.45)<.3)*.35
S['ping']=A(tone(1320,.5,.12,.3),tone(1980,.5,.08,.15))
S['hit']=A(sweep(110,35,1.2,.8)*env(int(1.2*SR),.002,.35),noise(.6,.08,.25,4))
S['sting']=sum(np.sin(2*np.pi*fr*np.arange(int(1.6*SR))/SR) for fr in (311,329.6,466))*env(int(1.6*SR),.01,.5)*.12
S['sting']=A(S['sting'],sweep(80,30,1,.5)*env(int(SR),.002,.3))
S['whoosh']=noise(.5,.2,.35,30)*np.sin(np.linspace(0,np.pi,int(.5*SR)))
S['laugh']=sum(np.roll(np.pad(noise(.12,.05,.25,6)*np.sin(2*np.pi*np.linspace(0,30,int(.12*SR))),(0,int(.8*SR))),int(i*.15*SR)) for i in range(5))
S['success']=np.concatenate([tone(880,.12,.08,.25),tone(1320,.4,.15,.25)])
S['birds']=sum(np.roll(np.pad(sweep(3000,4200,.08,.12)*env(int(.08*SR),.002,.03),(0,int(1.2*SR))),int(i*.23*SR)) for i in range(5))
S['drone']=sweep(55,52,2.5,.35)*np.clip(np.linspace(0,4,int(2.5*SR)),0,1)*np.clip(np.linspace(4,0,int(2.5*SR)),0,1)
S['heart']=sum(np.roll(np.pad(tone(55,.25,.07,.9),(0,int(1.3*SR))),int(o*SR)) for o in (0,.22,.75,.97))
S['creak']=np.sin(2*np.pi*np.cumsum(300+120*np.sin(np.linspace(0,14,int(1.2*SR))))/SR)*noise(1.2,.6,1,1)*.15
S['beep']=tone(2200,.12,.05,.25)
S['steps']=sum(np.roll(np.pad(noise(.08,.03,.5,20),(0,int(1.5*SR))),int(i*.18*SR)) for i in range(8))
L=int(2.5*SR); x=np.arange(L)/SR; S['siren']=np.sin(2*np.pi*np.cumsum(700+250*np.sign(np.sin(2*np.pi*1.4*x)))/SR)*np.clip((2.5-x)/1,0,1)*.07
S['type']=sum(np.roll(np.pad(noise(.03,.01,.35,2),(0,int(1.5*SR))),int(rng.uniform(0,1.4)*SR)) for i in range(12))
S['counter']=sum(np.roll(np.pad(tone(1800+i*40,.05,.02,.12),(0,int(1.5*SR))),int(i*.09*SR)) for i in range(14))
S['laughEvil']=sum(np.roll(np.pad(sweep(220-i*8,180-i*8,.14,.25)*env(int(.14*SR),.01,.06),(0,int(1.2*SR))),int(i*.16*SR)) for i in range(6))
for s,name in SFX: put(sfx,s,S[name])
# every hard cut gets a soft whoosh tick, like the reference edits
cuts=[]
for i,sg in enumerate(TL['segs']):
    end=TL['segs'][i+1]['start'] if i+1<len(TL['segs']) else T; m=len(sg['shots'])
    cuts+= [sg['start']+(end-sg['start'])*k/m for k in range(m)]
for c in cuts[1:]: put(sfx,c-.12,noise(.25,.1,.06,40))
for name,buf in (('music',mus),('sfx',sfx)):
    buf=buf/max(1e-9,np.abs(buf).max())*.9
    w=wave.open(f'{B}/{name}.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((buf*32767).astype('<i2').tobytes()); w.close()
print('ok', len(SFX),'sfx', len(cuts),'cuts')
