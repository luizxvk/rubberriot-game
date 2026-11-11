// Copia a build (dist/) para a Rovex: template-magazine/client/public/rubber-riot-game/.
// Uso: npm run rovex  (builda e copia). Publicar a Rovex continua sendo o deploy dela.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const src = resolve(process.env.RR_DIST || 'dist'); // RR_DIST: build em outra pasta
const dst = resolve('../template-magazine/client/public/rubber-riot-game');
if (!existsSync(src)) { console.error('sem dist/: rode vite build'); process.exit(1); }
rmSync(dst, { recursive: true, force: true });
// 07/11: modelos crus do TastyTony (models/src/tt, so a fonte do preparo no Blender; o jogo carrega o tt_ready) e os sons
// de teste (sfx/opcoes) nao vao pra Rovex
const SKIP = [/[\\/]models[\\/]src[\\/]tt([\\/]|$)/, /[\\/]sfx[\\/]opcoes([\\/]|$)/, /[\\/]_headers$/]; // _headers e so do site proprio (11/11); separador do Windows (\) e do resto (/)
cpSync(src, dst, { recursive: true, filter: (f) => !SKIP.some(r => r.test(f)) });
console.log('copiado para', dst);
