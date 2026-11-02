/* Little Pixel native Firefox Document Picture-in-Picture launcher.
   PiP is the only floating window mode. Firefox owns its title and URL bars. */
'use strict';
(()=>{
  const params=new URLSearchParams(location.search);
  const floating=params.get('floating')==='1';
  const launch=document.getElementById('openFloatingWindow');
  const controls=document.getElementById('floatingControls');
  const preview=document.querySelector('.preview-head');
  const openTab=document.getElementById('floatingOpenTab');
  const close=document.getElementById('floatingClose');

  function currentPage(){
    const screen=document.getElementById('screen');
    for(const page of ['shortcuts','calendar','clock']){
      if(screen?.classList.contains('is-'+page))return page;
    }
    return ['shortcuts','clock','calendar'].includes(params.get('page'))?params.get('page'):'clock';
  }
  function sourceURL(page){
    const url=new URL(browser.runtime.getURL('index.html'));
    url.searchParams.set('floating','1');
    url.searchParams.set('mode','pip');
    url.searchParams.set('page',page);
    return url.href;
  }
  async function openPiP(page){
    const api=window.documentPictureInPicture;
    if(!api?.requestWindow){
      throw new Error('Document Picture-in-Picture is unavailable to this extension in this Firefox version.');
    }
    // requestWindow is called directly from the click, before any awaited work.
    const pip=await api.requestWindow({width:680,height:480,disallowReturnToOpener:true});
    const doc=pip.document;
    doc.title='Little Pixel · PiP';
    const css=doc.createElement('style');
    css.textContent='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101620} iframe{display:block;width:100%;height:100%;border:0}';
    doc.head.append(css);
    const frame=doc.createElement('iframe');
    frame.title='Little Pixel floating dashboard';
    frame.src=sourceURL(page);
    doc.body.append(frame);
    return pip;
  }

  if(!floating){
    launch?.addEventListener('click',async()=>{
      if(launch.disabled)return;
      launch.disabled=true;
      try{
        // Intentionally do not await anything before requestWindow.
        await openPiP(currentPage());
      }catch(error){
        console.warn('Little Pixel PiP:',error);
        const message='Could not open Picture-in-Picture: '+(error?.message||String(error));
        if(window.lpDialogs?.notice)await window.lpDialogs.notice(message);
        else {
          const status=document.getElementById('status');
          if(status)status.textContent=message;
        }
      }finally{launch.disabled=false;}
    });
    return;
  }

  if(controls)controls.hidden=false;
  if(launch)launch.hidden=true;
  if(preview)preview.hidden=true;
  openTab?.addEventListener('click',async()=>{
    try{await browser.tabs.create({url:browser.runtime.getURL('index.html?page='+currentPage())});}
    catch(error){console.warn('Little Pixel could not open tab:',error);}
  });
  close?.addEventListener('click',()=>{
    // Only close the PiP host, never the user's main browser window.
    if(window.parent!==window){
      try{window.parent.close();}catch(error){console.warn('Could not close PiP:',error);}
    }
  });
  // Open external shortcuts in regular Firefox tabs, not inside PiP.
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[href]');
    if(!anchor||!/^https?:/i.test(anchor.href)||event.defaultPrevented||anchor.target!=='_blank')return;
    event.preventDefault();
    browser.tabs.create({url:anchor.href,active:true}).catch(error=>console.warn('Could not open shortcut:',error));
  },true);
})();
