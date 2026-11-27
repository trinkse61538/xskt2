// V3.5 — bounded simulations, not a prediction or a recommendation.
import {loadHistoryIndex,completedISO,fmtDate,monthLabel,esc,money,pct} from './data.js';
import {loadMonthlyDays,monthlyResult,monthlySummary} from './monthly-v32.js?v=3.5.0';
import {readProfile,picksFor} from './personal.js';
export const STEP=15000, PAYOUT=80000;
export const MAX_BUDGET=1_000_000_000;
export function integer(value,min,max,fallback=min){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.floor(n))):fallback;}
export function normalizeAmount(value){return integer(Number(value)/STEP,1,Math.floor(MAX_BUDGET/(2*STEP)),1)*STEP;}
// Legacy multiples are a conditional mathematical scenario, not a recommended stake.
// The budget is an absolute cap, not a target to spend.
export function buildBudgetPlan(count,amount,budget,method='fixed',top=2){
  const numberCount=top===1?1:2;
  const n=integer(count,0,31,0),base=normalizeAmount(amount),cap=integer(budget,0,MAX_BUDGET,0);
  let cumulative=0,blocked=false;
  const rows=Array.from({length:n},(_,i)=>{
    const multiple=method==='legacy'?Math.floor(cumulative*STEP/((PAYOUT-numberCount*STEP)*base))+1:1;
    const perNumber=base*multiple,dayTotal=numberCount*perNumber;
    if(blocked||cumulative+dayTotal>cap){blocked=true;return {day:i+1,allowed:false,dayTotal,perNumber,steps:perNumber/STEP};}
    cumulative+=dayTotal;
    const gross=perNumber/STEP*PAYOUT;
    return {day:i+1,allowed:true,lossBefore:cumulative-dayTotal,steps:perNumber/STEP,multiple,perNumber,dayTotal,cumulative,gross,netIfOneHit:gross-cumulative};
  });
  return {base,cap,rows,maxOutlay:cumulative,covered:rows.filter(x=>x.allowed).length,method};
}
// Stop at first matching result, missing data or budget limit; never infer a result.
// A hit can leave P/L negative in the fixed-stake scenario.
export function reviewPlan(items,plan){
  let spent=0,received=0,nhay=0,settled=0,reason='complete',stopIndex=-1,blocked=false;
  const rows=items.map((x,i)=>{
    const p=plan.rows[i];
    if(blocked)return {...x,plan:p,review:['pending','missing','unavailable'].includes(reason)?'unverified':'skipped',net:null};
    if(!p?.allowed){reason='budget';stopIndex=i;blocked=true;return {...x,plan:p,review:'budget',net:null};}
    if(x.status!=='win'&&x.status!=='miss'){reason=x.status;stopIndex=i;blocked=true;return {...x,plan:p,review:'unresolved',net:null};}
    spent+=p.dayTotal; settled++;const hitCount=x.result?.totalNhay||0;nhay+=hitCount;received+=p.gross*hitCount;
    if(x.status==='win'){reason='win';stopIndex=i;blocked=true;}
    return {...x,plan:p,review:x.status==='win'?'stop':'settled',net:received-spent};
  });
  return {rows,spent,received,nhay,settled,reason,stopIndex,net:received-spent};
}
const labels={win:'WIN',miss:'MISS',pending:'CHỜ KQ',missing:'THIẾU DỮ LIỆU',unavailable:'LỖI TẢI KQ'};
const stopLabels={complete:'Đã hết ngày trong mẫu',budget:'Dừng: chạm giới hạn vốn',win:'Dừng mô phỏng tại WIN đầu tiên',pending:'Chưa có kết quả tiếp theo',missing:'Tạm dừng: thiếu dữ liệu',unavailable:'Tạm dừng: lỗi tải dữ liệu'};
const signed=n=>`${n>0?'+':''}${money(n)}`;
const metric=(label,value)=>`<div><span>${label}</span><b>${value}</b></div>`;
function reviewHTML(label,review,items){const at=items[review.stopIndex]?.r.date;return `<section class="guide33-review"><b>${label}</b><p>${esc(stopLabels[review.reason]||review.reason)}${at?` · ${fmtDate(at)}`:''}</p><div class="guide33-grid">${metric('Đã chấm trong mô phỏng',`${review.settled}/${items.length}`)}${metric('Chi phí',money(review.spent))}${metric('Thu về',money(review.received))}${metric('P/L hồi cứu',review.settled?signed(review.net):'—')}</div></section>`;}
export function guideMethod(value){return value==='legacy'?'legacy':'fixed';}
// The selected plan is a retrospective/conditional simulation, never an instruction to spend.
export function guideRowKind(row){
  if(row?.review==='skipped')return 'stopped';
  if(!row?.plan?.allowed||row.review==='budget')return 'capped';
  if(row.review==='unresolved'||row.review==='unverified')return 'conditional';
  return 'settled';
}
export async function renderGuideV35(ctx){
  const {state,$}=ctx,req=Symbol(),start=state.guideStart,count=state.guideDays,mode=state.mode,top=state.guideTop===1?1:2;
  const method=guideMethod(state.guideMethod),isLegacy=method==='legacy',methodLabel=isLegacy?'Lũy tiến':'Cố định';
  state.guideMethod=method;
  document.querySelectorAll('#guideMethodButtons button').forEach(b=>{const active=b.dataset.method===method;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#guideMethodNote').textContent=isLegacy?'Kịch bản công thức cũ: số bước thay đổi nếu các kỳ trước đều MISS. Không bảo đảm gỡ lỗ.':'Số bước mỗi kỳ không thay đổi.';
  $('#guidePlanTitle').textContent='Mô phỏng từng ngày · '+methodLabel;
  ctx.guideRequest=req;const current=()=>ctx.guideRequest===req;
  const startInput=$('#guideStartDate'),stakeInput=$('#guideStake'),stepInput=$('#guideStep'),budgetInput=$('#guideBudget');
  const amount=normalizeAmount(state.guideStake),budget=integer(state.guideBudget,0,MAX_BUDGET,0);
  state.guideStake=amount;state.guideBudget=budget;$('#guideTop').value=String(top);
  document.querySelectorAll('#guideTopButtons button').forEach(b=>{const active=Number(b.dataset.top)===top;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  startInput.value=start;stakeInput.value=amount;stepInput.value=amount/STEP;budgetInput.value=budget;$('#guideCustomCount').value=count;
  $('#guidePeriod').textContent=monthLabel(start);
  $('#stakeWarning').textContent=`${amount/STEP} bước × ${money(STEP)} / số · ${top} số / ngày · đài 1. Tổng ngày đầu = ${money(amount*top)}. Làm tròn xuống bội 15.000đ (tối thiểu 1 bước).`;
  const summary=$('#guideSummary'),datesHost=$('#guideDates'),planHost=$('#guidePlan'),formula=$('#guideFormula');
  summary.innerHTML='<div class="skeleton-card">Đang tải ngày và kết quả đài 1…</div>';datesHost.innerHTML='';planHost.innerHTML='';formula.innerHTML='';
  try{
    const [dates,hist]=await Promise.all([loadMonthlyDays(start,count),loadHistoryIndex(start).catch(()=>({dates:{},unavailable:true}))]);
    if(!current())return;
    const profile=readProfile(),completed=completedISO(),items=dates.map(r=>{const picks=picksFor(r,mode,profile);const selected=top===1?[picks.primary]:[picks.primary,picks.secondary];return {r,picks,selected,...monthlyResult(r.date,selected,hist,completed)};});
    const stats=monthlySummary(items);
    // A zero input means no user cap; show mathematical scenarios only, with a hard display limit.
    const effectiveCap=budget||MAX_BUDGET;
    const plan=buildBudgetPlan(items.length,amount,effectiveCap,method,top),review=reviewPlan(items,plan);
    const dayCost=amount*top,gross=amount/STEP*PAYOUT;
    summary.innerHTML=`<div class="guide33-grid">${metric('Phương pháp',methodLabel)}${metric('Phạm vi số','Top '+top+' · '+top+' số')}${metric('Bước / số kỳ đầu',amount/STEP)}${metric('Tiền mỗi số kỳ đầu',money(amount))}${metric('Tổng chi phí kỳ đầu',money(dayCost))}${metric('Thu về 1 nháy kỳ đầu',money(gross))}${metric('Số ngày',`${items.length}/${count}`)}${metric('WIN / đã chấm',`${stats.wins}/${stats.scored} · ${stats.scored?pct(stats.wins/stats.scored):'—'}`)}${metric('Tổng nháy lịch sử',stats.nhay)}${metric('Chi phí tối đa nếu toàn MISS (trong trần)',money(plan.maxOutlay))}${metric('Số kỳ nằm trong trần',`${plan.covered}/${items.length}`)}</div>
    <p class="helper">${items.length<count?'Không đủ ngày từ mốc này trong tháng. Không tự chuyển tháng. ':''}WIN chỉ có nghĩa ít nhất một số xuất hiện. ${items.some(x=>x.picks.personal)?'Personal':'Universal'} · đài 1.</p>
    <div class="method-note warning"><b>${budget?'Trần ngân sách giả lập: '+money(budget):'Chưa nhập trần ngân sách cá nhân'}</b><span>${budget?'Không mô phỏng chi phí vượt trần.':'Giới hạn hiển thị kỹ thuật 1 tỷ đồng; không phải ngân sách đề xuất.'} Mọi số tiền là mô phỏng; lũy tiến không làm tăng xác suất trúng và có thể gây lỗ lớn.</span></div>
    ${reviewHTML('Review lịch sử · '+methodLabel,review,items)}`;
    datesHost.innerHTML=items.map((x,i)=>`<button data-action="open-date" data-date="${esc(x.r.date)}" data-follow-station="${esc(x.station)}"><span>Ngày ${i+1} · ${fmtDate(x.r.date)}</span><b>${x.selected.map(esc).join(' · ')}</b><small>Đài 1: ${esc(x.station)} · <strong class="best32-${x.status}">${labels[x.status]}</strong>${x.result?.win?` · ${esc(x.result.hitNumbers.join(', '))} · ${x.result.totalNhay} nháy`:''}</small></button>`).join('')||'<div class="empty-note">Không có ngày trong tháng.</div>';
    const stageText=x=>({stop:'DỪNG · WIN đầu tiên',skipped:'Đã dừng · không tính chi phí',budget:'DỪNG · vượt trần',unresolved:'Chưa xác định kết quả',unverified:'Kỳ trước chưa xác định',settled:'Đã chấm'}[x.review]||'—');
    planHost.innerHTML=items.map((x,i)=>{
      const row=review.rows[i],p=row.plan,kind=guideRowKind(row);
      const head=`<div class="guide33-head"><b>Kỳ ${i+1} · ${fmtDate(x.r.date)} · ${esc(x.station)}</b><strong class="best32-${x.status}">${labels[x.status]}</strong></div><p>Top ${top} · ${x.selected.map(esc).join(' · ')} · ${stageText(row)}</p>`;
      if(kind==='capped'||kind==='stopped')return `<article class="guide33-row">${head}<p>${kind==='capped'?'Ngoài trần mô phỏng.':'Sau điểm dừng. Không phát sinh thêm chi phí.'}</p></article>`;
      const info=kind==='conditional'?'<p><b>Kịch bản giả định nếu các kỳ trước đều MISS; chưa phải chi phí đã chấm.</b></p>':'';
      return `<article class="guide33-row">${head}${info}<div class="guide395-main"><div><span>Số bước / số</span><b>${p.steps}</b></div><div><span>Chi phí giả lập / số</span><b>${money(p.perNumber)}</b></div><div><span>Tổng chi phí giả lập kỳ này</span><b>${money(p.dayTotal)}</b></div></div><div class="guide33-grid">${metric('Bội so với kỳ đầu',p.multiple+'×')}${metric('Chi phí lũy kế trước kỳ',money(p.lossBefore))}${metric('Lũy kế nếu toàn MISS',money(p.cumulative))}${metric('Thu về giả định 1 nháy',money(p.gross))}${metric('P/L nếu 1 nháy',signed(p.netIfOneHit))}${metric('P/L nếu MISS',signed(-p.cumulative))}${metric('Số nháy thực tế',x.result?x.result.totalNhay:'—')}${metric('P/L hồi cứu lũy kế',row.net===null?'—':signed(row.net))}</div>${row.review==='stop'?'<p><b>Điểm dừng hồi cứu: đã WIN. Các kỳ sau không tính chi phí.</b></p>':''}</article>`;
    }).join('')||'<div class="empty-note">Không có ngày trong tháng.</div>';
    formula.innerHTML='<b>Quy ước và giới hạn</b><span>1 bước = 15.000đ/số, trả thưởng giả định 80.000đ/nháy/bước. Kịch bản cũ tính theo bội của tiền ngày 1 và giả định tất cả ngày trước đều MISS; bảng này là đối chiếu số học, không phải mức tiền khuyến nghị. WIN có thể không đồng nghĩa với lãi ở mức cố định. Review dừng ở WIN đầu tiên, hết ngày, dữ liệu chưa xác định hoặc vượt trần; các ngày sau không tính P/L. Không có công thức bảo đảm lợi nhuận.</span>';
  }catch(e){if(current())summary.innerHTML=`<div class="error-card">${esc(e.message)}</div>`;}
}
