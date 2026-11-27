import {test} from 'node:test';import assert from 'node:assert/strict';import {shiftDate,shiftMonth,monthCells} from '../assets/lookup-date-v382.js';
test('moves across month and year',()=>{assert.equal(shiftDate('2026-11-30',1),'2026-12-01');assert.equal(shiftDate('2026-01-01',-1),'2025-12-31')});
test('leap year and nonleap',()=>{assert.equal(shiftDate('2028-03-01',-1),'2028-02-29');assert.equal(shiftDate('2026-03-01',-1),'2026-02-28')});
test('calendar Monday-first and exact day count',()=>{const cells=monthCells('2026-11');assert.equal(cells.indexOf('2026-11-01'),6);assert.equal(cells.filter(Boolean).length,30);assert.equal(monthCells('2028-02').filter(Boolean).length,29)});
test('month navigation boundaries',()=>{assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12')});
