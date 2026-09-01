export const STEP=15000;
export const PAYOUT_PER_STEP=80000;
export function normalizeStake(value){
  const raw=Math.max(STEP,Number(value)||STEP),steps=Math.ceil(raw/STEP);return {raw,steps,stake:steps*STEP,rounded:steps*STEP!==raw};
}
export function buildStopOnWinPlan(dayCount,firstStake){
  const first=normalizeStake(firstStake);let cumulativeLoss=0;const rows=[];
  for(let i=0;i<dayCount;i++){
    let steps=i===0?first.steps:Math.max(1,Math.floor(cumulativeLoss/(PAYOUT_PER_STEP-2*STEP))+1);
    const stakePerNumber=steps*STEP,totalStake=2*stakePerNumber,grossOneHit=steps*PAYOUT_PER_STEP,netIfOneHit=grossOneHit-totalStake-cumulativeLoss;
    rows.push({day:i+1,steps,stakePerNumber,totalStake,grossOneHit,lossBefore:cumulativeLoss,netIfOneHit});
    cumulativeLoss+=totalStake;
  }
  return {first,rows,maxOutlay:cumulativeLoss};
}
