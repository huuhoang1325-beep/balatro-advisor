// Balatro Advisor — bộ não: nhận diện tay, tính điểm, chọn nước, xếp joker, chấm shop.
// Bám theo trình tự evaluate_play của Balatro 1.0.1. Giá trị ngẫu nhiên dùng kỳ vọng.

export const SUITS = ['S', 'H', 'C', 'D'];
export const SUIT_SYM = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
export const RANK_LABEL = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' };

export const HAND_TYPES = [
  // tên, chip gốc, mult gốc, +chip/level, +mult/level, tên hành tinh
  ['Flush Five', 160, 16, 50, 3, 'Eris'],
  ['Flush House', 140, 14, 40, 4, 'Ceres'],
  ['Five of a Kind', 120, 12, 35, 3, 'Planet X'],
  ['Straight Flush', 100, 8, 40, 4, 'Neptune'],
  ['Four of a Kind', 60, 7, 30, 3, 'Mars'],
  ['Full House', 40, 4, 25, 2, 'Earth'],
  ['Flush', 35, 4, 15, 2, 'Jupiter'],
  ['Straight', 30, 4, 30, 3, 'Saturn'],
  ['Three of a Kind', 30, 3, 20, 2, 'Venus'],
  ['Two Pair', 20, 2, 20, 1, 'Uranus'],
  ['Pair', 10, 2, 15, 1, 'Mercury'],
  ['High Card', 5, 1, 10, 1, 'Pluto'],
];
export const HAND_INFO = Object.fromEntries(HAND_TYPES.map(([n, c, m, dc, dm, p]) => [n, { chips: c, mult: m, dc, dm, planet: p }]));

// Điểm gốc mỗi ante (Small Blind). Big ×1,5, Boss ×2.
export const ANTE_BASE = {
  white: [100, 300, 800, 2000, 5000, 11000, 20000, 35000, 50000],
  green: [100, 300, 900, 2600, 5500, 10000, 20000, 36000, 60000],
  purple: [100, 300, 1000, 3200, 9000, 25000, 60000, 110000, 200000],
};
export const STAKES = ['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'];
export function blindTarget(stakeIdx, ante, blind /*0 small,1 big,2 boss*/, bossMult = 2) {
  const table = stakeIdx >= 5 ? ANTE_BASE.purple : stakeIdx >= 2 ? ANTE_BASE.green : ANTE_BASE.white;
  let base;
  if (ante <= 8) base = table[Math.max(0, ante)];
  else {
    // Endless: công thức của game (get_blind_amount)
    const a = table[8], b = 1.6, c = ante - 8, d = 1 + 0.2 * c;
    base = Math.floor(a * Math.pow(b + Math.pow(0.75 * c, d), c));
    const k = Math.pow(10, Math.floor(Math.log10(base)) - 1);
    base = Math.floor(base / k) * k;
  }
  const mult = blind === 0 ? 1 : blind === 1 ? 1.5 : bossMult;
  return Math.floor(base * mult);
}

// ---------- Lá bài ----------
let _uid = 1;
export function makeCard(rank, suit, opts = {}) {
  return { id: opts.id || `c${_uid++}`, rank, suit, enh: opts.enh || null, ed: opts.ed || null, seal: opts.seal || null, bonusChips: opts.bonusChips || 0, debuffed: !!opts.debuffed };
}
export function standardDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(makeCard(r, s, { id: `${RANK_LABEL[r]}${s}` }));
  return d;
}
// 15 deck khởi đầu: chỉ số ảnh hưởng tới gợi ý + thành phần bộ bài.
// hands/discards/hand/slots/money là mức thay đổi so với gốc (4 đánh, 3 bỏ, 8 lá, 5 ô joker, $4).
export const DECKS = [
  { id: 'red', name: 'Red Deck', vi: '+1 lượt bỏ', discards: 1 },
  { id: 'blue', name: 'Blue Deck', vi: '+1 lượt đánh', hands: 1 },
  { id: 'yellow', name: 'Yellow Deck', vi: '+$10 khởi đầu', money: 10 },
  { id: 'green', name: 'Green Deck', vi: 'Tiền theo lượt thừa, không có lãi', noInterest: true },
  { id: 'black', name: 'Black Deck', vi: '+1 ô joker, −1 lượt đánh', slots: 1, hands: -1 },
  { id: 'magic', name: 'Magic Deck', vi: 'Crystal Ball + 2 The Fool' },
  { id: 'nebula', name: 'Nebula Deck', vi: 'Telescope, −1 ô tiêu hao' },
  { id: 'ghost', name: 'Ghost Deck', vi: 'Spectral trong shop, có Hex' },
  { id: 'abandoned', name: 'Abandoned Deck', vi: 'Không có lá mặt (40 lá)', comp: 'noFace' },
  { id: 'checkered', name: 'Checkered Deck', vi: '26 ♠ + 26 ♥', comp: 'checkered' },
  { id: 'zodiac', name: 'Zodiac Deck', vi: 'Tarot/Planet Merchant, Overstock' },
  { id: 'painted', name: 'Painted Deck', vi: '+2 lá trên tay, −1 ô joker', hand: 2, slots: -1 },
  { id: 'anaglyph', name: 'Anaglyph Deck', vi: 'Double Tag sau mỗi Boss' },
  { id: 'plasma', name: 'Plasma Deck', vi: 'Cân bằng Chip và Mult, blind ×2', plasma: true },
  { id: 'erratic', name: 'Erratic Deck', vi: 'Số và chất ngẫu nhiên — sửa bộ bài bằng tay', comp: 'erratic' },
];
export const DECK_BY_ID = Object.fromEntries(DECKS.map((d) => [d.id, d]));
export function deckCards(deckId) {
  const d = DECK_BY_ID[deckId] || DECKS[0];
  if (d.comp === 'noFace') return standardDeck().filter((c) => c.rank < 11 || c.rank === 14);
  if (d.comp === 'checkered') {
    const out = [];
    for (const s of ['S', 'H']) for (const r of RANKS) for (const k of ['', 'b']) out.push(makeCard(r, s, { id: `${RANK_LABEL[r]}${s}${k}` }));
    return out;
  }
  return standardDeck();
}

