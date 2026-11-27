// V3.6: scheduled stations and observed results only. No predictive ranking.
import {stationsForDate} from './history.js';
import {stationResults} from './station-v31.js';
import {esc} from './data.js';
export function dayStations(date,picks,hist,completed){
  const names=stationsForDate(date);
  const valid=Array.isArray(picks)&&picks.length===2&&new Set(picks).size===2&&picks.every(n=>typeof n==='string'&&/^\d{2}$/.test(n));
  const raw=hist?.dates?.[date]?.draws;
  const results=date<=completed&&!hist?.unavailable&&valid?stationResults(picks,names,Array.isArray(raw)?raw:[]):[];
  return names.map((station,i)=>{
    const result=results[i]?.result||null;
    return {station,main:i===0,result,status:date>completed?'pending':hist?.unavailable?'unavailable':!result?'missing':result.win?'win':'miss'};
  });
}
export function searchKey(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();}
export function matchesDay(record,picks,query){
  const c=record.calendar||{};
  const hay=[record.date,c.day,c.year,c.month,c.officer,c.nayin?.name??c.nayin,c.solar_term?.name??c.solar_term,picks.primary,picks.secondary,...(picks.top5||[]),...stationsForDate(record.date)];
  return searchKey(hay.join(' ')).includes(searchKey(query));
}
const labels={pending:'CHỜ KQ',unavailable:'LỖI TẢI KQ',missing:'THIẾU KQ',win:'WIN',miss:'MISS'};
export function stationsHTML(rows){
  return `<small class="all36-schedule">XSMN · ${rows.map((x,i)=>`<span class="${x.main?'all36-main':''}">${x.main?'Đài 1: ':''}${esc(x.station)}</span>${i<rows.length-1?' · ':''}`).join('')}</small><small class="all36-results">${rows.map(x=>`<span class="all36-status best32-${x.status}">${esc(x.station)}: ${labels[x.status]}${x.result?.win?` (${esc(x.result.hitNumbers.join(', '))} · ${x.result.totalNhay} nháy)`:''}</span>`).join('')}</small>`;
}
