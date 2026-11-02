/* Load the dashboard even when Firefox's background process is delayed.
   The profile snapshot is read first, with a bounded wait, to avoid losing
   saved settings. Never allow a failed extension API request to blank the UI. */
'use strict';
(async()=>{
  let snapshot=null, timedOut=false;
  const cacheBeforeBoot=localStorage.getItem('little-pixel-clock');
  try{
    const request=browser.runtime.sendMessage({type:'boot'});
    // If bootstrap is slow, catch up from the canonical snapshot later, but only
    // if the user has not made local edits while the dashboard was running.
    request.then(answer=>{
      if(!timedOut||!answer?.ok||!answer.snapshot?.state)return;
      const latest=JSON.stringify(answer.snapshot.state);
      if(localStorage.getItem('little-pixel-clock')===cacheBeforeBoot && latest!==cacheBeforeBoot){
        localStorage.setItem('little-pixel-clock',latest);
        location.reload();
      }
    }).catch(()=>{});
    const boot=await Promise.race([
      request,
      new Promise(resolve=>setTimeout(()=>{timedOut=true;resolve(null);},2200))
    ]);
    if(boot?.ok)snapshot=boot.snapshot;
    if(snapshot?.state)localStorage.setItem('little-pixel-clock',JSON.stringify(snapshot.state));
    if(timedOut)console.warn('Little Pixel: Firefox profile response was delayed; loading cached dashboard.');
  }catch(error){console.warn('Little Pixel bridge startup:',error);}
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;
    script.onload=resolve;script.onerror=()=>reject(Error('Could not load '+src));
    document.body.appendChild(script);
  });
  try{
    await load('app.js');
    await load('bridge-client.js');
  }catch(error){
    console.error('Little Pixel failed to load:',error);
    const warning=document.createElement('div');warning.id='bootWarning';
    Object.assign(warning.style,{position:'fixed',left:'12px',top:'56px',zIndex:'9999',background:'#44202e',color:'#ffe8ee',padding:'12px',borderRadius:'10px'});
    warning.textContent='Little Pixel could not start: '+error.message+' — reload this tab.';
    document.body.append(warning);
  }
})();