export const cardLabel =(c) => (c.enh === 'stone' ? 'Stone' : `${RANK_LABEL[c.rank]}${SUIT_SYM[c.suit]}`);
const isFace = (c, F) => c.enh !== 'stone' && (F.pareidolia || c.rank === 11 || c.rank === 12 || c.rank === 13);
const chipValue = (r) => (r === 14 ? 11 : r >= 10 ? 10 : r);

// ---------- Joker ----------
// kind: flat | suit | hand | xhand | perCard | held | retrig | rule | value | econ | copy
// value: true nếu joker có giá trị tích lũy người chơi nhập (vd Ride the Bus +12).
export const JOKERS = [
  // +Mult / +Chip phẳng
  { id: 'joker', name: 'Joker', vi: '+4 Mult', r: 1 },
  { id: 'greedy', name: 'Greedy Joker', vi: '+3 Mult mỗi lá ♦ được tính', r: 1 },
  { id: 'lusty', name: 'Lusty Joker', vi: '+3 Mult mỗi lá ♥ được tính', r: 1 },
  { id: 'wrathful', name: 'Wrathful Joker', vi: '+3 Mult mỗi lá ♠ được tính', r: 1 },
  { id: 'gluttonous', name: 'Gluttonous Joker', vi: '+3 Mult mỗi lá ♣ được tính', r: 1 },
  { id: 'jolly', name: 'Jolly Joker', vi: '+8 Mult nếu có Pair', r: 1 },
  { id: 'zany', name: 'Zany Joker', vi: '+12 Mult nếu có Three of a Kind', r: 1 },
  { id: 'mad', name: 'Mad Joker', vi: '+10 Mult nếu có Two Pair', r: 1 },
  { id: 'crazy', name: 'Crazy Joker', vi: '+12 Mult nếu có Straight', r: 1 },
  { id: 'droll', name: 'Droll Joker', vi: '+10 Mult nếu có Flush', r: 1 },
  { id: 'sly', name: 'Sly Joker', vi: '+50 Chip nếu có Pair', r: 1 },
  { id: 'wily', name: 'Wily Joker', vi: '+100 Chip nếu có Three of a Kind', r: 1 },
  { id: 'clever', name: 'Clever Joker', vi: '+80 Chip nếu có Two Pair', r: 1 },
  { id: 'devious', name: 'Devious Joker', vi: '+100 Chip nếu có Straight', r: 1 },
  { id: 'crafty', name: 'Crafty Joker', vi: '+80 Chip nếu có Flush', r: 1 },
  { id: 'half', name: 'Half Joker', vi: '+20 Mult nếu đánh ≤3 lá', r: 1 },
  { id: 'banner', name: 'Banner', vi: '+30 Chip mỗi lượt bỏ còn lại', r: 1 },
  { id: 'mystic_summit', name: 'Mystic Summit', vi: '+15 Mult khi hết lượt bỏ', r: 1 },
  { id: 'misprint', name: 'Misprint', vi: '+0–23 Mult (kỳ vọng 11,5)', r: 1 },
  { id: 'abstract', name: 'Abstract Joker', vi: '+3 Mult mỗi joker', r: 1 },
  { id: 'raised_fist', name: 'Raised Fist', vi: 'Mult = 2× số lá nhỏ nhất trên tay', r: 1 },
  { id: 'fibonacci', name: 'Fibonacci', vi: '+8 Mult mỗi A,2,3,5,8 được tính', r: 2 },
  { id: 'scary_face', name: 'Scary Face', vi: '+30 Chip mỗi lá mặt được tính', r: 1 },
  { id: 'smiley', name: 'Smiley Face', vi: '+5 Mult mỗi lá mặt được tính', r: 1 },
  { id: 'even_steven', name: 'Even Steven', vi: '+4 Mult mỗi lá chẵn được tính', r: 1 },
  { id: 'odd_todd', name: 'Odd Todd', vi: '+31 Chip mỗi lá lẻ được tính', r: 1 },
  { id: 'scholar', name: 'Scholar', vi: 'A được tính: +20 Chip +4 Mult', r: 1 },
  { id: 'walkie_talkie', name: 'Walkie Talkie', vi: '10 hoặc 4 được tính: +10 Chip +4 Mult', r: 1 },
  { id: 'arrowhead', name: 'Arrowhead', vi: '+50 Chip mỗi ♠ được tính', r: 2 },
  { id: 'onyx_agate', name: 'Onyx Agate', vi: '+7 Mult mỗi ♣ được tính', r: 2 },
  { id: 'bloodstone', name: 'Bloodstone', vi: '♥ được tính: 1/2 ×1,5 Mult', r: 2 },
  { id: 'rough_gem', name: 'Rough Gem', vi: '♦ được tính: +$1', r: 2 },
  { id: 'gros_michel', name: 'Gros Michel', vi: '+15 Mult', r: 1 },
  { id: 'bull', name: 'Bull', vi: '+2 Chip mỗi $1', r: 2 },
  { id: 'bootstraps', name: 'Bootstraps', vi: '+2 Mult mỗi $5', r: 2 },
  { id: 'blue_joker', name: 'Blue Joker', vi: '+2 Chip mỗi lá còn trong bộ', r: 1 },
  { id: 'erosion', name: 'Erosion', vi: '+4 Mult mỗi lá thiếu so với 52', r: 2 },
  { id: 'stone_joker', name: 'Stone Joker', vi: '+25 Chip mỗi Stone trong bộ', r: 2 },
  { id: 'shoot_the_moon', name: 'Shoot the Moon', vi: '+13 Mult mỗi Q trên tay', r: 1 },
  { id: 'supernova', name: 'Supernova', vi: '+Mult = số lần đã đánh loại tay này', r: 1, value: 'lanDanh' },
  // ×Mult
  { id: 'cavendish', name: 'Cavendish', vi: '×3 Mult', r: 1 },
  { id: 'duo', name: 'The Duo', vi: '×2 nếu có Pair', r: 3 },
  { id: 'trio', name: 'The Trio', vi: '×3 nếu có Three of a Kind', r: 3 },
  { id: 'family', name: 'The Family', vi: '×4 nếu có Four of a Kind', r: 3 },
  { id: 'order', name: 'The Order', vi: '×3 nếu có Straight', r: 3 },
  { id: 'tribe', name: 'The Tribe', vi: '×2 nếu có Flush', r: 3 },
  { id: 'stencil', name: 'Joker Stencil', vi: '×1 mỗi ô joker trống', r: 2 },
  { id: 'card_sharp', name: 'Card Sharp', vi: '×3 nếu loại tay đã đánh vòng này', r: 2 },
  { id: 'blackboard', name: 'Blackboard', vi: '×3 nếu mọi lá trên tay là ♠/♣', r: 2 },
  { id: 'flower_pot', name: 'Flower Pot', vi: '×3 nếu tính đủ 4 chất', r: 2 },
  { id: 'seeing_double', name: 'Seeing Double', vi: '×2 nếu có ♣ và chất khác', r: 2 },
  { id: 'acrobat', name: 'Acrobat', vi: '×3 ở lượt đánh cuối', r: 2 },
  { id: 'baron', name: 'Baron', vi: '×1,5 mỗi K trên tay', r: 3 },
  { id: 'photograph', name: 'Photograph', vi: 'Lá mặt đầu tiên được tính ×2', r: 1 },
  { id: 'triboulet', name: 'Triboulet', vi: 'K, Q được tính ×2', r: 4 },
  { id: 'steel_joker', name: 'Steel Joker', vi: '×0,2 mỗi Steel trong bộ', r: 2 },
  { id: 'drivers_license', name: "Driver's License", vi: '×3 nếu ≥16 lá có enhancement', r: 3 },
  { id: 'ancient', name: 'Ancient Joker', vi: '×1,5 mỗi lá đúng chất được tính', r: 3, value: 'chat' },
  { id: 'idol', name: 'The Idol', vi: '×2 mỗi lá đúng số+chất được tính', r: 2, value: 'la' },
  { id: 'loyalty_card', name: 'Loyalty Card', vi: '×4 mỗi 6 lượt đánh', r: 2, value: 'kichHoat' },
  // Tích lũy — nhập giá trị hiện tại
  ...[
    ['ride_the_bus', 'Ride the Bus', 'mult'], ['green_joker', 'Green Joker', 'mult'], ['spare_trousers', 'Spare Trousers', 'mult'],
    ['flash', 'Flash Card', 'mult'], ['red_card', 'Red Card', 'mult'], ['fortune_teller', 'Fortune Teller', 'mult'],
    ['swashbuckler', 'Swashbuckler', 'mult'], ['popcorn', 'Popcorn', 'mult'], ['ceremonial', 'Ceremonial Dagger', 'mult'],
    ['runner', 'Runner', 'chips'], ['square', 'Square Joker', 'chips'], ['ice_cream', 'Ice Cream', 'chips'],
    ['castle', 'Castle', 'chips'], ['wee', 'Wee Joker', 'chips'], ['stuntman', 'Stuntman', 'chips'],
    ['hologram', 'Hologram', 'x'], ['constellation', 'Constellation', 'x'], ['lucky_cat', 'Lucky Cat', 'x'],
    ['vampire', 'Vampire', 'x'], ['campfire', 'Campfire', 'x'], ['madness', 'Madness', 'x'], ['glass_joker', 'Glass Joker', 'x'],
    ['throwback', 'Throwback', 'x'], ['hit_the_road', 'Hit the Road', 'x'], ['obelisk', 'Obelisk', 'x'],
    ['canio', 'Canio', 'x'], ['yorick', 'Yorick', 'x'], ['ramen', 'Ramen', 'x'], ['caino', 'Caino', 'x'],
  ].map(([id, name, t]) => ({ id, name, vi: t === 'x' ? 'Nhập ×Mult hiện tại' : t === 'chips' ? 'Nhập +Chip hiện tại' : 'Nhập +Mult hiện tại', r: 1, value: t })),
  // Retrigger
  { id: 'hack', name: 'Hack', vi: 'Retrigger 2,3,4,5', r: 2 },
  { id: 'sock_and_buskin', name: 'Sock and Buskin', vi: 'Retrigger lá mặt', r: 2 },
  { id: 'hanging_chad', name: 'Hanging Chad', vi: 'Retrigger lá tính đầu tiên 2 lần', r: 1 },
  { id: 'dusk', name: 'Dusk', vi: 'Retrigger mọi lá ở lượt cuối', r: 2 },
  { id: 'seltzer', name: 'Seltzer', vi: 'Retrigger mọi lá (10 lượt)', r: 2 },
  { id: 'mime', name: 'Mime', vi: 'Retrigger hiệu ứng lá trên tay', r: 2 },
  // Bẻ luật
  { id: 'four_fingers', name: 'Four Fingers', vi: 'Flush/Straight 4 lá', r: 2 },
  { id: 'shortcut', name: 'Shortcut', vi: 'Straight cách 1 bậc', r: 2 },
  { id: 'smeared', name: 'Smeared Joker', vi: '♥=♦, ♠=♣', r: 2 },
  { id: 'pareidolia', name: 'Pareidolia', vi: 'Mọi lá là lá mặt', r: 2 },
  { id: 'splash', name: 'Splash', vi: 'Mọi lá đánh đều được tính', r: 1 },
  // Sao chép
  { id: 'blueprint', name: 'Blueprint', vi: 'Sao chép joker bên phải', r: 3 },
  { id: 'brainstorm', name: 'Brainstorm', vi: 'Sao chép joker ngoài cùng trái', r: 3 },
  // Joker tự nhập
  { id: 'custom', name: 'Joker khác (tự nhập)', vi: 'Nhập +Chip / +Mult / ×Mult', r: 1, value: 'custom' },
  { id: 'passive', name: 'Joker không cộng điểm', vi: 'Kinh tế/tiện ích — chỉ chiếm ô', r: 1 },
];
export const JOKER_BY_ID = Object.fromEntries(JOKERS.map((j) => [j.id, j]));
const RETRIG = new Set(['hack', 'sock_and_buskin', 'hanging_chad', 'dusk', 'seltzer', 'mime']);
const RULES = ['four_fingers', 'shortcut', 'smeared', 'pareidolia', 'splash'];

