function setupProj(){
  W=mapWrap.clientWidth; H=mapWrap.clientHeight;
  canvas.width=W; canvas.height=H;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const {projShift}=getHomeFitParams();
  proj=d3.geoNaturalEarth1().scale(Math.min(W/4.85,H/2.58)).translate([W/2,H/2-H*projShift]);
  pathGen=d3.geoPath().projection(proj);
}

function setupZoom(){
  zoomBeh=d3.zoom().scaleExtent([0.1,25])
    .filter(e=>{if(e.type==='touchstart')return e.touches.length>=2;return true;})
    .on('zoom',onZoom);
  baseSvg.call(zoomBeh);

  let tx,ty,tt;
  mapWrap.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    tx=e.touches[0].clientX;ty=e.touches[0].clientY;
    tt=d3.zoomTransform(document.getElementById('base-svg'));
    mapWrap.classList.add('panning');
  },{passive:true});
  mapWrap.addEventListener('touchmove',e=>{
    if(e.touches.length!==1)return;e.preventDefault();
    const dx=e.touches[0].clientX-tx,dy=e.touches[0].clientY-ty;
    baseSvg.call(zoomBeh.transform,d3.zoomIdentity.translate(tt.x+dx,tt.y+dy).scale(tt.k));
  },{passive:false});
  mapWrap.addEventListener('touchend',()=>mapWrap.classList.remove('panning'),{passive:true});
  mapWrap.addEventListener('mousedown',()=>mapWrap.classList.add('panning'));
  mapWrap.addEventListener('mouseup',()=>mapWrap.classList.remove('panning'));

  document.getElementById('bzi').onclick=()=>zoomByStep(ZOOM_STEP);
  document.getElementById('bzo').onclick=()=>zoomByStep(-ZOOM_STEP);
  document.getElementById('bzr').onclick=()=>fitMapToServerHome({duration:500});
  document.getElementById('bzp')?.addEventListener('click',e=>{e.stopPropagation();toggleZoomPrefsPanel();});
  document.getElementById('zoom-prefs-save')?.addEventListener('click',saveCurrentMapViewAsStart);
  document.getElementById('zoom-prefs-reset')?.addEventListener('click',()=>{resetMapViewPrefs();if(!userHasZoomed)fitMapToServerHome({duration:400});});
  document.getElementById('zoom-prefs-use-saved')?.addEventListener('change',e=>{
    mapViewPrefs.useSavedOnLoad=!!e.target.checked;
    persistMapViewPrefs();
  });
  const homeSlider=document.getElementById('zoom-prefs-home-k');
  if(homeSlider){
    homeSlider.addEventListener('input',e=>{
      mapViewPrefs.homeK=parseFloat(e.target.value);
      syncZoomPrefsUI();
    });
    homeSlider.addEventListener('change',()=>{
      persistMapViewPrefs();
      if(!userHasZoomed)fitMapToServerHome({duration:350});
    });
  }
}

function onZoom(event){
  const tr=event.transform;
  const prevScale=currentScale;
  currentScale=tr.k;currentTx=tr.x;currentTy=tr.y;
  mapG.attr('transform',tr);
  dotG.attr('transform',tr);
  const ik=1/tr.k;
  dotG.selectAll('.adot').attr('r',function(){return parseFloat(this.dataset.sr||4)*ik;});
  updateServerScale();
  updateZoomLevel(tr.k);
  updateSelectionRing();
  drawCountryLabels();
  if(event.sourceEvent) userHasZoomed=true;
  const wasCluster=prevScale<=1.5;
  const isCluster=tr.k<=1.5;
  if(wasCluster!==isCluster) renderDots();
  else{updateCityLabelScale();updateCountryLabelScale();}
  drawCountryLabels();
  if(!animOn){updateCountryFills();}
  if(!animOn||!linesOn){if(!animOn)return;updateCountryFills();return;}
  if(animOn&&linesOn){drawCrowdSecRockets();updateFlightLabels(activeRockets);}
}

