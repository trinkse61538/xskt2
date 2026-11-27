import test from 'node:test';
import assert from 'node:assert/strict';
import {selectMonthDays,monthlyResult} from '../assets/monthly-v32.js';
import {buildBudgetPlan,reviewPlan} from '../assets/guide-v34.js';
const record=(date,score)=>({date,universal:{day_score:score,agreement:4}});
const d='2026-11-19',draw=(station,hits=[])=>({station,tails:[...hits,...Array(18-hits.length).fill('00')]}),hist=draws=>({dates:{[d]:{draws}}});
test('both tabs share strictly bounded month selection, even with high-score December records',()=>{
 const data=[record('2026-11-16',70),record('2026-11-19',80),record('2026-12-01',100)];
 assert.deepEqual(selectMonthDays(data,'2026-11-01',4).map(r=>r.date),['2026-11-16','2026-11-19']);
 assert.deepEqual(selectMonthDays(data,'2026-11-18',7).map(r=>r.date),['2026-11-19']);
});
test('secondary hit counts in Top 2, not Top 1',()=>{const h=hist([draw('Tây Ninh',['38'])]);assert.equal(monthlyResult(d,['33'],h,d).status,'miss');assert.equal(monthlyResult(d,['33','38'],h,d).status,'win')});
test('main station only; secondary station is ignored',()=>{const h=hist([draw('An Giang',['33']),draw('Tây Ninh')]);assert.equal(monthlyResult(d,['33','38'],h,d).status,'miss')});
test('pending and missing do not count as losses in either scope',()=>{for(const p of [['33'],['33','38']]){assert.equal(monthlyResult(d,p,hist([]),d).status,'missing');assert.equal(monthlyResult(d,p,hist([]),'2026-11-18').status,'pending')}});
test('duplicate picks rejected, repeated hits counted',()=>{const h=hist([draw('Tây Ninh',['33','33'])]);assert.equal(monthlyResult(d,['33','33'],h,d).status,'missing');assert.equal(monthlyResult(d,['33'],h,d).result.totalNhay,2)});
test('fixed-cost arithmetic reflects number count and absolute cap',()=>{const a=buildBudgetPlan(4,15000,60000,'fixed',1),b=buildBudgetPlan(4,15000,60000,'fixed',2);assert.equal(a.covered,4);assert.equal(b.covered,2);assert.equal(a.rows[0].dayTotal,15000);assert.equal(b.rows[0].dayTotal,30000);assert.equal(a.maxOutlay,60000);assert.equal(b.maxOutlay,60000)});
test('budget zero still leaves historical result intact',()=>{const result={status:'win',result:{totalNhay:1}};const r=reviewPlan([result],buildBudgetPlan(1,15000,0,'fixed',2));assert.equal(r.spent,0);assert.equal(r.rows[0].status,'win');assert.equal(r.reason,'budget')});
