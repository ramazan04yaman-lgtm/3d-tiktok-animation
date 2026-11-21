import numpy as np, json, wave
SR=44100; TL=json.load(open('timeline.json')); TOT=TL[-1]['start']+TL[-1]['dur']+0.6
N=int(TOT*SR); t=np.arange(N)/SR; rng=np.random.default_rng(3)
def note(f): return 440*2**((f-69)/12)
BPM=84; beat=60/BPM; bar=4*beat
prog=[[50,57,62,65],[46,53,58,62],[53,57,60,65],[48,55,60,64]]  # Dm Bb F C
mus=np.zeros(N)
def add(sig,start):
    i=int(start*SR); j=min(N,i+len(sig))
    if i<N: mus[i:j]+=sig[:j-i]
def tone(f,dur,harm=(1,.5,.25,.12),att=0.01,dec=1.5):
    n=int(dur*SR); x=np.arange(n)/SR
    s=sum(a*np.sin(2*np.pi*f*k*x+k) for k,a in enumerate(harm,1))
    env=np.minimum(1,x/att)*np.exp(-x/dec); return s*env
nb=int(TOT/bar)+1
for b in range(nb):
    ch=prog[b%4]; st=b*bar
    # pad
    n=int(bar*SR*1.1); x=np.arange(n)/SR
    pad=sum(np.sin(2*np.pi*note(m)*x*(1+d))+0.3*np.sin(4*np.pi*note(m)*x) for m in ch[1:] for d in (-0.003,0.003))
    env=np.minimum(1,x/0.8)*np.minimum(1,(bar*1.1-x)/0.6); add(pad*env*0.035,st)
    # sub bass
    add(tone(note(ch[0]-12),bar,harm=(1,.3),att=0.05,dec=2.5)*0.28,st)
    # piano arpeggio (8ths)
    arp=[ch[1]+12,ch[2]+12,ch[3]+12,ch[2]+12]
    for k in range(8):
        add(tone(note(arp[k%4]),1.6,harm=(1,.4,.15,.08,.04),att=0.004,dec=0.6)*0.07*(1.0 if k%2==0 else .7),st+k*beat/2)
    # kick + hat after hook
    if st>TL[1]['start']:
        for k in range(4):
            x=np.arange(int(0.35*SR))/SR
            kick=np.sin(2*np.pi*(45+90*np.exp(-x*30))*x)*np.exp(-x*9)
            if k in (0,2): add(kick*0.45,st+k*beat)
            h=rng.normal(0,1,int(0.05*SR)); h=np.diff(h,prepend=0)*np.exp(-np.arange(len(h))/SR*80)
            add(h*0.03,st+k*beat+beat/2)
# ---------- SFX
sfx=np.zeros(N)
def sadd(sig,st,g=1):
    i=int(st*SR); j=min(N,i+len(sig))
    if 0<=i<N: sfx[i:j]+=sig[:j-i]*g
def pop():
    x=np.arange(int(0.12*SR))/SR; return np.sin(2*np.pi*(900*np.exp(-x*25)+300)*x)*np.exp(-x*35)
def whoosh(d=0.5):
    n=int(d*SR); x=np.arange(n)/SR; w=rng.normal(0,1,n)
    w=np.convolve(w,np.ones(12)/12,'same'); return w*np.sin(np.pi*x/d)**2
def tick():
    x=np.arange(int(0.03*SR))/SR; return np.sin(2*np.pi*2500*x)*np.exp(-x*200)
def riser(d):
    n=int(d*SR); x=np.arange(n)/SR; w=rng.normal(0,1,n); return np.convolve(w,np.ones(6)/6,'same')*(x/d)**2+np.sin(2*np.pi*(200+600*x/d)*x)*(x/d)**2*0.3
def impact():
    x=np.arange(int(1.5*SR))/SR; return np.sin(2*np.pi*(40+60*np.exp(-x*8))*x)*np.exp(-x*3)+rng.normal(0,1,len(x))*np.exp(-x*20)*0.3
def ding():
    return tone(note(86),2.0,harm=(1,.3,.1),dec=0.8)+tone(note(93),2.0,harm=(1,.2),dec=0.7)*0.6
for i,s in enumerate(TL):
    if i>0: sadd(whoosh(0.45),s['start']-0.2,0.12)
    pass
sadd(impact(),3.8,0.3); sadd(impact(),5.8,0.3)
sadd(impact(),10.0,0.4)
sadd(riser(3.0),13.0,0.12); sadd(ding(),16.2,0.3); sadd(impact(),18.0,0.45); sadd(ding(),18.0,0.25)
# ---------- voice + ducking
w=wave.open('vo.wav'); vo=np.frombuffer(w.readframes(w.getnframes()),np.int16)/32768; vsr=w.getframerate()
vo=np.interp(np.arange(int(len(vo)*SR/vsr))/SR, np.arange(len(vo))/vsr, vo); V=np.zeros(N); V[:min(N,len(vo))]=vo[:N]
env=np.convolve(np.abs(V),np.ones(4410)/4410,'same'); duck=1-0.45*np.clip(env/0.05,0,1)
mus=np.convolve(mus,[0.5,0.5],'same')*duck
fade=np.minimum(1,(TOT-t)/1.2)
mix=V*1.0+mus*1.0*fade+sfx
mix=np.tanh(mix*1.1)/np.tanh(1.1); mix=mix/np.abs(mix).max()*0.95
st=np.stack([mix,mix],1)
o=wave.open('mix.wav','wb'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((st*32767).astype(np.int16).tobytes())
print('ok',TOT)
