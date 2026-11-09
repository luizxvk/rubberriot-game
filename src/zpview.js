// Bloco de Zions Points da tela de fim (04/11): pede o deposito uma vez por partida, sobe o numero e mostra o saldo novo.
import { t } from './i18n.js';
import { claimZions, loadShop } from './rovex.js';
import { pieceEndHtml, pieceEndShot } from './bmview.js';
import { audio } from './audio.js';

const COIN = import.meta.env.BASE_URL + 'brand/zion-points.png';
const fmt = (n) => Number(n || 0).toLocaleString(document.documentElement.lang || 'pt-BR');

export async function renderEndZp(L) {
  const box = document.getElementById('endZp'); if (!box || L.zpSent) return;
  L.zpSent = true;
  box.hidden = false; box.className = 'end-zp';
  box.innerHTML = `<img src="${COIN}" alt="" aria-hidden="true"><small>${t('zp_title')}</small><b class="zp-n">+0</b><ul class="zp-list"></ul><em role="status">${t('zp_sending')}</em>`;
  const r = await claimZions(!!L.won, L.zp || []);
  if (!box.isConnected || box.hidden) return;
  const num = box.querySelector('.zp-n'), msg = box.querySelector('em');
  if (r.code) { box.classList.add('off'); num.textContent = ''; msg.textContent = t(r.code === 'login' ? 'zp_login' : 'zp_err'); return; }
  box.querySelector('.zp-list').innerHTML = r.lines.map(l => `<li><span>${t('zp_' + l.k)}</span><span>+${fmt(l.n)}</span></li>`).join('');
  if (r.peca) { box.insertAdjacentHTML('beforeend', pieceEndHtml(r.peca)); pieceEndShot(box); audio.play(r.peca.completa ? 'fanfare' : 'unlock', { ui: true, vol: 0.8, jitter: 0 }); if (r.peca.completa) loadShop(); } // Mercado Negro (08/11): peca sorteada pelo servidor
  msg.textContent = r.total ? t('zp_done', { n: fmt(r.zionsPoints) }) + (r.capped ? ' ' + t('zp_capped') : '') : t(r.capped ? 'zp_capped' : 'zp_none');
  if (!r.total) { if (!r.peca) box.classList.add('off'); return; }
  audio.play('unlock', { ui: true, vol: 0.5, jitter: 0 });
  const t0 = performance.now(), dur = 900;
  const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3; num.textContent = '+' + fmt(Math.round(r.total * e)); if (k < 1 && box.isConnected) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
