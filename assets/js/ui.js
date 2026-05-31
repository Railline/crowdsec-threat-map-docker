function updateSidebarStats(opts={}){
  if(opts.totalAlerts!==undefined)lastAlertsTotal=opts.totalAlerts;
  const s=getAlltimeStats();
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  set('s-total',formatStatNumber(s.attacks));
  set('s-countries',formatStatNumber(s.countries));
  set('s-scenarios',formatStatNumber(s.scenarios));
  set('mob-s-total',formatStatNumber(s.attacks));
  set('mob-s-countries',formatStatNumber(s.countries));
  set('mob-s-scenarios',formatStatNumber(s.scenarios));
}

function renderMapPanels(){
  const events=liveMode?feedData:getEventsInReplay();
  const bySc={},byIp={},byCo={};
  events.forEach(e=>{
    bySc[e.scenario]=(bySc[e.scenario]||0)+1;
    byIp[e.ip]=(byIp[e.ip]||0)+1;
    byCo[e.country]=(byCo[e.country]||0)+1;
  });
  const row=(c,l,v)=>`<div class="map-panel-row"><span class="map-panel-dot" style="background:${c}"></span><span class="map-panel-label">${l}</span><span class="map-panel-val">${v}</span></div>`;
  document.getElementById('panel-scenarios-body').innerHTML=Object.entries(bySc).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,n])=>row(scenarioColor(s),s,n)).join('')||'—';
  document.getElementById('panel-ips-body').innerHTML=Object.entries(byIp).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([ip,n])=>{
    const c=events.find(e=>e.ip===ip)?.country||'??';
    return row(scenarioColor(events.find(e=>e.ip===ip)?.scenario),`${FLAG[c]||'🌐'} ${ip}`,n);
  }).join('')||'—';
  document.getElementById('panel-origins-body').innerHTML=Object.entries(byCo).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([cc,n],i)=>row('#888',`${i+1}. ${countryDisplayName(cc)}`,n)).join('')||'—';
  updateFooterStats();
}

function renderFilterBar(){
  const bar=document.getElementById('filter-bar');
  const mobBar=document.getElementById('mob-filter-bar');
  let html='';
  if(activeFilters.country) html+=`<div class="filter-chip" onclick="clearFilter('country')"><span>🌍 ${countryDisplayName(activeFilters.country)}</span><span class="filter-chip-x">✕</span></div>`;
  if(activeFilters.scenario) html+=`<div class="filter-chip" onclick="clearFilter('scenario')"><span>⚡ ${activeFilters.scenario}</span><span class="filter-chip-x">✕</span></div>`;
  if(activeFilters.search) html+=`<div class="filter-chip" onclick="document.getElementById('feed-search').value='';document.getElementById('mob-feed-search')&&(document.getElementById('mob-feed-search').value='');onFeedSearch();"><span>🔍 ${activeFilters.search}</span><span class="filter-chip-x">✕</span></div>`;
  if(bar)bar.innerHTML=html;
  if(mobBar){mobBar.innerHTML=html;mobBar.style.display=html?'flex':'none';}
}

function renderSparkline(){
  _drawSparkline('sparkline-svg',200,40);
  _drawSparkline('mob-sparkline-svg',200,28);
}

function _drawSparkline(svgId,fallbackW,H){
  const svg=document.getElementById(svgId);
  if(!svg||!feedData.length)return;
  const byHour={};
  feedData.forEach(d=>{
    const h=d.time_iso?d.time_iso.slice(0,13):'?';
    byHour[h]=(byHour[h]||0)+1;
  });
  const hours=Object.keys(byHour).sort().slice(-24);
  if(hours.length<2){svg.innerHTML='';return;}
  const vals=hours.map(h=>byHour[h]);
  const maxV=Math.max(...vals)||1;
  const W=svg.clientWidth||fallbackW,pad=2;
  const xs=hours.map((_,i)=>pad+i*(W-pad*2)/(hours.length-1));
  const ys=vals.map(v=>H-pad-(v/maxV)*(H-pad*2));
  const pts=xs.map((x,i)=>`${x},${ys[i]}`).join(' ');
  const fillPts=`${xs[0]},${H} ${pts} ${xs[xs.length-1]},${H}`;
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#00ffe0';
  svg.innerHTML=`
    <polygon points="${fillPts}" fill="${accent}" opacity="0.08"/>
    <polyline points="${pts}" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.7"/>
    <circle cx="${xs[xs.length-1]}" cy="${ys[ys.length-1]}" r="2.5" fill="${accent}" opacity="0.9"/>
  `;
}

