import {loadRecord,loadBestDays,loadMonth,loadRange,loadYear,loadHistoryIndex,loadResearch,historyDay,fmtDate,monthLabel,firstOfMonth,shiftMonth,daysInMonth,weekdayMon0,addDays,MIN_DATE,MAX_DATE,pct,esc,money,parseISO} from './data.js';
import {readProfile,analyzeProfile,personalRanking,picksFor,elementLabel} from './personal.js';
import {scorePicks,theoreticalTwoPickBaseline,stationMatch,stationsForDate,stationHistory,uniqueHitRate,numberTable,anomalyFor,anomalyLabel,matchSummaryText,BASELINE_TWO_18} from './history.js';
import {buildStopOnWinPlan,normalizeStake,STEP,PAYOUT_PER_STEP} from './guide.js';

function modeSwitch(state,profile){return `<div class="mode-switch"><button data-action="mode" data-mode="universal" class="${state.mode==='universal'?'active':''}">🌤 Thiên thời</button><button data-action="mode" data-mode="personal" class="${state.mode==='personal'?'active':''}">👤 Cá nhân${profile?'':' · chưa có hồ sơ'}</button></div>`}
function tierClass(t){return `tier-${String(t||'C').toLowerCase()}`}
function topChips(nums){return `<div class="top5">${(nums||[]).map((n,i)=>`<span class="chip ${i<2?'strong':''}">${esc(n)}</span>`).join('')}</div>`}
function calendarMeta(r){const c=r.calendar||{};return `${esc(c.day||'—')} · ${esc(c.solar_term||'—')} · Trực ${esc(c.officer||'—')} · ${esc(c.nayin||'—')}`}
function dayCard(r,picks,extra=''){const u=r.universal;return `<button class="day-card" data-action="open-date" data-date="${r.date}"><div class="day-date"><b>${fmtDate(r.date,false)}</b><span>${esc((r.calendar||{}).day||'')}</span></div><div class="day-main"><div><span>Chủ</span><b>${esc(picks.primary)} · ${esc(picks.secondary)}</b></div><small>${calendarMeta(r)}</small>${extra}</div><div class="day-score ${tierClass(u.tier)}"><b>${u.day_score}</b><span>${esc(u.tier)}</span><small>#${u.month_rank??'—'}</small></div></button>`}