function onResize(){
  const sig=isCompactLayout()?'compact':'wide';
  const modeChanged=layoutModeSig!==null&&layoutModeSig!==sig;
  layoutModeSig=sig;
  syncCompactLayout();
  resetRockets();
  clearFlightLabels();
  setupProj();
  baseSvg.selectAll('*').remove();
  drawBaseMap();
  renderDots();
  if(modeChanged)userHasZoomed=false;
  if(!userHasZoomed)applyInitialMapView();
  updateCountryFills();
  clearArcCanvas();
  if(animOn&&linesOn)startAnimLoop();
}

function drawBaseMap(){
  const countries=topojson.feature(worldData,worldData.objects.countries);
  const borders=topojson.mesh(worldData,worldData.objects.countries,(a,b)=>a!==b);
  const bgCol=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#020810';
  baseSvg.append('rect').attr('width',W).attr('height',H).attr('fill',bgCol==='#020810'?'#020d1a':bgCol);
  mapG=baseSvg.append('g').attr('id','map-g');
  mapG.append('path').datum(d3.geoGraticule()()).attr('d',pathGen).attr('fill','none').attr('stroke','rgba(0,255,200,0.04)').attr('stroke-width',0.5);
  countriesGeo=countries.features;
  mapG.selectAll('.land').data(countriesGeo).join('path').attr('class','land').attr('d',pathGen).attr('fill','#0a1a2e').attr('stroke','rgba(0,255,200,0.09)').attr('stroke-width',0.4);
  mapG.append('path').datum(borders).attr('d',pathGen).attr('fill','none').attr('stroke','rgba(0,255,200,0.06)').attr('stroke-width',0.3);
  dotG=baseSvg.append('g').attr('id','dot-g');
  drawServerDots();
}

const COUNTRY_NAMES={
  AF:'Afghanistan',AL:'Albania',DZ:'Algeria',AR:'Argentina',AM:'Armenia',
  AU:'Australia',AT:'Austria',AZ:'Azerbaijan',BD:'Bangladesh',BY:'Belarus',
  BE:'Belgium',BR:'Brazil',BG:'Bulgaria',CA:'Canada',CL:'Chile',
  CN:'China',CO:'Colombia',HR:'Croatia',CZ:'Czech Rep.',DK:'Denmark',
  EG:'Egypt',EE:'Estonia',FI:'Finland',FR:'France',DE:'Germany',
  GR:'Greece',HK:'Hong Kong',HU:'Hungary',IN:'India',ID:'Indonesia',
  IR:'Iran',IQ:'Iraq',IE:'Ireland',IL:'Israel',IT:'Italy',
  JP:'Japan',KZ:'Kazakhstan',KR:'Korea',LV:'Latvia',LT:'Lithuania',
  MY:'Malaysia',MX:'Mexico',MD:'Moldova',NL:'Netherlands',NZ:'New Zealand',
  NG:'Nigeria',NO:'Norway',PK:'Pakistan',PL:'Poland',PT:'Portugal',
  RO:'Romania',RU:'Russia',SA:'Saudi Arabia',RS:'Serbia',SG:'Singapore',
  SK:'Slovakia',ZA:'South Africa',ES:'Spain',SE:'Sweden',CH:'Switzerland',
  TW:'Taiwan',TH:'Thailand',TR:'Turkey',UA:'Ukraine',AE:'UAE',
  GB:'UK',US:'USA',UZ:'Uzbekistan',VN:'Vietnam',BA:'Bosnia',
  MK:'N.Macedonia',MA:'Morocco',TN:'Tunisia',LB:'Lebanon',
  KW:'Kuwait',QA:'Qatar',OM:'Oman',JO:'Jordan',SY:'Syria',
  LY:'Libya',KH:'Cambodia',LU:'Luxembourg',SI:'Slovenia',MN:'Mongolia',
};

