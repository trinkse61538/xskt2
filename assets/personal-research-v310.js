// Descriptive Personal research. No draw data is used by either ranking.
const DIGIT_ELEMENT={0:'earth',1:'water',2:'fire',3:'wood',4:'metal',5:'earth',6:'water',7:'fire',8:'wood',9:'metal'};
export function coreScore(number,affinity){
  if(!/^\d{2}$/.test(number)||!affinity)return null;
  const elements=Array.from(number,d=>DIGIT_ELEMENT[Number(d)]);
  if(elements.some(e=>!Number.isFinite(affinity[e])))return null;
  const score=((affinity[elements[0]]+affinity[elements[1]])/2+1)/2*100;
  return {elements,score};
}
export function personalCore(affinity){
  return Array.from({length:100},(_,i)=>String(i).padStart(2,'0')).map(number=>{
    const x=coreScore(number,affinity);return x?{number,...x}:null;
  }).filter(Boolean);
}
export function compareRankings(universal,personal){
  if(!universal?.ranking?.length||!personal?.ranking?.length)return null;
  const u=universal.ranking,p=personal.ranking,um=new Map(u.map(x=>[x.number,x]));
  const overlap=k=>{const a=new Set(u.slice(0,k).map(x=>x.number));return p.slice(0,k).filter(x=>a.has(x.number)).length};
  const numbers=[...new Set([...u.slice(0,5).map(x=>x.number),...p.slice(0,5).map(x=>x.number)])];
  const pm=new Map(p.map(x=>[x.number,x]));
  return {top1:overlap(1),top2:overlap(2),top5:overlap(5),rows:numbers.map(number=>{
    const a=um.get(number),b=pm.get(number);if(!a||!b)return null;
    return {number,uRank:a.rank,pRank:b.rank,uScore:a.score,overlay:b.personalComponent,pScore:b.score,elements:b.elements,rankDelta:a.rank-b.rank,scoreDelta:b.score-a.score};
  }).filter(Boolean)};
}
export function pairedSummary(rows){
  let n=0,uWins=0,pWins=0,both=0,onlyU=0,onlyP=0,neither=0,top1=0,top2=0,top5=0,shared2=0,shared5=0,baseline=0;
  for(const x of rows){
    if(typeof x.ur?.win!=='boolean'||typeof x.pr?.win!=='boolean'||!Number.isFinite(x.baseline))continue;
    const c=compareRankings(x.r?.universal,x.p);if(!c)continue;
    n++;baseline+=x.baseline;uWins+=Number(x.ur.win);pWins+=Number(x.pr.win);
    if(x.ur.win&&x.pr.win)both++;else if(x.ur.win)onlyU++;else if(x.pr.win)onlyP++;else neither++;
    top1+=Number(c.top1===1);top2+=Number(c.top2===2);top5+=Number(c.top5===5);shared2+=c.top2;shared5+=c.top5;
  }
  return {n,uWins,pWins,both,onlyU,onlyP,neither,top1,top2,top5,shared2,shared5,baseline:n?baseline/n:null,lift:n?(pWins-uWins)/n:null};
}
