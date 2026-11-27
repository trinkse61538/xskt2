import {loadArchiveYear,archiveDetails,archiveSummary,archiveQualityHTML} from './archive-v394.js?v=3.10.0';
import {dayStations,matchesDay,stationsHTML,historyDetails,historyMonthSummary} from './all-days-v36.js?v=3.10.0';
import {enrichResearch} from './research-v2.js';
import {renderStationPanel,scopedDraws,stationResults} from './station-v31.js';
import {healthPanel,statsBounds,renderAboutV2} from './health-v2.js';
import {loadHealth,completedISO} from './data.js';
import {loadMonthlyDays,monthlyResult,monthlySummary} from './monthly-v32.js?v=3.5.0';
import {loadRecord,loadBestDays,loadMonth,loadRange,loadYear,loadHistoryIndex,loadResearch,historyDay,fmtDate,monthLabel,firstOfMonth,shiftMonth,daysInMonth,weekdayMon0,addDays,MIN_DATE,MAX_DATE,pct,esc,money,parseISO} from './data.js';
import {readProfile,analyzeProfile,personalRanking,picksFor,elementLabel} from './personal.js';
import {personalCore,compareRankings,pairedSummary} from './personal-research-v310.js?v=3.10.0';
import {scorePicks,theoreticalTwoPickBaseline,stationMatch,stationsForDate,stationHistory,uniqueHitRate,numberTable,anomalyFor,anomalyLabel,matchSummaryText,BASELINE_TWO_18} from './history.js';
import {renderGuideV35} from './guide-v35.js?v=3.10.0';

function modeSwitch(state,profile){return `<div class="mode-switch"><button data-action="mode" data-mode="universal" class="${state.mode==='universal'?'active':''}">🌤 Thiên thời</button><button data-action="mode" data-mode="personal" class="${state.mode==='personal'?'active':''}">👤 Cá nhân${profile?'':' · chưa có hồ sơ'}</button></div>`}
function tierClass(t){return `tier-${String(t||'C').toLowerCase()}`}
function topChips(nums){return `<div class="top5">${(nums||[]).map((n,i)=>`<span class="chip ${i<2?'strong':''}">${esc(n)}</span>`).join('')}</div>`}
function calendarMeta(r){const c=r.calendar||{};return `${esc(c.day||'—')} · ${esc(c.solar_term?.name||c.solar_term||'—')} · Trực ${esc(c.officer||'—')} · ${esc(c.nayin?.name||c.nayin||'—')}`}
function dayCard(r,picks,extra=''){const u=r.universal;return `<button class="day-card" data-action="open-date" data-date="${r.date}"><div class="day-date"><b>${fmtDate(r.date,false)}</b><span>${esc((r.calendar||{}).day||'')}</span></div><div class="day-main"><div><span>Chủ</span><b>${esc(picks.primary)} · ${esc(picks.secondary)}</b></div><small>${calendarMeta(r)}</small>${extra}</div><div class="day-score ${tierClass(u.tier)}"><b>${u.day_score}</b><span>${esc(u.tier)}</span><small>#${u.month_rank??'—'}</small></div></button>`}