// Joker hiệu lực sau khi Blueprint/Brainstorm sao chép.
function resolveJokers(jokers) {
  const out = [];
  const target = (i, seen) => {
    const j = jokers[i];
    if (!j || j.disabled) return null;
    if (j.id !== 'blueprint' && j.id !== 'brainstorm') return j;
    if (seen.has(i)) return null;
    seen.add(i);
    return j.id === 'blueprint' ? target(i + 1, seen) : target(0, seen);
  };
  jokers.forEach((j, i) => {
    if (j.disabled) { out.push({ src: j, eff: null }); return; }
    let eff = j;
    if (j.id === 'blueprint' || j.id === 'brainstorm') {
      const t = target(i, new Set());
      eff = t && !RULES.includes(t.id) ? t : null; // bản sao không chép luật
    }
    out.push({ src: j, eff });
  });
  return out;
}
export function ruleFlags(jokers) {
  const F = {};
  for (const j of jokers) if (!j.disabled && RULES.includes(j.id)) F[j.id] = true;
  return F;
}

// ---------- Nhận diện tay ----------
function effSuits(c, F) {
  if (c.enh === 'stone') return [];
  if (c.enh === 'wild') return SUITS;
  if (F.smeared) return c.suit === 'H' || c.suit === 'D' ? ['H', 'D'] : ['S', 'C'];
  return [c.suit];
}
function findFlush(cards, F) {
  const need = F.four_fingers ? 4 : 5;
  if (cards.length < need) return null;
  for (const s of SUITS) {
    const m = cards.filter((c) => effSuits(c, F).includes(s));
    if (m.length >= need) return m;
  }
  return null;
}
function findStraight(cards, F) {
  const need = F.four_fingers ? 4 : 5;
  const real = cards.filter((c) => c.enh !== 'stone');
  if (real.length < need) return null;
  const present = new Set();
  for (const c of real) { present.add(c.rank); if (c.rank === 14) present.add(1); }
  // tìm chuỗi dài nhất (cho phép cách 1 bậc với Shortcut)
  let best = null;
  for (let start = 1; start <= 14; start++) {
    if (!present.has(start)) continue;
    const seq = [start];
    let cur = start;
    while (true) {
      if (present.has(cur + 1)) cur = cur + 1;
      else if (F.shortcut && present.has(cur + 2)) cur = cur + 2;
      else break;
      seq.push(cur);
    }
    if (seq.length >= need && (!best || seq.length > best.length)) best = seq;
  }
  if (!best) return null;
  const ranks = new Set(best.map((r) => (r === 1 ? 14 : r)));
  return real.filter((c) => ranks.has(c.rank));
}
export function detectHand(cards, F = {}) {
  const real = cards.filter((c) => c.enh !== 'stone');
  const groups = {};
  for (const c of real) (groups[c.rank] ||= []).push(c);
  const gs = Object.values(groups).sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  const flush = findFlush(cards, F);
  const straight = findStraight(cards, F);
  const n0 = gs[0]?.length || 0, n1 = gs[1]?.length || 0;
  const contains = {
    pair: n0 >= 2, three: n0 >= 3, four: n0 >= 4, twoPair: n0 >= 2 && n1 >= 2 || n0 >= 4,
    straight: !!straight, flush: !!flush,
  };
  let type, scoring;
  if (n0 >= 5 && flush) { type = 'Flush Five'; scoring = gs[0]; }
  else if (n0 >= 3 && n1 >= 2 && flush) { type = 'Flush House'; scoring = [...gs[0], ...gs[1]]; }
  else if (n0 >= 5) { type = 'Five of a Kind'; scoring = gs[0]; }
  else if (straight && flush) { type = 'Straight Flush'; scoring = [...new Set([...straight, ...flush])]; }
  else if (n0 >= 4) { type = 'Four of a Kind'; scoring = gs[0]; }
  else if (n0 >= 3 && n1 >= 2) { type = 'Full House'; scoring = [...gs[0], ...gs[1]]; }
  else if (flush) { type = 'Flush'; scoring = flush; }
  else if (straight) { type = 'Straight'; scoring = straight; }
  else if (n0 >= 3) { type = 'Three of a Kind'; scoring = gs[0]; }
  else if (n0 >= 2 && n1 >= 2) { type = 'Two Pair'; scoring = [...gs[0], ...gs[1]]; }
  else if (n0 >= 2) { type = 'Pair'; scoring = gs[0]; }
  else {
    type = 'High Card';
    scoring = real.length ? [real.reduce((a, b) => (b.rank > a.rank ? b : a))] : [];
  }
  if (contains.four) contains.three = true;
  const set = new Set(scoring);
  for (const c of cards) if (c.enh === 'stone' || F.splash) set.add(c);
  // giữ thứ tự trái → phải như lúc đánh
  const ordered = cards.filter((c) => set.has(c));
  return { type, scoring: ordered, contains };
}

