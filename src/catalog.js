// Danh mục đầy đủ + đọc màn hình (OCR) + khuyên shop/pack.
import { JOKERS, JOKER_BY_ID, HAND_TYPES, HAND_INFO, SUITS, RANK_LABEL, SUIT_SYM, power, adviseShop, bestJokerOrder, fmt } from './engine.js';

// ---------- Tên đầy đủ 150 joker (bản 1.0.1). Joker chưa mô phỏng điểm → 'passive'. ----------
const ALL_JOKER_NAMES = [
  'Joker', 'Greedy Joker', 'Lusty Joker', 'Wrathful Joker', 'Gluttonous Joker', 'Jolly Joker', 'Zany Joker', 'Mad Joker', 'Crazy Joker', 'Droll Joker',
  'Sly Joker', 'Wily Joker', 'Clever Joker', 'Devious Joker', 'Crafty Joker', 'Half Joker', 'Credit Card', 'Banner', 'Mystic Summit', '8 Ball',
  'Misprint', 'Raised Fist', 'Chaos the Clown', 'Scary Face', 'Abstract Joker', 'Delayed Gratification', 'Gros Michel', 'Even Steven', 'Odd Todd', 'Scholar',
  'Business Card', 'Supernova', 'Ride the Bus', 'Egg', 'Runner', 'Ice Cream', 'Splash', 'Blue Joker', 'Faceless Joker', 'Green Joker',
  'Superposition', 'To Do List', 'Cavendish', 'Red Card', 'Square Joker', 'Riff-raff', 'Photograph', 'Reserved Parking', 'Mail-In Rebate', 'Hallucination',
  'Fortune Teller', 'Juggler', 'Drunkard', 'Golden Joker', 'Popcorn', 'Walkie Talkie', 'Smiley Face', 'Golden Ticket', 'Swashbuckler', 'Hanging Chad',
  'Shoot the Moon', 'Joker Stencil', 'Four Fingers', 'Mime', 'Ceremonial Dagger', 'Marble Joker', 'Loyalty Card', 'Dusk', 'Fibonacci', 'Steel Joker',
  'Hack', 'Pareidolia', 'Space Joker', 'Burglar', 'Blackboard', 'Sixth Sense', 'Constellation', 'Hiker', 'Card Sharp', 'Madness',
  'Seance', 'Vampire', 'Shortcut', 'Hologram', 'Cloud 9', 'Rocket', 'Midas Mask', 'Luchador', 'Gift Card', 'Turtle Bean',
  'Erosion', 'To the Moon', 'Stone Joker', 'Lucky Cat', 'Bull', 'Diet Cola', 'Trading Card', 'Flash Card', 'Spare Trousers', 'Ramen',
  'Seltzer', 'Castle', 'Mr. Bones', 'Acrobat', 'Sock and Buskin', 'Troubadour', 'Certificate', 'Smeared Joker', 'Throwback', 'Rough Gem',
  'Bloodstone', 'Arrowhead', 'Onyx Agate', 'Glass Joker', 'Showman', 'Flower Pot', 'Merry Andy', 'Oops! All 6s', 'The Idol', 'Seeing Double',
  'Matador', 'Satellite', 'Cartomancer', 'Astronomer', 'Bootstraps', 'DNA', 'Vagabond', 'Baron', 'Obelisk', 'Baseball Card',
  'Ancient Joker', 'Campfire', 'Blueprint', 'Wee Joker', 'Hit the Road', 'The Duo', 'The Trio', 'The Family', 'The Order', 'The Tribe',
  'Stuntman', 'Invisible Joker', 'Brainstorm', "Driver's License", 'Burnt Joker', 'Canio', 'Triboulet', 'Yorick', 'Chicot', 'Perkeo',
];
// Joker kinh tế / tiện ích: mô tả ngắn để người chơi biết vì sao app vẫn khuyên mua
const PASSIVE_NOTES = {
  'Credit Card': 'Nợ tới −$20', '8 Ball': 'Lá 8 được tính: 1/4 tạo Tarot', 'Chaos the Clown': '1 lần reroll miễn phí mỗi shop',
  'Delayed Gratification': '$2 mỗi lượt bỏ còn lại nếu không bỏ', 'Business Card': 'Lá mặt được tính: 1/2 +$2', Egg: '+$3 giá bán mỗi vòng',
  'Faceless Joker': 'Bỏ ≥3 lá mặt: +$5', Superposition: 'Straight có A: tạo Tarot', 'To Do List': 'Đánh đúng tay chỉ định: +$4',
  'Riff-raff': 'Đầu blind: tạo 2 joker Common', 'Reserved Parking': 'Lá mặt trên tay: 1/2 +$1', 'Mail-In Rebate': 'Bỏ đúng số chỉ định: +$5',
  Hallucination: 'Mở pack: 1/2 tạo Tarot', Juggler: '+1 lá trên tay', Drunkard: '+1 lượt bỏ', 'Golden Joker': '+$4 cuối vòng',
  'Golden Ticket': 'Lá Gold được tính: +$4', 'Marble Joker': 'Đầu blind: thêm 1 lá Stone', 'Space Joker': '1/4 tăng level tay vừa đánh',
  Burglar: '+3 lượt đánh, mất hết lượt bỏ', 'Sixth Sense': 'Đánh 1 lá 6 đầu tiên: hủy, tạo Spectral', Hiker: 'Lá được tính +5 chip vĩnh viễn',
  Seance: 'Straight Flush: tạo Spectral', 'Cloud 9': '+$1 mỗi lá 9 trong bộ', Rocket: '+$1 cuối vòng, tăng dần', 'Midas Mask': 'Lá mặt được tính → Gold',
  Luchador: 'Bán: vô hiệu Boss', 'Gift Card': '+$1 giá bán mọi joker/lá mỗi vòng', 'Turtle Bean': '+5 lá trên tay, giảm 1 mỗi vòng',
  'To the Moon': '+$1 lãi mỗi $5', 'Diet Cola': 'Bán: tạo Double Tag', 'Trading Card': 'Bỏ đúng 1 lá đầu tiên: hủy, +$3',
  'Mr. Bones': 'Cứu mạng nếu đạt ≥25% điểm', Troubadour: '+2 lá trên tay, −1 lượt đánh', Certificate: 'Đầu vòng: thêm 1 lá có seal',
  Showman: 'Món có thể xuất hiện trùng', 'Merry Andy': '+3 lượt bỏ, −1 lá trên tay', 'Oops! All 6s': 'Nhân đôi mọi xác suất',
  Matador: 'Kích hoạt hiệu ứng Boss: +$8', Satellite: '+$1 mỗi loại planet đã dùng', Cartomancer: 'Đầu blind: tạo Tarot',
  Astronomer: 'Planet và gói Celestial miễn phí', DNA: 'Tay 1 lá đầu tiên: nhân bản lá đó', Vagabond: 'Đánh khi ≤$4: tạo Tarot',
  'Baseball Card': 'Joker Uncommon ×1,5 Mult', 'Invisible Joker': 'Sau 2 vòng: bán để nhân bản 1 joker', 'Burnt Joker': 'Lượt bỏ đầu: tăng level tay đó',
  Chicot: 'Vô hiệu mọi Boss', Perkeo: 'Rời shop: tạo bản Negative của 1 lá tiêu hao',
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const NAME_TO_ID = Object.fromEntries(JOKERS.map((j) => [j.name.toLowerCase(), j.id]));
NAME_TO_ID['joker stencil'] = 'stencil'; NAME_TO_ID['smeared joker'] = 'smeared'; NAME_TO_ID['the idol'] = 'idol';
// thêm joker còn thiếu vào danh sách chung dưới dạng 'passive' có tên thật
for (const n of ALL_JOKER_NAMES) {
  if (!NAME_TO_ID[n.toLowerCase()]) {
    const id = 'p_' + slug(n);
    const def = { id, name: n, vi: PASSIVE_NOTES[n] || 'Hiệu ứng không cộng điểm trực tiếp', r: 1, passive: true };
    JOKERS.push(def); JOKER_BY_ID[id] = def; NAME_TO_ID[n.toLowerCase()] = id;
  }
}
export function jokerIdByName(name) { return NAME_TO_ID[name.toLowerCase()] || null; }

// ---------- Tarot / Planet / Spectral / Voucher / Pack ----------
// tarot: v = giá trị gốc (0–5); act = hành động trên lá (để chỉ lá cần chọn)
export const TAROTS = [
  { name: 'The Fool', vi: 'Tạo lại Tarot/Planet vừa dùng', v: 2 },
  { name: 'The Magician', vi: '≤2 lá thành Lucky', v: 2.5, act: { kind: 'enh', enh: 'lucky', n: 2 } },
  { name: 'The High Priestess', vi: 'Tạo 2 Planet', v: 3 },
  { name: 'The Empress', vi: '≤2 lá thành Mult (+4 Mult)', v: 3, act: { kind: 'enh', enh: 'mult', n: 2 } },
  { name: 'The Emperor', vi: 'Tạo 2 Tarot', v: 2.5 },
  { name: 'The Hierophant', vi: '≤2 lá thành Bonus (+30 chip)', v: 2.5, act: { kind: 'enh', enh: 'bonus', n: 2 } },
  { name: 'The Lovers', vi: '1 lá thành Wild', v: 2.5, act: { kind: 'enh', enh: 'wild', n: 1 } },
  { name: 'The Chariot', vi: '1 lá thành Steel (×1,5 khi trên tay)', v: 3.5, act: { kind: 'enh', enh: 'steel', n: 1 } },
  { name: 'Justice', vi: '1 lá thành Glass (×2, có thể vỡ)', v: 3.5, act: { kind: 'enh', enh: 'glass', n: 1 } },
  { name: 'The Hermit', vi: 'Gấp đôi tiền (tối đa +$20)', v: 0, money: 'hermit' },
  { name: 'The Wheel of Fortune', vi: '1/4: thêm edition cho joker', v: 1.5 },
  { name: 'Strength', vi: '≤2 lá +1 bậc', v: 2.5, act: { kind: 'strength', n: 2 } },
  { name: 'The Hanged Man', vi: 'Hủy ≤2 lá (làm mỏng bộ)', v: 3, act: { kind: 'destroy', n: 2 } },
  { name: 'Death', vi: 'Chọn 2 lá: lá trái thành lá phải', v: 3, act: { kind: 'death', n: 2 } },
  { name: 'Temperance', vi: 'Nhận tổng giá bán joker (tối đa $50)', v: 0, money: 'temperance' },
  { name: 'The Devil', vi: '1 lá thành Gold', v: 2, act: { kind: 'enh', enh: 'gold', n: 1 } },
  { name: 'The Tower', vi: '1 lá thành Stone', v: 0.5, act: { kind: 'enh', enh: 'stone', n: 1 } },
  { name: 'The Star', vi: '≤3 lá thành ♦', v: 2.5, act: { kind: 'suit', suit: 'D', n: 3 } },
  { name: 'The Moon', vi: '≤3 lá thành ♣', v: 2.5, act: { kind: 'suit', suit: 'C', n: 3 } },
  { name: 'The Sun', vi: '≤3 lá thành ♥', v: 2.5, act: { kind: 'suit', suit: 'H', n: 3 } },
  { name: 'Judgement', vi: 'Tạo 1 joker ngẫu nhiên', v: 2.5, needSlot: true },
  { name: 'The World', vi: '≤3 lá thành ♠', v: 2.5, act: { kind: 'suit', suit: 'S', n: 3 } },
];
export const PLANETS = HAND_TYPES.map(([hand, , , , , planet]) => ({ name: planet, hand }));
export const SPECTRALS = [
  { name: 'Familiar', vi: 'Hủy 1 lá, thêm 3 lá mặt có Enhancement', v: 2 },
  { name: 'Grim', vi: 'Hủy 1 lá, thêm 2 lá A có Enhancement', v: 2 },
  { name: 'Incantation', vi: 'Hủy 1 lá, thêm 4 lá số có Enhancement', v: 1.5 },
  { name: 'Talisman', vi: 'Gắn Gold Seal cho 1 lá', v: 2.5 },
  { name: 'Aura', vi: 'Thêm Foil/Holo/Poly cho 1 lá', v: 3 },
  { name: 'Wraith', vi: 'Tạo joker Rare, tiền về $0', v: 2.5, needSlot: true },
  { name: 'Sigil', vi: 'Mọi lá trên tay thành cùng 1 chất ngẫu nhiên', v: 2 },
  { name: 'Ouija', vi: 'Mọi lá trên tay thành cùng 1 số, −1 lá trên tay', v: 1 },
  { name: 'Ectoplasm', vi: 'Negative cho 1 joker ngẫu nhiên, −1 lá trên tay', v: 3 },
  { name: 'Immolate', vi: 'Hủy 5 lá ngẫu nhiên trên tay, +$20', v: 2.5 },
  { name: 'Ankh', vi: 'Nhân bản 1 joker, hủy các joker khác', v: 1.5 },
  { name: 'Deja Vu', vi: 'Gắn Red Seal cho 1 lá', v: 3 },
  { name: 'Hex', vi: 'Polychrome 1 joker, hủy các joker khác', v: 1 },
  { name: 'Trance', vi: 'Gắn Blue Seal cho 1 lá', v: 2 },
  { name: 'Medium', vi: 'Gắn Purple Seal cho 1 lá', v: 1.5 },
  { name: 'Cryptid', vi: 'Tạo 2 bản sao 1 lá', v: 3 },
  { name: 'The Soul', vi: 'Tạo joker Legendary', v: 5, needSlot: true },
  { name: 'Black Hole', vi: '+1 level mọi loại tay', v: 5 },
];
// voucher: v = giá trị gốc 0–5
export const VOUCHERS = [
  ['Overstock', 4, '+1 ô bán lẻ trong shop'], ['Overstock Plus', 4, '+1 ô bán lẻ nữa'],
  ['Clearance Sale', 3, 'Giảm 25% giá shop'], ['Liquidation', 3, 'Giảm 50% giá shop'],
  ['Hone', 2, 'Edition xuất hiện ×2'], ['Glow Up', 2.5, 'Edition xuất hiện ×4'],
  ['Reroll Surplus', 3, 'Reroll rẻ hơn $2'], ['Reroll Glut', 3, 'Reroll rẻ hơn thêm $2'],
  ['Crystal Ball', 2, '+1 ô tiêu hao'], ['Omen Globe', 1.5, 'Gói Arcana có thể ra Spectral'],
  ['Telescope', 3, 'Gói Celestial luôn có planet tay hay đánh nhất'], ['Observatory', 4.5, 'Planet đang giữ: ×1,5 Mult cho tay đó'],
  ['Grabber', 5, '+1 lượt đánh mỗi vòng'], ['Nacho Tong', 5, '+1 lượt đánh nữa'],
  ['Wasteful', 3, '+1 lượt bỏ mỗi vòng'], ['Recyclomancy', 3, '+1 lượt bỏ nữa'],
  ['Tarot Merchant', 1, 'Tarot xuất hiện nhiều hơn'], ['Tarot Tycoon', 1, 'Tarot xuất hiện nhiều hơn nữa'],
  ['Planet Merchant', 1.5, 'Planet xuất hiện nhiều hơn'], ['Planet Tycoon', 1.5, 'Planet xuất hiện nhiều hơn nữa'],
  ['Seed Money', 3, 'Trần lãi $10 (giữ $50)'], ['Money Tree', 3, 'Trần lãi $20 (giữ $100)'],
  ['Blank', 1, 'Không có tác dụng (mở Antimatter)'], ['Antimatter', 5, '+1 ô joker'],
  ['Magic Trick', 1, 'Shop bán lá bài thường'], ['Illusion', 1, 'Lá bài trong shop có Enhancement/Edition/Seal'],
  ['Hieroglyph', 3, '−1 ante, −1 lượt đánh'], ['Petroglyph', 2, '−1 ante, −1 lượt bỏ'],
  ["Director's Cut", 2, 'Reroll Boss 1 lần mỗi ante ($10)'], ['Retcon', 2, 'Reroll Boss không giới hạn ($10)'],
  ['Paint Brush', 4, '+1 lá trên tay'], ['Palette', 4, '+1 lá trên tay nữa'],
].map(([name, v, vi]) => ({ name, v, vi }));
export const PACKS = [
  { name: 'Buffoon Pack', type: 'buffoon', vi: 'Joker' }, { name: 'Arcana Pack', type: 'arcana', vi: 'Tarot' },
  { name: 'Celestial Pack', type: 'celestial', vi: 'Planet' }, { name: 'Standard Pack', type: 'standard', vi: 'Lá bài thường' },
  { name: 'Spectral Pack', type: 'spectral', vi: 'Spectral' },
];
export const BOSSES = {
  'The Flint': { flint: true }, 'The Psychic': { psychic: true }, 'The Plant': { debuffFace: true }, 'The Wall': { wall: true },
  'The Club': { debuffSuit: 'C' }, 'The Goad': { debuffSuit: 'S' }, 'The Window': { debuffSuit: 'D' }, 'The Head': { debuffSuit: 'H' },
  'Violet Vessel': { wall: 6 },
};
const BOSS_NAMES = ['The Hook', 'The Ox', 'The House', 'The Wall', 'The Wheel', 'The Arm', 'The Club', 'The Fish', 'The Psychic', 'The Goad',
  'The Water', 'The Window', 'The Manacle', 'The Eye', 'The Mouth', 'The Plant', 'The Serpent', 'The Pillar', 'The Needle', 'The Head',
  'The Tooth', 'The Flint', 'The Mark', 'Amber Acorn', 'Verdant Leaf', 'Violet Vessel', 'Crimson Heart', 'Cerulean Bell'];
const ENH_NAMES = { 'Bonus Card': 'bonus', 'Mult Card': 'mult', 'Wild Card': 'wild', 'Glass Card': 'glass', 'Steel Card': 'steel', 'Stone Card': 'stone', 'Gold Card': 'gold', 'Lucky Card': 'lucky' };
const SEAL_NAMES = { 'Gold Seal': 'gold', 'Red Seal': 'red', 'Blue Seal': 'blue', 'Purple Seal': 'purple' };
const ED_NAMES = { Foil: 'foil', Holographic: 'holo', Polychrome: 'poly', Negative: 'neg' };

// Danh mục chung để tìm kiếm và khớp tên OCR
export const CATALOG = [
  ...JOKERS.filter((j) => j.id !== 'custom' && j.id !== 'passive').map((j) => ({ kind: 'joker', name: j.name, id: j.id, vi: j.vi })),
  ...TAROTS.map((t) => ({ kind: 'tarot', name: t.name, vi: t.vi })),
  ...PLANETS.map((p) => ({ kind: 'planet', name: p.name, vi: `+1 level ${p.hand}`, hand: p.hand })),
  ...SPECTRALS.map((s) => ({ kind: 'spectral', name: s.name, vi: s.vi })),
  ...VOUCHERS.map((v) => ({ kind: 'voucher', name: v.name, vi: v.vi })),
  ...PACKS.flatMap((p) => ['', 'Jumbo ', 'Mega '].map((sz) => ({ kind: 'pack', name: sz + p.name, type: p.type, size: sz.trim().toLowerCase() || 'normal', vi: p.vi }))),
];
export const KIND_VI = { joker: 'Joker', tarot: 'Tarot', planet: 'Planet', spectral: 'Spectral', voucher: 'Voucher', pack: 'Pack', card: 'Lá bài' };

// ---------- Khớp tên mờ (OCR đọc sai vài chữ) ----------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
export function fuzzyFind(text, list, key = 'name') {
  const t = norm(text); if (t.length < 3) return null;
  let best = null, bestD = Infinity;
  for (const it of list) {
    const k = norm(it[key]); if (!k) continue;
    const d = lev(t, k);
    const tol = k.length <= 5 ? 0 : k.length <= 9 ? 1 : 2;
    if (d <= tol && d < bestD) { best = it; bestD = d; }
  }
  return best;
}

// ---------- Đọc màn hình từ OCR ----------
// lines: [{t, box:[x,y,w,h]}], W,H kích thước ảnh. Trả về loại màn hình + dữ liệu đọc được.
export function parseScreen(lines, W, H) {
  const has = (re) => lines.some((l) => re.test(l.t));
  const find = (re) => lines.find((l) => re.test(l.t));
  const out = { screen: 'unknown', tooltip: null, prices: [], packName: null };
  const isRound = has(/play\s*hand|sort\s*hand/i);
  const isShop = has(/reroll|next\s*round/i);
  // màn mở pack: có "Choose N" hoặc "Skip" + tên pack trên cùng một dòng (shop chỉ có chữ PACK rời trên hình bao)
  const packLine = lines.find((l) => /(buffoon|arcana|celestial|standard|spectral)\s*pack/i.test(l.t));
  const isPack = has(/choose\s*\d/i) || (has(/^\s*skip\s*$/i) && !!packLine);
  const isBlindSelect = lines.filter((l) => /^select$/i.test(l.t.trim())).length >= 1 && !isRound;
  out.screen = isRound ? 'round' : isPack ? 'pack' : isShop ? 'shop' : isBlindSelect ? 'blind' : 'unknown';
  if (isPack) {
    const nm = packLine ? packLine.t.replace(/pack/i, ' Pack').replace(/\s+/g, ' ').trim() : '';
    const p = PACKS.find((p) => norm(nm).includes(p.type)) || null;
    out.packName = p ? p.name : null; out.packType = p ? p.type : null;
    const ch = find(/choose\s*(\d)/i); out.choose = ch ? +ch.t.match(/(\d)/)[1] : 1;
  }
  // Điểm cần + tên blind
  const sal = find(/score\s*at\s*least/i);
  if (sal) {
    const num = lines.filter((l) => /^[\d,.]+$/.test(l.t.replace(/\s/g, '')) && l.box[1] > sal.box[1] && l.box[1] < sal.box[1] + sal.box[3] * 4 && Math.abs((l.box[0] + l.box[2] / 2) - (sal.box[0] + sal.box[2] / 2)) < sal.box[2])
      .sort((a, b) => a.box[1] - b.box[1])[0];
    if (num) out.target = parseInt(num.t.replace(/[^\d]/g, ''), 10);
  }
  if (has(/small\s*blind/i)) out.blind = 0; else if (has(/big\s*blind/i)) out.blind = 1;
  else { const b = lines.map((l) => fuzzyFind(l.t, BOSS_NAMES.map((n) => ({ name: n })))).find(Boolean); if (b) { out.blind = 2; out.boss = b.name; } }
  const ante = lines.find((l) => /^\s*(\d{1,2})\s*\/\s*8\s*$/.test(l.t) && l.box[0] < W * 0.3);
  if (ante) out.ante = +ante.t.match(/(\d{1,2})/)[1];
  // Tiền: "$N" ở cột trái
  const money = lines.find((l) => /^\$\s*\d+$/.test(l.t.trim()) && l.box[0] + l.box[2] < W * 0.3);
  if (money) out.money = +money.t.replace(/[^\d]/g, '');
  // Giá: "$N" ngoài cột trái
  out.prices = lines.filter((l) => /^\$\s*\d+$/.test(l.t.trim()) && l.box[0] > W * 0.3).map((l) => ({ v: +l.t.replace(/[^\d]/g, ''), box: l.box }));
  const reroll = find(/reroll\s*\$?\s*(\d+)/i); if (reroll) out.reroll = +reroll.t.match(/(\d+)/)[1];
  // Bảng mô tả (tooltip): một dòng khớp tên món
  for (const l of lines) {
    // chữ trên hình (JOKER, BUFFOON, VOUCHER…) viết hoa toàn bộ; tên trong bảng mô tả thì không
    if (/[A-Z]{4,}/.test(l.t) && l.t === l.t.toUpperCase()) continue;
    const it = fuzzyFind(l.t, CATALOG);
    if (it && it.kind !== 'pack') {
      out.tooltip = { ...it, box: l.box };
      break;
    }
    const pc = l.t.match(/^(ace|king|queen|jack|10|[2-9])\s*of\s*(spades|hearts|clubs|diamonds)$/i);
    if (pc) {
      const rk = { ace: 14, king: 13, queen: 12, jack: 11 }[pc[1].toLowerCase()] || +pc[1];
      out.tooltip = { kind: 'card', name: l.t, rank: rk, suit: pc[2][0].toUpperCase(), box: l.box };
      break;
    }
  }
  if (out.tooltip) {
    for (const l of lines) {
      const t = l.t.trim();
      for (const [k, v] of Object.entries(ED_NAMES)) if (norm(t) === norm(k)) out.tooltip.ed = v;
      for (const [k, v] of Object.entries(ENH_NAMES)) if (norm(t) === norm(k)) out.tooltip.enh = v;
      for (const [k, v] of Object.entries(SEAL_NAMES)) if (norm(t) === norm(k)) out.tooltip.seal = v;
    }
    // giá gần bảng mô tả nhất (khoảng cách thật); quá xa thì không gán — dùng giá mặc định
    const cx = (b) => b[0] + b[2] / 2, cy = (b) => b[1] + b[3] / 2;
    const d = (b) => Math.hypot(cx(b) - cx(out.tooltip.box), cy(b) - cy(out.tooltip.box));
    const p = out.prices.slice().sort((a, b) => d(a.box) - d(b.box))[0];
    if (p && out.screen === 'shop' && d(p.box) < H * 0.3) out.tooltip.price = p.v;
  }
  return out;
}

// ---------- Tay chính + giá trị ----------
export function mainHand(state) {
  const counts = state.handCounts || {};
  let best = 'Pair', bv = -1;
  for (const [n] of HAND_TYPES) {
    const lvl = state.levels?.[n] || 1;
    const v = (lvl - 1) * 3 + (counts[n] || 0);
    if (v > bv) { bv = v; best = n; }
  }
  return bv > 0 ? best : null;
}
function interestOf(m, cap) { return Math.floor(Math.min(Math.max(0, m), cap) / 5); }

function packValue(item, state) {
  const p = PACKS.find((x) => x.type === item.type) || PACKS[0];
  const bonus = item.size === 'mega' ? 1.5 : item.size === 'jumbo' ? 0.7 : 0;
  const free = (state.jokerSlots || 5) - (state.jokers?.length || 0);
  let v = 0, why = '';
  if (p.type === 'buffoon') { v = free > 0 ? (state.ante <= 4 ? 3.5 : 2.5) : 1.5; why = free > 0 ? 'còn ô joker' : 'hết ô joker, phải bán để lấy'; }
  else if (p.type === 'celestial') { v = mainHand(state) ? 3 : 2; why = mainHand(state) ? `tăng level ${mainHand(state)}` : 'chưa có tay chính'; }
  else if (p.type === 'arcana') { v = 2.5; why = 'tarot chỉnh bộ bài'; }
  else if (p.type === 'spectral') { v = 2.2; why = 'mạnh nhưng có cái giá'; }
  else { v = 1.2; why = 'thường ít giá trị'; }
  return { v: v + bonus, why };
}


// Điểm cho một joker đã mô phỏng: lấy mức tăng điểm; joker kinh tế/tích lũy có giá trị sàn
function rateJoker(ref, gain, note) {
  const def = JOKER_BY_ID[ref.id || jokerIdByName(ref.name)] || {};
  let score = (gain || 0) * 10;
  let why = `+${Math.round((gain || 0) * 100)}% điểm mỗi tay`;
  if (def.passive && score < 2.5) { score = 2.5; why = def.vi + (gain > 0.05 ? ` · ${why}` : ''); }
  if (['mult', 'chips', 'x'].includes(def.value) && !ref.v && score < 3) { score = 3; why = 'tăng dần theo thời gian'; }
  if (ref.ed === 'neg') { score += 3; why += ' · Negative: không tốn ô'; }
  if (note) why += ` · ${note}`;
  return { score, why };
}

// Khuyên shop đầy đủ. items: [{kind, name, id?, price, ed?, hand?, type?, size?}]
export function adviseShopFull(state, items, opts = {}) {
  const money = state.money || 0;
  const cap = state.interestCap ?? 25;
  const jk = items.filter((i) => i.kind === 'joker' || i.kind === 'planet');
  const sim = jk.length ? adviseShop(state, jk.map((i) => i.kind === 'joker'
    ? { kind: 'joker', joker: { id: i.id || jokerIdByName(i.name) || 'passive', ed: i.ed || null }, price: i.price, ref: i }
    : { kind: 'planet', hand: i.hand || PLANETS.find((p) => p.name === i.name)?.hand, price: i.price, ref: i }), opts) : { base: power(state, opts), items: [] };
  const base = sim.base;
  const rated = [];
  for (const r of sim.items) {
    const it = r.ref;
    const { score, why } = it.kind === 'joker' ? rateJoker(it, r.gain, null) : { score: (r.gain || 0) * 10, why: `+${Math.round((r.gain || 0) * 100)}% điểm mỗi tay` };
    rated.push({ ...it, score, why, note: r.note });
  }
  for (const it of items) {
    if (it.kind === 'voucher') {
      const v = VOUCHERS.find((x) => x.name === it.name);
      let s = v ? v.v : 1;
      if ((it.name === 'Seed Money' || it.name === 'Money Tree') && money < 30) s -= 1.5;
      if (it.name === 'Observatory' && !mainHand(state)) s -= 2;
      rated.push({ ...it, score: s * 2, why: v ? v.vi : '' });
    } else if (it.kind === 'pack') {
      const pv = packValue(it, state); rated.push({ ...it, score: pv.v * 2, why: pv.why });
    } else if (it.kind === 'tarot' || it.kind === 'spectral') {
      const d = (it.kind === 'tarot' ? TAROTS : SPECTRALS).find((x) => x.name === it.name);
      let s = d ? d.v : 1;
      if (d?.money === 'hermit') s = Math.min(20, money - (it.price || 3)) / 4;
      rated.push({ ...it, score: s * 1.6, why: d ? d.vi : '' });
    }
  }
  rated.sort((a, b) => b.score - a.score);
  // Lập kế hoạch mua: món đáng (score ≥ ngưỡng) theo thứ tự; giữ mốc lãi khi món không đủ đáng
  const plan = []; let m = money;
  const slotsFree = (state.jokerSlots || 5) - (state.jokers?.length || 0);
  let jokersBought = 0;
  for (const it of rated) {
    if (!it.price && it.price !== 0) continue;
    if (it.price > m) { plan.push({ ...it, act: 'skip', why2: 'không đủ tiền' }); continue; }
    const lost = interestOf(m, cap) - interestOf(m - it.price, cap);
    const threshold = 3 + lost * 1.5 + (state.ante >= 7 ? -2 : 0); // cuối ván tiền ít giá trị
    if (it.kind === 'joker' && slotsFree - jokersBought <= 0 && it.ed !== 'neg' && !it.note) { plan.push({ ...it, act: 'skip', why2: 'hết ô joker' }); continue; }
    if (it.score >= threshold) {
      plan.push({ ...it, act: 'buy', why2: lost ? `mất $${lost} lãi/vòng nhưng đáng` : '' });
      m -= it.price; if (it.kind === 'joker') jokersBought++;
    } else plan.push({ ...it, act: 'skip', why2: lost ? `không đáng mất $${lost} lãi` : 'giá trị thấp' });
  }
  const rr = opts.reroll ?? state.reroll ?? 5;
  const bestLeft = plan.filter((p) => p.act === 'skip').reduce((a, r) => Math.max(a, r.score), 0);
  const canReroll = m - rr >= Math.min(cap, 25) && state.ante <= 6;
  const weak = base < (state.nextBossReq || Infinity) / Math.max(1, state.hands || 4);
  const reroll = canReroll && (weak || bestLeft < 4) && (slotsFree - jokersBought > 0);
  return {
    base, plan, moneyAfter: m, interest: interestOf(m, cap),
    reroll: reroll ? { cost: rr, why: weak ? 'sức điểm chưa đủ cho Boss, còn dư tiền trên mốc lãi' : 'không có món tốt, dư tiền trên mốc lãi' } : null,
  };
}

// ---------- Chọn lá trong pack ----------
function cardScore(c) {
  let s = 0;
  if (c.enh) s += { steel: 3, glass: 3, mult: 2, bonus: 1.5, lucky: 2, gold: 2, wild: 1.5, stone: 0.5 }[c.enh] || 1;
  if (c.seal) s += { red: 3, gold: 2, blue: 1.5, purple: 1 }[c.seal] || 1;
  if (c.ed) s += { poly: 3, holo: 2, foil: 1 }[c.ed] || 1;
  return s;
}
// Lá cần chọn cho tarot cải biến: trả về id lá trên tay
export function tarotTargets(tarot, hand, state) {
  const act = tarot.act; if (!act || !hand?.length) return [];
  const suitCount = {}; (state.fullDeck || []).forEach((c) => (suitCount[c.suit] = (suitCount[c.suit] || 0) + 1));
  const sorted = (f) => hand.slice().sort(f).slice(0, act.n).map((c) => c.id);
  if (act.kind === 'suit') return sorted((a, b) => (a.suit === act.suit) - (b.suit === act.suit) || (suitCount[a.suit] || 0) - (suitCount[b.suit] || 0)).filter((id) => hand.find((c) => c.id === id).suit !== act.suit);
  if (act.kind === 'destroy') return sorted((a, b) => cardScore(a) - cardScore(b) || a.rank - b.rank);
  if (act.kind === 'strength') return sorted((a, b) => (a.rank === 14) - (b.rank === 14) || b.rank - a.rank);
  if (act.kind === 'death') { const best = hand.slice().sort((a, b) => cardScore(b) - cardScore(a) || b.rank - a.rank)[0]; const worst = hand.slice().sort((a, b) => cardScore(a) - cardScore(b) || a.rank - b.rank)[0]; return worst && best && worst !== best ? [worst.id, best.id] : []; }
  if (act.kind === 'enh') {
    if (act.enh === 'steel') return sorted((a, b) => (b.rank === 13) - (a.rank === 13) || (!a.enh) - (!b.enh) || b.rank - a.rank);
    if (act.enh === 'gold') return sorted((a, b) => a.rank - b.rank);
    return sorted((a, b) => (!b.enh) - (!a.enh) || b.rank - a.rank);
  }
  return [];
}
// options: [{kind, name, ...}] ; trả về danh sách xếp hạng + gợi ý
export function advisePack(state, packType, options, opts = {}) {
  const hand = state.hand || [];
  const rated = [];
  const jokerOpts = options.filter((o) => o.kind === 'joker' || o.kind === 'planet');
  if (jokerOpts.length) {
    const r = adviseShop(state, jokerOpts.map((o) => o.kind === 'joker'
      ? { kind: 'joker', joker: { id: o.id || jokerIdByName(o.name) || 'passive', ed: o.ed || null }, price: 0, ref: o }
      : { kind: 'planet', hand: o.hand || PLANETS.find((p) => p.name === o.name)?.hand, price: 0, ref: o }), opts);
    for (const x of r.items) {
      const rj = x.ref.kind === 'joker' ? rateJoker(x.ref, x.gain, x.note) : { score: (x.gain || 0) * 10, why: `+${Math.round((x.gain || 0) * 100)}% điểm mỗi tay` };
      rated.push({ ...x.ref, ...rj });
    }
  }
  for (const o of options) {
    if (o.kind === 'tarot' || o.kind === 'spectral') {
      const d = (o.kind === 'tarot' ? TAROTS : SPECTRALS).find((x) => x.name === o.name) || { v: 1, vi: '' };
      let s = d.v;
      if (d.money === 'hermit') s = Math.min(20, state.money || 0) / 4;
      if (d.money === 'temperance') s = Math.min(50, (state.jokers || []).length * 2) / 5;
      if (d.needSlot && (state.jokers?.length || 0) >= (state.jokerSlots || 5)) s -= 2;
      if (d.act?.kind === 'suit') {
        const cnt = (state.fullDeck || []).filter((c) => c.suit === d.act.suit).length;
        const flushy = (state.jokers || []).some((j) => ['droll', 'crafty', 'tribe', 'smeared', 'four_fingers'].includes(j.id)) || mainHand(state) === 'Flush';
        s += flushy ? (cnt >= 13 ? 1 : 0) : -1;
      }
      const targets = d.act ? tarotTargets(d, hand, state) : [];
      rated.push({ ...o, score: s * 2, why: d.vi, targets });
    } else if (o.kind === 'card') {
      const s = cardScore(o);
      rated.push({ ...o, score: s * 1.5, why: s ? 'lá có cải biến tốt' : 'lá thường — thêm vào làm loãng bộ bài' });
    }
  }
  rated.sort((a, b) => b.score - a.score);
  const choose = opts.choose || 1;
  const picks = rated.filter((r) => r.score >= 2).slice(0, choose);
  return { rated, picks, skip: picks.length === 0 };
}

export const ALL_JOKER_NAMES_LIST = ALL_JOKER_NAMES;
export { fmt, RANK_LABEL, SUIT_SYM, SUITS, HAND_INFO, bestJokerOrder };