export async function renderToday(ctx){
  const {state,$}=ctx,host=$('#todayContent');host.innerHTML='<div class="skeleton-card">Đang tải dữ liệu…</div>';
  try{
    const selected=state.date;
    const [r,hist]=await Promise.all([loadRecord(selected),loadHistoryIndex(selected).catch(()=>({dates:{},updatedThrough:null,unavailable:true}))]);
    if(state.date!==selected)return;
    const profile=readProfile(),personal=personalRanking(r,profile),view=picksFor(r,state.mode,profile),u=r.universal;
    if(state.mode==='personal'&&!profile) state.mode='universal';
    const actual=historyDay(hist,r.date),draws=actual?.draws||[];
    const rankRows=(view.ranking||[]).slice(0,10).map((x,i)=>{
      const rank=x.rank??i+1,uRank=x.uRank??x.rank,delta=x.uRank?x.uRank-(i+1):0;
      return `<div class="rank-row"><b>#${rank}</b><span class="rank-num">${esc(x.number)}</span><span class="rank-note">${x.uRank?`Universal #${x.uRank} ${delta>0?`· ↑${delta}`:delta<0?`· ↓${Math.abs(delta)}`:'· giữ'}`:`Agreement ${x.agreement}/5`}</span><b>${Number(x.score).toFixed(1)}</b></div>`;
    }).join('');
    const difference=personal?differenceBlock(r,personal):`<div class="empty-note">Chưa có Personal Overlay. Tạo hồ sơ trong <button data-action="open-more" data-more="profile">Thêm → Hồ sơ Personal</button>.</div>`;
    host.innerHTML=`${modeSwitch(state,profile)}
      <section class="hero-card ${state.mode==='personal'&&personal?'personal':''}">
        <div class="hero-top"><div><div class="eyebrow">${state.mode==='personal'&&personal?'PERSONAL OVERLAY':'UNIVERSAL · THIÊN THỜI'} · ${fmtDate(r.date)}</div><h2>${esc((r.calendar||{}).day||'')}</h2><p>${calendarMeta(r)}</p></div><span class="tier-pill ${tierClass(u.tier)}">Tier ${esc(u.tier)}</span></div>
        <div class="picks"><div class="pick"><span>Chủ 1</span><b>${esc(view.primary)}</b></div><div class="pick"><span>Chủ 2</span><b>${esc(view.secondary)}</b></div></div>
        <div class="metrics"><div><b>${u.day_score}</b><span>Day Score</span></div><div><b>${u.agreement}/5</b><span>Agreement</span></div><div><b>#${u.month_rank??'—'}</b><span>Rank tháng</span></div><div><b>${esc(u.tier)}</b><span>Tier</span></div></div>
      </section>
      <div id="todayStationV31"></div>
      <section class="card"><div class="card-head"><div><span>TOP 5</span><h3>${state.mode==='personal'&&personal?'Personal ranking':'Universal ranking'}</h3></div></div>${topChips(view.top5)}</section>
      <section class="card"><div class="card-head"><div><span>RANKING</span><h3>Top 10 hôm nay</h3></div><small>Score ≠ xác suất</small></div><div class="rank-table">${rankRows}</div></section>
      <section class="card"><div class="card-head"><div><span>UNIVERSAL ↔ PERSONAL</span><h3>Khác biệt & giải thích</h3></div></div>${difference}</section>
`;
    renderStationPanel(host.querySelector('#todayStationV31'),{date:r.date,schedule:stationsForDate(r.date),draws,models:[{id:'universal',label:'Universal · Thiên thời',picks:[u.primary,u.secondary]},...(personal?[{id:'personal',label:'Personal · Cá nhân',picks:[personal.primary,personal.secondary]}]:[])],active:state.mode,historyUnavailable:hist.unavailable,expectedThrough:hist.expectedThrough,loadResearch,fmtDate,enrichResearch});
  }catch(e){host.innerHTML=`<div class="error-card"><b>Không tải được ngày</b><span>${esc(e.message)}</span></div>`}
}