const CC_CENTER={
  US:[37.09,-95.71],CA:[56.13,-106.35],GB:[54.37,-2.0],FR:[46.60,1.88],
  DE:[51.17,10.45],IT:[41.87,12.57],ES:[40.46,-3.75],NL:[52.13,5.29],
  CH:[46.82,8.23],AT:[47.52,14.55],PL:[51.92,19.15],SE:[60.13,18.64],
  NO:[60.47,8.47],DK:[56.26,9.50],FI:[61.92,25.75],RU:[61.52,105.32],
  CN:[35.86,104.19],JP:[36.20,138.25],KR:[35.91,127.77],IN:[20.59,78.96],
  AU:[-25.27,133.78],BR:[-14.24,-51.93],MX:[23.63,-102.55],UA:[48.38,31.17],
  RO:[45.94,24.97],BG:[42.73,25.49],IE:[53.41,-8.24],PT:[39.40,-8.22],
  GR:[39.07,21.82],TR:[38.96,35.24],ZA:[-30.56,22.94],SG:[1.35,103.82],
  HK:[22.32,114.17],TW:[23.70,120.96],TH:[15.87,100.99],MY:[4.21,101.98],
  ID:[-0.79,113.92],IL:[31.05,34.85],SA:[23.89,45.08],MD:[47.41,28.37],
  BE:[50.50,4.47],SK:[48.67,19.70],HR:[45.10,15.20],RS:[44.02,21.01],
  HU:[47.16,19.50],CZ:[49.82,15.47]
};

const COUNTRY_NAMES_DE_MAP={'US':'USA','CA':'Kanada','GB':'UK','FR':'Frankreich','DE':'Deutschland','IT':'Italien','ES':'Spanien','NL':'Niederlande','CH':'Schweiz','AT':'Österreich','PL':'Polen','SE':'Schweden','NO':'Norwegen','DK':'Dänemark','FI':'Finnland','RU':'Russland','CN':'China','JP':'Japan','KR':'Südkorea','IN':'Indien','AU':'Australien','BR':'Brasilien','MX':'Mexiko','UA':'Ukraine','RO':'Rumänien','BG':'Bulgarien','IE':'Irland','PT':'Portugal','GR':'Griechenland','TR':'Türkei','ZA':'Südafrika','SG':'Singapur','TH':'Thailand','MY':'Malaysia','ID':'Indonesien','BE':'Belgien','CZ':'Tschechien','HU':'Ungarn','RS':'Serbien','HR':'Kroatien','SK':'Slowakei','MD':'Moldau','BA':'Bosnien','MK':'N.Mazedonien'};

function countryDisplayName(cc){return currentLang==='de'?(COUNTRY_NAMES_DE_MAP[cc]||COUNTRY_NAME[cc]||cc):(COUNTRY_NAMES[cc]||cc);}

function drawCountryLabels(){
  if(!mapG||!worldData)return;
  mapG.selectAll('.country-label').remove();
  const px=countryLabelScreenPx();
  if(!px)return;
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#00ffe0';
  const events=liveMode?feedData:getEventsInReplay();
  const byCo={};
  events.forEach(e=>{byCo[e.country]=(byCo[e.country]||0)+1;});
  Object.keys(byCo).forEach(cc=>{
    const center=CC_CENTER[cc];
    if(!center)return;
    const cpt=proj([center[1],center[0]]);
    if(!cpt)return;
    mapG.append('text').attr('class','country-label')
      .attr('x',cpt[0]).attr('y',cpt[1])
      .attr('text-anchor','middle')
      .attr('fill',accent)
      .attr('opacity',0.78)
      .attr('font-size',`${labelPxToSvg(px)}px`)
      .attr('font-family','Share Tech Mono,monospace')
      .attr('pointer-events','none')
      .text(countryDisplayName(cc));
  });
}

const CLUSTER_DIST=30; // px screen distance to cluster

