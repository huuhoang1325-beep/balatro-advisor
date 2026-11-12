import * as E from '../src/engine.js';
import * as C from '../src/catalog.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ocr = JSON.parse(fs.readFileSync(new URL('./ocr-samples.json', import.meta.url)));
const W = 2376, H = 1080; let n = 0;
const t = (name, f) => { f(); n++; console.log('ok', name); };
const P = (k) => C.parseScreen(ocr[k], W, H);

t('đủ 150 joker có tên', () => assert.equal(C.ALL_JOKER_NAMES_LIST.length, 150));
t('màn chơi: Small Blind, cần 600', () => { const s = P('a4987c13-image.jpg'); assert.equal(s.screen, 'round'); assert.equal(s.target, 600); assert.equal(s.blind, 0); assert.equal(s.ante, 1); });
t('màn chơi: Big Blind, cần 900', () => { const s = P('97a8d3b9-image.jpg'); assert.equal(s.screen, 'round'); assert.equal(s.target, 900); assert.equal(s.blind, 1); });
t('shop: nhận ra shop, không phải màn chơi', () => { const s = P('826cbc8f-image.jpg'); assert.equal(s.screen, 'shop'); });
t('pack Buffoon + Business Card Holographic', () => { const s = P('8dd303b9-image.jpg'); assert.equal(s.screen, 'pack'); assert.equal(s.packType, 'buffoon'); assert.equal(s.tooltip.name, 'Business Card'); assert.equal(s.tooltip.ed, 'holo'); });
t('pack Standard + 10 of Clubs Gold', () => { const s = P('78877427-image.jpg'); assert.equal(s.screen, 'pack'); assert.equal(s.packType, 'standard'); assert.equal(s.tooltip.kind, 'card'); assert.equal(s.tooltip.rank, 10); assert.equal(s.tooltip.suit, 'C'); assert.equal(s.tooltip.enh, 'gold'); });
t('shop có panel app che: Turtle Bean', () => { const s = P('73a1b1cd-image.jpg'); assert.equal(s.screen, 'shop'); assert.equal(s.tooltip.name, 'Turtle Bean'); });
t('khớp tên OCR sai vài chữ', () => { assert.equal(C.fuzzyFind('Busines Card', C.CATALOG).name, 'Business Card'); assert.equal(C.fuzzyFind('Cavendlsh', C.CATALOG).name, 'Cavendish'); assert.equal(C.fuzzyFind('Hands', C.CATALOG), null); });

const deck = E.standardDeck();
const st = { jokers: [{ id: 'joker' }], money: 12, fullDeck: deck, handSize: 8, jokerSlots: 5, ante: 1, levels: {}, hands: 4 };
t('khuyên shop: mua joker mạnh, bỏ món yếu', () => {
  const r = C.adviseShopFull(st, [
    { kind: 'joker', name: 'Cavendish', price: 4 }, { kind: 'joker', name: 'Turtle Bean', price: 6 },
    { kind: 'voucher', name: 'Clearance Sale', price: 10 }, { kind: 'pack', name: 'Buffoon Pack', type: 'buffoon', size: 'normal', price: 4 }]);
  const buy = r.plan.filter((p) => p.act === 'buy').map((p) => p.name);
  console.log('   plan:', r.plan.map((p) => `${p.act} ${p.name} (${p.why})`).join(' | '), 'reroll', !!r.reroll);
  assert.ok(buy.includes('Cavendish')); assert.ok(!buy.includes('Clearance Sale'));
});
t('pack Buffoon: chọn joker tốt hơn', () => {
  const r = C.advisePack(st, 'buffoon', [{ kind: 'joker', name: 'Joker' }, { kind: 'joker', name: 'Raised Fist' }, { kind: 'joker', name: 'Spare Trousers' }, { kind: 'joker', name: 'Business Card', ed: 'holo' }]);
  console.log('   ', r.rated.map((x) => `${x.name} ${x.score.toFixed(1)}`).join(' | '));
  assert.ok(r.picks.length === 1);
});
t('tarot The Star chỉ lá không phải ♦', () => {
  const hand = ['AS', '9H', 'KD', '4C', '2D'].map((id) => deck.find((c) => c.id === id));
  const ids = C.tarotTargets(C.TAROTS.find((x) => x.name === 'The Star'), hand, { fullDeck: deck });
  assert.equal(ids.length, 3); assert.ok(ids.every((id) => !id.endsWith('D')));
});
t('Standard pack: lấy lá Gold, bỏ lá thường', () => {
  const r = C.advisePack(st, 'standard', [{ kind: 'card', name: '10 of Clubs', rank: 10, suit: 'C' }, { kind: 'card', name: '10 of Clubs', rank: 10, suit: 'C', enh: 'gold' }]);
  assert.equal(r.picks[0].enh, 'gold');
});
console.log(n, 'tests passed');
