// base relativa: na Rovex o jogo mora em /rubber-riot-game/
// versao do jogo (package.json) entra no build como __APP_VERSION__ e aparece so no lobby
import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default { base: './', define: { __APP_VERSION__: JSON.stringify(version) } };
