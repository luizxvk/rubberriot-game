// Confere que toda sequencia, gadget e equipamento tem nome/descricao em PT e EN e icone (03/11, pedido dele:
// nunca mais aparecer "s_plane" cru na tela). Roda no `npm run check` e antes de dizer pronto.
import fs from 'node:fs';
import { STREAKS, FIELD, GADGETS, MODES, WSKINS } from '../shared/weapons.js';
globalThis.localStorage ??= { getItem: () => null, setItem() {} }; globalThis.navigator ??= { language: 'pt-BR' }; globalThis.document ??= { documentElement: {}, querySelectorAll: () => [] };
const { setLang, modeName, modeDesc } = await import('../src/i18n.js');
const i18n = fs.readFileSync('src/i18n.js', 'utf8'), hud = fs.readFileSync('src/hud.js', 'utf8');
// chave presente nos dois idiomas = aparece ao menos 2 vezes como "chave:"
const both = (k) => (i18n.match(new RegExp(String.raw`[{,\s]"?${k}"?\s*:`, 'g')) || []).length >= 2;
const falta = [];
// 13/11: shared/version.js segue o package.json (o servidor paga o presente de atualizacao por ela)
{ const { GAME_VERSION } = await import('../shared/version.js'), pv = JSON.parse(fs.readFileSync('package.json', 'utf8')).version; if (GAME_VERSION !== pv) falta.push(`shared/version.js ${GAME_VERSION} != package.json ${pv}`); }
for (const k of Object.keys(STREAKS)) {
  for (const p of ['s_', 'sd_']) if (!both(p + k)) falta.push(p + k);
  if (!new RegExp(String.raw`^\s*${k}:\s*` + '`', 'm').test(hud.slice(hud.indexOf('STREAK_SVG')))) falta.push('icone STREAK_SVG.' + k);
}
for (const k of Object.keys(FIELD)) for (const p of ['fd_', 'fdd_']) if (!both(p + k)) falta.push(p + k);
for (const k of Object.keys(GADGETS)) if (!both(k)) falta.push(k);
// modo novo: nome e descricao nos dois idiomas (03/11)
for (const lang of ['pt', 'en']) { setLang(lang); for (const k of Object.keys(MODES)) { if (modeName(k) === k) falta.push(`nome do modo ${k} (${lang})`); if (!modeDesc(k)) falta.push(`descricao do modo ${k} (${lang})`); } }
// laminas (04/11): todo corpo melee tem nome nos dois idiomas
const { BODY_TRAITS } = await import('../shared/weapons.js');
for (const k of Object.keys(BODY_TRAITS)) if (k.startsWith('melee_') && !both('ml_' + k.slice(6))) falta.push('ml_' + k.slice(6));
// Rovex Pass (04/11): toda recompensa com nome nos dois idiomas
const { PASS } = await import('../src/pass.js');
const { PASS_FREE } = await import('../src/pass.js');
for (const p of [...PASS, ...Object.values(PASS_FREE)]) if (!both(p.k === 'stamp' ? 'stamp_' + p.id : p.k === 'banner' ? 'bn_' + p.id : p.k === 'dance' ? 'dn_' + p.id : p.k === 'camo' ? 'camo_' + p.id : p.k === 'ret' ? 'retc_' + p.id : 'lk_' + p.slot + '_' + p.id)) falta.push('pass ' + p.id);
if (new Set(PASS.map(p => p.k + (p.slot || '') + p.id)).size !== PASS.length) falta.push('item repetido no Pass');
// todo item marcado como do Pass precisa estar em alguma trilha, senao ninguem consegue
{ const { LOOKS: LK, DANCE_INFO } = await import('../shared/looks.js'), { BANNERS: BN } = await import('../shared/banners.js'), all = [...PASS, ...Object.values(PASS_FREE)];
  for (const [slot, L] of Object.entries(LK)) for (const it of L) if (it.pass && !all.some(p => p.k === 'look' && p.slot === slot && p.id === it.id)) falta.push(`look ${slot}/${it.id} marcado pass e fora das trilhas`);
  for (const b of BN) if (b.pass && !all.some(p => p.k === 'banner' && p.id === b.id)) falta.push('banner ' + b.id + ' marcado pass e fora das trilhas');
  for (const [k, d] of Object.entries(DANCE_INFO)) if (d.pass && !all.some(p => p.k === 'dance' && p.id === k)) falta.push('dança ' + k + ' marcada pass e fora das trilhas');
  for (const it of LK.charm) if (it.id !== 'none' && !fs.existsSync('public/models/src/charm_' + it.id + '.glb')) falta.push('chaveiro sem modelo: ' + it.id);
  for (const b of BN) if (!b.pass && !b.shop) continue; }
