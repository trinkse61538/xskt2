import assert from 'node:assert/strict';
import {bh,enrichResearch} from '../assets/research-v2.js';
import {stationMatch,scorePicks,uniqueHitRate} from '../assets/history.js';
import {vnISO,completedISO} from '../assets/data.js';
const t=bh([{p:.01},{p:.04},{p:.03}]);assert.deepEqual(t.map(x=>x.q),[.03,.04,.04]);
assert.equal(scorePicks(['00','00'],[{tails:['00','00','01']}]).totalNhay,2);
assert.equal(vnISO(new Date('2026-11-25T18:00:00Z')),'2026-11-26');assert.equal(completedISO(new Date('2026-11-25T19:53:00Z')),'2026-11-25');assert.equal(completedISO(new Date('2026-11-26T10:10:00Z')),'2026-11-26');
const rows=Array.from({length:100},(_,i)=>({date:'2026-11-01',tails:Array(18).fill('00'),unique_hits:['00']}));const data={stations:{'TP.HCM':{recent:[...rows,{date:'2026-11-21',tails:Array(18).fill('01')}]}}};const m=stationMatch(data,'2026-11-21',['00','01']);assert.equal(m.ranked[0].per[1].m10.hits,0);assert.equal(m.clear,false);const research=enrichResearch({stations:{x:{recent:rows}}});assert.equal(research.stations.x.anomaly.numbers['00'].state,'PERSISTENT_UP');assert.ok(research.stations.x.anomaly.numbers['00'].q<=.05);assert.equal(uniqueHitRate({recent:[]},'00',10).n,0);console.log('research-v2 JS checks passed');