export async function renderToday(ctx){
  const {state,$}=ctx,host=$('#todayContent');host.innerHTML='<div class="skeleton-card">Đang tải dữ liệu…</div>';
  try{
    const [r,hist,research]=await Promise.all([loadRecord(state.date),loadHistoryIndex(),loadResearch()]);
    const profile=readProfile(),personal=personalRanking(r,profile),view=picksFor(r,state.mode,profile),u=r.universal;
    if(state.mode==='personal'&&!profile) state.mode='universal';
    const actual=historyDay(hist,r.date),draws=actual?.draws||[],uResult=draws.length?scorePicks([u.primary,u.secondary],draws):null,pResult=draws.length&&personal?scorePicks([personal.primary,personal.secondary],draws):null;
    const sm=stationMatch(research,r.date,[view.primary,view.secondary]);
    const rankRows=(view.ranking||[]).slice(0,10).map((x,i)=>{
      const rank=x.rank??i+1,uRank=x.uRank??x.rank,delta=x.uRank?x.uRank-(i+1):0;
      return `<div class="rank-row"><b>#${rank}</b><span class="rank-num">${esc(x.number)}</span><span class="rank-note">${x.uRank?`Universal #${x.uRank} ${delta>0?`· ↑${delta}`:delta<0?`· ↓${Math.abs(delta)}`:'· giữ'}`:`Agreement ${x.agreement}/5`}</span><b>${Number(x.score).toFixed(1)}</b></div>`;
    }).join('');
    const difference=personal?differenceBlock(r,personal):`<div class="empty-note">Chưa có Personal Overlay. Tạo hồ sơ trong <button data-action="open-more" data-more="profile">Thêm → Hồ sơ Personal</button>.</div>`;
    const resultBlock=!draws.length?`<div class="result-strip pending"><b>CHƯA CÓ KẾT QUẢ</b><span>${hist.updatedThrough?`History cập nhật tới ${fmtDate(hist.updatedThrough)}`:'Chưa bootstrap history vào XSKT2.'}</span></div>`:
      `<div class="result-strip ${uResult.win?'win':'miss'}"><div><b>Universal · ${uResult.win?'WIN':'MISS'}</b><span>${uResult.totalNhay} nháy · ${uResult.hitNumbers.join(', ')||'không trúng'}</span></div>${personal?`<div><b>Personal · ${pResult.win?'WIN':'MISS'}</b><span>${pResult.totalNhay} nháy · ${pResult.hitNumbers.join(', ')||'không trúng'}</span></div>`:''}</div>`;
    host.innerHTML=`${modeSwitch(state,profile)}
      <section class="hero-card ${state.mode==='personal'&&personal?'personal':''}">
        <div class="hero-top"><div><div class="eyebrow">${state.mode==='personal'&&personal?'PERSONAL OVERLAY':'UNIVERSAL · THIÊN THỜI'} · ${fmtDate(r.date)}</div><h2>${esc((r.calendar||{}).day||'')}</h2><p>${calendarMeta(r)}</p></div><span class="tier-pill ${tierClass(u.tier)}">Tier ${esc(u.tier)}</span></div>
        <div class="picks"><div class="pick"><span>Chủ 1</span><b>${esc(view.primary)}</b></div><div class="pick"><span>Chủ 2</span><b>${esc(view.secondary)}</b></div></div>
        <div class="metrics"><div><b>${u.day_score}</b><span>Day Score</span></div><div><b>${u.agreement}/5</b><span>Agreement</span></div><div><b>#${u.month_rank??'—'}</b><span>Rank tháng</span></div><div><b>${esc(u.tier)}</b><span>Tier</span></div></div>
      </section>
      ${resultBlock}
      <section class="card"><div class="card-head"><div><span>TOP 5</span><h3>${state.mode==='personal'&&personal?'Personal ranking':'Universal ranking'}</h3></div></div>${topChips(view.top5)}</section>
      <section class="card"><div class="card-head"><div><span>RANKING</span><h3>Top 10 hôm nay</h3></div><small>Score ≠ xác suất</small></div><div class="rank-table">${rankRows}</div></section>
      <section class="card"><div class="card-head"><div><span>UNIVERSAL ↔ PERSONAL</span><h3>Khác biệt & giải thích</h3></div></div>${difference}</section>
      <section class="research-card"><div class="research-head"><div><span>STATION MATCH · RESEARCH ONLY</span><b>${esc(matchSummaryText(sm))}</b></div><button data-action="open-more" data-more="compare">Mở đối chiếu</button></div><p>Core đã khóa trước khi nhìn history. Recent Form / Station Match chỉ đối chiếu, không sửa Chủ 1/Chủ 2.</p></section>`;
  }catch(e){host.innerHTML=`<div class="error-card"><b>Không tải được ngày</b><span>${esc(e.message)}</span></div>`}
}

function differenceBlock(r,p){
  const uTop=r.universal.ranking.slice(0,5),map=new Map(p.ranking.map(x=>[x.number,x]));
  return `<div class="difference-grid">${uTop.map(u=>{const x=map.get(u.number);if(!x)return'';const delta=u.rank-x.rank;return `<div><span>${esc(u.number)}</span><b>Universal #${u.rank} → Personal #${x.rank}</b><small>${delta>0?`Boost +${delta} hạng`:delta<0?`Penalty ${delta} hạng`:'Giữ nguyên'} · overlay ${x.personalComponent.toFixed(1)}/100</small></div>`}).join('')}</div>`;
}

export async function renderBest(ctx){
  const {state,$}=ctx;$('#bestPeriod').textContent=monthLabel(state.bestStart);$('#bestStart').value=state.bestStart;
  const list=$('#bestList');list.innerHTML='<div class="skeleton-card">Đang xếp hạng…</div>';
  try{const rows=await loadBestDays(state.bestStart,state.bestCount),profile=readProfile();
    const scores=rows.map(x=>x.universal.day_score),avg=scores.reduce((a,b)=>a+b,0)/(scores.length||1);
    $('#bestSummary').innerHTML=`<div class="summary-strip"><div><span>${state.bestCount} ngày</span><b>${rows.length?`${fmtDate(rows[0].date,false)} → ${fmtDate(rows.at(-1).date,false)}`:'—'}</b></div><div><span>Score TB</span><b>${avg.toFixed(1)}</b></div><div><span>Mode số</span><b>${state.mode==='personal'&&profile?'Personal':'Universal'}</b></div></div>`;
    list.innerHTML=rows.map(r=>dayCard(r,picksFor(r,state.mode,profile),`<small>Agreement ${r.universal.agreement}/5</small>`)).join('');
  }catch(e){list.innerHTML=`<div class="error-card">${esc(e.message)}</div>`}
}