function renderFeed(){
  let sorted=getFilteredFeed();
  if(feedSort==='newest'){
    sorted.sort((a,b)=>b.time_iso.localeCompare(a.time_iso));
  } else {
    sorted.sort((a,b)=>a.time_iso.localeCompare(b.time_iso));
  }

  const total=sorted.length;
  const totalPages=Math.ceil(total/FEED_PER_PAGE);
  if(feedPage>=totalPages)feedPage=Math.max(0,totalPages-1);

  const start=feedPage*FEED_PER_PAGE;
  const page=sorted.slice(start,start+FEED_PER_PAGE);
  const html=page.map(feedItemHTML).join('');

  document.getElementById('feed').innerHTML=html;
  const mobFeed=document.getElementById('mob-feed');
  if(mobFeed)mobFeed.innerHTML=html;

  const infoEl=document.getElementById('feed-info');
  const infoText=t('entries',start+1,Math.min(start+FEED_PER_PAGE,total),total);
  if(infoEl)infoEl.textContent=infoText;
  const mobInfoEl=document.getElementById('mob-feed-info');
  if(mobInfoEl)mobInfoEl.textContent=infoText;

  function buildPagination(totalPages){
    if(totalPages<=1) return '';
    let btns='';
    btns+=`<button class="page-btn" onclick="setFeedPage(${feedPage-1})" ${feedPage===0?'disabled':''}>◀</button>`;
    const ws=5;
    let sP=Math.max(0,feedPage-Math.floor(ws/2));
    let eP=Math.min(totalPages-1,sP+ws-1);
    if(eP-sP<ws-1) sP=Math.max(0,eP-ws+1);
    if(sP>0) btns+=`<span style="color:rgba(160,255,216,0.3);font-size:9px;">…</span>`;
    for(let i=sP;i<=eP;i++) btns+=`<button class="page-btn${i===feedPage?' active':''}" onclick="setFeedPage(${i})">${i+1}</button>`;
    if(eP<totalPages-1) btns+=`<span style="color:rgba(160,255,216,0.3);font-size:9px;">…</span>`;
    btns+=`<button class="page-btn" onclick="setFeedPage(${feedPage+1})" ${feedPage===totalPages-1?'disabled':''}>▶</button>`;
    return btns;
  }

  const pagesEl=document.getElementById('feed-pages');
  const mobPagesEl=document.getElementById('mob-feed-pages');
  const paginHTML=buildPagination(totalPages);
  if(pagesEl) pagesEl.innerHTML=totalPages>1?paginHTML:'';
  if(mobPagesEl) mobPagesEl.innerHTML=totalPages>1?paginHTML:'';
}

function countryListHTML(items){
  const max=items[0]?.count||1;
  return items.map((d,i)=>{
    const f=FLAG[d.country]||'🌐',pct=Math.round(d.count/max*100),col=countColor(d.count);
    const isActive=activeFilters.country===d.country;
    const cName=countryDisplayName(d.country);
    return `<div class="top-item${isActive?' top-item-active':''}" onclick="filterByCountry('${d.country}')" title="${t('filter_country',cName)}">
      <div class="top-rank">#${i+1}</div><div class="top-flag">${f}</div>
      <div class="top-info">
        <div class="top-country" style="${isActive?'color:var(--accent);':''}">${cName}</div>
        <div class="top-bar-wrap"><div class="top-bar" style="width:${pct}%;background:${col}"></div></div>
      </div>
      <div class="top-count">${d.count}</div>
    </div>`;
  }).join('');
}

function renderCountryLists(){
  const sorted=getAlltimeCountryCounts();
  const empty=`<div class="top-item" style="justify-content:center;padding:12px;color:rgba(160,255,216,0.35);font-size:9px;letter-spacing:0.5px;cursor:default;">${t('top_list_empty')}</div>`;
  const h10=sorted.length?countryListHTML(sorted.slice(0,10)):empty;
  const hall=sorted.length?countryListHTML(sorted):empty;
  const htmlById={top10:h10,topall:hall,'mob-top10':h10,'mob-topall':hall};
  Object.entries(htmlById).forEach(([id,html])=>{
    const el=document.getElementById(id);
    if(el)el.innerHTML=html;
  });
}

function filterByCountry(cc){
  if(activeFilters.country===cc){activeFilters.country=null;}else{activeFilters.country=cc;}
  feedPage=0;renderFeed();renderFilterBar();refreshMapFromData();
  renderCountryLists();
}

