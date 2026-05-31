const SETTINGS_HELP={
  de:{
    default:'Wert auswählen, hier siehst du wofür die Einstellung ist.',
    'set-refresh-sec':'Wie oft neue Daten geladen werden. Kleiner = aktueller, aber mehr Last.',
    'set-max-active':'Begrenzt gleichzeitig sichtbare Raketen. Niedriger = weniger GPU/CPU. Kein Maximum — beliebig hoch einstellen.',
    'set-max-pending':'Maximale Gesamt-Warteschlange für Raketen. Bei vielen Angriffen erhöhen. Kein Maximum.',
    'set-max-batch':'Wie viele neue Raketen pro Tick gestartet werden. Kein Maximum.',
    'set-performance-preset':'Preset für typische Lastprofile. Danach kannst du feinjustieren.',
    'set-duration-sec':'Flugzeit einer Rakete vom Start bis Ziel. 1–20 Sekunden.',
    'set-stagger-ms':'Abstand zwischen Raketen derselben IP. 50–5000 ms.',
    'set-ui-throttle':'Wie oft die Replay-Karte (Dots/Panels) neu gezeichnet wird.',
    'set-label-throttle':'Wie oft Flight-Labels aktualisiert werden.',
    'set-replay-min':'Replay-Laufzeit bei 1x (Zeitskala). 1–30 Minuten.',
    'set-spawn-mode':'Definiert, ob pro Angriff, pro IP+Zeit oder nur pro IP eine Rakete entsteht.',
    'set-queue-ip':'Begrenzt Warteschlange je IP, verhindert Überlauf bei Brute-Force.',
    'set-rocket-style':'Neu = fliegende Rakete mit Schweif, Console = gestrichelte Bögen wie CrowdSec-Karte, Minimal = kurzer Strich.',
    'set-tail-classic':'Länge des Schweifs beim neuen Stil in Prozent.',
    'set-lane-spread':'Seitlicher Abstand paralleler Bahnen.',
    'set-max-arcs':'Maximale Anzahl gleichzeitiger Console-Bögen (Stil: Console). Höher = mehr Bögen, aber mehr GPU. 10–500.',
    'set-show-labels':'Ein-/Ausblenden der Herkunfts-Labels am Startpunkt.',
    'set-max-labels':'Maximale Anzahl sichtbarer Labels gleichzeitig (0–30).',
    'set-override-coords':'Wenn aktiv, werden Docker-Koordinaten lokal überschrieben.',
    'set-server-lat':'Server-Breitengrad (LAT).',
    'set-server-lon':'Server-Längengrad (LON).',
    'set-server-name':'Name des Home-Punkts auf der Karte.',
  },
  en:{
    default:'Select a value to see what this setting does.',
    'set-refresh-sec':'How often new data is fetched. Lower = fresher but heavier.',
    'set-max-active':'Limit simultaneous rockets. Lower reduces GPU/CPU. No upper limit — set as high as you want.',
    'set-max-pending':'Maximum total queued rockets. Increase for high-traffic servers. No upper limit.',
    'set-max-batch':'How many rockets can start per tick. No upper limit.',
    'set-performance-preset':'Quick profile for common load targets.',
    'set-duration-sec':'Flight time from source to destination. 1–20 seconds.',
    'set-stagger-ms':'Gap between rockets from the same IP. 50–5000 ms.',
    'set-ui-throttle':'How often replay map UI redraws.',
    'set-label-throttle':'How often flight labels refresh.',
    'set-replay-min':'Replay duration at 1x speed. 1–30 minutes.',
    'set-spawn-mode':'Choose per attack, per IP+time, or IP-only launch mode.',
    'set-queue-ip':'Queue cap per IP to avoid flooding.',
    'set-rocket-style':'New = flying rocket tail, Console = dashed arcs like CrowdSec map, Minimal = short segment.',
    'set-tail-classic':'Tail length (new style) in percent.',
    'set-lane-spread':'Side offset for parallel routes.',
    'set-max-arcs':'Maximum simultaneous console arcs (style: Console). Higher = more arcs but more GPU. 10–500.',
    'set-show-labels':'Show/hide source labels.',
    'set-max-labels':'Maximum visible labels (0–30).',
    'set-override-coords':'Override Docker coordinates locally.',
    'set-server-lat':'Server latitude (LAT).',
    'set-server-lon':'Server longitude (LON).',
    'set-server-name':'Home marker label.',
  }
};

function updateSettingsHelpForField(id){
  const box=document.getElementById('settings-help-box');
  if(!box)return;
  const lang=SETTINGS_HELP[currentLang]||SETTINGS_HELP.de;
  box.textContent=lang[id]||lang.default;
}

function initSettingsHelpBindings(){
  const ids=['set-refresh-sec','set-max-active','set-max-pending','set-max-batch','set-performance-preset','set-duration-sec','set-stagger-ms','set-ui-throttle','set-label-throttle','set-replay-min','set-spawn-mode','set-queue-ip','set-rocket-style','set-tail-classic','set-lane-spread','set-max-arcs','set-show-labels','set-max-labels','set-override-coords','set-server-lat','set-server-lon','set-server-name'];
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    ['focus','mouseenter','input','change'].forEach(ev=>el.addEventListener(ev,()=>updateSettingsHelpForField(id)));
  });
}

function jumpToSettingsSection(targetId){
  const target=document.getElementById(targetId);
  if(!target)return;
  target.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.settings-nav button').forEach(b=>b.classList.toggle('active',b.dataset.settingsJump===targetId));
}

function applySettingsPreset(name){
  if(!name)return;
  const presets={
    balanced:{refreshSec:30,maxActive:28,maxPending:64,maxBatch:14,uiThrottle:220,labelThrottle:150},
    performance:{refreshSec:45,maxActive:16,maxPending:36,maxBatch:8,uiThrottle:320,labelThrottle:220},
    quality:{refreshSec:20,maxActive:42,maxPending:90,maxBatch:20,uiThrottle:170,labelThrottle:110},
    ultra:{refreshSec:10,maxActive:80,maxPending:300,maxBatch:40,uiThrottle:100,labelThrottle:60},
  };
  const p=presets[name];
  if(!p)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  set('set-refresh-sec',p.refreshSec);
  set('set-max-active',p.maxActive);
  set('set-max-pending',p.maxPending);
  set('set-max-batch',p.maxBatch);
  set('set-ui-throttle',p.uiThrottle);
  set('set-label-throttle',p.labelThrottle);
  updateSettingsHelpForField('set-performance-preset');
}
