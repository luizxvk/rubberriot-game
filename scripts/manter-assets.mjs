// 08/11 (log de producao: "Failed to fetch dynamically imported module .../main-CAuyDMuh.js"): celular que restaura uma aba
// antiga roda o index velho e pede o main da build anterior, que sumiu no deploy (o Pages devolve o index.html no lugar).
// Roda logo depois do vite build: devolve pro dist/assets os arquivos da build ANTERIOR (nomes com hash, nao colidem) e
// guarda os desta build pra proxima vez. Fica sempre a build atual + a anterior no ar (site e Rovex).
import { readdirSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
const dist = resolve('dist/assets');
const keep = resolve('.assets-anteriores');
if (!existsSync(dist)) { console.error('sem dist/assets: rode vite build'); process.exit(1); }
const atuais = readdirSync(dist); // o vite limpa o dist: aqui so tem a build nova
let devolvidos = 0;
if (existsSync(keep)) for (const f of readdirSync(keep)) if (!atuais.includes(f)) { copyFileSync(join(keep, f), join(dist, f)); devolvidos++; }
rmSync(keep, { recursive: true, force: true });
mkdirSync(keep, { recursive: true });
for (const f of atuais) copyFileSync(join(dist, f), join(keep, f));
console.log(`assets: ${atuais.length} da build nova + ${devolvidos} da anterior`);