// ---------- Tính điểm ----------
// ctx: { held, jokers, levels, handsLeft (kể cả lượt này), discardsLeft, money, jokerSlots,
//        deckRemaining, fullDeck, playedTypes:Set, boss:{flint, debuffSuit, debuffFace}, oops }
export function scorePlay(played, ctx) {
  const jokers = ctx.jokers || [];
  const F = ruleFlags(jokers);
  const res = detectHand(played, F);
  const lvl = (ctx.levels && ctx.levels[res.type]) || 1;
  const hi = HAND_INFO[res.type];
  let chips = hi.chips + hi.dc * (lvl - 1);
  let mult = hi.mult + hi.dm * (lvl - 1);
  if (ctx.boss?.flint) { chips = Math.max(0, Math.round(chips / 2)); mult = Math.max(1, Math.round(mult / 2)); }
  let money = 0;
  const odds = ctx.oops ? 2 : 1;
  const resolved = resolveJokers(jokers);
  const effs = resolved.map((r) => r.eff).filter(Boolean);
  const has = (id) => effs.filter((j) => j.id === id).length;
  const isLast = (ctx.handsLeft || 1) <= 1;
  const debuffed = (c) => c.debuffed || (ctx.boss?.debuffSuit && c.enh !== 'stone' && c.enh !== 'wild' && c.suit === ctx.boss.debuffSuit) || (ctx.boss?.debuffFace && isFace(c, F));

  // 1) Lá được tính
  let firstFaceDone = false;
  res.scoring.forEach((c, idx) => {
    if (debuffed(c)) return;
    let reps = 1;
    if (c.seal === 'red') reps++;
    reps += has('hack') * (c.rank >= 2 && c.rank <= 5 && c.enh !== 'stone' ? 1 : 0);
    reps += has('sock_and_buskin') * (isFace(c, F) ? 1 : 0);
    reps += has('hanging_chad') * (idx === 0 ? 2 : 0);
    reps += has('dusk') * (isLast ? 1 : 0);
    reps += has('seltzer');
    for (let r = 0; r < reps; r++) {
      // chip/mult của lá
      chips += (c.enh === 'stone' ? 50 : chipValue(c.rank)) + (c.enh === 'bonus' ? 30 : 0) + (c.bonusChips || 0);
      if (c.enh === 'mult') mult += 4;
      if (c.enh === 'lucky') { mult += 20 * Math.min(1, odds / 5); money += 20 * Math.min(1, odds / 15); }
      if (c.enh === 'glass') mult *= 2;
      if (c.seal === 'gold') money += 3;
      if (c.ed === 'foil') chips += 50;
      if (c.ed === 'holo') mult += 10;
      if (c.ed === 'poly') mult *= 1.5;
      // joker "khi lá được tính"
      for (const j of effs) {
        const suits = effSuits(c, F);
        const face = isFace(c, F);
        switch (j.id) {
          case 'greedy': if (suits.includes('D')) mult += 3; break;
          case 'lusty': if (suits.includes('H')) mult += 3; break;
          case 'wrathful': if (suits.includes('S')) mult += 3; break;
          case 'gluttonous': if (suits.includes('C')) mult += 3; break;
          case 'fibonacci': if ([14, 2, 3, 5, 8].includes(c.rank) && c.enh !== 'stone') mult += 8; break;
          case 'scary_face': if (face) chips += 30; break;
          case 'smiley': if (face) mult += 5; break;
          case 'even_steven': if (c.enh !== 'stone' && c.rank <= 10 && c.rank % 2 === 0) mult += 4; break;
          case 'odd_todd': if (c.enh !== 'stone' && (c.rank === 14 || (c.rank <= 9 && c.rank % 2 === 1))) chips += 31; break;
          case 'scholar': if (c.rank === 14 && c.enh !== 'stone') { chips += 20; mult += 4; } break;
          case 'walkie_talkie': if ((c.rank === 10 || c.rank === 4) && c.enh !== 'stone') { chips += 10; mult += 4; } break;
          case 'arrowhead': if (suits.includes('S')) chips += 50; break;
          case 'onyx_agate': if (suits.includes('C')) mult += 7; break;
          case 'bloodstone': if (suits.includes('H')) mult *= 1 + 0.5 * Math.min(1, odds / 2); break;
          case 'rough_gem': if (suits.includes('D')) money += 1; break;
          case 'photograph': if (face && !firstFaceDone) mult *= 2; break;
          case 'triboulet': if ((c.rank === 12 || c.rank === 13) && c.enh !== 'stone') mult *= 2; break;
          case 'ancient': if (suits.includes(j.suit || 'H')) mult *= 1.5; break;
          case 'idol': if (c.enh !== 'stone' && c.rank === (j.rank || 14) && suits.includes(j.suit || 'S')) mult *= 2; break;
        }
      }
    }
    if (isFace(c, F)) firstFaceDone = true;
  });

  // 2) Lá trên tay
  const held = ctx.held || [];
  held.forEach((c) => {
    if (debuffed(c)) return;
    let reps = 1 + (c.seal === 'red' ? 1 : 0) + has('mime');
    for (let r = 0; r < reps; r++) {
      if (c.enh === 'steel') mult *= 1.5;
      for (const j of effs) {
        if (j.id === 'baron' && c.rank === 13 && c.enh !== 'stone') mult *= 1.5;
        if (j.id === 'shoot_the_moon' && c.rank === 12 && c.enh !== 'stone') mult += 13;
      }
    }
  });
  if (has('raised_fist')) {
    const rs = held.filter((c) => c.enh !== 'stone' && !debuffed(c));
    if (rs.length) {
      const low = rs.reduce((a, b) => (b.rank < a.rank ? b : a));
      const reps = 1 + (low.seal === 'red' ? 1 : 0) + has('mime');
      mult += has('raised_fist') * 2 * chipValue(low.rank) * reps;
    }
  }

  // 3) Joker, trái → phải
  const C = res.contains;
  const nJokers = jokers.length;
  const slots = ctx.jokerSlots || 5;
  const fullDeck = ctx.fullDeck || [];
  const playedTypes = ctx.playedTypes || new Set();
  for (const { src, eff: j } of resolved) {
    if (src.disabled) continue;
    if (src.ed === 'foil') chips += 50;
    if (src.ed === 'holo') mult += 10;
    if (j) {
      const v = Number(j.v) || 0;
      switch (j.id) {
        case 'joker': mult += 4; break;
        case 'jolly': if (C.pair) mult += 8; break;
        case 'zany': if (C.three) mult += 12; break;
        case 'mad': if (C.twoPair) mult += 10; break;
        case 'crazy': if (C.straight) mult += 12; break;
        case 'droll': if (C.flush) mult += 10; break;
        case 'sly': if (C.pair) chips += 50; break;
        case 'wily': if (C.three) chips += 100; break;
        case 'clever': if (C.twoPair) chips += 80; break;
        case 'devious': if (C.straight) chips += 100; break;
        case 'crafty': if (C.flush) chips += 80; break;
        case 'half': if (played.length <= 3) mult += 20; break;
        case 'banner': chips += 30 * (ctx.discardsLeft || 0); break;
        case 'mystic_summit': if ((ctx.discardsLeft || 0) === 0) mult += 15; break;
        case 'misprint': mult += 11.5; break;
        case 'abstract': mult += 3 * nJokers; break;
        case 'gros_michel': mult += 15; break;
        case 'bull': chips += 2 * Math.max(0, ctx.money || 0); break;
        case 'bootstraps': mult += 2 * Math.floor(Math.max(0, ctx.money || 0) / 5); break;
        case 'blue_joker': chips += 2 * (ctx.deckRemaining?.length || 0); break;
        case 'erosion': mult += 4 * Math.max(0, 52 - (fullDeck.length || 52)); break;
        case 'stone_joker': chips += 25 * fullDeck.filter((c) => c.enh === 'stone').length; break;
        case 'supernova': mult += v; break;
        case 'cavendish': mult *= 3; break;
        case 'duo': if (C.pair) mult *= 2; break;
        case 'trio': if (C.three) mult *= 3; break;
        case 'family': if (C.four) mult *= 4; break;
        case 'order': if (C.straight) mult *= 3; break;
        case 'tribe': if (C.flush) mult *= 2; break;
        case 'stencil': mult *= Math.max(1, slots - nJokers + jokers.filter((x) => x.id === 'stencil').length); break;
        case 'card_sharp': if (playedTypes.has(res.type)) mult *= 3; break;
        case 'blackboard': if (held.every((c) => c.enh !== 'stone' && effSuits(c, F).some((s) => s === 'S' || s === 'C'))) mult *= 3; break;
        case 'flower_pot': {
          const ss = new Set(); res.scoring.forEach((c) => effSuits(c, F).forEach((s) => ss.add(s)));
          if (ss.size >= 4) mult *= 3; break;
        }
        case 'seeing_double': {
          const sc = res.scoring.filter((c) => c.enh !== 'stone');
          const club = sc.some((c) => effSuits(c, F).includes('C'));
          const other = sc.some((c) => effSuits(c, F).some((s) => s !== 'C'));
          if (club && other && sc.length >= 2) mult *= 2; break;
        }
        case 'acrobat': if (isLast) mult *= 3; break;
        case 'steel_joker': mult *= 1 + 0.2 * fullDeck.filter((c) => c.enh === 'steel').length; break;
        case 'drivers_license': if (fullDeck.filter((c) => c.enh).length >= 16) mult *= 3; break;
        case 'loyalty_card': if (v) mult *= 4; break;
        case 'custom': chips += Number(j.chips) || 0; mult += Number(j.mult) || 0; if (Number(j.x)) mult *= Number(j.x); break;
        default:
          if (j.value === 'mult' || JOKER_BY_ID[j.id]?.value === 'mult') mult += v;
          else if (JOKER_BY_ID[j.id]?.value === 'chips') chips += v;
          else if (JOKER_BY_ID[j.id]?.value === 'x') { if (v) mult *= v; }
      }
    }
    if (src.ed === 'poly') mult *= 1.5;
  }
  if (ctx.plasma) { const avg = (chips + mult) / 2; chips = avg; mult = avg; } // Plasma Deck
  const score = Math.floor(chips * mult);
  return { type: res.type, scoringIds: res.scoring.map((c) => c.id), chips: Math.round(chips), mult: Math.round(mult * 100) / 100, score, money };
}

