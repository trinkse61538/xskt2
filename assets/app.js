import {todayISO,addDays,clampDate,firstOfMonth,shiftMonth,parseISO,localISO,MIN_DATE,MAX_DATE} from './data.js';
import {readProfile,saveProfile,clearProfile} from './personal.js';
import {renderToday,renderBest,renderGuide,renderStats,renderCalendar,renderCompare,renderAll,renderProfile,renderMethod,renderAbout} from './screens.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const initial=todayISO(),d=parseISO(initial);
const state={
  screen:'today',mode:localStorage.getItem('xskt2.mode')||'universal',date:initial,
  bestStart:initial,bestCount:7,guideStart:initial,guideDays:4,guideStake:75000,
  statsWindow:'30',statsScope:'station1',statsFilter:'ALL',
  calendarMonth:firstOfMonth(initial),compareStation:null,compareWindow:30,
  allYear:d.getFullYear(),allMonth:d.getMonth()+1,allTier:'ALL',allSearch:'',moreSub:null
};
const titles={today:'Hôm nay',best:'Ngày tốt',guide:'Hướng dẫn',stats:'Thống kê',more:'Thêm'};
let deferredInstall=null,renderToken=0;
const ctx={state,$,navigate:setScreen,openMore,toast};

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function syncNav(){
  $$('.screen').forEach(x=>x.classList.toggle('active',x.id===`screen-${state.screen}`));
  $$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.screen===state.screen));
  $('#screenTitle').textContent=titles[state.screen]||'XSKT2';
}
async function setScreen(name){state.screen=name;state.moreSub=null;syncNav();await renderActive();window.scrollTo({top:0,behavior:'instant'});}
function showMoreMenu(){state.moreSub=null;$('#moreMenu').hidden=false;$$('.subscreen').forEach(x=>x.classList.remove('active'));$('#screenTitle').textContent='Thêm';}
async function openMore(name){state.screen='more';state.moreSub=name;syncNav();$('#moreMenu').hidden=true;$$('.subscreen').forEach(x=>x.classList.toggle('active',x.id===`more-${name}`));$('#screenTitle').textContent={profile:'Hồ sơ Personal',calendar:'Lịch tháng',compare:'Đối chiếu đài',all:'Tất cả ngày',method:'Phương pháp',about:'Phiên bản'}[name]||'Thêm';await renderMore(name);window.scrollTo({top:0,behavior:'instant'});}
async function renderMore(name){if(name==='profile')return renderProfile(ctx);if(name==='calendar')return renderCalendar(ctx);if(name==='compare')return renderCompare(ctx);if(name==='all')return renderAll(ctx);if(name==='method')return renderMethod(ctx);if(name==='about')return renderAbout(ctx);}
async function renderActive(){const token=++renderToken;try{if(state.screen==='today')await renderToday(ctx);else if(state.screen==='best')await renderBest(ctx);else if(state.screen==='guide')await renderGuide(ctx);else if(state.screen==='stats')await renderStats(ctx);else if(state.screen==='more'){if(state.moreSub)await renderMore(state.moreSub);else showMoreMenu();}}catch(e){console.error(e);toast(e.message||'Có lỗi khi render');}if(token!==renderToken)return;syncControls();}
function syncControls(){
  $('#datePick').value=state.date;$('#bestStart').value=state.bestStart;$('#guideStake').value=state.guideStake;
  $$('#bestCount button').forEach(b=>b.classList.toggle('active',Number(b.dataset.count)===state.bestCount));
  $$('#guideDayCount button').forEach(b=>b.classList.toggle('active',Number(b.dataset.days)===state.guideDays));
  $$('#statsWindow button').forEach(b=>b.classList.toggle('active',b.dataset.window===String(state.statsWindow)));
  $$('#statsScope button').forEach(b=>b.classList.toggle('active',b.dataset.scope===state.statsScope));
  $$('#statsFilter button').forEach(b=>b.classList.toggle('active',b.dataset.filter===state.statsFilter));
  $$('#compareWindow button').forEach(b=>b.classList.toggle('active',Number(b.dataset.window)===Number(state.compareWindow)));
  $$('#allTier button').forEach(b=>b.classList.toggle('active',b.dataset.tier===state.allTier));
  $('#allYear').value=String(state.allYear);$('#allMonth').value=String(state.allMonth);
}
function setDate(next){state.date=clampDate(next);$('#datePick').value=state.date;state.calendarMonth=firstOfMonth(state.date);if(state.bestStart.slice(0,7)!==state.date.slice(0,7))state.bestStart=state.date;renderActive();}

function initSelects(){
  $('#allYear').innerHTML=Array.from({length:25},(_,i)=>2026+i).map(y=>`<option value="${y}">${y}</option>`).join('');
  $('#allMonth').innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}">Tháng ${i+1}</option>`).join('');
}

