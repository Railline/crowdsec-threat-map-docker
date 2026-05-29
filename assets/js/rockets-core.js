function launchRocketFromEvent(ev){
  const ip=rocketQueueKey(ev);
  const [sx,sy]=proj([SERVER_LON,SERVER_LAT]);const pt=proj([ev.lon,ev.lat]);
  if(!pt){drainRocketQueue(ip);return;}
  const[px,py]=pt;const dx=sx-px,dy=sy-py,dist=Math.max(Math.sqrt(dx*dx+dy*dy),1);
  const nx=-dy/dist,ny=dx/dist;
  const lane=(((++rocketIdSeq)%5)-2)*ROCKET_LANE_SPREAD;
  const arcLift=Math.min(dist*0.38,130);
  activeRockets.push({
    id:rocketIdSeq,
    queueIp:ip,ip:ev.ip,country:ev.country||'??',city:ev.city||'',scenario:ev.scenario,
    sx:px,sy:py,ex:sx,ey:sy,
    cpx:(px+sx)/2+nx*lane,cpy:(py+sy)/2-arcLift+ny*lane,
    col:scenarioColor(ev.scenario),t:0,
  });
  trimActiveRockets();
  if(!animRAF)startAnimLoop();
  if(autoZoomOn&&animOn&&!userHasZoomed){
    const tsBefore=lastAutoZoomTs;
    maybeAutoZoomToAttack(ev);
    if(lastAutoZoomTs===tsBefore)nudgeAttackIntoView(ev.lon,ev.lat);
  }
}
function drainRocketQueue(ip){
  if(!canLaunchRocketNow(ip))return;
  const q=pendingRocketsByIp.get(ip);
  if(!q||!q.length){pendingRocketsByIp.delete(ip);return;}
  const ev=q.shift();
  if(!q.length)pendingRocketsByIp.delete(ip);
  reserveRocketLaunchSlot(ip);
  launchRocketFromEvent(ev);
}
function drainAllRocketQueues(){
  [...pendingRocketsByIp.keys()].forEach(ip=>drainRocketQueue(ip));
}
function spawnRocketForEvent(ev){
  if(!animOn||!linesOn)return;
  const evKey=eventRocketKey(ev);
  if(spawnedRocketKeys.has(evKey))return;
  if(activeRockets.length>=MAX_ACTIVE_ROCKETS&&totalPendingRockets()>=MAX_PENDING_ROCKETS)return;
  spawnedRocketKeys.add(evKey);
  const ip=rocketQueueKey(ev);
  if(!canLaunchRocketNow(ip)){
    if(totalPendingRockets()>=MAX_PENDING_ROCKETS)return;
    const q=pendingRocketsByIp.get(ip);
    const maxIp=mapSettings.maxQueuePerIp??12;
    if(q&&q.length>=maxIp)return;
    if(!pendingRocketsByIp.has(ip))pendingRocketsByIp.set(ip,[]);
    pendingRocketsByIp.get(ip).push(ev);
    if(!animRAF)startAnimLoop();
    return;
  }
  reserveRocketLaunchSlot(ip);
  launchRocketFromEvent(ev);
}
function hasRocketAnimWork(){
  return activeRockets.length>0||pendingRocketsByIp.size>0;
}
function spawnRocketsFromFeed(){
  if(!animOn||!linesOn)return;
  const list=filterEventsForSpawnMode(feedData.slice().sort((a,b)=>(a.ts||0)-(b.ts||0)));
  let n=0;
  for(const e of list){
    if(n>=MAX_ROCKET_SPAWN_BATCH)break;
    if(spawnedRocketKeys.has(eventRocketKey(e)))continue;
    spawnRocketForEvent(e);
    n++;
  }
  if(spawnedRocketKeys.size>8000){
    const keep=new Set(feedData.slice(0,500).map(eventRocketKey));
    spawnedRocketKeys.clear();
    keep.forEach(k=>spawnedRocketKeys.add(k));
  }
}
function spawnLiveRocketsFromFeed(){
  if(!liveMode)return;
  spawnRocketsFromFeed();
}
function drawRocketLegacy(ctx,pt,pTail,col,ik){
  ctx.beginPath();
  ctx.strokeStyle=col;
  ctx.lineWidth=1.15*ik;
  ctx.globalAlpha=0.92;
  ctx.lineCap='round';
  ctx.moveTo(pTail.x,pTail.y);
  ctx.lineTo(pt.x,pt.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle='#fff8f0';
  ctx.globalAlpha=0.95;
  ctx.arc(pt.x,pt.y,2.2*ik,0,Math.PI*2);
  ctx.fill();
}
function drawRocketArc(ctx,r,tTail,tHead,col,ik){
  const steps=Math.max(6,Math.ceil((tHead-tTail)*28));
  const p0=quadPoint(r,tTail);
  ctx.beginPath();
  ctx.moveTo(p0.x,p0.y);
  for(let i=1;i<=steps;i++){
    const t=tTail+(tHead-tTail)*i/steps;
    const p=quadPoint(r,t);
    ctx.lineTo(p.x,p.y);
  }
  ctx.strokeStyle=col;
  ctx.lineWidth=1.35*ik;
  ctx.globalAlpha=0.88;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.stroke();
  const pt=quadPoint(r,tHead);
  ctx.beginPath();
  ctx.fillStyle='#ffffff';
  ctx.globalAlpha=0.96;
  ctx.arc(pt.x,pt.y,2.4*ik,0,Math.PI*2);
  ctx.fill();
}
function rocketTailTForStyle(){
  if(rocketStyle==='legacy')return ROCKET_TAIL_LEGACY_T;
  if(rocketStyle==='arc')return ROCKET_TAIL_ARC_T;
  return ROCKET_TAIL_T;
}
function drawRocketForStyle(ctx,r,t,col,ik,lite){
  const tailT=rocketTailTForStyle();
  const tTail=Math.max(0,t-tailT);
  const pt=quadPoint(r,t);
  const pTail=quadPoint(r,tTail);
  if(rocketStyle==='legacy')drawRocketLegacy(ctx,pt,pTail,col,ik);
  else if(rocketStyle==='arc')drawRocketArc(ctx,r,tTail,t,col,ik);
  else drawRocketClassic(ctx,pt,pTail,col,ik,lite);
}
function drawRocketClassic(ctx,pt,pTail,col,ik,lite){
  const grad=ctx.createLinearGradient(pTail.x,pTail.y,pt.x,pt.y);
  grad.addColorStop(0,hexToRgba(col,0));
  grad.addColorStop(0.3,hexToRgba(col,0.22));
  grad.addColorStop(0.72,hexToRgba(col,0.78));
  grad.addColorStop(1,hexToRgba(col,0.95));
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.beginPath();
  ctx.strokeStyle=grad;
  ctx.lineWidth=4.2*ik;
  ctx.globalAlpha=0.35;
  ctx.moveTo(pTail.x,pTail.y);
  ctx.lineTo(pt.x,pt.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle=grad;
  ctx.lineWidth=2.2*ik;
  ctx.globalAlpha=1;
  ctx.moveTo(pTail.x,pTail.y);
  ctx.lineTo(pt.x,pt.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle=hexToRgba(col,0.4);
  ctx.globalAlpha=1;
  ctx.arc(pt.x,pt.y,3.6*ik,0,Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle='#fffefb';
  if(!lite){
    ctx.shadowColor=hexToRgba(col,0.9);
    ctx.shadowBlur=5*ik;
  }
  ctx.arc(pt.x,pt.y,2.35*ik,0,Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
}
function drawCrowdSecRockets(ts){
  clearArcCanvas();
  if(!animOn||!linesOn){clearFlightLabels();return;}
  drainAllRocketQueues();
  if(!activeRockets.length&&!pendingRocketsByIp.size){clearFlightLabels();return;}
  if(!activeRockets.length){clearFlightLabels();return;}
  const now=typeof ts==='number'?ts:performance.now();
  const dt=lastRocketDrawTs?Math.min(48,now-lastRocketDrawTs):16;
  lastRocketDrawTs=now;
  const rocketStep=(dt/ROCKET_DURATION_MS)*(liveMode?1:replaySpeed);
  ctx2d.save();ctx2d.translate(currentTx,currentTy);ctx2d.scale(currentScale,currentScale);
  const ik=1/currentScale;
  const rocketLite=activeRockets.length>12;
  activeRockets=activeRockets.filter(r=>{
    r.t=Math.min(1,r.t+rocketStep);
    const pt=quadPoint(r,r.t);
    const col=r.col||scenarioColor(r.scenario);
    if(r.t<1)drawRocketForStyle(ctx2d,r,r.t,col,ik,rocketLite);
    if(r.t>=0.92){
      const flash=Math.min(1,(r.t-0.92)/0.08);
      ctx2d.beginPath();ctx2d.fillStyle=col;ctx2d.globalAlpha=0.45*(1-flash);
      ctx2d.arc(r.ex,r.ey,2.5*ik,0,Math.PI*2);ctx2d.fill();
    }
    return r.t<1.02;
  });
  drainAllRocketQueues();
  if(now-lastFlightLabelTs>=FLIGHT_LABEL_THROTTLE_MS){
    lastFlightLabelTs=now;
    updateFlightLabels(activeRockets);
  }
  ctx2d.globalAlpha=1;ctx2d.restore();
}
function drawReplayFrame(ts){drawCrowdSecRockets(ts);}
function spawnRocketsForNewEvents(){
  const filt=e=>{if(e.ts<=lastReplaySpawnTs||e.ts>replayCursor)return false;if(activeFilters.country&&e.country!==activeFilters.country)return false;if(activeFilters.scenario&&e.scenario!==activeFilters.scenario)return false;return true;};
  const newEvts=allEvents.filter(filt).sort((a,b)=>a.ts-b.ts);
  if(!newEvts.length)return;
  const batch=filterEventsForSpawnMode(newEvts).slice(0,MAX_ROCKET_SPAWN_BATCH);
  batch.forEach(e=>spawnRocketForEvent(e));
  lastReplaySpawnTs=batch[batch.length-1].ts;
}
function advanceReplay(ts){
  if(!replayLastFrame)replayLastFrame=ts;
  const dt=ts-replayLastFrame;replayLastFrame=ts;
  if(replayWinEnd<=replayWinStart)return;
  replayCursor=Math.min(replayWinEnd,replayCursor+dt*(replayWinEnd-replayWinStart)/(REPLAY_PLAY_MS/replaySpeed));
  if(animOn)spawnRocketsForNewEvents();
  updateReplaySlider();
  const uiDue=!lastReplayUiTs||ts-lastReplayUiTs>=REPLAY_UI_THROTTLE_MS||replayCursor>=replayWinEnd;
  if(uiDue){
    lastReplayUiTs=ts;
    attackData=aggregateFromEvents(getEventsInReplay());
    renderDots();renderMapPanels();updateCountryFills();
  }
  if(animOn)drawReplayFrame(ts);else clearArcCanvas();
  if(replayCursor>=replayWinEnd){replayPlaying=false;updateReplayControlsUI();}
}
function startAnimLoop(){
  if(animRAF)cancelAnimationFrame(animRAF);
  replayLastFrame=0;lastRocketDrawTs=0;
  function loop(ts){
    if(!animOn||!linesOn){clearArcCanvas();clearFlightLabels();return;}
    if(liveMode){
      spawnLiveRocketsFromFeed();
      drawCrowdSecRockets(ts);
    }else if(replayPlaying){
      advanceReplay(ts);
    }else{
      drawCrowdSecRockets(ts);
    }
    const keepAnim=hasRocketAnimWork()||(!liveMode&&replayPlaying);
    if(keepAnim)animRAF=requestAnimationFrame(loop);
    else animRAF=null;
  }
  animRAF=requestAnimationFrame(loop);
}
function startReplayLoop(){replayPlaying=true;updateReplayControlsUI();startAnimLoop();}