// ---------- Tìm nước ----------
function* subsets(arr, maxK) {
  const n = arr.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    let k = 0; for (let m = mask; m; m &= m - 1) k++;
    if (k > maxK) continue;
    const pick = [], rest = [];
    for (let i = 0; i < n; i++) (mask & (1 << i) ? pick : rest).push(arr[i]);
    yield [pick, rest];
  }
}
export function bestPlay(hand, ctx, opts = {}) {
  const must5 = ctx.boss?.psychic;
  let best = null;
  const all = [];
  for (const [pick, rest] of subsets(hand, 5)) {
    if (must5 && pick.length < Math.min(5, hand.length)) continue;
    const r = scorePlay(pick, { ...ctx, held: rest });
    // ưu tiên điểm cao, cùng điểm thì ít lá hơn (giữ lá cho sau)
    const cand = { ...r, cards: pick.map((c) => c.id) };
    if (opts.all) all.push(cand);
    if (!best || r.score > best.score || (r.score === best.score && pick.length < best.cards.length)) best = cand;
  }
  if (opts.all) { all.sort((a, b) => b.score - a.score); return { best, all }; }
  return best;
}
// Nhanh hơn cho Monte Carlo: chỉ cần điểm tốt nhất.
function bestScore(hand, ctx) {
  let best = 0;
  for (const [pick, rest] of subsets(hand, 5)) {
    const s = scorePlay(pick, { ...ctx, held: rest }).score;
    if (s > best) best = s;
  }
  return best;
}

