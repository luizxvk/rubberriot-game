// Gera modelo 3D pela API do Tripo (03/11, pedido dele). Linha P = pouca face e malha limpa (feita pra jogo).
// A chave fica em ../.env.api-keys como TRIPO_API_KEY=... (criar em https://developers.tripo3d.ai/en/keys).
// Uso:
//   node scripts/tripo.mjs text "<descricao>" public/models/src/cofre.glb [--faces 3000] [--sem-textura] [--quad]
//   node scripts/tripo.mjs image referencia.png public/models/src/van.glb [--faces 3000]
// Salva o .glb e uma previa .png do lado. O link do Tripo vence em 5 min: baixa na hora.
// Depois de gerar, o jogo troca o material pelo de desenho (toon + contorno), igual as armas.
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://openapi.tripo3d.ai/v3';
const envTxt = fs.existsSync(path.resolve('../.env.api-keys')) ? fs.readFileSync(path.resolve('../.env.api-keys'), 'utf8') : '';
const KEY = process.env.TRIPO_API_KEY || (envTxt.match(/TRIPO_API_KEY\s*=\s*"?([^"\r\n]+)/) || [])[1];
if (!KEY) { console.error('sem TRIPO_API_KEY (crie em https://developers.tripo3d.ai/en/keys e ponha no .env.api-keys)'); process.exit(1); }

const [mode, input, out, ...rest] = process.argv.slice(2);
if (!['text', 'image'].includes(mode) || !input || !out) { console.error('uso: node scripts/tripo.mjs text|image <descricao|imagem.png> <saida.glb> [--faces N] [--sem-textura] [--quad]'); process.exit(1); }
const flag = (f) => rest.includes(f), opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
const H = { Authorization: `Bearer ${KEY}` };

async function call(url, init) {
  const r = await fetch(API + url, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.code !== 0) throw new Error(`${r.status} ${url}: ${JSON.stringify(j).slice(0, 300)}`);
  return j.data;
}

// estilo do jogo: desenho dos anos 30, formas gordas, cor chapada (o jogo pinta por cima, entao o formato e o que importa)
const STYLE = ', 1930s rubber hose cartoon style, chunky rounded exaggerated shapes, flat solid colors, clean simple low poly game asset, no text';
const body = { model: flag('--quad') ? 'P2-20260801' : 'P1-20260311', face_limit: Number(opt('--faces') || 3000), texture: !flag('--sem-textura'), pbr: false };
if (flag('--quad')) body.quad = true;

let task;
if (mode === 'text') {
  task = await call('/generation/text-to-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, prompt: (input + STYLE).slice(0, 1024), negative_prompt: 'realistic, photo, high detail noise, thin spikes, text, logo' }) });
} else {
  const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(input)]), path.basename(input));
  const up = await call('/files', { method: 'POST', body: fd });
  task = await call('/generation/image-to-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, input: up.file_token }) });
}
console.log('tarefa', task.task_id);

let d;
for (;;) {
  await new Promise(r => setTimeout(r, 2500)); // doc: no maximo 1 consulta por segundo
  d = await call('/tasks/' + task.task_id);
  process.stdout.write(`\r${d.status} ${d.progress ?? 0}%   `);
  if (d.status === 'success') break;
  if (['failed', 'cancelled', 'banned', 'expired'].includes(d.status)) { console.error('\nfalhou:', d.status); process.exit(1); }
}
console.log();
const o = d.output || {};
fs.mkdirSync(path.dirname(out), { recursive: true });
const save = async (url, file) => { const r = await fetch(url); fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); console.log('salvo', file); };
if (o.model_url) await save(o.model_url, out); else { console.error('sem model_url:', JSON.stringify(o).slice(0, 300)); process.exit(1); }
if (o.rendered_image_url) await save(o.rendered_image_url, out.replace(/\.glb$/i, '.png'));
