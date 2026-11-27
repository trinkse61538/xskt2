// Supplemental historical archive. No changes to canonical scores.
import {esc} from './data.js';
const labels={giai_db:'Đặc biệt',giai_1:'Giải nhất',giai_2:'Giải nhì',giai_3:'Giải ba',giai_4:'Giải tư',giai_5:'Giải năm',giai_6:'Giải sáu',giai_7:'Giải bảy',giai_8:'Giải tám'};
const keys=Object.keys(labels),cache=new Map();
const states={accepted:'Đã qua kiểm định hiện hành',legacy:'Chưa xác minh chéo',cross_checked:'Khớp đầy đủ giá trị giữa các nguồn',tail_verified:'Khớp hai số cuối, chưa xác nhận toàn bộ chữ số',no_draw:'Không mở thưởng (COVID-19)'};
const link=s=>{try{const u=new URL(s);return u.protocol==='https:'?`<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(u.hostname)}</a>`:''}catch{return ''}};
export async function loadArchiveYear(year){
 if(!Number.isInteger(+year)||+year<2005)return {dates:{}};
 if(!cache.has(year))cache.set(year,fetch(`./data/history/archive-v394/years/${year}.json`,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(`Archive ${r.status}`);return r.json()}).catch(e=>{cache.delete(year);throw e}));return cache.get(year);
}
export function archiveDetails(date,archive,completed,picks=[]){
 if(date>completed)return '';
 if(archive?.unavailable)return '<p class="helper">Không tải được kho lưu trữ bổ sung.</p>';
 const d=archive?.dates?.[date];if(!d)return '';
 if(d.status==='no_draw')return `<p class="helper"><b>KHÔNG MỞ THƯỞNG · COVID-19</b> · ${d.sources.map(link).join(' · ')}. Không tính MISS.</p>`;
 const status=states[d.status]||'Chưa rõ';
 const notice=d.status==='tail_verified'?'Chỉ xác minh hai số cuối. Giá trị đầy đủ bên dưới là bản lưu trữ tham khảo, không dùng để xác nhận vé.':'Giải đặc biệt 5 chữ số không được bổ sung số 0; không dùng để xác nhận vé 6 chữ số.';
 return `<details class="h39-details"><summary>Kho lưu trữ · ${esc(status)}</summary><p class="helper">${esc(notice)} Kho bổ sung không đưa vào thống kê chính thức.</p>${d.normalizations?.length?'<p class="helper">Đã chuẩn hóa nhãn giải Bảy/Tám, giữ nguyên các giá trị và hai số cuối. Xem bằng chứng trong JSON.</p>':''}${d.stationCorrection?`<p class="helper"><b>Đã hiệu chỉnh tên đài theo bằng chứng:</b> ${Object.entries(d.stationCorrection.mapping).filter(([a,b])=>a!==b).map(([a,b])=>`${esc(a)} → ${esc(b)}`).join(' · ')}</p>`:''}${d.status==='legacy'?'<p class="helper">Chưa xác minh, không dùng làm kết quả chính thức.</p>':''}${d.draws.map(r=>`<div class="h39-station"><b>${esc(r.station)}</b><small>ĐB ${esc(r.specialDigits)} chữ số · ${link(r.source?.url)}</small>${keys.map(k=>`<div class="a391-prize"><span>${labels[k]}</span><b>${r.results.filter(x=>x.prize===k).map(x=>picks.includes(x.tail)?`<mark class="h39-hit">${esc(x.value)}</mark>`:esc(x.value)).join(' · ')}</b></div>`).join('')}</div>`).join('')}${d.evidence?.length?`<p class="helper">Đối chiếu: ${d.evidence.map(x=>link(x.url)+(x.normalizations?.length?' (chuẩn hóa nhãn)':'')).join(' · ')}</p>`:''}</details>`;
}
export function archiveSummary(rows,archive,completed){let c={accepted:0,cross_checked:0,tail_verified:0,legacy:0,no_draw:0,missing:0};for(let r of rows){if(r.date>completed||r.date<'2005-10-01')continue;let s=archive?.dates?.[r.date]?.status;if(s in c)c[s]++;else c.missing++;}return `Kho bổ sung: ${c.accepted} kiểm định · ${c.cross_checked} khớp đầy đủ · ${c.tail_verified} khớp 2 số cuối · ${c.legacy} chưa xác minh · ${c.no_draw} không mở thưởng · ${c.missing} thiếu.`;}

export async function archiveQualityHTML(){
 const response=await fetch('./data/history/archive-v394/audit.json',{cache:'no-cache'});if(!response.ok)throw Error('Không tải được audit');const a=await response.json();const c=a.counts||{},den=Object.values(c).reduce((s,x)=>s+x,0)-(c.no_draw||0),valid=(c.accepted||0)+(c.cross_checked||0)+(c.tail_verified||0);
 return `<details class="h39-details"><summary>Chất lượng kho lịch sử · ${den?(100*valid/den).toFixed(2):'—'}%</summary><p class="helper">${esc(a.first)} → ${esc(a.last)} · ${esc(valid)}/${esc(den)} ngày qua kiểm định/đối chiếu · ${esc(a.stationCorrectionCount)} ngày hiệu chỉnh tên đài · ${esc(c.no_draw||0)} không mở thưởng. Kho bổ sung không thay báo cáo chính thức.</p><p class="helper">Theo năm (đã kiểm định hoặc đối chiếu / ngày cần kết quả):</p>${Object.entries(a.years||{}).map(([y,v])=>{const n=Object.values(v).reduce((s,x)=>s+x,0)-(v.no_draw||0),ok=(v.accepted||0)+(v.cross_checked||0)+(v.tail_verified||0);return `<div class="a391-prize"><span>${esc(y)}</span><b>${esc(ok)}/${esc(n)}</b></div>`}).join('')}<p><a href="./data/history/archive-v394/audit.json" target="_blank" rel="noopener">Audit JSON</a> · <a href="./data/history/archive-v394/research.json" target="_blank" rel="noopener">Thống kê hồi cứu JSON</a></p></details>`;
}