// RNG có seed để kết quả ổn định giữa các lần bấm
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function sample(arr, k, rand) {
  const a = arr.slice(); const out = [];
  for (let i = 0; i < k && a.length; i++) { const j = Math.floor(rand() * a.length); out.push(a[j]); a[j] = a[a.length - 1]; a.pop(); }
  return out;
}

// Ứng viên bỏ bài: giữ một "lõi" (cùng chất, cùng số, chuỗi, tay tốt nhất…), bỏ phần còn lại (≤5 lá).
function discardCandidates(hand, ctx, top) {
  const F = ruleFlags(ctx.jokers || []);
  const keeps = new Map();
  const add = (keep) => {
    const ids = new Set(keep.map((c) => c.id));
    const disc = hand.filter((c) => !ids.has(c.id));
    if (!disc.length) return;
    // quá 5 lá: bỏ 5 lá ít giá trị nhất (số nhỏ, không cải biến)
    const sorted = disc.slice().sort((a, b) => (a.enh || a.ed || a.seal ? 1 : 0) - (b.enh || b.ed || b.seal ? 1 : 0) || a.rank - b.rank);
    const d = sorted.slice(0, 5);
    const key = d.map((c) => c.id).sort().join(',');
    if (!keeps.has(key)) keeps.set(key, d);
  };
  for (const s of SUITS) { const k = hand.filter((c) => effSuits(c, F).includes(s)); if (k.length >= 2) add(k); }
  const groups = {};
  hand.forEach((c) => { if (c.enh !== 'stone') (groups[c.rank] ||= []).push(c); });
  const multi = Object.values(groups).filter((g) => g.length >= 2);
  multi.forEach((g) => add(g));
  if (multi.length >= 2) add(multi.flat());
  // chuỗi: cửa sổ 5 bậc
  for (let lo = 1; lo <= 10; lo++) {
    const win = hand.filter((c) => c.enh !== 'stone' && ((c.rank >= lo && c.rank <= lo + 4) || (lo === 1 && c.rank === 14)));
    const uniq = []; const seen = new Set();
    win.forEach((c) => { const r = c.rank === 14 && lo === 1 ? 1 : c.rank; if (!seen.has(r)) { seen.add(r); uniq.push(c); } });
    if (uniq.length >= 3) add(uniq);
  }
  top.slice(0, 6).forEach((p) => add(hand.filter((c) => p.cards.includes(c.id))));
  // lá mặt / lá cao
  add(hand.filter((c) => isFace(c, F) || c.rank === 14));
  // bỏ từng lá đơn lẻ nhỏ nhất
  const byRank = hand.slice().sort((a, b) => a.rank - b.rank);
  for (let k = 1; k <= Math.min(5, hand.length - 1); k++) add(byRank.slice(k));
  return [...keeps.values()];
}

