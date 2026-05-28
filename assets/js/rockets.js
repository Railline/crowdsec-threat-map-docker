function syncRocketStyleUI(){
  const rs=document.getElementById('set-rocket-style');
  if(rs)rs.value=rocketStyle;
}

function toggleRocketStyle(){
  rocketStyle=rocketStyle==='classic'?'legacy':'classic';
  persistRocketStylePrefs();
  syncRocketStyleUI();
  if(animOn&&linesOn){
    drawCrowdSecRockets(performance.now());
    updateFlightLabels(activeRockets);
  }
}
