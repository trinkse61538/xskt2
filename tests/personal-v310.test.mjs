import test from 'node:test';
import assert from 'node:assert/strict';
import {coreScore,personalCore,compareRankings,pairedSummary} from '../assets/personal-research-v310.js';
import {personalRanking,picksFor,analyzeProfile} from '../assets/personal.js';
const affinity={wood:-.4,water:.2,fire:1,earth:0,metal:-1};
const u={ranking:['88','38','83','33','18','81'].map((number,i)=>({number,rank:i+1,score:100-i*3,agreement:3})),primary:'88',secondary:'38',top5:['88','38','83','33','18']};
const p={ranking:['18','88','38','83','81','33'].map((number,i)=>({number,rank:i+1,score:90-i,personalComponent:40,elements:['wood','water']}))};
test('independent score covers 00–99, preserves symmetric digit convention',()=>{
  assert.equal(personalCore(affinity).length,100);assert.equal(coreScore('38',affinity).score,coreScore('83',affinity).score);assert.equal(coreScore('22',affinity).score,100);assert.equal(coreScore('44',affinity).score,0);assert.equal(coreScore('x',affinity),null);
});
test('union of both top 5 and overlap',()=>{const c=compareRankings(u,p);assert.equal(c.top1,0);assert.equal(c.top2,1);assert.equal(c.top5,4);assert.equal(c.rows.length,6);assert.equal(c.rows.find(x=>x.number==='18').rankDelta,4)});
test('paired denominator excludes missing, tracks discordant results',()=>{const row=(a,b)=>({r:{universal:u},p,ur:{win:a},pr:b===null?null:{win:b},baseline:.3});const s=pairedSummary([row(true,true),row(true,false),row(false,true),row(false,true),row(false,false),row(true,null)]);assert.equal(s.n,5);assert.equal(s.both,1);assert.equal(s.onlyU,1);assert.equal(s.onlyP,2);assert.equal(s.neither,1);assert.equal(s.lift,.2);assert.equal(s.top2,0);assert.equal(s.shared2,5);assert.equal(pairedSummary([]).lift,null)});
test('existing overlay formula and Universal output remain unchanged',()=>{const record={universal:u},profile={birthDate:'1990-01-01',birthTime:'12:00'},a=analyzeProfile(profile);const snapshot=JSON.stringify(record);const result=personalRanking(record,profile);assert.ok(result);for(const x of result.ranking){const prev=u.ranking.find(y=>y.number===x.number);assert.equal(x.score,Math.round((.8*prev.score+.2*coreScore(x.number,a.affinity).score)*1000)/1000)}assert.equal(JSON.stringify(record),snapshot);assert.equal(picksFor(record,'universal',profile).primary,u.primary);assert.equal(personalRanking(record,null),null)});
