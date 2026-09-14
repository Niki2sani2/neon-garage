/* Player UI. The original save object and localStorage key remain authoritative. */
(() => {
 'use strict';
 const element=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const toolbar=element('div','neon-community-bar');toolbar.hidden=true;
 const leaderboardButton=element('button','','BESTENLISTE');leaderboardButton.type='button';
 const syncStatus=element('span','neon-sync-status');syncStatus.setAttribute('role','status');
 toolbar.append(leaderboardButton,syncStatus);document.body.append(toolbar);
 const gate=element('dialog','neon-dialog neon-name-dialog');gate.setAttribute('aria-labelledby','neon-name-title');
 const title=element('h1','','DEIN GAMERNAME');title.id='neon-name-title';
 const help=element('p','','Wähle deinen Namen für die Garage und die gemeinsame Bestenliste.');
 const form=element('form');const label=element('label','','Gamername');label.htmlFor='neon-username';
 const input=element('input');input.id='neon-username';input.name='username';input.required=true;input.minLength=2;input.maxLength=16;input.autocomplete='nickname';input.spellcheck=false;
 const note=element('p','neon-muted','2–16 Zeichen. Jeder Name ist nur einmal verfügbar.');
 const status=element('p','neon-form-status');status.setAttribute('role','status');
 const submit=element('button','neon-primary','NAMEN SPEICHERN');submit.type='submit';
 const reload=element('button','','VERBINDUNG ERNEUT VERSUCHEN');reload.type='button';reload.hidden=true;reload.onclick=()=>location.reload();
 form.append(label,input,note,status,submit,reload);gate.append(title,help,form);document.body.append(gate);
 gate.addEventListener('cancel',e=>e.preventDefault());
 let onboardingComplete=false,player=null,dirtySave=null,syncRunning=false,syncTimer;
 const ready=async()=>{
  const started=Date.now();
  while(!window.neonPlayerReady&&Date.now()-started<15000)await new Promise(resolve=>setTimeout(resolve,50));
  if(!window.neonPlayerReady)throw new Error('Verbindung konnte nicht gestartet werden.');
  let timer;
  try {
   const p=await Promise.race([window.neonPlayerReady,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Die Verbindung dauert zu lange.')),15000);})]);
   if(!p)throw window.neonPlayerError||new Error('Spieler konnte nicht geladen werden.');
   return window.neonPlayer||p;
  }finally{clearTimeout(timer);}
 };
 const hasName=p=>typeof p?.username==='string'&&p.username.trim().length>=2&&!/^Guest_[a-f\d]{8}$/i.test(p.username);
 function refreshToolbar(){toolbar.hidden=!onboardingComplete||garage.style.display==='none';}
 new MutationObserver(refreshToolbar).observe(garage,{attributes:true,attributeFilter:['style']});
 function enterGarage(){onboardingComplete=true;refreshToolbar();focusGarage();window.queueNeonSync(save);}
 function showName(){title.textContent='DEIN GAMERNAME';help.textContent='Wähle deinen Namen für die Garage und die gemeinsame Bestenliste.';input.disabled=false;submit.hidden=false;reload.hidden=true;status.textContent='';if(!gate.open)gate.showModal();input.focus();}
 window.beginNeonSession=async()=>{
  title.textContent='GARAGE VERBINDEN';help.textContent='Dein Spieler wird geladen …';input.disabled=true;submit.hidden=true;
  gate.showModal();
  try{
   player=await ready();gate.close();
   if(hasName(player)){
    storyLines.splice(0,storyLines.length,'Willkommen zurück, '+player.username);
    startStory();setTimeout(()=>{if(storyActive)finishStory();},2600);
   }else{
    let introSeen=false;try{introSeen=localStorage.getItem('neon_intro_seen:'+player.user_id)==='yes';}catch(_){}
    if(introSeen)showName();else startStory();
   }
  }catch(error){title.textContent='VERBINDUNG FEHLGESCHLAGEN';help.textContent='Dein Spielstand bleibt gespeichert. Bitte prüfe deine Internetverbindung.';status.textContent='Der Online-Spieler ist gerade nicht erreichbar.';reload.hidden=false;reload.focus();}
 };
 window.finishNeonOnboarding=()=>{
  try{localStorage.setItem('neon_intro_seen:'+player.user_id,'yes');}catch(_){}
  if(hasName(player))enterGarage();else showName();
 };
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(submit.disabled||input.disabled)return;
  const name=input.value.trim();
  if([...name].length<2||[...name].length>16||/[\u0000-\u001f\u007f]/.test(name)||/^Guest_[a-f\d]{8}$/i.test(name)){
   status.textContent='Bitte wähle einen eigenen Namen mit 2–16 Zeichen.';input.focus();return;
  }
  submit.disabled=true;input.disabled=true;status.textContent='Name wird gespeichert …';
  try{
   const {data,error}=await window.supabaseClient.from('players').update({username:name}).eq('user_id',player.user_id).select('user_id,username').single();
   if(error)throw error;
   player={...player,...data};window.neonPlayer=player;
   gate.close();enterGarage();
  }catch(error){status.textContent=error.code==='23505'?'Dieser Name ist bereits vergeben. Wähle einen anderen.':'Name konnte nicht gespeichert werden. Bitte versuche es erneut.';}
  finally{submit.disabled=false;input.disabled=false;if(gate.open)input.focus();}
 });
 // Serialize the existing sync function so older requests cannot overwrite newer tuning.
 window.queueNeonSync=snapshot=>{
  dirtySave=JSON.parse(JSON.stringify(snapshot));clearTimeout(syncTimer);
  syncTimer=setTimeout(flushSync,350);
 };
 async function flushSync(){
  if(syncRunning||!dirtySave||!window.neonPlayer?.user_id)return;
  syncRunning=true;
  while(dirtySave){
   const snapshot=dirtySave;dirtySave=null;syncStatus.textContent='SYNCHRONISIERT …';
   try{await window.syncNeonPlayer(snapshot);syncStatus.textContent='ONLINE';}
   catch(error){dirtySave=dirtySave||snapshot;syncStatus.textContent='LOKAL GESPEICHERT · SYNC AUSSTEHEND';syncRunning=false;clearTimeout(syncTimer);syncTimer=setTimeout(flushSync,10000);return;}
  }
  syncRunning=false;
 }
 window.addEventListener('online',flushSync);
 const board=element('dialog','neon-dialog neon-board');board.setAttribute('aria-labelledby','neon-board-title');
 const heading=element('div','neon-board-heading');const boardTitle=element('h1','','BESTENLISTE');boardTitle.id='neon-board-title';
 const close=element('button','','SCHLIESSEN ×');close.type='button';heading.append(boardTitle,close);
 const description=element('p','neon-muted','Eure Autos. Eure Rekorde. Highway: Strecke · Drift: Punkte · Drag: Bestzeit.');
 const tools=element('div','neon-board-tools');const sortLabel=element('label','','Sortieren nach');sortLabel.htmlFor='neon-sort';
 const sort=element('select');sort.id='neon-sort';
 [['highway_score','HIGHWAY'],['drift_score','DRIFT'],['drag_score','DRAG']].forEach(([value,text])=>{const option=element('option','',text);option.value=value;sort.append(option);});
 const refresh=element('button','','AKTUALISIEREN');refresh.type='button';tools.append(sortLabel,sort,refresh);
 const boardStatus=element('p','neon-muted');boardStatus.setAttribute('role','status');
 const list=element('div','neon-player-list');board.append(heading,description,tools,boardStatus,list);document.body.append(board);
 close.onclick=()=>board.close();board.addEventListener('close',()=>leaderboardButton.focus());
 let players=[],requestId=0;
 function render(){
  list.replaceChildren();const key=sort.value;
  const score=p=>{const n=Number(p[key]);return Number.isFinite(n)&&n>0?n:(key==='drag_score'?Infinity:0);};
  const sorted=[...players].sort((a,b)=>{const av=score(a),bv=score(b);return (av===bv?0:(key==='drag_score'?av-bv:bv-av))||String(a.username).localeCompare(String(b.username))||String(a.user_id).localeCompare(String(b.user_id));});
  const number=n=>Math.max(0,Number(n)||0);
  sorted.forEach((p,index)=>{
   const row=element('article','neon-player'+(p.user_id===player?.user_id?' neon-self':''));
   const rank=element('span','neon-rank',String(index+1).padStart(2,'0'));
   const details=element('div','neon-player-details');details.append(element('h2','',String(p.username||'Unbekannter Spieler')+(p.user_id===player?.user_id?' · DU':'')));
   const scores=element('div','neon-scores');
   [['HIGHWAY',(number(p.highway_score)/1000).toLocaleString('de-DE',{maximumFractionDigits:3})+' km'],['DRIFT',number(p.drift_score).toLocaleString('de-DE')+' Pkt.'],['DRAG',number(p.drag_score)>0?(number(p.drag_score)/1000).toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+' s':'–']].forEach(([label,value])=>{const cell=element('div');cell.append(element('span','',label),element('strong','',value));scores.append(cell);});
   details.append(scores);row.append(rank,details);
   const preview=garage.contentWindow.createNeonCarPreview?.(p);
   if(preview)row.append(document.importNode(preview,true));
   list.append(row);
  });
 }
 async function loadBoard(){
  const id=++requestId;refresh.disabled=true;boardStatus.textContent='Spieler werden geladen …';list.replaceChildren();
  try{
   await ready();await flushSync();
   const all=[];let offset=0;
   // Range paging also works when the server caps responses below 1,000 rows.
   while(true){
    const {data,error}=await window.supabaseClient.from('players').select('user_id,username,highway_score,drift_score,drag_score,color,wheel,ride,brake_red,spoiler').order('user_id',{ascending:true}).range(offset,offset+499);
    if(error)throw error;if(id!==requestId)return;
    if(!data?.length)break;all.push(...data);offset+=data.length;
   }
   players=all;render();boardStatus.textContent=players.length?players.length+' Spieler · Drag: kleinere Zeit ist besser.':'Noch keine Spieler vorhanden.';
  }catch(error){if(id===requestId){players=[];list.replaceChildren();boardStatus.textContent='Die Bestenliste konnte nicht geladen werden. Bitte erneut aktualisieren.';}}
  finally{if(id===requestId)refresh.disabled=false;}
 }
 leaderboardButton.onclick=()=>{board.showModal();close.focus();loadBoard();};refresh.onclick=loadBoard;sort.onchange=render;
})();