function getClusteredDots(data){
  const ik=1/currentScale;
  if(currentScale>3)return data.map(d=>({...d,_cluster:1,_clusterPts:[d]}));
  const projected=data.map(d=>{
    const pt=proj([d.lon,d.lat]);
    return pt?{...d,_px:pt[0],_py:pt[1]}:null;
  }).filter(Boolean);
  const used=new Array(projected.length).fill(false);
  const clusters=[];
  for(let i=0;i<projected.length;i++){
    if(used[i])continue;
    const cluster=[projected[i]];
    used[i]=true;
    for(let j=i+1;j<projected.length;j++){
      if(used[j])continue;
      const dx=(projected[i]._px-projected[j]._px)*currentScale;
      const dy=(projected[i]._py-projected[j]._py)*currentScale;
      if(Math.sqrt(dx*dx+dy*dy)<CLUSTER_DIST){cluster.push(projected[j]);used[j]=true;}
    }
    const totalCount=cluster.reduce((s,d)=>s+d.count,0);
    const cx=cluster.reduce((s,d)=>s+d._px*d.count,0)/totalCount;
    const cy=cluster.reduce((s,d)=>s+d._py*d.count,0)/totalCount;
    const scenCounts={};
    cluster.forEach(c=>{scenCounts[c.scenario]=(scenCounts[c.scenario]||0)+(c.count||1);});
    const topScenario=Object.entries(scenCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||cluster[0].scenario;
    clusters.push({
      ...cluster[0],scenario:topScenario,_px:cx,_py:cy,
      count:totalCount,_cluster:cluster.length,_clusterPts:cluster,
    });
  }
  return clusters;
}

function init(){
  (async()=>{
    try{
      await loadServerConfig();
      if(!serverCoordsConfigured()){
        showErr('SERVER_LAT / SERVER_LON fehlen oder sind ungültig — in Docker/Unraid setzen, Container neu starten. LAT/LON nicht vertauschen.');
      }
      setupProj();
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js');
      const lsEl=document.getElementById('ls');
      if(lsEl){lsEl.dataset.busy='1';lsEl.textContent=t('load_map');}
      const r=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      worldData=await r.json();
      drawBaseMap();
      setupZoom();
      scheduleHomeFit();
      if(lsEl)lsEl.textContent=t('load_feed');
      await fetchAndRender();
      const lsDone=document.getElementById('ls');
      if(lsDone)delete lsDone.dataset.busy;
      document.getElementById('loading').style.display='none';
      updateCountryFills();
      startMapOnLoad();
      let fitAttempts=0;
      let lastH=0;
      function tryFit(){
        fitAttempts++;
        const wh=mapWrap.clientHeight;
        const ww=mapWrap.clientWidth;
        const isMobile=isCompactLayout();
        const heightStable=!isMobile||(wh===lastH&&wh>50);
        lastH=wh;
        if(wh>50&&ww>50&&(heightStable||fitAttempts>10)){
          setupProj();
          canvas.width=W;canvas.height=H;
          canvas.style.width=W+'px';canvas.style.height=H+'px';
          scheduleHomeFit();
          if(!animOn)clearArcCanvas();
        } else if(fitAttempts<25){
          setTimeout(tryFit,120);
        }
      }
      setTimeout(tryFit,200);
      setTimeout(scheduleHomeFit,700);
      setupReplayControls();
      restartFetchLoop();
      setInterval(fetchWhitelistStatus, 60000);
      fetchWhitelistStatus();
      const sidebar = document.getElementById('sidebar') || document.querySelector('aside');
      if(sidebar && window.ResizeObserver){
        new ResizeObserver(entries=>{
          const w = entries[0].contentRect.width;
          const lbl = document.getElementById('theme-lbl');
          if(lbl) lbl.classList.toggle('hidden', w < 210);
        }).observe(sidebar);
      }
      window.addEventListener('resize',onResize);
    }catch(e){
      showErr(t('error_prefix')+e.message);
      document.getElementById('loading').style.display='none';
    }
  })();
}
