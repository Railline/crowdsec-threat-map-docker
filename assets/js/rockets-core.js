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
    source:ev.source||'attack',
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
  if(isConsoleArcStyle()||!animOn||!linesOn)return;
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
  if(isConsoleArcStyle()&&linesOn&&animOn)return true;
  return activeRockets.length>0||pendingRocketsByIp.size>0;
}
function spawnRocketsFromFeed(){
  if(isConsoleArcStyle()||!animOn||!linesOn)return;
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
function isConsoleArcStyle(){return rocketStyle==='arc';}
function drawConsoleArcs(ts){
  const srv=proj([SERVER_LON,SERVER_LAT]);
  if(!srv)return;
  const[sx,sy]=srv;
  const data=getDisplayAttackData();
  const now=typeof ts==='number'?ts:performance.now();
  ctx2d.save();
  ctx2d.translate(currentTx,currentTy);
  ctx2d.scale(currentScale,currentScale);
  const ik=1/currentScale;
  const dashLen=Math.max(4,5.5*ik);
  const gapLen=Math.max(3,4*ik);
  const phase=animOn?(now/90)%((dashLen+gapLen)*6):0;
  const maxArcs=mapSettings.maxConsoleArcs??150;
  const list=data.length>maxArcs?data.slice().sort((a,b)=>(b.count||1)-(a.count||1)).slice(0,maxArcs):data;
  list.forEach(d=>{
    const pt=proj([d.lon,d.lat]);
    if(!pt)return;
    const[px,py]=pt;
    const dx=sx-px,dy=sy-py,dist=Math.sqrt(dx*dx+dy*dy);
    const col=d.source==='drop'?'#00ffe0':countColor(d.count||1);
    const dropGrad=d.source==='drop'?ctx2d.createLinearGradient(px,py,sx,sy):null;
    if(dropGrad){
      dropGrad.addColorStop(0,'rgba(156,92,255,0.72)');
      dropGrad.addColorStop(1,'rgba(0,255,224,0.92)');
    }
    ctx2d.beginPath();
    ctx2d.moveTo(px,py);
    ctx2d.quadraticCurveTo((px+sx)/2,(py+sy)/2-Math.min(dist*0.38,130),sx,sy);
    ctx2d.strokeStyle=dropGrad||col;
    ctx2d.lineWidth=1.15*ik;
    ctx2d.globalAlpha=0.72;
    ctx2d.lineCap='round';
    ctx2d.setLineDash([dashLen,gapLen]);
    ctx2d.lineDashOffset=-phase;
    ctx2d.stroke();
  });
  ctx2d.setLineDash([]);
  ctx2d.globalAlpha=1;
  ctx2d.restore();
}
function rocketTailTForStyle(){
  if(rocketStyle==='legacy')return ROCKET_TAIL_LEGACY_T;
  return ROCKET_TAIL_T;
}
function drawRocketForStyle(ctx,r,t,col,ik,lite){
  const tailT=rocketTailTForStyle();
  const tTail=Math.max(0,t-tailT);
  const pt=quadPoint(r,t);
  const pTail=quadPoint(r,tTail);
  if(rocketStyle==='legacy')drawRocketLegacy(ctx,pt,pTail,col,ik);
  else drawRocketClassic(ctx,pt,pTail,col,ik,lite,r.source==='drop');
}
function drawRocketClassic(ctx,pt,pTail,col,ik,lite,isDrop){
  const grad=ctx.createLinearGradient(pTail.x,pTail.y,pt.x,pt.y);
  if(isDrop){
    grad.addColorStop(0,'rgba(156,92,255,0)');
    grad.addColorStop(0.28,'rgba(156,92,255,0.28)');
    grad.addColorStop(0.66,'rgba(90,170,255,0.78)');
    grad.addColorStop(1,'rgba(0,255,224,0.98)');
  }else{
    grad.addColorStop(0,hexToRgba(col,0));
    grad.addColorStop(0.3,hexToRgba(col,0.22));
    grad.addColorStop(0.72,hexToRgba(col,0.78));
    grad.addColorStop(1,hexToRgba(col,0.95));
  }
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
  ctx.fillStyle=isDrop?'rgba(0,255,224,0.45)':hexToRgba(col,0.4);
  ctx.globalAlpha=1;
  ctx.arc(pt.x,pt.y,3.6*ik,0,Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle='#fffefb';
  if(!lite){
    ctx.shadowColor=isDrop?'rgba(0,255,224,0.9)':hexToRgba(col,0.9);
    ctx.shadowBlur=5*ik;
  }
  ctx.arc(pt.x,pt.y,2.35*ik,0,Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
}
function drawCrowdSecRockets(ts){
  clearArcCanvas();
  if(!linesOn){clearFlightLabels();return;}
  if(isConsoleArcStyle()){
    drawConsoleArcs(ts);
    clearFlightLabels();
    return;
  }
  if(!animOn){clearFlightLabels();return;}
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
  if(isConsoleArcStyle())return;
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
    if(!linesOn){clearArcCanvas();clearFlightLabels();return;}
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
