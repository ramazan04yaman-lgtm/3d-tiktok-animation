# Procedural sound effects, cued from build/plan.json
import json, wave, numpy as np
sr=44100; P=json.load(open('build/plan.json')); D=P['duration']; N=int((D+1)*sr); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(3)
def tt(d): return np.arange(int(d*sr))/sr
def env(x,a=0.005,r=0.05):
    n=len(x); ai=max(1,int(a*sr)); ri=max(1,min(n-1,int(r*sr))); e=np.ones(n); e[:ai]=np.linspace(0,1,ai); e[-ri:]*=np.linspace(1,0,ri); return x*e
def lp(x,a): # one-pole lowpass, a in (0,1)
    y=np.empty_like(x); acc=0.0
    for i in range(len(x)): acc+=a*(x[i]-acc); y[i]=acc
    return y
def lpv(x,a): # vectorised-ish lowpass via cumulative filtering on blocks (fast approx)
    from numpy.lib.stride_tricks import sliding_window_view
    k=max(1,int(1/a)); ker=np.ones(k)/k; return np.convolve(x,ker,'same')
noise=lambda d: rng.standard_normal(int(d*sr))
def put(t,x,g=1.0,pan=0.0):
    i=int(t*sr); 
    if i<0: x=x[-i:]; i=0
    j=min(N,i+len(x)); x=x[:j-i]*g; L[i:j]+=x*(1-max(0,pan)); R[i:j]+=x*(1+min(0,pan))
# ---- synth bank
def whoosh(d=0.35,up=True):
    n=noise(d); t=tt(d); e=np.sin(np.pi*t/d)**2; x=lpv(n,0.15)*e; return x/np.abs(x).max()
def swish(d=0.18): return whoosh(d)*0.6
def boom(d=1.4):
    t=tt(d); f=40+60*np.exp(-t*8); x=np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*3); x+=lpv(noise(d),0.05)*np.exp(-t*10)*0.6; return env(x/np.abs(x).max(),0.002,0.3)
def pop():
    t=tt(0.12); x=noise(0.12)*np.exp(-t*60)+np.sin(2*np.pi*(900-3000*t)*t)*np.exp(-t*40); return x/np.abs(x).max()
def bloop():
    t=tt(0.18); f=300+900*t/0.18; x=np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*14); return env(x,0.003,0.03)
def click(): t=tt(0.04); return noise(0.04)*np.exp(-t*200)
def shot(): t=tt(0.25); x=noise(0.25)*np.exp(-t*30); x=lpv(x,0.3)+0.5*np.sin(2*np.pi*120*t)*np.exp(-t*25); return x/np.abs(x).max()
def snap(): t=tt(0.3); x=noise(0.3)*np.exp(-t*45)+np.sin(2*np.pi*(220-150*t)*t)*np.exp(-t*12)*0.6; return x/np.abs(x).max()
def hiss(d): x=noise(d); x=x-lpv(x,0.2); return env(x/np.abs(x).max(),0.05,0.1)
def wind(d):
    x=lpv(noise(d),0.02); t=tt(d); x*=0.6+0.4*np.sin(2*np.pi*0.3*t+1)*np.sin(2*np.pi*0.17*t); return env(x/np.abs(x).max(),0.2,0.3)
def jet(d=2.5):
    t=tt(d); x=lpv(noise(d),0.06)+0.3*np.sin(2*np.pi*(180-60*t/d)*t); e=np.exp(-((t-d/2)/(d/4))**2); return env(x*e/np.abs(x*e).max(),0.05,0.2)
def beep(f=1200,d=0.12): t=tt(d); return env(np.sin(2*np.pi*f*t),0.003,0.02)
def static(d): return env(noise(d)*0.5,0.01,0.05)
def zap(d):
    t=tt(d); x=np.sign(np.sin(2*np.pi*60*t))*0.5+np.sin(2*np.pi*120*t)*0.3; x*= (rng.random(len(t))<0.3)*0.7+0.3; x+=noise(d)*(rng.random(len(t))<0.02)*1.5; return env(x/np.abs(x).max(),0.005,0.05)
