function bootstrapApp(){
  normalizeLang();
  loadMapViewPrefs();
  loadShowOwnIpPrefs();
  setupWlIpToggle();
  autoZoomOn=false;
  ensureAutoZoomOff();
  loadMapSettings();
  loadRocketStylePrefs();
  syncMapToggleStates();
  applyLang();

  document.getElementById('set-override-coords')?.addEventListener('change',syncSettingsFormDisabled);
  document.getElementById('set-spawn-mode')?.addEventListener('change',updateSpawnModeHint);
  document.getElementById('set-performance-preset')?.addEventListener('change',e=>applySettingsPreset(e.target.value));
  document.querySelectorAll('[data-settings-jump]').forEach(btn=>btn.addEventListener('click',()=>jumpToSettingsSection(btn.dataset.settingsJump)));
  initSettingsHelpBindings();
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!document.getElementById('settings-modal')?.classList.contains('hidden'))closeSettingsModal();
  });

  ensureAutoZoomOff();
  init();
}

bootstrapApp();
