// 오프라인 전용 단일 HTML 파일 생성: node build.js  →  dist/last-isle.html
const fs = require('fs'), path = require('path');
let html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8')
  .replace(/<!doctype html>\n/i, '').replace(/<meta charset[^>]*>\n/, '').replace(/<meta name="viewport"[^>]*>\n/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const f = src.startsWith('/shared/') ? path.join(__dirname, src) : path.join(__dirname, 'public', src);
  return '<script>\n' + fs.readFileSync(f, 'utf8') + '</script>';
}).replace('<script>', '<script>window.OFFLINE_ONLY = true;</script>\n<script>');
html = html.replace(/url\(\/fonts\/([\w.-]+)\)/g, (_, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, 'node_modules/galmuri/dist', f)).toString('base64') + ')');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/last-isle.html'), html);
console.log('dist/last-isle.html', html.length, 'bytes');
