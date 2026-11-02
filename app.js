(() => {
  'use strict';
  const themePalettes={
    matrix:{background:'#101d15',color:'#a2ff7c',round:100},
    arcade:{background:'#121632',color:'#7cc9ff',round:10},
    amber:{background:'#1c160b',color:'#ffa837',round:25},
    minimal:{background:'#f2f2ed',color:'#202c37',round:10},
    ocean:{background:'#091d29',color:'#70e5f5',round:100},
    rose:{background:'#080d12',color:'#ff6b90',round:16}
  };
  const defaultViewBackground={wallpaperDim:20,wallpaperFit:'cover',dotGridEnabled:true,dotGridColor:'#ffffff',dotGridSize:1,dotGridGap:14,dotGridScale:110,dotGridRounding:40,dotGridOpacity:11};
  const defaults = {enableNotifications:false,notifiedReminderKeys:[],shortcutBorderOpacity:24,dockBgOpacity:93,dockScale:100,dockAlignment:'center',dockIconsOnly:false,notes:[],clockShowNotes:true,clockShowUpcoming:true,clockMaxNotes:4,showQuickNote:true,clockDoubleClickNote:false,calendarMarkers:'icons',calendarScale:100,calendarTileOpacity:7,shortcutBgOpacity:11,viewBackgrounds:{shortcuts:{...defaultViewBackground},clock:{...defaultViewBackground},calendar:{...defaultViewBackground}},wallpaperModes:{shortcuts:'shared',clock:'shared',calendar:'shared'},wallpaperEnabled:false,wallpaperScope:'shared',wallpaperTarget:'clock',wallpapers:{shared:'',shortcuts:'',clock:'',calendar:''},wallpaperFit:'cover',wallpaperDim:20,dotGridEnabled:true,dotGridColor:'#ffffff',dotGridSize:1,dotGridGap:14,dotGridScale:110,dotGridRounding:40,dotGridOpacity:11,syncDotTexture:false,pinPreview:true,theme:'rose',themeColors:{},themeBackgrounds:{},themeRounds:{},clockScale:90,unlitOpacity:4,pixelGlow:true,backlightGlow:true,glowIntensity:12,backlightStrength:14,colonAnimation:'static',pixelSize:78,timeFormat:'24',seconds:false,date:true,dateFormat:'long',weekday:true,weekdayStyle:'long',dateSeparator:'dot',dateFont:'system',dateSize:80,dateCustom:'dddd · D MMMM YYYY',clockFont:'system',matchDateColor:true,themeDateColors:{},awake:false,showSwitchButtons:true,autoHideDock:false,showShortcutLabels:true,shortcutLayout:'grid',shortcutGridRows:5,shortcutPositions:{},shortcutColumns:12,shortcutGridWidth:90,shortcutCellHeight:104,customThemes:[],shortcutSize:80,shortcutGap:12,shortcutRounding:28,showOutsideDates:true,weekStart:1,highlightWeekends:true,calendarStyle:'soft',calendarFont:'system',calendarDensity:'comfortable',startPage:'clock',firefoxDismissedUrls:[],shortcuts:[]};
  let state={...defaults};
  try {
    const saved=JSON.parse(localStorage.getItem('little-pixel-clock')||'{}');
    for(const key of Object.keys(defaults)) if(saved[key]!==undefined) state[key]=saved[key];
    if(saved.backlightStrength===undefined && Number.isFinite(saved.glowIntensity))state.backlightStrength=saved.glowIntensity;
    // v6.9 compatibility: copy its single/split selection to the explicit per-screen mode.
    if(!saved.wallpaperModes && saved.wallpaperScope==='perPage'){
      state.wallpaperModes=Object.fromEntries(['shortcuts','clock','calendar'].map(k=>[k,saved.wallpapers?.[k]?'own':'shared']));
    }
    // Migrate global wallpaper treatments from v6.10/v6.13 to all three screens.
    if(!saved.viewBackgrounds){
      const legacy={};for(const key of Object.keys(defaultViewBackground))legacy[key]=saved[key]??defaultViewBackground[key];
      state.viewBackgrounds=Object.fromEntries(['shortcuts','clock','calendar'].map(view=>[view,{...legacy}]));
      // Preserve a disabled wallpaper layer, while retaining the uploaded images.
      if(saved.wallpaperEnabled===false && Object.values(saved.wallpapers||{}).some(Boolean))
        state.wallpaperModes=Object.fromEntries(['shortcuts','clock','calendar'].map(view=>[view,'none']));
    }
    // Migrate color selected in the previous version without changing other themes.
    if(typeof saved.color==='string' && !state.themeColors[state.theme]) state.themeColors[state.theme]=saved.color;
  }catch{}
  function sanitizeNotes(raw){
    if(!Array.isArray(raw))return [];
    const seen=new Set();const result=[];
    for(const value of raw.slice(0,250)){
      if(!value||typeof value!=='object'||Array.isArray(value))continue;
      const text=typeof value.text==='string'?value.text.trim().slice(0,600):'';
      if(!text)continue;
      const type=value.type==='reminder'?'reminder':'note';
      const date=typeof value.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.date)&&!Number.isNaN(new Date(value.date+'T12:00:00').getTime())?value.date:'';
      const time=type==='reminder'&&typeof value.time==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time)?value.time:'';
      let id=typeof value.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value.id)?value.id:'note-'+Math.random().toString(36).slice(2,10);
      if(seen.has(id))id='note-'+Math.random().toString(36).slice(2,10);seen.add(id);
      result.push({id,type,text,date,time,pinned:!!value.pinned,done:!!value.done,snoozedUntil:typeof value.snoozedUntil==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.snoozedUntil)?value.snoozedUntil:'',createdAt:typeof value.createdAt==='number'&&Number.isFinite(value.createdAt)?value.createdAt:Date.now()});
    }
    return result;
  }
  state.notes=sanitizeNotes(state.notes);
  state.enableNotifications=!!state.enableNotifications;
  state.notifiedReminderKeys=Array.isArray(state.notifiedReminderKeys)?state.notifiedReminderKeys.filter(x=>typeof x==='string').slice(-150):[];
  for(const [key,low,high,fallback] of [['calendarScale',65,145,100],['calendarTileOpacity',0,100,8],['shortcutBgOpacity',0,100,11],['shortcutBorderOpacity',0,100,24],['dockBgOpacity',0,100,93]]){
    const value=Number(state[key]);state[key]=Number.isFinite(value)?Math.min(high,Math.max(low,value)):fallback;
  }
  state.dockScale=Number.isFinite(Number(state.dockScale))?Math.min(150,Math.max(65,Number(state.dockScale))):100;
  state.dockAlignment=['left','center','right'].includes(state.dockAlignment)?state.dockAlignment:'center';
  state.dockIconsOnly=state.dockIconsOnly===true;
  state.calendarMarkers=['dots','icons'].includes(state.calendarMarkers)?state.calendarMarkers:'icons';
  state.showQuickNote=state.showQuickNote!==false;
  state.clockDoubleClickNote=!!state.clockDoubleClickNote;
  state.clockShowNotes=state.clockShowNotes!==false;
  state.clockShowUpcoming=state.clockShowUpcoming!==false;
  state.clockMaxNotes=Number.isFinite(state.clockMaxNotes)?Math.max(1,Math.min(8,Math.round(state.clockMaxNotes))):4;
  if(!themePalettes[state.theme])state.theme=defaults.theme;
  // Earlier builds used 'mono' for the Minimal font, while the renderer uses 'pixel'.
  if(state.clockFont==='mono')state.clockFont='pixel';
  if(!['static','blink','pulse'].includes(state.colonAnimation))state.colonAnimation='static';
  for(const [key,min,max] of [['clockScale',25,220],['unlitOpacity',0,45],['glowIntensity',0,100],['backlightStrength',0,100]]){
    state[key]=Number.isFinite(state[key])?Math.max(min,Math.min(max,state[key])):defaults[key];
  }
  state.pixelGlow=!!state.pixelGlow;state.backlightGlow=!!state.backlightGlow;state.syncDotTexture=!!state.syncDotTexture;
  if(!Array.isArray(state.shortcuts))state.shortcuts=defaults.shortcuts;
  if(!Array.isArray(state.firefoxDismissedUrls))state.firefoxDismissedUrls=[];
  state.firefoxDismissedUrls=state.firefoxDismissedUrls.filter(u=>typeof u==='string'&&/^https?:\/\//i.test(u)).slice(-250);
  if(!Array.isArray(state.customThemes))state.customThemes=[];
  state.customThemes=state.customThemes.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'&&typeof x.name==='string'&&themePalettes[x.base]).slice(0,30);
  if(!['auto','grid'].includes(state.shortcutLayout))state.shortcutLayout='auto';
  if(!state.shortcutPositions||typeof state.shortcutPositions!=='object'||Array.isArray(state.shortcutPositions))state.shortcutPositions={};
  if(!['clock','calendar','shortcuts'].includes(state.startPage))state.startPage='clock';
  if(!Number.isInteger(state.weekStart)||state.weekStart<0||state.weekStart>6)state.weekStart=1;
  if(!state.wallpaperModes||typeof state.wallpaperModes!=='object'||Array.isArray(state.wallpaperModes))state.wallpaperModes={...defaults.wallpaperModes};
  state.wallpaperModes=Object.fromEntries(['shortcuts','clock','calendar'].map(k=>[k,['shared','own','none'].includes(state.wallpaperModes[k])?state.wallpaperModes[k]:'shared']));
  if(!['shared','perPage'].includes(state.wallpaperScope))state.wallpaperScope='shared';
  if(!['clock','shortcuts','calendar'].includes(state.wallpaperTarget))state.wallpaperTarget='clock';
  if(!['cover','contain'].includes(state.wallpaperFit))state.wallpaperFit='cover';
  if(!state.wallpapers||typeof state.wallpapers!=='object'||Array.isArray(state.wallpapers))state.wallpapers={...defaults.wallpapers};
  for(const k of ['shared','shortcuts','clock','calendar']){
    const value=state.wallpapers[k];
    if(typeof value!=='string'||value.length>600000||!/^data:image\/(?:webp|png|jpeg);base64,/i.test(value))state.wallpapers[k]='';
  }
  const clampSetting=(key,min,max)=>{state[key]=Number.isFinite(state[key])?Math.max(min,Math.min(max,state[key])):defaults[key];};
  for(const [key,min,max] of [['wallpaperDim',0,90],['dotGridSize',1,16],['dotGridGap',2,48],['dotGridScale',40,250],['dotGridRounding',0,100],['dotGridOpacity',1,100]])clampSetting(key,min,max);
  if(!/^#[0-9a-f]{6}$/i.test(state.dotGridColor))state.dotGridColor=defaults.dotGridColor;
  function sanitizeViewBackgrounds(raw){
    const result={};
    for(const name of ['shortcuts','clock','calendar']){
      const source=raw?.[name]&&typeof raw[name]==='object'&&!Array.isArray(raw[name])?raw[name]:{};
      const clean={...defaultViewBackground};
      for(const [key,min,max] of [['wallpaperDim',0,90],['dotGridSize',1,16],['dotGridGap',2,48],['dotGridScale',40,250],['dotGridRounding',0,100],['dotGridOpacity',0,100]])
        if(typeof source[key]==='number'&&Number.isFinite(source[key]))clean[key]=Math.min(max,Math.max(min,source[key]));
      if(['cover','contain'].includes(source.wallpaperFit))clean.wallpaperFit=source.wallpaperFit;
      if(typeof source.dotGridEnabled==='boolean')clean.dotGridEnabled=source.dotGridEnabled;
      if(typeof source.dotGridColor==='string'&&/^#[0-9a-f]{6}$/i.test(source.dotGridColor))clean.dotGridColor=source.dotGridColor;
      result[name]=clean;
    }
    return result;
  }
  state.viewBackgrounds=sanitizeViewBackgrounds(state.viewBackgrounds);

  // A single, full-viewport app. Old ?display=1 links remain compatible.
  const displayPageOverride=new URLSearchParams(location.search).get('page');
  const currentColor=()=>state.themeColors[state.theme]||themePalettes[state.theme].color;
  const currentBackground=()=>state.themeBackgrounds[state.theme]||themePalettes[state.theme].background;
  const currentRound=()=>state.themeRounds[state.theme]??themePalettes[state.theme].round;
  const currentDateColor=()=>state.themeDateColors[state.theme]||currentColor();
  const $=id=>document.getElementById(id);
  const screen=$('screen'),canvas=$('clock'),ctx=canvas.getContext('2d'),dateText=$('dateText'),ampm=$('ampm');
  const colors=['#a2ff7c','#ffad42','#7cc9ff','#ff6b90','#e3e9f4','#bd94ff'];
  const backgrounds=['#080d12','#101d15','#121632','#1c160b','#27192a','#f2f2ed'];
  const glyphs={
    '0':['01110','10001','10011','10101','11001','10001','01110'],
    '1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','10001','00001','00010','00100','01000','11111'],
    '3':['11110','00001','00001','01110','00001','00001','11110'],
    '4':['00010','00110','01010','10010','11111','00010','00010'],
    '5':['11111','10000','10000','11110','00001','00001','11110'],
    '6':['01111','10000','10000','11110','10001','10001','01110'],
    '7':['11111','00001','00010','00100','01000','01000','01000'],
    '8':['01110','10001','10001','01110','10001','10001','01110'],
    '9':['01110','10001','10001','01111','00001','00001','11110'],
    ':':['00','11','11','00','11','11','00']
  };
  const segs={0:'abcedf',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abcdfg'};
  function colorCss(hex,a){const v=hex.replace('#','');const r=parseInt(v.slice(0,2),16),g=parseInt(v.slice(2,4),16),b=parseInt(v.slice(4,6),16);return `rgba(${r},${g},${b},${a})`;}
  function save(){try{localStorage.setItem('little-pixel-clock',JSON.stringify(state));}catch{}}
  // Persist the first-run defaults before the Firefox bridge starts. Without
  // this, the bridge sees an empty localStorage, never saves a profile snapshot,
  // and native shortcut following cannot populate a fresh install.
  if(!localStorage.getItem('little-pixel-clock'))save();
  function set(key,value){state[key]=value;save();apply();}
  function chooseColor(color){state.themeColors={...state.themeColors,[state.theme]:color};save();apply();}
  function chooseBackground(color){state.themeBackgrounds={...state.themeBackgrounds,[state.theme]:color};save();apply();}
  function chooseDateColor(color){state.themeDateColors={...state.themeDateColors,[state.theme]:color};save();apply();}
  function updateRound(value){state.themeRounds={...state.themeRounds,[state.theme]:value};save();apply();}
  function swatches(containerId,values,selected,onChoose){
    $(containerId).replaceChildren();
    values.forEach(c=>{
      const b=document.createElement('button');b.type='button';b.className='swatch';b.style.setProperty('--swatch',c);
      b.setAttribute('aria-label',`Choose color ${c}`);b.setAttribute('aria-pressed',String(selected.toLowerCase()===c));
      b.addEventListener('click',()=>onChoose(c));$(containerId).appendChild(b);
    });
  }
  function wallpaperFor(view){
    const images=state.wallpapers||{};
    const mode=state.wallpaperModes?.[view]||'shared';
    return mode==='none'?'':mode==='own'?(images[view]||''):(images.shared||'');
  }
  function currentViewBackground(view){return state.viewBackgrounds?.[view]||defaultViewBackground;}
  const dotTextureKeys=['dotGridEnabled','dotGridColor','dotGridSize','dotGridGap','dotGridScale','dotGridRounding','dotGridOpacity'];
  function shareDotTexture(source){
    const dots=Object.fromEntries(dotTextureKeys.map(key=>[key,source[key]]));
    state.viewBackgrounds=Object.fromEntries(['shortcuts','clock','calendar'].map(page=>[page,{...currentViewBackground(page),...dots}]));
  }
  function changeViewBackground(key,value){
    if(state.syncDotTexture && dotTextureKeys.includes(key)){
      shareDotTexture({...currentViewBackground(backgroundEditView),[key]:value});
    }else{
      state.viewBackgrounds={...state.viewBackgrounds,[backgroundEditView]:{...currentViewBackground(backgroundEditView),[key]:value}};
    }
    save();apply();
  }
  function applyBackdrop(){
    const name=currentView||state.startPage,config=currentViewBackground(name),img=wallpaperFor(name);
    const parts=[],sizes=[],repeats=[],positions=[];
    if(config.dotGridEnabled){
      const scale=config.dotGridScale/100,unit=(config.dotGridSize+config.dotGridGap)*scale;
      const size=config.dotGridSize*scale,round=size*config.dotGridRounding/200;
      const x=(unit-size)/2;
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${unit}" height="${unit}" viewBox="0 0 ${unit} ${unit}"><rect x="${x}" y="${x}" width="${size}" height="${size}" rx="${round}" fill="${config.dotGridColor}" fill-opacity="${config.dotGridOpacity/100}"/></svg>`;
      parts.push('url("data:image/svg+xml,'+encodeURIComponent(svg)+'")');
      sizes.push(unit+'px '+unit+'px');repeats.push('repeat');positions.push('0 0');
    }
    if(img){
      const shade=config.wallpaperDim/100;
      parts.push(`linear-gradient(rgba(0,0,0,${shade}),rgba(0,0,0,${shade}))`);
      sizes.push('100% 100%');repeats.push('no-repeat');positions.push('center');
      parts.push(`url("${img}")`);sizes.push(config.wallpaperFit);repeats.push('no-repeat');positions.push('center');
    }
    screen.style.backgroundImage=parts.join(',')||'none';
    screen.style.backgroundSize=sizes.join(',')||'auto';
    screen.style.backgroundRepeat=repeats.join(',')||'repeat';
    screen.style.backgroundPosition=positions.join(',')||'0 0';
  }
  function syncBackgroundControls(){
    const name=backgroundEditView,cfg=currentViewBackground(name),mode=state.wallpaperModes[name];
    document.querySelectorAll('[data-background-page]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.backgroundPage===name)));
    $('backgroundViewName').textContent=name[0].toUpperCase()+name.slice(1);
    $('wallpaperModeActive').value=mode;
    $('wallpaperFit').value=cfg.wallpaperFit;
    $('wallpaperDim').value=cfg.wallpaperDim;
    $('wallpaperDimValue').textContent=cfg.wallpaperDim+'%';
    const shared=state.wallpapers.shared||'';
    const sharedThumb=$('wallpaperPreviewShared');
    sharedThumb.style.backgroundImage=shared?`url("${shared}")`:'none';
    sharedThumb.classList.toggle('has-image',!!shared);
    sharedThumb.firstElementChild.textContent=shared?'':'No image';
    document.querySelector('[data-reset-wallpaper="shared"]').disabled=!shared;
    $('wallpaperStatusShared').textContent=shared?'Image saved':'No image';
    const image=mode==='own'?(state.wallpapers[name]||''):mode==='shared'?shared:'';
    const thumb=$('wallpaperPreviewActive');
    thumb.style.backgroundImage=image?`url("${image}")`:'none';
    thumb.classList.toggle('has-image',!!image);
    thumb.firstElementChild.textContent=mode==='none'?'No wallpaper':mode==='own'?'Choose image':'No shared image';
    document.querySelector('[data-reset-wallpaper="active"]').disabled=mode==='shared'&&!state.wallpapers[name];
    $('syncDotTexture').checked=state.syncDotTexture;
    $('dotGridEnabled').checked=!!cfg.dotGridEnabled;
    $('dotGridControls').classList.toggle('is-off',!cfg.dotGridEnabled);
    $('dotGridColor').value=cfg.dotGridColor;
    if(document.activeElement!==$('dotGridHex'))$('dotGridHex').value=cfg.dotGridColor.toUpperCase();
    for(const key of ['dotGridSize','dotGridGap','dotGridScale','dotGridRounding','dotGridOpacity']){
      $(key).value=cfg[key];$(key+'Value').textContent=cfg[key]+(['dotGridSize','dotGridGap'].includes(key)?'px':'%');
    }
  }
  function apply(){
    const color=currentColor(),background=currentBackground(),round=currentRound();
    // Make active theme colors available to floating dialogs outside the screen element.
    document.documentElement.style.setProperty('--clock',color);
    document.documentElement.style.setProperty('--screen',background);
    screen.dataset.theme=state.theme;
    screen.dataset.calendarStyle=state.calendarStyle;
    screen.style.setProperty('--calendar-font',fontFamilies[state.calendarFont]||fontFamilies.system);
    $('calendarGrid').classList.toggle('compact',state.calendarDensity==='compact');
    screen.style.setProperty('--calendar-scale',(state.calendarScale/100));
    screen.style.setProperty('--calendar-tile-fill',state.calendarTileOpacity+'%');
    $('calendarMarkers').value=state.calendarMarkers;
    $('calendarScale').value=state.calendarScale;$('calendarScaleValue').textContent=state.calendarScale+'%';
    $('calendarTileOpacity').value=state.calendarTileOpacity;$('calendarTileOpacityValue').textContent=state.calendarTileOpacity+'%';
    $('pageSwitch').hidden=!state.showSwitchButtons;
    $('dockAlignment').value=state.dockAlignment;
    $('dockIconsOnly').checked=state.dockIconsOnly;
    $('bottomDock').classList.toggle('dock-icons-only',state.dockIconsOnly);
    $('dockScale').value=state.dockScale;
    $('dockScaleValue').textContent=state.dockScale+'%';
    $('bottomDock').dataset.align=state.dockAlignment;
    screen.style.setProperty('--lp-dock-scale',String(state.dockScale/100));
    screen.style.setProperty('--lp-dock-mobile-scale',String(Math.min(1.05,state.dockScale/100)));
    $('autoHideDock').checked=!!state.autoHideDock;
    // Apply to the actual dock: no opaque fallback or full-strength blur behind transparent menu.
    const dockElement=$('bottomDock');
    dockElement.style.setProperty('--dock-opacity',state.dockBgOpacity+'%');
    dockElement.style.setProperty('--dock-blur',Math.round(state.dockBgOpacity*0.12)+'px');
    // Use real alpha rather than an inherited opaque fallback from older CSS.
    // Setting the shorthand with !important overrides the v6.3 display-mode rule.
    dockElement.style.setProperty('background',colorCss(background,state.dockBgOpacity/100),'important');
    dockElement.style.setProperty('backdrop-filter',`blur(${Math.round(state.dockBgOpacity*0.12)}px)`,'important');
    $('dockBgOpacity').value=state.dockBgOpacity;
    $('dockBgOpacityValue').textContent=state.dockBgOpacity+'%';
    updateDockMode();
    screen.style.setProperty('--clock',color);
    screen.style.setProperty('--screen',background);
    applyBackdrop();syncBackgroundControls();
    screen.style.setProperty('--screen-ink',state.matchDateColor?(state.theme==='rose'?color:colorCss(color,.75)):currentDateColor());
    screen.style.setProperty('--date-font',fontFamilies[state.dateFont]||fontFamilies.system);
    screen.style.setProperty('--date-size',state.dateSize/100);
    // Clock size scales width AND height; Amber's segment size was previously height-limited.
    screen.style.setProperty('--clock-zoom',state.clockScale/90);
    screen.style.setProperty('--backlight-opacity',state.backlightGlow?(state.backlightStrength/100*.48):0);
    for(const b of $('themes').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.value===state.theme));
    ['timeFormat','dateFormat','weekdayStyle','dateSeparator','dateFont','clockFont','calendarStyle','calendarFont','calendarDensity'].forEach(id=>$(id).value=state[id]);
    $('weekStart').value=String(state.weekStart);
    $('highlightWeekends').checked=!!state.highlightWeekends;
    $('customDate').value=state.dateCustom;
    $('customFormatRow').hidden=state.dateFormat!=='custom';
    $('weekdaySettings').hidden=state.dateFormat==='custom';
    $('dateExample').textContent=formatDate(new Date(2026,9,31));
    $('dateSize').value=state.dateSize;$('dateSizeValue').textContent=state.dateSize+'%';
    ['seconds','date','weekday','awake','showSwitchButtons','showOutsideDates'].forEach(id=>$(id).checked=state[id]);
    $('dateFormat').disabled=!state.date;$('weekday').disabled=!state.date;
    $('dateFont').disabled=!state.date;$('dateSize').disabled=!state.date;
    $('weekdayStyle').disabled=!state.date||!state.weekday; $('dateSeparator').disabled=!state.date||!state.weekday;
    $('customDate').disabled=!state.date; 
    swatches('colors',colors,color,chooseColor);
    swatches('backgroundColors',backgrounds,background,chooseBackground);
    $('pixelColor').value=color;$('pixelHex').value=color.toUpperCase();$('pixelHex').setAttribute('aria-invalid','false');
    $('backgroundColor').value=background;$('backgroundHex').value=background.toUpperCase();$('backgroundHex').setAttribute('aria-invalid','false');
    $('matchDateColor').checked=state.matchDateColor;
    $('dateColor').disabled=state.matchDateColor; $('dateHex').disabled=state.matchDateColor;
    $('dateColor').value=currentDateColor();$('dateHex').value=currentDateColor().toUpperCase();$('dateHex').setAttribute('aria-invalid','false');
    const pixelTheme=['matrix','arcade','ocean','rose'].includes(state.theme);
    // Amber has an extended range, including much smaller and larger digits.
    const clockMin=state.theme==='amber'?25:30,clockMax=state.theme==='amber'?220:180;
    $('clockScale').min=clockMin;$('clockScale').max=clockMax;
    $('clockScale').value=state.clockScale;$('clockScaleValue').textContent=state.clockScale+'%';
    $('clockFont').value=state.clockFont;
    $('minimalFontRow').hidden=state.theme!=='minimal';
    $('unlitPixelControl').hidden=state.theme==='minimal';
    $('unlitOpacity').value=state.unlitOpacity;$('unlitOpacityValue').textContent=state.unlitOpacity+'%';
    $('pixelGlow').checked=state.pixelGlow;$('backlightGlow').checked=state.backlightGlow;
    $('glowIntensity').value=state.glowIntensity;$('glowIntensityValue').textContent=state.glowIntensity+'%';
    $('backlightStrength').value=state.backlightStrength;$('backlightStrengthValue').textContent=state.backlightStrength+'%';
    $('glowIntensity').disabled=!state.pixelGlow;
    $('backlightStrength').disabled=!state.backlightGlow;
    $('colonAnimation').value=state.colonAnimation;
    $('pixelSize').value=state.pixelSize;$('pixelSizeValue').textContent=state.pixelSize+'%';
    $('pixelRound').value=round;$('pixelRoundValue').textContent=round+'%';
    $('pixelSize').disabled=!pixelTheme;$('pixelRound').disabled=!pixelTheme;$('resetShape').disabled=!pixelTheme;
    $('startPage').value=state.startPage;
    applyShortcutLayout();
    draw();renderCalendar();renderShortcuts();renderClockNotes();renderNotesManager();syncNotesSettings();
  }
  const settingsTabs=[...document.querySelectorAll('.setting-tab')];
  function showSettingsTab(name,focus=false){
    const selectedTab=settingsTabs.find(tab=>tab.dataset.settings===name);
    const categoryLabel=$('settingsCurrentCategory');
    if(categoryLabel&&selectedTab)categoryLabel.textContent=selectedTab.querySelector('.tab-label')?.textContent||'Style';
    for(const tab of settingsTabs){
      const selected=tab.dataset.settings===name;
      tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
      $(tab.getAttribute('aria-controls')).hidden=!selected;
      if(selected&&focus)tab.focus();
    }
  }
  settingsTabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>showSettingsTab(tab.dataset.settings));
    tab.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?settingsTabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+settingsTabs.length)%settingsTabs.length;
      showSettingsTab(settingsTabs[index].dataset.settings,true);
    });
  });
  showSettingsTab('appearance');
  $('themes').addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(b)set('theme',b.dataset.value);});
  const themeKeys=['theme','clockScale','pixelSize','unlitOpacity','pixelGlow','backlightGlow','glowIntensity','backlightStrength','colonAnimation','syncDotTexture','dateFont','calendarFont','calendarStyle','dateSize','clockFont','matchDateColor','dotGridEnabled','dotGridColor','dotGridSize','dotGridGap','dotGridScale','dotGridRounding','dotGridOpacity'];
  const colorKeys=['themeColors','themeBackgrounds','themeRounds','themeDateColors'];
  function currentThemeSnapshot(){
    const preset=Object.fromEntries(themeKeys.map(k=>[k,state[k]]));
    preset.viewBackgrounds=JSON.parse(JSON.stringify(state.viewBackgrounds));
    preset.color=currentColor();preset.background=currentBackground();preset.round=currentRound();preset.dateColor=currentDateColor();
    return preset;
  }
  function renderThemeManager(selected=''){
    const picker=$('savedThemePicker');const choice=selected||picker.value;
    picker.replaceChildren(new Option('Choose a saved theme…',''));
    for(const theme of state.customThemes)picker.add(new Option(theme.name,theme.id));
    picker.value=state.customThemes.some(t=>t.id===choice)?choice:'';
    $('themeCount').textContent=state.customThemes.length+' saved';
    $('updateSavedTheme').disabled=$('deleteSavedTheme').disabled=!picker.value;
    $('applySavedTheme').disabled=!picker.value;
  }
  function loadSavedTheme(item){
    if(!item)return;
    const snap=item.snapshot||{};
    if(!themePalettes[snap.theme])return;
    for(const key of themeKeys){if(snap[key]!==undefined&&typeof snap[key]===typeof defaults[key])state[key]=snap[key];}
    if(snap.backlightStrength===undefined && Number.isFinite(snap.glowIntensity))state.backlightStrength=snap.glowIntensity;
    if(snap.viewBackgrounds)state.viewBackgrounds=sanitizeViewBackgrounds(snap.viewBackgrounds);
    const base=state.theme;
    for(const [key,part] of [['themeColors','color'],['themeBackgrounds','background'],['themeDateColors','dateColor']]){
      if(typeof snap[part]==='string'&&/^#[0-9a-f]{6}$/i.test(snap[part]))state[key]={...state[key],[base]:snap[part]};
    }
    if(Number.isFinite(snap.round))state.themeRounds={...state.themeRounds,[base]:Math.max(0,Math.min(100,snap.round))};
    save();apply();
  }
  $('savedThemePicker').addEventListener('change',()=>renderThemeManager());
  $('applySavedTheme').addEventListener('click',()=>loadSavedTheme(state.customThemes.find(x=>x.id===$('savedThemePicker').value)));
  $('saveThemeAs').addEventListener('click',async()=>{
    if(state.customThemes.length>=30){lpDialogs.notice('You can save up to 30 themes.');return;}
    const name=await lpDialogs.input('Name this theme:', 'My theme '+(state.customThemes.length+1));
    if(name===null)return;const trimmed=name.trim().slice(0,40);if(!trimmed)return;
    const id='theme-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
    state.customThemes.push({id,name:trimmed,base:state.theme,snapshot:currentThemeSnapshot()});
    save();renderThemeManager(id);
  });
  $('updateSavedTheme').addEventListener('click',()=>{
    const item=state.customThemes.find(x=>x.id===$('savedThemePicker').value);if(!item)return;
    item.base=state.theme;item.snapshot=currentThemeSnapshot();save();renderThemeManager(item.id);
  });
  $('deleteSavedTheme').addEventListener('click',async()=>{
    const item=state.customThemes.find(x=>x.id===$('savedThemePicker').value);if(!item||!await lpDialogs.confirm('Delete saved theme “'+item.name+'”?'))return;
    state.customThemes=state.customThemes.filter(x=>x!==item);save();renderThemeManager();
  });
  renderThemeManager();
  for(const key of ['timeFormat','dateFormat','weekdayStyle','dateSeparator','dateFont','clockFont','calendarStyle','calendarFont','calendarDensity','calendarMarkers']) $(key).addEventListener('change',e=>set(key,e.target.value));
  for(const key of ['calendarScale','calendarTileOpacity'])$(key).addEventListener('input',e=>set(key,Number(e.target.value)));
  for(const key of ['seconds','date','weekday','matchDateColor','showSwitchButtons','showShortcutLabels','showOutsideDates','highlightWeekends']) $(key).addEventListener('change',e=>set(key,e.target.checked));
  $('weekStart').addEventListener('change',e=>set('weekStart',Number(e.target.value)));

  document.querySelectorAll('[data-background-page]').forEach(button=>button.addEventListener('click',()=>{
    const page=button.dataset.backgroundPage;
    backgroundEditView=page;
    showView(page);syncBackgroundControls();
  }));
  $('wallpaperModeActive').addEventListener('change',e=>{
    state.wallpaperModes={...state.wallpaperModes,[backgroundEditView]:e.target.value};
    save();apply();
  });
  $('wallpaperFit').addEventListener('change',e=>changeViewBackground('wallpaperFit',e.target.value));
  $('wallpaperDim').addEventListener('input',e=>changeViewBackground('wallpaperDim',Number(e.target.value)));
  document.querySelectorAll('[data-reset-wallpaper]').forEach(button=>button.addEventListener('click',()=>{
    const name=button.dataset.resetWallpaper==='shared'?'shared':backgroundEditView;
    state.wallpapers={...state.wallpapers,[name]:''};
    if(name!=='shared')state.wallpaperModes={...state.wallpaperModes,[name]:'shared'};
    save();apply();
  }));
  $('resetAllWallpapers').addEventListener('click',async()=>{
    if(!await lpDialogs.confirm('Remove the shared wallpaper and all screen-specific wallpaper images?'))return;
    state.wallpapers={...defaults.wallpapers};
    state.wallpaperModes={...defaults.wallpaperModes};
    save();apply();
  });
  $('resetViewBackground').addEventListener('click',()=>{
    const name=backgroundEditView;
    state.wallpaperModes={...state.wallpaperModes,[name]:'shared'};
    state.wallpapers={...state.wallpapers,[name]:''};
    state.viewBackgrounds={...state.viewBackgrounds,[name]:{...defaultViewBackground}};
    if(state.syncDotTexture)shareDotTexture(defaultViewBackground);
    save();apply();
  });
  $('resetDotGrid').addEventListener('click',()=>{
    const dots=Object.fromEntries(dotTextureKeys.map(key=>[key,defaultViewBackground[key]]));
    if(state.syncDotTexture)shareDotTexture({...currentViewBackground(backgroundEditView),...dots});
    else state.viewBackgrounds={...state.viewBackgrounds,[backgroundEditView]:{...currentViewBackground(backgroundEditView),...dots}};
    save();apply();
  });
  let wallpaperUploadTarget='shared';
  document.querySelectorAll('[data-upload-wallpaper]').forEach(button=>button.addEventListener('click',()=>{
    wallpaperUploadTarget=button.dataset.uploadWallpaper==='shared'?'shared':backgroundEditView;
    $('wallpaperFile').click();
  }));
  $('wallpaperFile').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    const key=wallpaperUploadTarget;const message=$('wallpaperStatus');
    message.hidden=false;message.dataset.error='false';
    try{
      if(!/^image\/(?:png|jpeg|webp|gif)$/.test(file.type))throw Error('Choose a PNG, JPG, WebP or GIF.');
      if(file.size>12_000_000)throw Error('Choose an image smaller than 12 MB.');
      message.textContent='Processing image…';
      const bitmap=await createImageBitmap(file);
      try{
        let encoded='';
        for(const [edge,quality] of [[1600,.78],[1280,.7],[1000,.62],[760,.55]]){
          const ratio=Math.min(1,edge/Math.max(bitmap.width,bitmap.height));
          const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
          canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
          encoded=canvas.toDataURL('image/webp',quality);
          if(encoded.length<=470000)break;
        }
        if(encoded.length>470000)throw Error('Image too complex to save locally. Try a smaller one.');
        const oldImages=state.wallpapers,oldModes=state.wallpaperModes;
        state.wallpapers={...oldImages,[key]:encoded};
        if(key!=='shared')state.wallpaperModes={...oldModes,[key]:'own'};
        try{localStorage.setItem('little-pixel-clock',JSON.stringify(state));}
        catch{state.wallpapers=oldImages;state.wallpaperModes=oldModes;throw Error('Local storage is full. Remove an older image.');}
        apply();message.hidden=true;
      }finally{bitmap.close?.();}
    }catch(error){message.textContent=error.message;message.dataset.error='true';}
    finally{event.target.value='';}
  });
  $('syncDotTexture').addEventListener('change',e=>{
    state.syncDotTexture=e.target.checked;
    if(state.syncDotTexture)shareDotTexture(currentViewBackground(backgroundEditView));
    save();apply();
  });
  $('dotGridEnabled').addEventListener('change',e=>changeViewBackground('dotGridEnabled',e.target.checked));
  $('dotGridColor').addEventListener('input',e=>changeViewBackground('dotGridColor',e.target.value));
  $('dotGridHex').addEventListener('change',e=>{
    const value=e.target.value.trim();if(/^#[0-9a-f]{6}$/i.test(value))changeViewBackground('dotGridColor',value.toLowerCase());
    else{e.target.value=currentViewBackground(backgroundEditView).dotGridColor.toUpperCase();}
  });
  for(const key of ['dotGridSize','dotGridGap','dotGridScale','dotGridRounding','dotGridOpacity'])$(key).addEventListener('input',e=>changeViewBackground(key,Number(e.target.value)));
  $('pixelColor').addEventListener('input',e=>chooseColor(e.target.value));
  $('backgroundColor').addEventListener('input',e=>chooseBackground(e.target.value));
  $('dateColor').addEventListener('input',e=>chooseDateColor(e.target.value));
  $('customDate').addEventListener('input',e=>{state.dateCustom=e.target.value;save();$('dateExample').textContent=formatDate(new Date(2026,9,31));draw();});
  $('dateSize').addEventListener('input',e=>set('dateSize',Number(e.target.value)));
  function hexBind(id,onColor,actual){
    const field=$(id);
    field.addEventListener('input',()=>{const valid=/^#[0-9a-f]{6}$/i.test(field.value.trim());field.setAttribute('aria-invalid',String(!valid));if(valid){onColor(field.value.trim().toLowerCase());field.focus();}});
    field.addEventListener('blur',()=>{field.value=actual().toUpperCase();field.setAttribute('aria-invalid','false');});
  }
  hexBind('pixelHex',chooseColor,currentColor);
  hexBind('backgroundHex',chooseBackground,currentBackground);
  hexBind('dateHex',chooseDateColor,currentDateColor);
  $('resetBackground').addEventListener('click',()=>{
    for(const key of ['themeColors','themeBackgrounds','themeDateColors']){
      const palette={...state[key]};delete palette[state.theme];state[key]=palette;
    }
    state.matchDateColor=true;
    save();apply();
  });
  $('clockScale').addEventListener('input',e=>set('clockScale',Number(e.target.value)));
  $('unlitOpacity').addEventListener('input',e=>set('unlitOpacity',Number(e.target.value)));
  $('glowIntensity').addEventListener('input',e=>set('glowIntensity',Number(e.target.value)));
  $('backlightStrength').addEventListener('input',e=>set('backlightStrength',Number(e.target.value)));
  $('pixelGlow').addEventListener('change',e=>set('pixelGlow',e.target.checked));
  $('backlightGlow').addEventListener('change',e=>set('backlightGlow',e.target.checked));
  $('colonAnimation').addEventListener('change',e=>set('colonAnimation',e.target.value));
  $('resetClockEffects').addEventListener('click',()=>{
    for(const key of ['unlitOpacity','pixelGlow','backlightGlow','glowIntensity','backlightStrength','colonAnimation'])state[key]=defaults[key];
    save();apply();
  });
  $('pixelSize').addEventListener('input',e=>set('pixelSize',Number(e.target.value)));
  $('pixelRound').addEventListener('input',e=>updateRound(Number(e.target.value)));
  $('resetShape').addEventListener('click',()=>{const r={...state.themeRounds};delete r[state.theme];set('themeRounds',r);});
  const fontFamilies={
    system:"system-ui,-apple-system,'Segoe UI',sans-serif",
    pixel:"ui-monospace,'Cascadia Code',Consolas,monospace",
    rounded:"'Trebuchet MS',Verdana,sans-serif",
    serif:"Georgia,'Times New Roman',serif",
    tech:"'Arial Narrow','Roboto Condensed',Tahoma,sans-serif"
  };
  const weekdayLong=new Intl.DateTimeFormat('en-GB',{weekday:'long'});
  const weekdayShort=new Intl.DateTimeFormat('en-GB',{weekday:'short'});
  const monthLong=new Intl.DateTimeFormat('en-GB',{month:'long'});
  const monthShort=new Intl.DateTimeFormat('en-GB',{month:'short'});
  function customDate(now){
    const tokens={dddd:weekdayLong.format(now),ddd:weekdayShort.format(now),D:String(now.getDate()),DD:String(now.getDate()).padStart(2,'0'),
      MMMM:monthLong.format(now),MMM:monthShort.format(now),M:String(now.getMonth()+1),MM:String(now.getMonth()+1).padStart(2,'0'),
      YYYY:String(now.getFullYear()),YY:String(now.getFullYear()).slice(-2)};
    return state.dateCustom.replace(/\[[^\]]*\]|dddd|ddd|MMMM|MMM|YYYY|YY|DD|D|MM|M/g,t=>t.startsWith('[')?t.slice(1,-1):tokens[t]);
  }
  function formatDate(now){
    if(state.dateFormat==='custom')return customDate(now);
    let out='';const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0'),d=String(now.getDate()).padStart(2,'0');
    if(state.dateFormat==='dots')out=`${d}.${m}.${y}`;
    else if(state.dateFormat==='short')out=`${d}/${m}/${y}`;
    else if(state.dateFormat==='us')out=`${m}/${d}/${y}`;
    else if(state.dateFormat==='iso')out=`${y}-${m}-${d}`;
    else if(state.dateFormat==='shortmonth')out=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(now);
    else if(state.dateFormat==='monthFirst')out=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric'}).format(now);
    else out=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(now);
    if(!state.weekday)return out;
    const separators={dot:' · ',comma:', ',dash:' — ',newline:'\n',space:' '};
    return (state.weekdayStyle==='short'?weekdayShort:weekdayLong).format(now)+(separators[state.dateSeparator]||' · ')+out;
  }
  function timeString(now){
    let h=now.getHours();
    ampm.hidden=state.timeFormat!=='12';ampm.textContent=h<12?'AM':'PM';
    if(state.timeFormat==='12')h=h%12||12;
    const pad=n=>String(n).padStart(2,'0');
    return `${pad(h)}:${pad(now.getMinutes())}`+(state.seconds?':'+pad(now.getSeconds()):'');
  }
  function resizeCanvas(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;const dpr=Math.min(3,window.devicePixelRatio||1);const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);return {width:r.width,height:r.height};}
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function colonAlpha(now=new Date()){
    if(state.colonAnimation==='blink')return now.getSeconds()%2===0?1:0;
    if(state.colonAnimation==='pulse')return .22+.78*(.5+.5*Math.cos(Date.now()*Math.PI/600));
    return 1;
  }
  function litGlow(size){
    if(!state.pixelGlow||state.glowIntensity===0){ctx.shadowBlur=0;return;}
    ctx.shadowColor=currentColor();ctx.shadowBlur=Math.min(36,Math.max(4,size*.85))*state.glowIntensity/50;
  }
  function clearGlow(){ctx.shadowBlur=0;ctx.shadowColor='transparent';ctx.globalAlpha=1;}

  function drawMatrix(time,r,square){
    const chars=[...time],widths=chars.map(c=>c===':'?2:5),gap=2,total=widths.reduce((a,b)=>a+b,0)+(chars.length-1)*gap;
    const u=Math.min((r.width-14)/(total+1),(r.height-8)/8.2),gridW=u*total,gridH=u*7;
    const x0=(r.width-gridW)/2,y0=(r.height-gridH)/2;
    const color=currentColor(),scale=state.pixelSize/100,round=currentRound(),inactive=state.unlitOpacity/100;
    const colon=colonAlpha();let col=0;
    for(let n=0;n<chars.length;n++){
      const glyph=glyphs[chars[n]]||glyphs['0'],width=widths[n];
      for(let row=0;row<7;row++)for(let c=0;c<width;c++){
        const x=x0+(col+c+.5)*u,y=y0+(row+.5)*u,lit=glyph[row][c]==='1';
        const size=u*(lit?scale:scale*.86);
        if(lit){
          // When the colon blinks off, retain its unlit pixels rather than erasing them.
          const intensity=chars[n]===':'?inactive+(1-inactive)*colon:1;
          ctx.fillStyle=color;ctx.globalAlpha=intensity;
          if(chars[n]===':'&&colon===0)ctx.shadowBlur=0;else litGlow(u);
        }
        else{ctx.fillStyle=colorCss(color,inactive);ctx.globalAlpha=1;ctx.shadowBlur=0;}
        roundRect(x-size/2,y-size/2,size,size,size*(round/200));
      }
      col+=width+gap;
    }
    clearGlow();
  }
  function drawAmber(time,r){
    const chars=[...time],gap=4,widths=chars.map(c=>c===':'?7:25),total=widths.reduce((a,b)=>a+b,0)+gap*(chars.length-1);
    const scale=Math.min((r.width-20)/total,(r.height-12)/50),startX=(r.width-total*scale)/2,startY=(r.height-47*scale)/2;
    const segments={a:[5,0,15,4],b:[20,4,4,17],c:[20,26,4,17],d:[5,43,15,4],e:[1,26,4,17],f:[1,4,4,17],g:[5,21.5,15,4]};
    const color=currentColor(),colon=colonAlpha(),inactive=state.unlitOpacity/100;
    let x=0;
    for(let i=0;i<chars.length;i++){
      const ch=chars[i];ctx.save();ctx.translate(startX+x*scale,startY);ctx.scale(scale,scale);
      if(ch===':'){
        ctx.fillStyle=color;ctx.globalAlpha=inactive+(1-inactive)*colon;
        if(colon===0)ctx.shadowBlur=0;else litGlow(12*scale);
        roundRect(2,12,4,5,1.5);roundRect(2,30,4,5,1.5);
      }else for(const [seg,rr] of Object.entries(segments)){
        const lit=(segs[ch]||'').includes(seg);
        ctx.fillStyle=lit?color:colorCss(color,inactive);ctx.globalAlpha=1;
        if(lit)litGlow(10*scale);else ctx.shadowBlur=0;
        roundRect(...rr,1.3);
      }
      clearGlow();ctx.restore();x+=widths[i]+gap;
    }
    clearGlow();
  }
  function drawMinimal(time,r){
    const size=Math.min(r.height*.75, r.width/(time.length*.60));
    ctx.fillStyle=currentColor();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`650 ${size}px ${fontFamilies[state.clockFont]||fontFamilies.system}`;
    litGlow(size*.3);
    const total=ctx.measureText(time).width;let x=(r.width-total)/2;
    for(const ch of time){
      const cw=ctx.measureText(ch).width;ctx.globalAlpha=ch===':'?(state.unlitOpacity/100+(1-state.unlitOpacity/100)*colonAlpha()):1;
      ctx.fillText(ch,x+cw/2,r.height/2+size*.025);x+=cw;
    }
    clearGlow();
  }
  let displayMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
  let selectedDate=new Date();
  let currentView=null;
  let backgroundEditView=state.startPage;
  let viewAnimations=[];
  function showView(view){
    const next=['clock','calendar','shortcuts'].includes(view)?view:'clock';
    if(next===currentView)return;
    const old=currentView;
    viewAnimations.forEach(a=>a.cancel());viewAnimations=[];
    const order={shortcuts:0,clock:1,calendar:2};
    const direction=old===null?0:Math.sign(order[next]-order[old]);
    for(const name of ['clock','calendar','shortcuts']){
      $(name+'View').hidden=name!==next&&name!==old;
      const cap=name.charAt(0).toUpperCase()+name.slice(1);
      $('tab'+cap).setAttribute('aria-pressed',String(next===name));
      $('preview'+cap).setAttribute('aria-pressed',String(next===name));
    }
    currentView=next;
    backgroundEditView=next;
    applyBackdrop();syncBackgroundControls();
    screen.classList.toggle('is-calendar',next==='calendar');
    screen.classList.toggle('is-shortcuts',next==='shortcuts');
    if(next==='clock')requestAnimationFrame(draw);
    else if(next==='calendar')renderCalendar();
    else renderShortcuts();
    if(!old||!direction||matchMedia('(prefers-reduced-motion: reduce)').matches){
      if(old)$(old+'View').hidden=true;
      return;
    }
    const outgoing=$(old+'View'),incoming=$(next+'View');
    const opts={duration:300,easing:'cubic-bezier(.22,1,.36,1)',fill:'none'};
    const out=outgoing.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*22}%)`,opacity:0}],opts);
    const inc=incoming.animate([{transform:`translateX(${direction*28}%)`,opacity:.25},{transform:'translateX(0)',opacity:1}],opts);
    viewAnimations=[out,inc];
    out.finished.then(()=>{outgoing.hidden=true;}).catch(()=>{});
  }
  // Notification delivery is best-effort while this webpage remains open.
  async function sendSystemNotification(title,body){
    if(typeof browser!=='undefined'&&browser.runtime?.id){const result=await browser.runtime.sendMessage({type:'notifyTest',title,body});if(!result?.ok)throw Error(result?.error||'Notification failed');return;}
    if(!('Notification' in window))throw Error('This browser does not support notifications.');
    if(Notification.permission!=='granted')throw Error('Notifications are not allowed for this site.');
    // Use a service worker on mobile and as a fallback when the constructor is unavailable.
    if('serviceWorker' in navigator){
      try{
        const registration=await navigator.serviceWorker.getRegistration();
        if(registration?.showNotification){await registration.showNotification(title,{body,icon:'./icon-192.png',tag:'little-pixel-'+title});return;}
      }catch{}
    }
    new Notification(title,{body,icon:'./icon-192.png'});
  }
  const notificationStatus=(message,error=false)=>{const el=$('notificationStatus');el.textContent=message;el.dataset.error=String(error);};
  async function requestPermission(){
    if(typeof browser!=='undefined'&&browser.runtime?.id)return true;
    if(!('Notification' in window)){notificationStatus('Notifications are unavailable in this browser.',true);return false;}
    if(!isSecureContext){notificationStatus('Use HTTPS (GitHub Pages) or localhost for notifications.',true);return false;}
    const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
    if(permission!=='granted'){notificationStatus('Notifications are blocked. Change the website permission in Firefox.',true);return false;}
    return true;
  }
  $('testNotification').addEventListener('click',async()=>{
    try{
      if(!await requestPermission())return;
      await sendSystemNotification('Little Pixel · Test','Desktop notifications are working!');
      notificationStatus('Test notification sent.');
    }catch(error){notificationStatus(error?.message||'Could not show a notification.',true);}
  });
  $('enableNotifications').addEventListener('change',async event=>{
    if(event.target.checked){
      if(!await requestPermission()){event.target.checked=false;return;}
      state.enableNotifications=true;notificationStatus(typeof browser!=='undefined'&&browser.runtime?.id?'Firefox notifications enabled (while Firefox is running).':'Notifications enabled while the app is open.');
    }else{state.enableNotifications=false;notificationStatus('Notifications disabled.');}
    save();
  });
  function checkDueReminders(){
    if(typeof browser!=='undefined'&&browser.runtime?.id)return; // Firefox background alarms handle these.
    if(!state.enableNotifications||!('Notification' in window)||Notification.permission!=='granted')return;
    const now=Date.now();
    for(const note of state.notes){
      if(note.type!=='reminder'||note.done||!note.date||!note.time)continue;
      const due=new Date(note.date+'T'+note.time+':00').getTime();
      // An open page can deliver close to due time; old reminders should not flood notifications after a reload.
      if(!Number.isFinite(due)||now<due||now-due>5*60*1000)continue;
      const key=note.id+'|'+note.date+'|'+note.time;
      if(state.notifiedReminderKeys.includes(key))continue;
      state.notifiedReminderKeys.push(key);state.notifiedReminderKeys=state.notifiedReminderKeys.slice(-150);save();
      sendSystemNotification('Little Pixel · Reminder',note.text).catch(()=>notificationStatus('A reminder notification was blocked.',true));
    }
  }
  $('enableNotifications').checked=state.enableNotifications;
  if(state.enableNotifications)notificationStatus(typeof browser!=='undefined'&&browser.runtime?.id?'Firefox notifications enabled (while Firefox is running).':'Notifications enabled while the app is open.');
  setInterval(checkDueReminders,15000);
  // Notes stay local. Clock dismissal unpins instead of deleting the original note.
  const dateKey=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  const todayKey=()=>dateKey(new Date());
  const newNoteId=()=>`note-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const fmtNoteDate=key=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(key+'T12:00:00'));
  function prettyNoteDate(note){return (note.date?fmtNoteDate(note.date):'')+(note.time?' · '+note.time:'');}
  function notesForDay(key){return state.notes.filter(n=>n.date===key).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||a.createdAt-b.createdAt);}
  function noteMarkForDate(key){const entries=notesForDay(key);return {notes:entries.some(n=>n.type==='note'),reminders:entries.some(n=>n.type==='reminder'&&!n.done)};}
  let editingNoteId=null,returnToDay=false,noteEditorDone=false;
  function noteLabel(note){return note.type==='reminder'?'Reminder':'Note';}
  function refreshNotes(){renderClockNotes();renderNotesManager();renderNotesCenter();renderCalendar();if($('dayNotesDialog').open)renderDayNotes();}
  function visibleClockNotes(){
    if(!state.clockShowNotes)return [];
    const today=todayKey();
    const selected=state.notes.filter(n=>n.pinned);
    if(state.clockShowUpcoming){
      const horizon=new Date();horizon.setDate(horizon.getDate()+7);
      for(const n of state.notes){if(n.type==='reminder'&&!n.done&&!n.pinned&&n.date&&n.date>=today&&n.date<=dateKey(horizon)&&!(n.snoozedUntil&&n.snoozedUntil>=today))selected.push(n);}
    }
    return selected.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(a.date||'').localeCompare(String(b.date||''))||a.createdAt-b.createdAt).slice(0,state.clockMaxNotes);
  }
  function renderClockNotes(){
    const shelf=$('clockNoteShelf'),list=$('clockNoteList');list.replaceChildren();
    shelf.classList.toggle('notes-hidden',!state.clockShowNotes);
    if(!state.clockShowNotes)return;
    for(const n of visibleClockNotes()){
      const card=document.createElement('div');card.className='clock-note-card'+(n.done?' is-complete':'');
      {
        card.append(noteTaskButton(n,'clock'));
      }
      const symbol=document.createElement('span');symbol.className='clock-note-kind';symbol.textContent=n.type==='reminder'?'◷':'✎';symbol.title=noteLabel(n);
      const words=document.createElement('span');words.className='clock-note-words';words.textContent=n.text;words.title='Click to edit';words.tabIndex=0;words.setAttribute('role','button');words.setAttribute('aria-label','Edit '+noteLabel(n)+': '+n.text);
      words.addEventListener('click',()=>openNoteEditor(n));words.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openNoteEditor(n);}});
      const clear=document.createElement('button');clear.className='clock-note-clear';clear.type='button';clear.textContent='×';clear.title=n.pinned?'Remove from clock (keep saved note)':'Dismiss upcoming reminder on clock';clear.setAttribute('aria-label',clear.title);
      clear.addEventListener('click',()=>{if(n.pinned){n.pinned=false;}else {n.snoozedUntil=n.date?dateKey(new Date(Date.now()+8*86400000)):todayKey();}save();refreshNotes();});
      if(n.type==='reminder'&&n.date){const when=document.createElement('span');when.className='clock-note-when';when.textContent=prettyNoteDate(n);card.append(symbol,words,when,clear);}else card.append(symbol,words,clear);
      list.appendChild(card);
    }
    shelf.classList.toggle('has-notes',!!list.childElementCount);
  }
  // Icons are SVG elements, not checkbox inputs. Selection uses checkboxes only in multi-select mode.
  function noteVector(name){
    const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('stroke-width','2');
    const parts={check:[['path',{d:'M5 12l5 5L20 7'}]],edit:[['path',{d:'M12 20h9'}],['path',{d:'M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4z'}]],pin:[['path',{d:'M16 3l5 5-4 1-3 4-1 5-4-4-5-1 4-3 1-4z'}],['path',{d:'M9 15l-5 6'}]],trash:[['path',{d:'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7'}]]};
    for(const [tag,attrs] of parts[name]||parts.check){const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);svg.append(el);}return svg;
  }
  function noteTaskButton(n,context='manager'){
    const btn=document.createElement('button');btn.type='button';btn.className='note-task-toggle'+(n.done?' is-done':'')+(context==='clock'?' clock-note-done':'');
    btn.title=n.done?'Mark incomplete':'Mark completed';btn.setAttribute('aria-label',(n.done?'Reopen ':'Complete ')+noteLabel(n)+': '+n.text);
    btn.setAttribute('aria-pressed',String(!!n.done));btn.append(noteVector('check'));
    btn.addEventListener('click',()=>{n.done=!n.done;save();refreshNotes();});return btn;
  }
  function noteIconAction(icon,title,handler,extra=''){
    const btn=document.createElement('button');btn.type='button';btn.className='note-icon-action '+extra;btn.title=title;btn.setAttribute('aria-label',title);btn.append(noteVector(icon));btn.addEventListener('click',handler);return btn;
  }
  const selectedNoteIds=new Set();const notesSelectionMode=true;
  async function deleteNoteQuick(n){
    if(!await lpDialogs.confirm('Delete "'+n.text.slice(0,70)+'" permanently?'))return;
    state.notes=state.notes.filter(item=>item.id!==n.id);selectedNoteIds.delete(n.id);save();refreshNotes();
  }
  function makeNotesRow(n,{forCenter=false}={}){
    const row=document.createElement('div');row.className='note-manager-row'+(n.done?' is-complete':'')+(forCenter&&selectedNoteIds.has(n.id)?' is-multi-selected':'');
    if(forCenter&&notesSelectionMode){
      const multi=document.createElement('input');multi.type='checkbox';multi.className='note-bulk-select';multi.checked=selectedNoteIds.has(n.id);
      multi.title='Select '+noteLabel(n);multi.setAttribute('aria-label','Select '+noteLabel(n)+': '+n.text);
      multi.addEventListener('change',()=>{if(multi.checked)selectedNoteIds.add(n.id);else selectedNoteIds.delete(n.id);renderNotesCenter();});row.append(multi);
    }
    row.append(noteTaskButton(n));
    const text=document.createElement('div');text.className='note-manager-content';
    const type=document.createElement('small');type.textContent=(n.type==='reminder'?'◷ Reminder':'✎ Note')+(n.date?' · '+prettyNoteDate(n):'')+(n.done?' · Done':'');
    const body=document.createElement('span');body.textContent=n.text;body.className=n.done?'is-done':'';text.append(type,body);
    const actions=document.createElement('div');actions.className='note-manager-actions';
    actions.append(noteIconAction('pin',n.pinned?'Unpin from clock':'Pin to clock',()=>{n.pinned=!n.pinned;save();refreshNotes();},n.pinned?'is-active':''));
    actions.append(noteIconAction('edit','Edit '+noteLabel(n),()=>{if($('dayNotesDialog').open){$('dayNotesDialog').close();openNoteEditor(n,{returnDay:true});}else openNoteEditor(n);}));
    actions.append(noteIconAction('trash','Delete '+noteLabel(n),()=>deleteNoteQuick(n),'is-danger'));
    row.append(text,actions);return row;
  }
  function renderNotesManager(){
    const list=$('notesManagerList');list.replaceChildren();
    if(!state.notes.length){const p=document.createElement('p');p.className='note-empty';p.textContent='No notes yet.';list.append(p);return;}
    const sorted=[...state.notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(a.date||'9999').localeCompare(b.date||'9999')||b.createdAt-a.createdAt);
    for(const n of sorted)list.appendChild(makeNotesRow(n));
  }
  function filteredNotes(){
    const query=$('notesSearch').value.toLocaleLowerCase().trim();const status=$('notesStatusFilter').value,type=$('notesTypeFilter').value;
    return state.notes.filter(n=>(status==='all'||(status==='completed')===!!n.done)&&(type==='all'||n.type===type)&&(!query||(n.text+' '+n.date+' '+n.time).toLocaleLowerCase().includes(query)));
  }
  function renderNotesCenter(){
    const list=$('notesCenterList');list.replaceChildren();
    const availableIds=new Set(state.notes.map(n=>n.id));for(const id of selectedNoteIds)if(!availableIds.has(id))selectedNoteIds.delete(id);
    const filtered=filteredNotes();const order=(a,b)=>Number(b.pinned)-Number(a.pinned)||(a.date||'9999').localeCompare(b.date||'9999')||b.createdAt-a.createdAt;
    function section(title,items){
      if(!items.length)return;
      const heading=document.createElement('div');heading.className='note-manager-section-heading';heading.textContent=title+' · '+items.length;list.append(heading);
      for(const n of [...items].sort(order))list.append(makeNotesRow(n,{forCenter:true}));
    }
    section('Active',filtered.filter(n=>!n.done));section('Completed',filtered.filter(n=>n.done));
    if(!filtered.length){const empty=document.createElement('p');empty.className='note-empty';empty.textContent=state.notes.length?'No matching items.':'No notes or reminders yet.';list.append(empty);}
    $('notesBulkTools').hidden=false;
    $('notesBulkCount').textContent=selectedNoteIds.size+' selected';
    for(const id of ['notesBulkComplete','notesBulkReopen','notesBulkDelete'])$(id).disabled=!selectedNoteIds.size;
    $('notesSelectVisible').disabled=!filtered.length;
    const count=$('notesDockCount');const pending=state.notes.filter(n=>n.type==='reminder'&&!n.done).length;
    count.hidden=!pending;count.textContent=pending>99?'99+':String(pending);
  }
  function openNotesCenter(){
    renderNotesCenter();if(!$('notesCenterDialog').open)$('notesCenterDialog').showModal();$('closeNotesCenter').focus({preventScroll:true});
  }
  $('openNotesCenter').addEventListener('click',openNotesCenter);
  $('closeNotesCenter').addEventListener('click',()=>$('notesCenterDialog').close());
  $('centerAddNote').addEventListener('click',()=>openNoteEditor(null,{type:'note'}));
  $('centerAddReminder').addEventListener('click',()=>openNoteEditor(null,{type:'reminder'}));
  for(const id of ['notesSearch','notesStatusFilter','notesTypeFilter'])$(id).addEventListener(id==='notesSearch'?'input':'change',renderNotesCenter);
  $('notesSelectVisible').addEventListener('click',()=>{for(const n of filteredNotes())selectedNoteIds.add(n.id);renderNotesCenter();});
  $('notesClearSelection').addEventListener('click',()=>{selectedNoteIds.clear();renderNotesCenter();});
  async function bulkNotes(action){
    if(!selectedNoteIds.size)return;
    if(action==='delete'&&!await lpDialogs.confirm('Delete '+selectedNoteIds.size+' selected item(s) permanently?'))return;
    if(action==='delete')state.notes=state.notes.filter(n=>!selectedNoteIds.has(n.id));
    else for(const n of state.notes)if(selectedNoteIds.has(n.id))n.done=action==='complete';
    selectedNoteIds.clear();save();refreshNotes();
  }
  $('notesBulkComplete').addEventListener('click',()=>bulkNotes('complete'));
  $('notesBulkReopen').addEventListener('click',()=>bulkNotes('reopen'));
  $('notesBulkDelete').addEventListener('click',()=>bulkNotes('delete'));
  function renderDayNotes(){
    const key=dateKey(selectedDate);$('dayNotesTitle').textContent=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(selectedDate);
    const list=$('dayNotesList');list.replaceChildren();
    const items=notesForDay(key);
    if(!items.length){const p=document.createElement('p');p.className='note-empty';p.textContent='Nothing on this day.';list.append(p);}
    else for(const n of items)list.append(makeNotesRow(n));
  }
  function openDayNotes(){renderDayNotes();if(!$('dayNotesDialog').open)$('dayNotesDialog').showModal();$('closeDayNotes').focus({preventScroll:true});}
  function openNoteEditor(note=null,{type='note',date='',pinned=false,returnDay=false}={}){
    editingNoteId=note?.id||null;returnToDay=!!returnDay;
    $('noteDialogTitle').textContent=note?'Edit '+noteLabel(note):'New '+(type==='reminder'?'reminder':'note');
    $('noteType').value=note?.type||type;$('noteText').value=note?.text||'';$('noteDate').value=note?.date||date;$('noteTime').value=note?.time||'';
    $('notePinned').checked=note?.pinned??pinned;$('deleteNoteButton').hidden=!note;noteEditorDone=!!note?.done;syncNoteEditorDone();
    $('saveNoteButton').textContent=note?'Save changes':'Add '+(type==='reminder'?'reminder':'note');
    toggleNoteTime();$('noteDialog').showModal();$('closeNoteDialog').focus({preventScroll:true});
  }
  function syncNoteEditorDone(){const btn=$('noteToggleDone');btn.replaceChildren(noteVector('check'));btn.classList.toggle('is-done',noteEditorDone);btn.setAttribute('aria-pressed',String(noteEditorDone));btn.title=noteEditorDone?'Mark incomplete':'Mark completed';btn.setAttribute('aria-label',btn.title);$('noteDoneLabel').textContent=noteEditorDone?'Completed':'Mark completed';}
  $('noteToggleDone').addEventListener('click',()=>{noteEditorDone=!noteEditorDone;syncNoteEditorDone();});
  function toggleNoteTime(){
    const reminder=$('noteType').value==='reminder';
    $('noteTimeWrap').hidden=!reminder;
    $('noteDate').required=reminder;
    $('noteTypeHint').textContent=reminder?'Choose a date. You can add a time and mark the reminder completed later.':'Notes are free-form. Pin one to keep it on the clock.';
  }
  function closeNoteEditor(){if($('noteDialog').open)$('noteDialog').close();editingNoteId=null;const back=returnToDay;returnToDay=false;if(back)openDayNotes();}
  $('noteType').addEventListener('change',()=>{toggleNoteTime();$('saveNoteButton').textContent=editingNoteId?'Save changes':'Add '+$('noteType').value;});
  function openFastClockNote(){
    if(!state.clockDoubleClickNote && !state.showQuickNote)return;
    if($('noteDialog').open||$('dayNotesDialog').open)return;
    openNoteEditor(null,{type:'note',pinned:true});
  }
  $('quickClockNote').addEventListener('click',()=>openNoteEditor(null,{type:'note',pinned:true}));
  // Double click on the actual clock, not the screen, to avoid accidental prompts.
  $('clock').addEventListener('dblclick',event=>{if(!state.clockDoubleClickNote)return;event.preventDefault();openFastClockNote();});
  let lastClockTouch=null;
  $('clock').addEventListener('pointerup',event=>{
    if(event.pointerType!=='touch'||!state.clockDoubleClickNote)return;
    const now=Date.now();
    if(lastClockTouch&&now-lastClockTouch.time<370&&Math.hypot(event.clientX-lastClockTouch.x,event.clientY-lastClockTouch.y)<36){
      lastClockTouch=null;event.preventDefault();openFastClockNote();
    }else lastClockTouch={time:now,x:event.clientX,y:event.clientY};
  });
  $('showQuickNote').addEventListener('change',event=>{state.showQuickNote=event.target.checked;save();syncNotesSettings();});
  $('clockDoubleClickNote').addEventListener('change',event=>{state.clockDoubleClickNote=event.target.checked;save();syncNotesSettings();});
  $('settingsAddNote').addEventListener('click',()=>openNoteEditor(null,{type:'note'}));
  $('settingsAddReminder').addEventListener('click',()=>openNoteEditor(null,{type:'reminder'}));
  $('dayAddNote').addEventListener('click',()=>{$('dayNotesDialog').close();openNoteEditor(null,{type:'note',date:dateKey(selectedDate),returnDay:true});});
  $('dayAddReminder').addEventListener('click',()=>{$('dayNotesDialog').close();openNoteEditor(null,{type:'reminder',date:dateKey(selectedDate),returnDay:true});});
  $('closeNoteDialog').addEventListener('click',closeNoteEditor);
  $('cancelNoteButton').addEventListener('click',closeNoteEditor);
  $('closeDayNotes').addEventListener('click',()=>$('dayNotesDialog').close());
  $('openSelectedDay').addEventListener('click',openDayNotes);
  $('noteDialog').addEventListener('click',e=>{if(e.target===$('noteDialog'))closeNoteEditor();});
  $('dayNotesDialog').addEventListener('click',e=>{if(e.target===$('dayNotesDialog'))$('dayNotesDialog').close();});
  $('noteDialog').addEventListener('close',()=>{editingNoteId=null;returnToDay=false;});
  $('noteForm').addEventListener('submit',e=>{
    e.preventDefault();const text=$('noteText').value.trim().slice(0,600);if(!text)return;
    const now=Date.now(),existing=state.notes.find(n=>n.id===editingNoteId);
    const note={id:existing?.id||newNoteId(),type:$('noteType').value==='reminder'?'reminder':'note',text,date:$('noteDate').value,time:$('noteType').value==='reminder'?$('noteTime').value:'',pinned:$('notePinned').checked,done:noteEditorDone,snoozedUntil:existing?.snoozedUntil||'',createdAt:existing?.createdAt||now};
    if(existing)Object.assign(existing,note);else state.notes.push(note);
    if(!note.date&&note.type==='reminder')note.done=false;
    const back=returnToDay;returnToDay=false;$('noteDialog').close();editingNoteId=null;
    save();refreshNotes();if(back)openDayNotes();
  });
  $('deleteNoteButton').addEventListener('click',async()=>{
    if(!editingNoteId)return;const n=state.notes.find(x=>x.id===editingNoteId);if(!n||!await lpDialogs.confirm('Delete this note permanently?'))return;
    state.notes=state.notes.filter(x=>x.id!==editingNoteId);const back=returnToDay;returnToDay=false;$('noteDialog').close();editingNoteId=null;save();refreshNotes();if(back)openDayNotes();
  });
  for(const [id,key] of [['clockShowNotes','clockShowNotes'],['clockShowUpcoming','clockShowUpcoming']])$(id).addEventListener('change',e=>{state[key]=e.target.checked;save();refreshNotes();});
  $('clockMaxNotes').addEventListener('input',e=>{state.clockMaxNotes=Number(e.target.value);$('clockMaxNotesValue').textContent=state.clockMaxNotes;save();renderClockNotes();});
  function syncNotesSettings(){
    $('clockShowNotes').checked=state.clockShowNotes;$('clockShowUpcoming').checked=state.clockShowUpcoming;
    $('showQuickNote').checked=state.showQuickNote;
    $('clockDoubleClickNote').checked=state.clockDoubleClickNote;
    $('quickClockNote').hidden=!state.showQuickNote;
    $('clockMaxNotes').value=state.clockMaxNotes;$('clockMaxNotesValue').textContent=state.clockMaxNotes;
  }
  syncNotesSettings();renderClockNotes();renderNotesManager();renderNotesCenter();
  // Inline vector icons render sharply even in a small calendar cell, without a network request.
  function calendarEventMarker(kind,style){
    if(style==='dots'){const dot=document.createElement('i');dot.className=kind+'-mark';return dot;}
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('width','12');svg.setAttribute('height','12');svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2.2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    svg.classList.add('calendar-marker-icon',kind+'-mark');
    const paths=kind==='reminder'?[['circle',{cx:'12',cy:'12',r:'9'}],['path',{d:'M12 7v5l3.5 2'}]]
      :[['rect',{x:'5',y:'3',width:'14',height:'18',rx:'2'}],['path',{d:'M9 8h6M9 12h6M9 16h4'}]];
    for(const [tag,attrs] of paths){const el=document.createElementNS(ns,tag);for(const [key,val] of Object.entries(attrs))el.setAttribute(key,val);svg.append(el);}
    return svg;
  }
  function renderCalendar(){
    const year=displayMonth.getFullYear(),month=displayMonth.getMonth();
    $('calendarMonth').textContent=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(displayMonth);
    const grid=$('calendarGrid');grid.replaceChildren();
    const first=(new Date(year,month,1).getDay()-state.weekStart+7)%7;
    const dayNames=['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const headers=$('calendarWeekdays');headers.replaceChildren();
    headers.setAttribute('aria-label','Week starts '+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][state.weekStart]);
    for(let i=0;i<7;i++){
      const weekday=(state.weekStart+i)%7;
      const heading=document.createElement('span');heading.textContent=dayNames[weekday];
      if(state.highlightWeekends&&(weekday===0||weekday===6))heading.classList.add('weekend');
      headers.appendChild(heading);
    }
    const days=new Date(year,month+1,0).getDate();
    const weeks=6; // always draw 42 calendar cells
    const today=new Date();
    for(let i=0;i<weeks*7;i++){
      const cellDate=new Date(year,month,i-first+1,12);
      const inMonth=cellDate.getMonth()===month;
      const isToday=cellDate.toDateString()===today.toDateString();
      const isSelected=cellDate.toDateString()===selectedDate.toDateString();
      const b=document.createElement('button');b.type='button';b.className='calendar-day';
      if(!inMonth){b.classList.add('outside');if(!state.showOutsideDates){b.classList.add('empty');b.disabled=true;}}
      if(state.highlightWeekends&&inMonth&&(cellDate.getDay()===0||cellDate.getDay()===6))b.classList.add('weekend');
      if(isToday)b.classList.add('today');
      if(isSelected&&inMonth)b.classList.add('selected');
      b.textContent='';
      const number=document.createElement('span');number.className='calendar-day-number';number.textContent=(!inMonth&&!state.showOutsideDates)?'':String(cellDate.getDate());b.appendChild(number);
      if(inMonth){const mark=noteMarkForDate(dateKey(cellDate));if(mark.notes||mark.reminders){
        const indicators=document.createElement('span');indicators.className='calendar-note-marks';indicators.setAttribute('aria-hidden','true');
        if(mark.notes)indicators.append(calendarEventMarker('note',state.calendarMarkers));
        if(mark.reminders)indicators.append(calendarEventMarker('reminder',state.calendarMarkers));
        b.appendChild(indicators);b.classList.add('has-calendar-notes');
      }}
      b.title=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(cellDate);
      b.setAttribute('aria-label',b.title+(isToday?' (today)':''));
      b.setAttribute('aria-pressed',String(isSelected));
      b.addEventListener('click',()=>{selectedDate=cellDate;if(!inMonth)displayMonth=new Date(cellDate.getFullYear(),cellDate.getMonth(),1);renderCalendar();openDayNotes();});
      grid.appendChild(b);
    }
    $('calendarSelected').textContent=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(selectedDate);
  }
  function shiftMonth(amount){displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()+amount,1);renderCalendar();}
  for(const name of ['Shortcuts','Clock','Calendar']){
    const view=name.toLowerCase();
    $('tab'+name).addEventListener('click',()=>showView(view));
    $('preview'+name).addEventListener('click',()=>showView(view));
  }
  $('previousMonth').addEventListener('click',()=>shiftMonth(-1));
  $('nextMonth').addEventListener('click',()=>shiftMonth(1));
  $('calendarToday').addEventListener('click',()=>{selectedDate=new Date();displayMonth=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);renderCalendar();});
  let touchStart=null, suppressClickUntil=0;
  // A deliberate drag across the empty page switches views on desktop as well
  // as touchscreens. Interactive elements (including draggable shortcuts) are excluded.
  const gestureIgnored=target=>!!target.closest('#previousMonth,#nextMonth,#calendarToday,.view-tabs,#exitFs,.clock-note-shelf,a,button,input,select,textarea,[contenteditable],.shortcut-entry,.group-popover,.settings-open');
  screen.addEventListener('pointerdown',e=>{
    if((e.pointerType==='touch'||e.pointerType==='mouse') && e.button===0 && !shortcutsEditMode && !gestureIgnored(e.target))
      touchStart={x:e.clientX,y:e.clientY,pointerId:e.pointerId,pointerType:e.pointerType};
  });
  screen.addEventListener('pointerup',e=>{
    if(!touchStart||touchStart.pointerId!==e.pointerId)return;
    const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y,threshold=touchStart.pointerType==='mouse'?85:48;touchStart=null;
    if(Math.abs(dx)<threshold||Math.abs(dx)<Math.abs(dy)*1.4)return;
    suppressClickUntil=Date.now()+550;
    if(currentView==='shortcuts' && (dx<0 || ($('shortcutEmpty').hidden===false && dx>0))){
      // The no-shortcuts card is not a dead end: swipe either way to get back to the clock.
      e.preventDefault();showView('clock');
    }
    else if(dx<0&&currentView==='clock')showView('calendar');
    else if(dx>0&&currentView==='calendar')showView('clock');
    else if(dx>0&&currentView==='clock')showView('shortcuts');
  });
  screen.addEventListener('pointercancel',()=>{touchStart=null;});
  screen.addEventListener('click',e=>{
    if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  // Arrow navigation works even when a dock button has keyboard focus.
  // Do not intercept text editing, settings widgets, or active dialogs.
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey)return;
    if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
    const target=e.target instanceof Element?e.target:null;
    if(!target)return;
    if(target.closest('input,select,textarea,[contenteditable="true"],dialog[open],[role="dialog"]'))return;
    if(document.querySelector('dialog[open]'))return;
    if(target.closest('button,a,[role="tab"],[tabindex]')&&!target.closest('#bottomDock'))return;
    if(document.documentElement.classList.contains('settings-open')&&!target.closest('#bottomDock'))return;
    const next=e.key==='ArrowLeft'
      ?({calendar:'clock',clock:'shortcuts'}[currentView])
      :({shortcuts:'clock',clock:'calendar'}[currentView]);
    if(next){showView(next);e.preventDefault();}
  });

  // Shortcuts use DOM APIs (never inject user-supplied markup).
  const symbols=[
    ['🌐','globe web internet'],['⭐','star favorite'],['✨','sparkle shine'],['✦','spark star'],['✧','outline star'],['★','star solid'],['♥','heart love'],['♡','heart outline'],
    ['🏠','house home'],['⌂','house home simple'],['🔎','search magnifier'],['🔗','link chain'],['↗','arrow open external'],['⚙','settings gear'],['☰','menu list'],['☷','list lines'],
    ['📅','calendar dates'],['◷','clock time'],['⏰','alarm clock'],['☀','sun weather'],['☁','cloud weather'],['☂','umbrella rain'],['🌙','moon night'],['⚡','lightning electricity'],
    ['🎵','music audio note'],['♫','music melody'],['🎧','headphones sound'],['🎮','game controller'],['🕹','joystick retro game'],['▶','play video youtube'],['🎬','cinema movie'],['📺','television tv'],
    ['💻','computer laptop technology'],['⌘','command code developer'],['⌨','keyboard typing'],['🖥','monitor pc screen'],['🔧','tools wrench'],['🛠','work tools'],['💾','disk storage save'],['📁','folder files'],
    ['📄','document file'],['✉','mail envelope email'],['📨','inbox message'],['💬','chat discussion'],['✍','write pencil'],['📝','notes memo'],['📚','books reading'],['📖','book reading'],
    ['🌿','leaf plant nature'],['🍃','green leaves'],['☕','coffee cafe'],['🍕','pizza food'],['🍜','noodles food'],['🛒','cart shopping'],['💳','card bank money'],['📈','chart finance'],
    ['📊','analytics chart data'],['🌍','earth travel globe'],['🗺','map travel'],['📍','pin location'],['🚗','car automobile'],['🚲','bicycle bike'],['✈','flight airplane'],['🚀','rocket launch'],
    ['📷','camera photos'],['🖼','gallery pictures'],['🎨','art palette paint'],['🎓','education graduation'],['🇩🇪','german germany language'],['🇯🇵','japanese japan language'],['🧠','brain ai learning'],['🤖','robot ai'],
    ['🔒','lock security'],['🔑','key password'],['🛡','shield security'],['💡','light bulb idea'],['🌈','rainbow color'],['🔴','red circle'],['🟢','green circle'],['🔵','blue circle'],
    ['⬡','hexagon geometric'],['◆','diamond geometric'],['●','circle dot'],['▦','grid apps'],['▣','square tile'],['☯','yin yang'],['∞','infinity'],['✓','check done']
  ];
  const normalizedUrl=raw=>{
    const value=String(raw||'').trim();if(!value)return null;
    try{
      const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(value)?value:'https://'+value);
      return ['https:','http:'].includes(url.protocol)?url.href:null;
    }catch{return null;}
  };
  const imageUrl=raw=>{
    try{const url=new URL(String(raw||'').trim());return url.protocol==='https:'?url.href:null;}catch{return null;}
  };
  // Older versions stored placeholder ↗ as an explicit 'symbol' icon. That
  // must not prevent these links from using their actual website icon.
  const isLegacyFavicon=item=>(!item.iconMode||item.iconMode==='symbol')&&(!item.icon||['↗','➚','➤'].includes(item.icon));
  const effectiveIconMode=item=>isLegacyFavicon(item)?'favicon':(item.iconMode||'symbol');
  const faviconSources=item=>{
    const url=normalizedUrl(item.url);if(!url)return [];
    // First keep real Firefox-cached icons. Then try *only that website's own*
    // files (no external favicon aggregation services or browsing disclosure).
    const parsed=new URL(url);
    const cached=typeof item.faviconData==='string'&&/^data:image\/(?:png|jpeg|gif|svg\+xml|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(item.faviconData)&&item.faviconData.length<150000?item.faviconData:null;
    const linked=typeof item.faviconUrl==='string'&&imageUrl(item.faviconUrl)?item.faviconUrl:null;
    const base=parsed.origin;
    return [...new Set([cached,linked,base+'/favicon.ico',base+'/favicon.svg',base+'/apple-touch-icon.png',base+'/favicon.png',base+'/assets/favicon.ico',base+'/static/favicon.ico'].filter(Boolean))];
  };
  function makeIcon(item,cls){
    const holder=document.createElement('span');holder.className=cls;
    const mode=effectiveIconMode(item);
    const sources=mode==='favicon'?faviconSources(item):
      mode==='upload'&&String(item.iconImage||'').startsWith('data:image/')?[item.iconImage]:
      mode==='imageUrl'&&imageUrl(item.iconUrl)?[imageUrl(item.iconUrl)]:[];
    const valid=normalizedUrl(item.url);
    const hostname=valid?new URL(valid).hostname.replace(/^www\./i,''):'';
    // A missing favicon should be recognizable by site, not become a generic arrow.
    const fallbackText=mode==='favicon'?(hostname.slice(0,1).toUpperCase()||'🌐'):(item.icon||hostname.slice(0,1).toUpperCase()||'↗');
    const fallback=()=>{holder.classList.remove('is-image','is-favicon');holder.replaceChildren();holder.textContent=fallbackText;};
    fallback();
    function loadFrom(index){
      if(index>=sources.length)return; // Keep the already rendered fallback.
      const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.decoding='async';
      img.addEventListener('load',()=>{
        if(!img.naturalWidth||!img.naturalHeight){loadFrom(index+1);return;}
        holder.replaceChildren(img);holder.classList.add(mode==='favicon'?'is-favicon':'is-image');
      },{once:true});
      img.addEventListener('error',()=>loadFrom(index+1),{once:true});
      img.src=sources[index];
    }
    if(sources.length)loadFrom(0);
    return holder;
  }
  function applyShortcutLayout(){
    const cols=Math.max(2,Math.min(16,Number(state.shortcutColumns)||4));
    const size=Math.max(60,Math.min(160,Number(state.shortcutSize)||100));
    const gap=Math.max(2,Math.min(32,Number(state.shortcutGap)||12));
    const round=Math.max(0,Math.min(50,Number(state.shortcutRounding)??28));
    const radius=Math.round((round/100)*size*.55);
    const view=$('shortcutsView');
    view.style.setProperty('--shortcut-columns',cols);
    view.style.setProperty('--shortcut-grid-width',Math.max(40,Math.min(100,Number(state.shortcutGridWidth)||92))+'vw');
    view.style.setProperty('--shortcut-cell-height',Math.max(72,Math.min(160,Number(state.shortcutCellHeight)||104))+'px');
    view.style.setProperty('--shortcut-columns-mobile',Math.min(6,cols));
    view.style.setProperty('--shortcut-columns-small',Math.min(4,cols));
    view.style.setProperty('--shortcut-icon-size',Math.round(55*size/100)+'px');
    view.style.setProperty('--shortcut-icon-size-mobile',Math.round(48*size/100)+'px');
    view.style.setProperty('--shortcut-icon-size-display',Math.round(82*size/100)+'px');
    view.style.setProperty('--shortcut-radius',radius+'px');
    view.style.setProperty('--shortcut-gap',gap+'px');
    view.style.setProperty('--shortcut-icon-fill',state.shortcutBgOpacity+'%');
    view.style.setProperty('--shortcut-border-fill',state.shortcutBorderOpacity+'%');
    $('shortcutBorderOpacity').value=state.shortcutBorderOpacity;
    $('shortcutBorderOpacityValue').textContent=state.shortcutBorderOpacity+'%';
    $('shortcutBgOpacity').value=state.shortcutBgOpacity;
    $('shortcutBgOpacityValue').textContent=state.shortcutBgOpacity+'%';
    $('showShortcutLabels').checked=state.showShortcutLabels!==false;
    const gridMode=state.shortcutLayout==='grid';
    $('shortcutLayoutAuto').setAttribute('aria-pressed',String(!gridMode));
    $('shortcutLayoutGrid').setAttribute('aria-pressed',String(gridMode));
    $('shortcutGridRows').hidden=!gridMode;$('shortcutRowsLabel').hidden=!gridMode;
    $('shortcutGridRows').value=state.shortcutGridRows;
    $('shortcutGridRowsValue').textContent=state.shortcutGridRows;
    $('shortcutCellHeightLabel').hidden=!gridMode;$('shortcutCellHeight').hidden=!gridMode;
    for(const key of ['shortcutColumns','shortcutGridWidth','shortcutCellHeight','shortcutSize','shortcutGap','shortcutRounding']){
      $(key).value=state[key];
      $(key+'Value').textContent=state[key]+(key==='shortcutColumns'?'':['shortcutGap','shortcutCellHeight'].includes(key)?'px':'%');
    }
  }
  $('shortcutBgOpacity').addEventListener('input',event=>set('shortcutBgOpacity',Number(event.target.value)));
  $('shortcutBorderOpacity').addEventListener('input',event=>set('shortcutBorderOpacity',Number(event.target.value)));
  $('dockBgOpacity').addEventListener('input',event=>set('dockBgOpacity',Number(event.target.value)));
  /* Shortcut entries are links or one-level folders. Links inside a folder are never duplicated on the grid. */
  const isGroup=item=>item?.type==='group'&&Array.isArray(item.items);
  const topEntry=id=>state.shortcuts.find(item=>item.id===id);
  const allLinks=items=>items.flatMap(item=>isGroup(item)?item.items:[item]).filter(item=>item&&normalizedUrl(item.url));
  const maxGridCols=()=>Math.max(2,Math.min(16,Number(state.shortcutColumns)||4));
  const maxGridRows=()=>Math.max(3,Math.min(12,Number(state.shortcutGridRows)||6));
  const maxSlots=()=>maxGridCols()*Math.max(maxGridRows(),Math.ceil((state.shortcuts.length+2)/maxGridCols()));
  let shortcutsEditMode=false,draggedShortcutId=null,movingShortcutId=null,activeGroupId=null,editingGroupId=null;
  let pendingCreationSlot=null;
  const selectedShortcutIds=new Set();
  let groupAnchor=null;
  function toggleShortcutsEdit(force){
    const active=document.activeElement;
    if(active?.matches?.('input:not([type="checkbox"]):not([type="range"]),textarea,[contenteditable="true"]'))active.blur();
    shortcutsEditMode=typeof force==='boolean'?force:!shortcutsEditMode;
    if(shortcutsEditMode)closeGroupPopover();
    else selectedShortcutIds.clear();
    movingShortcutId=null;
    $('shortcutsEditToggle').setAttribute('aria-pressed',String(shortcutsEditMode));
    $('shortcutsEditToggle').textContent=shortcutsEditMode?'✓':'⚙';
    $('shortcutsEditToggle').title=shortcutsEditMode?'Finish editing':'Edit shortcuts';
    $('shortcutsEditToggle').setAttribute('aria-label',shortcutsEditMode?'Finish editing shortcuts':'Edit shortcuts');
    renderShortcuts();
  }
  function persistShortcutOrder(){
    try{localStorage.setItem('little-pixel-clock',JSON.stringify(state));return true;}
    catch{return false;}
  }
  function reorderShortcuts(source,target){
    const from=state.shortcuts.findIndex(x=>x.id===source),to=state.shortcuts.findIndex(x=>x.id===target);
    if(from<0||to<0||from===to)return;
    const before=[...state.shortcuts];const [item]=state.shortcuts.splice(from,1);state.shortcuts.splice(to,0,item);
    if(!persistShortcutOrder())state.shortcuts=before;
    renderShortcuts();
  }
  function moveShortcut(id,offset){
    const index=state.shortcuts.findIndex(x=>x.id===id);
    const target=state.shortcuts[index+offset];if(target)reorderShortcuts(id,target.id);
  }
  function gridPositions(){
    const max=maxSlots(),positions=state.shortcutPositions,used=new Set(),mapped=new Map();
    // Existing saved locations have priority, but invalid or duplicate positions are repaired.
    for(const item of state.shortcuts){
      const spot=positions[item.id];
      if(Number.isInteger(spot)&&spot>=0&&spot<max&&!used.has(spot)){
        mapped.set(item.id,spot);used.add(spot);
      }
    }
    for(const item of state.shortcuts){
      if(mapped.has(item.id))continue;
      const first=Array.from({length:max},(_,i)=>i).find(i=>!used.has(i));
      if(first===undefined)break;
      mapped.set(item.id,first);used.add(first);
    }
    state.shortcutPositions=Object.fromEntries(mapped);
    return mapped;
  }
  function putInSlot(id,targetSlot){
    const max=maxSlots();if(!Number.isInteger(targetSlot)||targetSlot<0||targetSlot>=max)return;
    const positions=gridPositions(),current=positions.get(id);if(current===undefined||current===targetSlot)return;
    const other=[...positions.entries()].find(([,slot])=>slot===targetSlot)?.[0];
    positions.set(id,targetSlot);if(other)positions.set(other,current);
    state.shortcutPositions=Object.fromEntries(positions);
    save();movingShortcutId=null;renderShortcuts();
  }
  function folderIcon(group){
    const holder=document.createElement('span');holder.className='shortcut-icon';
    const face=document.createElement('span');face.className='folder-icon';
    for(let i=0;i<4;i++){
      const mini=document.createElement('span');mini.className='folder-mini'+(group.items[i]?'':' empty');
      if(group.items[i])mini.appendChild(makeIcon(group.items[i],'mini-icon-content'));
      face.appendChild(mini);
    }
    holder.appendChild(face);return holder;
  }
  function closeGroupPopover({restoreFocus=false}={}){
    const anchor=groupAnchor;
    activeGroupId=null;groupAnchor=null;
    $('groupPopover').hidden=true;
    if(restoreFocus&&anchor?.isConnected)anchor.focus({preventScroll:true});
  }
  function positionGroupPopover(){
    const pop=$('groupPopover');
    if(pop.hidden||!groupAnchor?.isConnected)return;
    const anchorBox=groupAnchor.querySelector('.shortcut-icon')?.getBoundingClientRect()||groupAnchor.getBoundingClientRect();
    const width=pop.offsetWidth,height=pop.offsetHeight,edge=10;
    // Open over the actual folder icon, expanding from the icon's top-left corner.
    // Near screen edges, slide the popup inside the viewport instead.
    const idealX=anchorBox.left-9,idealY=anchorBox.top-9;
    const x=Math.max(edge,Math.min(innerWidth-width-edge,idealX));
    const y=Math.max(edge,Math.min(innerHeight-height-edge,idealY));
    pop.style.left=Math.round(x)+'px';pop.style.top=Math.round(y)+'px';
    pop.style.setProperty('--group-origin-x',Math.round(Math.max(10,Math.min(width-10,anchorBox.left+anchorBox.width/2-x)))+'px');
    pop.style.setProperty('--group-origin-y',Math.round(Math.max(10,Math.min(height-10,anchorBox.top+anchorBox.height/2-y)))+'px');
  }
  function openGroupPopover(group,anchor){
    activeGroupId=group.id;groupAnchor=anchor;
    const pop=$('groupPopover'),grid=$('groupMiniGrid');grid.replaceChildren();
    pop.style.setProperty('--clock',currentColor());pop.style.setProperty('--screen',currentBackground());
    pop.style.setProperty('--date-font',fontFamilies[state.dateFont]||fontFamilies.system);
    pop.setAttribute('aria-label',group.label||'Shortcut group');
    const links=group.items.filter(link=>normalizedUrl(link.url));
    const preferred=Number(group.columns)||0;
    const cols=Math.max(2,Math.min(6,preferred||Math.ceil(Math.sqrt(Math.max(1,links.length)))));
    const available=innerWidth-20;
    const targetWidth=cols*76+20;
    const width=Math.min(targetWidth,available);
    const actualCols=Math.max(1,Math.min(cols,Math.floor((width-20)/55)));
    pop.style.setProperty('--group-cols',String(actualCols));
    pop.style.setProperty('--group-width',Math.round(width)+'px');
    for(const link of links){
      const a=document.createElement('a');a.href=normalizedUrl(link.url);a.target='_blank';a.rel='noopener noreferrer';a.title=link.label;
      a.appendChild(makeIcon(link,'shortcut-icon'));
      const label=document.createElement('span');label.className='shortcut-caption';label.textContent=link.label;a.appendChild(label);grid.appendChild(a);
    }
    if(!links.length){const p=document.createElement('p');p.className='group-empty-note';p.textContent='Empty group';grid.appendChild(p);}
    pop.hidden=false;
    positionGroupPopover();
    const first=grid.querySelector('a');if(first)first.focus({preventScroll:true});
  }
  document.addEventListener('pointerdown',e=>{
    if(!$('groupPopover').hidden&&!e.target.closest('#groupPopover')&&!e.target.closest('.shortcut-entry.is-group'))closeGroupPopover();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('groupPopover').hidden){e.stopPropagation();closeGroupPopover({restoreFocus:true});}});
  window.addEventListener('resize',positionGroupPopover);
  window.addEventListener('scroll',positionGroupPopover,{passive:true,capture:true});
  function openGroupTabs(group){
    // Must be synchronous inside the user's middle-click. Browsers may limit multiple popups.
    for(const link of group.items){const url=normalizedUrl(link.url);if(url)window.open(url,'_blank','noopener,noreferrer');}
  }
  /* Pointer-based touch dragging works in Android Chrome/Firefox, unlike HTML5 native drag/drop. */
  function bindHoldToMove(handle,options){
    let gesture=null,blockClicksUntil=0;
    handle.addEventListener('click',event=>{
      if(Date.now()<blockClicksUntil){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    function clearGesture(){
      if(!gesture)return;
      clearTimeout(gesture.timer);
      gesture.ghost?.remove();gesture.source?.classList.remove('is-touch-grabbed');
      gesture.hover?.classList.remove('touch-drop-hover');
      gesture=null;
    }
    const locate=(x,y)=>document.elementFromPoint(x,y)?.closest(options.targetSelector)||null;
    const moveGhost=(g,x,y)=>{
      if(!g.ghost)return;
      g.ghost.style.left=x+'px';g.ghost.style.top=y+'px';
      const hit=locate(x,y);
      if(hit!==g.hover){g.hover?.classList.remove('touch-drop-hover');g.hover=hit;hit?.classList.add('touch-drop-hover');}
    };
    handle.addEventListener('pointerdown',event=>{
      if(!options.enabled()||event.pointerType==='mouse'||event.button!==0||gesture||event.target.closest(options.exclude||'__never__'))return;
      const g={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,
        active:false,source:options.source(),hover:null,ghost:null,timer:null};
      gesture=g;
      try{handle.setPointerCapture(event.pointerId);}catch{}
      g.timer=setTimeout(()=>{
        if(gesture!==g||!options.enabled())return;
        g.active=true;
        g.source?.classList.add('is-touch-grabbed');
        g.ghost=(options.preview()||handle).cloneNode(true);
        g.ghost.classList.add('touch-drag-ghost');
        g.ghost.style.width=Math.min(110,Math.max(54,handle.getBoundingClientRect().width))+'px';
        document.body.appendChild(g.ghost);
        moveGhost(g,g.x,g.y);
        try{navigator.vibrate?.(15);}catch{}
      },480);
    });
    handle.addEventListener('pointermove',event=>{
      const g=gesture;if(!g||event.pointerId!==g.pointerId)return;
      g.x=event.clientX;g.y=event.clientY;
      if(!g.active){if(Math.hypot(g.x-g.startX,g.y-g.startY)>13)clearGesture();return;}
      event.preventDefault();moveGhost(g,g.x,g.y);
    });
    handle.addEventListener('pointerup',event=>{
      const g=gesture;if(!g||event.pointerId!==g.pointerId)return;
      const wasActive=g.active,target=wasActive?locate(event.clientX,event.clientY):null;
      if(wasActive){event.preventDefault();blockClicksUntil=Date.now()+650;}
      clearGesture();
      // Run after the browser's synthetic click, which the capture handler suppresses.
      if(wasActive)setTimeout(()=>{if(options.enabled())options.drop(target);},0);
    });
    handle.addEventListener('pointercancel',clearGesture);
    handle.addEventListener('lostpointercapture',()=>{if(gesture&&!gesture.active)clearGesture();});
  }
  function addToGroup(linkId,groupId){
    const link=topEntry(linkId),group=topEntry(groupId);
    if(!link||isGroup(link)||!isGroup(group)||link.id===group.id)return false;
    if(group.items.some(x=>normalizedUrl(x.url)===normalizedUrl(link.url)))return false;
    const before=state.shortcuts,positions={...state.shortcutPositions};
    state.shortcuts=before.filter(x=>x.id!==linkId).map(x=>x.id===groupId?{...x,items:[...x.items,link]}:x);
    delete state.shortcutPositions[linkId];
    if(!persistShortcutOrder()){state.shortcuts=before;state.shortcutPositions=positions;return false;}
    movingShortcutId=null;renderShortcuts();return true;
  }
  async function deleteGroupWithOptions(group){
    const decision=await lpDialogs.confirmGroupRemoval(group.label||'Group',(group.items||[]).length);
    if(!decision.confirmed)return false;
    const before=state.shortcuts,positions={...state.shortcutPositions},dismissed=[...state.firefoxDismissedUrls];
    const idx=before.findIndex(x=>x.id===group.id);if(idx<0)return false;
    state.shortcuts=[...before.slice(0,idx),...(decision.removeLinks?[]:group.items),...before.slice(idx+1)];
    delete state.shortcutPositions[group.id];
    if(decision.removeLinks){
      const removed=group.items.filter(x=>x.firefoxFollowed&&x.url).map(x=>x.url);
      state.firefoxDismissedUrls=[...new Set([...dismissed,...removed])].slice(-250);
    }
    if(!persistShortcutOrder()){
      state.shortcuts=before;state.shortcutPositions=positions;state.firefoxDismissedUrls=dismissed;
      await lpDialogs.notice('Could not save shortcut changes.');return false;
    }
    closeGroupEditor();movingShortcutId=null;renderShortcuts();return true;
  }
  async function quickDeleteGridItem(item){
    if(isGroup(item)){await deleteGroupWithOptions(item);return;}
    if(!await lpDialogs.confirm('Delete shortcut "'+(item.label||'Shortcut')+'"?'))return;
    const before=state.shortcuts,positions={...state.shortcutPositions},dismissed=[...state.firefoxDismissedUrls];
    state.shortcuts=before.filter(entry=>entry.id!==item.id);
    if(item.firefoxFollowed && item.url)state.firefoxDismissedUrls=[...new Set([...state.firefoxDismissedUrls,item.url])].slice(-250);
    delete state.shortcutPositions[item.id];selectedShortcutIds.delete(item.id);
    if(!persistShortcutOrder()){state.shortcuts=before;state.shortcutPositions=positions;state.firefoxDismissedUrls=dismissed;lpDialogs.notice('Could not save shortcut changes.');return;}
    movingShortcutId=null;renderShortcuts();
  }
  function refreshShortcutBulkBar(){
    for(const id of [...selectedShortcutIds])if(!state.shortcuts.some(x=>!isGroup(x)&&x.id===id))selectedShortcutIds.delete(id);
    const count=selectedShortcutIds.size;
    $('shortcutBulkBar').hidden=!shortcutsEditMode;
    $('shortcutBulkCount').textContent=count+' selected';
    $('shortcutBulkDelete').disabled=!count;
    $('shortcutBulkGroup').disabled=!count;
    $('shortcutBulkAll').disabled=!state.shortcuts.some(x=>!isGroup(x));
    $('shortcutBulkClear').disabled=!count;
  }
  $('shortcutBulkAll').addEventListener('click',()=>{
    state.shortcuts.filter(x=>!isGroup(x)).forEach(x=>selectedShortcutIds.add(x.id));renderShortcuts();
  });
  $('shortcutBulkClear').addEventListener('click',()=>{selectedShortcutIds.clear();renderShortcuts();});
  $('shortcutBulkGroup').addEventListener('click',()=>{if(selectedShortcutIds.size)openGroupEditor(null,{preselectedIds:[...selectedShortcutIds]});});
  $('shortcutBulkDelete').addEventListener('click',async()=>{
    const ids=new Set(selectedShortcutIds);
    if(!ids.size)return;
    if(!await lpDialogs.confirm('Permanently delete '+ids.size+' selected shortcut'+(ids.size===1?'':'s')+'? Groups and their links will not be changed.'))return;
    const before=state.shortcuts,positions={...state.shortcutPositions},dismissed=[...state.firefoxDismissedUrls];
    const removed=before.filter(x=>!isGroup(x)&&ids.has(x.id));
    state.shortcuts=before.filter(x=>isGroup(x)||!ids.has(x.id));
    for(const link of removed)delete state.shortcutPositions[link.id];
    state.firefoxDismissedUrls=[...new Set([...dismissed,...removed.filter(x=>x.firefoxFollowed&&x.url).map(x=>x.url)])].slice(-250);
    if(!persistShortcutOrder()){
      state.shortcuts=before;state.shortcutPositions=positions;state.firefoxDismissedUrls=dismissed;
      await lpDialogs.notice('Could not save shortcut changes.');return;
    }
    selectedShortcutIds.clear();movingShortcutId=null;renderShortcuts();
  });
  function makeEntry(item,index,total){
    const entry=document.createElement('div');entry.className='shortcut-entry'+(isGroup(item)?' is-group':'');entry.dataset.id=item.id;
    const tile=document.createElement(shortcutsEditMode?'button':isGroup(item)?'button':'a');tile.className='shortcut-tile';
    tile.title=shortcutsEditMode?'Edit '+(item.label||'shortcut'):(item.label||item.url||'Group');
    if(shortcutsEditMode){tile.type='button';tile.addEventListener('click',()=>{
      if(movingShortcutId){if(movingShortcutId!==item.id){if(state.shortcutLayout==='grid')putInSlot(movingShortcutId,state.shortcutPositions[item.id]);else{const from=movingShortcutId;movingShortcutId=null;reorderShortcuts(from,item.id);}}else{movingShortcutId=null;renderShortcuts();}return;}
      isGroup(item)?openGroupEditor(item):openShortcutEditor(item);
    });}
    else if(isGroup(item)){
      tile.type='button';tile.setAttribute('aria-haspopup','dialog');tile.setAttribute('aria-label','Open '+item.label+' folder');
      tile.addEventListener('click',()=>{if(activeGroupId===item.id)closeGroupPopover();else openGroupPopover(item,tile);});
      tile.addEventListener('auxclick',event=>{if(event.button===1){event.preventDefault();openGroupTabs(item);}});
      tile.addEventListener('mousedown',event=>{if(event.button===1)event.preventDefault();});
    }else{tile.href=normalizedUrl(item.url);tile.target='_blank';tile.rel='noopener noreferrer';}
    const icon=isGroup(item)?folderIcon(item):makeIcon(item,'shortcut-icon');
    const label=document.createElement('span');label.className='shortcut-caption';label.textContent=item.label||'Shortcut';label.hidden=state.showShortcutLabels===false;
    tile.append(icon,label);entry.appendChild(tile);
    if(shortcutsEditMode){
      if(!isGroup(item)){
        const selected=document.createElement('input');selected.type='checkbox';selected.className='shortcut-select';
        selected.checked=selectedShortcutIds.has(item.id);selected.setAttribute('aria-label','Select '+(item.label||'shortcut')+' for bulk deletion');
        selected.draggable=false;
        selected.addEventListener('pointerdown',event=>event.stopPropagation());
        selected.addEventListener('click',event=>event.stopPropagation());
        selected.addEventListener('change',()=>{
          if(selected.checked)selectedShortcutIds.add(item.id);else selectedShortcutIds.delete(item.id);
          entry.classList.toggle('is-bulk-selected',selected.checked);refreshShortcutBulkBar();
        });
        entry.classList.toggle('is-bulk-selected',selected.checked);
        entry.appendChild(selected);
      }
      const remove=document.createElement('button');remove.type='button';remove.className='shortcut-quick-delete';remove.textContent='×';
      remove.title=isGroup(item)?'Delete group (choose whether to keep its shortcuts)':'Delete shortcut';
      remove.setAttribute('aria-label',(isGroup(item)?'Delete group ':'Delete shortcut ')+(item.label||''));
      remove.addEventListener('pointerdown',event=>event.stopPropagation());
      remove.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();quickDeleteGridItem(item);});
      entry.appendChild(remove);
    }
    {
      entry.draggable=true;
      tile.draggable=true;
      entry.title=isGroup(item)?'Drag to move the group or drop a shortcut onto it':'Drag to reorder, swap cells, or move into a group (hold on touchscreens)';
      bindHoldToMove(tile,{
        enabled:()=>true,
        source:()=>entry,preview:()=>tile,
        targetSelector:state.shortcutLayout==='grid'?'.shortcut-slot':'.shortcut-entry[data-id]',
        drop:target=>{
          const targetGroup=target?.querySelector?.('.shortcut-entry.is-group')||target?.closest?.('.shortcut-entry.is-group');
          if(targetGroup&&!isGroup(item)&&addToGroup(item.id,targetGroup.dataset.id))return;
          if(state.shortcutLayout==='grid'){
            const dest=target?Number(target.dataset.slot):NaN;
            if(Number.isInteger(dest)&&dest!==state.shortcutPositions[item.id])putInSlot(item.id,dest);
            else{movingShortcutId=item.id;renderShortcuts();}
          }else{
            const dest=target?.dataset.id;
            if(dest&&dest!==item.id){movingShortcutId=null;reorderShortcuts(item.id,dest);}
            else{movingShortcutId=item.id;renderShortcuts();}
          }
        }
      });
      entry.classList.toggle('is-moving',movingShortcutId===item.id);entry.classList.toggle('is-selected-for-move',movingShortcutId===item.id);
      entry.addEventListener('dragstart',event=>{
        if(event.target.closest('.shortcut-move-actions')){event.preventDefault();return;}
        draggedShortcutId=item.id;entry.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',item.id);
      });
      entry.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='move';entry.classList.add('drop-target');});
      entry.addEventListener('dragleave',()=>entry.classList.remove('drop-target'));
      entry.addEventListener('drop',event=>{
        entry.classList.remove('drop-target');if(!draggedShortcutId)return;event.preventDefault();event.stopPropagation();
        const from=draggedShortcutId;
        if(from){
          if(isGroup(item)&&from!==item.id&&addToGroup(from,item.id)){draggedShortcutId=null;return;}
          if(state.shortcutLayout==='grid')putInSlot(from,state.shortcutPositions[item.id]);else reorderShortcuts(from,item.id);
        }        draggedShortcutId=null;
      });
      entry.addEventListener('dragend',()=>{draggedShortcutId=null;document.querySelectorAll('.shortcut-entry').forEach(n=>n.classList.remove('dragging','drop-target'));});
      // The icon itself is the drag handle; no separate Move buttons under tiles.

    }
    return entry;
  }
  function addTile(action,kind,label){
    const entry=document.createElement('div');entry.className='shortcut-entry is-add'+(kind==='group'?' group-add':'');
    const btn=document.createElement('button');btn.type='button';btn.className='shortcut-tile shortcut-add'+(kind==='group'?' group-add':'');
    btn.setAttribute('aria-label',label);
    const plus=document.createElement('span');plus.className='shortcut-icon';plus.textContent=kind==='group'?'⊞':'+';
    const title=document.createElement('span');title.className='shortcut-caption';title.textContent=label;
    btn.append(plus,title);btn.addEventListener('click',action);entry.appendChild(btn);return entry;
  }
  function renderShortcuts(){
    closeGroupPopover();const grid=$('shortcutGrid');grid.replaceChildren();$('shortcutsView').querySelector('.shortcut-grid-add-actions')?.remove();grid.classList.toggle('is-editing',shortcutsEditMode);
    const free=state.shortcutLayout==='grid';grid.classList.toggle('free-grid',free);
    const data=state.shortcuts.filter(item=>item&&(isGroup(item)||normalizedUrl(item.url)));
    $('shortcutEmpty').hidden=data.length>0||shortcutsEditMode;
    refreshShortcutBulkBar();
    if(!free){
      data.forEach((item,index)=>grid.appendChild(makeEntry(item,index,data.length)));
      if(shortcutsEditMode){grid.append(addTile(()=>openShortcutEditor(),'link','+ Shortcut'),addTile(()=>openGroupEditor(),'group','+ Group'));}
    }else{
      const positions=gridPositions();const count=maxSlots();
      for(let slot=0;slot<count;slot++){
        const wrapper=document.createElement('div');wrapper.className='shortcut-slot';wrapper.dataset.slot=String(slot);
        const match=data.find(item=>positions.get(item.id)===slot);
        if(match){wrapper.appendChild(makeEntry(match,data.indexOf(match),data.length));}
        else{
          wrapper.classList.add('is-empty');
          if(shortcutsEditMode){
            const btn=document.createElement('button');btn.className='shortcut-place';btn.type='button';btn.textContent='＋';
            btn.setAttribute('aria-label',(movingShortcutId?'Move selected shortcut to':'Create a shortcut or group in')+' cell '+(slot+1));
            btn.title=movingShortcutId?'Move selected shortcut here':'Create shortcut or group here';
            btn.addEventListener('click',async()=>{
              if(movingShortcutId){putInSlot(movingShortcutId,slot);return;}
              const choice=await lpDialogs.chooseCellAction(slot+1);
              if(!shortcutsEditMode||state.shortcutLayout!=='grid')return;
              if(choice==='shortcut')openShortcutEditor(null,slot);
              else if(choice==='group')openGroupEditor(null,{slot});
            });wrapper.appendChild(btn);
          }
        }
        {
          wrapper.addEventListener('dragover',event=>{event.preventDefault();wrapper.classList.add('is-drop-target');});
          wrapper.addEventListener('dragleave',()=>wrapper.classList.remove('is-drop-target'));
          wrapper.addEventListener('drop',event=>{wrapper.classList.remove('is-drop-target');if(!draggedShortcutId)return;event.preventDefault();event.stopPropagation();const from=draggedShortcutId;if(from)putInSlot(from,slot);draggedShortcutId=null;});
          if(shortcutsEditMode&&match&&movingShortcutId&&movingShortcutId!==match.id){
            wrapper.addEventListener('click',event=>{if(event.target.closest('.shortcut-tile,.shortcut-move-actions'))return;putInSlot(movingShortcutId,slot);});
          }
        }
        grid.appendChild(wrapper);
      }
      // Free grid has direct + controls in each empty cell, so no redundant
      // overlay buttons that might collide with the bulk-selection toolbar.
    }
  }
  /* Bookmark toolbar/sidebar drag-in. URLs need no permissions; folder contents
     are read through Firefox's optional bookmarks permission, requested on drop. */
  const dropStatus=$('shortcutDropStatus');
  function reportDrop(message,error=false){
    dropStatus.hidden=false;dropStatus.textContent=message;dropStatus.style.color=error?'#ff9eab':'';
    clearTimeout(reportDrop.timer);reportDrop.timer=setTimeout(()=>dropStatus.hidden=true,6500);
  }
  const createLink=(url,label)=>({id:'dropped-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),label:(label||new URL(url).hostname).slice(0,45),url,icon:'↗',iconMode:'favicon'});
  function extractDragBookmark(transfer){
    const raw=transfer.getData('text/x-moz-place');
    if(raw){
      try{
        const value=JSON.parse(raw),nodes=Array.isArray(value)?value:[value];
        const node=nodes.find(x=>x&&typeof x==='object');
        if(node){
          const folder=String(node.type||'').includes('container')||(!node.uri&&!node.url&&!!node.itemGuid);
          if(folder)return {kind:'folder',id:String(node.itemGuid||node.guid||node.id||''),title:node.title||'Bookmarks'};
          const url=normalizedUrl(node.uri||node.url);
          if(url)return {kind:'url',url,title:node.title||''};
        }
      }catch{}
    }
    const moz=transfer.getData('text/x-moz-url');
    if(moz){const [url,title]=moz.split(/\r?\n/);const valid=normalizedUrl(url);if(valid)return {kind:'url',url:valid,title:title||''};}
    const uri=transfer.getData('text/uri-list').split(/\r?\n/).find(s=>s&&!s.startsWith('#'));
    const url=normalizedUrl(uri||transfer.getData('text/plain'));
    return url?{kind:'url',url,title:''}:null;
  }
  function addDroppedLink(url,title,targetGroup=null){
    const canonical=normalizedUrl(url);if(!canonical)return 0;
    const matching=allLinks(state.shortcuts).some(x=>normalizedUrl(x.url)===canonical);
    if(matching){reportDrop('That link is already in Little Pixel.');return 0;}
    const link=createLink(canonical,title),before=state.shortcuts;
    if(targetGroup){
      state.shortcuts=before.map(x=>x.id===targetGroup.id?{...x,items:[...x.items,link]}:x);
    }else state.shortcuts=[...before,link];
    if(!persistShortcutOrder()){state.shortcuts=before;reportDrop('Could not save the shortcut.',true);return 0;}
    renderShortcuts();return 1;
  }
  function bookmarkLinks(node,list=[]){
    if(node?.url){const url=normalizedUrl(node.url);if(url)list.push({url,label:node.title||new URL(url).hostname});}
    for(const child of node?.children||[])if(list.length<200)bookmarkLinks(child,list);
    return list;
  }
  async function addDroppedFolder(id,title,targetGroup){
    if(!id||typeof browser==='undefined'||!browser.bookmarks){reportDrop('Firefox bookmark access is unavailable. Reinstall the updated extension.',true);return;}
    try{
      // bookmarks permission is installed with the extension (no async prompt during drop).
      const tree=await browser.bookmarks.getSubTree(id),links=bookmarkLinks(tree?.[0]);
      if(!links?.length){reportDrop('That folder has no supported website bookmarks.');return;}
      const existing=new Set(allLinks(state.shortcuts).map(x=>normalizedUrl(x.url)));
      const unique=[];
      for(const item of links){if(!existing.has(item.url)){unique.push(createLink(item.url,item.label));existing.add(item.url);}}
      if(!unique.length){reportDrop('All links in that folder are already on the grid.');return;}
      const previous=state.shortcuts;
      if(targetGroup)state.shortcuts=previous.map(x=>x.id===targetGroup.id?{...x,items:[...x.items,...unique]}:x);
      else state.shortcuts=[...previous,{id:'bookmark-group-'+Date.now(),type:'group',label:String(title||tree[0]?.title||'Bookmarks').slice(0,40),columns:'auto',items:unique}];
      if(!persistShortcutOrder()){state.shortcuts=previous;reportDrop('Not enough storage to import this bookmark folder.',true);return;}
      renderShortcuts();reportDrop('Imported '+unique.length+' bookmark'+(unique.length===1?'':'s')+'.');
    }catch(e){reportDrop('Could not read bookmark folder: '+e.message+' Try Create Group → Firefox bookmark folder instead.',true);}
  }
  function bookmarkFolderCount(node){
    if(node?.url)return normalizedUrl(node.url)?1:0;
    return (node?.children||[]).reduce((sum,child)=>sum+bookmarkFolderCount(child),0);
  }
  async function openBookmarkPicker(targetGroupId=null){
    const dialog=$('bookmarkPickerDialog'),list=$('bookmarkFolderList'),select=$('bookmarkTargetGroup');
    select.replaceChildren(new Option('Create a new group',''));
    for(const group of state.shortcuts.filter(isGroup))select.add(new Option('Add to '+group.label,group.id));
    if(targetGroupId && state.shortcuts.some(g=>g.id===targetGroupId&&isGroup(g)))select.value=targetGroupId;
    $('bookmarkFolderSearch').value='';$('bookmarkFolderError').hidden=true;list.replaceChildren();
    const wait=document.createElement('p');wait.className='inline-help';wait.textContent='Reading Firefox bookmark folders…';list.append(wait);
    dialog.showModal();
    try{
      if(!browser?.bookmarks)throw Error('Bookmarks permission missing. Reload the updated Firefox extension.');
      const roots=await browser.bookmarks.getTree();list.replaceChildren();let total=0;
      function traverse(node,parents=[]){
        if(node?.url)return;
        const path=[...parents,node.title||'Bookmarks'];
        if(node.id&&parents.length){
          total++;
          const button=document.createElement('button');button.type='button';button.className='bookmark-folder-row';button.dataset.search=path.join(' ').toLowerCase();
          const icon=document.createElement('span');icon.textContent='📁';
          const title=document.createElement('span');title.className='bookmark-path';title.textContent=path.join(' / ');
          const count=document.createElement('span');count.className='bookmark-count';count.textContent=bookmarkFolderCount(node)+' links';
          button.append(icon,title,count);
          button.addEventListener('click',async()=>{
            const target=topEntry(select.value);button.disabled=true;
            await addDroppedFolder(node.id,node.title,isGroup(target)?target:null);
            button.disabled=false;dialog.close();
          });list.append(button);
        }
        for(const child of node.children||[])traverse(child,path);
      }
      for(const root of roots)traverse(root);
      if(!total){const empty=document.createElement('p');empty.className='inline-help';empty.textContent='Firefox has no bookmark folders to import.';list.append(empty);}
    }catch(e){list.replaceChildren();$('bookmarkFolderError').hidden=false;$('bookmarkFolderError').textContent='Could not load folders: '+e.message;}
  }
  $('importBookmarkFolder').addEventListener('click',()=>{
    const target=editingGroupId;
    // Only one modal dialog may be visible at once. The picker is the group
    // creation alternative, not a separate always-visible toolbar action.
    if($('groupDialog').open)$('groupDialog').close();
    openBookmarkPicker(target);
  });
  $('closeBookmarkPicker').addEventListener('click',()=>$('bookmarkPickerDialog').close());
  $('bookmarkFolderSearch').addEventListener('input',event=>{
    const query=event.target.value.trim().toLowerCase();
    for(const button of $('bookmarkFolderList').querySelectorAll('.bookmark-folder-row'))button.hidden=!!query&&!button.dataset.search.includes(query);
  });
  $('bookmarkPickerDialog').addEventListener('click',e=>{if(e.target===$('bookmarkPickerDialog'))$('bookmarkPickerDialog').close();});
  // Recognize Firefox's native bookmark flavor as well as standard link drops.
  // Drop is accepted in view mode; the grid never changes Firefox's original bookmarks.
  $('shortcutsView').addEventListener('dragover',event=>{
    if(draggedShortcutId)return;
    const kinds=Array.from(event.dataTransfer?.types||[]);
    if(!kinds.some(k=>['text/x-moz-place','text/x-moz-url','text/uri-list','text/plain'].includes(k)))return;
    event.preventDefault();event.dataTransfer.dropEffect='copy';$('shortcutsView').classList.add('is-external-drag');
  });
  $('shortcutsView').addEventListener('dragleave',event=>{
    if(!event.currentTarget.contains(event.relatedTarget))$('shortcutsView').classList.remove('is-external-drag');
  });
  $('shortcutsView').addEventListener('drop',event=>{
    $('shortcutsView').classList.remove('is-external-drag');
    if(draggedShortcutId)return;
    const incoming=extractDragBookmark(event.dataTransfer);if(!incoming)return;
    event.preventDefault();event.stopPropagation();
    const entry=event.target.closest('.shortcut-entry.is-group');
    const targetGroup=entry?topEntry(entry.dataset.id):null;
    if(incoming.kind==='url'){
      const count=addDroppedLink(incoming.url,incoming.title,targetGroup);
      if(count)reportDrop('Added '+(incoming.title||new URL(incoming.url).hostname)+' to '+(targetGroup?.label||'Shortcuts')+'.');
    }else addDroppedFolder(incoming.id,incoming.title,targetGroup);
  });
  // In free-grid edit mode empty slots are also drop targets. Let external drags
  // bubble to shortcutsView instead of treating their URL as an internal tile id.
  $('shortcutsEditToggle').addEventListener('click',()=>toggleShortcutsEdit());
  $('editShortcutsFromSettings').addEventListener('click',()=>{showView('shortcuts');toggleShortcutsEdit(true);$('shortcutsEditToggle').focus();});
  $('shortcutLayoutAuto').addEventListener('click',()=>set('shortcutLayout','auto'));
  $('shortcutLayoutGrid').addEventListener('click',()=>set('shortcutLayout','grid'));
  $('shortcutGridRows').addEventListener('input',e=>set('shortcutGridRows',Number(e.target.value)));
  let editingShortcutId=null, pendingShortcutImage='',pendingFavicon=null,pendingFaviconUrl='';
  let faviconLookupGeneration=0;
  function currentFormItem(){return {icon:$('shortcutIcon').value.trim().slice(0,8)||'↗',iconMode:$('shortcutIconMode').value,
    iconImage:pendingShortcutImage,iconUrl:$('shortcutImageUrl').value.trim(),url:$('shortcutUrl').value,
    ...(pendingFavicon?.faviconData?{faviconData:pendingFavicon.faviconData}:{}),
    ...(pendingFavicon?.faviconUrl?{faviconUrl:pendingFavicon.faviconUrl}:{} )};}
  function updateIconPreview(){ $('shortcutIconPreview').replaceChildren(makeIcon(currentFormItem(),'icon-live-preview-content')); }
  function showIconControls(){
    const mode=$('shortcutIconMode').value;
    for(const [name,id] of Object.entries({symbol:'shortcutSymbolControls',favicon:'shortcutFaviconControls',upload:'shortcutUploadControls',imageUrl:'shortcutImageUrlControls'}))$(id).hidden=name!==mode;
    updateIconPreview();
  }
  // Discover a favicon only when the user saves a shortcut or clicks Refresh.
  // No tab listeners, background icon-repair loop or dashboard reloads.
  function iconStatus(text){$('shortcutFaviconStatus').textContent=text;}
  function usableIcon(value){
    return typeof value==='string'&&(
      (/^data:image\/(?:png|jpeg|gif|svg\+xml|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(value)&&value.length<150000)||
      !!imageUrl(value));
  }
  function probeIcon(url,timeout=1400){
    return new Promise(resolve=>{
      const img=new Image();let done=false;
      const finish=good=>{if(done)return;done=true;clearTimeout(timer);img.onload=img.onerror=null;resolve(good);};
      const timer=setTimeout(()=>finish(false),timeout);
      img.onload=()=>finish(img.naturalWidth>0&&img.naturalHeight>0);
      img.onerror=()=>finish(false);
      img.referrerPolicy='no-referrer';img.src=url;
    });
  }
  // Firefox Tabs metadata access is granted at installation for one-time
  // shortcut import and explicit favicon Save/Refresh. No icon monitoring.
  function requestFaviconTabPermission(){
    if(typeof browser==='undefined'||!browser.permissions?.contains)return Promise.resolve(false);
    return browser.permissions.contains({permissions:['tabs']}).catch(()=>false);
  }
  async function findFavicon(rawUrl,{refresh=false,allowTabLoad=false}={}){
    const url=normalizedUrl(rawUrl);if(!url)return null;
    const current=editingShortcutId?state.shortcuts.find(item=>item.id===editingShortcutId):null;
    // A working saved icon should be kept when editing labels. Explicit Refresh
    // is allowed to replace it, but a failed lookup will never erase it.
    if(!refresh && current && normalizedUrl(current.url)===url){
      if(usableIcon(current.faviconData))return {faviconData:current.faviconData};
      if(usableIcon(current.faviconUrl))return {faviconUrl:current.faviconUrl};
    }
    if(!refresh && pendingFaviconUrl===url && pendingFavicon)return pendingFavicon;
    let fromFirefox='';
    if(typeof browser!=='undefined' && browser.runtime?.sendMessage){
      try{
        const answer=await Promise.race([
          browser.runtime.sendMessage({type:'lookupShortcutFavicon',url,openTemporaryTab:allowTabLoad}),
          new Promise(resolve=>setTimeout(()=>resolve(null),17000))
        ]);
        if(answer?.ok&&usableIcon(answer.icon))fromFirefox=answer.icon;
      }catch{}
    }
    if(fromFirefox){
      if(fromFirefox.startsWith('data:'))return {faviconData:fromFirefox};
      return {faviconUrl:fromFirefox}; // Firefox has already verified this tab icon.
    }
    // Use the site's OWN icons. No third-party lookups and no permission prompts.
    const root=new URL(url).origin;
    const candidates=[root+'/favicon.ico',root+'/favicon.svg',root+'/apple-touch-icon.png',root+'/favicon.png',root+'/assets/favicon.ico',root+'/static/favicon.ico'];
    // Try common icon paths in parallel; failures do not block saving for long.
    const good=await Promise.all(candidates.map(candidate=>probeIcon(candidate,1800)));
    const first=good.findIndex(Boolean);
    return first<0?null:{faviconUrl:candidates[first]};
  }
  async function lookupEditorFavicon({refresh=false,tabPermission=null}={}){
    const url=normalizedUrl($('shortcutUrl').value);
    if(!url){iconStatus('Enter a website URL first.');return null;}
    const token=++faviconLookupGeneration;
    $('shortcutRefreshFavicon').disabled=true;
    iconStatus(refresh?'Refreshing website icon…':'Finding website icon using Firefox…');
    try{
      // Tab permission is requested at the very beginning of the explicit
      // Save/Refresh click. Never try to open temporary tabs without it.
      const allowTabLoad=tabPermission===null?false:!!(await tabPermission);
      const found=await findFavicon(url,{refresh,allowTabLoad});
      if(token!==faviconLookupGeneration||normalizedUrl($('shortcutUrl').value)!==url)return null;
      if(found){pendingFavicon=found;pendingFaviconUrl=url;iconStatus('Website icon found.');updateIconPreview();}
      else iconStatus('Firefox could not find an icon for this site. Its initial will be shown. You can retry after the website finishes loading.');
      return found;
    }finally{if(token===faviconLookupGeneration)$('shortcutRefreshFavicon').disabled=false;}
  }
  $('shortcutRefreshFavicon').addEventListener('click',()=>{
    const tabPermission=requestFaviconTabPermission(); // direct user gesture
    void lookupEditorFavicon({refresh:true,tabPermission});
  });
  $('shortcutIconMode').addEventListener('change',showIconControls);
  for(const field of ['shortcutIcon','shortcutImageUrl'])$(field).addEventListener('input',updateIconPreview);
  $('shortcutUrl').addEventListener('input',()=>{
    const url=normalizedUrl($('shortcutUrl').value);
    if(url!==pendingFaviconUrl){pendingFavicon=null;pendingFaviconUrl='';faviconLookupGeneration++;iconStatus('Icon will be looked up when you save, or press Refresh favicon.');}
    updateIconPreview();
  });
  $('shortcutUpload').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>4*1024*1024){
      $('shortcutError').hidden=false;$('shortcutError').textContent='Use a PNG, JPG, WebP or GIF under 4 MB.';return;
    }
    try{
      const objectURL=URL.createObjectURL(file);const img=new Image();
      try{
        await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=objectURL;});
        const can=document.createElement('canvas');can.width=144;can.height=144;
        const context=can.getContext('2d');const ratio=Math.min(144/img.naturalWidth,144/img.naturalHeight);
        const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
        context.drawImage(img,(144-w)/2,(144-h)/2,w,h);
        pendingShortcutImage=can.toDataURL('image/webp',.85);
        if(pendingShortcutImage.length>160000)pendingShortcutImage=can.toDataURL('image/jpeg',.78);
        $('shortcutError').hidden=true;updateIconPreview();
      }finally{URL.revokeObjectURL(objectURL);}
    }catch{$('shortcutError').textContent='Could not load this image. Try a PNG or JPG.';$('shortcutError').hidden=false;}
  });
  // Android: tapping outside an edit field dismisses the keyboard without closing editors.
  document.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse')return;
    const active=document.activeElement;
    if(!active?.matches?.('input[type="text"],input[type="url"],input[type="search"],textarea,[contenteditable="true"]'))return;
    if(event.target.closest('input[type="text"],input[type="url"],input[type="search"],textarea,[contenteditable="true"]'))return;
    active.blur();
  },true);
  function openShortcutEditor(item=null,slot=null){
    resetShortcutForm();
    if(!item&&Number.isInteger(slot))pendingCreationSlot=slot;
    if(item){
      editingShortcutId=item.id;pendingShortcutImage=item.iconImage||'';
      pendingFavicon=item.faviconData?{faviconData:item.faviconData}:item.faviconUrl?{faviconUrl:item.faviconUrl}:null;
      pendingFaviconUrl=normalizedUrl(item.url)||'';
      $('shortcutIcon').value=item.icon||'';$('shortcutLabel').value=item.label||'';$('shortcutUrl').value=item.url||'';
      $('shortcutIconMode').value=['symbol','favicon','upload','imageUrl'].includes(effectiveIconMode(item))?effectiveIconMode(item):'favicon';
      $('shortcutImageUrl').value=item.iconUrl||'';
      $('shortcutFormHeading').textContent='Edit shortcut';$('saveShortcut').textContent='Save changes';
      $('removeShortcut').hidden=false;showIconControls();
    }
    $('shortcutDialog').showModal();$('closeShortcutDialog').focus({preventScroll:true});
  }
  function resetShortcutForm(){
    faviconLookupGeneration++;editingShortcutId=null;pendingShortcutImage='';pendingFavicon=null;pendingFaviconUrl='';pendingCreationSlot=null;$('shortcutForm').reset();
    iconStatus('Icon will be looked up when you save, or press Refresh favicon.');$('shortcutIconMode').value='favicon';
    $('shortcutFormHeading').textContent='Add shortcut';$('saveShortcut').textContent='Add shortcut';
    $('removeShortcut').hidden=true;$('shortcutError').hidden=true;showIconControls();
  }
  function closeShortcutEditor(){
    $('shortcutDialog').close();resetShortcutForm();
  }
  $('closeShortcutDialog').addEventListener('click',closeShortcutEditor);
  $('shortcutDialog').addEventListener('click',event=>{if(event.target===$('shortcutDialog'))closeShortcutEditor();});
  $('shortcutDialog').addEventListener('close',resetShortcutForm);
  $('removeShortcut').addEventListener('click',async()=>{
    if(!editingShortcutId)return;
    if(!await lpDialogs.confirm('Remove this shortcut?'))return;
    const before=[...state.shortcuts];const removed=before.find(item=>item.id===editingShortcutId);
    state.shortcuts=state.shortcuts.filter(item=>item.id!==editingShortcutId);
    if(removed?.firefoxFollowed && removed.url)state.firefoxDismissedUrls=[...new Set([...state.firefoxDismissedUrls,removed.url])].slice(-250);
    if(!persistShortcutOrder()){state.shortcuts=before;if(removed?.firefoxFollowed)state.firefoxDismissedUrls=state.firefoxDismissedUrls.filter(url=>url!==removed.url);$('shortcutError').hidden=false;$('shortcutError').textContent='Unable to save changes.';return;}
    closeShortcutEditor();renderShortcuts();
  });
  $('shortcutForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const url=normalizedUrl($('shortcutUrl').value);const mode=$('shortcutIconMode').value;
    const invalid=message=>{$('shortcutError').hidden=false;$('shortcutError').textContent=message;};
    if(!url){invalid('Enter a valid http:// or https:// website address.');$('shortcutUrl').focus();return;}
    if(mode==='upload'&&!pendingShortcutImage){invalid('Choose a custom image first.');return;}
    if(mode==='imageUrl'&&!imageUrl($('shortcutImageUrl').value)){invalid('Enter an HTTPS image address.');return;}
    // One lookup at save time. It updates only this shortcut, not the whole app.
    // Request Firefox's tab-icon permission directly from the Save click;
    // permission dialogs require user activation. Skip for existing saved icons.
    const previousIcon=editingShortcutId?state.shortcuts.find(x=>x.id===editingShortcutId):null;
    const hasPreservedIcon=previousIcon&&normalizedUrl(previousIcon.url)===url&&
      (usableIcon(previousIcon.faviconData)||usableIcon(previousIcon.faviconUrl));
    const tabPermission=(mode==='favicon'&&!hasPreservedIcon&&!pendingFavicon)?requestFaviconTabPermission():null;
    const saveButton=$('saveShortcut');saveButton.disabled=true;
    let foundIcon=null;
    try{
      if(mode==='favicon'){
        foundIcon=pendingFaviconUrl===url?pendingFavicon:null;
        if(!foundIcon)foundIcon=await lookupEditorFavicon({tabPermission});
      }
    }finally{saveButton.disabled=false;}
    const previous=editingShortcutId?state.shortcuts.find(x=>x.id===editingShortcutId):null;
    const item={id:editingShortcutId||('link-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)),
      icon:$('shortcutIcon').value.trim().slice(0,8)||'↗',label:$('shortcutLabel').value.trim().slice(0,45)||new URL(url).hostname,url,iconMode:mode,
      ...(mode==='upload'?{iconImage:pendingShortcutImage}:{}),...(mode==='imageUrl'?{iconUrl:imageUrl($('shortcutImageUrl').value)}:{}),
      ...(mode==='favicon'&&foundIcon?.faviconData?{faviconData:foundIcon.faviconData}:{}),
      ...(mode==='favicon'&&foundIcon?.faviconUrl?{faviconUrl:foundIcon.faviconUrl}:{}),
      // A missing/failed refresh must never erase a previously saved good icon.
      ...(mode==='favicon'&&!foundIcon&&previous?.faviconData&&normalizedUrl(previous.url)===url?{faviconData:previous.faviconData}:{}),
      ...(mode==='favicon'&&!foundIcon&&previous?.faviconUrl&&normalizedUrl(previous.url)===url?{faviconUrl:previous.faviconUrl}:{}),
      ...(previous?.firefoxFollowed?{firefoxFollowed:true,firefoxOriginalTitle:previous.firefoxOriginalTitle}:{} )};
    const before=state.shortcuts,oldPositions={...state.shortcutPositions};
    state.shortcuts=editingShortcutId?before.map(x=>x.id===editingShortcutId?item:x):[...before,item];
    // A new shortcut created from an empty grid cell stays in that exact cell.
    if(!editingShortcutId&&Number.isInteger(pendingCreationSlot)&&!Object.values(state.shortcutPositions).includes(pendingCreationSlot))
      state.shortcutPositions[item.id]=pendingCreationSlot;
    try{localStorage.setItem('little-pixel-clock',JSON.stringify(state));}
    catch{state.shortcuts=before;state.shortcutPositions=oldPositions;invalid('Browser storage is full. Try a smaller image or fewer shortcuts.');return;}
    closeShortcutEditor();renderShortcuts();
  });
  $('cancelShortcut').addEventListener('click',closeShortcutEditor);
  $('showShortcutLabels').addEventListener('change',event=>set('showShortcutLabels',event.target.checked));
  for(const id of ['shortcutColumns','shortcutGridWidth','shortcutCellHeight','shortcutSize','shortcutGap','shortcutRounding'])$(id).addEventListener('input',event=>set(id,Number(event.target.value)));

  /* Create or edit Android-style folder groups, with explicit non-destructive dissolve. */
  let groupEditorOrder=[];
  // One visual picker: checked tiles stay above unchecked tiles and can be
  // reordered in place. There is no secondary order dialog or repeated list.
  function syncGroupTileOrder(){
    const list=$('groupChooseList'),tiles=[...list.querySelectorAll('label[data-id]')];
    const selected=new Set(tiles.filter(tile=>tile.querySelector('input')?.checked).map(tile=>tile.dataset.id));
    groupEditorOrder=groupEditorOrder.filter(id=>selected.has(id));
    for(const tile of tiles)if(selected.has(tile.dataset.id)&&!groupEditorOrder.includes(tile.dataset.id))groupEditorOrder.push(tile.dataset.id);
    const rank=new Map(groupEditorOrder.map((id,i)=>[id,i]));
    tiles.sort((a,b)=>{
      const aa=rank.has(a.dataset.id),bb=rank.has(b.dataset.id);
      return aa!==bb?(aa?-1:1):aa?(rank.get(a.dataset.id)-rank.get(b.dataset.id)):Number(a.dataset.originalIndex)-Number(b.dataset.originalIndex);
    });
    for(const tile of tiles){
      tile.classList.toggle('is-checked',selected.has(tile.dataset.id));
      tile.draggable=selected.has(tile.dataset.id);
      tile.setAttribute('aria-label',(selected.has(tile.dataset.id)?'Selected; drag to reorder: ':'Select: ')+(tile.querySelector('.group-choice-caption')?.textContent||'shortcut'));
      list.appendChild(tile);
    }
    $('groupSelectionCount').textContent=selected.size+' selected · drag selected tiles to reorder';
  }
  function moveGroupTile(fromId,toId){
    const a=groupEditorOrder.indexOf(fromId),b=groupEditorOrder.indexOf(toId);
    if(a<0||b<0||a===b)return;
    const [moved]=groupEditorOrder.splice(a,1);groupEditorOrder.splice(b,0,moved);
    syncGroupTileOrder();
    $('groupChooseList').querySelectorAll('label').forEach(tile=>tile.classList.remove('is-order-target'));
  }
  function openGroupEditor(group=null,{preselectedIds=[],slot=null}={}){
    editingGroupId=group?.id||null;
    pendingCreationSlot=!group&&Number.isInteger(slot)?slot:null;
    const initiallySelected=new Set(group?.items.map(x=>x.id)||preselectedIds);
    $('groupFormHeading').textContent=group?'Edit group':'New group';
    $('saveGroup').textContent=group?'Save group':'Create group';
    $('dissolveGroup').hidden=!group;
    $('groupLabel').value=group?.label||'';
    $('groupColumns').value=group?.columns||'auto';
    $('groupError').hidden=true;
    groupEditorOrder=group?(group.items||[]).map(x=>x.id):state.shortcuts.filter(x=>!isGroup(x)&&initiallySelected.has(x.id)).map(x=>x.id);
    $('groupSearch').value='';
    const list=$('groupChooseList');list.replaceChildren();
    const choices=[...(group?.items||[]),...state.shortcuts.filter(item=>!isGroup(item))];
    if(!choices.length){const p=document.createElement('p');p.className='inline-help';p.textContent='Add a shortcut first, then return here to put it into a group.';list.appendChild(p);}
    for(const [choiceIndex,link] of choices.entries()){
      if(!normalizedUrl(link.url))continue;
      const label=document.createElement('label');label.classList.toggle('is-checked',initiallySelected.has(link.id));
      label.dataset.id=link.id;label.dataset.originalIndex=choiceIndex;label.tabIndex=0;
      label.dataset.label=((link.label||'')+' '+link.url).toLowerCase();
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=link.id;checkbox.checked=initiallySelected.has(link.id);
      const icon=makeIcon(link,'shortcut-item-icon');
      const txt=document.createElement('span');txt.className='group-choice-caption';txt.textContent=link.label||link.url;
      label.append(checkbox,icon,txt);list.appendChild(label);
      checkbox.addEventListener('change',syncGroupTileOrder);
      label.addEventListener('dragstart',event=>{
        if(!checkbox.checked){event.preventDefault();return;}
        event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-little-pixel-group',link.id);
        label.classList.add('is-dragging');
      });
      label.addEventListener('dragover',event=>{
        if(!checkbox.checked)return;
        if(!event.dataTransfer.types.includes('application/x-little-pixel-group'))return;
        event.preventDefault();event.dataTransfer.dropEffect='move';label.classList.add('is-order-target');
      });
      label.addEventListener('dragleave',()=>label.classList.remove('is-order-target'));
      label.addEventListener('drop',event=>{
        const from=event.dataTransfer.getData('application/x-little-pixel-group');
        if(!from||!checkbox.checked)return;
        event.preventDefault();event.stopPropagation();moveGroupTile(from,link.id);
      });
      label.addEventListener('dragend',()=>{list.querySelectorAll('label').forEach(el=>el.classList.remove('is-dragging','is-order-target'));});
      label.addEventListener('keydown',event=>{
        if(!checkbox.checked||!event.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
        event.preventDefault();const pos=groupEditorOrder.indexOf(link.id);
        const delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;
        const other=groupEditorOrder[pos+delta];if(other)moveGroupTile(link.id,other);
        label.focus();
      });
      bindHoldToMove(label,{
        enabled:()=>!!$('groupDialog').open&&checkbox.checked,
        source:()=>label,preview:()=>label,exclude:'input',targetSelector:'#groupChooseList label.is-checked',
        drop:target=>{if(target?.dataset.id)moveGroupTile(link.id,target.dataset.id);}
      });
    }
    syncGroupTileOrder();$('groupDialog').showModal();$('closeGroupDialog').focus({preventScroll:true});
  }
  $('groupSearch').addEventListener('input',event=>{const term=event.target.value.trim().toLowerCase();for(const tile of $('groupChooseList').querySelectorAll('label'))tile.hidden=!!term&&!tile.dataset.label.includes(term);});
  function closeGroupEditor(){if($('groupDialog').open)$('groupDialog').close();editingGroupId=null;pendingCreationSlot=null;}
  $('closeGroupDialog').addEventListener('click',closeGroupEditor);
  $('cancelGroup').addEventListener('click',closeGroupEditor);
  $('groupDialog').addEventListener('click',e=>{if(e.target===$('groupDialog'))closeGroupEditor();});
  $('groupForm').addEventListener('submit',event=>{
    event.preventDefault();const label=$('groupLabel').value.trim().slice(0,40);
    if(!label){$('groupError').hidden=false;$('groupError').textContent='Enter a group name.';return;}
    const selected=new Set([...$('groupChooseList').querySelectorAll('input:checked')].map(input=>input.value));
    const group=editingGroupId?topEntry(editingGroupId):null;
    const available=[...(group?.items||[]),...state.shortcuts.filter(item=>!isGroup(item))];
    const byId=new Map(available.map(link=>[link.id,link]));
    const members=groupEditorOrder.filter(id=>selected.has(id)).map(id=>byId.get(id)).filter(Boolean);
    const leftovers=(group?.items||[]).filter(link=>!selected.has(link.id));
    const columns=$('groupColumns').value;
    const newGroup=group?{...group,label,columns,items:members}:{id:'group-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),type:'group',label,columns,items:members};
    const old=state.shortcuts,oldPositions={...state.shortcutPositions};
    const without=old.filter(item=>isGroup(item)||!selected.has(item.id));
    if(group){
      const pos=without.findIndex(item=>item.id===group.id);without.splice(pos,1,newGroup,...leftovers);
    }else without.push(newGroup);
    state.shortcuts=without;
    // The new group replaces the selected links' top-level grid cells.
    for(const id of selected)delete state.shortcutPositions[id];
    if(!group){
      const requestedSlot=Number.isInteger(pendingCreationSlot)?pendingCreationSlot:null;
      const selectedSlots=members.map(link=>oldPositions[link.id]).filter(Number.isInteger).sort((a,b)=>a-b);
      const preferred=requestedSlot??selectedSlots[0];
      if(Number.isInteger(preferred)&&!Object.values(state.shortcutPositions).includes(preferred))state.shortcutPositions[newGroup.id]=preferred;
    }
    if(!persistShortcutOrder()){
      state.shortcuts=old;state.shortcutPositions=oldPositions;$('groupError').hidden=false;$('groupError').textContent='Unable to save group.';return;
    }
    selectedShortcutIds.clear();closeGroupEditor();renderShortcuts();
  });
  $('dissolveGroup').addEventListener('click',async()=>{
    const group=topEntry(editingGroupId);if(isGroup(group))await deleteGroupWithOptions(group);
  });
  showIconControls();
  $('startPage').addEventListener('change',e=>set('startPage',e.target.value));
  const dock=$('bottomDock'),handle=$('dockHandle'),dockItems=$('dockItems');
  let dockExpanded=false;
  let dockLeaveTimeout, dockFocusedByMouse=false;
  dock.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')dockFocusedByMouse=true;});
  dock.addEventListener('keydown',()=>{dockFocusedByMouse=false;});
  function setDockExpanded(expanded){
    dockExpanded=!!expanded;
    const compact=!!state.autoHideDock && !dockExpanded;
    dock.classList.toggle('is-collapsed',compact);
    handle.hidden=!compact;
    handle.textContent='⌃';
    handle.setAttribute('aria-expanded',String(!compact));
    handle.setAttribute('aria-label','Show navigation');
    handle.title='Show navigation';
    dockItems.setAttribute('aria-hidden',String(compact));
    dockItems.inert=compact;
  }
  function updateDockMode(){
    if(!document.getElementById('bottomDock'))return;
    if(!state.autoHideDock)setDockExpanded(true);
    else if(document.documentElement.classList.contains('settings-open'))setDockExpanded(true);
    else setDockExpanded(false);
  }
  $('dockAlignment').addEventListener('change',e=>set('dockAlignment',e.target.value));
  $('dockScale').addEventListener('input',e=>set('dockScale',Number(e.target.value)));
  $('dockIconsOnly').addEventListener('change',e=>set('dockIconsOnly',e.target.checked));
  $('autoHideDock').addEventListener('change',e=>set('autoHideDock',e.target.checked));
  handle.addEventListener('click',()=>{
    clearTimeout(dockLeaveTimeout);
    if(document.documentElement.classList.contains('settings-open'))return;
    setDockExpanded(true);
  });
  document.addEventListener('pointerdown',event=>{
    if(!state.autoHideDock||!dockExpanded||document.documentElement.classList.contains('settings-open'))return;
    if(!dock.contains(event.target))setDockExpanded(false);
  });
  dock.addEventListener('pointerenter',e=>{
    if(e.pointerType==='mouse' && state.autoHideDock){clearTimeout(dockLeaveTimeout);setDockExpanded(true);}
  });
  dock.addEventListener('pointerleave',e=>{
    if(e.pointerType!=='mouse'||!state.autoHideDock)return;
    clearTimeout(dockLeaveTimeout);
    // A mouse-clicked dock button may retain DOM focus long after the cursor
    // leaves. Blur that mouse focus so auto-hide actually closes promptly;
    // keyboard focus still keeps the dock open for accessibility.
    if(dockFocusedByMouse&&dock.contains(document.activeElement)&&document.activeElement.matches('button'))document.activeElement.blur();
    dockFocusedByMouse=false;
    dockLeaveTimeout=setTimeout(()=>{
      if(!document.documentElement.classList.contains('settings-open')&&!dock.matches(':hover')&&!dock.matches(':focus-within'))setDockExpanded(false);
    },75);
  });
  dock.addEventListener('focusin',()=>{if(state.autoHideDock)setDockExpanded(true);});
  dock.addEventListener('focusout',()=>{if(!state.autoHideDock)return;setTimeout(()=>{if(!dock.matches(':focus-within')&&!dock.matches(':hover')&&!document.documentElement.classList.contains('settings-open'))setDockExpanded(false)},120);});
  for(const id of ['tabShortcuts','tabClock','tabCalendar'])$(id).addEventListener('click',()=>{
    if(state.autoHideDock&&!document.documentElement.classList.contains('settings-open')&&matchMedia('(pointer:coarse)').matches)setDockExpanded(false);
  });
  // Settings drawer is opened from the same dock used for page navigation.
  const settingsPanel=$('settingsPanel'),settingsToggle=$('toggleSettings'),backdrop=$('settingsBackdrop');
  let settingsReturnFocus=null;
  function toggleSettings(open){
    if(open===document.documentElement.classList.contains('settings-open'))return;
    if(open){
      settingsReturnFocus=document.activeElement;
    }
    document.documentElement.classList.toggle('settings-open',open);
    settingsToggle.setAttribute('aria-expanded',String(open));
    settingsToggle.setAttribute('aria-label',open?'Close settings':'Open settings');
    settingsPanel.inert=!open;
    settingsPanel.setAttribute('aria-hidden',String(!open));
    backdrop.hidden=true; // non-modal drawer: allow changing pages without dismissing settings
    if(state.autoHideDock)setDockExpanded(true);
    if(open)$('closeSettings').focus();
    else { if(state.autoHideDock)setDockExpanded(false); if(settingsReturnFocus?.isConnected)settingsReturnFocus.focus(); }
  }
  settingsToggle.addEventListener('click',()=>toggleSettings(!document.documentElement.classList.contains('settings-open')));
  $('closeSettings').addEventListener('click',()=>toggleSettings(false));
  backdrop.addEventListener('click',()=>toggleSettings(false));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.documentElement.classList.contains('settings-open')){
      e.stopPropagation();toggleSettings(false);
    }
  },true);
  $('copyHomeLink').addEventListener('click',async()=>{
    const url=new URL(location.href);url.search='';url.hash='';
    try{await navigator.clipboard.writeText(url.href);$('copyHomeLink').textContent='Copied!';}
    catch{$('copyHomeLink').textContent='Copy URL from browser address bar';}
    setTimeout(()=>$('copyHomeLink').textContent='Copy app link',1800);
  });
  // Portable backups. Only simple known settings are imported, not executable content.
  const backupFeedback=$('backupFeedback');
  const showBackupStatus=(message,error=false)=>{backupFeedback.textContent=message;backupFeedback.dataset.error=String(error);};
  const normalUrl=value=>{
    if(typeof value!=='string')return '';
    try{const u=new URL(value);return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';}catch{return '';}
  };
  function sanitizedShortcuts(value){
    if(!Array.isArray(value))throw Error('The shortcuts list must be an array.');
    if(value.length>250)throw Error('Too many shortcuts (limit 250).');
    const ids=new Set();let total=0;
    const sanitizeLink=(s,i)=>{
      if(!s||typeof s!=='object')return null;
      const url=normalUrl(s.url);if(!url)return null;
      if(++total>250)throw Error('Too many links in backup (limit 250).');
      const iconMode=['symbol','favicon','upload','imageUrl'].includes(s.iconMode)?s.iconMode:'symbol';
      let id=typeof s.id==='string'&&s.id.length<=80?s.id:'import-'+i+'-'+Date.now();
      if(ids.has(id))id='import-'+i+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,5);
      ids.add(id);
      const result={id,label:typeof s.label==='string'?s.label.slice(0,45):new URL(url).hostname,url,icon:typeof s.icon==='string'?s.icon.slice(0,8):'↗',iconMode};
      if(iconMode==='favicon'&&typeof s.faviconData==='string'&&/^data:image\/(?:png|jpeg|gif|svg\+xml|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(s.faviconData)&&s.faviconData.length<150000)result.faviconData=s.faviconData;
      if(iconMode==='favicon'&&typeof s.faviconUrl==='string'&&imageUrl(s.faviconUrl))result.faviconUrl=imageUrl(s.faviconUrl);
      if(iconMode==='upload'&&typeof s.iconImage==='string'&&/^data:image\/(?:png|jpeg|gif|webp|x-icon|vnd\.microsoft\.icon);base64,/i.test(s.iconImage)&&s.iconImage.length<500000)result.iconImage=s.iconImage;
      if(iconMode==='imageUrl'&&typeof s.iconUrl==='string'&&normalUrl(s.iconUrl))result.iconUrl=normalUrl(s.iconUrl);
      return result;
    };
    return value.map((s,i)=>{
      if(s?.type==='group'&&Array.isArray(s.items)){
        let id=typeof s.id==='string'&&s.id.length<=80?s.id:'group-import-'+i+'-'+Date.now();
        if(ids.has(id))id+='-'+Math.random().toString(36).slice(2,6);ids.add(id);
        return {id,type:'group',label:typeof s.label==='string'?s.label.slice(0,40):'Group',columns:['2','3','4','5','6'].includes(String(s.columns))?String(s.columns):'auto',items:s.items.slice(0,250).map((link,j)=>sanitizeLink(link,i+'-'+j)).filter(Boolean)};
      }
      return sanitizeLink(s,i);
    }).filter(Boolean);
  }
  function mergeShortcuts(list){
    const seen=new Set(allLinks(state.shortcuts).map(s=>normalUrl(s.url).replace(/\/$/,'').toLowerCase()));
    const existingIds=new Set(state.shortcuts.map(s=>s.id));
    const newItems=[];
    const dedupe=link=>{
      const key=normalUrl(link.url).replace(/\/$/,'').toLowerCase();if(!key||seen.has(key))return null;
      seen.add(key);return link;
    };
    for(const item of list){
      if(isGroup(item)){
        const links=item.items.map(dedupe).filter(Boolean);if(!links.length)continue;
        const id=existingIds.has(item.id)?'group-import-'+Date.now()+'-'+Math.random().toString(36).slice(2,6):item.id;
        existingIds.add(id);newItems.push({...item,id,items:links});
      }else{
        const link=dedupe(item);if(!link)continue;
        if(existingIds.has(link.id))link.id='import-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
        existingIds.add(link.id);newItems.push(link);
      }
    }
    const before=state.shortcuts;state.shortcuts=[...before,...newItems];
    try{localStorage.setItem('little-pixel-clock',JSON.stringify(state));}
    catch{state.shortcuts=before;throw Error('Storage is full. Try removing large uploaded icons.');}
    renderShortcuts();return newItems.length;
  }
  function downloadBackup(type){
    const payload={app:'little-pixel-clock',version:1,type,exportedAt:new Date().toISOString(),...(type==='shortcuts'?{shortcuts:state.shortcuts}:{config:state})};
    const data=JSON.stringify(payload,null,2);const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`little-pixel-clock-${type}-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);showBackupStatus(`Exported ${type==='shortcuts'?'shortcuts':'full configuration'} as JSON.`);
  }
  $('exportEverything').addEventListener('click',()=>downloadBackup('full'));
  $('exportLinks').addEventListener('click',()=>downloadBackup('shortcuts'));
  // Firefox native New Tab pinned shortcuts are stored as a JSON array in
  // about:config > browser.newtabpage.pinned. This is NOT a bookmarks import file.
  $('exportFirefoxNative')?.addEventListener('click',()=>{
    const source=[...state.shortcuts];
    if(state.shortcutLayout==='grid'){
      source.sort((a,b)=>{
        const ap=state.shortcutPositions[a.id],bp=state.shortcutPositions[b.id];
        return (Number.isInteger(ap)?ap:10000)-(Number.isInteger(bp)?bp:10000);
      });
    }
    const native=[];
    const add=link=>{
      const url=normalizedUrl(link.url);
      if(url)native.push({url,label:String(link.label||new URL(url).hostname).slice(0,150)});
    };
    for(const item of source){
      if(isGroup(item))for(const link of item.items||[])add(link);
      else add(item);
    }
    const payload=JSON.stringify(native); // One line for pasting into about:config.
    const url=URL.createObjectURL(new Blob([payload],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='firefox-newtab-pinned-shortcuts.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    showBackupStatus(`Exported ${native.length} Firefox New Tab shortcuts as JSON. To restore, back up and edit about:config → browser.newtabpage.pinned (manual paste, not Firefox bookmarks import). Groups become separate links.`);
  });
  // Bookmarks HTML is a separate export format for Firefox's bookmark importer.
  $('exportFirefoxBookmarks')?.addEventListener('click',()=>{
    const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const renderItems=(items,level)=>items.map(item=>{
      const indent='    '.repeat(level);
      if(isGroup(item))return `${indent}<DT><H3>${esc(item.label||'Group')}</H3>\n${indent}<DL><p>\n${renderItems(item.items||[],level+1)}${indent}</DL><p>\n`;
      const url=normalizedUrl(item.url);
      if(!url)return '';
      return `${indent}<DT><A HREF="${esc(url)}">${esc(item.label||new URL(url).hostname)}</A>\n`;
    }).join('');
    const payload='<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Little Pixel bookmarks</TITLE>\n<H1>Little Pixel bookmarks</H1>\n<DL><p>\n'+renderItems(state.shortcuts,1)+'</DL><p>\n';
    const url=URL.createObjectURL(new Blob([payload],{type:'text/html;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='little-pixel-firefox-bookmarks.html';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    showBackupStatus('Exported Firefox-compatible bookmarks HTML. Import it in Firefox Bookmarks Library (Ctrl+Shift+O). Firefox native pinned shortcuts are separate.');
  });

  let requestedBackupType='full';
  for(const [id,kind] of [['importEverything','full'],['importLinks','shortcuts']])$(id).addEventListener('click',()=>{
    requestedBackupType=kind;$('backupFile').value='';$('backupFile').click();
  });
  $('backupFile').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>8_000_000)throw Error('JSON file is too large (maximum 8 MB).');
      const backup=JSON.parse(await file.text());
      if(!backup||typeof backup!=='object')throw Error('Not a configuration file.');
      if(requestedBackupType==='shortcuts'){
        const shortcuts=sanitizedShortcuts(Array.isArray(backup)?backup:(backup.shortcuts??backup.config?.shortcuts));
        const count=mergeShortcuts(shortcuts);showBackupStatus(`${count} new shortcuts imported. Duplicates were skipped.`);
      }else{
        const raw=backup.config??(backup.app==='little-pixel-clock'?backup:null);
        if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('This file does not contain an app configuration.');
        if(!await lpDialogs.confirm('Import all settings? This replaces the current colors, settings, and shortcuts. Export your current configuration first if you want a backup.'))return;
        const clean={...defaults};
        for(const [key,defaultValue] of Object.entries(defaults)){
          if(key==='shortcuts'){if(raw.shortcuts!==undefined)clean.shortcuts=sanitizedShortcuts(raw.shortcuts);continue;}
          if(key==='notes'){if(raw.notes!==undefined)clean.notes=sanitizeNotes(raw.notes);continue;}
          if(key==='pinPreview')continue;
          if(key==='customThemes'){
            if(Array.isArray(raw.customThemes))clean.customThemes=raw.customThemes.filter(t=>t&&typeof t==='object'&&typeof t.id==='string'&&t.id.length<80&&typeof t.name==='string'&&t.name.length<=40&&t.snapshot&&typeof t.snapshot==='object'&&themePalettes[t.snapshot.theme]).slice(0,30).map(t=>({id:t.id,name:t.name,base:t.snapshot.theme,snapshot:t.snapshot}));
            continue;
          }
          if(key==='viewBackgrounds'){
            if(raw.viewBackgrounds && typeof raw.viewBackgrounds==='object')clean.viewBackgrounds=sanitizeViewBackgrounds(raw.viewBackgrounds);
            else{
              const legacy={...defaultViewBackground};
              for(const prop of Object.keys(legacy))if(raw[prop]!==undefined)legacy[prop]=raw[prop];
              clean.viewBackgrounds=sanitizeViewBackgrounds(Object.fromEntries(['shortcuts','clock','calendar'].map(name=>[name,legacy])));
            }
            continue;
          }
          if(key==='wallpaperModes'){
            if(raw.wallpaperModes && typeof raw.wallpaperModes==='object' && !Array.isArray(raw.wallpaperModes))
              clean.wallpaperModes=Object.fromEntries(['shortcuts','clock','calendar'].map(k=>[k,['shared','own','none'].includes(raw.wallpaperModes[k])?raw.wallpaperModes[k]:'shared']));
            continue;
          }
          if(key==='wallpapers'){
            if(raw.wallpapers&&typeof raw.wallpapers==='object'&&!Array.isArray(raw.wallpapers)){
              const images={...defaults.wallpapers};
              for(const name of Object.keys(images)){
                const value=raw.wallpapers[name];
                if(typeof value==='string'&&value.length<600000&&/^data:image\/(?:webp|png|jpeg);base64,/i.test(value))images[name]=value;
              }
              clean.wallpapers=images;
            }
            continue;
          }
          if(key==='shortcutPositions'){
            if(raw.shortcutPositions&&typeof raw.shortcutPositions==='object'&&!Array.isArray(raw.shortcutPositions)){
              clean.shortcutPositions=Object.fromEntries(Object.entries(raw.shortcutPositions).filter(([k,n])=>k.length<=80&&Number.isInteger(n)&&n>=0&&n<150));
            }
            continue;
          }
          const v=raw[key];
          if(typeof v===typeof defaultValue){
            if(typeof v==='string'&&v.length<=150)clean[key]=v;
            else if(typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<10000)clean[key]=v;
            else if(typeof v==='boolean')clean[key]=v;
            else if(v&&typeof v==='object'&&!Array.isArray(v)){
              const filtered={};for(const [k,c] of Object.entries(v))if(k.length<60&&typeof c==='string'&&/^#[0-9A-Fa-f]{6}$/.test(c))filtered[k]=c;
              if(['themeColors','themeBackgrounds','themeDateColors'].includes(key))clean[key]=filtered;
              else if(key==='themeRounds')clean[key]=Object.fromEntries(Object.entries(v).filter(([k,n])=>k.length<60&&typeof n==='number'&&n>=0&&n<=100));
            }
          }
        }
        // A v6.12 backup stored one strength for both lighting effects.
        if(raw.backlightStrength===undefined && Number.isFinite(raw.glowIntensity))clean.backlightStrength=Math.max(0,Math.min(100,raw.glowIntensity));
        if(!themePalettes[clean.theme])clean.theme=defaults.theme;
        if(!raw.viewBackgrounds && raw.wallpaperEnabled===false && Object.values(clean.wallpapers||{}).some(Boolean))
          clean.wallpaperModes=Object.fromEntries(['shortcuts','clock','calendar'].map(name=>[name,'none']));
        if(!['auto','grid'].includes(clean.shortcutLayout))clean.shortcutLayout='auto';
        if(!['clock','calendar','shortcuts'].includes(clean.startPage))clean.startPage='clock';
        const prior=state;state=clean;
        try{localStorage.setItem('little-pixel-clock',JSON.stringify(state));}
        catch{state=prior;throw Error('Storage is full. Try importing fewer uploaded images.');}
        apply();renderThemeManager();updateDockMode();showView(state.startPage);showBackupStatus('Full configuration imported successfully.');
      }
    }catch(err){showBackupStatus('Import failed: '+err.message,true);}
  });
  // Profile-wide reset: clear the extension's local/sync stores in the background.
  // Keep the page inert until the background has completed the reset, then reload.
  $('factoryReset')?.addEventListener('click',async()=>{
    const message='Factory reset Little Pixel?\n\nThis permanently deletes saved notes, reminders, themes, wallpapers, shortcuts, and layouts from this Firefox profile AND overwrites your Firefox-synced Little Pixel data.\n\nFirefox native New Tab shortcuts will be imported again automatically. Export a backup first if you want to keep anything.';
    if(!await lpDialogs.confirm(message))return;
    const button=$('factoryReset'),feedback=$('factoryResetFeedback');
    button.disabled=true;feedback.textContent='Resetting Little Pixel…';
    window.dispatchEvent(new Event('little-pixel:reset-start'));
    try{
      if(typeof browser==='undefined'||!browser.runtime?.sendMessage)throw Error('Factory reset is available in the Firefox add-on only.');
      const response=await browser.runtime.sendMessage({type:'factoryReset',state:structuredClone(defaults)});
      if(!response?.ok)throw Error(response?.error||'Factory reset failed.');
      localStorage.removeItem('little-pixel-clock');
      location.reload();
    }catch(error){
      window.dispatchEvent(new Event('little-pixel:reset-cancel'));
      feedback.textContent='Reset failed: '+error.message;button.disabled=false;
    }
  });

  // Apply a completed one-time Firefox import in place. Avoid refreshing the
  // whole app or interrupting the clock/settings; the bridge has already saved
  // the canonical snapshot. Other background updates remain unchanged.
  window.addEventListener('little-pixel:firefox-imported',event=>{
    const imported=event.detail;
    if(!Array.isArray(imported?.shortcuts))return;
    // An open editor may contain unsaved changes. Leave the existing view alone
    // instead of discarding it; new tabs still read the canonical snapshot.
    if(document.querySelector('dialog[open]')||shortcutsEditMode){
      const status=$('firefoxBridgeStatus');
      if(status)status.textContent='Imported shortcuts saved. Exit Edit Mode or open another tab to display them.';
      return;
    }
    state.shortcuts=structuredClone(imported.shortcuts);
    if(Array.isArray(imported.firefoxDismissedUrls))
      state.firefoxDismissedUrls=structuredClone(imported.firefoxDismissedUrls);
    // Keep the current page (Clock/Calendar/Shortcuts) unchanged.
    renderShortcuts();
  });

  // The WebExtension bridge performs native import and reports available sites.
  const firefoxButton=$('importFirefoxSites');
  if(firefoxButton){firefoxButton.hidden=false;$('firefoxImportSection').hidden=false;}

  showView(['clock','shortcuts','calendar'].includes(displayPageOverride)?displayPageOverride:state.startPage);
  let lastTick=-1;let lastDay='';
  function draw(){
    const now=new Date();const time=timeString(now);
    dateText.hidden=!state.date;dateText.textContent=state.date?formatDate(now):'';
    canvas.setAttribute('aria-label',`Current time ${time}`);
    const r=resizeCanvas();if(!r)return;
    if(state.theme==='minimal')drawMinimal(time,r);
    else if(state.theme==='amber')drawAmber(time,r);
    else drawMatrix(time,r,state.theme==='arcade'||state.theme==='rose');
    lastTick=now.getSeconds();
  }
  setInterval(()=>{
    const n=new Date();
    if(currentView==='clock'&&(n.getSeconds()!==lastTick||state.colonAnimation==='pulse'))draw();
    const day=n.toDateString();if(day!==lastDay){lastDay=day;renderCalendar();renderClockNotes();}
  },120);
  const ro=new ResizeObserver(draw);ro.observe(canvas);
  $('fullscreen').addEventListener('click',async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    }catch{$('status').textContent='Full screen is unavailable in this browser.';}
  });
  $('exitFs').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();});
  let wakeLock=null;
  async function manageWake(){
    if(wakeLock){try{await wakeLock.release();}catch{}wakeLock=null;}
    if(!state.awake||document.visibilityState!=='visible')return;
    if(!('wakeLock' in navigator)){$('status').textContent='Screen wake lock is not available in this browser.';return;}
    try{wakeLock=await navigator.wakeLock.request('screen');$('status').textContent='Screen stays awake while this page is visible (phone remains unlocked).';}
    catch{$('status').textContent='Wake lock unavailable; check your browser and screen settings.';}
  }
  $('awake').addEventListener('change',e=>{set('awake',e.target.checked);manageWake();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){draw();if(state.awake)manageWake();}});
  document.addEventListener('fullscreenchange',()=>{
    const active=!!document.fullscreenElement;
    $('fullscreen').setAttribute('aria-label',active?'Exit full screen':'Enter full screen');
    $('fullscreen').title=active?'Exit full screen':'Full screen';
    $('fullscreen').textContent=active?'⤢':'⛶';
    // Settings stays available in fullscreen, too.
    draw();
  });
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  apply();if(state.awake)manageWake();
})();
