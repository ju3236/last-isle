// 클라이언트: 메뉴, 세션(오프라인=브라우저 안의 세계, 온라인=서버), 화면 그리기
(function () {
  'use strict';
  const D = GameData, G = GameWorld, { ITEMS, RECIPES, BASE_COST, WEAPONS, ZONES, MOBS, COLORS } = D;
  const $ = id => document.getElementById(id), OFF = !!window.OFFLINE_ONLY;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = t => { t = Math.max(0, Math.floor(t)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
  const cmdAttr = c => `data-cmd='${esc(JSON.stringify(c))}'`;
  const cache = {};
  function set(id, html) { if (cache[id] === html) return false; cache[id] = html; $(id).innerHTML = html; return true; }
  function face(p, size) {
    const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px`;
    if (p && p.img) return `<img class="face" src="${esc(p.img)}" alt="" style="${st}">`;
    return `<span class="face" style="${st};background:${esc(p ? p.color : '#888')}">${esc(p ? [...p.name][0] : '?')}</span>`;
  }
  let toastT = 0;
  function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }

  // ================= 캐릭터 만들기 =================
  let char = G.cleanChar(store.get('ic_char', { name: '', color: COLORS[3], weapon: 'sword', st: { str: 3, agi: 2, con: 3, luk: 2, end: 2 } }));
  if (char.name === '이름 없는 생존자') char.name = '';
  const STN = {}; for (const k in G.STAT_FX) STN[k] = G.STAT_FX[k];
  function saveChar() { store.set('ic_char', char); }
  function renderCreator() {
    $('facePrev').innerHTML = face({ name: char.name || '?', color: char.color, img: char.img }, 84);
    $('colors').innerHTML = COLORS.map(c => `<button class="sw" data-c="${c}" style="background:${c}" aria-pressed="${c === char.color}" aria-label="색 ${c}"></button>`).join('');
    $('skills').innerHTML = Object.keys(G.SKILLS).map(k => `<button class="wp" data-sk="${k}" aria-pressed="${k === char.skill}"><b>${G.SKILLS[k][0]}</b><small>${G.SKILLS[k][1]}</small></button>`).join('');
    $('weapons').innerHTML = Object.keys(WEAPONS).map(k => `<button class="wp" data-w="${k}" aria-pressed="${k === char.weapon}"><b>${ITEMS[k + 1].e} ${WEAPONS[k].n}</b><small>${WEAPONS[k].d}</small></button>`).join('');
    const left = G.START_PTS - Object.values(char.st).reduce((a, b) => a + b, 0);
    $('left').textContent = left;
    $('stats').innerHTML = Object.keys(STN).map(k => `<div class="stat"><span>${STN[k][0]}</span><button data-s="${k}" data-d="-1" ${char.st[k] <= 0 ? 'disabled' : ''} aria-label="${STN[k][0]} 내리기">−</button><div class="pips">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i < char.st[k] ? 'on' : ''}"></i>`).join('')}</div><button data-s="${k}" data-d="1" ${char.st[k] >= 6 || left <= 0 ? 'disabled' : ''} aria-label="${STN[k][0]} 올리기">+</button><small>${STN[k][1]}</small></div>`).join('');
    saveChar();
  }
  for (const [id, set_] of [['cname', v => char.name = v], ['cbio', v => char.bio = v], ['l_meet', v => char.lines.meet = v], ['l_kill', v => char.lines.kill = v], ['l_die', v => char.lines.die = v]]) {
    $(id).value = id === 'cname' ? char.name : id === 'cbio' ? char.bio : char.lines[id.slice(2)];
    $(id).oninput = e => { set_(e.target.value); saveChar(); if (id === 'cname') $('facePrev').innerHTML = face({ name: char.name || '?', color: char.color, img: char.img }, 84); };
  }
  $('menu').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.c) char.color = b.dataset.c; else if (b.dataset.w) char.weapon = b.dataset.w; else if (b.dataset.sk) char.skill = b.dataset.sk;
    else if (b.dataset.s) { char.st[b.dataset.s] = Math.max(0, Math.min(6, char.st[b.dataset.s] + +b.dataset.d)); } else return;
    renderCreator();
  });
  $('imgBtn').onclick = () => $('cimg').click();
  $('imgClr').onclick = () => { char.img = ''; renderCreator(); };
  $('cimg').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 112; const s = Math.min(im.width, im.height); c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 112, 112); char.img = c.toDataURL('image/jpeg', 0.82); renderCreator(); }; im.onerror = () => toast('이미지를 읽지 못했습니다'); im.src = rd.result; };
    rd.readAsDataURL(f); e.target.value = '';
  };
  $('tempo').innerHTML = Object.keys(G.TEMPO).map(k => `<option value="${k}">${G.TEMPO[k].n}</option>`).join('');
  $('bots').oninput = e => { $('botsN').textContent = e.target.value; };
  renderCreator();
  if (OFF) { $('onBox').hidden = true; $('onNote').hidden = false; }
  const saved = store.get('ic_save', null);
  $('contBtn').hidden = !(saved && saved.s && !saved.s.over && saved.s.zs.length === ZONES.length);
  const myChar = () => ({ ...char, name: char.name.trim() || '이름 없는 생존자' });

  // ================= 세션 =================
  let showCard = false, mode = null, world = null, ws = null, myId = 0, view = null, gm = false, people = {}, loop = 0, tab = 'map', sel = -1, speed = 1, roomName = '', saveN = 0, askLeave = false;
  function enter() { for (const k in cache) delete cache[k]; view = null; tab = 'map'; sel = -1; askLeave = false; $('menu').hidden = true; $('game').hidden = false; scrollTo(0, 0); initMap(); }
  function toMenu() {
    clearInterval(loop); if (ws) { const w = ws; ws = null; w.close(); }
    if (mode === 'off' && world) saveOff();
    world = null; mode = null; $('game').hidden = true; $('menu').hidden = false;
    const sv = store.get('ic_save', null); $('contBtn').hidden = !(sv && sv.s && !sv.s.over && sv.s.zs.length === ZONES.length);
  }
  function saveOff() { if (world.s.over) store.del('ic_save'); else store.set('ic_save', { s: world.s, id: myId }); }
  function runOff() {
    mode = 'off'; gm = true; roomName = '혼자 하기'; people = {};
    enter(); clearInterval(loop);
    loop = setInterval(() => { stepOff(0.25 * speed); if (++saveN % 20 === 0) saveOff(); }, 250);
    stepOff(0);
  }
  function stepOff(dt) {
    const me = world.s.chars[myId]; me.online = true;
    world.advance(dt);
    for (const p of world.people()) people[p.id] = p;
    view = world.view(myId); render();
  }
  $('offBtn').onclick = () => { world = G.World.create({ tempo: $('tempo').value }); myId = world.addChar(myChar(), false).id; world.addBots(Math.max(1, +$('bots').value)); world.start(); speed = 1; runOff(); };
  $('contBtn').onclick = () => { const sv = store.get('ic_save', null); if (!sv) return; world = new G.World(sv.s); myId = sv.id; runOff(); };
  $('onBtn').onclick = () => {
    $('onErr').textContent = '';
    let sock; try { sock = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host); } catch (e) { $('onErr').textContent = '서버에 연결할 수 없습니다'; return; }
    ws = sock; mode = 'on';
    sock.onopen = () => sock.send(JSON.stringify({ t: 'join', room: $('room').value, pw: $('pw').value, char: myChar(), tempo: $('tempo').value, bots: +$('bots').value }));
    sock.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.t === 'err') { $('onErr').textContent = m.m; ws = null; sock.close(); }
      else if (m.t === 'ok') { myId = m.id; roomName = m.room; if ($('game').hidden) enter(); }
      else if (m.t === 'people') { people = {}; for (const p of m.list) people[p.id] = p; for (const k in cache) delete cache[k]; }
      else if (m.t === 'view') { view = m.v; gm = m.gm; render(); }
      else if (m.t === 'toast') toast(m.m);
    };
    sock.onclose = () => { if (ws === sock) { ws = null; toMenu(); toast('서버와 연결이 끊어졌습니다'); } };
    sock.onerror = () => { if (ws === sock && $('game').hidden) $('onErr').textContent = '서버에 연결할 수 없습니다'; };
  };
  function gmSend(c) {
    if (mode === 'off') { const e = world.gm(c); if (e) toast(e); stepOff(0); }
    else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'gm', c }));
  }
  function send(c) {
    if (mode === 'off') { const e = world.cmd(myId, c); if (e) toast(e); stepOff(0); }
    else if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'cmd', c }));
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cmd],[data-tab],[data-slot],[data-do],[data-cf],[data-ci],[data-goal],[data-gm]'); if (!b || b.disabled) return;
    if (b.dataset.cmd) send(JSON.parse(b.dataset.cmd));
    else if (b.dataset.tab) { tab = b.dataset.tab; render(); }
    else if (b.dataset.slot) { sel = sel === +b.dataset.slot ? -1 : +b.dataset.slot; render(); }
    else if (b.dataset.do === 'leave') { if (mode === 'on' || askLeave) toMenu(); else { askLeave = true; render(); } }
    else if (b.dataset.do === 'stay') { askLeave = false; render(); }
    else if (b.dataset.cf) { craftCat = b.dataset.cf; render(); }
    else if (b.dataset.ci) { craftSel = b.dataset.ci; if (tab !== 'craft') tab = 'craft'; render(); }
    else if (b.dataset.goal) { goal = goal === b.dataset.goal ? '' : b.dataset.goal; render(); }
    else if (b.dataset.do === 'speed') { speed = speed === 1 ? 3 : 1; render(); }
    else if (b.dataset.do === 'start') ws && ws.send(JSON.stringify({ t: 'start' }));
    else if (b.dataset.gm) { const c = JSON.parse(b.dataset.gm); if (c.k === 'say') { c.m = ($('gmSay') || {}).value || ''; if ($('gmSay')) $('gmSay').value = ''; } if (c.k === 'close') c.z = +($('gmZone') || {}).value; if (c.k === 'kill') c.who = +($('gmWho') || {}).value; gmSend(c); }
    else if (b.dataset.do === 'card') { showCard = !showCard; render(); }
    else if (b.dataset.do === 'reset') { if (mode === 'off') { toMenu(); $('offBtn').click(); } else ws && ws.send(JSON.stringify({ t: 'reset' })); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'craftQ') { craftQ = e.target.value; const pos = e.target.selectionStart; delete cache.pane; render(); const el = $('craftQ'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } } });
  $('chatForm').onsubmit = e => { e.preventDefault(); const v = $('chatIn').value.trim(); if (v) send({ k: 'chat', m: v }); $('chatIn').value = ''; };

  // ================= 지도 (도시 평면도) =================
  const CATS = D.CATS, PLACES = D.PLACES, CS = 6, GX = 100, GY = 88, U = 12;
  let centerPending = true, grid = null, zcell = null, blds = [], ponds = [], zovSig = '', baseK = 1; const mz = { k: 1, x: 0, y: 0 };
  const isle = (x, y) => { const dx = x - 300, dy = y - 262, a = Math.atan2(dy, dx), rx = 272 + 12 * Math.sin(3 * a + 1) + 8 * Math.sin(5 * a), ry = 240 + 10 * Math.sin(4 * a + 2) + 6 * Math.sin(7 * a); return dx * dx / (rx * rx) + dy * dy / (ry * ry); };
  const H2 = (a, b) => { let h = Math.imul(a + 7, 374761393) ^ Math.imul(b + 13, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // 칸 종류: 0 바다, 1 땅, 2 도로, 3 건물, 4 물, 5 광장, 7 가장자리
  function buildGrid() {
    grid = new Uint8Array(GX * GY); zcell = new Uint8Array(GX * GY); blds = []; ponds = [];
    const at = (x, y) => (x < 0 || y < 0 || x >= GX || y >= GY) ? -1 : y * GX + x;
    const zoneOf = (X, Y) => { let b = 0, bd = 1e9; for (let i = 0; i < ZONES.length; i++) { const dd = (ZONES[i].x - X) ** 2 + (ZONES[i].y - Y) ** 2; if (dd < bd) { bd = dd; b = i; } } return b; };
    for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) {
      const bx = x >> 2, by = y >> 2, i = y * GX + x;
      if (isle(bx * 24 + 12, by * 24 + 12) < 0.84 + 0.2 * H2(bx, by)) grid[i] = 1;
      zcell[i] = zoneOf(x * CS + 3, y * CS + 3);
    }
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const fill = (x0, y0, x1, y1, t, cond) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const i = at(x, y); if (i >= 0 && grid[i] && (!cond || cond(grid[i]))) grid[i] = t; } };
    const C = Z => [Z.x / CS | 0, Z.y / CS | 0];
    // 물
    for (const [z, n, rmin, rmax] of ZONES.map((Z, i) => [i, Z.pond, 2, Z.pond > 2 ? 5 : 3]).filter(x => x[1])) {
      const [cx, cy] = C(ZONES[z]);
      for (let k = 0; k < n; k++) {
        const px = cx + (rnd() - 0.5) * 9, py = cy + (rnd() - 0.5) * 8, r = rmin + rnd() * (rmax - rmin);
        ponds.push([px * CS, py * CS, r * CS]);
        for (let y = Math.floor(py - r); y <= py + r; y++) for (let x = Math.floor(px - r); x <= px + r; x++) { const i = at(x, y); if (i >= 0 && grid[i] && (x + .5 - px) ** 2 + (y + .5 - py) ** 2 <= r * r) grid[i] = 4; }
      }
    }
    // 큰길: 이어진 구역을 꺾인 길로 잇는다
    ZONES.forEach((Z, i) => { for (const j of Z.adj) if (j > i) {
      const [ax, ay] = C(Z), [bx, by] = C(ZONES[j]);
      if (H2(i, j) < 0.5) { fill(ax, ay, bx, ay + 1, 2); fill(bx, ay, bx + 1, by, 2); } else { fill(ax, ay, ax + 1, by, 2); fill(ax, by, bx, by + 1, 2); }
    } });
    // 골목
    ZONES.forEach((Z, z) => {
      const [cx, cy] = C(Z);
      for (let k = 0; k < 3; k++) {
        const hor = rnd() < 0.5, ox = cx + Math.round((rnd() - 0.5) * 14), oy = cy + Math.round((rnd() - 0.5) * 12);
        for (const dir of [-1, 1]) for (let s = 0; s < 8; s++) {
          const x = hor ? ox + s * dir : ox, y = hor ? oy : oy + s * dir, i = at(x, y);
          if (i < 0 || !grid[i] || zcell[i] !== z) break; if (grid[i] === 1) grid[i] = 2;
        }
      }
    });
    // 중앙 광장
    { const [cx, cy] = C(ZONES[0]); fill(cx - 7, cy - 7, cx + 7, cy + 7, 5, t => t !== 4); }
    // 가장자리
    for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) {
      const i = y * GX + x; if (grid[i] !== 1) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const j = at(x + dx, y + dy); if (j < 0 || !grid[j]) { grid[i] = 7; break; } }
    }
    // 건물
    for (let n = 0; n < 9000; n++) {
      const x = rnd() * GX | 0, y = rnd() * GY | 0, w = 2 + (rnd() * 5 | 0), h = 2 + (rnd() * 4 | 0); let ok = true;
      for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w && ok; xx++) { const i = at(xx, yy); if (i < 0 || grid[i] !== 1) ok = false; }
      if (!ok) continue;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) grid[yy * GX + xx] = 3;
      blds.push([x, y, w, h]);
    }
  }
  function initMap() {
    if (!grid) {
      buildGrid();
      const g = $('terrain').getContext('2d'), col = { 1: '#4c5159', 2: '#7c838d', 3: '#4c5159', 4: '#4c5159', 5: '#8a919b', 7: '#2c3036' };
      g.clearRect(0, 0, 1200, 1048);
      g.fillStyle = 'rgba(0,0,0,.5)';
      for (let i = 0; i < GX * GY; i++) if (grid[i]) g.fillRect((i % GX) * U + 6, (i / GX | 0) * U + 9, U, U);
      for (let i = 0; i < GX * GY; i++) if (grid[i]) { g.fillStyle = col[grid[i]]; g.fillRect((i % GX) * U, (i / GX | 0) * U, U + 0.5, U + 0.5); }
      g.save(); g.beginPath(); for (let i = 0; i < GX * GY; i++) if (grid[i] === 4) g.rect((i % GX) * U, (i / GX | 0) * U, U, U); g.clip();
      for (const [x, y, r] of ponds) { g.beginPath(); g.arc(x * 2, y * 2, r * 2 + 6, 0, 6.2832); g.fillStyle = '#4f8f98'; g.fill(); }
      for (const [x, y, r] of ponds) { g.beginPath(); g.arc(x * 2, y * 2, r * 2 + 2, 0, 6.2832); g.fillStyle = '#74c2ca'; g.fill(); }
      g.restore();
      for (const [x, y, w, h] of blds) { g.fillStyle = '#2f3339'; g.fillRect(x * U + 1, y * U + 1, w * U - 2, h * U - 2); g.strokeStyle = '#5f656e'; g.lineWidth = 1.5; g.strokeRect(x * U + 2, y * U + 2, w * U - 4, h * U - 4); if (w > 3 && h > 2) { g.strokeStyle = '#454a52'; g.strokeRect(x * U + 7, y * U + 7, w * U - 14, h * U - 14); } }
      { const Z = ZONES[0]; g.beginPath(); g.arc(Z.x * 2, Z.y * 2, 34, 0, 6.2832); g.fillStyle = '#353940'; g.fill(); g.strokeStyle = '#6a7079'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.arc(Z.x * 2, Z.y * 2, 20, 0, 6.2832); g.strokeStyle = '#4a4f57'; g.stroke(); }
      g.strokeStyle = '#191b1f'; g.lineWidth = 3; g.beginPath();
      for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) {
        if (!grid[y * GX + x]) continue; const X = x * U, Y = y * U;
        if (x === GX - 1 || !grid[y * GX + x + 1]) { g.moveTo(X + U, Y); g.lineTo(X + U, Y + U); }
        if (x === 0 || !grid[y * GX + x - 1]) { g.moveTo(X, Y); g.lineTo(X, Y + U); }
        if (y === GY - 1 || !grid[(y + 1) * GX + x]) { g.moveTo(X, Y + U); g.lineTo(X + U, Y + U); }
        if (y === 0 || !grid[(y - 1) * GX + x]) { g.moveTo(X, Y); g.lineTo(X + U, Y); }
      }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.42)'; g.lineWidth = 2; g.setLineDash([7, 5]); g.beginPath();
      for (let y = 0; y < GY - 1; y++) for (let x = 0; x < GX - 1; x++) {
        const i = y * GX + x; if (!grid[i]) continue;
        if (grid[i + 1] && zcell[i + 1] !== zcell[i]) { g.moveTo((x + 1) * U, y * U); g.lineTo((x + 1) * U, (y + 1) * U); }
        if (grid[i + GX] && zcell[i + GX] !== zcell[i]) { g.moveTo(x * U, (y + 1) * U); g.lineTo((x + 1) * U, (y + 1) * U); }
      }
      g.stroke(); g.setLineDash([]);
      $('legend').hidden = true;
    }
    zovSig = ''; mz.k = 1; mz.x = mz.y = 0; centerPending = true; fitMap();
  }
  function drawZov(zs) {
    const sig = zs.join(''); if (sig === zovSig) return; zovSig = sig;
    const g = $('zov').getContext('2d'); g.clearRect(0, 0, 1200, 1048);
    const pc = document.createElement('canvas'); pc.width = pc.height = 16; const q = pc.getContext('2d');
    q.fillStyle = 'rgba(120,20,24,.55)'; q.fillRect(0, 0, 16, 16); q.strokeStyle = 'rgba(255,90,82,.55)'; q.lineWidth = 3; q.beginPath(); q.moveTo(-4, 20); q.lineTo(20, -4); q.moveTo(-4, 4); q.lineTo(4, -4); q.moveTo(12, 20); q.lineTo(20, 12); q.stroke();
    const pat = g.createPattern(pc, 'repeat');
    for (const want of [1, 2]) {
      g.beginPath(); let any = false;
      for (let i = 0; i < GX * GY; i++) if (grid[i] && zs[zcell[i]] === want) { g.rect((i % GX) * U, (i / GX | 0) * U, U, U); any = true; }
      if (any) { g.fillStyle = want === 2 ? pat : 'rgba(255,181,71,.22)'; g.fill('nonzero'); }
    }
  }
  function applyMz() {
    const V = $('mapView'), vw = V.clientWidth, vh = V.clientHeight, s = baseK * mz.k, w = 600 * s, h = 524 * s;
    mz.x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, mz.x)); mz.y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, mz.y));
    $('mapInner').style.transform = `translate(${Math.round(mz.x)}px,${Math.round(mz.y)}px) scale(${s})`;
    V.style.touchAction = mz.k > 1 ? 'none' : 'pan-y';
  }
  function fitMap() { const V = $('mapView'); if (!V.clientWidth) return; baseK = Math.min(V.clientWidth / 600, V.clientHeight / 524); applyMz(); }
  function zoomAt(k1, cx, cy) { k1 = Math.max(1, Math.min(4, k1)); const r = k1 / mz.k; mz.x = cx - (cx - mz.x) * r; mz.y = cy - (cy - mz.y) * r; mz.k = k1; applyMz(); }
  addEventListener('resize', fitMap);
  (function mapInput() {
    const V = $('mapView'); let dn = null, dragged = false;
    V.addEventListener('wheel', e => { e.preventDefault(); const r = V.getBoundingClientRect(); zoomAt(mz.k * (e.deltaY < 0 ? 1.25 : 0.8), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    V.addEventListener('pointerdown', e => { if (e.target.closest('#zoom')) return; dn = { x: e.clientX, y: e.clientY, mx: mz.x, my: mz.y }; dragged = false; });
    addEventListener('pointermove', e => { if (!dn) return; const dx = e.clientX - dn.x, dy = e.clientY - dn.y; if (!dragged && Math.hypot(dx, dy) < 5) return; dragged = true; V.classList.add('drag'); mz.x = dn.mx + dx; mz.y = dn.my + dy; applyMz(); });
    const up = () => { dn = null; V.classList.remove('drag'); }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
    V.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
    $('zoom').addEventListener('click', e => {
      const b = e.target.closest('[data-zoom]'); if (!b) return; const z = +b.dataset.zoom;
      if (z) zoomAt(mz.k * (z > 0 ? 1.5 : 1 / 1.5), V.clientWidth / 2, V.clientHeight / 2);
      else if (view && view.me) { const Z = ZONES[view.me.zone]; mz.k = 2.2; const s = baseK * mz.k; mz.x = V.clientWidth / 2 - Z.x * s; mz.y = V.clientHeight / 2 - Z.y * s; applyMz(); }
    });
    $('mapSvg').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const n = e.target.closest('[data-cmd]'); if (n) { e.preventDefault(); send(JSON.parse(n.dataset.cmd)); } } });
  })();
  function renderMap(v) {
    drawZov(v.zs);
    const me = v.me, z = me ? me.zone : -1, free = me && me.alive && v.started && !v.over && !v.battle && !me.act && !me.inBase;
    let h = '';
    if (me && me.act && me.act.k === 'move') { const pts = [z].concat(me.act.path || [me.act.to]); h += `<polyline class="route" fill="none" points="${pts.map(q => ZONES[q].x + ',' + ZONES[q].y).join(' ')}"/>`; }
    curZs = v.zs; curFrom = free ? z : -1;
    const gneed = me ? goalNeeds(me) : [];
    ZONES.forEach((Z, i) => {
      if (v.zs[i] === 2 || !gneed.length) return; const ms = gneed.filter(id => sources(id).includes(i)); if (!ms.length) return;
      const w = ms.length * 17 + 6; h += `<g class="gmat"><rect x="${Z.x - w / 2}" y="${Z.y + 13}" width="${w}" height="18" rx="2"/>${ms.map((id, k) => `<text x="${Z.x - w / 2 + 11 + k * 17}" y="${Z.y + 26.5}" text-anchor="middle">${ITEMS[id].e}<title>${ITEMS[id].n}</title></text>`).join('')}</g>`;
    });
    ZONES.forEach((Z, i) => {
      const st = v.zs[i], rt = free && i !== z && st < 2 ? routeC(z, i, v.zs) : null, adj = !!rt, w = Z.n.length * 13 + 18;
      h += `<g class="zl z${st} ${i === z ? 'cur' : ''} ${adj ? 'adj' : ''}" ${adj ? `tabindex="0" role="button" aria-label="${G.J(Z.n, '으로', '로')} 이동 · ${rt ? rt.length : 0}구역 · 약 ${rt ? rt.length * G.DUR.move : 0}초" data-zone="${i}" ${cmdAttr({ k: 'move', to: i })}` : i === z && free ? `tabindex="0" role="button" aria-label="${Z.n} 탐색" ${cmdAttr({ k: 'explore' })}` : ''}><rect x="${Z.x - w / 2}" y="${Z.y - 11}" width="${w}" height="22" rx="2"/><text x="${Z.x}" y="${Z.y + 4.5}" text-anchor="middle">${Z.n}</text></g>`;
    });
    for (const n of v.noise || []) {
      const Z = ZONES[n.z], w = Z.n.length * 13 + 18, x = Z.x + w / 2 + 2, y = Z.y - 14, op = Math.max(0.35, 1 - n.age);
      h += `<g class="noise ${n.age < 0.25 ? 'fresh' : ''} ${n.k === 'mob' ? 'mob' : ''}" style="opacity:${op.toFixed(2)}"><title>${Z.n} · ${n.k === 'mob' ? '짐승 소란' : '싸움 소란'}</title><path d="M${x + 9} ${y} L${x + 18} ${y + 16} L${x} ${y + 16} Z"/><text x="${x + 9}" y="${y + 14}" text-anchor="middle">!</text></g>`;
    }
    const tag = (Z, s, cls) => { const w = s.length * 12 + 14; return `<g class="tag ${cls}"><rect x="${Z.x - w / 2}" y="${Z.y - 37}" width="${w}" height="18" rx="2"/><path d="M${Z.x - 4} ${Z.y - 19.5}h8l-4 5z"/><text x="${Z.x}" y="${Z.y - 24}" text-anchor="middle">${s}</text></g>`; };
    if (v.drop) { const Z = ZONES[v.drop.z]; h += `<g class="dropm"><title>보급품</title><rect x="${Z.x - Z.n.length * 6.5 - 31}" y="${Z.y - 10}" width="20" height="20" rx="2"/><text x="${Z.x - Z.n.length * 6.5 - 21}" y="${Z.y + 5}" text-anchor="middle">📦</text></g>`; }
    if (me && me.ally && me.ally.zone !== z) h += tag(ZONES[me.ally.zone], '동맹', 'base');
    if (v.spec && !me.alive) h += tag(ZONES[v.spec.zone], '관전', 'me');
    if (me && v.started && me.alive) { if (me.base && me.base.zone !== z) h += tag(ZONES[me.base.zone], '거점', 'base'); h += tag(ZONES[z], me.inBase ? '나 · 거점 안' : me.base && me.base.zone === z ? '나 · 거점' : '나', 'me'); }
    set('mapSvg', h);
    if (centerPending && me && v.started && $('mapView').clientWidth) {
      centerPending = false; fitMap();
      const V = $('mapView'), Zc = ZONES[z], k = Math.min(1.6, Math.max(1, V.clientWidth / 600 / baseK * 0.8)), sc = baseK * k;
      mz.k = k; mz.x = V.clientWidth / 2 - Zc.x * sc; mz.y = V.clientHeight / 2 - Zc.y * sc; applyMz();
    }
    $('mapHint').textContent = gneed.length ? `목표 ${ITEMS[goal].n} · 구역 아래 아이콘: 부족한 재료가 잘 나오는 곳${gneed.filter(id => !sources(id).length).map(id => ` · ${ITEMS[id].n}: ${HUNT[id] ? '사냥' : ''}${HUNT[id] && CRATE_SET.has(id) ? '·' : ''}${CRATE_SET.has(id) ? '보급 상자' : ''}`).join('')}` : !goal ? (free ? '내 구역 이름: 탐색 · 테두리 빛나는 구역: 이동 · 끌기/휠: 지도 움직이기' : '') : `목표 ${ITEMS[goal].n} · 재료가 다 모였다. 제작 탭에서 만들 수 있다`;
    if (false) $('mapHint').textContent = free ? '색 점: 탐험지 · 테두리 빛나는 구역: 이동 가능 · 끌기/휠: 지도 움직이기' : '';
  }


  // ---------- 제작 도우미 ----------
  let craftCat = 'all', craftQ = '', craftSel = '', goal = '';
  const CFILT = { all: { test: () => true }, weapon: { test: x => x.t === 'weapon' }, armor: { test: x => x.t === 'armor' }, head: { test: x => x.t === 'head' }, arm: { test: x => x.t === 'arm' }, boots: { test: x => x.t === 'boots' }, potion: { test: x => x.t === 'potion' }, food: { test: x => x.t === 'food' }, inter: { test: x => x.t === 'mat' && x.g > 0 }, mat: { test: x => x.t === 'mat' && !x.g } };
  const CFILT_ORDER = [['all', '모든 아이템'], ['weapon', '무기'], ['armor', '옷'], ['head', '머리'], ['arm', '팔'], ['boots', '다리'], ['potion', '회복·물약'], ['food', '음식'], ['inter', '중간 재료'], ['mat', '기본 재료']];
  const TYPE_N = { weapon: '무기', armor: '옷', head: '머리', arm: '팔', boots: '다리', potion: '회복', food: '음식', mat: '재료' }, GRADE_N = ['일반', '고급', '희귀', '영웅'];
  const HUNT = { meat: 1, leather: 1, feather: 1 }, CRATE_SET = new Set(D.CRATE);
  const grade = it => it.g || 0;
  const recipeOf = id => RECIPES.find(r => r.out === id);
  function statLine(it) {
    const s = [];
    if (it.atk) s.push(`공격력 +${it.atk}`); if (it.def) s.push(`방어력 +${it.def}`); if (it.agi) s.push(`민첩 +${it.agi}`); if (it.luk) s.push(`운 +${it.luk}`);
    if (it.hun) s.push(`허기 +${it.hun}`); if (it.hp) s.push(`체력 +${it.hp}`); if (it.en) s.push(`스태미너 +${it.en}`);
    if (it.buff) s.push(it.d);
    if (it.t === 'weapon') s.push(WEAPONS[it.wc].d);
    return s.map(x => `<span>${x}</span>`).join('') || '<span class="lab">제작 재료로 쓴다</span>';
  }
  function treeNode(id, n, me) {
    const it = ITEMS[id], r = recipeOf(id), have = count(me, id), enough = have >= n;
    const kids = r && !(it.tier === 1) ? Object.keys(r.in).map(k => treeNode(k, r.in[k], me)).join('') : '';
    return `<li><button class="tnode" data-ci="${id}"><span class="itile sm g${grade(it)}" aria-hidden="true">${it.e}</span><span class="tn">${it.n}</span><span class="num ${enough ? 'ok' : 'no'}">${Math.min(have, n)}/${n}</span></button>${kids ? `<ul>${kids}</ul>` : ''}</li>`;
  }
  // 재료별로 잘 나오는 구역 (구역 자체 + 탐험지 분류의 비중)
  const SRC = {};
  for (const id in ITEMS) {
    if (recipeOf(id)) continue;
    const sc = ZONES.map(Z => { const tot = o => Object.values(o).reduce((a, b) => a + b, 0); let v = (Z.res[id] || 0) / tot(Z.res) * 0.3; for (const p of Z.places) { const c = D.CATS[D.PLACES[p].cat].res; v += (c[id] || 0) / tot(c) * 0.7 / Z.places.length; } return v; });
    SRC[id] = sc.map((v, z) => [v, z]).filter(x => x[0] > 0.06).sort((a, b) => b[0] - a[0]).slice(0, 5).map(x => x[1]);
  }
  const sources = id => SRC[id] || [];
  function goalNeeds(me) {
    if (!goal) return [];
    const need = {}, have = {}; for (const s of me.inv) if (s) have[s.id] = (have[s.id] || 0) + s.n; for (const k in me.eq) if (me.eq[k]) have[me.eq[k]] = (have[me.eq[k]] || 0) + 1;
    const walk = (id, n) => { const h = Math.min(have[id] || 0, n); have[id] = (have[id] || 0) - h; n -= h; if (n <= 0) return; const r = recipeOf(id); if (r && ITEMS[id].tier !== 1) { for (const k in r.in) walk(k, r.in[k] * n); } else need[id] = (need[id] || 0) + n; };
    const r = recipeOf(goal); if (r) for (const k in r.in) walk(k, r.in[k]); else walk(goal, 1);
    return Object.keys(need);
  }

  function radar(st) {
    const ax = [['체력', st.maxHp / 260], ['공격', st.atk / 70], ['방어', st.def / 90], ['민첩', st.agi / 12], ['운', st.luk / 10]];
    const cx = 66, cy = 62, R = 44, pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const poly = r => ax.map((_, i) => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');
    let g = [1, .66, .33].map(k => `<polygon points="${poly(R * k)}" fill="none" stroke="var(--line2)" stroke-width="1"/>`).join('');
    g += ax.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`; }).join('');
    g += `<polygon points="${ax.map(([, v], i) => pt(i, R * Math.max(.08, Math.min(1, v))).map(n => n.toFixed(1)).join(',')).join(' ')}" fill="rgba(63,214,232,.28)" stroke="var(--accent)" stroke-width="1.5" style="filter:drop-shadow(0 0 4px rgba(63,214,232,.6))"/>`;
    g += ax.map(([n], i) => { const [x, y] = pt(i, R + 11); return `<text x="${x}" y="${y + 3}" text-anchor="middle">${n}</text>`; }).join('');
    return `<div class="radar"><svg viewBox="0 0 132 120" role="img" aria-label="능력치">${g}</svg><dl><dt>공격</dt><dd>${st.atk}</dd><dt>방어</dt><dd>${st.def}</dd><dt>민첩</dt><dd>${st.agi}</dd><dt>운</dt><dd>${st.luk}</dd></dl></div>`;
  }

  // 지도 이동: 폐쇄 구역을 피하는 가장 짧은 길 (엔진과 같은 규칙)
  let curZs = null, curFrom = -1;
  function routeC(from, to, zs) {
    const prev = { [from]: -1 }, q = [from];
    while (q.length) { const u = q.shift(); if (u === to) break; for (const w of ZONES[u].adj) if (prev[w] === undefined && zs[w] < 2) { prev[w] = u; q.push(w); } }
    if (prev[to] === undefined) return null; const p = []; for (let u = to; u !== -1; u = prev[u]) p.unshift(u); return p.slice(1);
  }
  function showPreview(to) {
    const g = $('mapPrev'); if (!g) return;
    if (to < 0 || curFrom < 0 || !curZs) { g.innerHTML = ''; return; }
    const rt = routeC(curFrom, to, curZs); if (!rt) { g.innerHTML = ''; return; }
    const pts = [curFrom].concat(rt), Z = ZONES[to], cost = G.World.moveCost(rt.length), sec = rt.length * G.DUR.move, txt = `${rt.length}구역 · 약 ${sec}초 · 스태미너 ${cost}`, w = txt.length * 7 + 16;
    g.innerHTML = `<polyline class="route pre" fill="none" points="${pts.map(q => ZONES[q].x + ',' + ZONES[q].y).join(' ')}"/><g class="eta"><rect x="${Z.x - w / 2}" y="${Z.y + 14}" width="${w}" height="18" rx="2"/><text x="${Z.x}" y="${Z.y + 27}" text-anchor="middle">${txt}</text></g>`;
  }
  document.addEventListener('pointerover', e => { const n = e.target.closest && e.target.closest('#mapSvg [data-zone]'); showPreview(n ? +n.dataset.zone : -1); });
  document.addEventListener('focusin', e => { const n = e.target.closest && e.target.closest('#mapSvg [data-zone]'); showPreview(n ? +n.dataset.zone : -1); });
  // ---------- 결과 카드 (캡처해서 공유하기 좋게) ----------
  function renderCard(v) {
    const el = $('card'); if (!v.over || !showCard) { el.hidden = true; return; }
    const P = people, rank = v.over.rank, win = P[rank[0]] || NOBODY, my = rank.indexOf(myId);
    const talks = v.feed.filter(f => f.k === 'talk').slice(-4);
    const top = rank.slice(0, 5).map((id, i) => { const p = P[id] || NOBODY, r = v.roster.find(x => x.id === id) || { k: 0 }; return `<div class="crow ${id === myId ? 'me' : ''}"><b class="num">${i + 1}</b>${face(p, 30)}<span>${esc(p.name)}${p.bot ? ' <small>AI</small>' : ''}</span><span class="num">${r.k} 처치</span></div>`; }).join('');
    const html = `<div class="rcard"><div class="rhead"><span class="en">LAST ISLE // EXPERIMENT REPORT</span><button class="sm" data-do="card" aria-label="닫기">✕</button></div>
      <div class="rwin">${face(win, 96)}<div><span class="en">LAST SURVIVOR</span><div class="rname">${esc(win.name)}</div><small>${esc(win.bio || '')}</small></div></div>
      <div class="rstats"><div><span class="en">SURVIVORS</span><b class="num">${v.roster.length}</b></div><div><span class="en">TIME</span><b class="num">${clock(v.t)}</b></div><div><span class="en">MY RANK</span><b class="num">${my >= 0 ? my + 1 : '-'}</b></div></div>
      <div class="rlist">${top}</div>
      ${talks.length ? `<div class="rtalk">${talks.map(t => `<p>${esc(t.m)}</p>`).join('')}</div>` : ''}
      <span class="lab">${esc(roomName)} · ${G.TEMPO[v.tempo].n}</span></div>`;
    if (set('card', html)) el.hidden = false; else el.hidden = false;
  }
  // ================= 화면 =================
  function count(me, id) { let n = 0; for (const s of me.inv) if (s && s.id === id) n += s.n; if (me.eq[ITEMS[id].t] === id) n++; return n; }
  function itemDesc(it) { if (it.tier) return [it.atk && `공격 +${it.atk}`, it.def && `방어 +${it.def}`, it.agi && `민첩 +${it.agi}`, it.luk && `운 +${it.luk}`].filter(Boolean).join(' · '); return it.d || (it.g ? '중간 재료' : '재료'); }
  const need = (me, cost) => Object.keys(cost).map(k => `<span class="${count(me, k) >= cost[k] ? '' : 'no'}">${ITEMS[k].n} ${Math.min(count(me, k), cost[k])}/${cost[k]}</span>`).join(' · ');
  const logHtml = (list, withTime) => list.map(l => `<div class="${l.k || ''}">${withTime ? `<time>${clock(l.t)}</time>` : ''}<span>${esc(l.m)}</span></div>`).join('');
  function setLog(id, html) { const el = $(id), stick = el.scrollHeight - el.scrollTop - el.clientHeight < 40; if (set(id, html) && stick) el.scrollTop = el.scrollHeight; }
  const meter = (cls, n, v, max) => `<div class="meter ${cls}"><span>${n}</span><div class="bar"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></div><b class="num">${v}</b></div>`;
  const NOBODY = { name: '?', color: '#888' };

  function render() {
    const v = view; if (!v) return;
    const me = v.me, P = people, mine = P[myId] || NOBODY, alive = v.roster.filter(r => r.al).length;
    set('title', `<h1>최후의 섬</h1><span class="lab">${esc(roomName)} · ${G.TEMPO[v.tempo].n}</span><div class="row">${mode === 'off' ? `<button class="sm" data-do="speed">속도 ×${speed}</button>` : ''}${askLeave ? `<button class="sm" data-do="leave">메뉴로 (저장됨)</button><button class="sm" data-do="stay">계속하기</button>` : `<button class="sm" data-do="leave">나가기</button>`}</div>`);
    const wx = v.wx || { day: true, w: 'clear' };
    set('clock', `<h3><span>경과</span><span class="lab">${v.paused ? '<span class="chip w">일시정지</span>' : v.final ? '최종 구역' : `${v.phase + 1}번째 ${wx.day ? '낮' : '밤'}`}</span></h3><div class="big num">${clock(v.t)}</div>
      <span class="${v.started && !v.over ? 'warn' : 'lab'}">${!v.started ? '시작 대기 중' : v.over ? '실험 종료' : v.final ? `숨을 곳 없음 · ${ZONES[v.zs.findIndex(x => x < 2)].n}` : `다음 폐쇄까지 ${clock(v.nextClose - v.t)}`}</span>
      <span class="lab">남은 인원 ${alive} / ${v.roster.length} · 남은 구역 ${v.zs.filter(x => x < 2).length}</span>
      ${v.started ? `<div class="wxrow"><div class="wxc ${wx.day ? 'on' : ''}"><span class="en">TIME</span><b>${wx.day ? '☀' : '☾'}</b><span>${wx.day ? '낮' : '밤'}</span></div><div class="wxc ${wx.w !== 'clear' ? 'on' : ''}"><span class="en">WEATHER</span><b>${{ clear: '◌', rain: '☂', fog: '≋' }[wx.w]}</b><span>${G.WEATHER[wx.w][0]}</span></div><p class="help">${wx.day ? '' : '밤: 조우 확률 상승, 수확 감소. '}${wx.w === 'clear' ? '' : G.WEATHER[wx.w][1]}</p></div>` : ''}`);
    document.body.dataset.wx = v.started ? (wx.day ? '' : 'night ') + wx.w : '';
    set('tabs', [['map', '◈ 지도 · 탐험'], ['craft', '▤ 제작'], ['base', '⌂ 거점'], ['roster', '☰ 생존자']].concat(gm ? [['gm', '⚙ 운영']] : []).map(([k, n]) => `<button data-tab="${k}" aria-selected="${tab === k}">${n}</button>`).join(''));
    const wasHidden = $('mapTab').hidden; $('mapTab').hidden = tab !== 'map'; $('pane').hidden = tab === 'map';
    if (wasHidden && tab === 'map') fitMap();
    setLog('chatLog', v.chat.map(c => `<div><span><b>${esc(c.n)}</b> ${esc(c.m)}</span></div>`).join('') || '<p class="help">아직 아무도 말하지 않았다.</p>');
    set('feedLog', logHtml(v.feed.slice().reverse(), true) || '<p class="help">아직 소식이 없다.</p>');
    if (!me) return;
    renderMap(v);
    // 조종 중인 생존자
    const eqn = k => me.eq[k] ? `<span class="g${grade(ITEMS[me.eq[k]])}">${ITEMS[me.eq[k]].n}</span> <small>${itemDesc(ITEMS[me.eq[k]])}</small>` : '<small>없음</small>';
    set('dossier', `<h3><span>조종 중</span><span class="lab">No.${String(me.id).padStart(3, '0')}</span></h3>
      <div class="who">${face(mine, 56)}<div class="grow"><div class="nm">${esc(mine.name)}</div><small>Lv ${me.lvl} · 처치 ${me.kills}</small><small>${esc(mine.bio || '')}</small></div></div>
      <div class="row">${!me.alive ? '<span class="chip d">탈락</span>' : v.battle ? '<span class="chip d">교전 중</span>' : me.inBase ? '<span class="chip g">거점 안 · 안전</span>' : '<span class="chip g">양호</span>'}${me.hunger <= 0 ? '<span class="chip d">굶주림</span>' : me.hunger < 25 ? '<span class="chip w">배고픔</span>' : ''}${me.en < 15 ? '<span class="chip w">지침</span>' : ''}${me.bf.atk ? '<span class="chip g">투지</span>' : ''}${me.bf.agi ? '<span class="chip g">신속</span>' : ''}</div>
      <div class="meters">${meter('hp', '체력', me.hp, me.st.maxHp)}${meter('hun', '허기', me.hunger, 100)}${meter('', '스태미너', me.en, 100)}${meter('xp', '경험', me.xp, me.need)}</div>
      <div class="skillbox"><span class="en">SKILL</span><b>${G.SKILLS[me.skill || 'scav'][0]}</b><small>${G.SKILLS[me.skill || 'scav'][1]}</small></div>
      ${radar(me.st)}
      <div class="stats5">${me.sp ? `<div class="sp">능력치 포인트 <b class="num">${me.sp}</b> — 올릴 능력치를 고른다</div>` : ''}${Object.keys(G.STAT_FX).map(k => `<div class="srow"><span class="sn">${G.STAT_FX[k][0]}</span><b class="num">${me.raw[k] || 0}</b><small>${G.STAT_FX[k][1]}</small>${me.sp && me.alive && (me.raw[k] || 0) < G.STAT_MAX ? `<button class="sm go plus" ${cmdAttr({ k: 'stat', s: k })} aria-label="${G.STAT_FX[k][0]} 올리기">+1</button>` : ''}</div>`).join('')}</div>
      <dl class="kvs"><dt>무기</dt><dd>${eqn('weapon')}</dd><dt>옷</dt><dd>${eqn('armor')}</dd><dt>머리</dt><dd>${eqn('head')}</dd><dt>팔</dt><dd>${eqn('arm')}</dd><dt>다리</dt><dd>${eqn('boots')}</dd><dt>거점</dt><dd>${me.base ? ZONES[me.base.zone].n : '<small>없음</small>'}</dd></dl>`);
    // 소지품
    const inB = !!v.battle, used = me.inv.filter(Boolean).length; if (!me.inv[sel]) sel = -1;
    let bh = `<h3><span>소지품</span><span class="lab num">${used}/${G.INV}</span></h3><div class="slots">${me.inv.map((s, i) => `<button class="slot g${s ? grade(ITEMS[s.id]) : 0}" data-slot="${i}" aria-pressed="${sel === i}" ${s ? `aria-label="${ITEMS[s.id].n}"` : 'disabled'}>${s ? ITEMS[s.id].e : ''}${s && !ITEMS[s.id].tier ? `<small>${s.n}</small>` : ''}</button>`).join('')}</div>`;
    if (sel >= 0) {
      const s = me.inv[sel], it = ITEMS[s.id];
      bh += `<div><div>${it.n}${it.tier ? '' : ` ×${s.n}`}</div><span class="lab">${itemDesc(it)}</span></div><div class="row">
        ${it.t !== 'mat' && me.alive ? (inB ? (it.tier ? '' : `<button class="sm" ${cmdAttr({ k: 'bat', a: 'item', slot: sel })} ${v.battle.picked ? 'disabled' : ''}>사용 (한 턴)</button>`) : `<button class="sm" ${cmdAttr({ k: 'use', slot: sel })}>${it.tier ? '장비' : '사용'}</button>`) : ''}
        ${me.inBase && !inB ? `<button class="sm" ${cmdAttr({ k: 'stash', slot: sel })}>창고에 보관</button>` : ''}${!inB && me.alive ? `<button class="sm" ${cmdAttr({ k: 'drop', slot: sel })}>버림</button>` : ''}</div>`;
    } else bh += '<span class="lab">칸을 누르면 쓰거나 버릴 수 있다.</span>';
    set('bag', bh);
    renderStatus(v, me, alive);
    if (tab === 'map') renderPlaces(v, me); else renderPane(v, me);
    setLog('log', logHtml(!me.alive && v.spec ? v.spec.log : me.log, true));
    $('logBox').querySelector('h3 span').textContent = !me.alive && v.spec ? `관전 · ${(P[v.spec.id] || NOBODY).name}의 기록` : '기록';
    renderCard(v);
    // 근처 사람
    let ph;
    if (!v.started || !me.alive || !v.here) ph = '<h3><span>근처 사람</span></h3><p class="help">—</p>';
    else if (me.inBase) ph = '<h3><span>근처 사람</span></h3><p class="help">거점 안에서는 밖이 보이지 않고, 밖에서도 이곳을 찾지 못한다.</p>';
    else {
      const h = v.here, unseen = h.signs - h.seen.length;
      const canAlly = !me.ally && !v.final && alive > 3;
      ph = `<h3><span>근처 사람 · 본 적 있음 ${h.seen.length}</span><span class="lab">${unseen > 0 ? `기척 ${unseen > 1 ? '여럿' : '하나'}` : ''}</span></h3>` + h.seen.map(o => { const p = P[o.id] || NOBODY, isA = me.ally && me.ally.id === o.id; return `<div class="person">${face(p, 36)}<span class="nm">${esc(p.name)}${isA ? ' <span class="chip g">동맹</span>' : ''}<small>Lv ${o.lvl} · ${ITEMS[o.w] ? ITEMS[o.w].n : '맨손'} · ${o.cond}</small></span>${canAlly && !isA ? `<button class="sm" ${cmdAttr({ k: 'ally', who: o.id })} ${me.act ? 'disabled' : ''}>동맹 제안</button>` : ''}</div>`; }).join('');
      ph += `<p class="help">${h.signs === 0 ? '인기척이 없다.' : unseen > 0 ? '기척이 있다. 탐색하다 마주치면 먼저 칠 수 있다. 상대도 마찬가지다.' : '탐색하다 마주치면 먼저 칠 수 있다. 상대도 마찬가지다.'}</p>`;
    }
    if (me.alive && me.allyReq && P[me.allyReq]) ph = `<div class="allyreq"><b>${esc(P[me.allyReq].name)}</b>이(가) 동맹을 제안했다.<div class="row"><button class="sm go" ${cmdAttr({ k: 'allyOk' })}>수락</button><button class="sm" ${cmdAttr({ k: 'allyNo' })}>거절</button></div></div>` + ph;
    if (me.alive && me.ally) { const a = me.ally, p = P[a.id] || NOBODY; ph += `<div class="allybox"><span class="en">ALLY LINK</span><div class="person">${face(p, 36)}<span class="nm">${esc(p.name)} <span class="chip g">동맹</span><small>${ZONES[a.zone].n} · 체력 ${a.hp}/${a.mh}</small></span><button class="sm" ${cmdAttr({ k: 'allyBreak' })}>끊기</button></div><p class="help">서로 조우해도 공격하지 않는다. 남은 사람이 셋이 되거나 최종 구역이 되면 깨진다.</p></div>`; }
    set('people', ph);
  }

  function renderStatus(v, me, alive) {
    const P = people, S = $('status'); let h = '';
    if (!v.started) h = `<h3><span>대기실</span></h3><p style="margin:0">배가 섬에 닿기를 기다리는 중이다. 지금 ${v.roster.length}명이 타고 있다.</p><p class="help">같은 방 이름으로 들어온 사람은 ‘생존자’ 탭에 나타납니다. 시작하면 AI 생존자가 합류하고, 두 번째 폐쇄 전까지는 뒤늦게 들어올 수 있습니다.</p>${gm ? '<div class="row"><button class="go" data-do="start">실험 시작</button></div>' : '<p class="help">방장이 시작하기를 기다리는 중입니다.</p>'}`;
    else if (v.over) {
      const my = v.over.rank.indexOf(myId);
      h = `<h3><span>실험 종료</span></h3><p style="margin:0">${my === 0 ? '마지막까지 살아남았다.' : `${my + 1}번째로 남은 사람이었다.`}</p>
        ${v.over.rank.map((id, i) => { const p = P[id] || NOBODY, r = v.roster.find(x => x.id === id) || { k: 0 }; return `<div class="person"><b>${i + 1}</b>${face(p, 28)}<span class="nm">${esc(p.name)}${p.bot ? ' <span class="chip">AI</span>' : ''}${id === myId ? ' <span class="chip g">나</span>' : ''}<small>처치 ${r.k}</small></span></div>`; }).join('')}
        <div class="row"><button class="go" data-do="card">결과 카드 보기</button>${gm ? '<button data-do="reset">새 판 열기</button>' : ''}<button data-do="leave">메뉴로</button></div>`;
    } else if (!me.alive) {
      const alv = v.roster.filter(r => r.al);
      h = `<h3><span>탈락 · 관전 중</span><span class="lab">${v.spec ? esc((P[v.spec.id] || NOBODY).name) : '대상 없음'}</span></h3><p style="margin:0">기록은 여기서 끊겼다. 남은 ${alive}명 중 한 명을 골라 지켜볼 수 있다. 채팅은 계속할 수 있다.</p>
        <div class="row">${alv.map(r => `<button class="sm" ${cmdAttr({ k: 'spec', who: r.id })} aria-pressed="${v.spec && v.spec.id === r.id}">${esc((P[r.id] || NOBODY).name)}</button>`).join('')}</div>
        ${v.spec ? `<div class="meters">${meter('hp', '체력', v.spec.hp, v.spec.mh)}</div><span class="lab">${ZONES[v.spec.zone].n} · Lv ${v.spec.lvl}</span>` : ''}`;
    }
    else if (v.here && v.here.enc && !me.act) {
      const o = v.here.enc, p = P[o.id] || NOBODY;
      h = `<h3><span>조우 · ${ZONES[me.zone].n}</span><span class="chip w">상대는 아직 모른다</span></h3>
        <div class="who">${face(p, 64)}<div class="grow"><div class="nm">${esc(p.name)}${o.grudge ? ' <span class="chip d">나를 친 상대</span>' : ''}</div><small>Lv ${o.lvl} · ${ITEMS[o.w] ? ITEMS[o.w].n : '맨손'} · ${o.cond}</small><small>${esc(p.bio || '')}</small></div></div>
        <div class="cards acts"><button class="card act main danger-card" style="grid-template-columns:1fr" ${cmdAttr({ k: 'attack', who: o.id })} ${me.en < G.COST.attack ? 'disabled' : ''}><b>선제공격</b><small>스태미너 ${G.COST.attack} · 상대는 이번엔 되받아치지 못한다</small></button>
        <button class="card act" style="grid-template-columns:1fr" ${cmdAttr({ k: 'ignore' })}><b>지나친다</b><small>들키지 않고 넘어간다</small></button></div>`;
    }
    else if (v.fight) {
      const f = v.fight, mob = !!f.foe.mob, fp = mob ? { name: MOBS[f.foe.mob].n } : (P[f.foe.id] || NOBODY), mine = P[myId] || NOBODY;
      const RES = { win: ['쓰러뜨림', 'g'], hit: ['공격 성공', 'g'], ambushed: ['기습당함', 'd'], lose: ['패배', 'd'], fled: ['도주 성공', 'w'], escaped: ['상대가 도주', 'w'], draw: ['승부 없음', ''] }[f.res];
      const fn = f.foeNow, canHit = !mob && fn && fn.al && fn.zone === me.zone && me.alive && !me.inBase;
      const bar = (now, mh, before) => `<div class="hpb"><i style="width:${Math.max(0, now / mh * 100)}%"></i></div><span class="lab num">${before} → ${now} / ${mh}</span>`;
      h = `<h3><span>전투 결과 · ${ZONES[f.zone].n}</span><span class="chip ${RES[1]}">${RES[0]}</span></h3>
        <div class="vs"><div class="side"><div class="who">${face(mine, 44)}<div><div class="nm">${esc(mine.name)}</div><small>${f.ini ? (mob ? '사냥' : '선제공격') : mob ? '조우' : '기습당함'}</small></div></div>${bar(Math.round(me.hp), me.st.maxHp, f.me0)}</div>
        <div class="mid">VS</div>
        <div class="side"><div class="who">${mob ? `<span class="face" style="width:44px;height:44px;font-size:26px;background:#000">${MOBS[f.foe.mob].e}</span>` : face(fp, 44)}<div><div class="nm">${esc(fp.name)}</div><small>${mob ? '야생동물' : fn && !fn.al ? '탈락' : fn && fn.zone !== me.zone ? '시야 밖' : '같은 구역'}</small></div></div>${bar(fn ? fn.hp : f.opEnd, fn ? fn.mh : f.opMh, f.op0)}</div></div>
        <div class="log" id="blog">${logHtml(f.log)}</div>
        <div class="row"><button class="go" ${cmdAttr({ k: 'ack' })}>확인</button><span class="help">${f.res === 'ambushed' ? '되갚으려면 탐색하다 다시 마주쳐야 한다(나를 친 상대는 조금 더 잘 찾는다). 피하려면 지도에서 다른 구역으로.' : f.res === 'hit' ? '상대는 이쪽을 알아챘다. 다시 치려면 또 마주쳐야 한다.' : ''}</span></div>`;
    } else if (me.act) {
      const a = me.act;
      if (a.k === 'rest') { const rate = G.World.restRate(v.len, me.inBase); h = `<h3><span>휴식 중 · ${ZONES[me.zone].n}</span><span class="lab num">${me.en >= 100 ? '가득' : '가득까지 ' + clock((100 - me.en) / rate)}</span></h3><div class="meters">${meter('', '스태미너', me.en, 100)}</div><p class="help">${me.inBase ? '거점 안이라 더 빨리 회복되고 체력도 찬다.' : '거점 밖이라 쉬는 동안 들킬 수 있다.'} 가득 차면 저절로 일어난다.</p><div class="row"><button class="sm" ${cmdAttr({ k: 'cancel' })}>일어난다</button></div>`; }
      else { const nm = { explore: `${ZONES[me.zone].n} 일대를 뒤지는 중`, hunt: '짐승의 흔적을 쫓는 중', open: '보급 상자를 뜯는 중', move: `${G.J(ZONES[a.to || 0].n, '으로', '로')} 이동하는 중${a.path && a.path.length > 1 ? ` · ${a.path.length}구역 남음` : ''}`, build: '거점을 짓는 중' }[a.k]; h = `<h3><span>${nm}</span><span class="lab num">${clock(a.end - v.t)}</span></h3><div class="prog"><i style="width:${Math.min(100, (v.t - a.start) / (a.end - a.start) * 100)}%"></i></div><div class="row"><button class="sm" ${cmdAttr({ k: 'cancel' })}>그만둔다</button></div>`; }
    }
    S.hidden = !h; if (h && set('status', h)) { const el = $('blog'); if (el) el.scrollTop = el.scrollHeight; } if (!h) cache.status = '';
  }

  function renderPlaces(v, me) {
    if (!v.started || !me.alive || v.over) return set('places', '<h3><span>행동</span></h3><p class="help">—</p>');
    const Z = ZONES[me.zone], st = v.zs[me.zone], busy = !!(v.battle || me.act), dis = busy ? 'disabled' : '';
    let h = `<h3><span>${me.inBase ? `${Z.n} · 거점 안` : Z.n}</span><span class="chip ${st === 1 ? 'w' : 'g'}">${st === 1 ? '폐쇄 예고' : v.final ? '최종 구역' : '안전'}</span></h3><p class="help" style="font-family:var(--px);font-size:15px;color:var(--fg)">${me.inBase ? '문을 잠그면 섬은 잠시 바깥의 일이 된다.' : Z.d}</p>`;
    const one = (c, n, d, cls) => `<button class="card act ${cls || ''}" style="grid-template-columns:1fr" ${cmdAttr(c)} ${dis}><b>${n}</b><small>${d}</small></button>`;
    h += '<div class="cards acts">';
    if (!me.inBase) {
      const worn = Z.places.reduce((a, p) => a + (v.here.worn.includes(p) ? 1 : 0), 0);
      h += one({ k: 'explore' }, '탐색', `${G.DUR.explore}초 · 스태미너 ${G.COST.explore}${worn ? ` · <span class="no">${worn >= Z.places.length / 2 ? '많이 털림' : '조금 털림'}</span>` : ''}`, 'main');
      h += one({ k: 'hunt' }, '사냥', `${G.DUR.hunt}초 · 스태미너 ${G.COST.hunt} · 고기·가죽·깃털`);
      if (v.here.pile) h += one({ k: 'loot' }, '남겨진 짐 뒤지기', `${v.here.pile}개가 놓여 있다`);
    }
    { const rate = G.World.restRate(v.len, me.inBase), full = Math.ceil((100 - me.en) / rate); h += one({ k: 'rest' }, '휴식', me.en >= 100 ? '스태미너 가득' : `스태미너 회복 · 약 ${clock(full)}면 가득${me.inBase ? ' · 체력도 회복' : ''}`, me.en < 30 ? 'main' : ''); }
    if (v.drop && v.drop.z === me.zone && !me.inBase) h += one({ k: 'openDrop' }, '보급품 열기', '15초 · 소란이 난다 · 먼저 연 사람이 갖는다', 'main');
    if (me.inBase) h += one({ k: 'leave' }, '거점에서 나간다', '다시 들킬 수 있다'); else if (me.base && me.base.zone === me.zone && !v.final) h += one({ k: 'enter' }, '거점으로 들어간다', '안전');
    h += '</div>';
    if (!me.inBase) h += `<p class="help">이동: 지도에서 가고 싶은 구역 이름을 누른다. 멀수록 시간과 스태미너가 더 든다.</p>`;
    set('places', h);
  }

  function renderPane(v, me) {
    const P = people; let h = '';
    if (tab === 'gm') {
      const open = v.zs.map((q, i) => [q, i]).filter(x => x[0] < 2), alv = v.roster.filter(r => r.al);
      h = `<h3><span>운영 (GM)</span><span class="lab">${mode === 'off' ? '혼자 하기에서는 내가 운영자' : '방장만 볼 수 있다'}</span></h3>
        ${!v.started ? '<p class="help">판이 시작된 뒤에 쓸 수 있다.</p>' : `<div class="cards acts">
          <button class="card act ${v.paused ? 'main' : ''}" style="grid-template-columns:1fr" data-gm='{"k":"pause"}'><b>${v.paused ? '다시 시작' : '일시정지'}</b><small>${v.paused ? '시간이 다시 흐른다' : '시간과 모든 행동을 멈춘다'}</small></button>
          <button class="card act" style="grid-template-columns:1fr" data-gm='{"k":"skip"}' ${v.final ? 'disabled' : ''}><b>다음 폐쇄로</b><small>지금 바로 구역을 닫고 다음 예고</small></button>
          <button class="card act" style="grid-template-columns:1fr" data-gm='{"k":"drop"}'><b>보급품 투하</b><small>무작위 안전 구역에 떨어뜨린다</small></button></div>
        <span class="lab">방송</span><div class="row" style="flex-wrap:nowrap"><input type="text" id="gmSay" maxlength="120" placeholder="섬 전체에 알릴 말" style="flex:1 1 0;width:0"><button data-gm='{"k":"say"}'>방송</button></div>
        <span class="lab">구역 즉시 폐쇄</span><div class="row" style="flex-wrap:nowrap"><select id="gmZone" style="flex:1 1 0;width:0">${open.map(([q, i]) => `<option value="${i}">${ZONES[i].n}${q === 1 ? ' (예고)' : ''}</option>`).join('')}</select><button class="danger" data-gm='{"k":"close"}'>폐쇄</button></div>
        <span class="lab">강제 탈락</span><div class="row" style="flex-wrap:nowrap"><select id="gmWho" style="flex:1 1 0;width:0">${alv.map(r => `<option value="${r.id}">${esc((P[r.id] || NOBODY).name)}</option>`).join('')}</select><button class="danger" data-gm='{"k":"kill"}'>탈락</button></div>`}`;
      return set('pane', h);
    }
    if (tab === 'roster') {
      h = `<h3><span>생존자 명단</span><span class="lab">${v.roster.filter(r => r.al).length}명 생존</span></h3>` + v.roster.map(r => { const p = P[r.id] || NOBODY; return `<div class="person ${r.al ? '' : 'out'}">${face(p, 36)}<span class="nm">${esc(p.name)}${p.bot ? ' <span class="chip">AI</span>' : ''}${r.id === myId ? ' <span class="chip g">나</span>' : ''}<small>${r.al ? (r.on ? '생존' : '생존 · 자리 비움') : '탈락'} · 처치 ${r.k}${p.bio ? ' · ' + esc(p.bio) : ''}</small></span></div>`; }).join('');
    } else if (!v.started || !me.alive || v.over) h = '<p class="help">지금은 할 수 없다.</p>';
    else if (tab === 'craft') {
      const all = Object.values(ITEMS), q = craftQ.trim();
      const shown = all.filter(it => (craftCat === 'all' || CFILT[craftCat].test(it)) && (!q || it.n.includes(q)));
      if (!ITEMS[craftSel]) craftSel = (shown.find(it => recipeOf(it.id)) || shown[0] || all[0]).id;
      const it = ITEMS[craftSel], rec = recipeOf(it.id), ok = rec && Object.keys(rec.in).every(k => count(me, k) >= rec.in[k]);
      const uppers = RECIPES.filter(r => r.in[it.id]).map(r => ITEMS[r.out]);
      const cnt = k => all.filter(x => k === 'all' || CFILT[k].test(x)).length;
      h = `<h3><span>아이템 제작</span><span class="lab">${goal ? `목표 · <span class="g${grade(ITEMS[goal])}">${ITEMS[goal].n}</span>` : '목표를 정하면 지도에 재료 위치가 표시된다'}</span></h3>
      <div class="craft">
        <div class="cleft">
          <input type="text" id="craftQ" placeholder="아이템 검색" value="${esc(craftQ)}" aria-label="아이템 검색">
          <div class="cfilt">${CFILT_ORDER.map(([k, n]) => `<button data-cf="${k}" aria-pressed="${craftCat === k}">${n}<span class="num">${cnt(k)}</span></button>`).join('')}</div>
          <div class="igrid">${shown.map(x => { const r = recipeOf(x.id), can = r && Object.keys(r.in).every(k => count(me, k) >= r.in[k]), have = count(me, x.id); return `<button class="itile g${grade(x)}" data-ci="${x.id}" aria-pressed="${x.id === craftSel}" aria-label="${x.n}" title="${x.n}">${x.e}${can ? '<i class="can" aria-hidden="true"></i>' : ''}${have ? `<small>${have}</small>` : ''}${x.id === goal ? '<em>목표</em>' : ''}</button>`; }).join('') || '<p class="help">찾는 아이템이 없다.</p>'}</div>
        </div>
        <div class="cright">
          <div class="csec"><span class="lab">상위 아이템</span><div class="uppers">${uppers.length ? uppers.map(u => `<button class="itile sm g${grade(u)}" data-ci="${u.id}" title="${u.n}">${u.e}</button><span class="lab">${u.n}</span>`).join('') : '<span class="help">이 아이템으로 만들 수 있는 것이 없다.</span>'}</div></div>
          <div class="csec"><span class="lab">제작 트리</span><div class="treewrap"><ul class="tree">${treeNode(it.id, 1, me)}</ul></div></div>
          <div class="cdet">
            <div class="row" style="align-items:flex-start"><span class="itile g${grade(it)}" style="width:54px;font-size:28px" aria-hidden="true">${it.e}</span>
              <div class="grow"><div class="nm g${grade(it)}">${it.n}</div><span class="lab">${TYPE_N[it.t]}${it.wc ? ' · ' + WEAPONS[it.wc].n : ''} · ${GRADE_N[grade(it)]}</span></div>
              <div class="row">${rec ? `<button class="go" ${cmdAttr({ k: 'craft', r: it.id })} ${ok && !v.battle ? '' : 'disabled'}>제작</button>` : ''}<button data-goal="${it.id}" ${goal === it.id ? 'aria-pressed="true"' : ''}>${goal === it.id ? '목표 해제' : '목표로 설정'}</button></div></div>
            <div class="stats">${statLine(it)}</div>
            ${it.t === 'weapon' && it.wc !== ITEMS[me.eq.weapon].wc ? '<p class="help no">지금 쥔 무기와 계열이 다르다. 이 계열의 1단계 무기부터 있어야 만들 수 있다.</p>' : ''}
            ${rec ? `<span class="lab">필요한 재료</span><p class="help rc" style="padding:0;background:none;border:0"><small style="font-size:13px">${need(me, rec.in)}</small></p>` : ''}
            ${!rec ? `<span class="lab">얻는 곳</span><p class="help">${sources(it.id).map(z => ZONES[z].n).join(', ') || (it.tier === 1 ? '시작할 때 지급된다.' : '보급 상자에서만 나온다.')}${HUNT[it.id] ? ' · 사냥' : ''}${CRATE_SET.has(it.id) ? ' · 보급 상자' : ''}</p>` : ''}
            <span class="lab">보유 ${count(me, it.id)}개</span>
          </div>
        </div>
      </div>`;
    } else {
      const here = me.base && me.base.zone === me.zone, st = v.zs[me.zone], busy = !!(v.battle || me.act);
      h = `<h3><span>거점</span><span class="lab">${me.base ? ZONES[me.base.zone].n + (me.inBase ? ' · 안에 있음' : '') : '없음'}</span></h3>
        <ul class="help"><li>거점 안에 있으면 누구에게도 발견되지 않고 습격당하지 않는다. 허기는 절반 속도로 줄고, 쉬면 체력까지 회복된다.</li><li>한동안 조작이 없으면 같은 구역의 거점으로 알아서 돌아간다.</li><li>구역이 폐쇄되면 거점은 무너지고 창고의 물건도 사라진다. 최종 구역에서는 거점을 쓸 수 없다.</li></ul>`;
      if (v.final) h += '<p class="no" style="margin:0">이제 숨을 곳은 없다.</p>';
      else {
        h += '<div class="cards">';
        if (me.inBase) h += `<button class="card" style="grid-template-columns:1fr" ${cmdAttr({ k: 'leave' })}><b>나간다</b><small>다시 들킬 수 있다</small></button>`;
        else if (here) h += `<button class="card" style="grid-template-columns:1fr" ${cmdAttr({ k: 'enter' })} ${busy ? 'disabled' : ''}><b>들어간다</b><small>안전</small></button>`;
        else h += `<button class="card" style="grid-template-columns:1fr" ${cmdAttr({ k: 'build' })} ${st !== 0 || busy ? 'disabled' : ''}><b>${me.base ? `${G.J(ZONES[me.zone].n, '으로', '로')} 거점을 옮긴다` : `${ZONES[me.zone].n}에 거점을 짓는다`}</b><small>${G.DUR.build}초 · 스태미너 ${G.COST.build}${me.base ? ' · 옛 창고는 버려짐' : ''}${st !== 0 ? ' · 폐쇄 예고 구역 불가' : ''}</small></button>`;
        h += '</div>';
        if (!here) h += `<span class="lab">필요한 재료: ${need(me, BASE_COST)}</span>`;
        if (me.inBase) h += `<span class="lab">── 창고 ${me.base.stash.length}/${G.STASH} · 소지품 칸을 눌러 ‘창고에 보관’ ──</span>${me.base.stash.map((s, i) => `<div class="person"><span class="nm">${ITEMS[s.id].e} ${ITEMS[s.id].n} ×${s.n}</span><button class="sm" ${cmdAttr({ k: 'unstash', i })}>꺼낸다</button></div>`).join('') || '<p class="help">비어 있다.</p>'}`;
      }
    }
    set('pane', h);
  }
  window.__ic = { get world() { return world; }, get view() { return view; }, get myId() { return myId; } };
})();
