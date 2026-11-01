/* Little Pixel Firefox bridge. Never reads passwords, cookies, or page contents. */
'use strict';
const SNAP='lpSnapshot', PREF='lpPreferences', META='lpSyncMeta', CHUNK='lpSyncChunk_';
const DEFAULT_PREF={followTopSites:true,syncEnabled:true};
let bootPromise=null, syncTimer=null, syncBusy=Promise.resolve();
const status={lastSync:0,lastFollow:0,lastError:''};
const bytes=new TextEncoder();

function cleanUrl(text){try{const url=new URL(text);return /^https?:$/.test(url.protocol)?url.href.replace(/\/$/,'').toLowerCase():'';}catch{return '';}}
function allLinks(links){const result=[];for(const it of links||[]){if(it?.type==='group'||Array.isArray(it?.items))result.push(...allLinks(it.items));else if(it?.url)result.push(it);}return result;}
async function prefs(){return {...DEFAULT_PREF,...(await browser.storage.local.get(PREF))[PREF]};}
function putLocal(state,origin,updatedAt=Date.now()){
 return browser.storage.local.set({[SNAP]:{state,source:origin,updatedAt}});
}
function removeMedia(obj){
 // Sync small structured data only; binary wallpapers/icons remain profile-local.
 return JSON.parse(JSON.stringify(obj,(key,value)=>{
   if(key==='wallpapers')return {shared:'',clock:'',calendar:'',shortcuts:''};
   if(key==='iconImage')return '';
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
 const restore=items=>{for(const item of items||[]){if(Array.isArray(item?.items)){restore(item.items);continue;}const old=localLinks.get(item.id);if(old?.iconImage&&!item.iconImage)item.iconImage=old.iconImage;}};
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
async function getFirefoxSites(){
 // Firefox's New Tab list and pinned favorites are distinct API queries.
 // newtab:true ignores includePinned. Make both requests and merge safely.
 let primary=[],pinned=[],errors=[];
 try{primary=await browser.topSites.get({newtab:true,limit:100,includeFavicon:false});}
 catch(e){errors.push('New Tab list: '+e.message);}
 try{pinned=await browser.topSites.get({includePinned:true,includeSearchShortcuts:true,limit:100});}
 catch(e){errors.push('Pinned sites: '+e.message);}
 const combined=[],seen=new Set();
 for(const site of [...(Array.isArray(primary)?primary:[]),...(Array.isArray(pinned)?pinned:[])]){
  const url=cleanUrl(site?.url);
  if(!url||seen.has(url)||/^https?:\/\/[^/]*addons\.mozilla\.org/i.test(url))continue;
  seen.add(url);combined.push(site);
 }
 return {sites:combined,error:errors.length===2?errors.join('; '):'',warnings:errors};
}
async function followFirefox(force=false){
 const options=await prefs();if(!options.followTopSites&&!force)return {ok:true,count:0,found:0,skipped:true};
 if(!force&&Date.now()-status.lastFollow<60000)return {ok:true,count:0,found:status.lastFound||0,cached:true};
 const collected=await getFirefoxSites();
 if(collected.error){status.lastError='Firefox shortcuts unavailable: '+collected.error;return {ok:false,count:0,found:0,error:status.lastError};}
 const sites=collected.sites;
 status.lastFound=sites.length;
 const existing=(await browser.storage.local.get(SNAP))[SNAP]||null;
 // Crucial: do NOT cache a first-run lookup before a profile snapshot exists.
 // The first saveState must retry immediately so native shortcuts appear on install.
 if(!existing?.state)return {ok:true,count:0,found:sites.length,pending:true};
 status.lastFollow=Date.now();
 const next=structuredClone(existing.state);
 if(!Array.isArray(next.shortcuts))next.shortcuts=[];
 const known=new Map(allLinks(next.shortcuts).map(it=>[cleanUrl(it.url),it]));
 let count=0,renamed=0;
 for(const site of sites){
  const url=cleanUrl(site.url);if(!url)continue;
  const old=known.get(url);
  if(old){
   if(old.firefoxFollowed&&old.firefoxOriginalTitle===old.label&&site.title&&old.label!==site.title){old.label=site.title;old.firefoxOriginalTitle=site.title;renamed++;}
   continue;
  }
  const label=(site.title||new URL(url).hostname).slice(0,80);
  const item={id:'ff-'+Date.now().toString(36)+'-'+count+'-'+Math.random().toString(36).slice(2,6),label,url:site.url,icon:'↗',iconMode:'favicon',firefoxFollowed:true,firefoxOriginalTitle:label};
  next.shortcuts.push(item);count++;known.set(url,item);
 }
 if(count||renamed){await putLocal(next,'firefox-top-sites');queueSync();}
 return {ok:true,count,renamed,found:sites.length};
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
    await followFirefox();
    return {ok:true,snapshot:(await browser.storage.local.get(SNAP))[SNAP]||null,prefs:await prefs(),status};
   }
   if(request.type==='saveState'){
    if(!request.state||typeof request.state!=='object'||Array.isArray(request.state))return {ok:false,error:'Invalid state'};
    await putLocal(request.state,request.clientId||'page');queueSync();await followFirefox();await checkReminders();return {ok:true};
   }
   if(request.type==='getPrefs')return {ok:true,prefs:await prefs(),status};
   if(request.type==='setPrefs'){
    const value={...await prefs(),...Object.fromEntries(Object.entries(request.prefs||{}).filter(([key,v])=>key in DEFAULT_PREF&&typeof v==='boolean'))};
    await browser.storage.local.set({[PREF]:value});
    if(value.syncEnabled)queueSync();if(value.followTopSites)await followFirefox(true);
    return {ok:true,prefs:value};
   }
   if(request.type==='factoryReset'){
    // A factory reset clears this extension's synced data as well as the local profile.
    // Reject unexpected snapshots before any destructive operation.
    if(!request.state||typeof request.state!=='object'||Array.isArray(request.state)||!Array.isArray(request.state.shortcuts)||request.state.shortcuts.length!==0||!Array.isArray(request.state.notes)||request.state.notes.length!==0)
      return {ok:false,error:'Invalid fresh-install configuration.'};
    clearTimeout(syncTimer);
    // Fail safely before deleting local data if Firefox Sync cannot be cleared.
    try{await browser.storage.sync.clear();}
    catch(e){return {ok:false,error:'Could not clear Firefox Sync; no local data was deleted: '+e.message};}
    await browser.storage.local.remove([SNAP,PREF,'lpNotified']);
    await browser.storage.local.set({[PREF]:{...DEFAULT_PREF},lpNotified:[]});
    await putLocal(request.state,'factory-reset');
    status.lastFollow=0;status.lastError='';
    const followed=await followFirefox(true);
    const written=await writeSynced();
    if(!written.ok)return {ok:false,error:'Profile reset, but writing the clean Firefox Sync copy failed: '+written.error};
    return {ok:true,imported:followed.count||0,followWarning:followed.ok?null:followed.error};
   }
   if(request.type==='syncNow'){
    await adoptSynced();return await writeSynced();
   }
   if(request.type==='followNow')return await followFirefox(true);
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