// Lời khuyên cho một lượt.
// state: { hand, deckRemaining, need (điểm còn thiếu), handsLeft, discardsLeft, handSize, ...ctx }
export function advise(state, opts = {}) {
  const t0 = Date.now();
  const ctx = { ...state };
  const hand = state.hand;
  const { best, all } = bestPlay(hand, ctx, { all: true });
  const need = Math.max(0, state.need);
  const H = state.handsLeft, D = state.discardsLeft;
  // phương án khác: mỗi loại tay một dòng, khác tay tốt nhất
  const seenT = new Set([best?.type]);
  const alts = all.filter((x) => (seenT.has(x.type) ? false : (seenT.add(x.type), true))).slice(0, 3);
  const out = { play: best, alternatives: alts, need, ms: 0 };
  if (!best) return { action: 'none', ...out };
  if (best.score >= need || D <= 0 || !state.deckRemaining?.length) {
    out.action = 'play';
    out.reason = best.score >= need ? 'Đủ điểm qua blind ngay lượt này.' : D <= 0 ? 'Hết lượt bỏ — đánh tay mạnh nhất.' : 'Bộ bài đã hết lá để rút.';
    out.ms = Date.now() - t0;
    return out;
  }
  // Monte Carlo cho các phương án bỏ bài
  const rand = rng(opts.seed || 12345);
  const samples = opts.samples || 120;
  const cands = discardCandidates(hand, ctx, all);
  const target = H <= 1 ? need : need / H; // mục tiêu mỗi lượt
  const simulate = (disc, n) => {
    const ids = new Set(disc.map((c) => c.id));
    const keep = hand.filter((c) => !ids.has(c.id));
    const drawN = Math.min(disc.length, state.deckRemaining.length);
    let hit = 0, sum = 0, hitAll = 0;
    for (let i = 0; i < n; i++) {
      const drawn = sample(state.deckRemaining, drawN, rand);
      const s = bestScore([...keep, ...drawn], { ...ctx, discardsLeft: D - 1 });
      sum += Math.min(s, need);
      if (s >= target) hit++;
      if (s >= need) hitAll++;
    }
    return { discard: disc.map((c) => c.id), cards: disc, pTarget: hit / n, pClear: hitAll / n, avg: sum / n };
  };
  // Vòng 1: lọc nhanh; vòng 2: tính kỹ 3 phương án dẫn đầu
  const quick = cands.map((d) => simulate(d, Math.max(30, Math.round(samples / 3))));
  const pre = (e) => e.pClear + 0.5 * Math.min(1, e.avg / need) + 0.3 * e.pTarget;
  quick.sort((a, b) => pre(b) - pre(a));
  const evals = quick.slice(0, 3).map((e) => simulate(e.cards, samples * 3));
  // Giá trị một phương án = khả năng xong blind ngay tay này + tiến độ kỳ vọng (+ đạt mục tiêu mỗi lượt khi còn nhiều tay).
  // Bỏ bài tốn một lượt bỏ: phạt nhẹ, nặng hơn khi còn ít lượt bỏ.
  const wT = H <= 1 ? 0 : 0.3;
  const value = (pClear, avg, pT) => pClear + 0.5 * Math.min(1, avg / need) + wT * pT;
  const penalty = 0.12 / Math.max(1, D);
  evals.forEach((e) => (e.value = value(e.pClear, e.avg, e.pTarget) - penalty));
  evals.sort((a, b) => b.value - a.value);
  const bestD = evals[0];
  const playNowHit = best.score >= target ? 1 : 0;
  const playValue = value(best.score >= need ? 1 : 0, Math.min(best.score, need), playNowHit);
  out.discardOptions = evals.slice(0, 3);
  if (bestD && bestD.value > playValue + 0.03) {
    out.action = 'discard';
    out.discard = bestD;
    out.reason = bestD.pClear >= 0.25
      ? `Bỏ để săn tay đủ điểm luôn: ${Math.round(bestD.pClear * 100)}% xong blind ngay lượt sau.`
      : `Bỏ để tìm tay mạnh hơn: ${Math.round(bestD.pTarget * 100)}% đạt mục tiêu mỗi lượt (${fmt(Math.round(target))}).`;
  } else {
    out.action = 'play';
    out.reason = playNowHit ? `Tay này đạt mục tiêu mỗi lượt (${fmt(Math.round(target))}).` : 'Bỏ bài không cải thiện đáng kể — đánh tay mạnh nhất.';
  }
  out.ms = Date.now() - t0;
  return out;
}

