/* Little Pixel Firefox bridge. Never reads passwords, cookies, or page contents. */
'use strict';
const SNAP='lpSnapshot', PREF='lpPreferences', META='lpSyncMeta', CHUNK='lpSyncChunk_';
// Sync is opt-in: shortcuts (browsing URLs), notes, and settings may leave this browser through Firefox Sync.
const SYNC_DATA=['browsingActivity','personalCommunications'];
const DEFAULT_PREF={followTopSites:true,syncEnabled:false};
async function hasSyncConsent(){
 try{
  const permissions=await browser.permissions.getAll();
  return Array.isArray(permissions.data_collection)&&SYNC_DATA.every(type=>permissions.data_collection.includes(type));
 }catch{return false;}
}
let bootPromise=null, syncTimer=null, syncBusy=Promise.resolve();
const status={lastSync:0,lastFollow:0,lastError:''};
const bytes=new TextEncoder();

function cleanUrl(text){try{const url=new URL(text);return /^https?:$/.test(url.protocol)?url.href.replace(/\/$/,'').toLowerCase():'';}catch{return '';}}
function allLinks(links){const result=[];for(const it of links||[]){if(it?.type==='group'||Array.isArray(it?.items))result.push(...allLinks(it.items));else if(it?.url)result.push(it);}return result;}
async function prefs(){
 const value={...DEFAULT_PREF,...(await browser.storage.local.get(PREF))[PREF]};
 delete value.autoFaviconRepair; // old v6.21.5 preference is retired
 if(value.syncEnabled && !(await hasSyncConsent()))value.syncEnabled=false;
 return value;
}
function putLocal(state,origin,updatedAt=Date.now()){
 return browser.storage.local.set({[SNAP]:{state,source:origin,updatedAt}});
}
function removeMedia(obj){
 // Sync small structured data only; binary wallpapers/icons remain profile-local.
 return JSON.parse(JSON.stringify(obj,(key,value)=>{
   if(key==='wallpapers')return {shared:'',clock:'',calendar:'',shortcuts:''};
   if(key==='iconImage'||key==='faviconData')return '';
   if(typeof value==='string'&&value.startsWith('data:image/'))return '';
   if(key==='notifiedReminderKeys')return [];
   return value;
 }));
}
function preserveMedia(remote,local){
 if(!local||!remote)return remote;
 const result=structuredClone(remote);
 const stored=local.wallpapers||{};
 result.wallpapers={...result.wallpapers,...stored};
 const localLinks=new Map(allLinks(local.shortcuts).map(s=>[s.id,s]));
 const restore=items=>{for(const item of items||[]){if(Array.isArray(item?.items)){restore(item.items);continue;}const old=localLinks.get(item.id);if(old?.iconImage&&!item.iconImage)item.iconImage=old.iconImage;if(old?.faviconData&&!item.faviconData)item.faviconData=old.faviconData;if(old?.faviconUrl&&!item.faviconUrl)item.faviconUrl=old.faviconUrl;}};
 restore(result.shortcuts);
 return result;
}
const encodeBase64=a=>{let out='';for(let i=0;i<a.length;i+=4096)out+=String.fromCharCode(...a.subarray(i,i+4096));return btoa(out);};
function decodeBase64(value){const str=atob(value);const out=new Uint8Array(str.length);for(let i=0;i<str.length;i++)out[i]=str.charCodeAt(i);return out;}
async function toPayload(value){
 const raw=bytes.encode(JSON.stringify(value));
 if(typeof CompressionStream!=='undefined'){
  const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
  const zipped=new Uint8Array(await new Response(stream).arrayBuffer());
  return {codec:'gzip',payload:encodeBase64(zipped)};
 }
 return {codec:'raw',payload:encodeBase64(raw)};
}
async function fromPayload(meta,payload){
 const arr=decodeBase64(payload);
 let output=arr;
 if(meta.codec==='gzip'){
  const stream=new Blob([arr]).stream().pipeThrough(new DecompressionStream('gzip'));
  output=new Uint8Array(await new Response(stream).arrayBuffer());
 }
 return JSON.parse(new TextDecoder().decode(output));
}
async function readSynced(){
 const all=await browser.storage.sync.get(null);
 const meta=all[META];
 if(!meta||!Number.isInteger(meta.total)||meta.total<1||meta.total>24)return null;
 const parts=[];for(let i=0;i<meta.total;i++){
  if(typeof all[CHUNK+i]!=='string')return null;
  parts.push(all[CHUNK+i]);
 }
 const snap=await fromPayload(meta,parts.join(''));
 if(!snap||!snap.state||!Number.isFinite(snap.updatedAt))return null;
 return snap;
}
async function adoptSynced(){
 const options=await prefs();
 const local=(await browser.storage.local.get(SNAP))[SNAP]||null;
 if(!options.syncEnabled)return local;
 try{
  const remote=await readSynced();
  if(remote&&(!local||remote.updatedAt>local.updatedAt+1)){
   const merged=preserveMedia(remote.state,local?.state);
   const incoming={state:merged,updatedAt:remote.updatedAt,source:'sync'};
   await browser.storage.local.set({[SNAP]:incoming});
   return incoming;
  }
 }catch(e){status.lastError='Firefox Sync read failed: '+e.message;}
 return local;
}
async function writeSynced(){
 const options=await prefs();if(!options.syncEnabled)return {ok:false,error:'Firefox Sync is disabled.'};
 const current=(await browser.storage.local.get(SNAP))[SNAP];if(!current)return {ok:false,error:'Nothing saved yet.'};
 const pack=await toPayload({state:removeMedia(current.state),updatedAt:current.updatedAt});
 const chunks=pack.payload.match(/.{1,6000}/g)||[];
 if(chunks.length>16||pack.payload.length>92000){status.lastError='Sync limit reached. Reduce notes or shortcuts; wallpapers are already excluded.';return {ok:false,error:status.lastError};}
 const entries={};chunks.forEach((part,index)=>entries[CHUNK+index]=part);
 try{
  // Publish the metadata last so remote profiles never load incomplete chunks.
  await browser.storage.sync.set(entries);
  await browser.storage.sync.set({[META]:{codec:pack.codec,total:chunks.length,updatedAt:current.updatedAt}});
  status.lastSync=Date.now();status.lastError='';return {ok:true,lastSync:status.lastSync};
 }catch(e){status.lastError='Sync failed: '+e.message;return {ok:false,error:status.lastError};}
}
function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{syncBusy=syncBusy.then(writeSynced).catch(e=>{status.lastError=e.message;});},2400);}
const SITE_LOOKUP_TIMEOUT_MS=5500;
function capped(promise,ms=SITE_LOOKUP_TIMEOUT_MS){
 return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('Firefox did not respond within '+Math.ceil(ms/1000)+' seconds')),ms))]);
}
async function getFirefoxSites(includeIcons=true){
 // Firefox's native New Tab, pinned, and frequent sites may differ; Firefox
 // ignores includePinned when newtab:true. These must run CONCURRENTLY.
 const requests=[
  ['New Tab list',{newtab:true,limit:100,includeFavicon:includeIcons}],
  ['Pinned sites',{includePinned:true,includeSearchShortcuts:true,includeFavicon:includeIcons,limit:100}]
 ];
 const results=await Promise.all(requests.map(async ([name,opts])=>{
   try{return {name,sites:await capped(browser.topSites.get(opts)),error:''};}
   catch(e){return {name,sites:[],error:e.message};}
 }));
 const combined=[],seen=new Set(),errors=[];
 for(const [index,result] of results.entries()){
  if(result.error)errors.push(result.name+': '+result.error);
  for(const site of Array.isArray(result.sites)?result.sites:[]){
   const url=cleanUrl(site?.url);
   if(!url||seen.has(url)||/^https?:\/\/[^/]*addons\.mozilla\.org/i.test(url))continue;
   seen.add(url);combined.push(site);
  }
 }
 return {sites:combined,error:errors.length===results.length?errors.join('; '):'',warnings:errors};
}
// Import icons once as part of the explicit or first-run Firefox shortcuts import.
// This is NOT a background favicon repair service. It never modifies existing
// manually chosen icons, never monitors future tabs, and saves only once.
const IMPORT_ICON_WAIT_MS=7000;
const IMPORT_ICON_BUDGET_MS=21000;
const IMPORT_ICON_WORKERS=4;
async function resolveImportedIcons(shortcuts){
 const links=allLinks(shortcuts).filter(link=>link?.firefoxFollowed&&link.iconMode==='favicon'&&
   !validBrowserIcon(link.faviconData)&&!validBrowserIcon(link.faviconUrl));
 if(!links.length)return {found:0,attempted:0,missing:0};
 let allowed=false;
 try{allowed=await capped(browser.permissions.contains({permissions:['tabs']}),1200);}catch{}
 if(!allowed)return {found:0,attempted:0,missing:links.length,warning:'Firefox Tabs permission is needed to discover missing imported icons.'};
 // One favicon per hostname, shared between shortcuts at that website.
 const grouped=new Map();
 for(const link of links){
  const url=cleanUrl(link.url);if(!url)continue;
  const hostname=new URL(url).hostname.replace(/^www\./,'');
  if(!grouped.has(hostname))grouped.set(hostname,{url,links:[]});
  grouped.get(hostname).links.push(link);
 }
 let found=0,attempted=0;
 const assign=(group,icon)=>{
  if(!validBrowserIcon(icon))return;
  for(const link of group.links){
   // Never overwrite a user's icon or an icon from Firefox's native import.
   if(validBrowserIcon(link.faviconData)||validBrowserIcon(link.faviconUrl))continue;
   if(icon.startsWith('data:'))link.faviconData=icon;
   else link.faviconUrl=icon;
   found++;
  }
 };
 // Use an icon from an existing open tab first, with no site navigation.
 let tabs=[];
 try{tabs=await capped(browser.tabs.query({}),2000);}catch{}
 for(const tab of tabs){
  try{
   const host=new URL(tab.url).hostname.replace(/^www\./,'');
   const group=grouped.get(host);
   if(group&&validBrowserIcon(tab.favIconUrl))assign(group,tab.favIconUrl);
  }catch{}
 }
 const missing=[...grouped.values()].filter(g=>g.links.some(link=>
   !validBrowserIcon(link.faviconData)&&!validBrowserIcon(link.faviconUrl)));
 const deadline=Date.now()+IMPORT_ICON_BUDGET_MS;
 let index=0;
 async function worker(){
  while(index<missing.length && Date.now()<deadline){
   const group=missing[index++];
   attempted++;
   // Four inactive tabs at most. Sites that don't provide an icon are skipped
   // after a bounded wait; an unavailable site never blocks the whole import.
   const result=await discoverWithTemporaryTab(group.url,Math.min(IMPORT_ICON_WAIT_MS,Math.max(400,deadline-Date.now())));
   if(result.icon)assign(group,result.icon);
  }
 }
 await Promise.all(Array.from({length:Math.min(IMPORT_ICON_WORKERS,missing.length)},worker));
 return {found,attempted,missing:links.length-found};
}
let followInProgress=null;
async function followFirefox(force=false,enrichIcons=false){
 if(followInProgress){
  // A speculative boot-time refresh may already be running. Never let it
  // downgrade the stronger first-run import: follow up with icon enrichment.
  if(!enrichIcons)return followInProgress;
  await followInProgress;
 }
 followInProgress=followFirefoxImpl(force,enrichIcons).finally(()=>{followInProgress=null;});
 return followInProgress;
}
async function followFirefoxImpl(force=false,enrichIcons=false){
 const options=await prefs();if(!options.followTopSites&&!force)return {ok:true,count:0,found:0,skipped:true};
 if(!force&&!enrichIcons&&Date.now()-status.lastFollow<60000)return {ok:true,count:0,found:status.lastFound||0,cached:true};
 const collected=await getFirefoxSites(true);
 if(collected.error){status.lastError='Firefox shortcuts unavailable: '+collected.error;return {ok:false,count:0,found:0,error:status.lastError};}
 const sites=collected.sites;
 status.lastFound=sites.length;
 const existing=(await browser.storage.local.get(SNAP))[SNAP]||null;
 // First run must create the canonical snapshot before we import its sites.
 if(!existing?.state)return {ok:true,count:0,found:sites.length,pending:true};
 const next=structuredClone(existing.state);
 if(!Array.isArray(next.shortcuts))next.shortcuts=[];
 const known=new Map(allLinks(next.shortcuts).map(it=>[cleanUrl(it.url),it]));
 const dismissed=new Set((next.firefoxDismissedUrls||[]).map(cleanUrl));
 let count=0,renamed=0;
 for(const site of sites){
  const url=cleanUrl(site.url);if(!url)continue;
  if(!force&&dismissed.has(url))continue;
  const old=known.get(url);
  if(old){
   if(old.firefoxFollowed&&old.firefoxOriginalTitle===old.label&&site.title&&old.label!==site.title){old.label=site.title;old.firefoxOriginalTitle=site.title;renamed++;}
   continue;
  }
  const label=(site.title||new URL(url).hostname).slice(0,80);
  const favicon=validBrowserIcon(site.favicon);
  const item={id:'ff-'+Date.now().toString(36)+'-'+count+'-'+Math.random().toString(36).slice(2,6),label,url:site.url,icon:'↗',iconMode:'favicon',...(favicon?(favicon.startsWith('data:')?{faviconData:favicon}:{faviconUrl:favicon}):{}),firefoxFollowed:true,firefoxOriginalTitle:label};
  next.shortcuts.push(item);count++;known.set(url,item);
  if(force&&dismissed.has(url))dismissed.delete(url);
 }
 if(force)next.firefoxDismissedUrls=[...dismissed];
 // Only the explicit and first-install import runs one-time native favicon
 // discovery. Normal periodic 'follow Firefox sites' never repairs icons.
 const icons=enrichIcons?await resolveImportedIcons(next.shortcuts):{found:0,attempted:0,missing:0};
 // Avoid committing an obsolete snapshot if another tab saved while we were
 // discovering icons. Merge imported links and icons onto the newest state.
 const newest=(await browser.storage.local.get(SNAP))[SNAP];
 if(newest?.state && newest.updatedAt!==existing.updatedAt){
  const merged=structuredClone(newest.state);
  if(!Array.isArray(merged.shortcuts))merged.shortcuts=[];
  const existingIds=new Set(allLinks(merged.shortcuts).map(s=>s.id));
  const mergedUrls=new Set(allLinks(merged.shortcuts).map(s=>cleanUrl(s.url)));
  for(const item of allLinks(next.shortcuts)){
   if(!item.firefoxFollowed||existingIds.has(item.id)||mergedUrls.has(cleanUrl(item.url)))continue;
   merged.shortcuts.push(item);
  }
  const byId=new Map(allLinks(next.shortcuts).map(s=>[s.id,s]));
  for(const item of allLinks(merged.shortcuts)){
   const enriched=byId.get(item.id);
   if(!item.firefoxFollowed||item.iconMode!=='favicon'||!enriched||cleanUrl(item.url)!==cleanUrl(enriched.url))continue;
   if(!validBrowserIcon(item.faviconData)&&!validBrowserIcon(item.faviconUrl)){
    if(validBrowserIcon(enriched.faviconData))item.faviconData=enriched.faviconData;
    else if(validBrowserIcon(enriched.faviconUrl))item.faviconUrl=enriched.faviconUrl;
   }
  }
  next.shortcuts=merged.shortcuts;
  // Never discard notes, groups, or settings saved in parallel.
  Object.assign(next,{...merged,shortcuts:next.shortcuts});
 }
 if(count||renamed||icons.found){await putLocal(next,'firefox-top-sites');queueSync();}
 status.lastFollow=Date.now();
 return {ok:true,count,renamed,found:sites.length,iconsFound:icons.found,iconsAttempted:icons.attempted,iconsMissing:icons.missing,...(icons.warning?{iconWarning:icons.warning}:{})};
}

