// Read-only historical archive, separate from official backtest data.
import {esc} from './data.js';
const labels={giai_db:'Đặc biệt',giai_1:'Giải nhất',giai_2:'Giải nhì',giai_3:'Giải ba',giai_4:'Giải tư',giai_5:'Giải năm',giai_6:'Giải sáu',giai_7:'Giải bảy',giai_8:'Giải tám'};
const keys=Object.keys(labels),cache=new Map();
export async function loadArchiveYear(year){
 if(!Number.isInteger(+year)||+year<2005)return {dates:{}};
 if(!cache.has(year))cache.set(year,fetch(`./data/history/archive-v391/years/${year}.json`,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(`Archive ${r.status}`);return r.json()}).catch(e=>{cache.delete(year);throw e}));
 return cache.get(year);
}
export function archiveDetails(date,archive,completed){
 if(date>completed)return '';
 if(archive?.unavailable)return '<p class="helper">Không tải được kho lưu trữ bổ sung.</p>';
 const d=archive?.dates?.[date];if(!d)return '';
 const status={accepted:'Đã qua kiểm định hiện hành',legacy:'Dữ liệu gốc lịch sử · chưa xác minh chéo',cross_checked:'Đã đối chiếu 2 nguồn lưu trữ'}[d.status]||'Chưa rõ';
 const link=s=>{try{const u=new URL(s);return u.protocol==='https:'?`<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(u.hostname)}</a>`:''}catch{return ''}};
 return `<details class="h39-details"><summary>Kho lưu trữ · ${esc(status)}</summary><p class="helper">Hiển thị nguyên số lưu trữ. Giải đặc biệt 5 chữ số không được bổ sung số 0 và không dùng để xác nhận vé 6 chữ số. Kho bổ sung không đưa vào thống kê chính thức.</p>${d.draws.map(r=>`<div class="h39-station"><b>${esc(r.station)}</b><small>ĐB ${esc(r.specialDigits)} chữ số · ${link(r.source?.url)}</small>${keys.map(k=>`<div class="a391-prize"><span>${labels[k]}</span><b>${r.results.filter(x=>x.prize===k).map(x=>esc(x.value)).join(' · ')}</b></div>`).join('')}</div>`).join('')}${d.evidence?.length?`<p class="helper">Đối chiếu: ${d.evidence.map(x=>link(x.url)+(x.normalizations?.length?' (chuẩn hóa nhãn giải; có bằng chứng trong JSON)':'')).join(' · ')}</p>`:''}</details>`;
}
export function archiveSummary(rows,archive,completed){let accepted=0,legacy=0,cross=0,missing=0;for(let r of rows){if(r.date>completed)continue;let s=archive?.dates?.[r.date]?.status;if(s==='accepted')accepted++;else if(s==='legacy')legacy++;else if(s==='cross_checked')cross++;else missing++;}return `Kho bổ sung: ${accepted} đã qua kiểm định · ${cross} đối chiếu 2 nguồn · ${legacy} chưa xác minh chéo · ${missing} chưa có bản ghi.`;}
