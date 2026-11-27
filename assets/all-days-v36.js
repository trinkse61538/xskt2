// V3.6: scheduled stations and observed results only. No predictive ranking.
import {stationsForDate} from './history.js';
import {stationResults} from './station-v31.js';
import {esc} from './data.js';
export function dayStations(date,picks,hist,completed){
  const observed=hist?.dates?.[date]?.draws;
  const names=date<'2026-01-01'&&Array.isArray(observed)&&observed.length?[...new Set(observed.map(d=>d.station).filter(Boolean))]:stationsForDate(date);
  const valid=Array.isArray(picks)&&picks.length===2&&new Set(picks).size===2&&picks.every(n=>typeof n==='string'&&/^\d{2}$/.test(n));
  const raw=hist?.dates?.[date]?.draws;
  const results=date<=completed&&!hist?.unavailable&&valid?stationResults(picks,names,Array.isArray(raw)?raw:[]):[];
  return names.map((station,i)=>{
    const result=results[i]?.result||null;
    return {station,main:i===0,result,status:date>completed?'pending':hist?.unavailable?'unavailable':!result?'missing':result.win?'win':'miss'};
  });
}
export function searchKey(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();}
export function matchesDay(record,picks,query,names=stationsForDate(record.date)){
  const c=record.calendar||{};
  const hay=[record.date,c.day,c.year,c.month,c.officer,c.nayin?.name??c.nayin,c.solar_term?.name??c.solar_term,picks.primary,picks.secondary,...(picks.top5||[]),...names];
  return searchKey(hay.join(' ')).includes(searchKey(query));
}
const labels={pending:'CHỜ KQ',unavailable:'LỖI TẢI KQ',missing:'THIẾU KQ',win:'WIN',miss:'MISS'};
export function stationsHTML(rows){
  return `<small class="all36-schedule">XSMN · ${rows.map((x,i)=>`<span class="${x.main?'all36-main':''}">${x.main?'Đài 1: ':''}${esc(x.station)}</span>${i<rows.length-1?' · ':''}`).join('')}</small><small class="all36-results">${rows.map(x=>`<span class="all36-status best32-${x.status}">${esc(x.station)}: ${labels[x.status]}${x.result?.win?` (${esc(x.result.hitNumbers.join(', '))} · ${x.result.totalNhay} nháy)`:''}</span>`).join('')}</small>`;
}

// V3.9: read-only historical result inspection. Missing records never count as losses.
export function historyMonthSummary(rows,hist,completed){
 const count={available:0,missing:0,pending:0};
 for(const r of rows){if(r.date>completed){count.pending++;continue;}const ds=hist?.dates?.[r.date]?.draws;
  if(!hist?.unavailable&&Array.isArray(ds)&&ds.length&&ds.every(d=>Array.isArray(d.tails)&&d.tails.length===18&&d.tails.every(t=>typeof t==='string'&&/^\d{2}$/.test(t))))count.available++;else count.missing++;
 }return count;
}
export function historyDetails(date,picks,hist,completed){
 if(date>completed)return '';
 if(hist?.unavailable)return '<p class="h39-missing">Không tải được kết quả lịch sử.</p>';
 const draws=hist?.dates?.[date]?.draws;
 if(!Array.isArray(draws)||!draws.length)return '<p class="h39-missing">Chưa có bản ghi hợp lệ · không kết luận MISS.</p>';
 const rows=dayStations(date,picks,hist,completed);
 return `<details class="h39-details"><summary>Kết quả thực tế · 18 số cuối mỗi đài (${rows.filter(r=>r.result).length}/${rows.length} đài)</summary>${rows.map(r=>{const found=draws.filter(d=>d.station===r.station);if(!r.result||found.length!==1)return `<p class="h39-missing">${esc(r.station)} · thiếu dữ liệu</p>`;return `<div class="h39-station"><b>${esc(r.station)}</b><small>${r.result.totalNhay} nháy · ${r.result.win?'WIN':'MISS'}</small><div class="h39-tails">${found[0].tails.map(n=>`<span class="${picks.includes(n)?'h39-hit':''}">${esc(n)}</span>`).join('')}</div></div>`;}).join('')}<p class="helper">Hai số cuối theo thứ tự lưu trong kho dữ liệu. Số lặp được giữ nguyên. Không phải toàn bộ số vé 6 chữ số.</p></details>`;
}
