import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBudgetPlan,reviewPlan,guideMethod,guideRowKind} from '../assets/guide-v35.js';
const miss={status:'miss',result:{totalNhay:0}},win={status:'win',result:{totalNhay:1}},pending={status:'pending',result:null};
test('mode selector and unchanged legacy math',()=>{
  assert.equal(guideMethod('legacy'),'legacy');assert.equal(guideMethod('x'),'fixed');
  const f=buildBudgetPlan(7,75000,1e9,'fixed',2),l=buildBudgetPlan(7,75000,1e9,'legacy',2);
  assert.equal(f.maxOutlay,1050000);assert.equal(l.maxOutlay,4950000);
  assert.deepEqual(l.rows.map(x=>x.steps),[5,5,10,15,25,40,65]);
});
test('stop at first hit, no later cost',()=>{
  const r=reviewPlan([miss,win,miss],buildBudgetPlan(3,75000,1e9,'legacy',2));
  assert.equal(r.spent,300000);assert.equal(r.stopIndex,1);assert.equal(guideRowKind(r.rows[2]),'stopped');
});
test('pending stays conditional and cap stays enforced',()=>{
  const r=reviewPlan([miss,pending,miss],buildBudgetPlan(3,75000,1e9,'legacy',2));
  assert.equal(r.spent,150000);assert.equal(guideRowKind(r.rows[1]),'conditional');assert.equal(guideRowKind(r.rows[2]),'conditional');
  const c=reviewPlan([miss,miss],buildBudgetPlan(2,75000,150000,'legacy',2));
  assert.equal(c.spent,150000);assert.equal(guideRowKind(c.rows[1]),'capped');
});
