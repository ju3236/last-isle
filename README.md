# 최후의 섬

구역이 차례로 닫히는 섬에서 탐색하고, 만들고, 숨고, 마주치면 먼저 치는 텍스트 배틀로얄 웹게임.

- 오프라인: `dist/last-isle.html` 하나만 브라우저로 열면 AI 생존자들과 플레이
- 온라인: `npm install` 후 `node server.js 8080`, 같은 방 이름으로 접속

## 구조
- `shared/data.js` 아이템·제작법·구역·탐험지·야생동물 데이터
- `shared/world.js` 게임 규칙 (서버와 브라우저가 같이 씀)
- `public/` 화면 (index.html, client.js)
- `server.js` 온라인 서버 (방 저장: `data/`)
- `build.js` 오프라인 단일 파일 만들기 → `dist/last-isle.html`
