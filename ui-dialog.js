/* Little Pixel in-app dialogs. Avoid browser-native alert/confirm/prompt,
   which Firefox users may permanently suppress for an extension page. */
'use strict';
(()=>{
 let pending=false;
 function open(kind,message,defaultValue=''){
   if(pending)return Promise.resolve(kind==='confirm'?false:null);
   pending=true;
   return new Promise(resolve=>{
     const dialog=document.createElement('dialog');
     dialog.className='lp-action-dialog';dialog.setAttribute('aria-label','Little Pixel confirmation');
     const card=document.createElement('div');card.className='lp-action-content';
     const heading=document.createElement('h3');heading.textContent=kind==='confirm'?'Please confirm':kind==='input'?'Enter a name':'Little Pixel';
     const body=document.createElement('p');body.textContent=String(message);
     card.append(heading,body);
     let input=null;
     if(kind==='input'){
       input=document.createElement('input');input.type='text';input.className='text-field';input.maxLength=80;input.value=String(defaultValue);input.setAttribute('aria-label','Name');card.append(input);
     }
     const buttons=document.createElement('div');buttons.className='lp-action-buttons';
     const cancel=document.createElement('button');cancel.type='button';cancel.className='ghost';cancel.textContent='Cancel';
     const accept=document.createElement('button');accept.type='button';accept.className=kind==='confirm'?'ghost danger-action':'primary';accept.textContent=kind==='confirm'?'Confirm':kind==='input'?'Save':'OK';
     if(kind!=='notice')buttons.append(cancel);
     buttons.append(accept);card.append(buttons);dialog.append(card);document.body.append(dialog);
     let finished=false;
     const finish=value=>{if(finished)return;finished=true;pending=false;if(dialog.open)dialog.close();dialog.remove();resolve(value);};
     cancel.addEventListener('click',()=>finish(kind==='confirm'?false:null));
     accept.addEventListener('click',()=>finish(kind==='confirm'?true:kind==='input'?input.value:true));
     dialog.addEventListener('cancel',event=>{event.preventDefault();finish(kind==='confirm'?false:null);});
     dialog.addEventListener('click',event=>{if(event.target===dialog)finish(kind==='confirm'?false:null);});
     if(input)input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();finish(input.value);}});
     dialog.showModal();(input||accept).focus({preventScroll:true});if(input)input.select();
   });
 }
 function confirmGroupRemoval(groupName,linkCount){
   if(pending)return Promise.resolve({confirmed:false,removeLinks:false});
   pending=true;
   return new Promise(resolve=>{
     const dialog=document.createElement('dialog');dialog.className='lp-action-dialog';dialog.setAttribute('aria-label','Delete shortcut group');
     const card=document.createElement('div');card.className='lp-action-content';
     const title=document.createElement('h3');title.textContent='Delete group';
     const desc=document.createElement('p');desc.textContent='Delete group “'+groupName+'”? By default, its '+linkCount+' shortcut'+(linkCount===1?'':'s')+' will return to the main grid.';
     const label=document.createElement('label');label.className='lp-group-delete-choice';
     const check=document.createElement('input');check.type='checkbox';
     const caption=document.createElement('span');caption.textContent='Also permanently delete the '+linkCount+' shortcut'+(linkCount===1?'':'s')+' inside';
     label.append(check,caption);
     const buttons=document.createElement('div');buttons.className='lp-action-buttons';
     const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
     const accept=document.createElement('button');accept.type='button';accept.textContent='Delete group';accept.className='danger-action';
     buttons.append(cancel,accept);card.append(title,desc,label,buttons);dialog.append(card);document.body.append(dialog);
     let done=false;const finish=confirmed=>{if(done)return;done=true;pending=false;const removeLinks=confirmed&&check.checked;if(dialog.open)dialog.close();dialog.remove();resolve({confirmed,removeLinks});};
     cancel.addEventListener('click',()=>finish(false));accept.addEventListener('click',()=>finish(true));
     dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
     dialog.addEventListener('click',event=>{if(event.target===dialog)finish(false);});
     dialog.showModal();cancel.focus({preventScroll:true});
   });
 }
 function chooseCellAction(cellNumber){
   if(pending)return Promise.resolve(null);
   pending=true;
   return new Promise(resolve=>{
     const dialog=document.createElement('dialog');dialog.className='lp-action-dialog';
     dialog.setAttribute('aria-label','Create in empty grid cell');
     const card=document.createElement('div');card.className='lp-action-content';
     const title=document.createElement('h3');title.textContent='Create in cell '+cellNumber;
     const desc=document.createElement('p');desc.textContent='What would you like to add here?';
     const choices=document.createElement('div');choices.className='lp-cell-choices';
     const link=document.createElement('button');link.type='button';link.textContent='＋ Shortcut';
     const group=document.createElement('button');group.type='button';group.textContent='⊞ Group';
     choices.append(link,group);
     const actions=document.createElement('div');actions.className='lp-action-buttons';
     const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';actions.append(cancel);
     card.append(title,desc,choices,actions);dialog.append(card);document.body.append(dialog);
     let finished=false;
     const finish=value=>{if(finished)return;finished=true;pending=false;if(dialog.open)dialog.close();dialog.remove();resolve(value);};
     link.addEventListener('click',()=>finish('shortcut'));
     group.addEventListener('click',()=>finish('group'));
     cancel.addEventListener('click',()=>finish(null));
     dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
     dialog.addEventListener('click',event=>{if(event.target===dialog)finish(null);});
     dialog.showModal();link.focus({preventScroll:true});
   });
 }
 window.lpDialogs={confirm:message=>open('confirm',message),input:(message,initial)=>open('input',message,initial),notice:message=>open('notice',message),confirmGroupRemoval,chooseCellAction};
})();