def powerdown(d=0.9): t=tt(d); f=420*np.exp(-t*3); x=np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*2); return env(x,0.002,0.1)
def clunk(): t=tt(0.25); x=np.sin(2*np.pi*90*t)*np.exp(-t*20)+noise(0.25)*np.exp(-t*60)*0.5; return x/np.abs(x).max()
def siren(d):
    t=tt(d); f=np.where((t*1.6)%1<0.5,960,770); x=np.sin(2*np.pi*np.cumsum(f)/sr)*0.6+0.25*np.sin(4*np.pi*np.cumsum(f)/sr); return env(x,0.05,0.2)
def shutter(): return np.concatenate([click(),np.zeros(int(0.03*sr)),click()*0.7])
def heart(): t=tt(0.5); b=lambda o: np.roll(np.sin(2*np.pi*55*t)*np.exp(-t*18),int(o*sr)); return b(0)+0.7*b(0.17)
def whistle(d=1.2,f0=1800,f1=500): t=tt(d); f=f0+(f1-f0)*t/d; return env(np.sin(2*np.pi*np.cumsum(f)/sr)*0.6,0.02,0.15)
def sting(): t=tt(1.0); x=sum(np.sin(2*np.pi*f*t) for f in [146.8,155.6,207.7])*np.exp(-t*2.5); x+=lpv(noise(1.0),0.1)*np.exp(-t*8)*0.5; return env(x/np.abs(x).max(),0.003,0.2)
def ding(): t=tt(1.2); x=(np.sin(2*np.pi*1318*t)+0.5*np.sin(2*np.pi*2637*t))*np.exp(-t*4); return env(x/1.5,0.002,0.2)
def sparkle(): x=np.zeros(int(0.9*sr)); 
def sparkle():
    out=np.zeros(int(1.0*sr))
    for k,f in enumerate([1568,1976,2349,3136,2637]): b=beep(f,0.35)*np.exp(-tt(0.35)*8); i=int(k*0.08*sr); out[i:i+len(b)]+=b*0.5
    return out
def sad(): out=np.zeros(int(1.6*sr))
def sad():
    out=np.zeros(int(1.8*sr))
    for k,f in enumerate([392,370,349,330]):
        d=0.35 if k<3 else 0.8; t=tt(d); x=(np.sign(np.sin(2*np.pi*f*t))*0.3+np.sin(2*np.pi*f*t))*np.exp(-t*1.5); x=lpv(x,0.25); i=int(k*0.33*sr); out[i:i+len(x)]+=env(x,0.01,0.05)*0.5
    return out
def tv(d): return env(lpv(noise(d),0.5)*0.4,0.01,0.01)
def creak(): t=tt(0.4); f=300+80*np.sin(2*np.pi*7*t); x=np.sin(2*np.pi*np.cumsum(f)/sr)*(rng.random(len(t))*0.5+0.5)*np.sin(np.pi*t/0.4); return lpv(x,0.3)
def saw(d): t=tt(d); x=noise(d)*(0.5+0.5*np.sin(2*np.pi*8*t))**2; return env(lpv(x,0.25),0.01,0.02)
def riser(d): t=tt(d); x=noise(d); x=x-lpv(x,0.05); return env(x*(t/d)**2,0.01,0.02)
def birds(d):
    out=np.zeros(int(d*sr))
    for k in range(int(d*3)):
        i=int(rng.random()*(d-0.3)*sr); tt_=tt(0.12); f=2500+1500*np.sin(2*np.pi*tt_/0.12); b=np.sin(2*np.pi*np.cumsum(f)/sr)*np.sin(np.pi*tt_/0.12); out[i:i+len(b)]+=b*0.3
    return out
