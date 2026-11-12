import fs from 'node:fs';
const src = fs.readFileSync('src/engine.js', 'utf8');
const names = [...src.matchAll(/^export (?:const|function\*?|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
const body = src.replace(/^export /gm, '');
const iife = `window.BalatroEngine = (function(){\n${body}\nreturn { ${names.join(', ')} };\n})();`;
const ui = fs.readFileSync('src/ui.html', 'utf8');
fs.mkdirSync('dist', { recursive: true });
const out = ui.replace('/*__ENGINE__*/', () => iife);
fs.writeFileSync('dist/index.html', out);
// Bản cho Android: trang đầy đủ với <html>/<head> vì WebView không bọc skeleton
const full = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>${out}</body></html>`;
fs.mkdirSync('android/app/src/main/assets', { recursive: true });
fs.writeFileSync('android/app/src/main/assets/index.html', full);
console.log('built', names.length, 'exports', (out.length/1024).toFixed(1)+'KB');
