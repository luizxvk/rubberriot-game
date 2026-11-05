// Tiros silenciados (05/11, pedido dele): 5 opcoes por categoria pelo ElevenLabs, numa pasta de escolha (fora do jogo) com uma pagina pra ouvir.
// Uso: node scripts/gen-silenced.mjs   (rodar dentro de tinta-louca). Pula o que ja existe. Saida: escolha-silenciador/
import fs from 'node:fs';
import path from 'node:path';
const envTxt = fs.readFileSync(path.resolve('../.env.api-keys'), 'utf8');
const KEY = (envTxt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/) || [])[1];
if (!KEY) { console.error('sem ELEVENLABS_API_KEY'); process.exit(1); }
const OUT = path.resolve('escolha-silenciador'); fs.mkdirSync(OUT, { recursive: true });
const TAIL = 'single shot only, close mic, dry, short tail, no music, no voice';
const CAT = {
  pistol: ['Pistola', [
    'suppressed pistol shot, soft muffled thwip pop with a light metallic slide clack',
    'cartoon silenced pistol, quick soft pfft like a cork popping, comedic 1930s',
    'realistic suppressed 9mm pistol, subsonic muted thud with crisp slide cycling',
    'silenced pistol cartoon shot, airy whispery fwip with tiny spring ping',
    'suppressed handgun, deep muffled thump with a short mechanical clack, heavy',
  ]],
  smg: ['Submetralhadora', [
    'suppressed submachine gun single shot, fast muffled tap with bolt clatter',
    'cartoon silenced smg single round, soft typewriter like tick pop, comedic 1930s',
    'realistic suppressed MP5 single shot, muted snap with metallic bolt rattle',
    'silenced smg shot, light puffy fft with a small spring chirp, cartoon',
    'suppressed compact smg, punchy dull thud with sharp mechanical click',
  ]],
  rifle: ['Fuzil', [
    'suppressed assault rifle single shot, muffled crack with heavy bolt clack, punchy',
    'cartoon silenced rifle single round, soft thoomp like a drum hit with spring twang, comedic 1930s',
    'realistic suppressed 5.56 rifle shot, sharp suppressed snap and metallic action noise',
    'silenced rifle cartoon shot, compressed air pshht with a woody knock',
    'suppressed battle rifle, deep heavy muffled boom with mechanical clunk',
  ]],
  sniper: ['Sniper', [
    'suppressed sniper rifle single shot, heavy deep muffled boom with a long soft tail, powerful',
    'cartoon silenced sniper shot, big soft THWOMP like a pillow punch with a bolt boing, comedic 1930s',
    'realistic suppressed .308 bolt action rifle shot, muted thunderous crack then bolt cycling',
    'silenced sniper cartoon shot, long whistling fssshht with a woody thunk',
    'suppressed heavy sniper, low bass thump with a distant supersonic snap',
  ]],
  lmg: ['Metralhadora', [
    'suppressed light machine gun single shot, chunky muffled thud with belt link rattle',
    'cartoon silenced machine gun single round, soft tom drum pop with chain jingle, comedic 1930s',
    'realistic suppressed LMG single shot, muted heavy snap and metallic feed clank',
    'silenced machine gun cartoon shot, puffy pfoom with a springy metal clatter',
    'suppressed heavy machine gun, deep dull boom with rattling ammo belt',
  ]],
};
const all = [];
for (const [cat, [, list]] of Object.entries(CAT)) list.forEach((txt, i) => all.push([cat, i + 1, `${txt}, ${TAIL}`]));
for (const [cat, n, text] of all) {
  const out = path.join(OUT, `sil_${cat}_${n}.mp3`);
  if (fs.existsSync(out)) continue;
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, duration_seconds: cat === 'sniper' ? 1.2 : 0.7, prompt_influence: 0.6 }),
  });
  if (!r.ok) { console.error('falhou', cat, n, r.status, (await r.text()).slice(0, 200)); continue; }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); console.log('ok', cat, n);
}
// pagina de escolha: clicar toca; marcar a favorita de cada arma; o resumo sai pronto pra copiar
const rows = Object.entries(CAT).map(([cat, [nome, list]]) => `<section><h2>${nome}</h2><div class="opts">${list.map((txt, i) => `<label class="op"><input type="radio" name="${cat}" value="${i + 1}"><button type="button" data-src="sil_${cat}_${i + 1}.mp3" aria-label="Tocar ${nome} ${i + 1}">&#9654;</button><b>${i + 1}</b><small>${txt}</small></label>`).join('')}</div></section>`).join('');
fs.writeFileSync(path.join(OUT, 'index.html'), `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rubber Riot: escolha do tiro silenciado</title>
<style>body{margin:0;padding:24px;background:#ece9e1;color:#141210;font:600 15px/1.4 system-ui,sans-serif}h1{margin:0 0 4px;font-size:30px}p{margin:0 0 18px;color:#5a554d}section{margin:0 0 18px;padding:14px;border:3px solid #141210;border-radius:16px;background:#fff;box-shadow:4px 4px 0 #141210}h2{margin:0 0 10px;font-size:20px}.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}.op{display:grid;grid-template-columns:auto auto 1fr;grid-template-rows:auto auto;align-items:center;gap:2px 8px;padding:8px;border:2px solid #141210;border-radius:12px;cursor:pointer}.op:has(input:checked){background:#141210;color:#ece9e1}.op input{grid-row:1/3}.op button{width:38px;height:38px;border-radius:50%;border:2px solid #141210;background:#d8453a;color:#fff;font-size:15px;cursor:pointer}.op b{font-size:18px}.op small{grid-column:2/4;font-weight:500;font-size:12px}#out{position:sticky;bottom:0;display:flex;gap:10px;align-items:center;padding:12px;border:3px solid #141210;border-radius:14px;background:#ffd36b}#out code{flex:1;font-size:16px}#out button{padding:8px 14px;border:2px solid #141210;border-radius:10px;background:#141210;color:#ece9e1;font-weight:800;cursor:pointer}</style></head>
<body><h1>Tiro silenciado</h1><p>Toque o botão vermelho pra ouvir e marque o favorito de cada arma. Depois copie o resumo e mande no chat.</p>${rows}
<div id="out"><code id="res">Nada marcado ainda</code><button id="cp">Copiar</button></div>
<script>const a=new Audio();document.querySelectorAll('[data-src]').forEach(b=>b.onclick=e=>{e.preventDefault();a.src=b.dataset.src;a.currentTime=0;a.play();});
const names=${JSON.stringify(Object.fromEntries(Object.entries(CAT).map(([k, [n]]) => [k, n])))};const upd=()=>{const s=Object.keys(names).map(k=>{const c=document.querySelector('input[name='+k+']:checked');return c?names[k]+' '+c.value:null}).filter(Boolean);document.getElementById('res').textContent=s.length?'Silenciador: '+s.join(', '):'Nada marcado ainda';};
document.addEventListener('change',upd);document.getElementById('cp').onclick=()=>navigator.clipboard.writeText(document.getElementById('res').textContent);</script></body></html>`);
console.log('pagina', path.join(OUT, 'index.html'));
