// Confere que toda sequencia, gadget e equipamento tem nome/descricao em PT e EN e icone (03/11, pedido dele:
// nunca mais aparecer "s_plane" cru na tela). Roda no `npm run check` e antes de dizer pronto.
import fs from 'node:fs';
import { STREAKS, FIELD, GADGETS, MODES } from '../shared/weapons.js';
globalThis.localStorage ??= { getItem: () => null, setItem() {} }; globalThis.navigator ??= { language: 'pt-BR' }; globalThis.document ??= { documentElement: {}, querySelectorAll: () => [] };
const { setLang, modeName, modeDesc } = await import('../src/i18n.js');
const i18n = fs.readFileSync('src/i18n.js', 'utf8'), hud = fs.readFileSync('src/hud.js', 'utf8');
// chave presente nos dois idiomas = aparece ao menos 2 vezes como "chave:"
const both = (k) => (i18n.match(new RegExp(String.raw`[{,\s]"?${k}"?\s*:`, 'g')) || []).length >= 2;
const falta = [];
for (const k of Object.keys(STREAKS)) {
  for (const p of ['s_', 'sd_']) if (!both(p + k)) falta.push(p + k);
  if (!new RegExp(String.raw`^\s*${k}:\s*` + '`', 'm').test(hud.slice(hud.indexOf('STREAK_SVG')))) falta.push('icone STREAK_SVG.' + k);
}
for (const k of Object.keys(FIELD)) for (const p of ['fd_', 'fdd_']) if (!both(p + k)) falta.push(p + k);
for (const k of Object.keys(GADGETS)) if (!both(k)) falta.push(k);
// modo novo: nome e descricao nos dois idiomas (03/11)
for (const lang of ['pt', 'en']) { setLang(lang); for (const k of Object.keys(MODES)) { if (modeName(k) === k) falta.push(`nome do modo ${k} (${lang})`); if (!modeDesc(k)) falta.push(`descricao do modo ${k} (${lang})`); } }
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
  const pr = shopPrice(k), rg = RANGE[it.kind]; // faixa de preco dele (03/11): camo 3-6k, skin 5-10k, pacote 8-12k
  if (!rg || !(pr >= rg[0] && pr <= rg[1])) falta.push(`preco fora da faixa: ${k} = ${pr}`);
  if (!both('shk_' + it.kind)) falta.push('shk_' + it.kind);
  if (it.kind === 'bundle') for (const p of ['si_', 'sid_']) if (!both(p + k)) falta.push(p + k);
  for (const g of it.give) {
    const [slot, id] = g.split(':');
    if (slot === 'camo') { if (!CAMOS.find(c => c.id === id)?.shop) falta.push(`camo ${id} sem shop: true (${k})`); if (!both('camo_' + id)) falta.push('camo_' + id); }
    else if (LOOKS[slot]) { if (!LOOKS[slot].find(s => s.id === id)?.shop) falta.push(`${slot} ${id} sem shop: true (${k})`); if (!both('lk_' + slot + '_' + id)) falta.push('lk_' + slot + '_' + id); }
    else falta.push(`item ${k}: give desconhecido ${g}`);
  }
}
for (const c of CAMOS.filter(c => c.shop)) if (!sold.has('camo:' + c.id)) falta.push(`camo da Loja sem item a venda: ${c.id}`);
for (const [sl, list] of Object.entries(LOOKS)) for (const s of list.filter(s => s.shop)) if (!sold.has(sl + ':' + s.id)) falta.push(`visual da Loja sem item a venda: ${sl}:${s.id}`);
for (const k of ['shd_camo', 'shd_skin', 'shd_hat', 'shk_hat', 'shd_react', 'lkt_skin', 'lk_skin_none', 'shopOnly', 'cg_shop', 'shopOwned', 'lookPeekShop']) if (!both(k)) falta.push(k);
for (const r of Object.keys(RARITY)) if (!both('rar_' + r)) falta.push('rar_' + r);
if (falta.length) { console.error('FALTANDO texto/icone:\n  ' + falta.join('\n  ')); process.exit(1); }
console.log('chaves ok:', Object.keys(STREAKS).length, 'sequencias,', Object.keys(FIELD).length, 'equipamentos,', Object.keys(GADGETS).length, 'gadgets,', Object.keys(MODES).length, 'modos,', MAP_IDS.length, 'mapas,', Object.keys(MOBS).length, 'viloes');
