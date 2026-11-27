// Monthly-only view. Ranking is unchanged; history is used only for result display.
import {loadMonth,completedISO} from './data.js';
import {stationsForDate} from './history.js';
import {scopedDraws,scoreStation} from './station-v31.js';
export function selectMonthDays(rows,start,count){
  return rows.filter(r=>r.date.slice(0,7)===start.slice(0,7)&&r.date>=start)
    .sort((a,b)=>b.universal.day_score-a.universal.day_score||b.universal.agreement-a.universal.agreement||a.date.localeCompare(b.date))
    .slice(0,count).sort((a,b)=>a.date.localeCompare(b.date));
}
export async function loadMonthlyDays(start,count){return selectMonthDays(await loadMonth(start),start,count)}
export function monthlyResult(date,picks,hist,completed=completedISO()){
  const schedule=stationsForDate(date),station=schedule[0]||'—';
  if(date>completed)return {station,status:'pending',result:null};
  if(hist?.unavailable)return {station,status:'unavailable',result:null};
  const draws=scopedDraws(hist?.dates?.[date]?.draws||[],'station1',schedule);
  if(!draws.length)return {station,status:'missing',result:null};
  if(![1,2].includes(picks.length)||new Set(picks).size!==picks.length||!picks.every(p=>typeof p==='string'&&/^\d{2}$/.test(p)))return {station,status:'missing',result:null};
  const result=scoreStation(picks,draws);
  return {station,status:result.win?'win':'miss',result};
}
export function monthlySummary(rows){
  const wins=rows.filter(x=>x.status==='win').length,misses=rows.filter(x=>x.status==='miss').length;
  return {wins,misses,scored:wins+misses,pending:rows.length-wins-misses,nhay:rows.reduce((n,x)=>n+(x.result?.totalNhay||0),0)};
}
