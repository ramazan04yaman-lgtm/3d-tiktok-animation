import { IntroTitle, MeterHUD } from '../../engine/components/HUD';
import { Captions, Disclaimer, SceneChip, SubscribeCTA } from '../../engine/components/Overlay';
import { useTime } from '../../engine/time';
import { heatingTimeline } from './script';
import * as track from './script';

function Meters() {
  const t = useTime((s) => s.time);
  const s = track.hudSupply(t);
  if (s > 0.001) {
    const temp = track.supplyTemp(t);
    return <MeterHUD visible={s} value={String(Math.round(temp))} unit=" °C" fill={(temp - 20) / 55} color="#ff7a3a" scale={['20', '', '', '', '75 °C']} meta={<><div className="mx-on" style={{ color: '#ff7a3a' }}>● Brenner an</div><div>Vorlauftemperatur</div></>} />;
  }
  const reveal = t > track.T.reveal[0];
  const room = reveal ? track.roomReveal(t) : track.roomThermo(t);
  const open = 1 - track.expansion(room, 20);
  return (
    <MeterHUD
      visible={track.hudRoom(t)}
      value={room.toFixed(1).replace('.', ',')}
      unit=" °C"
      fill={(room - 14) / 16}
      color="#7fd0ff"
      scale={['14', '', '', '', '30 °C']}
      meta={reveal ? <><div>Raumtemperatur</div><div>Stufe 3 zu bei 20 °C</div></> : <><div className={open > 0.05 ? 'mx-on' : 'mx-off'}>{open > 0.05 ? '● Ventil offen' : '○ Ventil zu'}</div><div>Raumtemperatur</div></>}
    />
  );
}

export function HeatingOverlay() {
  return (
    <>
      <SceneChip timeline={heatingTimeline} hideBefore={track.T.boiler[0]} />
      <IntroTitle title="Die Heizung" outAt={3.6} />
      <Meters />
      <Captions timeline={heatingTimeline} />
      <SubscribeCTA at={track.T.cta[0]} duration={6.6} line="Mehr Maschinen von innen" />
      <Disclaimer text="Vereinfachte 3D-Darstellung · Moleküle stark vergrößert" />
    </>
  );
}
