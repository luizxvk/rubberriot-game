// Icone de cada modo (19/11, pedido dele: cartoes da escolha de modo com o desenho do modo). Mesmo traco dos icones de
// granada (hud.js NADE_SVG): tinta #141210 de 2,5, cor chapada da paleta, viewBox 48. Modo sem desenho cai no generico.
const K = 'stroke="#141210" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';
const R = '#a83a2c', B = '#2f5b8a', Y = '#f2c14e', P = '#faf8f2', G = '#5f8f5f', I = '#141210', O = '#e8562a';
const bolt = (x, y, s = 1) => `<path d="M${x} ${y}l${-6 * s} ${11 * s}h${5 * s}l${-3 * s} ${9 * s}l${9 * s} ${-13 * s}h${-5 * s}l${3 * s} ${-7 * s}z" fill="${Y}" ${K}/>`;
const flag = (x, y, c) => `<path d="M${x} ${y + 30}V${y}" ${K} fill="none"/><path d="M${x} ${y + 1}c6-3 10 3 16 0v12c-6 3-10-3-16 0z" fill="${c}" ${K}/>`;
export const MODE_SVG = {
  tdm: `<circle cx="16" cy="20" r="9" fill="${R}" ${K}/><circle cx="32" cy="28" r="9" fill="${B}" ${K}/><path d="M9 40h14M25 42h14" ${K}/>`,
  ffa: `<circle cx="24" cy="24" r="15" fill="${P}" ${K}/><circle cx="24" cy="24" r="8" fill="${R}" ${K}/><path d="M24 4v8M24 36v8M4 24h8M36 24h8" ${K}/>`,
  pnb: `<circle cx="24" cy="24" r="16" fill="${P}" ${K}/><path d="M24 8a16 16 0 0 1 0 32z" fill="${I}"/><circle cx="24" cy="24" r="16" fill="none" ${K}/><path d="M13 21h6M29 21h6" stroke="${I}" stroke-width="3" stroke-linecap="round"/><path d="M29 21h6" stroke="${P}" stroke-width="3" stroke-linecap="round"/>`,
  blitz: `<circle cx="24" cy="24" r="16" fill="${R}" ${K}/>${bolt(28, 9, 1.4)}`,
  blitz_ctf: `${flag(12, 8, R)}${bolt(38, 14, 1.1)}`,
  blitz_dom: `<circle cx="11" cy="32" r="6" fill="${R}" ${K}/><circle cx="24" cy="35" r="6" fill="${P}" ${K}/><circle cx="37" cy="32" r="6" fill="${B}" ${K}/>${bolt(28, 4, 1)}`,
  gungame: `<path d="M14 6v38M34 6v38M14 14h20M14 24h20M14 34h20" ${K} fill="none"/><path d="M20 4h12l-2 6h-8z" fill="${Y}" ${K}/>`,
  infect: `<path d="M24 6c7 9 14 15 14 23a14 14 0 0 1-28 0c0-8 7-14 14-23z" fill="${G}" ${K}/><circle cx="19" cy="29" r="3" fill="${P}" ${K}/><circle cx="29" cy="29" r="3" fill="${P}" ${K}/><path d="M18 37q6-3 12 0" ${K} fill="none"/>`,
  bhop: `<rect x="5" y="36" width="12" height="6" rx="1" fill="${Y}" ${K}/><rect x="31" y="26" width="12" height="6" rx="1" fill="${Y}" ${K}/><path d="M11 34C14 12 30 8 37 24" ${K} fill="none" stroke-dasharray="3 4"/><path d="M33 8l3-4 2 5 4-1-2 5" fill="${P}" ${K}/>`,
  escort: `<rect x="8" y="12" width="32" height="20" rx="4" fill="${Y}" ${K}/><rect x="13" y="16" width="8" height="7" fill="${P}" ${K}/><rect x="27" y="16" width="8" height="7" fill="${P}" ${K}/><circle cx="15" cy="36" r="4" fill="${I}"/><circle cx="33" cy="36" r="4" fill="${I}"/><path d="M4 42h40M24 12V5" ${K}/>`,
  heist: `<rect x="7" y="7" width="34" height="34" rx="4" fill="#5d6066" ${K}/><circle cx="24" cy="24" r="11" fill="${P}" ${K}/><path d="M24 15v18M15 24h18M18 18l12 12M30 18L18 30" stroke="${I}" stroke-width="2"/><circle cx="24" cy="24" r="3" fill="${Y}" ${K}/>`,
  trem: `<rect x="6" y="18" width="24" height="16" rx="3" fill="${I}" ${K}/><rect x="28" y="12" width="13" height="22" rx="2" fill="${R}" ${K}/><rect x="31" y="16" width="7" height="6" fill="${P}" ${K}/><path d="M11 18v-8h6v8" fill="${I}" ${K}/><circle cx="13" cy="38" r="4" fill="${R}" ${K}/><circle cx="25" cy="38" r="4" fill="${R}" ${K}/><circle cx="36" cy="38" r="3" fill="${R}" ${K}/><path d="M9 26h18" stroke="${Y}" stroke-width="2.5"/>`,
  smuggle: `<rect x="8" y="12" width="32" height="26" rx="2" fill="#a07a4a" ${K}/><path d="M8 12l32 26M40 12L8 38" ${K}/><rect x="28" y="16" width="9" height="5" fill="${R}"/>`,
  ctf: `${flag(14, 7, R)}<path d="M8 42h22" ${K}/>`,
  dom: `<circle cx="12" cy="28" r="7" fill="${R}" ${K}/><circle cx="24" cy="18" r="7" fill="${P}" ${K}/><circle cx="36" cy="28" r="7" fill="${B}" ${K}/><path d="M9 41h30" ${K}/>`,
  bomb: `<circle cx="22" cy="28" r="13" fill="${I}" ${K}/><path d="M30 17l4-4" ${K}/><path d="M34 13c3-4 7-2 7-6" fill="none" ${K}/><path d="M40 5l2 3 3-1-1 3" fill="${O}" stroke="${O}" stroke-width="2"/><circle cx="17" cy="23" r="3" fill="${P}"/>`,
  br: `<circle cx="24" cy="24" r="17" fill="none" ${K} stroke-dasharray="4 4"/><circle cx="24" cy="24" r="10" fill="${O}" ${K}/><circle cx="24" cy="20" r="3" fill="${P}" ${K}/><path d="M19 30c1-4 9-4 10 0" fill="${P}" ${K}/>`,
  bounce: `<circle cx="34" cy="13" r="7" fill="${R}" ${K}/><path d="M6 40q7-20 14 0q6-14 12 0" fill="none" ${K} stroke-dasharray="3 4"/><path d="M4 42h40" ${K}/>`,
  duo: `<circle cx="16" cy="16" r="6" fill="${R}" ${K}/><circle cx="32" cy="16" r="6" fill="${R}" ${K}/><path d="M7 40c0-9 18-9 18 0M23 40c0-9 18-9 18 0" fill="${P}" ${K}/>`,
  borroes: `<path d="M24 6c5 0 7 5 11 5s7 5 4 9 2 8-3 11-4 8-9 7-9 3-13 0-8-4-7-9-4-6 0-10 5-6 9-7 4-6 9-6z" fill="${I}" ${K}/><circle cx="19" cy="22" r="3.5" fill="${P}"/><circle cx="29" cy="22" r="3.5" fill="${P}"/><circle cx="19" cy="23" r="1.5" fill="${I}"/><circle cx="29" cy="23" r="1.5" fill="${I}"/>`,
  arte: `<path d="M24 7C13 7 6 15 6 24s7 17 16 17c3 0 4-2 3-4s0-5 4-5h6c5 0 7-4 7-8C42 14 34 7 24 7z" fill="${P}" ${K}/><circle cx="15" cy="21" r="3" fill="${R}" ${K}/><circle cx="23" cy="15" r="3" fill="${Y}" ${K}/><circle cx="32" cy="18" r="3" fill="${B}" ${K}/><circle cx="15" cy="31" r="3" fill="${G}" ${K}/>`,
};
export const modeSvg = (k) => MODE_SVG[k] || `<circle cx="24" cy="24" r="15" fill="${P}" ${K}/><path d="M18 24h12M24 18v12" ${K}/>`;
