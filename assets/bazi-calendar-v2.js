// Port of src/universal/calendar.py mean-term convention. Not astronomical ephemeris.
const OFF=[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758];
const BASE=Date.UTC(1900,0,6,2,5),YEAR=31556925974.7;
const mod=(x,n)=>((x%n)+n)%n;
function term(y,i){return BASE+YEAR*(y-1900)+OFF[i]*60000}
export function baziIndices(s,time='12:00'){const [Y,M,D]=s.split('-').map(Number),h=+time.split(':')[0];const dayMs=Date.UTC(Y,M-1,D),noon=dayMs+5*3600000;const lichunDay=Math.floor((term(Y,2)+7*3600000)/86400000);const yi=mod((Math.floor(dayMs/86400000)>=lichunDay?Y:Y-1)-1984,60);let latest=-Infinity,month=1;for(let y=Y-1;y<=Y+1;y++)for(let j=0;j<12;j++){const i=(2+j*2)%24,t=term(i===0?y+1:y,i);if(t<=noon&&t>latest){latest=t;month=j+1}}const a=Math.floor((14-M)/12),y=Y+4800-a,m=M+12*a-3,jdn=D+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045,di=mod(jdn+49,60),ys=yi%10,ms=mod((ys%5)*2+2+month-1,10),mb=mod(month+1,12),hb=mod(Math.floor((h+1)/2),12),hs=mod((di%10%5)*2+hb,10);return [[ys,yi%12,1],[ms,mb,2],[di%10,di%12,2],[hs,hb,1]]}