// Main navigation and delegated actions
document.addEventListener('click',async e=>{
  const screen=e.target.closest('[data-screen]');if(screen){await setScreen(screen.dataset.screen);return;}
  const more=e.target.closest('[data-more]');if(more){await openMore(more.dataset.more);return;}
  if(e.target.closest('.back-more')){showMoreMenu();return;}
  const action=e.target.closest('[data-action]');if(action){
    const a=action.dataset.action;
    if(a==='mode'){state.mode=action.dataset.mode;if(state.mode==='personal'&&!readProfile()){toast('Tạo hồ sơ Personal trước');await openMore('profile');return;}localStorage.setItem('xskt2.mode',state.mode);await renderActive();return;}
    if(a==='open-date'){state.date=clampDate(action.dataset.date);state.calendarMonth=firstOfMonth(state.date);await setScreen('today');return;}
    if(a==='open-more'){await openMore(action.dataset.more);return;}
    if(a==='station'){state.compareStation=action.dataset.station;await renderCompare(ctx);syncControls();return;}
  }
  const bc=e.target.closest('#bestCount [data-count]');if(bc){state.bestCount=Number(bc.dataset.count);await renderBest(ctx);syncControls();return;}
  const gd=e.target.closest('#guideDayCount [data-days]');if(gd){state.guideDays=Number(gd.dataset.days);await renderGuide(ctx);syncControls();return;}
  const sw=e.target.closest('#statsWindow [data-window]');if(sw){state.statsWindow=sw.dataset.window;await renderStats(ctx);syncControls();return;}
  const ss=e.target.closest('#statsScope [data-scope]');if(ss){state.statsScope=ss.dataset.scope;await renderStats(ctx);syncControls();return;}
  const sf=e.target.closest('#statsFilter [data-filter]');if(sf){state.statsFilter=sf.dataset.filter;await renderStats(ctx);syncControls();return;}
  const cw=e.target.closest('#compareWindow [data-window]');if(cw){state.compareWindow=Number(cw.dataset.window);await renderCompare(ctx);syncControls();return;}
  const at=e.target.closest('#allTier [data-tier]');if(at){state.allTier=at.dataset.tier;await renderAll(ctx);syncControls();return;}
});

$('#datePick').addEventListener('change',e=>setDate(e.target.value));
$('#datePrev').onclick=()=>setDate(addDays(state.date,-1));$('#dateNext').onclick=()=>setDate(addDays(state.date,1));$('#todayJump').onclick=()=>setDate(todayISO());
$('#bestStart').addEventListener('change',async e=>{state.bestStart=clampDate(e.target.value);await renderBest(ctx);syncControls();});
$('#bestPrevMonth').onclick=async()=>{state.bestStart=shiftMonth(firstOfMonth(state.bestStart),-1);await renderBest(ctx);syncControls();};
$('#bestNextMonth').onclick=async()=>{state.bestStart=shiftMonth(firstOfMonth(state.bestStart),1);await renderBest(ctx);syncControls();};
$('#guideStake').addEventListener('change',async e=>{state.guideStake=Math.max(15000,Number(e.target.value)||15000);await renderGuide(ctx);syncControls();});
$('#guidePrevMonth').onclick=async()=>{state.guideStart=shiftMonth(firstOfMonth(state.guideStart),-1);await renderGuide(ctx);syncControls();};
$('#guideNextMonth').onclick=async()=>{state.guideStart=shiftMonth(firstOfMonth(state.guideStart),1);await renderGuide(ctx);syncControls();};
$('#calPrev').onclick=async()=>{state.calendarMonth=shiftMonth(state.calendarMonth,-1);await renderCalendar(ctx);};
$('#calNext').onclick=async()=>{state.calendarMonth=shiftMonth(state.calendarMonth,1);await renderCalendar(ctx);};
$('#allYear').addEventListener('change',async e=>{state.allYear=Number(e.target.value);await renderAll(ctx);});
$('#allMonth').addEventListener('change',async e=>{state.allMonth=Number(e.target.value);await renderAll(ctx);});
$('#allSearch').addEventListener('input',e=>{state.allSearch=e.target.value;clearTimeout(e.target._t);e.target._t=setTimeout(()=>renderAll(ctx),180)});
$('#saveProfile').onclick=async()=>{const birthDate=$('#birthDate').value;if(!birthDate){toast('Nhập ngày sinh trước');return;}saveProfile({label:$('#profileLabel').value.trim()||'Profile của tôi',birthDate,birthTime:$('#birthTime').value||'12:00',birthPlace:$('#birthPlace').value.trim(),timezone:'Asia/Ho_Chi_Minh'});toast('Đã lưu hồ sơ Personal');renderProfile(ctx);if(state.mode==='personal')await renderActive();};
$('#clearProfile').onclick=()=>{clearProfile();state.mode='universal';localStorage.setItem('xskt2.mode','universal');renderProfile(ctx);toast('Đã xóa hồ sơ trên thiết bị');};

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installBtn').hidden=true};
window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;toast('Đã cài XSKT2')});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));

initSelects();syncNav();syncControls();renderActive();
