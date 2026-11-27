import {initLookupDate} from './lookup-date-v382.js?v=3.9.4';
// Historical two-digit result lookup only. No prediction or betting calculations.
import {loadHistoryIndex,invalidateHistory,vnISO,fmtDate,esc,addDays} from './data.js';
import {stationsForDate} from './history.js';
export const FIRST_DATE='2005-10-01';
export function validDate(s,max='9999-12-31'){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||s<FIRST_DATE||s>max)return false;
  const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;
}
export function parseNumbers(input){
  const tokens=String(input??'').trim().split(/[\s,;]+/).filter(Boolean);
  if(!tokens.length)throw Error('Nhập ít nhất một số từ 00 đến 99.');
  if(tokens.some(t=>!/^\d{1,2}$/.test(t)))throw Error('Chỉ nhập số 00–99, cách nhau bằng dấu cách, dấu phẩy, chấm phẩy hoặc xuống dòng.');
  return [...new Set(tokens.map(t=>t.padStart(2,'0')))];
}
export const digitDiff=(a,b)=>Number(a[0]!==b[0])+Number(a[1]!==b[1]);
export function compareNumber(num,tails){
  const counts=new Map();for(const t of tails)counts.set(t,(counts.get(t)||0)+1);
  const hits=counts.get(num)||0;
  if(hits)return {num,hits,nearest:[],sameDigit:[]};
  const rows=[...counts].map(([tail,count])=>({tail,count,delta:Number(tail)-Number(num),digits:digitDiff(num,tail)}));
  rows.sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta)||Number(a.tail)-Number(b.tail));
  const min=Math.abs(rows[0]?.delta??Infinity);
  return {num,hits,nearest:rows.filter(r=>Math.abs(r.delta)===min),sameDigit:rows.filter(r=>r.digits===1)};
}
const validDraw=d=>Array.isArray(d?.tails)&&d.tails.length===18&&d.tails.every(t=>typeof t==='string'&&/^\d{2}$/.test(t));
export function compareDay(date,nums,draws=[],schedule=stationsForDate(date)){
  const observed=draws.map(d=>d.station).filter(s=>typeof s==='string'&&s.trim());
  // Pre-2026 historical schedule may differ; report only recorded stations.
  const names=[...new Set(date>='2026-01-01'?[...schedule,...observed]:observed.length?observed:schedule)];
  const stations=names.map(station=>{
    const found=draws.filter(d=>d.station===station);
    if(found.length!==1||!validDraw(found[0]))return {station,status:'missing',results:[],tails:[],hits:0};
    const tails=found[0].tails,results=nums.map(n=>compareNumber(n,tails));
    const hits=results.reduce((s,r)=>s+r.hits,0);
    return {station,status:hits?'win':'miss',results,tails,hits};
  });
  const available=stations.filter(s=>s.status!=='missing').length;
  return {stations,available,wins:stations.filter(s=>s.status==='win').length,misses:stations.filter(s=>s.status==='miss').length,hits:stations.reduce((s,r)=>s+r.hits,0),numbers:nums.map(num=>({num,hits:stations.reduce((s,r)=>s+(r.results.find(x=>x.num===num)?.hits||0),0)}))};
}
const signed=n=>n>0?`+${n}`:String(n);
const entry=r=>`${esc(r.tail)} (${signed(r.delta)}; sai ${r.digits} chữ số${r.count>1?`; ${r.count} nháy`:''})`;
function resultHTML(r){
  if(r.hits)return `<div class="lookup-row"><b class="lookup-num">${esc(r.num)}</b><div><strong class="lookup-win">TRÚNG · ${r.hits} nháy</strong></div></div>`;
  return `<div class="lookup-row"><b class="lookup-num">${esc(r.num)}</b><div><strong class="lookup-miss">KHÔNG TRÚNG</strong><small>Gần nhất về giá trị: ${r.nearest.map(entry).join(' · ')||'—'}</small>${r.sameDigit.length?`<details><summary>Khớp 1 chữ số (${r.sameDigit.length} số)</summary><small>${r.sameDigit.map(entry).join(' · ')}</small></details>`:'<small>Không có số khớp 1 chữ số đúng vị trí.</small>'}</div></div>`;
}
function renderResult(report,date,health){
  const known=report.available,all=report.stations.length,complete=known===all&&known>0&&date>='2026-01-01';
  const freshness=health.updatedThrough?`Dữ liệu đến ${fmtDate(health.updatedThrough)}.`:'Chưa xác định mốc dữ liệu.';
  return `<div class="helper lookup-fresh">${esc(fmtDate(date))} · ${esc(freshness)} ${date<'2026-01-01'?'Lịch sử cũ: chỉ hiển thị đài có bản ghi, không xác nhận đủ lịch đài.':complete?'Đủ dữ liệu các đài hiển thị.':'Chưa đủ dữ liệu; không tính đài thiếu là MISS.'}</div>
  <div class="lookup-kpis">${[['Đài trúng',report.wins],['Đài không trúng',report.misses],['Có dữ liệu',`${known}/${all}`],['Tổng nháy',known?report.hits:'—']].map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
  ${known?`<div class="card lookup-summary"><div class="card-head"><h3>Tổng hợp theo số</h3></div><div class="lookup-chips">${report.numbers.map(n=>`<span class="${n.hits?'lookup-win':'lookup-miss'}">${esc(n.num)} · ${n.hits?`${n.hits} nháy`:complete?'0 nháy':'0 nháy đã ghi nhận'}</span>`).join('')}</div></div>`:''}
  ${report.stations.map((s,i)=>`<section class="card lookup-station"><div class="card-head"><div><span>${date>='2026-01-01'?`ĐÀI ${i+1}`:'ĐÀI LỊCH SỬ'}</span><h3>${esc(s.station)}</h3></div><strong class="lookup-${s.status}">${s.status==='win'?`TRÚNG · ${s.hits} nháy`:s.status==='miss'?'KHÔNG TRÚNG':date>(health.expectedThrough||'')?'CHỜ KẾT QUẢ':'THIẾU DỮ LIỆU'}</strong></div>${s.status==='missing'?'<p class="helper">Chưa có đủ 18 kết quả hợp lệ. Không kết luận trúng hay không trúng.</p>':`${s.results.map(resultHTML).join('')}<details class="lookup-draw"><summary>Xem toàn bộ 18 số cuối</summary><div class="lookup-chips">${s.tails.map(t=>`<span class="${s.results.some(r=>r.num===t)?'lookup-win':''}">${esc(t)}</span>`).join('')}</div></details>`}</section>`).join('')}`;
}
export function initLookup(host){
  if(!host||host.dataset.ready)return;host.dataset.ready='1';
  const form=host.querySelector('form'),date=host.querySelector('#lookupDate'),input=host.querySelector('#lookupNumbers'),out=host.querySelector('#lookupResult');
  let seq=0;
  const setMax=()=>{date.max=vnISO()};setMax();date.value=date.max;
  const clear=()=>{seq++;out.innerHTML='<div class="empty-state">Nhấn Dò kết quả để kiểm tra lựa chọn mới.</div>'};
  form.addEventListener('input',clear);
  const nav=initLookupDate(date);
  host.querySelector('#lookupToday').onclick=()=>{setMax();nav.choose(date.max)};
  host.querySelector('#lookupYesterday').onclick=()=>{setMax();nav.choose(addDays(date.max,-1))};
  host.querySelector('#lookupClear').onclick=()=>{input.value='';clear();input.focus()};
  form.addEventListener('submit',async e=>{
    e.preventDefault();setMax();const token=++seq,ds=date.value;let nums;
    try{if(!validDate(ds,date.max))throw Error('Ngày không hợp lệ hoặc nằm trong tương lai.');nums=parseNumbers(input.value)}catch(err){out.innerHTML=`<div class="error-card">${esc(err.message)}</div>`;return;}
    out.innerHTML='<div class="skeleton-card">Đang tải kết quả đã lưu…</div>';
    try{invalidateHistory();const hist=await loadHistoryIndex(ds,ds);if(token!==seq)return;
      const draws=hist.dates?.[ds]?.draws;const report=compareDay(ds,nums,Array.isArray(draws)?draws:[]);
      out.innerHTML=renderResult(report,ds,hist);
    }catch(err){if(token===seq)out.innerHTML=`<div class="error-card"><b>Không tải được dữ liệu</b><span>${esc(err.message||'Vui lòng thử lại.')}</span><span>Không kết luận MISS khi chưa tải được dữ liệu.</span></div>`;}
  });
}
