import * as E from '../src/engine.js';
import assert from 'node:assert/strict';
const C = (s) => { const m = s.match(/^(10|[2-9AKQJ])([SHCD])$/); const r = {A:14,K:13,Q:12,J:11}[m[1]] || +m[1]; return E.makeCard(r, m[2], {id:s}); };
const H = (...xs) => xs.map(C);
let n=0; const t=(name,f)=>{f();n++;console.log('ok',name);};

t('Pair K', () => { const r = E.scorePlay(H('KS','KH'), {}); assert.equal(r.type,'Pair'); assert.equal(r.score, 60); });
t('High card chỉ tính lá cao nhất', () => { const r = E.scorePlay(H('2S','9H','KD'), {}); assert.equal(r.type,'High Card'); assert.equal(r.chips, 15); assert.equal(r.score, 15); });
t('Flush', () => { const r = E.scorePlay(H('2H','5H','9H','JH','AH'), {}); assert.equal(r.type,'Flush'); assert.equal(r.chips, 35+2+5+9+10+11); assert.equal(r.score, (35+37)*4); });
t('Straight A-5', () => { const r = E.scorePlay(H('AS','2H','3D','4C','5S'), {}); assert.equal(r.type,'Straight'); });
t('Không có straight K-A-2', () => { const r = E.scorePlay(H('QS','KH','AD','2C','3S'), {}); assert.equal(r.type,'High Card'); });
t('Four Fingers flush 4 lá', () => { const r = E.scorePlay(H('2H','5H','9H','JH','AS'), {jokers:[{id:'four_fingers'}]}); assert.equal(r.type,'Flush'); assert.equal(r.scoringIds.length,4); });
t('Thứ tự joker (ví dụ Destructoid)', () => {
  const p = H('2S','2H','5D','5C'); const ice={id:'ice_cream',v:95}, pop={id:'popcorn',v:16}, st={id:'stencil'};
  const good = E.scorePlay(p,{jokers:[ice,pop,st]}), bad = E.scorePlay(p,{jokers:[st,pop,ice]});
  assert.equal(good.chips,129); assert.equal(good.mult,54); assert.equal(bad.mult,22);
  const o = E.bestJokerOrder({hand:p, jokers:[st,pop,ice]}); const ids=o.order.map(j=>j.id); assert.ok(ids.indexOf('popcorn')<ids.indexOf('stencil'));
});
t('Baron + Mime + Steel K trên tay', () => {
  const k = E.makeCard(13,'S',{id:'k',enh:'steel'});
  const r = E.scorePlay(H('2S','2H'), {held:[k], jokers:[{id:'baron'},{id:'mime'}]});
  // mỗi lần kích hoạt: steel ×1.5, baron ×1.5 ; 2 lần → ×1.5^4
  assert.equal(r.mult, Math.round(2*1.5**4*100)/100);
});
t('Red seal + Hack retrigger', () => {
  const a = E.makeCard(3,'S',{id:'a',seal:'red'}), b=E.makeCard(3,'H',{id:'b'});
  const r = E.scorePlay([a,b], {jokers:[{id:'hack'}]}); assert.equal(r.chips, 10 + 3*3 + 3*2);
});
t('Blueprint chép Cavendish', () => { const r = E.scorePlay(H('KS','KH'), {jokers:[{id:'blueprint'},{id:'cavendish'}]}); assert.equal(r.mult, 18); });
t('Polychrome joker áp sau', () => { const r = E.scorePlay(H('KS','KH'), {jokers:[{id:'joker',ed:'poly'}]}); assert.equal(r.mult, 9); });
t('Stone luôn được tính', () => { const s=E.makeCard(2,'S',{id:'st',enh:'stone'}); const r=E.scorePlay([...H('KS','KH'),s],{}); assert.equal(r.chips,10+20+50); });
t('Blind target', () => { assert.equal(E.blindTarget(0,1,0),300); assert.equal(E.blindTarget(0,8,2),100000); assert.equal(E.blindTarget(5,8,2),400000); });

t('Plasma Deck cân bằng chip/mult', () => { const r = E.scorePlay(H('KS','KH'), {plasma:true}); assert.equal(r.score, 16*16); });
t('Checkered 52 lá chỉ ♠ ♥', () => { const d = E.deckCards('checkered'); assert.equal(d.length, 52); assert.ok(d.every(c => c.suit==='S'||c.suit==='H')); assert.equal(new Set(d.map(c=>c.id)).size, 52); });
t('Abandoned 40 lá', () => { assert.equal(E.deckCards('abandoned').length, 40); });

// Advise + thời gian
const deck = E.standardDeck();
const hand = ['AS','KS','7S','4S','9H','9D','3C','JD'].map(id=>deck.find(c=>c.id===id));
const rem = deck.filter(c=>!hand.includes(c));
let t0=Date.now();
const a = E.advise({hand, deckRemaining: rem, need: 800, handsLeft: 4, discardsLeft: 3, jokers:[{id:'joker'},{id:'droll'}]});
console.log('advise', a.action, a.reason, a.discard?.discard, a.play.type, a.play.score, Date.now()-t0,'ms');
t0=Date.now();
const a2 = E.advise({hand, deckRemaining: rem, need: 100, handsLeft: 4, discardsLeft: 3, jokers:[]});
console.log('advise2', a2.action, a2.play.type, a2.play.score, Date.now()-t0,'ms');
t0=Date.now();
const sh = E.adviseShop({jokers:[{id:'joker'}], money:12, fullDeck:deck, handSize:8}, [{kind:'joker',joker:{id:'cavendish'},price:4},{kind:'joker',joker:{id:'sly'},price:3},{kind:'planet',hand:'Pair',price:3}]);
console.log('shop', sh.items.map(i=>[i.joker?.id||i.hand, (i.gain*100).toFixed(0)+'%']), Date.now()-t0,'ms');
t0=Date.now();
console.log('skip', E.adviseSkip({jokers:[{id:'joker'}], fullDeck:deck, ante:1, stakeIdx:0}, 0, 'Negative'), Date.now()-t0,'ms');
console.log(n,'tests passed');
