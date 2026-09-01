import {pct} from './data.js';

export const XSMN_SCHEDULE={0:['TP.HCM','Đồng Tháp','Cà Mau'],1:['Bến Tre','Vũng Tàu','Bạc Liêu'],2:['Đồng Nai','Cần Thơ','Sóc Trăng'],3:['Tây Ninh','An Giang','Bình Thuận'],4:['Vĩnh Long','Bình Dương','Trà Vinh'],5:['TP.HCM','Long An','Bình Phước','Hậu Giang'],6:['Tiền Giang','Kiên Giang','Đà Lạt']};
export const BASELINE_ONE_18=1-Math.pow(.99,18);
export const BASELINE_TWO_18=1-Math.pow(.98,18);

export function stationsForDate(iso){
  const [y,m,d]=iso.split('-').map(Number),dow=new Date(y,m-1,d).getDay(),mon0=(dow+6)%7;
  return XSMN_SCHEDULE[mon0]||[];
}
export function scorePicks(picks,draws){
  const all=(draws||[]).flatMap(d=>d.tails||[]),counts={};picks.forEach(p=>counts[p]=all.filter(x=>x===p).length);
  const hitNumbers=picks.filter(p=>counts[p]>0);
  return {win:hitNumbers.length>0,hitNumbers,totalNhay:hitNumbers.reduce((s,p)=>s+counts[p],0),counts,trials:all.length};
}
export function theoreticalTwoPickBaseline(trials){return trials>0?1-Math.pow(.98,trials):0}
export function stationHistory(research,name){return research?.stations?.[name]||null}
export function uniqueHitRate(st,num,window){
  const draws=(st?.recent||[]).slice(-window); if(!draws.length)return {n:0,hits:0,rate:0};
  const hits=draws.filter(d=>(d.unique_hits||[...new Set(d.tails||[])]).includes(num)).length;
  return {n:draws.length,hits,rate:hits/draws.length};
}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0}
function stdev(xs){if(!xs.length)return 0;const m=mean(xs);return Math.sqrt(mean(xs.map(x=>(x-m)**2)))}
export function stationMatch(research,date,picks){
  const ranked=stationsForDate(date).map(station=>{
    const st=stationHistory(research,station); if(!st||(st.recent||[]).length<30)return {station,available:false};
    const per=picks.map(num=>{const m10=uniqueHitRate(st,num,10),m30=uniqueHitRate(st,num,30),m100=uniqueHitRate(st,num,100);return {num,m10,m30,m100,weighted:.20*m10.rate+.35*m30.rate+.45*m100.rate}});
    const r10=mean(per.map(x=>x.m10.rate)),r30=mean(per.map(x=>x.m30.rate)),r100=mean(per.map(x=>x.m100.rate)),raw=.20*r10+.35*r30+.45*r100,spread=stdev([r10,r30,r100]),adjusted=raw-.25*spread;
    return {station,available:true,st,per,r10,r30,r100,raw,spread,adjusted,minCore:Math.min(...per.map(x=>x.weighted))};
  }).filter(x=>x.available).sort((a,b)=>b.adjusted-a.adjusted||b.raw-a.raw||a.station.localeCompare(b.station,'vi'));
  const best=ranked[0],second=ranked[1],lead=best&&second?best.adjusted-second.adjusted:0;
  const clear=!!(best&&second&&best.adjusted>=BASELINE_ONE_18+.02&&lead>=.02&&best.minCore>=BASELINE_ONE_18-.05);
  return {ranked,best,second,lead,clear};
}
export function numberTable(st,window){
  return Array.from({length:100},(_,i)=>String(i).padStart(2,'0')).map(num=>({num,...uniqueHitRate(st,num,window)})).sort((a,b)=>b.rate-a.rate||Number(a.num)-Number(b.num));
}
export function anomalyFor(st,num){return st?.anomaly?.numbers?.[num]||null}
export function anomalyLabel(a){
  if(!a)return {text:'Chưa có dữ liệu',cls:'neutral'};
  const map={PERSISTENT_UP:['Tăng · bền','up'],PERSISTENT_DOWN:['Giảm · bền','down'],WATCH_UP:['Theo dõi tăng','up'],WATCH_DOWN:['Theo dõi giảm','down'],NORMAL:['Bình thường','neutral']};
  const [text,cls]=map[a.state]||map.NORMAL;return {text,cls};
}
export function matchSummaryText(sm){
  if(!sm.ranked.length)return 'Chưa đủ lịch sử để tính Station Match.';
  if(sm.clear)return `CLEAR MATCH · ${sm.best.station} · ${pct(sm.best.adjusted)}`;
  return `NO CLEAR MATCH · cao nhất ${sm.best.station} ${pct(sm.best.adjusted)}`;
}
