import test from 'node:test';
import assert from 'node:assert/strict';
import {dayStations,matchesDay,stationsHTML} from '../assets/all-days-v36.js';
const picks=['11','16'],date='2026-11-28';
const draw=(station,hit=[])=>({station,tails:[...hit,...Array(18-hit.length).fill('00')]});
const hist=draws=>({dates:{[date]:{draws}}});
test('Saturday names, first station and fourth station in schedule order',()=>{
 const rows=dayStations(date,picks,{},'2026-11-27');assert.deepEqual(rows.map(x=>x.station),['TP.HCM','Long An','Bình Phước','Hậu Giang']);assert.deepEqual(rows.map(x=>x.main),[true,false,false,false]);
});
test('Friday and Sunday match current schedule',()=>{assert.equal(dayStations('2026-11-27',picks,{},date)[0].station,'Vĩnh Long');assert.equal(dayStations('2026-11-29',picks,{},date)[0].station,'Tiền Giang');});
test('future never scored even with data',()=>{assert.ok(dayStations(date,picks,hist([draw('TP.HCM',['11'])]),'2026-11-27').every(x=>x.status==='pending'));});
test('named station scoring and duplicate tails',()=>{const r=dayStations(date,picks,hist([draw('Long An',['16']),draw('TP.HCM',['11','11']),draw('Bình Phước')]),date);assert.deepEqual(r.map(x=>x.status),['win','win','miss','missing']);assert.equal(r[0].result.totalNhay,2);});
test('invalid/duplicate rows and unavailable history not marked MISS',()=>{assert.equal(dayStations(date,picks,hist([draw('TP.HCM'),draw('TP.HCM')]),date)[0].status,'missing');assert.equal(dayStations(date,picks,{unavailable:true},date)[0].status,'unavailable');});
test('search by station name, accents, personal numbers and calendar',()=>{let r={date,calendar:{nayin:{name:'Đại Hải Thủy'}}},p={primary:'11',secondary:'16',top5:['11','16','23']};for(const q of ['binh phuoc','Hậu Giang','23','dai hai thuy'])assert.ok(matchesDay(r,p,q));assert.ok(!matchesDay(r,p,'999'));});
test('markup includes schedule scope and pending status',()=>{const html=stationsHTML(dayStations(date,picks,{},'2026-11-27'));assert.match(html,/Đài 1: TP.HCM/);assert.match(html,/Hậu Giang/);assert.match(html,/CHỜ KQ/);});