export async function renderGuide(ctx){
  const {state,$}=ctx,normalized=normalizeStake(state.guideStake);$('#guideStake').value=state.guideStake;$('#guidePeriod').textContent=monthLabel(state.guideStart);
  $('#stakeWarning').textContent=normalized.rounded?`Số tiền được làm tròn lên ${money(normalized.stake)} = ${normalized.steps} bước.`:`${normalized.steps} bước · mỗi bước ${money(STEP)}/số.`;
  try{const dates=await loadBestDays(state.guideStart,state.guideDays),plan=buildStopOnWinPlan(state.guideDays,state.guideStake),profile=readProfile();
    $('#guideSummary').innerHTML=`<div class="summary-strip"><div><span>Chu kỳ</span><b>${state.guideDays} ngày tốt</b></div><div><span>Ngày 1</span><b>${money(plan.first.stake)}/số</b></div><div><span>Max outlay nếu toàn MISS</span><b>${money(plan.maxOutlay)}</b></div></div>`;
    $('#guideDates').innerHTML=dates.map((r,i)=>{const p=picksFor(r,state.mode,profile);return `<button data-action="open-date" data-date="${r.date}"><span>Ngày ${i+1}</span><b>${fmtDate(r.date)} · ${p.primary} · ${p.secondary}</b><small>Score ${r.universal.day_score} · Tier ${r.universal.tier}</small></button>`}).join('');
    $('#guidePlan').innerHTML=plan.rows.map((x,i)=>`<div class="plan-row"><div><span>Ngày ${i+1}</span><b>${x.steps} bước</b></div><div><span>Mỗi số</span><b>${money(x.stakePerNumber)}</b></div><div><span>Tổng cược</span><b>${money(x.totalStake)}</b></div><div><span>Nếu 1 nháy</span><b class="${x.netIfOneHit>0?'positive':''}">${x.netIfOneHit>=0?'+':''}${money(x.netIfOneHit)}</b></div></div>`).join('');
    $('#guideFormula').innerHTML=`<b>Công thức đang dùng</b><span>1 bước = ${money(STEP)}/số · 2 số/ngày · payout giả định ${money(STEP)} → ${money(PAYOUT_PER_STEP)}/nháy. Bước ngày sau là bội nhỏ nhất để <em>một nháy</em> có thể cover phần outlay trước đó theo giả định này.</span>`;
  }catch(e){$('#guidePlan').innerHTML=`<div class="error-card">${esc(e.message)}</div>`}
}

function pickWindowDates(index,state){
  const dates=Object.keys(index.dates||{}).filter(d=>d>=MIN_DATE&&d<=state.date).sort();if(!dates.length)return[];
  const end=dates.at(-1);if(state.statsWindow==='all')return dates;
  if(state.statsWindow==='month')return dates.filter(d=>d.startsWith(end.slice(0,7)));
  const n=Number(state.statsWindow);return dates.slice(-n);
}

