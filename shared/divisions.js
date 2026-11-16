// Divisoes (16/11, pedido dele; tags juntam as palavras do nome, ex.: Bigodes de Ferro = BIFE): os "clas" do Rubber Riot. Sao 10, FIXAS (o jogador nao cria tag): cada uma com tag de 4
// letras, cor, icone e jeito de jogar. Pra entrar, o jogador responde o questionario e o sistema enquadra ele numa delas.
// Servidor da Rovex le daqui (copia em server/src/games/rubber-riot/shared): enquadra, soma pontos e fecha o duelo da semana.
// Icones: Material Icons (Apache 2.0). Nomes e textos: i18n (dv_<id>, dvm_<id>, dvt_<id>).

export const DIVISIONS = [
  { id: 'tinta', tag: 'TINO', color: '#1d1a17', ink: '#f2ede1', ico: 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z' }, // Os Tinteiros: no meio da briga
  { id: 'circo', tag: 'TRUC', color: '#c8342a', ink: '#fff6e0', ico: 'M12 2 4 7v2h16V7l-8-5zm-6 9v8H4v2h16v-2h-2v-8h-2v8h-3v-8h-2v8H8v-8H6z' }, // Trupe do Circo: pula, corre, nao para
  { id: 'rolo', tag: 'ROFI', color: '#2f4f6f', ink: '#e8f0f7', ico: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z' }, // Rolo de Filme: o roteiro e o objetivo
  { id: 'apito', tag: 'PIFA', color: '#6b5a3a', ink: '#f7efd9', ico: 'M15 2v2h-2v2.07A8 8 0 1 0 19.93 13H22v-2h-2.07A8 8 0 0 0 17 6.08V4h-2V2h0zm-3 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12z' }, // Apito da Fabrica: turno firme, segura a posicao
  { id: 'mola', tag: 'MOMA', color: '#d98a1f', ink: '#1d1a17', ico: 'M7 2v2h10V2H7zm-1 4v2h12V6H6zm1 4v2h10v-2H7zm-1 4v2h12v-2H6zm1 4v2h10v-2H7z' }, // Mola Maluca: caos, granada, explosao
  { id: 'luar', tag: 'TULU', color: '#3b3a6e', ink: '#ece9ff', ico: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z' }, // Turma do Luar: de longe, no escuro
  { id: 'bigode', tag: 'BIFE', color: '#4a4a4a', ink: '#f1f1f1', ico: 'M12 11c-1.5-2-4-3-6-2-1.7.8-2.5 2.6-4 3 1.5 1.6 4 2.4 6 1.6 1.6-.6 2.8-1.6 4-2.6 1.2 1 2.4 2 4 2.6 2 .8 4.5 0 6-1.6-1.5-.4-2.3-2.2-4-3-2-1-4.5 0-6 2z' }, // Bigodes de Ferro: aguentam pancada, metralhadora
  { id: 'gaita', tag: 'GAPO', color: '#2e6b4f', ink: '#e6f5ed', ico: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' }, // Gaiteiros do Porto: o time em primeiro lugar
  { id: 'fumo', tag: 'SUMI', color: '#7a7f86', ink: '#14161a', ico: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z' }, // Chamine: fumaca, emboscada, some e aparece
  { id: 'palco', tag: 'ESPA', color: '#b8862b', ink: '#1d1a17', ico: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' }, // Estrela do Palco: estilo, cabecada, holofote
  // 16/11 (pedido dele): +2 divisoes
  { id: 'trem', tag: 'EXNO', color: '#8a3b12', ink: '#fbe9dc', ico: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z' }, // Expresso Noturno: empurra em bando, nao para
  { id: 'asso', tag: 'ASTE', color: '#4f7a74', ink: '#e8f6f3', ico: 'M12 2a8 8 0 0 0-8 8v12l2.7-2 2.6 2 2.7-2 2.7 2 2.6-2L20 22V10a8 8 0 0 0-8-8zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z' }, // Assombracao do Teatro: faca e susto pelas costas
];
export const DIV = Object.fromEntries(DIVISIONS.map(d => [d.id, d]));
export const DIV_BY_TAG = Object.fromEntries(DIVISIONS.map(d => [d.tag, d]));
export const isDivTag = (t) => typeof t === 'string' && !!DIV_BY_TAG[t];

// questionario: 4 respostas por pergunta. Cada resposta da +2 numa divisao e +1 em outra (textos: dq_<n>, dq_<n>_<a>)
// 16/11 (pedido dele): 9 perguntas pras 12 divisoes. Validado em todas as 4^9 combinacoes: cada divisao e principal 3 vezes e
// secundaria 3 vezes; chance de cair em cada uma entre 7,6% e 8,8% (ideal 8,3%); nenhuma resposta repete (scratchpad quiz.py)
export const DIV_QUIZ = [
  [['tinta', 'rolo'], ['luar', 'palco'], ['rolo', 'apito'], ['gaita', 'bigode']],   // começou a partida: primeiro passo
  [['tinta', 'circo'], ['luar', 'fumo'], ['bigode', 'apito'], ['asso', 'circo']],   // arma favorita
  [['bigode', 'tinta'], ['fumo', 'asso'], ['circo', 'fumo'], ['gaita', 'rolo']],    // pouca vida no tiroteio
  [['palco', 'luar'], ['rolo', 'gaita'], ['trem', 'bigode'], ['mola', 'trem']],     // o que mais te da orgulho
  [['circo', 'trem'], ['luar', 'tinta'], ['apito', 'gaita'], ['mola', 'asso']],     // seu ritmo
  [['mola', 'palco'], ['apito', 'bigode'], ['palco', 'circo'], ['asso', 'fumo']],   // que cena de desenho e voce
  [['asso', 'luar'], ['bigode', 'mola'], ['rolo', 'trem'], ['fumo', 'palco']],      // adversario favorito
  [['trem', 'gaita'], ['tinta', 'rolo'], ['gaita', 'apito'], ['fumo', 'asso']],     // no time voce e
  [['trem', 'mola'], ['palco', 'tinta'], ['circo', 'luar'], ['apito', 'mola']],     // barulho preferido
];
// enquadra: soma os pesos; empate decide pelo id da conta (espalha os empates entre as divisoes empatadas, sempre igual pra mesma conta)
export function assignDivision(answers, seed = '') {
  if (!Array.isArray(answers) || answers.length !== DIV_QUIZ.length) return null;
  const sc = Object.fromEntries(DIVISIONS.map(d => [d.id, 0]));
  for (let i = 0; i < DIV_QUIZ.length; i++) {
    const a = answers[i] | 0; if (a < 0 || a > 3) return null;
    const [p, s] = DIV_QUIZ[i][a]; sc[p] += 2; sc[s] += 1;
  }
  const best = Math.max(...Object.values(sc)), tied = DIVISIONS.filter(d => sc[d.id] === best);
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tied[h % tied.length].id;
}

// pontos (servidor): por partida jogada = 2 + abates (ate 25) + 10 se venceu. Rankeada de divisoes = so o rp que ganhou + 5 na vitoria
export const divMatchPts = (kills, won) => 2 + Math.max(0, Math.min(25, kills | 0)) + (won ? 10 : 0);
export const divRankPts = (delta, won) => Math.max(0, delta | 0) + (won ? 5 : 0);
export const DIV_CHANGE_DAYS = 30; // (antigo) troca a cada 30 dias: substituido pelo desertor
// desertor (16/11, pedido dele): trocar de divisao custa 5.000 Zions Points, cobrado no servidor so se o resultado for OUTRA divisao
export const DIV_DESERT_ZP = 5000;

// periodos no fuso do Brasil: mes (ranking mensal e rankeada) e semana ISO (duelo de divisoes)
const brNow = (now) => new Date(now - 3 * 3600e3);
export const divMonth = (now = Date.now()) => brNow(now).toISOString().slice(0, 7);
export function divWeek(now = Date.now()) {
  const d = brNow(now), day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3);
  const y = d.getUTCFullYear(), f = new Date(Date.UTC(y, 0, 4)), w = 1 + Math.round(((d - f) / 864e5 - 3 + ((f.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
// duelo da semana: as 10 divisoes viram 5 pares, girando toda semana (cada uma enfrenta todas ao longo de 9 semanas)
export function divDuels(week = divWeek()) {
  const n = DIVISIONS.length, r = (parseInt(week.slice(-2), 10) + parseInt(week.slice(0, 4), 10) * 53) % (n - 1);
  const ids = DIVISIONS.map(d => d.id), fixed = ids[0], rest = ids.slice(1);
  const rot = rest.slice(r).concat(rest.slice(0, r)), order = [fixed, ...rot], pairs = [];
  for (let i = 0; i < n / 2; i++) pairs.push([order[i], order[n - 1 - i]]);
  return pairs;
}
// bot ganha uma divisao fixa pelo id (a partida fica com cara de briga de divisoes)
export function botDivTag(id) { let h = 0; for (const c of String(id)) h = (h * 33 + c.charCodeAt(0)) >>> 0; return DIVISIONS[h % DIVISIONS.length].tag; }