def blips(d): out=np.zeros(int(d*sr)); [out.__setitem__(slice(int(k*0.5*sr),int(k*0.5*sr)+int(0.08*sr)), beep(1500,0.08)*0.5) for k in range(int(d/0.5))]; return out
def accordion(d):
    t=tt(d); out=np.zeros(len(t)); notes=[(0,[293.7,349.2,440]),(0.5,[261.6,329.6,392]),(1.0,[293.7,349.2,440])]
    for st_,ch in notes:
        x=sum(np.sin(2*np.pi*f*t)+0.4*np.sin(2*np.pi*2.003*f*t) for f in ch)*(1+0.3*np.sin(2*np.pi*6*t)); w=((t>=st_*d)&(t<(st_+0.5)*d)); out+=x*w
    return env(out/np.abs(out).max(),0.05,0.3)
def kaching(): t=tt(1.0); x=(np.sin(2*np.pi*2093*t)+np.sin(2*np.pi*2637*t)*0.7+np.sin(2*np.pi*3136*t)*0.5)*np.exp(-t*5); return env(np.concatenate([click()*0.8,x/2]),0.001,0.2)
def rustle(d): x=noise(d); x=x-lpv(x,0.3); t=tt(d); return env(x*(0.5+0.5*np.abs(np.sin(2*np.pi*7*t))),0.02,0.05)*0.6
def chug(d): t=tt(d); x=noise(d)*np.maximum(0,np.sin(2*np.pi*3.2*t))**6; return env(lpv(x,0.2),0.05,0.1)
def trainwhistle(d=1.2): t=tt(d); x=sum(np.sin(2*np.pi*f*t) for f in (523,622,784))*np.minimum(1,t/0.1); return env(x/3,0.05,0.25)
def policewhistle(d=0.9): t=tt(d); x=np.sin(2*np.pi*(2800+200*np.sign(np.sin(2*np.pi*25*t)))*t); return env(x*0.6,0.01,0.1)
def steps(d,rate=6): out=np.zeros(int((d+0.1)*sr)); [out.__setitem__(slice(int(k/rate*sr),int(k/rate*sr)+int(0.06*sr)), (lpv(noise(0.06),0.3)*np.exp(-tt(0.06)*60))) for k in range(int(d*rate))]; return out
def gulls(d):
    out=np.zeros(int(d*sr))
    for k in range(int(d*1.5)):
        i=int(rng.random()*(d-0.5)*sr); t=tt(0.4); f=1400-600*t/0.4+200*np.sin(2*np.pi*12*t); b=np.sin(2*np.pi*np.cumsum(f)/sr)*np.sin(np.pi*t/0.4); out[i:i+len(b)]+=b*0.35
    return out
def waves(d): x=lpv(noise(d),0.03); t=tt(d); return env(x*(0.5+0.5*np.sin(2*np.pi*0.25*t)),0.3,0.3)
def clang(): t=tt(1.2); x=sum(np.sin(2*np.pi*f*t)*np.exp(-t*k) for f,k in ((180,3),(437,4),(913,6),(1530,8))); x+=noise(1.2)*np.exp(-t*40); return env(x/np.abs(x).max(),0.001,0.3)
def door(): t=tt(0.5); x=np.sin(2*np.pi*70*t)*np.exp(-t*12)+noise(0.5)*np.exp(-t*25)*0.6; return x/np.abs(x).max()
def pressloop(d): out=np.zeros(int(d*sr)); [out.__setitem__(slice(int(k*0.42*sr),int(k*0.42*sr)+int(0.25*sr)), clunk()*0.7) for k in range(int(d/0.42))]; return out
def whisper_(d): x=noise(d); x=x-lpv(x,0.2); t=tt(d); return env(x*np.abs(np.sin(2*np.pi*3*t))*0.25,0.05,0.1)
def horn(): t=tt(0.7); f=np.where(t<0.3,420,330)*(1+0.03*np.sin(2*np.pi*30*t)); x=np.sign(np.sin(2*np.pi*np.cumsum(f)/sr))*0.5+np.sin(2*np.pi*np.cumsum(f)/sr); return env(lpv(x,0.3),0.02,0.1)
def murmur(d): x=lpv(noise(d),0.08); t=tt(d); x*= 0.6+0.4*np.abs(np.sin(2*np.pi*1.7*t)*np.sin(2*np.pi*0.6*t)); return env(x/np.abs(x).max(),0.3,0.3)
def typewriter(d): out=np.zeros(int(d*sr)); k=0.0
    
