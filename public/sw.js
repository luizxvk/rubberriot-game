// Service worker minimo: so existe pra o Android oferecer "instalar app" (tela cheia).
// Nao guarda cache: o jogo sempre vem da rede.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