export async function renderStats(ctx){
  const {state,$}=ctx,idx=await loadHistoryIndex(),dates=pickWindowDates(idx,state);$('#statsKpis').innerHTML='';
  if(!dates.length){
    $('#statsFreshness').innerHTML=`<div class="empty-state"><b>Chưa có history trong XSKT2</b><span>UI đã hoàn chỉnh nhưng dashboard cần raw XSMN. Chạy một lần <code>bash scripts/import_legacy_history.sh</code> rồi <code>python scripts/rebuild_stats.py</code>.</span></div>`;$('#statsBaseline').innerHTML='';$('#statsDays').innerHTML='';return;
  }
  $('#statsFreshness').innerHTML=`<div class="freshness">History tới <b>${fmtDate(idx.updatedThrough)}</b> · cửa sổ <b>${dates.length} ngày có dữ liệu</b></div>`;
  const records=await loadRange(dates[0],dates.at(-1)),byDate=new Map(records.map(r=>[r.date,r])),profile=readProfile(),rows=[];
  for(const d of dates){const r=byDate.get(d),h=idx.dates[d];if(!r||!h)continue;const draws=state.statsScope==='station1'?h.draws.slice(0,1):h.draws;const up=[r.universal.primary,r.universal.secondary],ur=scorePicks(up,draws),p=personalRanking(r,profile),pr=p?scorePicks([p.primary,p.secondary],draws):null;rows.push({date:d,r,draws,up,ur,p,pr,baseline:theoreticalTwoPickBaseline(draws.reduce((s,x)=>s+(x.tails||[]).length,0))})}
  const uWins=rows.filter(x=>x.ur.win).length,pRows=rows.filter(x=>x.pr),pWins=pRows.filter(x=>x.pr.win).length,uRate=uWins/(rows.length||1),pRate=pRows.length?pWins/pRows.length:null,baseline=rows.reduce((s,x)=>s+x.baseline,0)/(rows.length||1),uNhay=rows.reduce((s,x)=>s+x.ur.totalNhay,0),pNhay=pRows.reduce((s,x)=>s+x.pr.totalNhay,0);
  $('#statsKpis').innerHTML=`<div class="kpi primary"><span>Universal Chủ 1+2</span><b>${pct(uRate)}</b><small>${uWins}/${rows.length} WIN · ${uNhay} nháy</small></div><div class="kpi personal"><span>Personal Chủ 1+2</span><b>${pRate===null?'—':pct(pRate)}</b><small>${pRate===null?'Tạo profile để chấm':`${pWins}/${pRows.length} WIN · ${pNhay} nháy`}</small></div><div class="kpi"><span>Random baseline</span><b>${pct(baseline)}</b><small>Lý thuyết · theo số tails/scope</small></div><div class="kpi"><span>Personal lift</span><b>${pRate===null?'—':`${pRate-uRate>=0?'+':''}${((pRate-uRate)*100).toFixed(1)}đ%`}</b><small>Personal − Universal</small></div>`;
  $('#statsBaseline').innerHTML=`<div class="baseline-card"><b>Delta Universal vs baseline: ${(uRate-baseline)>=0?'+':''}${((uRate-baseline)*100).toFixed(1)} điểm %</b><span>${state.statsScope==='station1'?`Baseline 2 số / 18 tails ≈ ${pct(BASELINE_TWO_18,2)}.`:'Any Station dùng baseline lý thuyết theo tổng số tails thực tế từng ngày.'} Đây không phải predictive probability.</span></div>`;
  const filtered=rows.filter(x=>state.statsFilter==='ALL'||(state.statsFilter==='WIN'?x.ur.win:!x.ur.win)).reverse();
  $('#statsDays').innerHTML=filtered.slice(0,120).map(x=>`<button class="stats-day ${x.ur.win?'win':'miss'}" data-action="open-date" data-date="${x.date}"><div><span>${fmtDate(x.date)}</span><b>${x.up.join(' · ')}</b><small>${x.ur.hitNumbers.length?`Hit ${x.ur.hitNumbers.join(', ')} · ${x.ur.totalNhay} nháy`:'Không xuất hiện'}</small></div><strong>${x.ur.win?'WIN':'MISS'}</strong>${x.pr?`<em>Personal ${x.pr.win?'WIN':'MISS'}</em>`:''}</button>`).join('')||'<div class="empty-note">Không có ngày theo bộ lọc.</div>';
}

export async function renderCalendar(ctx){
  const {state,$}=ctx;$('#calPeriod').textContent=monthLabel(state.calendarMonth);const rows=await loadMonth(state.calendarMonth),offset=weekdayMon0(rows[0]?.date||state.calendarMonth),cells=[];for(let i=0;i<offset;i++)cells.push('<span class="calendar-empty"></span>');
  rows.forEach(r=>{const p=picksFor(r,state.mode,readProfile());cells.push(`<button class="calendar-day ${tierClass(r.universal.tier)}" data-action="open-date" data-date="${r.date}"><span>${Number(r.date.slice(8))}</span><b>${p.primary}·${p.secondary}</b><small>${r.universal.day_score}</small></button>`)});$('#calendarGrid').innerHTML=cells.join('');
}

