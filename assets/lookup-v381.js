// Historical ticket checking only: no prediction, payment or betting integration.
import {initLookup,validDate} from './lookup-v38.js?v=3.8.1';
import {loadHistoryIndex,invalidateHistory,vnISO,fmtDate,esc,addDays} from './data.js';
import {stationsForDate} from './history.js';
export const TICKET_FIRST='2017-01-01';
export const PRIZES=[['giai_db','Giải đặc biệt',1,6],['giai_1','Giải nhất',1,5],['giai_2','Giải nhì',1,5],['giai_3','Giải ba',2,5],['giai_4','Giải tư',7,5],['giai_5','Giải năm',1,4],['giai_6','Giải sáu',3,4],['giai_7','Giải bảy',1,3],['giai_8','Giải tám',1,2]];
const PLACES=['trăm nghìn','chục nghìn','nghìn','trăm','chục','đơn vị'];
const NAME=Object.fromEntries(PRIZES.map(([k,n])=>[k,n]));
export function parseTickets(input){
 const parts=String(input??'').trim().split(/[\s,;]+/).filter(Boolean);
 if(!parts.length||parts.some(x=>!/^\d{6}$/.test(x)))throw Error('Mỗi vé phải đúng 6 chữ số, kể cả số 0 đầu; ngăn cách bằng dấu cách, dấu phẩy, chấm phẩy hoặc xuống dòng.');
 if(parts.length>50)throw Error('Tối đa 50 số vé mỗi lượt.');
 return [...new Set(parts)];
}
export function mismatch(a,b){if(a.length!==b.length)throw Error('Khác độ dài');return [...a].flatMap((v,i)=>v===b[i]?[]:[{index:6-a.length+i,place:PLACES[6-a.length+i],actual:v,result:b[i]}]);}
export function validateFull(draw,derived,date){
 if(!draw||draw.date!==date||draw.station!==derived?.station||draw.result_count!==18||!Array.isArray(draw.results)||draw.results.length!==18||!Array.isArray(draw.tails)||draw.tails.length!==18||!Array.isArray(derived.tails)||derived.tails.length!==18)return false;
 for(const [key,,n,len] of PRIZES){const rows=draw.results.filter(p=>p.prize===key);if(rows.length!==n||rows.some(p=>typeof p.value!=='string'||!new RegExp(`^\\d{${len}}$`).test(p.value)||p.tail!==p.value.slice(-2)))return false;}
 return draw.results.every((p,i)=>p.tail===draw.tails[i]&&p.tail===derived.tails[i]);
}
export function compareTicket(ticket,results){
 const rows=PRIZES.flatMap(([key,label])=>results.filter(p=>p.prize===key).map((p,i)=>{const part=ticket.slice(-p.value.length);const differences=mismatch(part,p.value);return {key,label,index:i+1,value:p.value,part,differences,wrong:differences.length,delta:Number(p.value)-Number(part)};}));
 const db=rows.find(r=>r.key==='giai_db');
 const awards=rows.filter(r=>r.wrong===0).map(r=>({...r,kind:r.key}));
 if(db?.wrong===1){const first=db.differences[0].index===0;awards.push({...db,kind:first?'phu_db':'khuyen_khich',label:first?'Giải phụ đặc biệt':'Giải khuyến khích (an ủi)'});}
 const nonmatches=rows.filter(r=>r.wrong>0);const closest=nonmatches.length?Math.min(...nonmatches.map(r=>r.wrong)):null;
 return {ticket,awards,db,rows,closest:nonmatches.filter(r=>r.wrong===closest)};
}
export function compareTicketDay(date,tickets,derived=[],raw=[]){
 const observed=[...new Set(derived.map(d=>d.station))];const names=date>='2026-01-01'?[...new Set([...stationsForDate(date),...observed])]:observed.length?observed:stationsForDate(date);
 const stations=names.map(station=>{const d=derived.filter(r=>r.station===station),r=raw.filter(r=>r.station===station);if(d.length!==1||r.length!==1||!validateFull(r[0],d[0],date))return {station,status:'missing',tickets:[],results:[]};const checked=tickets.map(t=>compareTicket(t,r[0].results));return {station,status:checked.some(t=>t.awards.length)?'win':'miss',tickets:checked,results:r[0].results};});
 return {stations,available:stations.filter(s=>s.status!=='missing').length,wins:stations.filter(s=>s.status==='win').length,misses:stations.filter(s=>s.status==='miss').length,matchedTickets:tickets.filter(t=>stations.some(s=>s.tickets.some(x=>x.ticket===t&&x.awards.length))).length};
}
async function read(path,optional=false){const r=await fetch(path,{cache:'no-cache'});if(optional&&r.status===404)return null;if(!r.ok)throw Error(`Không tải được kết quả gốc (${r.status}).`);const bytes=await r.arrayBuffer();return {bytes,obj:JSON.parse(new TextDecoder().decode(bytes))};}
async function sha256(bytes){if(!globalThis.crypto?.subtle)return null;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function loadFullDay(date,hist){
 const derived=hist.dates?.[date]?.draws;if(!Array.isArray(derived)||!derived.length)return [];
 const raw=await read(`./data/history/raw/${date}.json?rev=${encodeURIComponent(hist.revision||'')}`);if(raw.obj.date!==date||!Array.isArray(raw.obj.draws))throw Error('Ngày trong dữ liệu gốc không khớp.');
 const complete=draws=>derived.every(d=>draws.filter(r=>r.station===d.station&&validateFull(r,d,date)).length===1);
 if(complete(raw.obj.draws))return raw.obj.draws;
 // Older five-digit DB records require an accepted sidecar; never infer a missing digit.
 if(date<'2026-01-01'){
  const side=await read(`./data/history/verified/${date}.json?rev=${encodeURIComponent(hist.revision||'')}`,true);
  if(side){const s=side.obj;const digest=await sha256(raw.bytes);const hosts=new Set((s.sources||[]).map(x=>{try{return new URL(x.url).hostname}catch{return ''}}));if(digest&&digest===s.rawSha256&&hosts.size===2&&hosts.has('xoso.com.vn')&&hosts.has('www.minhngoc.net.vn')&&s.day?.date===date&&Array.isArray(s.day.draws)&&complete(s.day.draws))return s.day.draws;}
 }
 return raw.obj.draws;
}
const signed=n=>n>0?`+${n}`:String(n);
const diffs=r=>r.wrong?`Sai ${r.wrong}/${r.value.length} chữ số: ${r.differences.map(d=>`hàng ${esc(d.place)} (${esc(d.actual)} → ${esc(d.result)})`).join(', ')}`:`Khớp ${r.value.length}/${r.value.length} chữ số`;
const digitHTML=(part,value)=>`<span class="ticket-digits" aria-label="Số vé đối chiếu ${esc(part)}"><span>${[...part].map((d,i)=>`<b class="${d===value[i]?'ticket-equal':'ticket-different'}">${esc(d)}</b>`).join('')}</span><span>${[...value].map(d=>`<b>${esc(d)}</b>`).join('')}</span></span>`;
function rowHTML(r){return `<div class="ticket-prize-row"><div><b>${esc(r.label)}${r.index>1?' · #'+r.index:''}</b><small>${diffs(r)} · Δ ${signed(r.delta)}</small></div>${digitHTML(r.part,r.value)}</div>`;}
function ticketHTML(t){return `<article class="ticket-item"><div class="ticket-head"><b>${esc(t.ticket)}</b><strong class="${t.awards.length?'lookup-win':'lookup-miss'}">${t.awards.length?'KHỚP GIẢI':'KHÔNG TRÚNG'}</strong></div>${t.awards.length?`<div class="ticket-awards">${t.awards.map(rowHTML).join('')}</div>`:''}<div class="ticket-label">Đối chiếu giải đặc biệt</div>${rowHTML(t.db)}${!t.awards.length?`<div class="ticket-label">Các kết quả sai ít chữ số nhất (${t.closest.length})</div>${t.closest.map(rowHTML).join('')}`:''}<details><summary>Xem đủ 18 kết quả và chữ số sai</summary>${t.rows.map(rowHTML).join('')}</details></article>`;}
function render(report,date,hist){const full=report.available===report.stations.length&&report.available>0&&date>='2026-01-01';return `<p class="helper">${esc(fmtDate(date))} · Kho dữ liệu đến ${esc(fmtDate(hist.updatedThrough))}. ${full?'Đủ dữ liệu các đài theo lịch.':date<'2026-01-01'?'Lịch sử: chỉ đánh giá đài có bản ghi hợp lệ; không xác nhận đủ lịch đài.':'Chưa đủ dữ liệu; không tính đài thiếu là không trúng.'}</p><div class="lookup-kpis">${[['Đài khớp giải',report.wins],['Đài không trúng',report.misses],['Có dữ liệu',`${report.available}/${report.stations.length}`],['Số vé khớp',report.available?report.matchedTickets:'—']].map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>${report.stations.map(s=>`<section class="card lookup-station"><div class="card-head"><h3>${esc(s.station)}</h3><strong class="lookup-${s.status}">${s.status==='win'?'CÓ SỐ KHỚP GIẢI':s.status==='miss'?'KHÔNG TRÚNG':date>(hist.expectedThrough||'')?'CHỜ KẾT QUẢ':'THIẾU DỮ LIỆU GỐC'}</strong></div>${s.status==='missing'?'<p class="helper">Không đủ kết quả gốc đúng định dạng và khớp kho lịch sử. Không kết luận MISS.</p>':`${s.tickets.map(ticketHTML).join('')}<details class="lookup-draw"><summary>Bảng kết quả gốc</summary>${PRIZES.map(([k,label])=>`<div class="ticket-prize-row"><b>${label}</b><span>${s.results.filter(p=>p.prize===k).map(p=>esc(p.value)).join(' · ')}</span></div>`).join('')}</details>`}</section>`).join('')}`;}
export function initLookupV381(host){
 if(!host||host.dataset.fullReady)return;host.dataset.fullReady='1';const tail=host.querySelector('#lookupTailPanel'),panel=host.querySelector('#lookupTicketPanel'),modes=host.querySelectorAll('[data-lookup-mode]');
 modes.forEach(b=>b.onclick=()=>{const isTicket=b.dataset.lookupMode==='ticket';tail.hidden=isTicket;panel.hidden=!isTicket;modes.forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});if(!isTicket)initLookup(tail);});
 const form=panel.querySelector('form'),date=panel.querySelector('#ticketDate'),input=panel.querySelector('#ticketNumbers'),out=panel.querySelector('#ticketResult');let seq=0;
 const setMax=()=>{date.max=vnISO()};setMax();date.value=date.max;
 const clear=()=>{seq++;out.innerHTML='<div class="empty-state">Nhấn Dò vé để kiểm tra lựa chọn mới.</div>'};form.addEventListener('input',clear);
 panel.querySelector('#ticketToday').onclick=()=>{setMax();date.value=date.max;clear()};panel.querySelector('#ticketYesterday').onclick=()=>{setMax();date.value=addDays(date.max,-1);clear()};panel.querySelector('#ticketClear').onclick=()=>{input.value='';clear();input.focus()};
 form.addEventListener('submit',async e=>{e.preventDefault();setMax();const token=++seq,ds=date.value;let tickets;try{if(!validDate(ds,date.max)||ds<TICKET_FIRST)throw Error('Chọn ngày từ 01/01/2017 đến hôm nay.');tickets=parseTickets(input.value);}catch(err){out.innerHTML=`<div class="error-card">${esc(err.message)}</div>`;return;}
 out.innerHTML='<div class="skeleton-card">Đang tải kết quả gốc…</div>';try{invalidateHistory();const hist=await loadHistoryIndex(ds,ds);const raw=await loadFullDay(ds,hist);if(token!==seq)return;out.innerHTML=render(compareTicketDay(ds,tickets,hist.dates?.[ds]?.draws||[],raw),ds,hist);}catch(err){if(token===seq)out.innerHTML=`<div class="error-card"><b>Chưa thể dò vé</b><span>${esc(err.message||'Vui lòng thử lại.')}</span><span>Không kết luận không trúng nếu dữ liệu chưa đầy đủ.</span></div>`;}});
}