function filterByScenario(sc){
  if(activeFilters.scenario===sc){activeFilters.scenario=null;}else{activeFilters.scenario=sc;}
  feedPage=0;renderFeed();renderFilterBar();refreshMapFromData();
}

function clearFilter(key){
  activeFilters[key]=null;
  feedPage=0;renderFeed();renderFilterBar();refreshMapFromData();
  if(key==='country')renderCountryLists();
}

function onFeedSearch(){
  activeFilters.search=(document.getElementById('feed-search').value||'').toLowerCase().trim();
  const ms=document.getElementById('mob-feed-search');
  if(ms)ms.value=document.getElementById('feed-search').value;
  feedPage=0;renderFeed();renderFilterBar();
}

function onMobFeedSearch(){
  activeFilters.search=(document.getElementById('mob-feed-search').value||'').toLowerCase().trim();
  const ds=document.getElementById('feed-search');
  if(ds)ds.value=document.getElementById('mob-feed-search').value;
  feedPage=0;renderFeed();renderFilterBar();
}

function getFilteredFeed(){
  let data=[...feedData];
  if(activeFilters.country) data=data.filter(d=>d.country===activeFilters.country);
  if(activeFilters.scenario) data=data.filter(d=>d.scenario===activeFilters.scenario);
  if(activeFilters.search){
    const q=activeFilters.search;
    data=data.filter(d=>(d.ip||'').includes(q)||(d.country||'').toLowerCase().includes(q)||(d.scenario||'').toLowerCase().includes(q)||(d.city||'').toLowerCase().includes(q)||(d.asname||'').toLowerCase().includes(q));
  }
  return data;
}

function getFilteredAttackData(){
  let data=[...attackData];
  if(activeFilters.country) data=data.filter(d=>d.country===activeFilters.country);
  if(activeFilters.scenario) data=data.filter(d=>d.scenario===activeFilters.scenario);
  return data;
}

const THEMES={
  cyan:  {accent:'#00ffe0',danger:'#ff2244',warn:'#ff8800',ok:'#00ff88',dim:'rgba(0,255,200,0.15)',text:'#a0ffd8',server:'#00aaff',bg:'#020810'},
  red:   {accent:'#ff4466',danger:'#ff0022',warn:'#ffaa00',ok:'#ff6688',dim:'rgba(255,68,102,0.2)', text:'#ffb0b8',server:'#ff8800',bg:'#100208'},
  matrix:{accent:'#00ff88',danger:'#44ff00',warn:'#88ff00',ok:'#00ffcc',dim:'rgba(0,255,136,0.15)',text:'#a0ffb8',server:'#00ff44',bg:'#020d06'},
  amber: {accent:'#ffaa00',danger:'#ff4400',warn:'#ffdd00',ok:'#aaff00',dim:'rgba(255,170,0,0.18)', text:'#ffd880',server:'#00aaff',bg:'#0d0800'},
};
let currentTheme='cyan';

function setTheme(name){
  currentTheme=name;
  const th=THEMES[name]||THEMES.cyan;
  const root=document.documentElement;
  root.style.setProperty('--accent',th.accent);
  root.style.setProperty('--danger',th.danger);
  root.style.setProperty('--warn',th.warn);
  root.style.setProperty('--ok',th.ok);
  root.style.setProperty('--dim',th.dim);
  root.style.setProperty('--text',th.text);
  root.style.setProperty('--server',th.server);
  root.style.setProperty('--bg',th.bg);
  document.body.style.background=th.bg;
  document.body.style.color=th.text;
  if(baseSvg) baseSvg.select('rect').attr('fill',th.bg==='#020810'?'#020d1a':th.bg);
  document.querySelectorAll('.theme-btn').forEach(d=>{
    d.classList.toggle('active',d.id===`theme-${name}`);
  });
  document.querySelectorAll('.mob-theme-dot').forEach(d=>{
    d.classList.toggle('active',d.id===`mob-t-${name}`);
  });
  if(dotG){renderDots();drawServerDots();drawCountryLabels();}
  if(animOn&&linesOn)drawCrowdSecRockets();else clearArcCanvas();
  renderSparkline();
}

function checkAlarms(){} // Stub — kein Sound mehr

