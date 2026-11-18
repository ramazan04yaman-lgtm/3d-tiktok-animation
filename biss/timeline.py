# Erzeugt den Ablauf (Zeiten aller Ereignisse) für Bild und Ton
import json
A = [  # id, Name, kg, Zusatz, Emoji, Objekt A (wird zerbissen), Objekt B (hält)
  ('croc', 'KROKODIL', 1670, 'gemessen', '🐊', 'kokos', 'bowling'),
  ('shark', 'WEISSER HAI', 1860, 'geschätzt', '🦈', 'bowling', 'auto'),
  ('trex', 'T-REX', 5800, 'geschätzt', '🦖', 'auto', 'tresor'),
  ('deino', 'DEINOSUCHUS', 10500, 'geschätzt', '🐊', 'tresor', 'container'),
  ('mega', 'MEGALODON', 18600, 'geschätzt', '🦈', 'container', None)]
R = []; t = 2.3
for i, (id_, name, kg, note, emo, oa, ob) in enumerate(A):
    r = dict(id=id_, name=name, kg=kg, note=note, emoji=emo, A=oa, B=ob, t0=t)
    r['tb'] = t + 0.85                      # Biss auf Objekt A
    r['crush'] = r['tb'] + (0.75 if id_ == 'mega' else 0.42)  # Objekt bricht
    if ob:
        r['swap'] = r['tb'] + 1.2            # Objekt B fährt ein
        r['tf'] = r['tb'] + 1.95             # Biss auf Objekt B (hält)
        r['exit'] = r['tf'] + 1.25
        t = r['tf'] + 1.45
    else:
        r['exit'] = None; r['final'] = r['crush'] + 1.0; t = r['final'] + 3.8
    R.append(r)
json.dump(dict(duration=round(t, 2), rounds=R), open('build/timeline.json', 'w'), ensure_ascii=False, indent=1)
print('Dauer', round(t, 2))
