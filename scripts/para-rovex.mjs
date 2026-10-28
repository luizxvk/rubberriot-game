// Copia a build (dist/) para a Rovex: template-magazine/client/public/rubber-riot-game/.
// Uso: npm run rovex  (builda e copia). Publicar a Rovex continua sendo o deploy dela.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const src = resolve('dist');
const dst = resolve('../template-magazine/client/public/rubber-riot-game');
if (!existsSync(src)) { console.error('sem dist/: rode vite build'); process.exit(1); }
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
console.log('copiado para', dst);