export async function renderCompare(ctx){
  const {state,$}=ctx,[r,research]=await Promise.all([loadRecord(state.date),loadResearch()]),profile=readProfile(),p=picksFor(r,state.mode,profile),picks=[p.primary,p.secondary],stations=stationsForDate(r.date),sm=stationMatch(research,r.date,picks);
  $('#compareDate').innerHTML=`<div class="summary-strip"><div><span>Ngày</span><b>${fmtDate(r.date)}</b></div><div><span>Core đang đối chiếu</span><b>${picks.join(' · ')}</b></div><div><span>Mode</span><b>${state.mode==='personal'&&profile?'Personal':'Universal'}</b></div></div>`;
  $('#stationMatchOverview').innerHTML=sm.ranked.length?`<div class="station-match ${sm.clear?'clear':'neutral'}"><span>STATION MATCH</span><b>${esc(matchSummaryText(sm))}</b>${sm.ranked.map((x,i)=>`<div><strong>#${i+1} ${esc(x.station)}</strong><em>${pct(x.adjusted)}</em><small>10/30/100: ${pct(x.r10)} · ${pct(x.r30)} · ${pct(x.r100)}</small></div>`).join('')}</div>`:`<div class="empty-state"><b>Chưa đủ recent history</b><span>Bootstrap history và rebuild stats để bật Station Match.</span></div>`;
  if(!state.compareStation||!stations.includes(state.compareStation))state.compareStation=stations[0];
  $('#compareStations').innerHTML=stations.map(s=>`<button data-action="station" data-station="${esc(s)}" class="${s===state.compareStation?'active':''}">${esc(s)}</button>`).join('');
  const st=stationHistory(research,state.compareStation);if(!st){$('#comparePicks').innerHTML='<div class="empty-note">Chưa có dữ liệu đài này.</div>';$('#recentTop').innerHTML='';$('#numberGrid').innerHTML='';$('#compareWarning').innerHTML='<b>Research only</b><span>History không được sửa core.</span>';return}
  $('#comparePicks').innerHTML=picks.map((num,i)=>{const m10=uniqueHitRate(st,num,10),m30=uniqueHitRate(st,num,30),m100=uniqueHitRate(st,num,100),a=anomalyFor(st,num),lab=anomalyLabel(a);return `<div class="pick-history"><div><span>Chủ ${i+1}</span><b>${num}</b></div><div><span>10 kỳ</span><b>${pct(m10.rate)}</b></div><div><span>30 kỳ</span><b>${pct(m30.rate)}</b></div><div><span>100 kỳ</span><b>${pct(m100.rate)}</b></div><em class="anom-${lab.cls}">${lab.text}</em></div>`}).join('');
  const table=numberTable(st,state.compareWindow),top=table.slice(0,10);$('#recentTop').innerHTML=`<div class="recent-top-list">${top.map((x,i)=>`<div><b>#${i+1}</b><span>${x.num}</span><strong>${pct(x.rate)}</strong><small>${x.hits}/${x.n} kỳ</small></div>`).join('')}</div>`;
  const byNum=new Map(table.map(x=>[x.num,x]));$('#numberGrid').innerHTML=Array.from({length:100},(_,i)=>String(i).padStart(2,'0')).map(n=>{const x=byNum.get(n),isPick=picks.includes(n);return `<div class="number-cell ${isPick?'core':''}"><b>${n}</b><span>${pct(x?.rate||0,0)}</span></div>`}).join('');
  $('#compareWarning').innerHTML='<b>Không cộng điểm</b><span>Station Match, Recent Form và Anomaly Watch chỉ là lớp research sau khi core đã freeze. Statistical anomaly ≠ nguyên nhân vật lý.</span>';
}

export async function renderAll(ctx){
  const {state,$}=ctx,rows=(await loadYear(state.allYear)).filter(r=>Number(r.date.slice(5,7))===state.allMonth),q=(state.allSearch||'').trim().toLowerCase(),profile=readProfile();
  const filtered=rows.filter(r=>(state.allTier==='ALL'||r.universal.tier===state.allTier)&&(!q||[r.date,r.calendar?.day,r.calendar?.year,r.calendar?.month,r.calendar?.nayin,r.calendar?.solar_term,r.universal.primary,r.universal.secondary,...r.universal.top5].join(' ').toLowerCase().includes(q)));
  $('#allSummary').textContent=`${filtered.length}/${rows.length} ngày · ${state.allTier==='ALL'?'mọi Tier':`Tier ${state.allTier}`} · ${state.mode==='personal'&&profile?'hiển thị Personal picks':'hiển thị Universal picks'}`;
  $('#allDays').innerHTML=filtered.map(r=>dayCard(r,picksFor(r,state.mode,profile))).join('')||'<div class="empty-note">Không có ngày phù hợp.</div>';
}