// podio (05/11, REGRA dele): todo mapa, inclusive os futuros, precisa de um lugar com espaco pros 3 tambores e pra camera
{ const { MAP_IDS: ALL, getMap: gm } = await import('../shared/map.js'), { podiumSpot } = await import('../shared/podiumspot.js'); for (const k of ALL) if (!podiumSpot(gm(k))) falta.push('mapa sem lugar pro podio: ' + k + ' (abrir espaco ou definir M.podium)'); }
// dancas (05/11): lista do servidor igual a do desenho e nome nos dois idiomas
{ const { DANCE_IDS } = await import('../shared/looks.js'), { DANCES } = await import('../src/dances.js'); for (const k of DANCE_IDS) { if (!DANCES[k]) falta.push('danca sem desenho: ' + k); if (!both('dn_' + k)) falta.push('dn_' + k); } for (const k of Object.keys(DANCES)) if (!DANCE_IDS.includes(k)) falta.push('danca fora da lista do servidor: ' + k); }
// REGRA dele (05/11): nada de reticencias cortando dado, em nenhuma tela (texto longo encolhe: src/fit.js)
for (const k of ['src/style.css', 'src/split.css']) if (/text-overflow:\s*ellipsis/.test(fs.readFileSync(k, 'utf8'))) falta.push('reticencias no CSS: ' + k);
// banners (05/11): nome nos dois idiomas e desenho
const { BANNERS } = await import('../shared/banners.js'), bnSrc = fs.readFileSync('src/banners.js', 'utf8');
for (const b of BANNERS) { if (b.mastery) { if (!both('mstStarring')) falta.push('mstStarring'); continue; } /* poster de mestre: desenho mstArt e nome montados em codigo (07/11) */ if (!both('bn_' + b.id)) falta.push('bn_' + b.id); if (!new RegExp(String.raw`^\s*${b.id}: \(\)`, 'm').test(bnSrc)) falta.push('desenho do banner ' + b.id); }
// miras (04/11): nome proprio nos dois idiomas
for (const m of fs.readFileSync('src/arsenal.js', 'utf8').match(/SCOPE_NAMED = \[[^\]]+/)[0].matchAll(/'(\w+)'/g)) if (!both('scn_' + m[1])) falta.push('scn_' + m[1]);
// REGRA dele (09/11): peca de arma nunca aparece com chave crua (gpn_sniper_handle_1). Le as listas do proprio arsenal
{ const ars = fs.readFileSync('src/arsenal.js', 'utf8'), bloco = (ini) => { const a = ars.indexOf(ini); return a < 0 ? '' : ars.slice(a, ars.indexOf('\n};', a)); };
  for (const m of ars.matchAll(/\bhandles: \[([^\]]*)\]/g)) for (const [, id] of m[1].matchAll(/'(\w+)'/g)) { const k = id === 'akimbo' ? 'akimbo' : id.startsWith('gd_') ? id : 'gpn_' + id; if (!both(k)) falta.push('nome da empunhadura: ' + k); }
  for (const [, id] of bloco('export const MUZZLES = {').matchAll(/^\s*(\w+):/gm)) if (!both('mz_' + id)) falta.push('nome do bocal: mz_' + id);
  for (const [, id] of bloco('export const CONV_KITS = {').matchAll(/\b(\w+): \{ mode:/g)) if (!both('conv_' + id)) falta.push('nome do kit: conv_' + id); }
