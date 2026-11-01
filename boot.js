'use strict';
(async()=>{
 let snapshot=null;
 try{
  const boot=await browser.runtime.sendMessage({type:'boot'});
  if(boot?.ok)snapshot=boot.snapshot;
  if(snapshot?.state){localStorage.setItem('little-pixel-clock',JSON.stringify(snapshot.state));}
 }catch(error){console.warn('Little Pixel bridge startup:',error);}
 // App loads only after the canonical extension profile state is available.
 const load=src=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;
  document.body.appendChild(script);
 });
 try{await load('app.js');await load('bridge-client.js');}
 catch(error){console.error('Little Pixel failed to load:',error);}
})();
