import test from 'node:test';import assert from 'node:assert/strict';import {archiveDetails,archiveSummary} from '../assets/archive-v391.js';
const date='2005-10-01',archive={dates:{[date]:{status:'legacy',draws:[{station:'Bình Phước',specialDigits:5,source:{url:'https://xoso.com.vn/xsmn-01-10-2005.html'},results:[{prize:'giai_db',value:'50605'}]}]}}};
test('archive preserves original five-digit value and marks unverified',()=>{let s=archiveDetails(date,archive,date);assert.match(s,/50605/);assert.doesNotMatch(s,/050605/);assert.match(s,/chưa xác minh chéo/)});
test('future and missing never fabricate data',()=>{assert.equal(archiveDetails(date,archive,'2005-09-30'),'');assert.equal(archiveDetails('2005-10-02',archive,'2005-10-02'),'')});
test('cohort summary separate',()=>assert.match(archiveSummary([{date}],archive,date),/1 chưa xác minh chéo/));
