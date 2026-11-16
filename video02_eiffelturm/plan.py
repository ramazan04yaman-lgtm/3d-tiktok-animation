# Shot schedule + subtitle chunks (shared by renderer, SFX and music)
import json
T=json.load(open('build/timeline.json')); S=T['sentences']; D=T['duration']
KEYS=set('EIFFELTURM SCHROTTHÄNDLER 1925 BETRÜGER VERMÖGEN 6 GEHEIM MISSTRAUISCH SCHMIERGELD KOFFER WIEN POLIZEI ENTKAM ALCATRAZ FALSCHGELD VERSCHROTTEN'.split())
shots=[]; words=[]; chunks=[]; d=1
for i,s in enumerate(S):
    st=s['t0'] if i else 0.0
    en=S[i+1]['t0'] if i+1<len(S) else s['t1']+0.6
    n=len(s['shots']); ln=(en-st)/n
    for k,name in enumerate(s['shots']):
        shots.append({"n":name,"t0":round(st+k*ln,3),"t1":round(st+(k+1)*ln,3),"si":i,"first":k==0,"dir":d})
    d=-d
    base=len(words)
    for w in s['words']: words.append({**w,"key":w['w'].upper().strip('!') in KEYS})
    # chunks: max 3 words / 18 chars, break after punctuation
    cur=[]; caps=s['words']
    raw=[x for x in json.load(open('script.json'))[i]['cap'].split()]
    for j,w in enumerate(caps):
        cur.append(base+j); txt=' '.join(words[c]['w'] for c in cur)
        if len(cur)>=3 or len(txt)>=14 or raw[j][-1] in '.,:!?' or j==len(caps)-1:
            chunks.append(cur); cur=[]
shots[-1]['t1']=D+1
ch=[]
for k,c in enumerate(chunks):
    t0=words[c[0]]['t0']-0.05; nxt=words[chunks[k+1][0]]['t0']-0.05 if k+1<len(chunks) else D
    t1=min(nxt, words[c[-1]]['t1']+0.6)
    ch.append({"idx":c,"t0":round(t0,3),"t1":round(t1,3)})
json.dump({"duration":D,"shots":shots,"words":words,"chunks":ch},open('build/plan.json','w'),ensure_ascii=False,indent=0)
print(len(shots),'shots', 'max len', max(s['t1']-s['t0'] for s in shots[:-1]), 'dur',D)