// A one-shot native Firefox favicon lookup. Instead of guessing favicon files,
// Firefox can visit a URL in an INACTIVE temporary tab, resolve the site's
// <link rel="icon"> (including CDN URLs), and expose the tab's favIconUrl.
// This happens only on an explicit Save or Refresh in the shortcut editor.
const FAVICON_WAIT_MS=11000;
const validBrowserIcon=icon=>{
 const value=String(icon||'').trim();
 return (/^https:\/\//i.test(value)||/^data:image\/(?:png|jpeg|gif|svg\+xml|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(value))&&value.length<150000?value:'';
};
async function discoverWithTemporaryTab(rawUrl,waitMs=FAVICON_WAIT_MS){
 let tabId=null;
 try{
  const created=await capped(browser.tabs.create({url:rawUrl,active:false}),5000);
  if(!Number.isInteger(created?.id))return {icon:'',error:'Firefox did not create the icon lookup tab.'};
  tabId=created.id;
  const icon=await new Promise(resolve=>{
   let closed=false, busy=false;
   const finish=icon=>{
    if(closed)return;closed=true;
    clearTimeout(timeout);clearInterval(interval);
    try{browser.tabs.onUpdated.removeListener(onUpdated);}catch{}
    resolve(validBrowserIcon(icon));
   };
   const onUpdated=(id,changeInfo={},updated={})=>{
    if(id!==tabId)return;
    const icon=validBrowserIcon(changeInfo.favIconUrl||updated.favIconUrl);
    if(icon)finish(icon);
   };
   // On some Firefox builds the favicon arrives after status=complete;
   // polling catches both late favicon updates and an already-loaded tab.
   const read=async()=>{
    if(closed||busy)return;busy=true;
    try{const tab=await browser.tabs.get(tabId);const icon=validBrowserIcon(tab?.favIconUrl);if(icon)finish(icon);}catch{}
    finally{busy=false;}
   };
   browser.tabs.onUpdated.addListener(onUpdated);
   const timeout=setTimeout(()=>finish(''),waitMs);
   const interval=setInterval(read,650);
   if(validBrowserIcon(created.favIconUrl))finish(created.favIconUrl);
   else void read();
  });
  return {icon,error:icon?'':'Firefox did not expose an icon after loading the website.'};
 }catch(e){return {icon:'',error:'Firefox could not load the website for its icon: '+e.message};}
 finally{if(tabId!==null)try{await browser.tabs.remove(tabId);}catch{}}
}
async function getShortcutFavicon(rawUrl,openTemporaryTab=false){
 const wanted=cleanUrl(rawUrl);
 if(!wanted)return {ok:false,error:'Enter a valid website address.'};
 const hostname=new URL(wanted).hostname.replace(/^www\./,'');
 // If tab access was already granted in an older build, reuse the icon Firefox
 // has actually loaded. Never request browsing permission just for an icon.
 try{
  if(await browser.permissions.contains({permissions:['tabs']})){
   const tabs=await capped(browser.tabs.query({}),1900);
   const matches=tabs.filter(tab=>{
     try{return cleanUrl(tab.url) && new URL(tab.url).hostname.replace(/^www\./,'')===hostname;}catch{return false;}
   }).sort((a,b)=>Number(cleanUrl(b.url)===wanted)-Number(cleanUrl(a.url)===wanted));
   for(const tab of matches){
    const icon=validBrowserIcon(tab.favIconUrl);
    if(icon)return {ok:true,icon,source:'Firefox tab'};
   }
  }
 }catch{}
 // Use Firefox's own native New Tab favicon cache when available. These queries
 // do not import shortcuts and do not change the dashboard.
 const queries=[{newtab:true,limit:100,includeFavicon:true},{onePerDomain:false,limit:100,includeFavicon:true}];
 const batches=await Promise.all(queries.map(opts=>capped(browser.topSites.get(opts),2600).catch(()=>[])));
 let best=null,score=-1;
 for(const site of batches.flat()){
  const icon=String(site?.favicon||'');
  if(!/^data:image\/(?:png|jpeg|gif|svg\+xml|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(icon)||icon.length>150000)continue;
  const siteUrl=cleanUrl(site.url);
  if(!siteUrl)continue;
  const host=new URL(siteUrl).hostname.replace(/^www\./,'');
  if(host!==hostname)continue;
  const candidateScore=siteUrl===wanted?2:1;
  if(candidateScore>score){best=icon;score=candidateScore;}
 }
 if(best)return {ok:true,icon:best,source:'Firefox cache'};
 // Use the browser's real HTML icon discovery only when user explicitly
 // allowed one-time tab access AND clicked Save / Refresh.
 if(openTemporaryTab && await browser.permissions.contains({permissions:['tabs']})){
  const found=await discoverWithTemporaryTab(wanted);
  if(found.icon)return {ok:true,icon:found.icon,source:'Firefox website tab'};
  return {ok:true,icon:'',source:'',reason:found.error};
 }
 return {ok:true,icon:'',source:'',reason:'Firefox tab access not available.'};
}

async function init(){
 const already=await browser.alarms.get('lp-minute');
 if(!already)await browser.alarms.create('lp-minute',{periodInMinutes:1});
 const importAlarm=await browser.alarms.get('lp-native-follow');
 if(!importAlarm)await browser.alarms.create('lp-native-follow',{periodInMinutes:15});
 await adoptSynced();
 return true;
}
function initialized(){if(!bootPromise)bootPromise=init().catch(e=>{status.lastError=e.message;return false;});return bootPromise;}
async function notification(title,body,tag){
 const id=tag||'lp-'+Math.random().toString(36).slice(2);
 await browser.notifications.create(id,{type:'basic',iconUrl:browser.runtime.getURL('icon-192.png'),title:String(title).slice(0,120),message:String(body).slice(0,450)});
 return {ok:true};
}
async function checkReminders(){
 const snap=(await browser.storage.local.get(SNAP))[SNAP];
 if(!snap?.state?.enableNotifications)return;
 const stored=await browser.storage.local.get('lpNotified');const done=new Set(stored.lpNotified||[]);
 const now=Date.now();let changed=false;
 for(const note of snap.state.notes||[]){
  if(note.type!=='reminder'||note.done||!note.date||!note.time)continue;
  const due=new Date(note.date+'T'+note.time+':00').getTime();
  if(!Number.isFinite(due)||now<due||now-due>5*60*1000)continue;
  const key=note.id+'|'+note.date+'|'+note.time;
  if(done.has(key))continue;
  try{await notification('Little Pixel · Reminder',note.text,'lp-reminder-'+note.id);done.add(key);changed=true;}
  catch(e){status.lastError='Notification failed: '+e.message;}
 }
 if(changed)await browser.storage.local.set({lpNotified:[...done].slice(-250)});
}
browser.runtime.onMessage.addListener((request)=>{
 return (async()=>{
  try{
   await initialized();
   if(request.type==='boot'){
    // Never hold the page bootstrap hostage to Firefox's native top-sites lookup.
    // Follow asynchronously; storage.onChanged updates an already-running tab.
    Promise.resolve().then(()=>followFirefox()).catch(e=>{status.lastError='Native shortcut refresh: '+e.message;});
    return {ok:true,snapshot:(await browser.storage.local.get(SNAP))[SNAP]||null,prefs:await prefs(),status};
   }
   if(request.type==='saveState'){
    if(!request.state||typeof request.state!=='object'||Array.isArray(request.state))return {ok:false,error:'Invalid state'};
    await putLocal(request.state,request.clientId||'page');queueSync();Promise.resolve().then(checkReminders).catch(()=>{});return {ok:true};
   }
   if(request.type==='getPrefs')return {ok:true,prefs:await prefs(),status};
   if(request.type==='lookupShortcutFavicon')return await getShortcutFavicon(request.url,request.openTemporaryTab===true);
   if(request.type==='setPrefs'){
    const previousPrefs=await prefs();
    const value={...previousPrefs,...Object.fromEntries(Object.entries(request.prefs||{}).filter(([key,v])=>key in DEFAULT_PREF&&typeof v==='boolean'))};
    if(value.syncEnabled && !(await hasSyncConsent()))return {ok:false,error:'Firefox Sync needs data-transmission consent. Turn it on from this page to grant permission.'};
    await browser.storage.local.set({[PREF]:value});
    if(value.syncEnabled)queueSync();
    // A favicon toggle must not wait for or race against an unrelated top-sites import.
    if(value.followTopSites&&!previousPrefs.followTopSites)await followFirefox(false);
    return {ok:true,prefs:value};
   }
   if(request.type==='factoryReset'){
    // A factory reset clears this extension's synced data as well as the local profile.
    // Reject unexpected snapshots before any destructive operation.
    if(!request.state||typeof request.state!=='object'||Array.isArray(request.state)||!Array.isArray(request.state.shortcuts)||request.state.shortcuts.length!==0||!Array.isArray(request.state.notes)||request.state.notes.length!==0)
      return {ok:false,error:'Invalid fresh-install configuration.'};
    clearTimeout(syncTimer);
    // Let any in-flight sync write finish before clearing the remote snapshot.
    await syncBusy.catch(()=>{});
    // Fail safely before deleting local data if Firefox Sync cannot be cleared.
    try{await browser.storage.sync.clear();}
    catch(e){return {ok:false,error:'Could not clear Firefox Sync; no local data was deleted: '+e.message};}
    await browser.storage.local.remove([SNAP,PREF,'lpNotified']);
    await browser.storage.local.set({[PREF]:{...DEFAULT_PREF},lpNotified:[]});
    await putLocal(request.state,'factory-reset');
    status.lastFollow=0;status.lastError='';
    const followed=await followFirefox(true);
    // The sync store was cleared above. Only write a replacement when the user
    // has explicitly enabled Sync and granted Firefox's data permissions.
    if((await prefs()).syncEnabled){
      const written=await writeSynced();
      if(!written.ok)return {ok:false,error:'Profile reset, but writing the clean Firefox Sync copy failed: '+written.error};
    }
    return {ok:true,imported:followed.count||0,followWarning:followed.ok?null:followed.error};
   }
   if(request.type==='syncNow'){
    await adoptSynced();return await writeSynced();
   }
   if(request.type==='initializeAndFollow'){
     // On first install, the page contains local defaults but there is no
     // canonical snapshot yet. Create it here and import before returning.
     const current=(await browser.storage.local.get(SNAP))[SNAP];
     if(!current?.state && request.state && typeof request.state==='object' && !Array.isArray(request.state) && Array.isArray(request.state.shortcuts)){
       await putLocal(request.state,'native-import-initialized');
       status.lastFollow=0;
     }
     let result=await followFirefox(false,true);
     // A speculative boot-time lookup may have started before the first
     // snapshot existed and returned 'pending'. Run again now that it exists.
     if(result.pending){status.lastFollow=0;result=await followFirefox(false,true);}
     const snapshot=(await browser.storage.local.get(SNAP))[SNAP]||null;
     return {...result,snapshot,storedCount:Array.isArray(snapshot?.state?.shortcuts)?snapshot.state.shortcuts.length:0};
   }
   if(request.type==='followNow'){
    // First-run imports need a canonical snapshot. Without it, followFirefox()
    // previously returned "pending" and never stored the imported sites.
    const current=(await browser.storage.local.get(SNAP))[SNAP];
    if(!current?.state && request.state && typeof request.state==='object' && !Array.isArray(request.state) && Array.isArray(request.state.shortcuts)){
      await putLocal(request.state,'native-import-initialized');
      status.lastFollow=0;
    }
    // Include the canonical snapshot: an already-imported shortcut can be present
    // in storage while this New Tab still displays an older empty state.
    let result=await followFirefox(true,true);
    if(result.pending){status.lastFollow=0;result=await followFirefox(true,true);}
    const snapshot=(await browser.storage.local.get(SNAP))[SNAP]||null;
    return {...result,snapshot,storedCount:Array.isArray(snapshot?.state?.shortcuts)?snapshot.state.shortcuts.length:0};
   }
   if(request.type==='notifyTest')return await notification(request.title||'Little Pixel · Test',request.body||'Firefox notifications are working.');
   return {ok:false,error:'Unknown operation'};
  }catch(e){status.lastError=e.message;return {ok:false,error:e.message};}
 })();
});
browser.storage.onChanged.addListener((changes,area)=>{
 if(area==='sync'&&changes[META])initialized().then(()=>adoptSynced()).catch(()=>{});
});
browser.alarms.onAlarm.addListener(alarm=>{
 if(alarm.name==='lp-minute')checkReminders().catch(()=>{});
 if(alarm.name==='lp-native-follow')followFirefox().catch(()=>{});
});
browser.runtime.onInstalled.addListener(()=>{initialized().catch(()=>{});});
browser.runtime.onStartup.addListener(()=>{initialized().then(checkReminders).catch(()=>{});});
browser.notifications.onClicked.addListener(()=>{browser.tabs.create({url:browser.runtime.getURL('index.html?page=clock')}).catch(()=>{});});
initialized().catch(()=>{});