function exportCSV(){
  const data=getFilteredFeed();
  const rows=[t('csv_headers')];
  data.forEach(d=>{
    rows.push([d.ip,d.country,d.city||'',d.asnumber||'',d.asname||'',d.scenario,d.count||1,d.time_de||d.time_iso||'']);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const suffix=(activeFilters.country||activeFilters.scenario||activeFilters.search)?'_filtered':'';
  const a=document.createElement('a');a.href=url;a.download=`cyberdefense_${new Date().toISOString().slice(0,10)}${suffix}.csv`;a.click();
  URL.revokeObjectURL(url);
}

function switchMobTab(tabId){
  document.querySelectorAll('.mob-tab-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.mob===tabId);
  });
  document.querySelectorAll('.mob-panel-view').forEach(v=>{
    v.classList.toggle('active',v.id==='mob-view-'+tabId);
  });
  if(tabId==='top10'||tabId==='topall')renderCountryLists();
  syncCompactLayout();
}

document.querySelectorAll('.tab').forEach(tabEl=>{
  tabEl.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
    tabEl.classList.add('active');
    document.getElementById('tc-'+tabEl.dataset.tab).classList.add('active');
  });
});

document.querySelectorAll('.mob-tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>switchMobTab(btn.dataset.mob));
});

function applyLang(){
  normalizeLang();
  const l=LANG[currentLang];
  const vbadge=document.getElementById('map-version-badge');
  if(vbadge)vbadge.textContent=APP_VERSION;
  const hTitle=document.getElementById('h-title');
  if(hTitle)hTitle.innerHTML=LANG.en.title;
  const loadTitle=document.getElementById('load-title');
  if(loadTitle)loadTitle.textContent=l.load_init;
  const ls=document.getElementById('ls');
  if(ls&&!ls.dataset.busy)ls.textContent=l.load_feed;
  document.getElementById('s-attacks-lbl').textContent=l.attacks;
  document.getElementById('s-countries-lbl').textContent=l.countries;
  document.getElementById('s-scenarios-lbl').textContent=l.scenarios;
  document.getElementById('s-live-lbl').textContent=l.live;
  syncMapToggleStates();
  syncSettingsModalLang();
  document.querySelectorAll('[data-tab="feed"]').forEach(e=>e.textContent=l.feed);
  document.querySelectorAll('[data-tab="top10"]').forEach(e=>e.textContent=l.top10);
  document.querySelectorAll('[data-tab="topall"]').forEach(e=>e.textContent=l.all);
  document.querySelectorAll('[data-mob="feed"]').forEach(e=>e.textContent=l.feed);
  document.querySelectorAll('[data-mob="top10"]').forEach(e=>e.textContent=l.top10);
  document.querySelectorAll('[data-mob="topall"]').forEach(e=>e.textContent=l.all);
  document.querySelectorAll('.sort-lbl').forEach(e=>e.textContent=l.sort);
  document.querySelectorAll('#fsort-new,#mob-fsort-new').forEach(e=>e.textContent=l.newest);
  document.querySelectorAll('#fsort-old,#mob-fsort-old').forEach(e=>e.textContent=l.oldest);
  const legs=document.querySelectorAll('.leg-label');
  const legKeys=['leg_1_4','leg_5_9','leg_10_19','leg_20','leg_server'];
  legs.forEach((el,i)=>{if(legKeys[i])el.textContent=l[legKeys[i]];});
  const legHint=document.getElementById('leg-hint');
  if(legHint)legHint.textContent=l.leg_click;
  [['lbl-top-scenarios','top_scenarios'],['lbl-malevolent-ips','malevolent_ips'],['lbl-top-origins','top_origins'],['fs-alerts-lbl','fs_alerts'],['fs-ips-lbl','fs_ips'],['fs-scn-lbl','fs_scenarios'],['fs-ctry-lbl','fs_countries'],['lbl-speed','lbl_speed'],['lbl-range','lbl_range']].forEach(([id,k])=>{const el=document.getElementById(id);if(el&&l[k])el.textContent=l[k];});
  const liveBtn=document.getElementById('mode-live-btn');
  if(liveBtn){liveBtn.textContent=l.live_lbl;liveBtn.title=l.live_title;}
  const playBtn=document.getElementById('replay-play-btn');
  if(playBtn)playBtn.title=l.replay_play_title;
  const stopBtn=document.getElementById('replay-stop-btn');
  if(stopBtn)stopBtn.title=l.replay_stop_title;
  if(liveMode){const clk=document.getElementById('replay-clock');if(clk)clk.textContent=l.live_clock;}
  const bzr=document.getElementById('bzr');
  if(bzr)bzr.title=l.home_zoom;
  const bzp=document.getElementById('bzp');
  if(bzp)bzp.title=l.zoom_prefs_title;
  const zpu=document.getElementById('zoom-prefs-use-lbl');
  if(zpu)zpu.textContent=l.zoom_prefs_use;
  const zps=document.getElementById('zoom-prefs-save');
  if(zps)zps.textContent=l.zoom_prefs_save;
  const zpr=document.getElementById('zoom-prefs-reset');
  if(zpr)zpr.textContent=l.zoom_prefs_reset;
  const zph=document.getElementById('zoom-prefs-home-lbl');
  if(zph)zph.textContent=l.zoom_prefs_home;
  syncZoomPrefsUI();
  const animT=document.getElementById('anim-toggle');
  if(animT)animT.title=l.anim_title;
  const linesT=document.getElementById('lines-toggle');
  if(linesT)linesT.title=l.lines_title;
  const azT=document.getElementById('autozoom-toggle');
  if(azT)azT.title=l.autozoom_title;
  const themeLbl=document.getElementById('theme-lbl');
  if(themeLbl)themeLbl.textContent=l.theme_lbl;
  const themeSpans={theme_cyan:'theme-cyan',theme_alarm:'theme-red',theme_matrix:'theme-matrix',theme_amber:'theme-amber'};
  Object.entries(themeSpans).forEach(([k,id])=>{const btn=document.getElementById(id);const span=btn&&btn.querySelector('span:last-child');if(span&&l[k])span.textContent=l[k];});
  const sparkTitle=document.getElementById('sparkline-title');
  if(sparkTitle)sparkTitle.textContent=l.sparkline;
  const feedSearch=document.getElementById('feed-search');
  if(feedSearch)feedSearch.placeholder=l.search_ph;
  const mobFeedSearch=document.getElementById('mob-feed-search');
  if(mobFeedSearch)mobFeedSearch.placeholder=l.search_ph;
  document.querySelectorAll('.csv-feed-btn').forEach(btn=>{btn.textContent=l.csv_btn;btn.title=l.csv_title;});
  const tipClose=document.getElementById('tip-close');
  if(tipClose){tipClose.title=l.tip_close;tipClose.setAttribute('aria-label',l.tip_close);}
  const ctxClose=document.getElementById('ctx-close');
  if(ctxClose)ctxClose.textContent=l.close;
  const srvLbl=document.getElementById('sidebar-server-lbl');
  if(srvLbl)srvLbl.textContent=SERVER_NAME_MAP;
  const mobWlBadge=document.getElementById('mob-wl-badge');
  if(mobWlBadge)mobWlBadge.title=l.wl_title;
  updateZoomLevel(currentScale);
  if(l.range_labels){
    document.querySelectorAll('.pill-btn[data-range]').forEach(btn=>{
      const lbl=l.range_labels[btn.dataset.range];
      if(lbl)btn.textContent=lbl;
    });
  }
  buildThreatLegend();
  renderFeed();
  renderCountryLists();
  renderFilterBar();
  renderMapPanels();
  const mobAtLbl=document.getElementById('mob-attacks-lbl');
  if(mobAtLbl)mobAtLbl.textContent=l.attacks;
  const mobCoLbl=document.getElementById('mob-countries-lbl');
  if(mobCoLbl)mobCoLbl.textContent=l.countries;
  const mobScLbl=document.getElementById('mob-scenarios-lbl');
  if(mobScLbl)mobScLbl.textContent=l.scenarios;
  const mobAlltimeLbl=document.getElementById('mob-lbl-alltime');
  if(mobAlltimeLbl)mobAlltimeLbl.textContent=l.mob_lbl_alltime;
  const mwsTitle=document.getElementById('mws-title-lbl');
  if(mwsTitle)mwsTitle.textContent=l.map_window_title;
  const mwsAlerts=document.getElementById('mws-alerts-lbl');
  if(mwsAlerts)mwsAlerts.textContent=l.fs_alerts;
  const mwsIps=document.getElementById('mws-ips-lbl');
  if(mwsIps)mwsIps.textContent=l.fs_ips;
  const mwsScn=document.getElementById('mws-scn-lbl');
  if(mwsScn)mwsScn.textContent=l.fs_scenarios;
  const mwsCtry=document.getElementById('mws-ctry-lbl');
  if(mwsCtry)mwsCtry.textContent=l.fs_countries;
  const mobLiveLbl=document.getElementById('mob-live-lbl');
  if(mobLiveLbl)mobLiveLbl.textContent=l.live;
  const mobSparkTitle=document.getElementById('mob-sparkline-title');
  if(mobSparkTitle)mobSparkTitle.textContent=l.sparkline;
  updateSidebarStats();
  updateFooterStats();
  syncWlIpToggleUI();
}
