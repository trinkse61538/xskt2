const yearCache = new Map();
const recordCache = new Map();
let historyIndexCache;
let researchCache;

export const MIN_DATE = '2026-01-01';
export const MAX_DATE = '2050-12-31';
export const VN_MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export function pad(n){ return String(n).padStart(2,'0'); }
export function localISO(d=new Date()){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
export function todayISO(){ const t=localISO(); return t<MIN_DATE?MIN_DATE:t>MAX_DATE?MAX_DATE:t; }
export function fmtDate(s, year=true){ if(!s)return '—'; const [y,m,d]=s.split('-'); return year?`${d}/${m}/${y}`:`${d}/${m}`; }
export function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
export function addDays(s,n){ const d=parseISO(s); d.setDate(d.getDate()+n); return localISO(d); }
export function monthKey(s){ return s.slice(0,7); }
export function firstOfMonth(s){ return `${s.slice(0,7)}-01`; }
export function shiftMonth(s,delta){ const d=parseISO(firstOfMonth(s)); d.setMonth(d.getMonth()+delta); const r=localISO(d); return r<MIN_DATE?MIN_DATE:r>MAX_DATE?MAX_DATE:r; }
export function clampDate(s){ return !s?todayISO():s<MIN_DATE?MIN_DATE:s>MAX_DATE?MAX_DATE:s; }
export function monthLabel(s){ const d=parseISO(s); return `${VN_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
export function daysInMonth(s){ const d=parseISO(s); return new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); }
export function weekdayMon0(s){ const d=parseISO(s).getDay(); return (d+6)%7; }
export function pct(v,digits=1){ return Number.isFinite(v)?`${(v*100).toFixed(digits)}%`:'—'; }
export function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function money(v){ return `${Math.round(v).toLocaleString('vi-VN')}đ`; }

export async function loadYear(year){
  year=Number(year);
  if(year<2026||year>2050) return [];
  if(yearCache.has(year)) return yearCache.get(year);
  const promise=fetch(`./data/web/universal-${year}.json`,{cache:'no-cache'})
    .then(r=>{ if(!r.ok) throw new Error(`Không tải được dữ liệu Universal ${year}`); return r.json(); })
    .then(rows=>{ rows.forEach(x=>recordCache.set(x.date,x)); return rows; });
  yearCache.set(year,promise);
  return promise;
}

export async function loadRecord(date){
  date=clampDate(date);
  if(recordCache.has(date)) return recordCache.get(date);
  const rows=await loadYear(date.slice(0,4));
  const r=rows.find(x=>x.date===date);
  if(!r) throw new Error(`Không có Universal record cho ${date}`);
  recordCache.set(date,r); return r;
}

export async function loadRange(start,end){
  const ys=[]; for(let y=Number(start.slice(0,4));y<=Number(end.slice(0,4));y++) ys.push(y);
  const chunks=await Promise.all(ys.map(loadYear));
  return chunks.flat().filter(x=>x.date>=start&&x.date<=end).sort((a,b)=>a.date.localeCompare(b.date));
}

export async function loadMonth(date){
  const rows=await loadYear(date.slice(0,4)); const mk=monthKey(date);
  return rows.filter(x=>x.date.startsWith(mk));
}

export async function loadBestDays(start,count){
  start=clampDate(start); count=Number(count);
  let endMonth=shiftMonth(firstOfMonth(start),1);
  let end=`${endMonth.slice(0,7)}-${pad(daysInMonth(endMonth))}`;
  let rows=await loadRange(start,end);
  if(rows.length<count){ end=MAX_DATE; rows=await loadRange(start,end); }
  return rows.sort((a,b)=>b.universal.day_score-a.universal.day_score||b.universal.agreement-a.universal.agreement||a.date.localeCompare(b.date)).slice(0,count).sort((a,b)=>a.date.localeCompare(b.date));
}

async function jsonOrNull(path){ try{ const r=await fetch(path,{cache:'no-cache'}); return r.ok?await r.json():null; }catch{return null;} }
export async function loadHistoryIndex(){
  if(historyIndexCache!==undefined) return historyIndexCache;
  historyIndexCache=await jsonOrNull('./data/history/derived/history-index.json') || {updatedThrough:null,dates:{}};
  return historyIndexCache;
}
export async function loadResearch(){
  if(researchCache!==undefined) return researchCache;
  researchCache=await jsonOrNull('./data/history/derived/recent-stats.json') || {updatedThrough:null,baseline_two_picks_18:1-Math.pow(.98,18),stations:{}};
  return researchCache;
}
export function invalidateHistory(){ historyIndexCache=undefined; researchCache=undefined; }

export function historyDay(index,date){ return index?.dates?.[date]||null; }
export function dateList(index){ return Object.keys(index?.dates||{}).sort(); }
