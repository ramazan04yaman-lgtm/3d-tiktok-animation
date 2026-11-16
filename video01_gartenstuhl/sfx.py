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
SKY={'hook_sky','hook_face','hook_feet','rise_wide','scared_close','scared_wide','scared_gun','jet_pass','jet_pass_close','jet_wide','wave_plane','aim','pop','sink','gun_fall','nooo','finale','finale_title','rocket_top'}
for s in P['shots']:
    n=s['n']; t0=s['t0']; t1=min(s['t1'],D); d=t1-t0; at=lambda f: t0+f*d
    if t0>0: put(t0-0.08, whoosh(0.32) if s['first'] else swish(0.2), 0.22 if s['first'] else 0.1, 0.4*s['dir'])
    if n in SKY: put(t0, wind(d+0.1), 0.10 if n.startswith('finale') else 0.16)
    if n=='hook_sky': put(0,boom(),0.9); put(0,whoosh(0.8),0.5); put(at(0.35),jet(1.6),0.35,-0.3)
    if n in('hook_face','rise_wide','hook_feet'): [put(at(k/6),click(),0.05) for k in range(6)]
    if n=='kid_dream': put(t0,birds(d),0.18); put(t0,jet(d)*0.5,0.12)
    if n=='kid_close': put(at(0.4),sparkle(),0.3)
    if n=='eye_face': put(at(0.4),clunk(),0.7); put(at(0.48),sad(),0.28)
    if n=='eye_pov': put(t0,whistle(d,600,500)*0.3,0.1)
    if n=='tanks_pan': put(t0,hiss(d),0.22)
    if n=='inflate': put(t0,hiss(d),0.14); put(at(0.5),creak(),0.2)
    if n=='inflate_close': put(t0,creak(),0.25); put(at(0.6),creak(),0.2)
    if n=='tie_chair': put(at(0.2),creak(),0.2); put(at(0.6),click(),0.3)
    if n in('props_sandwich','props_beer'): put(at(0.05),bloop(),0.45)
    if n=='props_gun': put(at(0.05),bloop(),0.4); put(at(0.35),bloop(),0.4); put(at(0.45),click(),0.4)
    if n=='plan_smug': put(at(0.2),ding(),0.3)
    if n=='hover_low': put(t0,sparkle(),0.15)
    if n=='plan_shoot': put(at(0.6),shot(),0.45); put(at(0.61),pop(),0.5)
    if n=='cut_rope': put(t0,saw(0.55*d),0.25); put(at(0.55),snap(),0.8); put(at(0.3),riser(0.25*d+0.3),0.25)
    if n=='rocket_up': put(t0,whoosh(d),0.6); put(t0,boom(),0.6); put(t0,wind(d),0.3)
    if n=='rocket_top': put(t0,whoosh(d),0.4)
    if n=='friends_shock': put(t0,sting(),0.35)
    if n.startswith('scared'): [put(t0+k*0.75,heart(),0.4) for k in range(int(d/0.75)+1)]
    if n=='jet_pass': put(at(0.2),jet(d*0.9),0.55,-0.2)
    if n=='jet_pass_close': put(at(0.25),jet(d),0.6,0.3)
    if n=='jet_wide': put(t0,jet(d+0.5)*0.6,0.3)
    if n=='pilot_face': put(t0,beep(1000,0.15),0.3); put(t0+0.15,static(d-0.2),0.08); put(t1-0.15,beep(800,0.12),0.25)
    if n=='tower': put(t0,blips(d),0.2)
    if n=='wave_plane': put(t0,jet(d)*0.5,0.2)
    if n=='aim': put(at(0.5),click(),0.5); put(at(0.62),click(),0.4)
    if n=='pop': [ (put(at((k+0.25)/4),shot(),0.4), put(at((k+0.27)/4),pop(),0.65)) for k in range(4)]
    if n=='sink': put(t0,whistle(d,900,500),0.15)
    if n=='gun_fall': put(t0,whistle(d+0.3,1700,300),0.3)
    if n=='nooo': put(t0,sting(),0.45)
    if n=='powerline': put(at(0.3),zap(0.7*d),0.4); put(at(0.3),boom(0.8),0.4)
    if n=='zap_face': put(t0,zap(d),0.45)
    if n=='blackout_tv': put(t0,tv(0.4*d),0.12); put(at(0.4),powerdown(),0.5); put(at(0.4),clunk(),0.5)
    if n=='blackout': [put(at(0.15+k*0.075),clunk(),0.3,(k-3)/4) for k in range(6)]; put(at(0.15),powerdown(1.2),0.35)
    if n=='police_car': put(t0,siren(d+0.5),0.22)
    if n=='arrest': put(t0,siren(d)*0.5,0.12)
    if n=='cuffs_close': put(at(0.3),click(),0.7); put(at(0.33),click(),0.6)
    if n=='reporter': [put(t0+k*0.7,shutter(),0.35) for k in range(int(d/0.7)+1)]
    if n=='quote_face': put(at(0.85),ding(),0.25)
    if n=='finale': put(t0,birds(d),0.12)
    if n=='finale_title': put(t0,boom(),0.8); put(t0+0.1,sparkle(),0.35)
m=max(np.abs(L).max(),np.abs(R).max()); st=np.stack([L,R],1)/m*0.9
w=wave.open('build/sfx.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st*32767).astype(np.int16).tobytes()); print('sfx ok', m)