// mapa e vilao da noite (03/11): nome nos dois idiomas; sala que abre por porta tambem
const { MAP_IDS } = await import('../shared/map.js'), { MOBS } = await import('../shared/mobs.js'), { getMap } = await import('../shared/map.js');
for (const k of MAP_IDS) if (!both('map_' + k)) falta.push('map_' + k);
for (const k of Object.keys(MOBS)) if (!both('mob_' + k)) falta.push('mob_' + k);
for (const d of getMap('tinteiro').bor.doors) if (!both('bor_room_' + d.id)) falta.push('bor_room_' + d.id);
// loja (03/11): o que cada item libera existe e e so da Loja; nome nos dois idiomas; toda camo/skin da Loja esta a venda
const { SHOP_ITEMS, RARITY, RANGE, shopPrice } = await import('../shared/shop.js'), { CAMOS } = await import('../src/camos.js'), { LOOKS } = await import('../shared/looks.js');
const sold = new Set(Object.values(SHOP_ITEMS).flatMap(it => it.give));
for (const [k, it] of Object.entries(SHOP_ITEMS)) {
  if (!RARITY[it.r]) falta.push('raridade ' + it.r);
  const pr = shopPrice(k), rg = it.weapon ? RANGE.wpack : RANGE[it.kind]; // faixa de preco dele (03/11): camo 3-6k, skin 5-10k, pacote 8-12k
  if (!rg || !(pr >= rg[0] && pr <= rg[1])) falta.push(`preco fora da faixa: ${k} = ${pr}`);
  if (!both('shk_' + it.kind)) falta.push('shk_' + it.kind);
  if (it.kind === 'bundle') for (const p of ['si_', 'sid_']) if (!both(p + k)) falta.push(p + k);
  for (const g of it.give) {
    const [slot, id] = g.split(':');
    if (slot === 'camo') { if (!CAMOS.find(c => c.id === id)?.shop) falta.push(`camo ${id} sem shop: true (${k})`); if (!both('camo_' + id)) falta.push('camo_' + id); }
    else if (LOOKS[slot]) { if (!LOOKS[slot].find(s => s.id === id)?.shop) falta.push(`${slot} ${id} sem shop: true (${k})`); if (!both('lk_' + slot + '_' + id)) falta.push('lk_' + slot + '_' + id); }
    else if (slot === 'banner') { const { BANNERS: BN2 } = await import('../shared/banners.js'); if (!BN2.find(b => b.id === id)?.shop) falta.push(`banner ${id} sem shop: 1 (${k})`); if (!both('bn_' + id)) falta.push('bn_' + id); }
    else if (slot === 'dance') { const { DANCE_INFO } = await import('../shared/looks.js'); if (!DANCE_INFO[id]?.shop) falta.push(`dança ${id} sem shop: true (${k})`); if (!both('dn_' + id)) falta.push('dn_' + id); }
    else if (slot === 'ret') { if (!both('ret_' + id)) falta.push('ret_' + id); } // reticula da Loja (04/11)
    else if (slot === 'wskin') { if (!WSKINS[id]) falta.push(`skin de modelo ${id} nao existe (${k})`); if (!both('ws_' + id)) falta.push('ws_' + id); } // skin de modelo (04/11)
    else if (slot === 'stamp') { if (!both('stamp_' + id)) falta.push('stamp_' + id); } // estampa de pintura (09/11)
    else if (slot === 'kc' || slot === 'stk') { if (!both('lk_' + slot + '_' + id)) falta.push('lk_' + slot + '_' + id); } // contador e adesivo (13/11)
    else falta.push(`item ${k}: give desconhecido ${g}`);
  }
}
for (const c of CAMOS.filter(c => c.shop)) if (!sold.has('camo:' + c.id)) falta.push(`camo da Loja sem item a venda: ${c.id}`);
// 04/11 (regra dele): PT-BR sempre com acento. Palavra comum sem acento em texto novo trava aqui
{ const ptSrc = i18n.split(/\ben:\s*\{/).map((b, i) => (i ? b.slice(b.indexOf('Object.assign(D.pt')) : b)).join('').split('\n').filter(l => !/Object\.assign\(D\.en/.test(l) && !l.trimStart().startsWith('//')).join('\n');
  for (const m of ptSrc.matchAll(/'[^'\n]*(?<![\p{L}_])(nao|voce|tambem|proxima|proximo|municao|nivel|chao|ja|sao)(?![\p{L}_])[^'\n]*'/giu)) falta.push('sem acento: ' + m[0].slice(0, 60)); }
// 04/11: Zions Points ganhos (cada linha paga tem nome; mensagens do deposito)
for (const k of ['zp_title', 'zp_win', 'zp_lose', 'zp_daily', 'zp_elite', 'zp_unlock', 'zp_sending', 'zp_done', 'zp_capped', 'zp_none', 'zp_login', 'zp_err', 'endTabScore', 'endTabNew', 'elNew']) if (!both(k)) falta.push(k);
// 04/11: secoes do Arsenal, prateleiras da Loja, reativa marcada no item e vitrine sem item repetido
const { SHELVES, shopRotation } = await import('../shared/shop.js');
for (const g of ['static', 'anim', 'react', 'rank', 'special', 'legend', 'pass', 'shop', 'shopreact']) if (!both('cg_' + g)) falta.push('cg_' + g);
for (const [k] of SHELVES) if (!both('shopShelf_' + k)) falta.push('shopShelf_' + k);
for (const k of ['shk_react', 'shd_react', 'shopStage', 'shopWeekly']) if (!both(k)) falta.push(k);
for (const [k, it] of Object.entries(SHOP_ITEMS)) if (it.kind === 'camo' && !!it.react !== !!CAMOS.find(c => c.id === it.give[0].split(':')[1])?.react) falta.push(`item ${k}: react diferente da camo`);
for (let d = 0; d < 60; d++) { const r = shopRotation(Date.UTC(2026, 10, 4) + d * 86400000), all = [...r.featured, ...r.daily, ...r.shelves.flatMap(s => s.items)]; if (new Set(all).size !== all.length) falta.push(`vitrine repete item no dia +${d}`); }
for (const [sl, list] of Object.entries(LOOKS)) for (const s of list.filter(s => s.shop)) if (!sold.has(sl + ':' + s.id)) falta.push(`visual da Loja sem item a venda: ${sl}:${s.id}`);
for (const k of ['shd_camo', 'shd_skin', 'shd_hat', 'shk_hat', 'shd_react', 'lkt_skin', 'lk_skin_none', 'shopOnly', 'cg_shop', 'shopOwned', 'lookPeekShop']) if (!both(k)) falta.push(k);
for (const r of Object.keys(RARITY)) if (!both('rar_' + r)) falta.push('rar_' + r);
if (falta.length) { console.error('FALTANDO texto/icone:\n  ' + falta.join('\n  ')); process.exit(1); }
console.log('chaves ok:', Object.keys(STREAKS).length, 'sequencias,', Object.keys(FIELD).length, 'equipamentos,', Object.keys(GADGETS).length, 'gadgets,', Object.keys(MODES).length, 'modos,', MAP_IDS.length, 'mapas,', Object.keys(MOBS).length, 'viloes');
