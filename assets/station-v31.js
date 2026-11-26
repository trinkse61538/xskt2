// V3.1: descriptive station-level results. No changes to prediction engines.
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(v)?`${(v*100).toFixed(1)}%`:'—';
const validDraw=d=>Array.isArray(d?.tails)&&d.tails.length===18&&d.tails.every(t=>typeof t==='string'&&/^\d{2}$/.test(t));
const uniq=a=>[...new Set(a)];
export const FOLLOW_KEY='xskt2.stationFollow.v31';
export const STATS_KEY='xskt2.statsScope.v31';
export function readChoice(key,fallback){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
export function saveChoice(key,value){try{localStorage.setItem(key,value)}catch{}}
export function stationNames(schedule,draws=[]){return uniq([...schedule,...draws.map(d=>d.station).filter(Boolean)])}
export function scoreStation(picks,draws){
  const nums=uniq(picks||[]),tails=draws.flatMap(d=>d.tails),counts=Object.fromEntries(nums.map(n=>[n,tails.filter(t=>t===n).length]));
  const hitNumbers=nums.filter(n=>counts[n]>0),totalNhay=hitNumbers.reduce((a,n)=>a+counts[n],0);
  return {win:totalNhay>0,counts,hitNumbers,totalNhay,trials:tails.length};
}
export function stationResults(picks,names,draws){
  return names.map(station=>{const found=draws.filter(d=>d.station===station);return {station,result:found.length===1&&validDraw(found[0])?scoreStation(picks,found):null}});
}
export function scopedDraws(draws,scope,schedule=[]){
  const valid=draws.filter(validDraw);
  if(scope==='station1') {const found=draws.filter(d=>d.station===schedule[0]);return found.length===1&&validDraw(found[0])?found:[]}
  if(scope.startsWith('station:')){const found=draws.filter(d=>d.station===scope.slice(8));return found.length===1&&validDraw(found[0])?found:[];}
  // No partial-day aggregate: missing stations must not count as misses.
  if(scope==='any'||scope==='all')return schedule.length&&schedule.every(n=>valid.filter(d=>d.station===n).length===1)&&draws.length===schedule.length&&valid.length===schedule.length?valid:[];
  return [];
}
export function describeHits(result){return result?Object.entries(result.counts).map(([n,v])=>`${n} × ${v}`).join(' · '):'Chưa có dữ liệu hợp lệ'}
export function recentSummary(rows,date,picks,w){
  const eligible=rows.filter(d=>d.date<date&&validDraw(d)).sort((a,b)=>a.date.localeCompare(b.date));
  const counts=new Map();for(const d of eligible)counts.set(d.date,(counts.get(d.date)||0)+1);
  const sample=eligible.filter(d=>counts.get(d.date)===1).slice(-w);
  if(sample.length<w)return {n:sample.length,rate:null,hits:null,latest:sample.at(-1)?.date||null};
  const hits=sample.filter(d=>scoreStation(picks,[d]).win).length;
  return {n:sample.length,rate:hits/sample.length,hits,latest:sample.at(-1)?.date||null};
}
export function renderStationPanel(host,{date,schedule,draws,models,active,historyUnavailable,expectedThrough,loadResearch,fmtDate,enrichResearch}){
  if(!host)return;
  const names=stationNames(schedule,draws),preferred=readChoice(FOLLOW_KEY,'all');
  let scope=names.includes(preferred)?preferred:'all';
  const activeModel=models.find(m=>m.id===active)||models[0];
  const stateLabel=historyUnavailable?'Không tải được dữ liệu':date<= (expectedThrough||'')?'Thiếu dữ liệu':'Chưa có kết quả';
  host.innerHTML=`<section class="card station31"><div class="card-head"><div><span>KẾT QUẢ THEO ĐÀI · ${safe(fmtDate(date))}</span><h3>Phạm vi theo dõi</h3></div></div><label class="station31-label">Đài theo dõi<select data-s31-scope><option value="all">Tất cả đài</option>${names.map(n=>`<option value="${safe(n)}">${safe(n)}</option>`).join('')}</select></label><p class="helper" data-s31-scope-note></p><div data-s31-results></div><p class="helper">WIN = ít nhất một trong hai số xuất hiện trong phạm vi đã chọn; không phải lợi nhuận. Chưa có dữ liệu không tính MISS.</p></section><section class="card station31"><div class="card-head"><div><span>STATION RESEARCH · MÔ TẢ</span><h3>Thống kê lịch sử từng đài</h3></div></div><p class="helper">${safe(activeModel.label)} · chỉ dùng kỳ trước ${safe(fmtDate(date))}. Tỷ lệ lịch sử không phải xác suất kỳ tới; không xếp hạng đài để đặt cược.</p><div data-s31-research aria-live="polite">Đang tải lịch sử theo đài…</div><button type="button" class="station31-link" data-action="open-more" data-more="compare">Mở đối chiếu chi tiết →</button></section>`;
  const select=host.querySelector('[data-s31-scope]'),out=host.querySelector('[data-s31-results]'),note=host.querySelector('[data-s31-scope-note]');
  select.value=scope;
  function paint(){
    const selected=scope==='all'?names:[scope];
    note.textContent=scope==='all'?`Đối chiếu tất cả ${names.length} đài theo lịch (${names.length*18} kết quả nếu đầy đủ).`:`Chỉ đối chiếu ${scope} (18 kết quả nếu đầy đủ).`;
    out.innerHTML=models.map(m=>{
      const rows=stationResults(m.picks,names,draws),focus=rows.filter(x=>selected.includes(x.station)),complete=focus.length>0&&focus.every(x=>x.result),present=focus.filter(x=>x.result),hits=present.filter(x=>x.result.win).length,nhay=present.reduce((n,x)=>n+x.result.totalNhay,0);
      const status=complete?(hits?'WIN':'MISS'):(present.length?'CHƯA ĐỦ DỮ LIỆU':stateLabel);
      return `<div class="station31-model"><div class="station31-summary"><b>${safe(m.label)} · ${safe(scope==='all'?'Tất cả đài':scope)}</b><strong class="${complete?(hits?'s31-win':'s31-miss'):'s31-pending'}">${safe(status)}</strong></div><p class="helper">${present.length?`${hits}/${selected.length} đài có số xuất hiện · ${nhay} nháy${complete?'':' (chưa đầy đủ)'}`:safe(stateLabel)}</p><div class="station31-rows">${rows.map(x=>`<div class="station31-row ${selected.includes(x.station)?'s31-selected':''}"><div><b>${safe(x.station)}</b><small>${safe(describeHits(x.result))}</small></div><strong class="${x.result?(x.result.win?'s31-win':'s31-miss'):'s31-pending'}">${x.result?(x.result.win?'WIN':'MISS'):'—'}</strong></div>`).join('')}</div></div>`;
    }).join('');
  }
  select.onchange=()=>{scope=names.includes(select.value)?select.value:'all';saveChoice(FOLLOW_KEY,scope);paint()};paint();
  const researchHost=host.querySelector('[data-s31-research]');
  Promise.resolve().then(()=>loadResearch(date,names)).then(r=>{
    if(!researchHost.isConnected)return;
    if(enrichResearch)enrichResearch(r);
    researchHost.innerHTML=`<div class="station31-tablewrap"><table class="station31-table"><thead><tr><th>Đài</th><th>10 kỳ</th><th>30 kỳ</th><th>100 kỳ</th><th>Phân bố 00–99</th></tr></thead><tbody>${names.map(n=>{const rows=r.stations?.[n]?.recent||[];return `<tr><th>${safe(n)}</th>${[10,30,100].map(w=>{const x=recentSummary(rows,date,activeModel.picks,w);return `<td>${pct(x.rate)}<small>${x.hits===null?`${x.n}/${w} kỳ`:`${x.hits}/${x.n} kỳ`}</small></td>`}).join('')}<td>${Number.isFinite(r.stations?.[n]?.anomaly?.station?.q)?`q=${r.stations[n].anomaly.station.q.toFixed(3)}`:'—'}</td></tr>`}).join('')}</tbody></table></div><p class="helper">Tỷ lệ kỳ có ít nhất một số xuất hiện; mốc dữ liệu ${safe(fmtDate(r.updatedThrough))}. Thiếu mẫu hiển thị —. q là chỉ số FDR mô tả phân bố 00–99 trong 300 kỳ, hiệu chỉnh trong nhóm đài đang tải; không phải xác suất trúng hay bằng chứng sai lệch cơ học.</p>`;
  }).catch(e=>{if(researchHost.isConnected)researchHost.textContent=`Không tải được lịch sử theo đài: ${e.message}. Kết quả đối chiếu vẫn được giữ.`});
}