export function renderProfile(ctx){
  const {$}=ctx,p=readProfile();$('#profileLabel').value=p?.label||'';$('#birthDate').value=p?.birthDate||'';$('#birthTime').value=p?.birthTime||'12:00';$('#birthPlace').value=p?.birthPlace||'';const a=analyzeProfile(p);
  $('#profileAnalysis').innerHTML=!a?'<div class="empty-state"><b>Chưa có hồ sơ</b><span>Personal chỉ hoạt động khi có ngày sinh. Hồ sơ được lưu local trên trình duyệt này.</span></div>':`<div class="card"><div class="card-head"><div><span>ELEMENT BALANCE</span><h3>${esc(p.label||'Hồ sơ Personal')}</h3></div></div><div class="element-bars">${Object.entries(a.distribution).map(([e,v])=>`<div><span>${elementLabel(e)}</span><i><em style="width:${Math.round(v*100)}%"></em></i><b>${Math.round(v*100)}%</b></div>`).join('')}</div><p class="helper">Personal V1 dùng element-balance overlay để rerank Universal Top 20 với trọng số 80% Universal + 20% Personal. Tên/nơi sinh không tạo số.</p></div>`;
}

export function renderMethod(ctx){ctx.$('#methodContent').innerHTML=`
  <div class="method-section"><h3>1. Luồng bắt buộc</h3><div class="flow-card"><b>Universal Core</b><i>↓</i><b>Universal 00–99 Ranking</b><i>↓</i><b>Personal Overlay</b><i>↓</i><b>Personal Ranking</b></div><p>Universal tuyệt đối không dùng ngày sinh, tên, giới tính hay kết quả XSMN. Personal chỉ rerank Universal.</p></div>
  <div class="method-section"><h3>2. Universal V1</h3><div class="weight-list"><div><span>Seasonal Qi / Ngũ hành khí</span><b>30%</b></div><div><span>Can Chi Relations</span><b>20%</b></div><div><span>12 Trực + Nạp âm</span><b>15%</b></div><div><span>Kinh Dịch</span><b>25%</b></div><div><span>Hà Đồ / Lạc Thư</span><b>10%</b></div></div><div class="method-note"><b>Digit mapping</b><span>Thủy 1·6 · Hỏa 2·7 · Mộc 3·8 · Kim 4·9 · Thổ 0·5.</span></div></div>
  <div class="method-section"><h3>3. Score / Agreement / Tier</h3><p><b>Score 78/100 không có nghĩa 78% khả năng trúng.</b> Score là ranking/coherence. Agreement đếm số module cùng support. Tier dùng để rank chất lượng ngày.</p></div>
  <div class="method-section"><h3>4. Personal V1</h3><div class="formula-card">Final Personal Score = <b>80% Universal</b> + <b>20% Personal Overlay</b></div><p>Candidate pool chỉ lấy Universal Top 20; Personal không được dựng một engine số riêng hoàn toàn.</p></div>
  <div class="method-section"><h3>5. History integrity</h3><div class="flow-card"><b>Core Prediction</b><i>→</i><b>Station Match</b><i>→</i><b>Recent Form</b><i>→</i><b>Anomaly Watch</b></div><p>Các lớp sau chỉ đối chiếu/research/cảnh báo, không sửa Chủ 1/Chủ 2 đã freeze. Duplicate tails được giữ để đếm nháy.</p></div>
  <div class="method-section"><h3>6. Backtest</h3><div class="formula-card"><b>SPECIFY → FREEZE → TEST</b></div><p>2005–2018 Development · 2019–2022 Validation · 2023–2025 Holdout · 2026+ Forward Test. Nếu đổi công thức sau holdout phải bump version.</p></div>`}

export async function renderAbout(ctx){const {$}=ctx,[hist,research]=await Promise.all([loadHistoryIndex(),loadResearch()]);$('#aboutContent').innerHTML=`<div class="about-grid"><div><span>Universal Core</span><b>V1.0</b></div><div><span>Personal Overlay</span><b>V1.0</b></div><div><span>Prediction calendar</span><b>2026 → 2050</b></div><div><span>History updated</span><b>${hist.updatedThrough?fmtDate(hist.updatedThrough):'Chưa bootstrap'}</b></div><div><span>Research updated</span><b>${research.updatedThrough?fmtDate(research.updatedThrough):'Chưa có'}</b></div><div><span>Timezone</span><b>Asia/Ho_Chi_Minh</b></div></div><div class="method-note important"><b>Prediction integrity</b><span>History append không được thay Universal Chủ 1/Chủ 2 của cùng ngày. Test <code>test_no_future_leakage.py</code> bảo vệ invariant này.</span></div><div class="method-note"><b>Domain</b><span>xskt2.khaitringuyen.com · repo trinkse61538/xskt2.</span></div>`}