def typewriter(d):
    out=np.zeros(int(d*sr)); tt_=0.0
    while tt_<d-0.1: c=click()*0.8; i=int(tt_*sr); out[i:i+len(c)]+=c; tt_+=0.06+rng.random()*0.07
    return out
def mg(d,rate=9.5):
    out=np.zeros(int(d*sr))
    for k in range(int(d*rate)):
        x=shot()*(0.8+0.2*rng.random()); i=int(k/rate*sr); n=min(len(x),len(out)-i)
        if n>0: out[i:i+n]+=x[:n]
    return out
def engine(d): t=tt(d); f=38+4*np.sin(2*np.pi*0.7*t); x=np.sign(np.sin(2*np.pi*np.cumsum(f)/sr))*0.5+lpv(noise(d),0.1)*0.6; return env(lpv(x,0.25),0.1,0.2)
def thrum(d=0.8): t=tt(d); x=np.sin(2*np.pi*70*t)*(0.5+0.5*np.sign(np.sin(2*np.pi*9*t)))*np.exp(-t*2.5); return env(lpv(x,0.3),0.01,0.1)
def boing(): t=tt(0.5); f=200+150*np.sin(2*np.pi*9*t)*np.exp(-t*5); x=np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*6); return env(x,0.005,0.05)
def pecks(d,rate=5): out=np.zeros(int((d+0.1)*sr)); [out.__setitem__(slice(int(k/rate*sr),int(k/rate*sr)+int(0.04*sr)), click()*0.8) for k in range(int(d*rate))]; return out
def crunch(): t=tt(0.6); x=noise(0.6)*(rng.random(len(t))<0.15)*np.exp(-t*6); x+=np.sin(2*np.pi*80*t)*np.exp(-t*15); return env(x/np.abs(x).max(),0.002,0.1)
OUT={'outback_wide','farm','farmer','emu_arrive','emu_horde','emu_eat','fence_break','major','squad','ammo','war_title','standoff','scatter','scatter_top','speedo','truck','truck_bumpy','emu_overtake','retreat','second_try','ammo_empty','emus_still','major_quote','emu_army','finale_title','question','h_army','h_emu','newspaper'}
for s in P['shots']:
    n=s['n']; t0=s['t0']; t1=min(s['t1'],D); d=t1-t0; at=lambda f: t0+f*d
    if t0>0: put(t0-0.08, whoosh(0.32) if s['first'] else swish(0.2), 0.22 if s['first'] else 0.1, 0.4*s['dir'])
    if n in OUT: put(t0, wind(d+0.1)*0.6, 0.08)
    if n in ('farmer_letter','minister'): put(t0, hiss(d)*0.2, 0.03)
    if n=='h_army': put(0,whoosh(0.9),0.5); put(t0+0.15,boom(),0.9); put(t0+0.15,mg(d-0.15),0.45); put(at(0.55),clunk(),0.9); put(at(0.56),sting(),0.3)
    if n=='h_emu': put(at(0.2),thrum(),0.5); put(at(0.5),bloop(),0.3); put(at(0.62),bloop(),0.25)
    if n=='outback_wide': put(t0,birds(d),0.12)
    if n=='farm': put(t0,birds(d),0.1); [put(at(0.1+k*0.22),crunch()*0.4,0.25) for k in range(4)]
    if n=='farmer': put(at(0.3),ding(),0.35)
    if n=='emu_arrive': [put(at(k*0.06)+0.05,boing(),0.25) for k in range(9)]; put(t0,riser(d)*0.5,0.12)
    if n=='emu_horde': put(t0,steps(d,22),0.45); put(t0,thrum(1.2),0.4); put(t0,wind(d)*0.8,0.15)
    if n=='emu_eat': put(t0,pecks(d,6),0.35); put(at(0.3),crunch(),0.3); put(at(0.4),sad(),0.2)
    if n=='fence_break': put(t0,steps(d,18),0.4); put(at(0.38),boom(0.9),0.7); put(at(0.38),clang()*0.6,0.4); put(at(0.4),crunch(),0.6)
    if n=='farmer_letter': put(t0,saw(d*0.65)*0.25,0.15); put(at(0.7),whoosh(0.5),0.35)
    if n=='minister': put(at(0.45),rustle(0.3),0.25); put(at(0.52),clunk(),1.0); put(at(0.53),boom(0.8),0.5)
    if n=='major': put(at(0.1),sparkle(),0.3); put(at(0.12),ding(),0.3)
    if n=='squad': [put(at(0.05+k*0.12),click(),0.4) for k in range(2)]; put(at(0.05),pop(),0.3); put(at(0.4),pop(),0.3); put(at(0.42),clunk(),0.5)
    if n=='ammo': [put(at(k*0.07)+0.08,clunk(),0.45) for k in range(10)]
    if n=='war_title': put(t0,boom(),0.9); put(t0+0.1,sting(),0.35); put(t0,policewhistle(),0.12)
    if n=='standoff': put(t0,wind(d)*0.9,0.2); put(at(0.5),whoosh(0.4),0.2); put(at(0.62),bloop(),0.25)
    if n=='scatter': put(t0,mg(d),0.42); put(at(0.12),boing(),0.3); put(at(0.2),steps(d*0.8,20),0.4); put(at(0.22),thrum(),0.3)
    if n=='scatter_top': put(t0,mg(d),0.35); put(t0,steps(d,20),0.35); put(at(0.3),boing(),0.25)
    if n=='speedo': put(t0,steps(d,14),0.5); put(t0,riser(d),0.25); put(at(0.5),whoosh(0.5),0.35)
    if n=='truck': put(at(0.1),clunk(),0.6); put(at(0.3),ding(),0.3); put(at(0.55),engine(d*0.5),0.35); put(at(0.6),horn(),0.25)
    if n=='truck_bumpy': put(t0,engine(d),0.4); put(t0,mg(d),0.25); [put(t0+k*0.35,clunk()*0.7,0.35) for k in range(int(d/0.35))]; put(at(0.3),boing(),0.25)
    if n=='emu_overtake': put(t0,engine(d),0.35); put(t0,steps(d,16),0.35); put(at(0.45),whoosh(0.5),0.35); put(at(0.55),bloop(),0.3)
    if n=='retreat': put(t0,steps(d,3),0.2); put(at(0.1),sad(),0.3); put(at(0.3),bloop(),0.2)
    if n=='newspaper': put(t0,whoosh(0.5),0.3); put(at(0.5),rustle(0.4),0.35); put(at(0.5),ding(),0.3)
    if n=='second_try': put(t0,mg(d),0.4); put(t0+0.15,boom(0.8),0.5); put(at(0.3),steps(d*0.7,18),0.3)
    if n=='ammo_empty': put(t0,typewriter(d*0.6),0.2); put(at(0.2),[clunk()][0],0.3); put(at(0.6),sad(),0.25)
    if n=='emus_still': put(t0,pecks(d,4),0.25); put(t0,birds(d),0.1); put(at(0.3),bloop(),0.3)
    if n=='major_quote': put(at(0.2),sting(),0.25); put(at(0.5),ding(),0.25)
    if n=='emu_army': put(t0,steps(d,4),0.5); put(t0,thrum(1.0),0.4); [put(t0+k*0.5,clunk()*0.5,0.3) for k in range(int(d/0.5))]
    if n=='finale_title': put(t0,boom(),0.8); put(t0+0.1,sparkle(),0.35); put(t0,accordion(d+0.3),0.12)
    if n=='question': put(t0,sparkle(),0.35); put(t0+0.4,ding(),0.35); put(t0+1.2,bloop(),0.35); put(t0+1.3,bloop(),0.3)
m=max(np.abs(L).max(),np.abs(R).max()); st=np.stack([L,R],1)/m*0.9
w=wave.open('build/sfx.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype(np.int16).tobytes()); print('sfx ok', m)
