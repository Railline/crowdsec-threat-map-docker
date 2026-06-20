function parseMetrics(text){
  const flows=[];
  for(const line of text.split('\n')){
    if(!line.startsWith('cs_attack_flow{'))continue;
    try{
      const ls=line.match(/\{(.+)\}/)?.[1]||'';
      const val=parseFloat(line.split('} ')[1])||1;
      const lb={};ls.replace(/(\w+)="([^"]*)"/g,(_,k,v)=>{lb[k]=v;});
      if((lb.type||'').toLowerCase()==='drop')continue;
      if((lb.scenario||'').toLowerCase()==='crowdsec-ban')continue;
      if(lb.src_lat&&lb.src_lon)flows.push({lat:parseFloat(lb.src_lat),lon:parseFloat(lb.src_lon),country:lb.country||'??',city:lb.city||lb.src_city||'',scenario:lb.scenario||'unknown',ip:lb.ip||'',count:val,source:'attack'});
    }catch(e){}
  }
  return flows;
}

function enrichAttackData(){
  const lookup={};
  feedData.forEach(f=>{
    if(!lookup[f.ip]) lookup[f.ip]={
      asname:  f.asname,
      asnumber:f.asnumber,
      iprange: f.iprange,
      time_de: f.time_de,
      time_iso:f.time_iso,
      city:    f.city,
      scenario:f.scenario,
    };
  });
  attackData.forEach(d=>{
    const extra=lookup[d.ip];
    if(extra){
      d.asname  = extra.asname;
      d.asnumber= extra.asnumber;
      d.iprange = extra.iprange;
      d.time_de = extra.time_de;
      d.time_iso= extra.time_iso;
      d.city    = extra.city || d.city;
      if(extra.scenario&&(!d.scenario||d.scenario==='unknown'))d.scenario=extra.scenario;
    }
  });
}

function parseFeedData(text){
  const seen=new Set();
  const items=[];
  for(const line of text.split('\n')){
    if(!line.startsWith('cs_lapi_realtime{'))continue;
    try{
      const ls=line.match(/\{(.+)\}/)?.[1]||'';
      const lb={};ls.replace(/(\w+)="([^"]*)"/g,(_,k,v)=>{lb[k]=v;});
      if((lb.type||'').toLowerCase()==='drop')continue;
      if((lb.scenario||'').toLowerCase()==='crowdsec-ban')continue;
      if(!lb.ip||!lb.attack_time_iso)continue;
      const key=lb.ip+'|'+lb.scenario+'|'+lb.attack_time_iso;
      if(seen.has(key))continue;
      seen.add(key);
      items.push({
        ip:       lb.ip||'',
        country:  lb.country||'??',
        city:     lb.city||lb.src_city||'',
        scenario: lb.scenario||'unknown',
        time_iso: lb.attack_time_iso||'',
        time_de:  lb.attack_time||'',
        asname:   lb.asname||'',
        asnumber: lb.asnumber||'',
        iprange:  lb.iprange||'',
        lat:      parseFloat(lb.latitude||0),
        lon:      parseFloat(lb.longitude||0),
        count:    1,
        active_ban: lb.active_ban==='1',
        ts:       parseEventTime(lb.attack_time_iso),
        source:   'attack',
      });
    }catch(e){}
  }
  return items;
}

async function fetchAndRender(){
  try{
    const res=await fetch(EXPORTER_URL,{cache:'no-store'});
    const text=await res.text();
    lastMetricsText=text;
    allEvents=parseFeedData(text).filter(d=>!localUnbanned.has(d.ip)&&d.ts>0);
    if(!liveMode){
      const times=allEvents.map(e=>e.ts).filter(t=>t>0);
      if(times.length){
        if(!replayInitialized){initReplayWindow();replayInitialized=true;}
        else{replayWinEnd=Math.max(...times);replayWinStart=Math.max(Math.min(...times),replayWinEnd-replayRangeH*3600000);if(replayCursor>replayWinEnd)replayCursor=replayWinEnd;}
      }
    }
    attackFeedData=parseFeedData(text).filter(d=>!localUnbanned.has(d.ip));
    if(typeof rebuildLiveFeedData==='function')rebuildLiveFeedData();
    else feedData=attackFeedData;
    attackData=liveMode?(typeof getVisibleLiveAttackData==='function'?getVisibleLiveAttackData(parseMetrics(text)):parseMetrics(text)):aggregateFromEvents(getEventsInReplay());
    enrichAttackData();
    const total=(text.match(/cs_exporter_total_alerts (\d+)/)||[])[1]||'—';
    updateSidebarStats({totalAlerts:total});
    updateFooterStats();
    if(liveMode){
      const clk=document.getElementById('replay-clock');
      if(clk)clk.textContent=t('live_clock');
    }
    const timeStr=new Date().toLocaleTimeString(currentLang==='de'?'de-DE':'en-GB');
    document.getElementById('lu').textContent=timeStr;
    const mobLu=document.getElementById('mob-lu');
    if(mobLu)mobLu.textContent=timeStr;
    buildArcPaths();
    renderDots();
    renderFeed();
    renderCountryLists();
    renderFilterBar();
    renderSparkline();
    renderMapPanels();
    if(typeof fetchDrops==='function')fetchDrops();
    checkAlarms();
    hideErr();
    if(!serverCoordsConfigured()){
      showErr('SERVER_LAT / SERVER_LON fehlen oder sind ungültig — in Docker/Unraid setzen, Container neu starten. LAT/LON nicht vertauschen.');
    }
    applyLang();
    ensureAutoZoomOff();
    refreshMapFromData();
  }catch(e){showErr(t('error_conn')+EXPORTER_URL);}
}
