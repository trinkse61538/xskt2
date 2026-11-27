// Local calendar UI for historical lookups; no changes to result matching.
import {vnISO,fmtDate} from './data.js';
export function shiftDate(iso,delta){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)}
const pad=n=>String(n).padStart(2,'0');
export function monthCells(month){const [y,m]=month.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1,12)),count=new Date(Date.UTC(y,m,0,12)).getUTCDate();return [...Array((first.getUTCDay()+6)%7).fill(null),...Array.from({length:count},(_,i)=>`${y}-${pad(m)}-${pad(i+1)}`)]}
export function shiftMonth(month,delta){const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+delta,1,12));return d.toISOString().slice(0,7)}
export function initLookupDate(date){
 const root=date.closest('.lookup-date-field');if(!root||root.dataset.dateReady)return;root.dataset.dateReady='1';
 const prev=root.querySelector('[data-date-prev]'),next=root.querySelector('[data-date-next]'),center=root.querySelector('[data-date-open]'),calendar=root.querySelector('[data-date-calendar]'),year=root.querySelector('[data-date-year]'),month=root.querySelector('[data-date-month]'),grid=root.querySelector('[data-date-grid]'),back=root.querySelector('[data-month-prev]'),forward=root.querySelector('[data-month-next]');
 let view=date.value.slice(0,7);
 const bounds=()=>{date.max=vnISO();return [date.min,date.max]};
 const close=()=>{calendar.hidden=true;center.setAttribute('aria-expanded','false')};
 function draw(){const [min,max]=bounds();if(!date.value||date.value<min||date.value>max)date.value=max;
  center.textContent=fmtDate(date.value);center.setAttribute('aria-label',`Chọn ngày ${fmtDate(date.value)}`);prev.disabled=date.value<=min;next.disabled=date.value>=max;
  if(calendar.hidden)return;
  const lo=min.slice(0,7),hi=max.slice(0,7);view=view<lo?lo:view>hi?hi:view;
  const [y,m]=view.split('-').map(Number);year.replaceChildren();for(let i=+min.slice(0,4);i<=+max.slice(0,4);i++)year.add(new Option(String(i),String(i)));year.value=String(y);
  month.replaceChildren();for(let i=1;i<=12;i++){const key=`${y}-${pad(i)}`;const opt=new Option(`Tháng ${i}`,String(i));opt.disabled=key<lo||key>hi;month.add(opt)}month.value=String(m);
  back.disabled=view<=lo;forward.disabled=view>=hi;
  grid.replaceChildren();for(const day of monthCells(view)){if(!day){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank);continue}const b=document.createElement('button');b.type='button';b.dataset.day=day;b.textContent=String(+day.slice(-2));b.disabled=day<min||day>max;b.setAttribute('aria-label',fmtDate(day));b.setAttribute('aria-pressed',String(day===date.value));if(day===max)b.classList.add('is-today');grid.append(b)}
 }
 function choose(day){const [min,max]=bounds();if(day<min||day>max)return;date.value=day;view=day.slice(0,7);close();date.dispatchEvent(new Event('input',{bubbles:true}));draw()}
 prev.onclick=()=>choose(shiftDate(date.value,-1));next.onclick=()=>choose(shiftDate(date.value,1));
 center.onclick=()=>{if(!calendar.hidden){close();return}view=date.value.slice(0,7);calendar.hidden=false;center.setAttribute('aria-expanded','true');draw()};
 back.onclick=()=>{view=shiftMonth(view,-1);draw()};forward.onclick=()=>{view=shiftMonth(view,1);draw()};
 year.onchange=()=>{view=`${year.value}-${pad(+month.value)}`;draw()};month.onchange=()=>{view=`${year.value}-${pad(+month.value)}`;draw()};
 grid.onclick=e=>{const b=e.target.closest('button[data-day]');if(b&&!b.disabled){choose(b.dataset.day);center.focus()}};
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!calendar.hidden){close();center.focus()}});
 date.addEventListener('input',draw);date.addEventListener('change',draw);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw()});
 draw();return {choose,refresh:draw};
}
