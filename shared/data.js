// 게임 데이터: 아이템, 제작법, 구역 그래프, 탐험지, 야생동물, 문구
(function (X) {
  'use strict';
  // g: 등급 0 일반 · 1 고급 · 2 희귀 · 3 영웅
  const M = (n, e) => ({ n, e, t: 'mat', g: 0 });
  const ITEMS = {
    // 기본 재료 (섬에서 줍는다)
    scrap: M('고철', '⚙️'), nail: M('못', '📌'), chain: M('쇠사슬', '⛓️'), leather: M('가죽', '🟫'), cloth: M('옷감', '🧵'),
    thread: M('실', '🪡'), rubber: M('고무', '🛞'), plastic: M('플라스틱', '🧴'), bottle: M('유리병', '🍾'), battery: M('배터리', '🔋'),
    wire: M('전선', '🔌'), oil: M('오일', '🛢️'), lighter: M('라이터', '🔥'), gunpowder: M('화약', '🧨'), paper: M('종이', '📄'),
    pencil: M('연필', '✏️'), bandage: M('붕대', '🩹'), herb: M('약초', '🌿'), water: M('샘물', '💧'), feather: M('깃털', '🪶'),
    branch: M('나뭇가지', '🪵'), stone: M('돌멩이', '🪨'), gem: M('원석', '💎'), ice: M('얼음', '🧊'), chem: M('화학약품', '⚗️'),
    lens: M('렌즈', '🔍'), fish: M('생선', '🐟'), meat: M('생고기', '🥩'),
    // 중간 재료 (만든다)
    plate: { n: '철판', e: '🔩', t: 'mat', g: 1 }, strap: { n: '가죽끈', e: '🎗️', t: 'mat', g: 1 }, weave: { n: '질긴 천', e: '🧶', t: 'mat', g: 1 },
    motor: { n: '소형 모터', e: '🔧', t: 'mat', g: 1 }, scope: { n: '조준경', e: '🔭', t: 'mat', g: 1 }, bomb: { n: '폭약 꾸러미', e: '💣', t: 'mat', g: 1 },
    crystal: { n: '다듬은 원석', e: '💠', t: 'mat', g: 1 }, salve: { n: '약초 연고', e: '🫙', t: 'mat', g: 1 },
    // 음식
    berry: { n: '산열매', e: '🍒', t: 'food', g: 0, hun: 12, hp: 3 }, bread: { n: '빵', e: '🍞', t: 'food', g: 0, hun: 25 },
    choco: { n: '초콜릿', e: '🍫', t: 'food', g: 0, hun: 10, en: 20 }, ramen: { n: '컵라면', e: '🍜', t: 'food', g: 0, hun: 35 },
    juice: { n: '열매 주스', e: '🧃', t: 'food', g: 1, hun: 20, en: 25 }, jam_bread: { n: '잼빵', e: '🥐', t: 'food', g: 1, hun: 40, hp: 10 },
    hot_choco: { n: '핫초코', e: '☕', t: 'food', g: 1, hun: 10, en: 50 }, grilled_fish: { n: '생선구이', e: '🍢', t: 'food', g: 1, hun: 35, hp: 15 },
    steak: { n: '스테이크', e: '🍖', t: 'food', g: 1, hun: 55, hp: 25 },
    // 회복·물약
    kit: { n: '구급상자', e: '🧰', t: 'potion', g: 1, hp: 80 }, heal_potion: { n: '회복 물약', e: '🧪', t: 'potion', g: 1, hp: 60 },
    aid_kit: { n: '응급 키트', e: '🩺', t: 'potion', g: 2, hp: 110 },
    power_potion: { n: '투지 물약', e: '💪', t: 'potion', g: 1, buff: 'atk', d: '한동안 공격력 +30%' },
    swift_potion: { n: '신속 물약', e: '💨', t: 'potion', g: 1, buff: 'agi', d: '한동안 민첩 +3' },
    // 무기 (계열 · 단계)
    sword1: { n: '녹슨 검', e: '🗡️', t: 'weapon', wc: 'sword', tier: 1, atk: 4 }, sword2: { n: '날 세운 검', e: '🗡️', t: 'weapon', wc: 'sword', tier: 2, atk: 10 },
    sword3: { n: '강철 장검', e: '🗡️', t: 'weapon', wc: 'sword', tier: 3, atk: 17 }, sword4: { n: '뇌명검', e: '🗡️', t: 'weapon', wc: 'sword', tier: 4, atk: 26 },
    spear1: { n: '대나무 창', e: '🔱', t: 'weapon', wc: 'spear', tier: 1, atk: 4 }, spear2: { n: '철촉 창', e: '🔱', t: 'weapon', wc: 'spear', tier: 2, atk: 10 },
    spear3: { n: '갈고리 창', e: '🔱', t: 'weapon', wc: 'spear', tier: 3, atk: 17 }, spear4: { n: '용아창', e: '🔱', t: 'weapon', wc: 'spear', tier: 4, atk: 26 },
    bow1: { n: '사냥활', e: '🏹', t: 'weapon', wc: 'bow', tier: 1, atk: 4 }, bow2: { n: '합성궁', e: '🏹', t: 'weapon', wc: 'bow', tier: 2, atk: 10 },
    bow3: { n: '저격궁', e: '🏹', t: 'weapon', wc: 'bow', tier: 3, atk: 17 }, bow4: { n: '뇌전궁', e: '🏹', t: 'weapon', wc: 'bow', tier: 4, atk: 26 },
    // 방어구: 옷 · 머리 · 팔 · 다리
    armor1: { n: '셔츠', e: '👕', t: 'armor', tier: 1, def: 6 }, armor2: { n: '누빔 조끼', e: '🦺', t: 'armor', tier: 2, def: 16 },
    armor3: { n: '가죽 갑옷', e: '🧥', t: 'armor', tier: 3, def: 28 }, armor4: { n: '판금 흉갑', e: '🛡️', t: 'armor', tier: 4, def: 42 },
    head1: { n: '모자', e: '🧢', t: 'head', tier: 1, def: 3 }, head2: { n: '자전거 헬멧', e: '⛑️', t: 'head', tier: 2, def: 8, luk: 1 },
    head3: { n: '전술 헬멧', e: '🪖', t: 'head', tier: 3, def: 14, luk: 2 },
    arm1: { n: '팔찌', e: '📿', t: 'arm', tier: 1, atk: 2, def: 2 }, arm2: { n: '가죽 토시', e: '🧤', t: 'arm', tier: 2, atk: 5, def: 5 },
    arm3: { n: '강철 건틀릿', e: '🦾', t: 'arm', tier: 3, atk: 9, def: 9 },
    boots1: { n: '슬리퍼', e: '🩴', t: 'boots', tier: 1, agi: 1, def: 2 }, boots2: { n: '운동화', e: '👟', t: 'boots', tier: 2, agi: 2, def: 4 },
    boots3: { n: '질풍 장화', e: '👢', t: 'boots', tier: 3, agi: 3, def: 6 },
  };
  for (const k in ITEMS) {
    const it = ITEMS[k]; it.id = k; if (it.tier) it.g = it.tier - 1;
    if (!it.d && (it.t === 'food' || it.t === 'potion')) it.d = [it.hun && `허기 +${it.hun}`, it.hp && `체력 +${it.hp}`, it.en && `스태미너 +${it.en}`].filter(Boolean).join(' · ');
  }
  const R = (out, cat, inp) => ({ out, cat, in: inp });
  const RECIPES = [
    R('sword2', '무기', { sword1: 1, plate: 1 }), R('sword3', '무기', { sword2: 1, strap: 1, gem: 1 }), R('sword4', '무기', { sword3: 1, motor: 1, crystal: 1 }),
    R('spear2', '무기', { spear1: 1, plate: 1 }), R('spear3', '무기', { spear2: 1, chain: 1, strap: 1 }), R('spear4', '무기', { spear3: 1, crystal: 1, weave: 1 }),
    R('bow2', '무기', { bow1: 1, feather: 1, strap: 1 }), R('bow3', '무기', { bow2: 1, scope: 1 }), R('bow4', '무기', { bow3: 1, motor: 1, crystal: 1 }),
    R('armor2', '방어구', { armor1: 1, weave: 1 }), R('armor3', '방어구', { armor2: 1, strap: 1, leather: 1 }), R('armor4', '방어구', { armor3: 1, plate: 1, crystal: 1 }),
    R('head2', '방어구', { head1: 1, plastic: 1, rubber: 1 }), R('head3', '방어구', { head2: 1, plate: 1, lens: 1 }),
    R('arm2', '방어구', { arm1: 1, strap: 1 }), R('arm3', '방어구', { arm2: 1, plate: 1, chain: 1 }),
    R('boots2', '방어구', { boots1: 1, rubber: 1, cloth: 1 }), R('boots3', '방어구', { boots2: 1, weave: 1, feather: 1 }),
    R('plate', '중간 재료', { scrap: 2, nail: 1 }), R('strap', '중간 재료', { leather: 1, thread: 1 }), R('weave', '중간 재료', { cloth: 1, thread: 1 }),
    R('motor', '중간 재료', { battery: 1, wire: 1 }), R('scope', '중간 재료', { lens: 1, plastic: 1 }), R('bomb', '중간 재료', { gunpowder: 1, paper: 1 }),
    R('crystal', '중간 재료', { gem: 1, chem: 1 }), R('salve', '중간 재료', { herb: 1, bottle: 1 }),
    R('heal_potion', '물약', { herb: 1, water: 1 }), R('aid_kit', '물약', { bandage: 1, salve: 1 }),
    R('power_potion', '물약', { chem: 1, berry: 1 }), R('swift_potion', '물약', { chem: 1, choco: 1 }),
    R('steak', '음식', { meat: 1, lighter: 1 }), R('grilled_fish', '음식', { fish: 1, branch: 1 }), R('juice', '음식', { berry: 1, water: 1 }),
    R('jam_bread', '음식', { bread: 1, berry: 1 }), R('hot_choco', '음식', { choco: 1, water: 1 }),
  ];
  const BASE_COST = { branch: 2, stone: 1, cloth: 1 };
  const WEAPONS = {
    sword: { n: '검', d: '선제공격 때 35% 확률로 한 번 더 벤다 · 맞을 때 20% 흘려냄' },
    spear: { n: '창', d: '한 방이 세다 · 25% 확률로 찌르기(1.6배)' },
    bow: { n: '활', d: '선제공격 첫 화살이 1.6배' },
  };
  // 섬: 중앙 1 + 안쪽 고리 7 + 바깥 고리 13
  const ZD = [
    ['관제소', '섬 한가운데의 낮은 콘크리트 건물. 꺼진 모니터가 벽 한 면을 채우고 있다.', { gem: 2, chem: 2, battery: 2, lens: 1, crate: 3 }, 0],
    ['전통시장', '천막 지붕이 반쯤 내려앉은 시장 골목. 좌판마다 쓸 만한 잡동사니가 남아 있다.', { cloth: 3, bread: 2, thread: 2, bottle: 1, crate: 1 }, 0],
    ['아파트', '복도식 아파트 다섯 동. 현관문 몇 개는 아직 열려 있다.', { cloth: 2, plastic: 2, paper: 2, choco: 1, armor1: 1 }, 0],
    ['골목', '좁은 골목이 거미줄처럼 얽혀 있다. 모퉁이마다 누가 숨어 있어도 이상하지 않다.', { lighter: 3, wire: 2, nail: 2, ramen: 1 }, 0],
    ['초등학교', '운동장에 체육 기구가 쓰러져 있다. 과학실 문이 열려 있다.', { paper: 3, pencil: 3, chem: 2, rubber: 1 }, 0],
    ['보건소', '약품 냄새가 아직 가시지 않았다. 진료실 서랍이 하나씩 열려 있다.', { bandage: 4, herb: 2, bottle: 2, kit: 1 }, 0],
    ['파출소', '책상 위에 서류가 흩어져 있다. 보관함 자물쇠는 누가 이미 부숴 놓았다.', { chain: 3, gunpowder: 2, lens: 2, head1: 1 }, 0],
    ['백화점', '셔터가 반쯤 올라간 백화점. 매대 사이로 바람이 지난다.', { cloth: 3, thread: 2, choco: 2, boots1: 1, arm1: 1 }, 0],
    ['등대', '불 꺼진 등대 아래로 파도가 부서진다. 갯바위에 낚싯대 하나가 꽂혀 있다.', { fish: 4, lens: 2, stone: 2, oil: 1 }, 0],
    ['부두', '녹슨 크레인 아래 컨테이너가 층층이 쌓여 있다. 바닷바람에 쇳내가 섞인다.', { scrap: 3, chain: 2, rubber: 2, oil: 2 }, 0],
    ['수산시장', '좌판은 비었지만 비린내는 남았다. 수조 몇 개에는 아직 물이 차 있다.', { fish: 4, ice: 3, bottle: 1, meat: 1 }, 0],
    ['해수욕장', '파라솔 몇 개가 모래에 처박혀 있다. 매점 문은 판자로 막혀 있다.', { stone: 3, plastic: 2, rubber: 2, ramen: 1 }, 1],
    ['캠핑장', '버려진 텐트와 꺼진 모닥불 자리. 아이스박스 하나가 그대로 있다.', { branch: 3, lighter: 2, oil: 1, meat: 1, ramen: 1 }, 0],
    ['갈대밭', '어깨까지 오는 갈대가 바람에 눕는다. 발밑이 질척거린다.', { herb: 3, feather: 3, water: 2, berry: 1 }, 3],
    ['대나무숲', '대나무가 서로 부딪히는 소리가 끊이지 않는다. 누가 다가와도 알기 어렵다.', { branch: 4, herb: 2, berry: 2, spear1: 1 }, 0],
    ['산사', '이끼 낀 돌계단 위의 작은 절. 약수터 물이 아직 흐른다.', { water: 3, herb: 2, gem: 2, bread: 1 }, 1],
    ['저수지', '수면이 거울처럼 잔잔하다. 둑 위 관리동 창문이 깨져 있다.', { water: 4, fish: 2, herb: 1, ice: 1 }, 5],
    ['폐공장', '라인이 멈춘 공장. 바닥에 기름 자국과 공구가 흩어져 있다.', { scrap: 4, nail: 3, oil: 2, plate: 0 }, 0],
    ['발전소', '변압기가 웅웅거린다. 전기가 아직 조금은 살아 있는 모양이다.', { battery: 3, wire: 3, scrap: 2, chem: 1 }, 1],
    ['고물상', '고철 더미가 산처럼 쌓여 있다. 뒤지면 뭐든 나올 것 같다.', { scrap: 3, battery: 2, chain: 2, nail: 2 }, 0],
    ['터미널', '시간표가 멈춘 버스 터미널. 대합실 의자 밑에 누군가의 짐이 있다.', { paper: 2, choco: 2, bread: 2, rubber: 1, boots1: 1 }, 0],
  ];
  const isle = (x, y) => { const dx = x - 300, dy = y - 262, a = Math.atan2(dy, dx), rx = 272 + 12 * Math.sin(3 * a + 1) + 8 * Math.sin(5 * a), ry = 240 + 10 * Math.sin(4 * a + 2) + 6 * Math.sin(7 * a); return dx * dx / (rx * rx) + dy * dy / (ry * ry); };
  const ZONES = ZD.map((z, i) => {
    let x = 300, y = 262;
    if (i >= 1 && i <= 7) { const a = (i - 1) / 7 * 6.2832 - 1.2; x += Math.cos(a) * 118; y += Math.sin(a) * 104; }
    if (i >= 8) { const a = (i - 8) / 13 * 6.2832 - 1.5; x += Math.cos(a) * 222; y += Math.sin(a) * 196; }
    const res = {}; for (const k in z[2]) if (z[2][k] > 0) res[k] = z[2][k];
    return { n: z[0], d: z[1], res, pond: z[3], x: Math.round(x), y: Math.round(y), adj: [] };
  });
  // 이웃 구역: 섬 위 점을 훑어 두 구역의 경계가 맞닿는지 본다
  {
    const seen = new Set();
    for (let y = 0; y < 524; y += 3) for (let x = 0; x < 600; x += 3) {
      if (isle(x, y) > 0.97) continue;
      let a = -1, b = -1, da = 1e9, db = 1e9;
      ZONES.forEach((Z, i) => { const d = Math.hypot(Z.x - x, Z.y - y); if (d < da) { db = da; b = a; da = d; a = i; } else if (d < db) { db = d; b = i; } });
      if (db - da < 4) { const k = Math.min(a, b) + ',' + Math.max(a, b); if (!seen.has(k)) { seen.add(k); ZONES[a].adj.push(b); ZONES[b].adj.push(a); } }
    }
  }
  // 탐험지: 분류에 따라 나오는 물건이 다르다
  const CATS = {
    home: { n: '주거', c: '#b39ddb', res: { cloth: 3, thread: 2, bread: 2, choco: 1, plastic: 1, armor1: 1, crate: 1 } },
    shop: { n: '상업', c: '#e6c46a', res: { crate: 2, cloth: 2, choco: 2, ramen: 2, plastic: 1, boots1: 1, arm1: 1 } },
    med: { n: '의료', c: '#ef9a9a', res: { bandage: 4, herb: 2, bottle: 2, chem: 1, kit: 1 } },
    edu: { n: '교육', c: '#82b4e8', res: { paper: 3, pencil: 2, chem: 2, lens: 1, battery: 1, crate: 1 } },
    ind: { n: '공업', c: '#e3a166', res: { scrap: 4, nail: 3, oil: 2, wire: 1, chain: 1 } },
    power: { n: '전기', c: '#f2e27a', res: { battery: 3, wire: 3, scrap: 1, chem: 1 } },
    civic: { n: '치안', c: '#9fb3c8', res: { chain: 2, gunpowder: 2, lens: 1, head1: 1, crate: 2 } },
    nature: { n: '자연', c: '#8fcf8a', res: { branch: 3, herb: 2, berry: 3, feather: 1, stone: 1 } },
    water: { n: '수원', c: '#7fd6e0', res: { water: 5, herb: 1, fish: 1, ice: 1 } },
    port: { n: '항만', c: '#5ba8c4', res: { fish: 4, rubber: 2, oil: 1, chain: 1, ice: 1 } },
    ruin: { n: '유적', c: '#c4beb2', res: { stone: 3, gem: 2, scrap: 1, crate: 1 } },
  };
  const PD = [
    [['통제실', 'civic', 3], ['서버실', 'power', 3], ['연구 자료실', 'edu', 3], ['옥상 헬기장', 'ruin', 2]],
    [['떡집', 'shop', 1], ['포목점', 'home', 1], ['약재상', 'med', 2], ['시장 창고', 'shop', 2]],
    [['101동 복도', 'home', 1], ['관리사무소', 'edu', 2], ['지하 주차장', 'ind', 2], ['놀이터', 'nature', 1]],
    [['편의점', 'shop', 1], ['철물점', 'ind', 2], ['반지하 방', 'home', 1], ['막다른 길', 'ruin', 2]],
    [['교실', 'edu', 1], ['과학실', 'edu', 2], ['급식실', 'shop', 1], ['체육 창고', 'home', 2]],
    [['진료실', 'med', 1], ['약품 창고', 'med', 3], ['대기실', 'home', 1]],
    [['민원실', 'edu', 1], ['증거물 보관소', 'civic', 3], ['유치장', 'civic', 2]],
    [['의류 매장', 'home', 1], ['식품관', 'shop', 1], ['옥상 정원', 'nature', 2], ['물류 하역장', 'ind', 2]],
    [['등대', 'ruin', 3], ['갯바위 낚시터', 'port', 1], ['등대지기 숙소', 'home', 2]],
    [['컨테이너 야적장', 'ind', 2], ['선박 정비소', 'port', 2], ['세관 창고', 'civic', 3]],
    [['어물전 좌판', 'port', 1], ['얼음 창고', 'water', 2], ['경매장', 'shop', 3]],
    [['백사장', 'ruin', 1], ['매점', 'shop', 1], ['구조대 망루', 'civic', 2]],
    [['텐트촌', 'home', 1], ['관리동', 'edu', 1], ['숲길', 'nature', 2]],
    [['갈대 수로', 'water', 1], ['새 관찰대', 'nature', 2], ['양수장', 'power', 2]],
    [['대숲 오솔길', 'nature', 1], ['죽순 군락', 'nature', 1], ['숯가마', 'ind', 2]],
    [['대웅전', 'ruin', 2], ['약수터', 'water', 1], ['요사채', 'home', 1]],
    [['둑방길', 'nature', 1], ['수문 관리동', 'power', 2], ['낚시 좌대', 'water', 1]],
    [['조립 라인', 'ind', 1], ['보일러실', 'ind', 2], ['자재 창고', 'ind', 3]],
    [['변전소', 'power', 2], ['제어실', 'power', 3], ['냉각탑', 'ind', 2]],
    [['고철 더미', 'ind', 1], ['폐차장', 'ind', 2], ['사무실 컨테이너', 'home', 1]],
    [['대합실', 'home', 1], ['매표소', 'edu', 1], ['수하물 창고', 'shop', 2]],
  ];
  const PLACES = [];
  let seed = 20261115; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  PD.forEach((list, z) => {
    const Z = ZONES[z]; Z.places = [];
    list.forEach((d, i) => {
      let x = Z.x, y = Z.y;
      for (let t = 0; t < 80; t++) {
        const a = (i / list.length) * 6.2832 + rnd() * 1.2, r = 16 + rnd() * 24;
        x = Math.round(Z.x + Math.cos(a) * r); y = Math.round(Z.y + Math.sin(a) * r * 0.9);
        let near = z, bd = 1e9; ZONES.forEach((o, k) => { const dd = (o.x - x) ** 2 + (o.y - y) ** 2; if (dd < bd) { bd = dd; near = k; } });
        if (near === z && isle(x, y) < 0.9 && Math.abs(y - Z.y) > 12 && !PLACES.some(p => Math.abs(p.x - x) < 13 && Math.abs(p.y - y) < 13)) break;
      }
      Z.places.push(PLACES.length); PLACES.push({ id: PLACES.length, n: d[0], cat: d[1], diff: d[2], z, x, y });
    });
  });
  const CRATE = ['leather', 'leather', 'battery', 'wire', 'chem', 'gunpowder', 'gem', 'lens', 'chain', 'thread', 'kit', 'ramen', 'choco', 'bread', 'armor1', 'head1', 'arm1', 'boots1', 'heal_potion'];
  const MOBS = {
    chicken: { n: '들닭', e: '🐔', hp: 25, atk: 4, agi: 3, drops: ['meat', 'feather'], xp: 8 },
    boar: { n: '멧돼지', e: '🐗', hp: 70, atk: 11, agi: 1, drops: ['meat', 'leather'], xp: 15 },
    dog: { n: '들개', e: '🐕', hp: 45, atk: 10, agi: 4, drops: ['leather'], xp: 12 },
    wolf: { n: '늑대', e: '🐺', hp: 60, atk: 14, agi: 4, drops: ['leather', 'meat'], xp: 18 },
    bear: { n: '곰', e: '🐻', hp: 120, atk: 19, agi: 1, drops: ['leather', 'leather', 'meat'], xp: 32 },
  };
  const BOT_NAMES = ['하람', '도윤', '서린', '이든', '가온', '누리', '다온', '라온', '마루', '바다', '새벽', '아라', '은솔', '재하', '초롱', '한결', '보람', '슬기', '여울', '태오', '미르', '나래', '소담', '해솔'];
  const BOT_LINES = [
    { meet: '미안, 나도 살아야 해서.', kill: '…원망은 저승에서 들을게.', die: '여기까지인가.' },
    { meet: '찾았다.', kill: '다음.', die: '하, 방심했네.' },
    { meet: '저, 저리 가! 오지 마!', kill: '내가… 내가 한 거야?', die: '집에 가고 싶어…' },
    { meet: '운이 없었네, 너.', kill: '약한 쪽이 지는 거야.', die: '재밌었다.' },
    { meet: '조용히 끝내자.', kill: '편히 쉬어.', die: '…먼저 갈게.' },
  ];
  const COLORS = ['#c9584a', '#d9b44a', '#6fae7b', '#5fa3c4', '#9a82c9', '#c97fa4', '#cf8a4f', '#5fb3a6', '#aab85a', '#b9b6a8'];
  Object.assign(X, { isle, ITEMS, RECIPES, BASE_COST, WEAPONS, ZONES, CATS, PLACES, CRATE, MOBS, BOT_NAMES, BOT_LINES, COLORS });
})(typeof module !== 'undefined' ? module.exports : (self.GameData = {}));