// ---------- Xếp joker ----------
function* permutations(a) {
  if (a.length <= 1) { yield a.slice(); return; }
  for (let i = 0; i < a.length; i++) {
    const rest = a.slice(0, i).concat(a.slice(i + 1));
    for (const p of permutations(rest)) yield [a[i], ...p];
  }
}
// Đánh giá thứ tự joker trên: tay hiện tại + các tay mẫu rút từ bộ bài đầy đủ.
export function bestJokerOrder(state, opts = {}) {
  const jokers = state.jokers || [];
  if (jokers.length < 2) return { order: jokers, gain: 0 };
  const rand = rng(opts.seed || 777);
  const pool = state.fullDeck?.length ? state.fullDeck : standardDeck();
  const hs = state.handSize || 8;
  const plays = [];
  const add = (hand) => { const b = bestPlay(hand, state); if (b) plays.push({ cards: hand.filter((c) => b.cards.includes(c.id)), held: hand.filter((c) => !b.cards.includes(c.id)) }); };
  if (state.hand?.length) add(state.hand);
  for (let i = 0; i < (opts.samples || 25); i++) add(sample(pool, hs, rand));
  const evalOrder = (order) => plays.reduce((s, p, i) => s + Math.log(1 + scorePlay(p.cards, { ...state, jokers: order, held: p.held }).score) * (i === 0 && state.hand?.length ? 3 : 1), 0);
  const base = evalOrder(jokers);
  let best = { order: jokers, v: base };
  if (jokers.length <= 6) for (const p of permutations(jokers)) { const v = evalOrder(p); if (v > best.v + 1e-9) best = { order: p, v }; }
  const changed = best.order.some((j, i) => j !== jokers[i]);
  // ước lượng % tăng điểm trên tay hiện tại
  let gain = 0;
  if (changed && state.hand?.length) {
    const a = bestPlay(state.hand, state)?.score || 0;
    const b = bestPlay(state.hand, { ...state, jokers: best.order })?.score || 0;
    gain = a ? b / a - 1 : 0;
  }
  return { order: best.order, changed, gain };
}

// ---------- Sức điểm & shop ----------
// Sức điểm = trung bình hình học điểm tay tốt nhất trên các bàn tay mẫu.
export function power(state, opts = {}) {
  const rand = rng(opts.seed || 999);
  const pool = state.fullDeck?.length ? state.fullDeck : standardDeck();
  const hs = state.handSize || 8;
  const n = opts.samples || 40;
  let logSum = 0;
  for (let i = 0; i < n; i++) {
    const h = sample(pool, hs, rand);
    const b = bestScore(h, { ...state, handsLeft: 2, discardsLeft: state.discards ?? 3, money: state.money, deckRemaining: pool });
    logSum += Math.log(1 + b);
  }
  return Math.exp(logSum / n) - 1;
}
function weakestJokerIndex(state) {
  let worst = -1, worstP = Infinity;
  state.jokers.forEach((j, i) => {
    if (j.eternal) return;
    const p = power({ ...state, jokers: state.jokers.filter((_, k) => k !== i) }, { samples: 20 });
    if (p < worstP) { worstP = p; worst = i; }
  });
  return worst;
}
// offers: [{kind:'joker', joker:{id,ed,v,...}, price} | {kind:'planet', hand, price} | {kind:'other', name, price}]
export function adviseShop(state, offers, opts = {}) {
  const base = power(state, opts);
  const slots = state.jokerSlots || 5;
  const money = state.money || 0;
  const interestCap = state.interestCap || 25;
  const res = offers.map((o) => {
    let after = base, note = '';
    if (o.kind === 'joker') {
      let js = [...state.jokers];
      const neg = o.joker.ed === 'neg';
      if (!neg && js.length >= slots) {
        const w = weakestJokerIndex(state);
        if (w < 0) return { ...o, gain: 0, note: 'Hết ô, không có joker để bán' };
        note = `thay ${JOKER_BY_ID[js[w].id]?.name || js[w].id}`;
        js.splice(w, 1);
      }
      js.push({ ...o.joker, ed: neg ? null : o.joker.ed });
      const order = bestJokerOrder({ ...state, jokers: js }, { samples: 12 }).order;
      after = power({ ...state, jokers: order, jokerSlots: slots + (neg ? 1 : 0) }, opts);
    } else if (o.kind === 'planet') {
      const levels = { ...(state.levels || {}) };
      levels[o.hand] = (levels[o.hand] || 1) + 1;
      after = power({ ...state, levels }, opts);
    } else {
      return { ...o, gain: null, note: 'Không mô phỏng được — tự cân nhắc' };
    }
    const gain = base ? after / base - 1 : 0;
    // mất lãi nếu tiền tụt qua mốc $5
    const lostInterest = Math.max(0, Math.floor(Math.min(money, interestCap) / 5) - Math.floor(Math.min(Math.max(0, money - o.price), interestCap) / 5));
    return { ...o, gain, after, note, lostInterest, afford: o.price <= money };
  });
  res.sort((a, b) => (b.gain ?? -1) - (a.gain ?? -1));
  return { base, items: res };
}

// Nên skip blind không? needNext = điểm của blind kế tiếp sẽ phải đánh.
export const GOOD_TAGS = {
  Negative: 5, Rare: 4, Uncommon: 3, Polychrome: 3, Holographic: 2, Foil: 2, Investment: 4, Economy: 3, Double: 3,
  Voucher: 3, Charm: 2, Meteor: 2, Ethereal: 2, Buffoon: 2, Coupon: 2, D6: 1, Juggle: 1, Garbage: 1, Handy: 2,
  Skip: 1, Speed: 2, 'Top-up': 1, Orbital: 3, Boss: 1, Standard: 1,
};
export function adviseSkip(state, blindIdx, tag) {
  const p = power(state, { samples: 30 });
  const hands = state.hands ?? 4;
  const cap = p * hands * 0.75; // ước lượng điểm cả vòng (không phải tay nào cũng tốt nhất)
  const nextReq = blindTarget(state.stakeIdx || 0, state.ante || 1, blindIdx + 1, 2);
  const bossReq = blindTarget(state.stakeIdx || 0, state.ante || 1, 2, 2);
  const tagV = GOOD_TAGS[tag] ?? 1;
  const margin = cap / Math.max(nextReq, bossReq);
  let skip = blindIdx < 2 && margin >= 1.3 && tagV >= 2;
  if (blindIdx < 2 && margin >= 2 && tagV >= 1) skip = true;
  return { skip, power: p, roundCap: cap, nextReq, bossReq, margin, tagValue: tagV };
}

export const fmt = (n) => (n == null ? '—' : n >= 1e9 ? n.toExponential(2) : Math.round(n).toLocaleString('vi-VN'));
