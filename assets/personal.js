const DIGIT_ELEMENT={0:'earth',1:'water',2:'fire',3:'wood',4:'metal',5:'earth',6:'water',7:'fire',8:'wood',9:'metal'};
const ELEMENT_VI={wood:'Mộc',fire:'Hỏa',earth:'Thổ',metal:'Kim',water:'Thủy'};
const STEMS_EL=['wood','wood','fire','fire','earth','earth','metal','metal','water','water'];
const BRANCHES_EL=['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'];

function jdn(s){const [Y,M,D]=s.split('-').map(Number),a=Math.floor((14-M)/12),y=Y+4800-a,m=M+12*a-3;return D+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045}
function dayIdx(s){return (jdn(s)+49)%60}
function yearIdx(s){return (Number(s.slice(0,4))-1984)%60}
function hourBranch(h){return Math.floor((h+1)/2)%12}
function monthBranch(m){return (m+1)%12}
function digitElement(d){return DIGIT_ELEMENT[Number(d)]}

export function readProfile(){
  try{return JSON.parse(localStorage.getItem('xskt2.profile')||'null')}catch{return null}
}
export function saveProfile(p){localStorage.setItem('xskt2.profile',JSON.stringify(p));}
export function clearProfile(){localStorage.removeItem('xskt2.profile');}

export function analyzeProfile(profile){
  if(!profile?.birthDate) return null;
  const bt=profile.birthTime||'12:00',h=Number(bt.split(':')[0]||12),di=dayIdx(profile.birthDate),yi=yearIdx(profile.birthDate),m=Number(profile.birthDate.slice(5,7));
  const mb=monthBranch(m),yb=((yi%12)+12)%12,ds=((di%10)+10)%10,db=((di%12)+12)%12,hb=hourBranch(h),hs=((ds%5)*2+hb)%10;
  const pillars=[[((yi%10)+10)%10,yb,1],[((((yi%10)+10)%10)%5*2+2+m-1)%10,mb,2],[ds,db,2],[hs,hb,1]];
  const counts={wood:0,fire:0,earth:0,metal:0,water:0}; let total=0;
  pillars.forEach(([s,b,w])=>{counts[STEMS_EL[s]]+=w;counts[BRANCHES_EL[b]]+=w;total+=2*w});
  const distribution={},deficit={};let max=0;
  Object.keys(counts).forEach(e=>{distribution[e]=counts[e]/total;deficit[e]=.2-distribution[e];max=Math.max(max,Math.abs(deficit[e]));});
  const affinity={};Object.keys(counts).forEach(e=>affinity[e]=deficit[e]/(max||1));
  return {distribution,affinity,pillars};
}

export function personalRanking(record,profile){
  const a=analyzeProfile(profile); if(!a||!record?.universal?.ranking) return null;
  const ranking=record.universal.ranking.slice(0,20).map(r=>{
    const els=[digitElement(r.number[0]),digitElement(r.number[1])];
    const personalComponent=((a.affinity[els[0]]+a.affinity[els[1]])/2+1)/2*100;
    return {number:r.number,uRank:r.rank,uScore:r.score,agreement:r.agreement,personalComponent,score:.8*r.score+.2*personalComponent,elements:els};
  }).sort((a,b)=>b.score-a.score||a.uRank-b.uRank||Number(a.number)-Number(b.number)).map((x,i)=>({...x,rank:i+1}));
  return {primary:ranking[0]?.number,secondary:ranking[1]?.number,top5:ranking.slice(0,5).map(x=>x.number),ranking,analysis:a};
}

export function picksFor(record,mode,profile){
  if(mode==='personal'){
    const p=personalRanking(record,profile); if(p) return {primary:p.primary,secondary:p.secondary,top5:p.top5,ranking:p.ranking,personal:p};
  }
  const u=record.universal; return {primary:u.primary,secondary:u.secondary,top5:u.top5,ranking:u.ranking,personal:null};
}
export function elementLabel(e){return ELEMENT_VI[e]||e;}
