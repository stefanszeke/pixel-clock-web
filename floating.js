/* Firefox window-mode experiment, v6.21.4.
   Do not disguise a normal browser popup as an always-on-top PiP window. */
'use strict';
(()=>{
 const params=new URLSearchParams(location.search);
 const floating=params.get('floating')==='1';
 const mode=params.get('mode')||'panel';
 const controls=document.getElementById('floatingControls');
 const launch=document.getElementById('openFloatingWindow');
 const lab=document.getElementById('windowLab');
 const labStatus=document.getElementById('windowLabStatus');
 const openTab=document.getElementById('floatingOpenTab');
 const close=document.getElementById('floatingClose');
 const preview=document.querySelector('.preview-head');
 const currentPage=()=>{
   const screen=document.getElementById('screen');
   for(const name of ['shortcuts','calendar','clock'])if(screen?.classList.contains('is-'+name))return name;
   return ['shortcuts','clock','calendar'].includes(params.get('page'))?params.get('page'):'clock';
 };
 const sourceURL=(mode,page)=>{
   const url=new URL(browser.runtime.getURL('index.html'));
   url.searchParams.set('floating','1');url.searchParams.set('mode',mode);
   url.searchParams.set('page',page);return url.href;
 };
 const setStatus=(message,error=false)=>{
   if(labStatus){labStatus.textContent=message;labStatus.style.color=error?'#ffb1bd':'#b6e5d5';}
   console[error?'warn':'info']('Little Pixel window experiment:',message);
 };
 async function openPiP(page){
   if(!window.documentPictureInPicture?.requestWindow)throw Error('Document Picture-in-Picture is not available to this extension in your Firefox build. Video PiP is a different feature.');
   // Must be invoked synchronously inside a real click handler, before any await.
   const pip=await window.documentPictureInPicture.requestWindow({width:680,height:480,disallowReturnToOpener:true});
   const doc=pip.document;doc.title='Little Pixel · PiP';
   const css=doc.createElement('style');css.textContent='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101620} iframe{display:block;width:100%;height:100%;border:0}';
   doc.head.append(css);
   const frame=doc.createElement('iframe');frame.title='Little Pixel floating dashboard';frame.src=sourceURL('pip',page);doc.body.append(frame);
   return pip;
 }
 async function openExtensionWindow(type,page){
   const win=await browser.windows.create({url:sourceURL(type,page),type,width:690,height:520,focused:true,allowScriptsToClose:true});
   if(!win?.id)throw Error('Firefox did not return a window identifier.');
   return win;
 }
 function openWebWindow(page){
   const child=window.open(sourceURL('web',page),'littlePixelMinimalTest','popup=yes,width=690,height=520,toolbar=no,location=no,menubar=no,status=no,scrollbars=yes,resizable=yes');
   if(!child)throw Error('Firefox blocked window.open(). Check pop-up permissions.');
   return child;
 }
 if(!floating){
   launch?.addEventListener('click',()=>{
     lab.hidden=!lab.hidden;
     launch.setAttribute('aria-expanded',String(!lab.hidden));
   });
   document.getElementById('windowLabClose')?.addEventListener('click',()=>{lab.hidden=true;launch?.setAttribute('aria-expanded','false');});
   lab?.querySelectorAll('[data-window-mode]').forEach(button=>button.addEventListener('click',async()=>{
     const requested=button.dataset.windowMode;
     setStatus('Opening '+requested+'…');button.disabled=true;
     try{
       const page=currentPage();
       if(requested==='pip')await openPiP(page);
       else if(requested==='panel'||requested==='popup')await openExtensionWindow(requested,page);
       else if(requested==='web')openWebWindow(page);
       setStatus(requested+' window opened. Please check whether Firefox shows a URL bar, title bar and window buttons, and whether it stays on top.');
     }catch(error){setStatus(requested+' failed: '+error.message,true);}
     finally{button.disabled=false;}
   }));
   return;
 }
 if(controls)controls.hidden=false;
 if(launch)launch.hidden=true;
 if(preview)preview.hidden=true;
 openTab?.addEventListener('click',async()=>{
   try{await browser.tabs.create({url:browser.runtime.getURL('index.html?page='+currentPage())});}
   catch(error){console.warn('Little Pixel could not open tab:',error);}
 });
 close?.addEventListener('click',async()=>{
   // Inside the PiP iframe, NEVER close the host browser window.
   if(mode==='pip'){
     if(window.parent!==window){try{window.parent.close();}catch(error){console.warn('Could not close PiP:',error);}}
     return;
   }
   if(mode==='web'){
     window.close();
     // Some Firefox policies prevent closing script-created windows.
     return;
   }
   try{
     const current=await browser.windows.getCurrent();
     if(current?.id && (current.type==='panel'||current.type==='popup'))await browser.windows.remove(current.id);
     else window.close();
   }catch(error){console.warn('Little Pixel window close:',error);window.close();}
 });
 // Force shortcut links into a regular tab, not the tiny floating window.
 document.addEventListener('click',event=>{
   const anchor=event.target.closest?.('a[href]');
   if(!anchor||!/^https?:/i.test(anchor.href)||event.defaultPrevented||anchor.target!=='_blank')return;
   event.preventDefault();
   browser.tabs.create({url:anchor.href,active:true}).catch(error=>console.warn('Could not open shortcut:',error));
 },true);
})();
