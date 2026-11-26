// V3.3 — bounded simulations, not a prediction or a recommendation.
import {loadHistoryIndex,completedISO,fmtDate,monthLabel,esc,money,pct} from './data.js';
import {loadMonthlyDays,monthlyResult,monthlySummary} from './monthly-v32.js';
import {readProfile,picksFor} from './personal.js';
export const STEP=15000, PAYOUT=80000;
export const MAX_BUDGET=1_000_000_000;
export function integer(value,min,max,fallback=min){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.floor(n))):fallback;}
export function normalizeAmount(value){return integer(Number(value)/STEP,1,Math.floor(MAX_BUDGET/(2*STEP)),1)*STEP;}
// Legacy multiples reproduced only as a retrospective comparison of completed draws.
// The budget is an absolute cap, not a target to spend.
export function buildBudgetPlan(count,amount,budget,method='fixed'){
  const n=integer(count,0,31,0),base=normalizeAmount(amount),cap=integer(budget,0,MAX_BUDGET,0);
  let cumulative=0,blocked=false;
  const rows=Array.from({length:n},(_,i)=>{
    const multiple=method==='legacy'?Math.floor(cumulative*STEP/((PAYOUT-2*STEP)*base))+1:1;
    const perNumber=base*multiple,dayTotal=2*perNumber;
    if(blocked||cumulative+dayTotal>cap){blocked=true;return {day:i+1,allowed:false};}
    cumulative+=dayTotal;
    const gross=perNumber/STEP*PAYOUT;
    return {day:i+1,allowed:true,steps:perNumber/STEP,multiple,perNumber,dayTotal,cumulative,gross,netIfOneHit:gross-cumulative};
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
export async function renderGuideV33(ctx){
  const {state,$}=ctx,req=Symbol(),start=state.guideStart,count=state.guideDays,mode=state.mode;
  ctx.guideRequest=req;const current=()=>ctx.guideRequest===req;
  const startInput=$('#guideStartDate'),stakeInput=$('#guideStake'),stepInput=$('#guideStep'),budgetInput=$('#guideBudget');
  const amount=normalizeAmount(state.guideStake),budget=integer(state.guideBudget,0,MAX_BUDGET,0);
  state.guideStake=amount;state.guideBudget=budget;
  startInput.value=start;stakeInput.value=amount;stepInput.value=amount/STEP;budgetInput.value=budget;$('#guideCustomCount').value=count;
  $('#guidePeriod').textContent=monthLabel(start);
  $('#stakeWarning').textContent=`${amount/STEP} bước × ${money(STEP)} / số · 2 số / ngày · đài 1. Tiền được làm tròn xuống bội 15.000đ (tối thiểu 1 bước).`;
  const summary=$('#guideSummary'),datesHost=$('#guideDates'),planHost=$('#guidePlan'),formula=$('#guideFormula');
  summary.innerHTML='<div class="skeleton-card">Đang tải ngày và kết quả đài 1…</div>';datesHost.innerHTML='';planHost.innerHTML='';formula.innerHTML='';
  try{
    const [dates,hist]=await Promise.all([loadMonthlyDays(start,count),loadHistoryIndex(start).catch(()=>({dates:{},unavailable:true}))]);
    if(!current())return;
    const profile=readProfile(),completed=completedISO(),items=dates.map(r=>{const picks=picksFor(r,mode,profile);return {r,picks,...monthlyResult(r.date,[picks.primary,picks.secondary],hist,completed)};});
    const stats=monthlySummary(items),fixed=buildBudgetPlan(items.length,amount,budget),review=reviewPlan(items,fixed);
    // Only completed observations enter the legacy money-progression comparison.
    // No future escalation schedule or betting recommendation is displayed.
    const historical=items.filter(x=>x.r.date<=completed),legacy=reviewPlan(historical,buildBudgetPlan(historical.length,amount,budget,'legacy'));
    summary.innerHTML=`<div class="guide33-grid">${metric('Số ngày',`${items.length}/${count}`)}${metric('Khoảng ngày',items.length?`${fmtDate(items[0].r.date,false)} – ${fmtDate(items.at(-1).r.date,false)}`:'—')}${metric('Mode số',items.some(x=>x.picks.personal)?'Personal':'Universal')}${metric('WIN / đã chấm',`${stats.wins}/${stats.scored} · ${stats.scored?pct(stats.wins/stats.scored):'—'}`)}${metric('Tổng nháy lịch sử',stats.nhay)}${metric('Chi phí tối đa mô phỏng cố định',money(fixed.maxOutlay))}</div>
    <p class="helper">${items.length<count?'Không đủ ngày từ mốc này trong tháng. Không tự chuyển tháng. ':''}WIN chỉ có nghĩa ít nhất một số xuất hiện. Mẫu chọn theo Universal Day Score; không phải xác suất dự báo.</p>
    ${reviewHTML('Mô phỏng mức cố định · dừng tại WIN đầu tiên',review,items)}
    ${historical.length?reviewHTML('Đối chiếu hồi cứu công thức tăng bội của XSKT cũ',legacy,historical)+`<details class="guide33-review"><summary>Chi tiết lịch sử đã chấm (không áp dụng cho kỳ tới)</summary>${legacy.rows.filter(x=>x.net!==null).map(x=>`<p>${fmtDate(x.r.date)} · ${labels[x.status]} · ${x.plan.steps} bước/số · chi phí ${money(x.plan.dayTotal)} · P/L ${signed(x.net)}</p>`).join('')||'<p>Chưa có kỳ được chấm.</p>'}</details>`:'<p class="helper">Chưa có ngày quá khứ để đối chiếu công thức cũ.</p>'}
    <div class="method-note warning"><b>Giới hạn vốn: ${money(budget)}</b><span>Chỉ là mức trần mô phỏng, không phải mức đề xuất. Không tăng tiền để gỡ lỗ. Dừng khi đã trúng, hết ngày hoặc không đủ ngân sách; một WIN vẫn có thể lỗ. Không có công thức bảo đảm lợi nhuận.</span></div>`;
    datesHost.innerHTML=items.map((x,i)=>`<button data-action="open-date" data-date="${esc(x.r.date)}" data-follow-station="${esc(x.station)}"><span>Ngày ${i+1} · ${fmtDate(x.r.date)}</span><b>${esc(x.picks.primary)} · ${esc(x.picks.secondary)}</b><small>Đài 1: ${esc(x.station)} · ${labels[x.status]}${x.result?.win?` · ${esc(x.result.hitNumbers.join(', '))} · ${x.result.totalNhay} nháy`:''}</small></button>`).join('')||'<div class="empty-note">Không có ngày trong tháng.</div>';
    planHost.innerHTML=review.rows.map((x,i)=>{const p=x.plan,skip=x.review==='skipped'||x.review==='budget';return `<article class="guide33-row"><div class="guide33-head"><b>${fmtDate(x.r.date)} · ${esc(x.station)}</b><strong class="best32-${x.status}">${labels[x.status]}</strong></div><p>${esc(x.picks.primary)} · ${esc(x.picks.secondary)} · ${x.review==='stop'?'DỪNG MÔ PHỎNG':x.review==='skipped'?'Không tính vào review sau điểm dừng / chưa xác định':x.review==='budget'?'Vượt giới hạn vốn':x.review==='unresolved'||x.review==='unverified'?'Kịch bản có điều kiện · chưa chấm chu kỳ':'Đã chấm'}</p>${p?.allowed&&!skip?`<div class="guide33-grid">${metric('Bước / số',p.steps)}${metric('Mỗi số (giả lập)',money(p.perNumber))}${metric('Chi phí ngày',money(p.dayTotal))}${metric('Chi phí lũy kế nếu chưa dừng',money(p.cumulative))}${metric('Thu về nếu 1 nháy',money(p.gross))}${metric('P/L nếu chỉ có 1 nháy đến đây',signed(p.netIfOneHit))}</div>`:''}${x.net!==null?`<p><b>P/L đã chấm: ${signed(x.net)}</b> · ${x.result?.totalNhay||0} nháy</p>`:''}</article>`}).join('');
    formula.innerHTML='<b>Quy ước mô phỏng</b><span>1 bước = 15.000đ mỗi số. Thu về giả định 80.000đ/nháy/bước. Chỉ chấm đài đầu theo lịch; đếm đúng số lần xuất hiện. Review dừng ngay tại kết quả chưa biết, không suy diễn thành MISS. Mô phỏng công thức tăng bội cũ chỉ dùng dữ liệu đã qua và chịu trần vốn. Không có lợi thế dự báo được xác nhận.</span>';
  }catch(e){if(current())summary.innerHTML=`<div class="error-card">${esc(e.message)}</div>`;}
}
