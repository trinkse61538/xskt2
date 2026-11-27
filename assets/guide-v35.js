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
export async function renderGuideV35(ctx){
  const {state,$}=ctx,req=Symbol(),start=state.guideStart,count=state.guideDays,mode=state.mode,top=state.guideTop===1?1:2;
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
    const fixed=buildBudgetPlan(items.length,amount,effectiveCap,'fixed',top),review=reviewPlan(items,fixed);
    const legacyPlan=buildBudgetPlan(items.length,amount,effectiveCap,'legacy',top),legacy=reviewPlan(items,legacyPlan);
    const dayCost=amount*top,gross=amount/STEP*PAYOUT;
    summary.innerHTML=`<div class="guide33-grid">${metric('Phạm vi số','Top '+top+' · '+top+' số')}${metric('Bước / số',amount/STEP)}${metric('Tiền mỗi số',money(amount))}${metric('Tổng ngày 1',money(dayCost))}${metric('Thu về 1 nháy ngày 1',money(gross))}${metric('Lãi nếu 1 nháy ngày 1',signed(gross-dayCost))}${metric('Số ngày',`${items.length}/${count}`)}${metric('WIN / đã chấm',`${stats.wins}/${stats.scored} · ${stats.scored?pct(stats.wins/stats.scored):'—'}`)}${metric('Tổng nháy lịch sử',stats.nhay)}${metric('Chi phí tối đa trong trần · cố định',money(fixed.maxOutlay))}${metric('Chi phí tối đa trong trần · công thức cũ',money(legacyPlan.maxOutlay))}${metric('Số ngày nằm trong trần · công thức cũ',`${legacyPlan.covered}/${items.length}`)}</div>
    <p class="helper">${items.length<count?'Không đủ ngày từ mốc này trong tháng. Không tự chuyển tháng. ':''}WIN chỉ có nghĩa ít nhất một số xuất hiện. ${items.some(x=>x.picks.personal)?'Personal':'Universal'} · đài 1.</p>
    <div class="method-note warning"><b>${budget?'Trần ngân sách giả lập: '+money(budget):'Chưa nhập trần ngân sách cá nhân'}</b><span>${budget?'Không mô phỏng chi phí vượt trần.':'Bảng chỉ minh họa số học, giới hạn hiển thị kỹ thuật 1 tỷ đồng; đây không phải ngân sách đề xuất.'} Công thức tăng bội không thay đổi xác suất trúng; chuỗi MISS có thể mất toàn bộ chi phí. Không phải khuyến nghị gỡ lỗ.</span></div>
    ${reviewHTML('Review lịch sử · mức cố định',review,items)}
    ${reviewHTML('Review lịch sử · công thức XSKT cũ',legacy,items)}`;
    datesHost.innerHTML=items.map((x,i)=>`<button data-action="open-date" data-date="${esc(x.r.date)}" data-follow-station="${esc(x.station)}"><span>Ngày ${i+1} · ${fmtDate(x.r.date)}</span><b>${x.selected.map(esc).join(' · ')}</b><small>Đài 1: ${esc(x.station)} · <strong class="best32-${x.status}">${labels[x.status]}</strong>${x.result?.win?` · ${esc(x.result.hitNumbers.join(', '))} · ${x.result.totalNhay} nháy`:''}</small></button>`).join('')||'<div class="empty-note">Không có ngày trong tháng.</div>';
    const stageText=(x)=>({stop:'DỪNG MÔ PHỎNG · WIN đầu tiên',skipped:'Sau điểm dừng · không tính vào P/L',budget:'Vượt trần · dừng mô phỏng',unresolved:'Chưa thể chấm chu kỳ',unverified:'Kỳ trước chưa xác định',settled:'Đã chấm'}[x.review]||'—');
    const planDetails=(p,x)=>!p?.allowed?'<p class="helper">Ngoài giới hạn mô phỏng.</p>':`<div class="guide33-grid">${metric('Bước / số',p.steps)}${metric('Tiền / số',money(p.perNumber))}${metric('Tổng chi phí ngày',money(p.dayTotal))}${metric('Chi phí trước ngày này nếu toàn MISS',money(p.lossBefore))}${metric('Lũy kế nếu toàn MISS',money(p.cumulative))}${metric('Thu về 1 nháy',money(p.gross))}${metric('P/L nếu 1 nháy và các ngày trước MISS',signed(p.netIfOneHit))}${metric('P/L nếu tiếp tục MISS',signed(-p.cumulative))}</div>${x.net!==null?`<p><b>P/L đã chấm: ${signed(x.net)}</b> · ${x.result?.totalNhay||0} nháy</p>`:''}`;
    planHost.innerHTML=items.map((x,i)=>{const f=review.rows[i],l=legacy.rows[i];return `<article class="guide33-row"><div class="guide33-head"><b>Ngày ${i+1} · ${fmtDate(x.r.date)} · ${esc(x.station)}</b><strong class="best32-${x.status}">${labels[x.status]}</strong></div><p>Top ${top} · ${x.selected.map(esc).join(' · ')}${x.result?.win?' · '+x.result.totalNhay+' nháy':''}</p><details ${i===0?'open':''}><summary>Mức cố định · ${stageText(f)}</summary>${planDetails(f.plan,f)}</details><details open><summary>Kịch bản công thức cũ nếu mọi kỳ trước MISS · ${stageText(l)}</summary>${planDetails(l.plan,l)}</details>${l.review==='stop'?'<p><b>Điểm dừng hồi cứu: đã WIN.</b> Các kỳ sau chỉ là giả định, không tính vào kết quả.</p>':''}</article>`}).join('');
    formula.innerHTML='<b>Quy ước và giới hạn</b><span>1 bước = 15.000đ/số, trả thưởng giả định 80.000đ/nháy/bước. Kịch bản cũ tính theo bội của tiền ngày 1 và giả định tất cả ngày trước đều MISS; bảng này là đối chiếu số học, không phải mức tiền khuyến nghị. WIN có thể không đồng nghĩa với lãi ở mức cố định. Review dừng ở WIN đầu tiên, hết ngày, dữ liệu chưa xác định hoặc vượt trần; các ngày sau không tính P/L. Không có công thức bảo đảm lợi nhuận.</span>';
  }catch(e){if(current())summary.innerHTML=`<div class="error-card">${esc(e.message)}</div>`;}
}