function personalKpis(items){return `<div class="personal-v310-kpis">${items.map(([label,value])=>`<div><span>${esc(label)}</span><b>${esc(String(value))}</b></div>`).join('')}</div>`;}
const signedPoint=x=>`${x>=0?'+':''}${x.toFixed(2)}`;
function differenceBlock(r,p){
  const c=compareRankings(r.universal,p);if(!c)return '<p class="helper">Không đủ dữ liệu để so sánh.</p>';
  const core=personalCore(p.analysis.affinity),groups=new Set(core.map(x=>x.score.toFixed(6))).size;
  return `${personalKpis([['Trùng Top 1',c.top1+'/1'],['Trùng Top 2',c.top2+'/2'],['Trùng Top 5',c.top5+'/5']])}
  <p class="personal-v310-note">${c.top2===2?'Hai mô hình có cùng tập Top 2.':'Hai mô hình có tập Top 2 khác nhau.'} Điểm Personal = 80% Universal + 20% điểm hồ sơ. Điểm hồ sơ được tính riêng cho 00–99 (${core.length} số, ${groups} nhóm điểm phân biệt); kết quả kết hợp vẫn giới hạn trong Universal Top 20. Không ép đổi hạng.</p>
  <div class="personal-v310-scroll"><table class="personal-v310-table"><thead><tr><th>Số / hành</th><th>U hạng</th><th>P hạng</th><th>U điểm</th><th>Hồ sơ</th><th>P điểm</th><th>Δ điểm</th></tr></thead><tbody>${c.rows.map(x=>`<tr><td><b>${esc(x.number)}</b><small>${esc(x.elements.map(elementLabel).join(' · '))}</small></td><td>#${x.uRank}</td><td>#${x.pRank}<small>${x.rankDelta===0?'Giữ':x.rankDelta>0?'↑'+x.rankDelta:'↓'+(-x.rankDelta)}</small></td><td>${x.uScore.toFixed(2)}</td><td>${x.overlay.toFixed(2)}</td><td>${x.pScore.toFixed(2)}</td><td>${signedPoint(x.scoreDelta)}</td></tr>`).join('')}</tbody></table></div>
  <p class="personal-v310-note">Bảng gồm hợp của hai Top 5. Các số có cùng cặp ngũ hành (kể cả số đảo) có cùng điểm hồ sơ. Điểm không phải xác suất xuất hiện. Hồ sơ sử dụng phân bố ngũ hành đơn giản, chưa phải phân tích Bát Tự đầy đủ.</p>`;
}
function pairedPanel(rows){
  const p=pairedSummary(rows);if(!p.n)return '<p class="helper">Chưa có mẫu ghép cặp Personal hợp lệ. Tạo hồ sơ để đối chiếu trên thiết bị.</p>';
  const rate=n=>pct(n/p.n,2);
  return `<section class="card"><div class="card-head"><div><span>PERSONAL RESEARCH · V2</span><h3>Đối chiếu ghép cặp · ${p.n} ngày</h3></div></div>
  ${personalKpis([['Universal',rate(p.uWins)],['Personal',rate(p.pWins)],['Ngẫu nhiên (lý thuyết)',pct(p.baseline,2)],['Trùng Top 1',rate(p.top1)],['Trùng cả Top 2',rate(p.top2)],['Trùng cả Top 5',rate(p.top5)],['Chỉ Universal WIN',p.onlyU],['Chỉ Personal WIN',p.onlyP],['Cả hai WIN',p.both],['Cả hai MISS',p.neither],['Trùng trung bình Top 2',(p.shared2/p.n).toFixed(2)+'/2'],['Trùng trung bình Top 5',(p.shared5/p.n).toFixed(2)+'/5']])}
  <p class="personal-v310-note">Chênh lệch Personal − Universal trên cùng mẫu: ${signedPoint(p.lift*100)} điểm %. Trùng Top 2/5 là trùng tập số, không yêu cầu cùng thứ tự. Mẫu bỏ qua ngày thiếu dữ liệu hoặc thiếu hồ sơ. Đây là đối chiếu hồi cứu, không phải dự báo trước kỳ hay bằng chứng lợi thế. Hồ sơ lưu và xử lý tại thiết bị.</p></section>`;
}

export async function renderBest(ctx){
  const {state,$}=ctx,request=Symbol(),start=state.bestStart,count=state.bestCount,mode=state.mode;
  ctx.bestRequest=request;
  $('#bestPeriod').textContent=monthLabel(start);$('#bestStart').value=start;
  const list=$('#bestList'),summary=$('#bestSummary');
  list.innerHTML='<div class="skeleton-card">Đang tải danh sách và kết quả đài 1…</div>';summary.innerHTML='';
  try{
    const [rows,hist]=await Promise.all([loadMonthlyDays(start,count),loadHistoryIndex(start).catch(()=>({dates:{},unavailable:true}))]);
    if(ctx.bestRequest!==request)return;
    const profile=readProfile(),completed=completedISO(),items=rows.map(r=>{
      const picks=picksFor(r,mode,profile);return {r,picks,...monthlyResult(r.date,[picks.primary,picks.secondary],hist,completed)};
    });
    const s=monthlySummary(items),avg=rows.length?rows.reduce((n,r)=>n+r.universal.day_score,0)/rows.length:null;
    const modeLabel=items.some(x=>x.picks.personal)?'Personal':'Universal';
    summary.innerHTML=`<div class="summary-strip"><div><span>${rows.length}/${count} ngày</span><b>${rows.length?`${fmtDate(rows[0].date,false)} → ${fmtDate(rows.at(-1).date,false)}`:'—'}</b></div><div><span>Score TB</span><b>${avg===null?'—':avg.toFixed(1)}</b></div><div><span>Mode số</span><b>${modeLabel}</b></div></div>
      <div class="best32-summary" aria-label="Kết quả đài chính"><div><span>WIN / đã chấm</span><b>${s.wins}/${s.scored} · ${s.scored?pct(s.wins/s.scored):'—'}</b></div><div><span>MISS</span><b>${s.misses}</b></div><div><span>Nháy</span><b>${s.nhay}</b></div><div><span>Chưa chấm</span><b>${s.pending}</b></div></div>
      <p class="helper">Đài 1 theo lịch từng ngày · WIN là có ít nhất một số xuất hiện, không phải lợi nhuận. ${rows.length<count?'Không đủ số ngày trong tháng từ mốc đã chọn; không chuyển sang tháng sau.':''}</p>`;
    list.innerHTML=items.map(x=>{
      const label={win:'WIN',miss:'MISS',pending:'CHỜ KQ',missing:'THIẾU DỮ LIỆU',unavailable:'LỖI TẢI KQ'}[x.status];
      const detail=x.result?(x.result.win?` · Trúng ${x.result.hitNumbers.map(esc).join(', ')} · ${x.result.totalNhay} nháy`:' · Không xuất hiện'):'';
      return dayCard(x.r,x.picks,`<small>Agreement ${x.r.universal.agreement}/5</small><small class="best32-result"><strong class="best32-${x.status}">${label}</strong> · Đài 1: ${esc(x.station)}${detail}</small>`);
    }).join('')||'<div class="empty-note">Không có ngày hợp lệ trong phạm vi tháng đã chọn.</div>';
  }catch(e){if(ctx.bestRequest===request)list.innerHTML=`<div class="error-card">${esc(e.message)}</div>`}
}

export async function renderGuide(ctx){return renderGuideV35(ctx);}

export async function renderStats(ctx){
  const {state,$}=ctx,request=Symbol(),scope=state.statsScope;ctx.statsRequest=request;const h=await loadHealth(),{start,end}=statsBounds(state,h),idx=await loadHistoryIndex(start,end),dates=Object.keys(idx.dates).filter(d=>d>=start&&d<=end).sort();if(ctx.statsRequest!==request)return;$('#statsKpis').innerHTML='';
  const expected=Math.max(0,Math.round((Date.parse(end)-Date.parse(start))/86400000)+1);const coverage=`${fmtDate(start)} – ${fmtDate(end)} · ${dates.length}/${expected} ngày có dữ liệu · ${expected-dates.length} ngày không có bản ghi (gồm NO_DRAW nếu có)`;
  if(!dates.length){
    $('#statsFreshness').innerHTML=`<div class="empty-state"><b>Không có kết quả trong cửa sổ đã chọn</b><span>${esc(coverage)}</span></div>`;$('#statsBaseline').innerHTML='';$('#statsDays').innerHTML='';return;
  }
  $('#statsFreshness').innerHTML=`<div class="freshness">History tới <b>${fmtDate(idx.updatedThrough)}</b> · ${esc(coverage)}</div>`;
  const records=await loadRange(dates[0],dates.at(-1)),byDate=new Map(records.map(r=>[r.date,r])),profile=readProfile(),rows=[];
  if(ctx.statsRequest!==request)return;
  for(const d of dates){const r=byDate.get(d),h=idx.dates[d];if(!r||!h)continue;const draws=scopedDraws(h.draws,scope,stationsForDate(d));if(!draws.length)continue;const up=[r.universal.primary,r.universal.secondary],ur=scorePicks(up,draws),p=personalRanking(r,profile),pr=p?scorePicks([p.primary,p.secondary],draws):null;rows.push({date:d,r,draws,up,ur,p,pr,baseline:theoreticalTwoPickBaseline(draws.reduce((s,x)=>s+(x.tails||[]).length,0))})}
  const scopeLabel=scope==='station1'?'Đài đầu theo lịch':scope==='any'?'Tất cả đài':scope.slice(8);
  $('#statsFreshness').innerHTML=`<div class="freshness">${esc(scopeLabel)} · ${rows.length} ngày/kỳ đủ dữ liệu được chấm · ${esc(coverage)}. Ngày đài không mở hoặc thiếu dữ liệu không tính MISS.</div>`;
  if(!rows.length){$('#statsKpis').innerHTML='<div class="empty-state">Không có kỳ hợp lệ theo phạm vi.</div>';$('#statsBaseline').innerHTML='';$('#statsDays').innerHTML='';return;}
  const uWins=rows.filter(x=>x.ur.win).length,pRows=rows.filter(x=>x.pr),pWins=pRows.filter(x=>x.pr.win).length,uRate=uWins/(rows.length||1),pRate=pRows.length?pWins/pRows.length:null,baseline=rows.reduce((s,x)=>s+x.baseline,0)/(rows.length||1),uNhay=rows.reduce((s,x)=>s+x.ur.totalNhay,0),pNhay=pRows.reduce((s,x)=>s+x.pr.totalNhay,0);
  const pairedURate=pRows.length?pRows.filter(x=>x.ur.win).length/pRows.length:0;
  $('#statsKpis').innerHTML=`<div class="kpi primary"><span>Universal Chủ 1+2</span><b>${pct(uRate)}</b><small>${uWins}/${rows.length} WIN · ${uNhay} nháy</small></div><div class="kpi personal"><span>Personal Chủ 1+2</span><b>${pRate===null?'—':pct(pRate)}</b><small>${pRate===null?'Tạo profile để chấm':`${pWins}/${pRows.length} WIN · ${pNhay} nháy`}</small></div><div class="kpi"><span>Random baseline</span><b>${pct(baseline)}</b><small>Lý thuyết · theo số tails/scope</small></div><div class="kpi"><span>Personal lift</span><b>${pRate===null?'—':`${pRate-pairedURate>=0?'+':''}${((pRate-pairedURate)*100).toFixed(1)}đ%`}</b><small>Personal − Universal</small></div>`;
  $('#statsBaseline').innerHTML=`<div class="baseline-card"><b>Delta Universal vs baseline: ${(uRate-baseline)>=0?'+':''}${((uRate-baseline)*100).toFixed(1)} điểm %</b><span>${scope!=='any'?`Baseline 2 số / 18 kết quả ≈ ${pct(BASELINE_TWO_18,2)}.`:'Tất cả đài dùng baseline lý thuyết theo tổng số kết quả thực tế từng ngày.'} Đây không phải predictive probability.</span></div>`;
  $('#statsBaseline').insertAdjacentHTML('beforeend',pairedPanel(rows));
  const filtered=rows.filter(x=>state.statsFilter==='ALL'||(state.statsFilter==='WIN'?x.ur.win:!x.ur.win)).reverse();
  $('#statsDays').innerHTML=filtered.slice(0,120).map(x=>`<button class="stats-day ${x.ur.win?'win':'miss'}" data-action="open-date" data-date="${x.date}" data-follow-station="${esc(scope==='any'?'all':x.draws[0].station)}"><div><span>${fmtDate(x.date)} · ${esc(scope==='any'?'Tất cả đài':x.draws[0].station)}</span><b>${x.up.join(' · ')}</b><small>${x.ur.hitNumbers.length?`Hit ${x.ur.hitNumbers.join(', ')} · ${x.ur.totalNhay} nháy · ${esc(stationResults(x.up,x.draws.map(d=>d.station),x.draws).filter(t=>t.result?.win).map(t=>t.station).join(', '))}`:'Không xuất hiện'}</small></div><strong>${x.ur.win?'WIN':'MISS'}</strong>${x.pr?`<em>Personal ${x.pr.win?'WIN':'MISS'}</em>`:''}</button>`).join('')||'<div class="empty-note">Không có ngày theo bộ lọc.</div>';
}

export async function renderCalendar(ctx){
  const {state,$}=ctx;$('#calPeriod').textContent=monthLabel(state.calendarMonth);const rows=await loadMonth(state.calendarMonth),offset=weekdayMon0(rows[0]?.date||state.calendarMonth),cells=[];for(let i=0;i<offset;i++)cells.push('<span class="calendar-empty"></span>');
  rows.forEach(r=>{const p=picksFor(r,state.mode,readProfile());cells.push(`<button class="calendar-day ${tierClass(r.universal.tier)}" data-action="open-date" data-date="${r.date}"><span>${Number(r.date.slice(8))}</span><b>${p.primary}·${p.secondary}</b><small>${r.universal.day_score}</small></button>`)});$('#calendarGrid').innerHTML=cells.join('');
}

export async function renderCompare(ctx){
  const {state,$}=ctx,selected=state.date,r=await loadRecord(selected),stations=stationsForDate(selected),research=enrichResearch(await loadResearch(selected,stations)),profile=readProfile(),p=picksFor(r,state.mode,profile),picks=[p.primary,p.secondary],sm=stationMatch(research,r.date,picks);
  if(state.date!==selected)return;
  $('#compareDate').innerHTML=`<div class="summary-strip"><div><span>Ngày</span><b>${fmtDate(r.date)}</b></div><div><span>Core đang đối chiếu</span><b>${picks.join(' · ')}</b></div><div><span>Mode</span><b>${state.mode==='personal'&&profile?'Personal':'Universal'}</b></div></div>`;
  $('#stationMatchOverview').innerHTML=sm.ranked.length?`<div class="station-match ${sm.clear?'clear':'neutral'}"><span>STATION MATCH</span><b>${esc(matchSummaryText(sm))}</b>${sm.ranked.map((x,i)=>`<div><strong>#${i+1} ${esc(x.station)}</strong><em>${pct(x.adjusted)}</em><small>10/30/100: ${pct(x.r10)} · ${pct(x.r30)} · ${pct(x.r100)}</small></div>`).join('')}</div>`:`<div class="empty-state"><b>Chưa đủ recent history</b><span>Bootstrap history và rebuild stats để bật Station Match.</span></div>`;
  if(!state.compareStation||!stations.includes(state.compareStation))state.compareStation=stations[0];
  $('#compareStations').innerHTML=stations.map(s=>`<button data-action="station" data-station="${esc(s)}" class="${s===state.compareStation?'active':''}">${esc(s)}</button>`).join('');
  const st=stationHistory(research,state.compareStation);if(!st){$('#comparePicks').innerHTML='<div class="empty-note">Chưa có dữ liệu đài này.</div>';$('#recentTop').innerHTML='';$('#numberGrid').innerHTML='';$('#compareWarning').innerHTML='<b>Research only</b><span>History không được sửa core.</span>';return}
  $('#comparePicks').innerHTML=picks.map((num,i)=>{const m10=uniqueHitRate(st,num,10),m30=uniqueHitRate(st,num,30),m100=uniqueHitRate(st,num,100),a=anomalyFor(st,num),lab=anomalyLabel(a);return `<div class="pick-history"><div><span>Chủ ${i+1}</span><b>${num}</b></div><div><span>10 kỳ</span><b>${pct(m10.rate)}</b></div><div><span>30 kỳ</span><b>${pct(m30.rate)}</b></div><div><span>100 kỳ</span><b>${pct(m100.rate)}</b></div><em class="anom-${lab.cls}">${lab.text}</em></div>`}).join('');
  const table=numberTable(st,state.compareWindow),top=table.slice(0,10);$('#recentTop').innerHTML=`<div class="recent-top-list">${top.map((x,i)=>`<div><b>#${i+1}</b><span>${x.num}</span><strong>${pct(x.rate)}</strong><small>${x.hits}/${x.n} kỳ</small></div>`).join('')}</div>`;
  const byNum=new Map(table.map(x=>[x.num,x]));$('#numberGrid').innerHTML=Array.from({length:100},(_,i)=>String(i).padStart(2,'0')).map(n=>{const x=byNum.get(n),isPick=picks.includes(n);return `<div class="number-cell ${isPick?'core':''}"><b>${n}</b><span>${pct(x?.rate||0,0)}</span></div>`}).join('');
  $('#compareWarning').innerHTML=`<b>As-of ${fmtDate(r.date)} · chỉ dùng dữ liệu trước ngày này</b><span>Recent Form đo tỷ lệ kỳ có xuất hiện; Anomaly đo đủ 18 đuôi kể cả trùng, Z/drift và BH-FDR xấp xỉ trên các đài đang tải. Cảnh báo không chứng minh khả năng dự báo hay nguyên nhân vật lý. ${st.anomaly?.station?`Chi-square đài: ${st.anomaly.station.chi.toFixed(1)} · q≈${st.anomaly.station.q.toFixed(3)}`:'Chi-square: thiếu 300 kỳ'}</span>`;
}

export async function renderAll(ctx){
  const {state,$}=ctx,req=Symbol(),year=state.allYear,month=state.allMonth,tier=state.allTier,q=state.allSearch,mode=state.mode;
  ctx.allRequest=req;
  const host=$('#allDays'),summary=$('#allSummary'),start=`${year}-${String(month).padStart(2,'0')}-01`;
  host.innerHTML='<div class="skeleton-card">Đang tải lịch đài và kết quả…</div>';summary.textContent='';
  try{
    const [calendar,hist,archive]=await Promise.all([loadYear(year),loadHistoryIndex(start).catch(()=>({dates:{},unavailable:true})),year<=Number(completedISO().slice(0,4))?loadArchiveYear(year).catch(()=>({dates:{},unavailable:true})):Promise.resolve({dates:{}})]);
    if(ctx.allRequest!==req)return;
    const quality=await archiveQualityHTML().catch(()=>'<p class="helper">Không tải được báo cáo chất lượng kho bổ sung.</p>');
    if(ctx.allRequest!==req)return;
    const rows=calendar.filter(r=>Number(r.date.slice(5,7))===month).sort((a,b)=>a.date.localeCompare(b.date)),profile=readProfile(),completed=completedISO();
    const items=rows.map(r=>({r,picks:picksFor(r,mode,profile)})).filter(({r,picks})=>(tier==='ALL'||r.universal.tier===tier)&&matchesDay(r,picks,q,dayStations(r.date,[picks.primary,picks.secondary],hist,completed).map(x=>x.station)));
    const coverage=historyMonthSummary(rows,hist,completed);
    summary.textContent=`${items.length}/${rows.length} ngày · ${tier==='ALL'?'mọi Tier':`Tier ${tier}`} · ${items.some(x=>x.picks.personal)?'Personal':'Universal'} · ${hist.unavailable?'Không tải được kết quả':`${coverage.available} ngày có bản ghi · ${coverage.missing} chưa có trong kho chính thức · ${coverage.pending} chờ`} · ${year<2026?'Lịch tái tạo hồi cứu; thứ tự đài theo bản ghi nếu có.':'Đài 1 = đài đầu theo lịch, không phải xác suất cao hơn.'}`;
    if(year<=Number(completed.slice(0,4)))summary.textContent+=` · ${archive.unavailable?'Kho bổ sung không tải được':archiveSummary(rows,archive,completed)}`;
    host.innerHTML=items.map(({r,picks})=>{const nums=[picks.primary,picks.secondary];return `<article class="h39-day">${dayCard(r,picks,archive?.dates?.[r.date]?.status==='no_draw'?'<small>KHÔNG MỞ THƯỞNG</small>':stationsHTML(dayStations(r.date,nums,hist,completed)))}${archive?.dates?.[r.date]?.status==='no_draw'?'':historyDetails(r.date,nums,hist,completed)}${archiveDetails(r.date,archive,completed,nums)}</article>`}).join('')||'<div class="empty-note">Không có ngày phù hợp.</div>';
    host.insertAdjacentHTML('afterbegin',quality);
  }catch(e){if(ctx.allRequest===req)host.innerHTML=`<div class="error-card">${esc(e.message)}</div>`;}
}

export function renderProfile(ctx){
  const {$}=ctx,p=readProfile();$('#profileLabel').value=p?.label||'';$('#birthDate').value=p?.birthDate||'';$('#birthTime').value=p?.birthTime||'12:00';$('#birthPlace').value=p?.birthPlace||'';const a=analyzeProfile(p);
  $('#profileAnalysis').innerHTML=!a?'<div class="empty-state"><b>Chưa có hồ sơ</b><span>Personal chỉ hoạt động khi có ngày sinh. Hồ sơ được lưu local trên trình duyệt này.</span></div>':`<div class="card"><div class="card-head"><div><span>ELEMENT BALANCE</span><h3>${esc(p.label||'Hồ sơ Personal')}</h3></div></div><div class="element-bars">${Object.entries(a.distribution).map(([e,v])=>`<div><span>${elementLabel(e)}</span><i><em style="width:${Math.round(v*100)}%"></em></i><b>${Math.round(v*100)}%</b></div>`).join('')}</div><p class="helper">Personal V2 Research: điểm hồ sơ tách riêng trên 00–99; công thức kết hợp V1.1 vẫn giữ 80% Universal + 20% hồ sơ, trong Top 20. Tên/nơi sinh không tạo số.</p></div>`;
}

export function renderMethod(ctx){ctx.$('#methodContent').innerHTML=`
  <div class="method-section"><h3>1. Luồng bắt buộc</h3><div class="flow-card"><b>Universal Core</b><i>↓</i><b>Universal 00–99 Ranking</b><i>↓</i><b>Personal Overlay</b><i>↓</i><b>Personal Ranking</b></div><p>Universal tuyệt đối không dùng ngày sinh, tên, giới tính hay kết quả XSMN. Personal chỉ rerank Universal.</p></div>
  <div class="method-section"><h3>2. Universal V1</h3><div class="weight-list"><div><span>Seasonal Qi / Ngũ hành khí</span><b>30%</b></div><div><span>Can Chi Relations</span><b>20%</b></div><div><span>12 Trực + Nạp âm</span><b>15%</b></div><div><span>Kinh Dịch</span><b>25%</b></div><div><span>Hà Đồ / Lạc Thư</span><b>10%</b></div></div><div class="method-note"><b>Digit mapping</b><span>Thủy 1·6 · Hỏa 2·7 · Mộc 3·8 · Kim 4·9 · Thổ 0·5.</span></div></div>
  <div class="method-section"><h3>3. Score / Agreement / Tier</h3><p><b>Score 78/100 không có nghĩa 78% khả năng trúng.</b> Score là ranking/coherence. Agreement đếm số module cùng support. Tier dùng để rank chất lượng ngày.</p></div>
  <div class="method-section"><h3>4. Personal Research V2 · công thức V1.1</h3><div class="formula-card">Final Personal Score = <b>80% Universal</b> + <b>20% Personal Overlay</b></div><p>Điểm hồ sơ tính riêng trên 100 số. Candidate pool kết hợp vẫn lấy Universal Top 20. So sánh ghép cặp và độ trùng ở Thống kê. Không đổi trọng số khi chưa kiểm định độc lập.</p></div>
  <div class="method-section"><h3>5. History integrity</h3><div class="flow-card"><b>Core Prediction</b><i>→</i><b>Station Match</b><i>→</i><b>Recent Form</b><i>→</i><b>Anomaly Watch</b></div><p>Các lớp sau chỉ đối chiếu/research/cảnh báo, không sửa Chủ 1/Chủ 2 đã freeze. Duplicate tails được giữ để đếm nháy.</p></div>
  <div class="method-section"><h3>6. Backtest</h3><div class="formula-card"><b>SPECIFY → FREEZE → TEST</b></div><p>2005–2018 Development · 2019–2022 Validation · 2023–2025 Holdout · 2026+ hồi cứu / forward khi có ledger trước kỳ. Nếu đổi công thức sau holdout phải bump version.</p></div>`}

export async function renderAbout(ctx){return renderAboutV2(ctx)}
