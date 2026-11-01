/* Firefox-only configuration bridge. The GitHub Pages app remains unchanged. */
'use strict';
(()=>{
 const key='little-pixel-clock';
 const clientId='tab-'+Math.random().toString(36).slice(2);
 let last=localStorage.getItem(key)||'',incoming=false,active=true,resetting=false;
 window.addEventListener('little-pixel:reset-start',()=>{resetting=true;});
 window.addEventListener('little-pixel:reset-cancel',()=>{resetting=false;last=localStorage.getItem(key)||'';});
 const status=document.getElementById('firefoxBridgeStatus');
 const follow=document.getElementById('firefoxFollow');
 const sync=document.getElementById('firefoxSync');
 const setStatus=(message,error=false)=>{if(status){status.textContent=message;status.style.color=error?'#ff9baa':'';}};
 const send=message=>browser.runtime.sendMessage(message);
 async function readPrefs(){
  try{const answer=await send({type:'getPrefs'});if(answer?.ok){follow.checked=answer.prefs.followTopSites;sync.checked=answer.prefs.syncEnabled;
   if(answer.status?.lastError)setStatus(answer.status.lastError,true);
  }}catch(e){setStatus(e.message,true);}
 }
 follow?.addEventListener('change',async()=>{
  const res=await send({type:'setPrefs',prefs:{followTopSites:follow.checked}});
  setStatus(res.ok?(follow.checked?'Firefox shortcut following enabled.':'Firefox shortcut following paused.'):(res.error||'Failed'),!res.ok);
 });
 sync?.addEventListener('change',async()=>{
  const res=await send({type:'setPrefs',prefs:{syncEnabled:sync.checked}});
  setStatus(res.ok?(sync.checked?'Desktop Firefox Sync enabled.':'Desktop Firefox Sync disabled.'):(res.error||'Failed'),!res.ok);
 });
 document.getElementById('firefoxSyncNow')?.addEventListener('click',async()=>{
  setStatus('Syncing…');const res=await send({type:'syncNow'});
  setStatus(res.ok?'Synced small settings, links, and notes. Images stay local.':(res.error||'Sync unsuccessful'),!res.ok);
 });
 // Manual import uses the extension background, which checks pinned and New Tab sources.
 async function importFirefoxShortcuts(){
  const emptyStatus=document.getElementById('emptyImportStatus');
  const emptyButton=document.getElementById('emptyImportFirefox');
  if(emptyButton){emptyButton.disabled=true;emptyButton.textContent='Importing…';}
  if(emptyStatus)emptyStatus.textContent='Checking Firefox shortcuts…';
  try{
   const res=await send({type:'followNow'});
   const message=!res?.ok?(res?.error||'Firefox could not provide the shortcut list.'):
    res.count>0?`Imported ${res.count} site${res.count===1?'':'s'} from Firefox.`:
    res.found>0?`Firefox returned ${res.found} sites; all are already imported.`:
    'Firefox returned no sites. Try adding a pinned shortcut in the native New Tab, then import again; or add a link using ✎.';
   setStatus(message,!res?.ok);
   if(emptyStatus)emptyStatus.textContent=message;
  }catch(e){setStatus('Import failed: '+e.message,true);if(emptyStatus)emptyStatus.textContent='Import failed: '+e.message;}
  finally{if(emptyButton){emptyButton.disabled=false;emptyButton.textContent='↧ Import Firefox shortcuts';}}
 }
 document.getElementById('importFirefoxSites')?.addEventListener('click',importFirefoxShortcuts);
 document.getElementById('emptyImportFirefox')?.addEventListener('click',importFirefoxShortcuts);
 function hasModal(){return !!document.querySelector('dialog[open]');}
 let isSaving=false;
 async function saveLatest(){
  if(isSaving||incoming||!active||resetting)return;
  const next=localStorage.getItem(key)||'';
  if(next===last)return;
  last=next;
  if(!next)return;
  try{isSaving=true;const state=JSON.parse(next);const answer=await send({type:'saveState',state,clientId});
   if(!answer?.ok)setStatus(answer?.error||'Could not save Firefox profile data.',true);
  }catch(e){setStatus(e.message,true);}finally{isSaving=false;}
 }
 const watcher=setInterval(saveLatest,750);
 window.addEventListener('pagehide',()=>{if(!active)return;saveLatest().catch(()=>{});});
 browser.storage.onChanged.addListener((changes,area)=>{
  if(resetting||area!=='local'||!changes.lpSnapshot?.newValue)return;
  const snap=changes.lpSnapshot.newValue;
  if(snap.source===clientId||!snap.state)return;
  const next=JSON.stringify(snap.state);
  if(next===last)return;
  // Only auto-refresh when not editing a note/shortcut or holding an open dialog.
  // Avoid losing unsaved form contents. A new tab always loads the latest state.
  if(hasModal()||document.activeElement?.matches('input,textarea,select')){
   setStatus('Changes arrived from Firefox Sync. Open a fresh tab to load them.');return;
  }
  incoming=true;last=next;localStorage.setItem(key,next);
  location.reload();
 });
 readPrefs();
 // Save a newly initialized default state when no canonical snapshot exists.
 send({type:'boot'}).then(res=>{if(!res?.snapshot){last='';saveLatest();}}).catch(()=>{});
})();
