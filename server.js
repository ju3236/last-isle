// 온라인 서버: 정적 파일 + WebSocket + 방별 세계 저장. 실행: node server.js [포트]
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { World, cleanChar } = require('./shared/world.js');
const PORT = +(process.argv[2] || process.env.PORT || 8080), DATA = path.join(__dirname, 'data');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2' };
fs.mkdirSync(DATA, { recursive: true });

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/fonts/')) u = '/' + path.basename(u);
  const base = u.endsWith('.woff2') ? path.join(__dirname, 'node_modules/galmuri/dist') : u.startsWith('/shared/') ? __dirname : path.join(__dirname, 'public'), f = path.normalize(path.join(base, u));
  if (!f.startsWith(base) || !MIME[path.extname(f)]) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)], 'Cache-Control': 'no-cache' }); res.end(d); });
});

// 방: { name, world, auth:{이름:{salt,hash,id}}, gm, bots, clients:Set }
const rooms = new Map();
const fileOf = name => path.join(DATA, crypto.createHash('sha1').update(name).digest('hex').slice(0, 16) + '.json');
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
function save(room) { fs.writeFile(fileOf(room.name), JSON.stringify({ name: room.name, auth: room.auth, gm: room.gm, bots: room.bots, world: room.world.s }), () => {}); }
for (const f of fs.readdirSync(DATA)) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
    if (!d.world.zs || d.world.zs.length !== require('./shared/data.js').ZONES.length) { console.log('옛 지도의 방이라 건너뜁니다:', d.name); continue; }
    for (const c of Object.values(d.world.chars)) c.online = false;
    rooms.set(d.name, { name: d.name, world: new World(d.world), auth: d.auth, gm: d.gm, bots: d.bots, clients: new Set() });
  } catch (e) { console.error('저장 파일을 읽지 못했습니다:', f, e.message); }
}
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const push = (room, cl) => send(cl.ws, { t: 'view', v: room.world.view(cl.id), gm: room.gm === cl.id });
const people = room => { const m = { t: 'people', list: room.world.people() }; for (const cl of room.clients) send(cl.ws, m); };

let last = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(5, (now - last) / 1000); last = now;
  for (const room of rooms.values()) { try { room.world.advance(dt); for (const cl of room.clients) push(room, cl); } catch (e) { console.error('방 오류:', room.name, e); } }
}, 1000);
setInterval(() => { for (const room of rooms.values()) if (room.world.s.started) save(room); }, 20000);

new WebSocketServer({ server, maxPayload: 100000 }).on('connection', ws => {
  let room = null, cl = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join' && !room) {
      const rn = String(m.room || '').trim().slice(0, 16) || '광장', def = cleanChar(m.char), pw = String(m.pw || '');
      if (pw.length < 4) return send(ws, { t: 'err', m: '비밀번호는 4자 이상이어야 합니다 (재접속할 때 씁니다)' });
      let r = rooms.get(rn), fresh = false;
      if (!r) { r = { name: rn, world: World.create({ tempo: m.tempo }), auth: {}, gm: 0, bots: Math.max(0, Math.min(20, m.bots | 0)), clients: new Set() }; fresh = true; }
      const a = r.auth[def.name]; let id;
      if (a) {
        if (!crypto.timingSafeEqual(Buffer.from(hashPw(pw, a.salt)), Buffer.from(a.hash))) return send(ws, { t: 'err', m: '이 방에 같은 이름의 캐릭터가 있고, 비밀번호가 다릅니다' });
        id = a.id;
      } else {
        const w = r.world.s;
        if (w.over) return send(ws, { t: 'err', m: '이 판은 끝났습니다. 방장이 새 판을 열어야 합니다' });
        if (w.started && w.phase >= 2) return send(ws, { t: 'err', m: '이미 한참 진행된 판이라 새로 들어갈 수 없습니다' });
        if (r.world.list.length >= 40) return send(ws, { t: 'err', m: '방이 가득 찼습니다' });
        id = r.world.addChar(def, false).id;
        const salt = crypto.randomBytes(8).toString('hex'); r.auth[def.name] = { salt, hash: hashPw(pw, salt), id };
        if (!r.gm) r.gm = id;
      }
      if (fresh) rooms.set(rn, r);
      room = r; cl = { ws, id }; room.clients.add(cl);
      const c = room.world.s.chars[id]; c.online = true; c.seenAt = room.world.s.t;
      send(ws, { t: 'ok', id, room: rn }); people(room); push(room, cl); save(room);
      return;
    }
    if (!room) return;
    const w = room.world;
    if (m.t === 'cmd') { const e = w.cmd(cl.id, m.c); if (e) send(ws, { t: 'toast', m: e }); push(room, cl); }
    else if (m.t === 'gm') { if (room.gm !== cl.id) return send(ws, { t: 'toast', m: '방장만 쓸 수 있습니다' }); const e = w.gm(m.c); if (e) send(ws, { t: 'toast', m: e }); save(room); for (const k of room.clients) push(room, k); }
    else if (m.t === 'start' && room.gm === cl.id && !w.s.started) { w.addBots(room.bots); w.start(); people(room); save(room); }
    else if (m.t === 'reset' && room.gm === cl.id && w.s.over) {
      const old = w.s.chars, nw = World.create({ tempo: w.s.tempo }), map = {};
      for (const a of Object.values(room.auth)) { const o = old[a.id]; map[a.id] = nw.addChar({ ...o, weapon: o.wc }, false).id; a.id = map[a.id]; }
      room.gm = map[room.gm]; room.world = nw;
      for (const k of room.clients) { k.id = map[k.id]; nw.s.chars[k.id].online = true; send(k.ws, { t: 'ok', id: k.id, room: room.name }); }
      people(room); save(room);
    }
  });
  ws.on('close', () => {
    if (!room) return; room.clients.delete(cl);
    const c = room.world.s.chars[cl.id];
    if (c && ![...room.clients].some(k => k.id === cl.id)) c.online = false;
  });
});
server.listen(PORT, () => console.log(`서버: http://localhost:${PORT}`));
