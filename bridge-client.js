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
 const timedSend=(message,ms=11500)=>Promise.race([
   send(message),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox did not respond. Please retry or add a shortcut manually.')),ms))
 ]);
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
  const wanted=sync.checked;
  try{
   if(wanted){
    // Invoke Firefox's permission prompt directly from the user gesture.
    const consent=await browser.permissions.request({data_collection:['browsingActivity','personalCommunications']});
    if(!consent){sync.checked=false;setStatus('Firefox Sync was not enabled: data transmission permission was declined.',true);return;}
   }
   const res=await send({type:'setPrefs',prefs:{syncEnabled:wanted}});
   if(!res?.ok)sync.checked=!wanted;
   setStatus(res?.ok?(wanted?'Desktop Firefox Sync enabled.':'Desktop Firefox Sync disabled.'):(res?.error||'Could not change Firefox Sync settings.'),!res?.ok);
  }catch(e){sync.checked=!wanted;setStatus('Could not request Firefox Sync consent: '+e.message,true);}
 });
 document.getElementById('firefoxSyncNow')?.addEventListener('click',async()=>{
  setStatus('Syncing…');const res=await send({type:'syncNow'});
  setStatus(res.ok?'Synced small settings, links, and notes. Images stay local.':(res.error||'Sync unsuccessful'),!res.ok);
 });
 // Manual import uses the extension background, which checks pinned and New Tab sources.
 let importing=false;
 async function importFirefoxShortcuts({auto=false}={}){
  if(importing)return;
  importing=true;
  const emptyStatus=document.getElementById('emptyImportStatus');
  const emptyButton=document.getElementById('emptyImportFirefox');
  if(emptyButton){emptyButton.disabled=true;emptyButton.textContent='Importing…';}
  if(emptyStatus)emptyStatus.textContent=auto?'Importing Firefox shortcuts and missing icons…':'Checking Firefox shortcuts and missing icons…';
  try{
   const state=JSON.parse(localStorage.getItem(key)||'{}');
   const res=await timedSend({type:auto?'initializeAndFollow':'followNow',state},42000);
   const storedCount=Number(res?.storedCount)||0;
   const iconNote=res?.iconsFound>0?` Recovered ${res.iconsFound} missing favicon${res.iconsFound===1?'':'s'}.`:'';
   const message=!res?.ok?(res?.error||'Firefox could not provide the shortcut list.'):
    res.count>0?`Imported ${res.count} site${res.count===1?'':'s'} from Firefox.${iconNote}`:
    storedCount>0?`Found ${storedCount} saved shortcuts.${iconNote} Restoring the displayed grid.`:
    res.found>0?`Firefox returned ${res.found} sites, but no links were stored. Check the extension debugger.`:
    'Firefox returned no sites. Try adding a pinned shortcut in the native New Tab, then import again; or add a link using ✎.';
   setStatus(message,!res?.ok);
   if(emptyStatus)emptyStatus.textContent=message;
   // Import is a one-time operation, not a reason to reload the clock app.
   // Update the persisted cache and request an in-place shortcut redraw.
   if(res?.ok && res.snapshot?.state){
    const latest=JSON.stringify(res.snapshot.state);
    const changed=latest!==localStorage.getItem(key);
    if(changed){
     incoming=true;last=latest;
     try{localStorage.setItem(key,latest);}
     finally{incoming=false;}
    }
    if(changed||res.count>0||res.iconsFound>0||storedCount>0){
     window.dispatchEvent(new CustomEvent('little-pixel:firefox-imported',
      {detail:{shortcuts:res.snapshot.state.shortcuts,firefoxDismissedUrls:res.snapshot.state.firefoxDismissedUrls}}));
    }
   }
  }catch(e){setStatus('Import failed: '+e.message,true);if(emptyStatus)emptyStatus.textContent='Import failed: '+e.message;}
  finally{importing=false;if(emptyButton){emptyButton.disabled=false;emptyButton.textContent='↧ Import Firefox shortcuts';}}
 }
 document.getElementById('importFirefoxSites')?.addEventListener('click',()=>importFirefoxShortcuts());
 document.getElementById('emptyImportFirefox')?.addEventListener('click',()=>importFirefoxShortcuts());
 function hasModal(){return !!document.querySelector('dialog[open]');}
 let isSaving=false;
 async function saveLatest(){
  if(isSaving||incoming||importing||!active||resetting)return;
  const next=localStorage.getItem(key)||'';
  if(next===last)return;
  if(!next)return;
  try{isSaving=true;const state=JSON.parse(next);const answer=await send({type:'saveState',state,clientId});
   if(answer?.ok)last=next;
   else setStatus((answer?.error||'Could not save Firefox profile data.')+' Will retry.',true);
  }catch(e){setStatus(e.message+' — will retry.',true);}finally{isSaving=false;}
 }
 const watcher=setInterval(saveLatest,750);
 window.addEventListener('pagehide',()=>{if(!active)return;saveLatest().catch(()=>{});});
 browser.storage.onChanged.addListener((changes,area)=>{
  if(resetting||importing||area!=='local'||!changes.lpSnapshot?.newValue)return;
  const snap=changes.lpSnapshot.newValue;
  if(snap.source===clientId||!snap.state)return;
  const next=JSON.stringify(snap.state);
  if(next===last)return;
  // Only auto-refresh when not editing a note/shortcut or holding an open dialog.
  // Avoid losing unsaved form contents. A new tab always loads the latest state.
  if(hasModal()||document.activeElement?.matches('input,textarea,select')||localStorage.getItem(key)!==last){
   setStatus('Other-tab/Firefox Sync changes arrived while you have pending edits. Open a new tab after saving to review.');return;
  }
  incoming=true;last=next;localStorage.setItem(key,next);
  location.reload();
 });
 readPrefs();
 // Save a newly initialized default state when no canonical snapshot exists.
 send({type:'boot'}).then(res=>{
   // Run once automatically when the add-on first sees an empty shortcut grid.
   // Existing profiles with saved shortcuts are never overwritten.
   const hasShortcuts=Array.isArray(res?.snapshot?.state?.shortcuts)&&res.snapshot.state.shortcuts.length>0;
   const isFirstCheck=!localStorage.getItem('lpAutoImportChecked');
   if(!hasShortcuts&&isFirstCheck){
     localStorage.setItem('lpAutoImportChecked','1');
     importFirefoxShortcuts({auto:true});
   }else if(!res?.snapshot&&!importing){last='';saveLatest();}
 }).catch(error=>setStatus('Automatic Firefox import check failed: '+error.message,true));
})();
