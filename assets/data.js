const yearCache=new Map(),recordCache=new Map(),historyCache=new Map(),stationCache=new Map();
let healthPromise;
export const MIN_DATE='2008-01-01',MAX_DATE='2050-12-31';
export const VN_MONTHS=Array.from({length:12},(_,i)=>`Tháng ${i+1}`);
export const pad=n=>String(n).padStart(2,'0');
export function localISO(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
export function vnISO(d=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const get=t=>p.find(x=>x.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`}
export function todayISO(){return clampDate(vnISO())}
export function completedISO(d=new Date()){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);const get=t=>Number(p.find(x=>x.type===t).value);return get('hour')*60+get('minute')>=17*60+10?vnISO(d):addDays(vnISO(d),-1)}
export function fmtDate(s,year=true){if(!s)return '—';const [y,m,d]=s.split('-');return year?`${d}/${m}/${y}`:`${d}/${m}`}
export function parseISO(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
export function addDays(s,n){const d=parseISO(s);d.setDate(d.getDate()+n);return localISO(d)}
export const monthKey=s=>s.slice(0,7),firstOfMonth=s=>`${s.slice(0,7)}-01`;
export function shiftMonth(s,n){const d=parseISO(firstOfMonth(s));d.setMonth(d.getMonth()+n);return clampDate(localISO(d))}
export function clampDate(s){return !s?vnISO():s<MIN_DATE?MIN_DATE:s>MAX_DATE?MAX_DATE:s}
export function monthLabel(s){const d=parseISO(s);return `${VN_MONTHS[d.getMonth()]} ${d.getFullYear()}`}
export function daysInMonth(s){const d=parseISO(s);return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}
export const weekdayMon0=s=>(parseISO(s).getDay()+6)%7;
export const pct=(v,d=1)=>Number.isFinite(v)?`${(v*100).toFixed(d)}%`:'—';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=v=>`${Math.round(v).toLocaleString('vi-VN')}đ`;
async function json(path){const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error(`Không tải được ${path} (${r.status})`);return r.json()}
function cached(map,key,fn){if(!map.has(key)){const p=Promise.resolve().then(fn).catch(e=>{map.delete(key);throw e});map.set(key,p)}return map.get(key)}
export function loadYear(y){y=Number(y);if(!Number.isInteger(y)||y<Number(MIN_DATE.slice(0,4))||y>Number(MAX_DATE.slice(0,4)))return Promise.resolve([]);return cached(yearCache,y,async()=>{const rows=await json(`./data/web/universal-${y}.json`);rows.forEach(r=>recordCache.set(r.date,r));return rows})}
export async function loadRecord(d){d=clampDate(d);if(!recordCache.has(d))await loadYear(d.slice(0,4));if(!recordCache.has(d))throw Error(`Không có Universal record ${d}`);return recordCache.get(d)}
export async function loadRange(start,end){const ys=[];for(let y=+start.slice(0,4);y<=+end.slice(0,4);y++)ys.push(y);return (await Promise.all(ys.map(loadYear))).flat().filter(r=>r.date>=start&&r.date<=end).sort((a,b)=>a.date.localeCompare(b.date))}
export async function loadMonth(d){return (await loadYear(d.slice(0,4))).filter(r=>r.date.startsWith(monthKey(d)))}
export async function loadBestDays(start,count){start=clampDate(start);let endMonth=shiftMonth(firstOfMonth(start),1),end=`${monthKey(endMonth)}-${pad(daysInMonth(endMonth))}`;let rows=await loadRange(start,end);while(rows.length<count&&end<MAX_DATE){endMonth=shiftMonth(firstOfMonth(end),1);const next=`${monthKey(endMonth)}-${pad(daysInMonth(endMonth))}`;if(next<=end)break;rows.push(...await loadRange(addDays(end,1),next));end=next}return rows.sort((a,b)=>b.universal.day_score-a.universal.day_score||b.universal.agreement-a.universal.agreement||a.date.localeCompare(b.date)).slice(0,count).sort((a,b)=>a.date.localeCompare(b.date))}
export function loadHealth(){if(!healthPromise)healthPromise=json('./data/history/derived/health.json').catch(e=>{healthPromise=undefined;throw e});return healthPromise}
async function shard(path,rev){const o=await json(`${path}?rev=${encodeURIComponent(rev)}`);if(o.revision!==rev)throw Error('Dữ liệu đang đồng bộ, vui lòng tải lại.');return o}
export async function loadHistoryIndex(start=todayISO(),end=start){const h=await loadHealth();const ys=h.years.filter(y=>+y>=+start.slice(0,4)&&+y<=+end.slice(0,4));const chunks=await Promise.all(ys.map(y=>cached(historyCache,`${h.revision}:${y}`,()=>shard(`./data/history/derived/years/${y}.json`,h.revision))));return {...h,dates:Object.assign({},...chunks.map(x=>x.dates))}}
export async function loadResearch(date=todayISO(),names=[]){const h=await loadHealth();const entries=await Promise.all(names.filter(n=>h.stationFiles[n]).map(async n=>{const key=h.stationFiles[n];const o=await cached(stationCache,`${h.revision}:${key}`,()=>shard(`./data/history/derived/stations/${key}.json`,h.revision));return [n,{recent:o.draws.filter(r=>r.date<date).slice(-300)}]}));return {...h,asOf:date,stations:Object.fromEntries(entries)}}
export function invalidateHistory(){healthPromise=undefined;historyCache.clear();stationCache.clear()}
export const historyDay=(idx,d)=>idx?.dates?.[d]||null;
export const dateList=idx=>Object.keys(idx?.dates||{}).sort();
export const loadBacktest=()=>json('./data/backtest/backtest-summary.json');
