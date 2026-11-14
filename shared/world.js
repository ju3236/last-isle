// 세계 규칙: 서버(온라인)와 브라우저(오프라인)가 같은 코드를 쓴다. 상태(this.s)는 통째로 JSON 저장 가능.
(function (X, D) {
  'use strict';
  const { ITEMS, RECIPES, BASE_COST, ZONES, CATS, PLACES, CRATE, MOBS, BOT_NAMES, BOT_LINES, COLORS } = D;
  const START_PTS = 12, STAT_MAX = 15, INV = 15, SLOTS = ['weapon', 'armor', 'head', 'arm', 'boots'], STASH = 12, MAXLV = 10, TURN = 25, IDLE = 180;
  const TEMPO = { fast: { n: '빠른 판 (약 20분)', len: 150 }, normal: { n: '보통 (약 3시간)', len: 1200 }, long: { n: '긴 판 (약 2일)', len: 21600 } };
  const DUR = { explore: 10, hunt: 10, move: 20, build: 45 }, COST = { explore: 12, hunt: 15, move: 8, build: 25, attack: 15 };
  // 능력치: [이름, 효과 설명]
  const STAT_FX = {
    str: ['근력', '공격력 +2'],
    agi: ['민첩', '회피 · 먼저 치기 · 도주 확률 상승, 이동 시간 -3%'],
    con: ['체질', '최대 체력 +12, 방어 +1, 허기 감소 -4%'],
    luk: ['운', '급소 +2%, 조우 · 추가 수확 확률 상승'],
    end: ['지구력', '행동 스태미너 소모 -4%, 휴식 회복 +10%'],
  };
  // 고유 스킬: 캐릭터를 만들 때 하나 고른다
  const SKILLS = {
    stealth: ['은신', '다른 생존자에게 조우당할 확률 -40%'],
    medic: ['응급처치', '회복 아이템 효과 +50%, 쉴 때 체력 회복 2배'],
    hunter: ['사냥꾼', '짐승에게 받는 피해 -30%, 짐승 전리품 +1'],
    scav: ['수집가', '탐색 허탕 확률 절반, 물건 하나 더 나올 확률 +30%'],
    brawler: ['기습가', '선제공격 피해 +25%'],
    runner: ['질주', '이동 시간 -25%, 도주 성공률 +20%'],
  };
  // 밤낮 · 날씨: 구역이 닫힐 때마다 바뀐다
  const WEATHER = {
    clear: ['맑음', '특별한 효과 없음'],
    rain: ['비', '소란이 이웃 구역까지 들리지 않는다'],
    fog: ['안개', '조우 확률 -10%, 도주 성공률 +15%'],
  };
  const DROP_POOL = ['crystal', 'motor', 'plate', 'strap', 'scope', 'weave', 'armor3', 'head2', 'arm2', 'boots2', 'aid_kit', 'kit', 'power_potion'];
  const ri = n => Math.random() * n | 0, pick = a => a[ri(a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function J(w, a, b) { const c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return w + b; return w + ((c - 0xAC00) % 28 ? a : b); }
  function pickW(t) { let tot = 0; for (const k in t) tot += t[k]; let v = Math.random() * tot; for (const k in t) { v -= t[k]; if (v <= 0) return k; } }
  const JL = (ids, a, b) => { const n = ids.map(g => ITEMS[g].n); return J(n.join(', '), a, b); };
  const clean = (s, n) => String(s == null ? '' : s).replace(/[<>&\u0000-\u001f]/g, '').trim().slice(0, n);

  function cleanChar(c) {
    c = c || {};
    const st = { str: 0, agi: 0, con: 0, luk: 0, end: 0 }; let left = START_PTS;
    for (const k in st) { const v = Math.max(0, Math.min(6, left, (c.st && c.st[k]) | 0)); st[k] = v; left -= v; }
    const L = c.lines || {};
    return {
      name: clean(c.name, 10) || '이름 없는 생존자', color: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : COLORS[0],
      img: (typeof c.img === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(c.img) && c.img.length < 60000) ? c.img : '',
      weapon: ['sword', 'spear', 'bow'].includes(c.weapon) ? c.weapon : 'sword', st,
      skill: SKILLS[c.skill] ? c.skill : 'scav',
      bio: clean(c.bio, 60), lines: { meet: clean(L.meet, 40), kill: clean(L.kill, 40), die: clean(L.die, 40) },
    };
  }

  class World {
    constructor(s) { this.s = s; s.wx = s.wx || { day: true, w: 'clear' }; s.drop = s.drop || null; for (const c of Object.values(s.chars || {})) { c.st.end = c.st.end || 0; c.sp = c.sp || 0; c.skill = c.skill || 'scav'; c.ally = c.ally || 0; c.allyReq = c.allyReq || 0; } s.noise = s.noise || []; s.pv = s.pv || {}; s.pvT = s.pvT || 0; for (const c of Object.values(s.chars)) { c.visits = c.visits || {}; c.battle = 0; for (const k of SLOTS) if (c.eq[k] === undefined) c.eq[k] = null; while (c.inv.length < INV) c.inv.push(null); if (c.act && c.act.k === 'explore' && c.act.p == null) c.act = null; } }
    static create(opts) {
      opts = opts || {}; const tempo = TEMPO[opts.tempo] ? opts.tempo : 'fast';
      return new World({ v: 1, t: 0, started: false, over: null, tempo, len: TEMPO[tempo].len, nextClose: 0, phase: 0, final: false, duelT: 0, zs: ZONES.map(() => 0), order: shuffle(ZONES.map((_, i) => i)), chars: {}, nid: 1, battles: {}, piles: {}, pv: {}, pvT: 0, feed: [], chat: [], rank: [] });
    }
    cost(c, base) { return Math.max(1, Math.round(base * Math.max(0.5, 1 - 0.04 * (c.st.end || 0)))); }
    static moveCost(hops) { return COST.move + (hops - 1) * 6; }
    // 스태미너: 저절로는 아주 조금, 쉬면 빠르게 (판 길이에 비례)
    static restRate(len, inBase) { return 100 / (len * 0.2) * (inBase ? 1.6 : 1); }
    static idleRate(len) { return 100 / (len * 4); }
    legDur(c) { return Math.round(DUR.move * (1 - 0.1 * this.stats(c).agi / 3) * (c.skill === 'runner' ? 0.75 : 1)); }
    // 폐쇄되지 않은 구역만 밟는 가장 짧은 길 (출발 구역 제외, 도착 구역 포함)
    route(from, to) {
      const prev = { [from]: -1 }, q = [from];
      while (q.length) { const u = q.shift(); if (u === to) break; for (const v of ZONES[u].adj) if (prev[v] === undefined && this.s.zs[v] < 2) { prev[v] = u; q.push(v); } }
      if (prev[to] === undefined) return null;
      const p = []; for (let u = to; u !== -1; u = prev[u]) p.unshift(u); return p.slice(1);
    }
    static exDur(pl) { return 9 + pl.diff * 6; }
    static exCost(pl) { return 5 + pl.diff * 2; }
    get list() { return Object.values(this.s.chars); }
    alive() { return this.list.filter(c => c.alive); }

    addChar(def, bot) {
      const s = this.s, d = cleanChar(def), id = s.nid++;
      const c = s.chars[id] = {
        id, name: d.name, color: d.color, img: d.img, st: d.st, skill: d.skill, ally: 0, allyReq: 0, bio: d.bio, lines: d.lines, bot: !!bot, online: false, wc: d.weapon,
        hp: 0, hunger: 100, en: 100, zone: 0, alive: true, lvl: 1, xp: 0, kills: 0, inv: new Array(INV).fill(null),
        eq: { weapon: d.weapon + '1', armor: null, head: null, arm: null, boots: null }, act: null, base: null, inBase: false, battle: 0, seen: {}, bf: { atk: 0, agi: 0 }, log: [], seenAt: s.t, think: 0, starve: 0, visits: {},
      };
      c.hp = this.stats(c).maxHp;
      if (s.started) { c.zone = this.openZone(); this.log(c, `${ZONES[c.zone].n}에서 눈을 떴다.`, 'sys'); }
      return c;
    }
    addBots(n) {
      const used = new Set(this.list.map(c => c.name));
      for (let i = 0; i < n; i++) {
        let name; do { name = pick(BOT_NAMES); } while (used.has(name) && used.size < BOT_NAMES.length); used.add(name);
        const st = { str: 0, agi: 0, con: 0, luk: 0, end: 0 }, ks = Object.keys(st);
        for (let k = 0; k < START_PTS;) { const q = pick(ks); if (st[q] < 6) { st[q]++; k++; } }
        this.addChar({ name, color: pick(COLORS), weapon: pick(['sword', 'spear', 'bow']), st, skill: pick(Object.keys(SKILLS)), lines: pick(BOT_LINES) }, true);
      }
    }
    openZone() { const o = ZONES.map((_, i) => i).filter(i => this.s.zs[i] === 0); return o.length ? pick(o) : this.s.zs.findIndex(v => v < 2); }
    start() {
      const s = this.s; if (s.started) return;
      s.started = true; s.nextClose = s.t + s.len;
      const zs = shuffle(ZONES.map((_, i) => i)); let k = 0;
      for (const c of this.list) { c.zone = zs[k++ % zs.length]; c.seenAt = s.t; this.log(c, `${ZONES[c.zone].n}에서 눈을 떴다. 손에는 ${ITEMS[c.eq.weapon].n} 하나뿐이다.`, 'sys'); }
      this.feed(`실험이 시작되었다. 생존자 ${this.list.length}명.`, 'sys'); s.wx = { day: true, w: 'clear' };
    }

    stats(c) {
      const t = this.s.t, sum = f => SLOTS.reduce((a, k) => a + ((ITEMS[c.eq[k]] || {})[f] || 0), 0);
      return {
        maxHp: 100 + c.st.con * 12 + (c.lvl - 1) * 8,
        atk: Math.round((10 + c.st.str * 2 + (c.lvl - 1) + sum('atk')) * (c.bf.atk > t ? 1.3 : 1)),
        def: c.st.con + sum('def'), agi: c.st.agi + sum('agi') + (c.bf.agi > t ? 3 : 0), luk: c.st.luk + sum('luk'), end: c.st.end || 0,
      };
    }
    log(c, m, k) { c.log.push({ t: Math.round(this.s.t), m, k: k || '' }); if (c.log.length > 90) c.log.shift(); }
    feed(m, k) { const f = this.s.feed; f.push({ t: Math.round(this.s.t), m, k: k || '' }); if (f.length > 60) f.shift(); }

    // ---------- 소지품 ----------
    count(c, id) { let n = 0; for (const s of c.inv) if (s && s.id === id) n += s.n; if (c.eq[ITEMS[id].t] === id) n++; return n; }
    give(c, id, n) {
      const max = ITEMS[id].tier ? 1 : 5;
      for (const s of c.inv) if (n > 0 && s && s.id === id && s.n < max) { const k = Math.min(n, max - s.n); s.n += k; n -= k; }
      for (let i = 0; i < INV && n > 0; i++) if (!c.inv[i]) { const k = Math.min(n, max); c.inv[i] = { id, n: k }; n -= k; }
      return n;
    }
    pile(zone, id, n) { if (n <= 0 || this.s.zs[zone] === 2) return; const p = this.s.piles[zone] || (this.s.piles[zone] = []); const e = p.find(x => x.id === id); if (e) e.n += n; else p.push({ id, n }); }
    giveOrPile(c, id, n) { this.pile(c.zone, id, this.give(c, id, n)); }
    take(c, id, n) {
      for (let i = 0; i < INV && n > 0; i++) { const s = c.inv[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) c.inv[i] = null; } }
      const t = ITEMS[id].t; if (n > 0 && c.eq[t] === id) c.eq[t] = null;
    }
    has(c, need) { for (const k in need) if (this.count(c, k) < need[k]) return false; return true; }
    xp(c, n) {
      c.xp += n;
      while (c.lvl < MAXLV && c.xp >= c.lvl * 30) { c.xp -= c.lvl * 30; c.lvl++; c.hp += 18; c.sp = (c.sp || 0) + 1; this.log(c, `경험이 쌓였다. 레벨 ${c.lvl}. 능력치 포인트 +1`, 'good'); }
    }
    useItem(c, slot) {
      const s = c.inv[slot | 0]; if (!s) return '빈 칸입니다';
      const it = ITEMS[s.id], m = this.stats(c);
      if (it.tier) { const old = c.eq[it.t]; c.eq[it.t] = s.id; c.inv[slot] = old ? { id: old, n: 1 } : null; this.log(c, `${J(it.n, '을', '를')} 장비했다.`); return; }
      if (it.t === 'mat') return '그대로는 쓸 수 없는 재료입니다';
      if (it.hun) c.hunger = Math.min(100, c.hunger + it.hun);
      if (it.hp) c.hp = Math.min(m.maxHp, c.hp + it.hp * (c.skill === 'medic' ? 1.5 : 1));
      if (it.en) c.en = Math.min(100, c.en + it.en);
      if (it.buff) c.bf[it.buff] = this.s.t + this.s.len * 0.6;
      if (!--s.n) c.inv[slot] = null;
      this.log(c, `${J(it.n, '을', '를')} ${it.t === 'potion' ? '마셨다' : '먹었다'}. (${it.d})`, 'good');
    }
    craft(c, out) {
      const rec = RECIPES.find(r => r.out === out); if (!rec) return '없는 제작법입니다';
      if (!this.has(c, rec.in)) return '재료가 부족합니다';
      for (const k in rec.in) this.take(c, k, rec.in[k]);
      const it = ITEMS[out];
      if (it.tier && (!c.eq[it.t] || ITEMS[c.eq[it.t]].tier < it.tier)) { const old = c.eq[it.t]; c.eq[it.t] = out; if (old) this.giveOrPile(c, old, 1); }
      else this.giveOrPile(c, out, 1);
      this.xp(c, it.tier ? 8 * it.tier : 6);
      this.log(c, `${J(it.n, '을', '를')} 만들었다.`, 'good');
    }

    // ---------- 명령 ----------
    cmd(id, m) {
      const s = this.s, c = s.chars[id]; if (!c || !m) return '캐릭터가 없습니다';
      if (m.k === 'chat') { const t = clean(m.m, 120); if (t) { s.chat.push({ t: Math.round(s.t), id: c.id, n: c.name, m: t }); if (s.chat.length > 80) s.chat.shift(); } return; }
      if (m.k === 'spec') { const o = s.chars[m.who | 0]; if (c.alive && !s.over) return '탈락한 뒤에만 관전할 수 있습니다'; c.spec = o && o.alive ? o.id : 0; return; }
      if (!s.started) return '아직 시작 전입니다'; if (s.over) return '판이 끝났습니다'; if (!c.alive) return '이미 탈락했습니다';
      if (s.paused) return '운영자가 판을 멈춰 두었습니다';
      c.seenAt = s.t;
      if (m.k === 'ack') { if (c.fight) c.fight.ack = true; return; }
      if (c.enc && ['explore', 'hunt', 'move', 'rest', 'build', 'enter'].includes(m.k)) { c.enc = null; }
      const z = c.zone, timed = k => {
        if (c.act) return '이미 다른 행동을 하는 중입니다'; if (c.inBase && k !== 'rest') return '거점에서 나와야 합니다';
        if (COST[k] && c.en < this.cost(c, COST[k])) return '스태미너가 부족합니다. 쉬어야 합니다';
        c.en -= COST[k] ? this.cost(c, COST[k]) : 0; return null;
      };
      let e;
      switch (m.k) {
        case 'stat': {
          const k = String(m.s); if (!(k in STAT_FX)) return '없는 능력치입니다'; if (!(c.sp > 0)) return '남은 포인트가 없습니다'; if (c.st[k] >= STAT_MAX) return `한 능력치는 ${STAT_MAX}까지 올릴 수 있습니다`;
          c.st[k]++; c.sp--; if (k === 'con') c.hp += 12; this.log(c, `${STAT_FX[k][0]} ${c.st[k] - 1} → ${c.st[k]}`, 'good'); return;
        }
        case 'ally': {
          const o = s.chars[m.who | 0]; if (!o || !o.alive || o === c) return '상대가 없습니다';
          if (s.final || this.alive().length <= 3) return '이제는 누구도 믿을 수 없다';
          if (c.ally) return '이미 동맹이 있습니다'; if (o.ally) return `${J(o.name, '은', '는')} 이미 다른 동맹이 있다`;
          if (o.zone !== z || !c.seen[o.id]) return '같은 구역에서 마주친 상대에게만 청할 수 있습니다';
          if (c.enc && c.enc.id === o.id) c.enc = null;
          if (o.bot) {
            if (Math.random() < 0.55 && o.grudge !== c.id) { this.makeAlly(c, o); }
            else { this.log(c, `${J(o.name, '은', '는')} 고개를 저었다. 동맹 제안이 거절되었다.`, 'warn'); o.seen[c.id] = 1; }
          } else { o.allyReq = c.id; o.seen[c.id] = 1; this.log(c, `${o.name}에게 동맹을 제안했다. 답을 기다린다.`); this.log(o, `${J(c.name, '이', '가')} 동맹을 제안했다.`, 'warn'); }
          return;
        }
        case 'allyOk': { const o = s.chars[c.allyReq]; c.allyReq = 0; if (!o || !o.alive || o.ally || c.ally) return '이제는 받을 수 없는 제안입니다'; this.makeAlly(o, c); return; }
        case 'allyNo': { const o = s.chars[c.allyReq]; c.allyReq = 0; if (o) this.log(o, `${J(c.name, '이', '가')} 동맹 제안을 거절했다.`, 'warn'); return; }
        case 'allyBreak': { if (c.ally) this.breakAlly(c, `${J(c.name, '이', '가')} 동맹을 끊었다.`); return; }
        case 'openDrop': {
          if (!s.drop || s.drop.z !== z) return '이 구역에 보급품이 없습니다'; if (c.act) return '하던 일을 먼저 끝내야 합니다'; if (c.inBase) return '거점에서 나와야 합니다';
          c.enc = null; c.act = { k: 'open', start: s.t, end: s.t + 15 }; this.noise(z, 'drop'); this.log(c, '보급 상자의 잠금을 뜯기 시작했다.'); return;
        }
        case 'cancel': if (c.act) { c.act = null; this.log(c, '하던 일을 멈췄다.'); } return;
        case 'use': return this.useItem(c, m.slot);
        case 'craft': return this.craft(c, String(m.r));
        case 'drop': { const sl = c.inv[m.slot | 0]; if (!sl) return; c.inv[m.slot | 0] = null; this.pile(z, sl.id, sl.n); this.log(c, `${J(ITEMS[sl.id].n, '을', '를')} 내려놓았다.`); return; }
        case 'explore': {
          if (c.act) return '이미 다른 행동을 하는 중입니다'; if (c.inBase) return '거점에서 나와야 합니다';
          if (c.en < this.cost(c, COST.explore)) return '스태미너가 부족합니다. 쉬어야 합니다';
          // 구역 안 어디를 뒤질지는 그때그때 정해진다 (덜 털린 곳일수록 잘 걸린다)
          const ps = ZONES[z].places, wts = ps.map(p => 1 / (1 + (s.pv[p] || 0))); let r = Math.random() * wts.reduce((a, b) => a + b, 0), pid = ps[0];
          for (let k = 0; k < ps.length; k++) { r -= wts[k]; if (r <= 0) { pid = ps[k]; break; } }
          c.en -= this.cost(c, COST.explore); c.act = { k: 'explore', p: pid, start: s.t, end: s.t + DUR.explore }; return;
        }
        case 'hunt':
          if ((e = timed(m.k))) return e; c.act = { k: m.k, start: s.t, end: s.t + DUR[m.k] }; return;
        case 'rest': if ((e = timed('rest'))) return e; c.act = { k: 'rest', start: s.t, end: 0 }; this.log(c, c.inBase ? '거점에 몸을 뉘었다.' : '주변을 살피며 숨을 고른다.'); return;
        case 'move': {
          const to = m.to | 0; if (!ZONES[to] || to === z) return '갈 수 없는 곳입니다'; if (s.zs[to] === 2) return '폐쇄된 구역입니다';
          const path = this.route(z, to); if (!path) return '열린 길이 없습니다';
          const cost = this.cost(c, World.moveCost(path.length)); if (c.act) return '이미 다른 행동을 하는 중입니다'; if (c.inBase) return '거점에서 나와야 합니다';
          if (c.en < cost) return '스태미너가 부족합니다. 쉬어야 합니다';
          c.en -= cost; const leg = this.legDur(c);
          c.act = { k: 'move', to, path, start: s.t, leg: s.t + leg, end: s.t + leg * path.length }; return;
        }
        case 'build':
          if (s.final) return '최종 구역에서는 거점을 지을 수 없습니다'; if (s.zs[z] !== 0) return '폐쇄 예고 구역에는 지을 수 없습니다';
          if (!this.has(c, BASE_COST)) return '재료가 부족합니다';
          if ((e = timed('build'))) return e;
          for (const k in BASE_COST) this.take(c, k, BASE_COST[k]);
          c.act = { k: 'build', start: s.t, end: s.t + DUR.build }; return;
        case 'enter': if (!c.base || c.base.zone !== z) return '이 구역에 거점이 없습니다'; if (c.act) return '하던 일을 먼저 끝내야 합니다'; c.inBase = true; c.seen = {}; this.log(c, '거점에 들어가 문을 잠갔다. 여기서는 아무도 찾지 못한다.', 'good'); return;
        case 'leave': if (c.inBase) { c.inBase = false; if (c.act) c.act = null; this.log(c, '거점 밖으로 나왔다.'); } return;
        case 'stash': { if (!c.inBase) return '거점 안에서만 가능합니다'; const sl = c.inv[m.slot | 0]; if (!sl) return; if (c.base.stash.length >= STASH) return '창고가 가득 찼습니다'; c.base.stash.push(sl); c.inv[m.slot | 0] = null; return; }
        case 'unstash': { if (!c.inBase) return '거점 안에서만 가능합니다'; const sl = c.base.stash[m.i | 0]; if (!sl) return; sl.n = this.give(c, sl.id, sl.n); if (!sl.n) c.base.stash.splice(m.i | 0, 1); else return '가방이 가득 찼습니다'; return; }
        case 'loot': {
          if (c.inBase) return '거점에서 나와야 합니다'; const p = s.piles[z]; if (!p || !p.length) return '남은 짐이 없습니다';
          const got = []; s.piles[z] = p.filter(x => { const before = x.n; x.n = this.give(c, x.id, x.n); if (before > x.n) got.push(`${ITEMS[x.id].n}×${before - x.n}`); return x.n > 0; });
          this.log(c, got.length ? `남겨진 짐에서 ${got.join(', ')} 챙겼다.` : '가방이 가득 차서 아무것도 챙기지 못했다.', got.length ? 'good' : ''); return;
        }
        case 'attack': {
          const o = s.chars[m.who | 0];
          if (c.inBase) return '거점에서 나와야 합니다';
          if (!c.enc || !o || c.enc.id !== o.id) return '마주친 상대만 공격할 수 있습니다'; if (o.id === c.ally) return '동맹은 공격할 수 없습니다';
          if (!o.alive || o.zone !== z || o.inBase) { c.enc = null; return '상대가 이미 사라졌습니다'; }
          if (c.act) return '하던 일을 먼저 끝내야 합니다'; if (c.en < this.cost(c, COST.attack)) return '스태미너가 부족합니다. 쉬어야 합니다';
          c.en -= this.cost(c, COST.attack); c.enc = null; this.strike(c, o); return;
        }
        case 'ignore': { if (c.enc) { const o = s.chars[c.enc.id]; c.enc = null; this.log(c, `${J(o.name, '을', '를')} 모른 척 지나쳤다.`); } return;
        }
      }
      return '알 수 없는 명령입니다';
    }

    // ---------- 행동 완료 ----------
    finish(c) {
      const s = this.s, a = c.act, z = c.zone, Z = ZONES[z], st = this.stats(c); c.act = null;
      if (a.k === 'move') {
        const next = a.path && a.path.length ? a.path[0] : a.to;
        if (s.zs[next] === 2) { this.log(c, `${J(ZONES[next].n, '으로', '로')} 가는 길이 막혀 ${Z.n}에 멈춰 섰다.`, 'bad'); return; }
        c.zone = next; c.seen = {}; c.inBase = false;
        if (next !== a.to) {
          const rest = a.path.slice(1), leg = this.legDur(c);
          c.act = { ...a, path: rest, leg: s.t + leg, end: s.t + leg * rest.length };
          this.log(c, `${J(ZONES[next].n, '을', '를')} 지나간다.`, 'sys'); return;
        }
        const n = this.list.filter(o => o.alive && o !== c && o.zone === a.to && !o.inBase).length;
        this.log(c, `${ZONES[a.to].n}에 도착했다. ${n ? (n > 1 ? '여럿의 기척이 느껴진다.' : '누군가의 기척이 느껴진다.') : '인기척은 없다.'}`);
        return;
      }
      if (a.k === 'open') {
        if (!s.drop || s.drop.z !== z) { this.log(c, '한발 늦었다. 보급 상자는 이미 비어 있다.', 'bad'); return; }
        const got = s.drop.items; s.drop = null; for (const g of got) this.giveOrPile(c, g, 1); this.xp(c, 20);
        this.log(c, `보급품을 차지했다! ${JL(got, '을', '를')} 얻었다.`, 'good'); this.feed(`📦 ${ZONES[z].n}의 보급품을 누군가 차지했다.`, 'warn'); return;
      }
      if (a.k === 'build') { c.base = { zone: z, stash: (c.base && c.base.zone === z) ? c.base.stash : [] }; this.xp(c, 10); this.log(c, `${Z.n}에 거점을 마련했다. 안에 있는 동안은 누구에게도 들키지 않는다.`, 'good'); return; }
      if (a.k === 'hunt') {
        if (Math.random() < 0.25) { this.log(c, '한참을 뒤쫓았지만 짐승의 흔적을 놓쳤다.'); return; }
        this.skirmish(c, { mobTy: pickW({ chicken: 3, boar: 3, dog: 3, wolf: 2, bear: 1 }) }, { first: 'a' }); return;
      }
      if (a.k === 'explore') {
        const pl = PLACES[a.p], used = s.pv[pl.id] || 0;
        this.xp(c, 4 + pl.diff * 2); c.visits[pl.id] = (c.visits[pl.id] || 0) + 1; s.pv[pl.id] = used + 1;
        { // 조우: 같은 구역을 뒤지다 마주친다. 마주친 쪽이 선제공격할 수 있다.
          const near = shuffle(this.list.filter(o => o.alive && o !== c && o.zone === z && !o.inBase && o.id !== c.ally));
          const wxB = (s.wx.day ? 0 : 0.1) - (s.wx.w === 'fog' ? 0.1 : 0);
          const hit = near.find(o => Math.random() < ((s.final ? 0.75 : 0.35) + st.luk * 0.04 + wxB + (c.grudge === o.id ? 0.25 : 0)) * (o.skill === 'stealth' ? 0.6 : 1));
          if (hit) { c.seen[hit.id] = 1; c.enc = { id: hit.id, t: s.t }; this.log(c, `${J(hit.name, '과', '와')} 마주쳤다! 상대는 아직 이쪽을 눈치채지 못했다.`, 'warn'); return; }
        }
        const r = Math.random(), draw = () => { const k = pickW(Math.random() < 0.3 ? Z.res : CATS[pl.cat].res); return k === 'crate' ? pick(CRATE) : k; };
        const pEmpty = Math.min(0.65, 0.04 + used * 0.09) * (c.skill === 'scav' ? 0.5 : 1), pMob = 0.03 + pl.diff * 0.045, pCrate = 0.02 + pl.diff * 0.06;
        if (r < pEmpty) { this.log(c, `${pl.n} — ` + pick(['허탕이었다. 쓸 만한 것은 누가 이미 가져간 뒤다.', '바람 소리에 놀라 한참을 숨어 있었다. 얻은 것은 없다.', '샅샅이 뒤졌지만 아무것도 찾지 못했다.'])); return; }
        if (r < pEmpty + pMob) { const mob = pickW({ chicken: 2, boar: 3, dog: 3, wolf: 3, bear: 1 }); this.log(c, `${pl.n} — 안쪽에서 소리가 난다. ${J(MOBS[mob].n, '이', '가')} 튀어나왔다!`, 'bad'); this.skirmish(c, { mobTy: mob }, { first: 'b' }); return; }
        if (r < pEmpty + pMob + pCrate) {
          const got = [pick(CRATE), pick(CRATE)]; if (Math.random() < 0.3 + st.luk * 0.05) got.push(pick(CRATE));
          for (const g of got) this.giveOrPile(c, g, 1);
          this.log(c, `${pl.n} — 보급 상자를 찾았다! ${JL(got, '을', '를')} 얻었다.`, 'good'); return;
        }
        const got = [draw()]; if (Math.random() < 0.3 + st.luk * 0.06 + (c.skill === 'scav' ? 0.3 : 0) - (s.wx.day ? 0 : 0.1)) got.push(draw()); if (pl.diff > 1 && Math.random() < 0.25 * (pl.diff - 1)) got.push(draw());
        for (const g of got) this.giveOrPile(c, g, 1);
        this.log(c, `${J(pl.n, '을', '를')} 뒤져 ${JL(got, '을', '를')} 얻었다.`);
      }
    }

    // ---------- 전투 ----------
    // ---------- 전투 (자동 교전) ----------
    ent(x) {
      if (x.mobTy) { const M = MOBS[x.mobTy]; return { name: M.n, atk: M.atk, def: 0, agi: M.agi, luk: 0, wc: '', mob: x, get hp() { return x.hp; }, set hp(v) { x.hp = v; }, mh: x.mh }; }
      const st = this.stats(x); return { name: x.name, atk: st.atk, def: st.def, agi: st.agi, luk: st.luk, wc: ITEMS[x.eq.weapon] ? ITEMS[x.eq.weapon].wc : '', c: x, get hp() { return x.hp; }, set hp(v) { x.hp = v; }, mh: st.maxHp };
    }
    hit(A, D, mult, L) {
      if (Math.random() < Math.max(0.03, Math.min(0.3, 0.05 + (D.agi - A.agi) * 0.03))) { L.push({ m: `${A.name}의 공격 — ${J(D.name, '이', '가')} 피했다`, k: 'sys' }); return; }
      let m = mult, tag = '';
      if (A.wc === 'spear' && Math.random() < 0.25) { m *= 1.6; tag = ' 찌르기!'; }
      if (D.wc === 'sword' && Math.random() < 0.2) { m *= 0.5; tag += ' (흘려냄)'; }
      if (A.mob && D.c && D.c.skill === 'hunter') m *= 0.7;
      const crit = Math.random() < 0.05 + A.luk * 0.02; if (crit) { m *= 1.5; tag = ' 급소!' + tag; }
      const v = Math.max(1, Math.round(A.atk * (0.85 + Math.random() * 0.3) * m * 100 / (100 + D.def * 2.5)));
      D.hp = Math.max(0, D.hp - v);
      L.push({ m: `${A.name}의 공격${tag} ${D.name} -${v}`, k: '' });
    }
    autoHeal(F, L, used) {
      if (!F.c || used.has(F.c.id) || F.hp > F.mh * 0.35) return;
      const k = F.c.inv.findIndex(x => x && ITEMS[x.id].hp >= 15 && !ITEMS[x.id].tier); if (k < 0) return;
      used.add(F.c.id); const n = ITEMS[F.c.inv[k].id].n; this.useItem(F.c, k); L.push({ m: `${J(F.name, '이', '가')} 급히 ${J(n, '을', '를')} 썼다`, k: 'good' });
    }
    tryFlee(F, O, L) {
      if (!F.c || F.hp > F.mh * 0.3 || F.hp <= 0) return false;
      const c = F.c, adj = ZONES[c.zone].adj.filter(z => this.s.zs[z] < 2);
      if (!adj.length || Math.random() > Math.max(0.15, Math.min(0.9, 0.4 + (F.agi - O.agi) * 0.06 + (c.skill === 'runner' ? 0.2 : 0) + (this.s.wx.w === 'fog' ? 0.15 : 0)))) { L.push({ m: `${J(F.name, '이', '가')} 달아나려 했지만 붙잡혔다`, k: 'bad' }); return false; }
      c.zone = pick(adj); c.seen = {}; L.push({ m: `${J(F.name, '이', '가')} ${J(ZONES[c.zone].n, '으로', '로')} 달아났다`, k: 'warn' }); return true;
    }
    // 선제공격: 조우한 쪽만 때린다. 맞은 쪽은 그 자리에서 되받아치지 못한다.
    // 소란: 전투가 난 구역. 그 구역과 이웃 구역에서만 들린다.
    static noiseLife(len) { return Math.max(45, len * 0.25); }
    noise(z, kind) {
      const s = this.s; s.noise = s.noise.filter(n => n.z !== z && s.t - n.t < World.noiseLife(s.len)); s.noise.push({ z, t: s.t, k: kind });
      const near = s.wx.w === 'rain' ? [z] : [z].concat(ZONES[z].adj);
      for (const c of this.alive()) if (near.includes(c.zone) && !(c.lastNoise && c.lastNoise.z === z && s.t - c.lastNoise.t < 15)) { c.lastNoise = { z, t: s.t }; this.log(c, c.zone === z ? '바로 근처에서 싸우는 소리가 난다!' : `${ZONES[z].n} 쪽에서 소란이 들린다.`, 'warn'); }
    }
    strike(a, b) {
      const s = this.s, A = this.ent(a), B = this.ent(b), L = [], hp0 = { a: Math.round(A.hp), b: Math.round(B.hp) };
      this.noise(a.zone, 'fight'); a.act = null; if (b.act && (b.act.k === 'rest' || b.act.k === 'explore' || b.act.k === 'hunt')) b.act = null;
      if (a.lines.meet) L.push({ m: `${a.name}: “${a.lines.meet}”`, k: 'talk' });
      const n = A.wc === 'sword' && Math.random() < 0.35 ? 3 : 2;
      for (let i = 0; i < n && B.hp > 0; i++) this.hit(A, B, (a.skill === 'brawler' ? 1.25 : 1) * 1.25 * (i === 0 && A.wc === 'bow' ? 1.6 : 1) * (A.wc === 'spear' ? 1.15 : 1), L);
      const dealt = hp0.b - Math.round(B.hp), dead = B.hp <= 0;
      L.push({ m: dead ? `${J(b.name, '이', '가')} 쓰러졌다.` : `${J(b.name, '은', '는')} 비틀거리며 몸을 숨겼다.`, k: dead ? 'bad' : 'sys' });
      const rec = (c, ini) => { c.fight = { t: s.t, zone: a.zone, foe: { id: (ini ? b : a).id }, me0: ini ? hp0.a : hp0.b, op0: ini ? hp0.b : hp0.a, opEnd: Math.max(0, Math.round((ini ? B : A).hp)), opMh: (ini ? B : A).mh, ini, res: ini ? (dead ? 'win' : 'hit') : (dead ? 'lose' : 'ambushed'), log: L.slice(), ack: false }; };
      rec(a, true); rec(b, false);
      this.log(a, `${J(b.name, '을', '를')} 선제공격했다 — ${dealt} 피해${dead ? ', 쓰러뜨렸다' : ''}.`, 'good');
      this.log(b, `${a.name}에게 기습당했다! 체력 -${dealt}.${dead ? '' : ' 되갚으려면 다시 마주쳐야 한다. 피하려면 다른 구역으로.'}`, 'bad');
      b.grudge = a.id;
      if (dead) this.kill(b, a, `${a.name}에게 당함`);
      a.seenAt = Math.max(a.seenAt, s.t - IDLE + 30);
    }
    // a: 먼저 덤빈 쪽(생존자) · b: 생존자 또는 { mobTy } · opts.first: 'a' | 'b' | ''
    skirmish(a, b, opts) {
      this.noise(a.zone, b.mobTy ? 'mob' : 'fight');
      const s = this.s, mob = !!b.mobTy; if (mob) { b.hp = MOBS[b.mobTy].hp; b.mh = b.hp; }
      const A = this.ent(a), B = this.ent(b), L = [], used = new Set(), zone = a.zone, rounds = mob ? 10 : (opts.rounds || 3);
      a.act = null; if (!mob) { b.act = null; b.inBase = false; a.seen[b.id] = 1; b.seen[a.id] = 1; }
      const hp0 = { a: Math.round(A.hp), b: Math.round(B.hp) };
      if (!mob && opts.first === 'a' && a.lines.meet) L.push({ m: `${a.name}: “${a.lines.meet}”`, k: 'talk' });
      let end = '';
      const dead = () => A.hp <= 0 ? 'a' : B.hp <= 0 ? 'b' : '';
      if (opts.first) { const [X, Y] = opts.first === 'a' ? [A, B] : [B, A]; L.push({ m: `— 선제 —`, k: 'sys' }); this.hit(X, Y, X.wc === 'bow' ? 2.0 : 1.2, L); end = dead(); }
      for (let r = 1; r <= rounds && !end; r++) {
        L.push({ m: `— ${r}합 —`, k: 'sys' });
        const order = (A.agi + Math.random() * 3 >= B.agi + Math.random() * 3) ? [[A, B], [B, A]] : [[B, A], [A, B]];
        for (const [X, Y] of order) { this.hit(X, Y, 1, L); if ((end = dead())) break; }
        if (end) break;
        this.autoHeal(A, L, used); this.autoHeal(B, L, used);
        if (this.tryFlee(A, B, L)) { end = 'fa'; break; }
        if (this.tryFlee(B, A, L)) { end = 'fb'; break; }
      }
      if (!end) L.push({ m: '숨이 차서 서로 거리를 벌렸다.', k: 'sys' });
      const record = (c, side) => {
        if (!c || !c.id) return;
        const me = side === 'a' ? A : B, op = side === 'a' ? B : A;
        const res = end === side ? 'lose' : end === (side === 'a' ? 'b' : 'a') ? 'win' : end === 'f' + side ? 'fled' : end ? 'escaped' : 'draw';
        c.fight = { t: s.t, zone, foe: op.c ? { id: op.c.id } : { mob: b.mobTy, mh: B.mh, hp: Math.max(0, Math.round(B.hp)) }, hp0: side === 'a' ? hp0 : { a: hp0.b, b: hp0.a }, me0: side === 'a' ? hp0.a : hp0.b, op0: side === 'a' ? hp0.b : hp0.a, opEnd: Math.max(0, Math.round(op.hp)), opMh: op.mh, ini: side === 'a', res, log: L.slice(-40), ack: false };
        const RES = { win: '이겼다', lose: '쓰러졌다', fled: '달아났다', escaped: '상대가 달아났다', draw: '승부가 나지 않았다' };
        const head = mob ? `${J(op.name, '과', '와')} 싸웠다` : !opts.first ? `${J(op.name, '과', '와')} 맞붙었다` : side === 'a' ? `${J(op.name, '을', '를')} 습격했다` : `${op.name}에게 습격당했다`;
        this.log(c, `${head} — ${RES[res]}. (체력 ${Math.round(me.hp)}/${me.mh})`, res === 'win' ? 'good' : res === 'lose' ? 'bad' : 'warn');
      };
      record(a, 'a'); if (!mob) record(b, 'b');
      if (end === 'b' && mob) { const M = MOBS[b.mobTy]; for (const d of M.drops.concat(a.skill === 'hunter' ? [pick(M.drops)] : [])) this.giveOrPile(a, d, 1); this.xp(a, M.xp); this.log(a, `${J(M.n, '을', '를')} 쓰러뜨렸다. ${JL(M.drops, '을', '를')} 얻었다.`, 'good'); }
      else if (end === 'a') this.kill(a, mob ? null : b, mob ? `${MOBS[b.mobTy].n}에게 당함` : `${b.name}에게 당함`);
      else if (end === 'b') this.kill(b, a, `${a.name}에게 당함`);
      for (const c of [a, mob ? null : b]) if (c && c.alive) c.seenAt = Math.max(c.seenAt, s.t - IDLE + 30);
    }
    makeAlly(a, b) {
      a.ally = b.id; b.ally = a.id; a.allyReq = b.allyReq = 0;
      this.log(a, `${J(b.name, '과', '와')} 동맹을 맺었다. 서로 조우해도 공격하지 않고, 서로의 위치를 안다.`, 'good');
      this.log(b, `${J(a.name, '과', '와')} 동맹을 맺었다. 서로 조우해도 공격하지 않고, 서로의 위치를 안다.`, 'good');
    }
    breakAlly(c, msg) {
      const o = this.s.chars[c.ally]; c.ally = 0; if (o && o.ally === c.id) { o.ally = 0; this.log(o, msg, 'bad'); } this.log(c, msg, 'bad');
    }
    spawnDrop() {
      const s = this.s, open = ZONES.map((_, i) => i).filter(i => s.zs[i] === 0); if (!open.length) return;
      const z = pick(open), items = shuffle(DROP_POOL.slice()).slice(0, 3); s.drop = { z, t: s.t, items };
      this.feed(`📦 하늘에서 보급품이 떨어졌다 — ${ZONES[z].n}.`, 'warn');
    }
    setWeather() {
      const s = this.s; s.wx = { day: s.phase % 2 === 0, w: pickW({ clear: 3, rain: 1, fog: 1 }) };
      this.feed(`${s.wx.day ? '☀ 낮이 밝았다' : '☾ 밤이 깊었다'} · ${WEATHER[s.wx.w][0]}${s.wx.w === 'clear' ? '' : ' — ' + WEATHER[s.wx.w][1]}`, 'sys');
    }
    closeZone(z) {
      const s = this.s; if (s.zs[z] === 2) return;
      s.zs[z] = 2; s.order = s.order.filter(q => q !== z); delete s.piles[z]; if (s.drop && s.drop.z === z) s.drop = null;
      for (const c of this.alive()) {
        if (c.base && c.base.zone === z) { c.base = null; c.inBase = false; this.log(c, `${ZONES[z].n}의 거점이 폐쇄와 함께 무너졌다. 창고의 물건은 건지지 못했다.`, 'bad'); }
        if (c.zone !== z) continue;
        c.zone = this.refuge(z); c.act = null; c.seen = {}; c.enc = null; c.hp = Math.max(1, c.hp - this.stats(c).maxHp * 0.15);
        this.log(c, `${J(ZONES[z].n, '이', '가')} 폐쇄되었다. 쫓기듯 ${J(ZONES[c.zone].n, '으로', '로')} 빠져나왔다. (체력 -15%)`, 'bad');
      }
    }
    // 운영자(GM) 명령: 온라인은 방장, 오프라인은 본인
    gm(m) {
      const s = this.s; if (!m || !s.started) return '시작한 뒤에 쓸 수 있습니다';
      switch (m.k) {
        case 'pause': s.paused = !s.paused; this.feed(s.paused ? '⏸ 운영자가 판을 멈췄다.' : '▶ 판이 다시 움직인다.', 'sys'); return;
        case 'say': { const t = clean(m.m, 120); if (t) this.feed(`📢 ${t}`, 'gm'); return; }
        case 'close': { const z = m.z | 0; if (!ZONES[z] || s.zs[z] === 2) return '닫을 수 없는 구역입니다'; if (s.zs.filter(v => v < 2).length <= 1) return '마지막 구역은 닫을 수 없습니다'; this.closeZone(z); this.feed(`⛔ 운영자가 ${J(ZONES[z].n, '을', '를')} 즉시 폐쇄했다.`, 'bad'); return; }
        case 'kill': { const c = s.chars[m.who | 0]; if (!c || !c.alive) return '대상이 없습니다'; this.kill(c, null, '운영자에 의해 탈락'); return; }
        case 'skip': if (s.final) return '이미 최종 구역입니다'; s.nextClose = s.t; return;
        case 'drop': this.spawnDrop(); return;
      }
      return '알 수 없는 명령입니다';
    }
    kill(c, killer, cause) {
      const s = this.s;
      c.alive = false; c.hp = 0; c.act = null; c.inBase = false; c.battle = 0; c.enc = null; s.rank.unshift(c.id);
      if (c.ally) this.breakAlly(c, `${c.name}의 탈락으로 동맹이 끝났다.`);
      c.spec = killer && killer.alive ? killer.id : ((this.alive()[0] || {}).id || 0);
      const items = c.inv.filter(Boolean); c.inv = new Array(INV).fill(null);
      for (const k of SLOTS) if (c.eq[k] && ITEMS[c.eq[k]].tier > 1) items.push({ id: c.eq[k], n: 1 });
      for (const it of items) { const left = killer ? this.give(killer, it.id, it.n) : it.n; this.pile(c.zone, it.id, left); }
      if (c.base) { for (const it of c.base.stash) this.pile(c.base.zone, it.id, it.n); c.base = null; }
      this.log(c, `${cause}. 여기까지다.`, 'bad');
      this.feed(`☠ ${c.name} 탈락 — ${cause}. 남은 인원 ${this.alive().length}명`, 'bad');
      if (c.lines.die) this.feed(`${c.name}: “${c.lines.die}”`, 'talk');
      if (killer) {
        killer.kills++; this.xp(killer, 50);
        if (items.length) this.log(killer, `${c.name}의 짐을 챙겼다: ${items.map(i => ITEMS[i.id].n).join(', ')}`, 'good');
        if (killer.lines.kill) this.feed(`${killer.name}: “${killer.lines.kill}”`, 'talk');
      }
      const al = this.alive();
      if (al.length <= 1 && this.list.length > 1) {
        if (al[0]) s.rank.unshift(al[0].id);
        s.over = { w: al[0] ? al[0].id : 0, rank: s.rank.slice() };
        this.feed(al[0] ? `실험 종료. 최후의 생존자는 ${al[0].name}.` : '실험 종료. 생존자는 없다.', 'sys');
      }
    }

    // ---------- 구역 폐쇄 ----------
    refuge(z) {
      const s = this.s, seen = new Set([z]); let q = [z];
      while (q.length) {
        const open = q.filter(n => s.zs[n] < 2); if (open.length) { const safe = open.filter(n => s.zs[n] === 0); return pick(safe.length ? safe : open); }
        const nx = []; for (const n of q) for (const a of ZONES[n].adj) if (!seen.has(a)) { seen.add(a); nx.push(a); } q = nx;
      }
      return z;
    }
    stepZones() {
      const s = this.s; s.phase++; s.nextClose = s.t + s.len;
      const closing = s.zs.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0);
      for (const z of closing) this.closeZone(z);
      this.setWeather();
      if (s.phase === 2 || s.phase === 4 || s.phase === 6) this.spawnDrop();
      if (closing.length) this.feed(`⛔ ${closing.map(z => ZONES[z].n).join(', ')} 폐쇄.`, 'bad');
      const next = s.order.length > 1 ? s.order.splice(0, Math.min(s.order.length > 12 ? 3 : 2, s.order.length - 1)) : [];
      for (const z of next) s.zs[z] = 1;
      if (next.length) this.feed(`⚠ 다음 폐쇄 예고: ${next.map(z => ZONES[z].n).join(', ')}.`, 'warn');
      else if (!s.final) {
        s.final = true; s.duelT = s.t + Math.max(20, s.len / 5);
        for (const c of this.alive()) if (c.ally) this.breakAlly(c, '최종 구역 — 동맹은 여기까지다.');
        for (const c of this.alive()) if (c.base) { for (const it of c.base.stash) this.giveOrPile(c, it.id, it.n); c.base = null; c.inBase = false; this.log(c, '숨을 곳이 사라졌다. 거점은 더 이상 안전하지 않다.', 'bad'); }
        this.feed(`최종 구역은 ${ZONES[s.order[0]].n}. 이제 숨을 곳은 없다.`, 'warn');
      }
    }

    // ---------- 시간 진행 ----------
    advance(dt) {
      const s = this.s; if (s.paused && s.started && !s.over) return; s.t += dt; if (!s.started || s.over) return;
      if (!s.final && s.t >= s.nextClose) this.stepZones();
      if (s.noise.length && s.noise[0] && s.t - s.noise[0].t > World.noiseLife(s.len)) s.noise = s.noise.filter(n => s.t - n.t < World.noiseLife(s.len));
      if (s.t >= s.pvT) { s.pvT = s.t + s.len / 3; for (const k in s.pv) if (--s.pv[k] <= 0) delete s.pv[k]; }
      for (const c of this.list) {
        if (!c.alive) continue;
        const m = this.stats(c), rest = c.act && c.act.k === 'rest';
        c.hunger = Math.max(0, c.hunger - dt * 100 / (s.len * 2.5) * (c.inBase ? 0.5 : 1) * Math.max(0.5, 1 - 0.04 * c.st.con));
        if (c.hunger <= 0 && !c.battle) c.hp = Math.max(1, c.hp - dt * m.maxHp / (s.len * 2));
        c.en = Math.min(100, c.en + dt * (rest ? World.restRate(s.len, c.inBase) * (1 + 0.1 * (c.st.end || 0)) : World.idleRate(s.len)));
        if (rest) { c.hp = Math.min(m.maxHp, c.hp + dt * m.maxHp / (s.len * 0.5) * (c.inBase ? 2 : 0.6) * (c.skill === 'medic' ? 2 : 1)); if (c.en >= 100 && (c.hp >= m.maxHp || !c.inBase)) { c.act = null; this.log(c, '충분히 쉬었다.'); } }
        if (c.hp > m.maxHp) c.hp = m.maxHp;
        if (c.act && (c.act.leg || c.act.end) && s.t >= (c.act.leg || c.act.end)) this.finish(c);
        if (!c.alive) continue;
        if (c.enc) { const o = s.chars[c.enc.id]; if (!o || !o.alive || o.zone !== c.zone || o.inBase || s.t - c.enc.t > Math.max(40, s.len * 0.15)) c.enc = null; }
        if (c.bot) { if (!c.act && !c.battle && s.t >= c.think) this.think(c); }
        else if (!c.inBase && !c.battle && !c.act && c.base && c.base.zone === c.zone && s.t - c.seenAt > IDLE) { c.inBase = true; c.seen = {}; this.log(c, '한동안 움직임이 없어, 거점으로 돌아가 문을 잠갔다.', 'sys'); }
      }
      if (this.alive().length <= 3) for (const c of this.alive()) if (c.ally) this.breakAlly(c, '남은 사람이 셋 — 동맹은 여기까지다.');
      if (s.final && !s.over && s.t >= s.duelT) {
        s.duelT = s.t + Math.max(20, s.len / 5);
        const free = shuffle(this.alive().filter(c => !c.battle));
        for (let i = 0; i + 1 < free.length; i += 2) { free[i].zone = free[i + 1].zone = s.order[0]; this.skirmish(free[i], free[i + 1], { first: '', rounds: 6 }); }
      }
    }

    think(c) {
      while (c.sp > 0) { const ks = ['str', 'str', 'con', 'con', 'agi', 'end', 'luk'].filter(k => c.st[k] < STAT_MAX); if (!ks.length) break; this.cmd(c.id, { k: 'stat', s: pick(ks) }); }
      const s = this.s, m = this.stats(c), hr = c.hp / m.maxHp, z = c.zone, go = k => { const e = this.cmd(c.id, k); c.think = s.t + 2 + Math.random() * 4; return e; };
      c.think = s.t + 2 + Math.random() * 4;
      for (let k = 0; k < INV; k++) { const sl = c.inv[k]; if (!sl) continue; const it = ITEMS[sl.id]; if (it.tier && (!c.eq[it.t] || ITEMS[c.eq[it.t]].tier < it.tier)) this.useItem(c, k); }
      for (const rec of RECIPES) { const it = ITEMS[rec.out]; if (this.has(c, rec.in) && (it.tier ? (!c.eq[it.t] || ITEMS[c.eq[it.t]].tier < it.tier) : this.count(c, rec.out) < (it.t === 'mat' ? 1 : 2))) { this.craft(c, rec.out); break; } }
      if (c.hunger < 45) { const k = c.inv.findIndex(x => x && ITEMS[x.id].hun); if (k >= 0) this.useItem(c, k); }
      if (hr < 0.5) { const k = c.inv.findIndex(x => x && ITEMS[x.id].hp >= 15); if (k >= 0) this.useItem(c, k); }
      if (!c.inv.includes(null)) { let w = -1, wn = 0; c.inv.forEach((x, k) => { if (x && ITEMS[x.id].t === 'mat' && x.n >= wn) { wn = x.n; w = k; } }); if (w >= 0) c.inv[w] = null; }
      const adj = ZONES[z].adj.filter(a => s.zs[a] < 2), safe = adj.filter(a => s.zs[a] === 0);
      if (s.zs[z] === 1 && adj.length && c.en >= COST.move) return go({ k: 'move', to: pick(safe.length ? safe : adj) });
      if (c.en < 25 || hr < 0.35) { go({ k: 'rest' }); c.restUntil = s.t + s.len * 0.12; return; }
      if (c.enc) { const o = s.chars[c.enc.id]; if (o && o.alive && o.zone === z && !o.inBase && c.en >= COST.attack && hr > 0.35) { const om = this.stats(o); if (c.grudge === o.id || m.atk * c.hp >= om.atk * o.hp * 0.6 || Math.random() < 0.3) return go({ k: 'attack', who: o.id }); } this.cmd(c.id, { k: 'ignore' }); }
      if (c.fight && !c.fight.ack && c.fight.res === 'ambushed') { c.fight.ack = true; const safe = ZONES[z].adj.filter(a => s.zs[a] === 0); if (hr < 0.5 && safe.length && c.en >= COST.move) return go({ k: 'move', to: pick(safe) }); }
      if (false) { const o = null; if (o) return go({ k: 'attack', who: o.id }); }
      if (c.allyReq) this.cmd(c.id, { k: Math.random() < 0.5 ? 'allyOk' : 'allyNo' });
      if (s.drop && hr > 0.5) { if (s.drop.z === z) return go({ k: 'openDrop' }); const rt = this.route(z, s.drop.z); if (rt && rt.length <= 3 && c.en >= this.cost(c, World.moveCost(rt.length)) + 15 && Math.random() < 0.5) return go({ k: 'move', to: s.drop.z }); }
      if (s.piles[z] && s.piles[z].length && c.inv.includes(null)) this.cmd(c.id, { k: 'loot' });
      const r = Math.random();
      { const nz = s.noise.filter(n => n.k === 'fight' && ZONES[z].adj.includes(n.z) && s.zs[n.z] === 0); if (nz.length && c.en >= COST.move + 20) { if (hr > 0.75 && Math.random() < 0.35) return go({ k: 'move', to: nz[0].z }); } }
      if (r < 0.12 && safe.length) return go({ k: 'move', to: pick(safe) });
      if (r < 0.24 && hr > 0.7 && this.count(c, 'leather') < 2) return go({ k: 'hunt' });
      if (c.en < COST.explore) return go({ k: 'rest' });
      go({ k: 'explore' });
    }

    // ---------- 화면용 요약 ----------
    view(id) {
      const s = this.s, c = s.chars[id], r = Math.round;
      const v = { t: s.t, started: s.started, over: s.over, tempo: s.tempo, len: s.len, nextClose: s.nextClose, phase: s.phase, final: s.final, zs: s.zs, feed: s.feed.slice(-40), chat: s.chat.slice(-60), roster: this.list.map(o => ({ id: o.id, al: o.alive ? 1 : 0, k: o.kills, on: o.bot || o.online ? 1 : 0 })) };
      v.wx = s.wx; v.paused = !!s.paused; v.drop = s.drop ? { z: s.drop.z } : null;
      if (!c) return v;
      const m = this.stats(c);
      { const near = s.wx.w === 'rain' ? [c.zone] : [c.zone].concat(ZONES[c.zone].adj); v.noise = c.alive ? s.noise.filter(n => near.includes(n.z) && s.t - n.t < World.noiseLife(s.len)).map(n => ({ z: n.z, age: (s.t - n.t) / World.noiseLife(s.len), k: n.k })) : []; }
      v.me = { id: c.id, hp: r(c.hp), hunger: r(c.hunger), en: r(c.en), zone: c.zone, alive: c.alive, lvl: c.lvl, xp: c.xp, need: c.lvl * 30, kills: c.kills, inv: c.inv, eq: c.eq, act: c.act, base: c.base, inBase: c.inBase, st: m, raw: c.st, sp: c.sp || 0, bf: { atk: c.bf.atk > s.t, agi: c.bf.agi > s.t }, log: c.log, visits: c.visits };
      if (c.alive && s.started) {
        const others = this.list.filter(o => o.alive && o !== c && o.zone === c.zone && !o.inBase);
        v.here = {
          worn: ZONES[c.zone].places.filter(p => (s.pv[p] || 0) >= 4),
          signs: c.inBase ? 0 : others.length, pile: (s.piles[c.zone] || []).reduce((a, b) => a + b.n, 0),
          enc: c.enc && s.chars[c.enc.id] ? (() => { const o = s.chars[c.enc.id], h = o.hp / this.stats(o).maxHp; return { id: o.id, lvl: o.lvl, w: o.eq.weapon, cond: h > 0.7 ? '멀쩡함' : h > 0.35 ? '다침' : '빈사', grudge: c.grudge === o.id }; })() : null,
          seen: c.inBase ? [] : others.filter(o => c.seen[o.id]).map(o => { const h = o.hp / this.stats(o).maxHp; return { id: o.id, lvl: o.lvl, w: o.eq.weapon, cond: h > 0.7 ? '멀쩡함' : h > 0.35 ? '다침' : '빈사', busy: o.battle ? 1 : 0 }; }),
        };
      }
      v.me.skill = c.skill; v.me.ally = 0; v.me.allyReq = c.allyReq || 0;
      if (c.ally && s.chars[c.ally]) { const o = s.chars[c.ally]; v.me.ally = { id: o.id, zone: o.zone, hp: Math.round(o.hp), mh: this.stats(o).maxHp, lvl: o.lvl }; }
      if ((!c.alive || s.over) && c.spec && s.chars[c.spec]) { const o = s.chars[c.spec]; v.spec = { id: o.id, zone: o.zone, al: o.alive, hp: Math.round(o.hp), mh: this.stats(o).maxHp, lvl: o.lvl, log: o.log.slice(-30) }; }
      const F = c.fight;
      if (F && !F.ack && s.t - F.t < Math.max(90, s.len * 0.3)) v.fight = { ...F, foeNow: F.foe.id ? (() => { const o = s.chars[F.foe.id]; return { id: o.id, hp: Math.round(o.hp), mh: this.stats(o).maxHp, al: o.alive, zone: o.zone }; })() : null };
      return v;
    }
    people() { return this.list.map(c => ({ id: c.id, name: c.name, color: c.color, img: c.img, bot: c.bot, bio: c.bio })); }
  }

  Object.assign(X, { SKILLS, WEATHER, STAT_FX, START_PTS, STAT_MAX, J, SLOTS, World, cleanChar, TEMPO, DUR, COST, INV, STASH });
})(typeof module !== 'undefined' ? module.exports : (self.GameWorld = {}), typeof require !== 'undefined' ? require('./data.js') : self.GameData);
