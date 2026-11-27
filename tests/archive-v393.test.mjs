import test from 'node:test';import assert from 'node:assert/strict';import {archiveDetails,archiveSummary} from '../assets/archive-v393.js';
const date='2020-04-01',a={dates:{[date]:{status:'no_draw',draws:[],sources:['https://example.com/report']}}};
test('no draw is explicitly marked, not missing',()=>{assert.match(archiveDetails(date,a,'2026-11-26'),/KHÔNG MỞ THƯỞNG/);assert.match(archiveSummary([{date}],a,'2026-11-26'),/1 không mở thưởng · 0 thiếu/)});
test('tail-only not full validation',()=>{let d={dates:{[date]:{status:'tail_verified',draws:[]}}};assert.match(archiveDetails(date,d,'2026-11-26'),/không dùng để xác nhận vé/);assert.match(archiveSummary([{date}],d,'2026-11-26'),/1 khớp 2 số cuối/)});
