// Treino com o Seu Tinteiro: partida solo guiada na Vila. Um cartao de gibi no topo da uma tarefa por vez
// (so passa quando o jogador faz) e mostra o botao certo pro aparelho em uso (teclado, controle ou toque).
// Bonecos de treino = bots que nao pensam (nao andam nem atiram). Nada aqui da XP nem conta desafio.
import { getLang } from './i18n.js';
import { audio } from './audio.js';
import { isTouch } from './input.js';
import { hasLOS } from '../shared/map.js';
import { standable, floorAt } from '../shared/nav.js';

// botao de cada acao por aparelho
const KEYS = {
  pt: {
    move: ['W A S D', 'Analogico esquerdo', 'Analogico da esquerda'], look: ['Mouse', 'Analogico direito', 'Arrastar o lado direito'],
    fire: ['Botao esquerdo', 'RT', 'Botao de tiro'], ads: ['Botao direito', 'LT', 'Botao da mira'], jump: ['Espaco', 'A', 'Botao de pulo'],
    crouch: ['C', 'B', 'Botao de agachar'], sprint: ['Shift', 'L3 (aperta o analogico)', 'Botao de correr'], reload: ['R', 'X', 'Botao de recarregar'],
    swap: ['1, 2, 3 ou rodinha', 'Y', 'Botao de trocar'], melee: ['V', 'R3', 'Botao da faca'], frag: ['G', 'LB', 'Botao da granada'], flash: ['F', 'RB', 'Botao do flash'],
    streak: ['X', 'Direcional pra cima', 'Botao da estrela'], field: ['Z', 'Direcional pra direita', 'Botao do equipamento'], use: ['E (segurar)', 'X (segurar)', 'Botao de usar (segurar)'],
    board: ['Tab', 'Select', 'Toque no placar'], pause: ['Esc', 'Start', 'Botao de pausa'], next: ['Espaco', 'A', 'Toque no cartao'],
  },
  en: {
    move: ['W A S D', 'Left stick', 'Left stick'], look: ['Mouse', 'Right stick', 'Drag the right side'],
    fire: ['Left click', 'RT', 'Fire button'], ads: ['Right click', 'LT', 'Aim button'], jump: ['Space', 'A', 'Jump button'],
    crouch: ['C', 'B', 'Crouch button'], sprint: ['Shift', 'L3 (click the stick)', 'Sprint button'], reload: ['R', 'X', 'Reload button'],
    swap: ['1, 2, 3 or wheel', 'Y', 'Swap button'], melee: ['V', 'R3', 'Knife button'], frag: ['G', 'LB', 'Grenade button'], flash: ['F', 'RB', 'Flash button'],
    streak: ['X', 'D-pad up', 'Star button'], field: ['Z', 'D-pad right', 'Gear button'], use: ['E (hold)', 'X (hold)', 'Use button (hold)'],
    board: ['Tab', 'Select', 'Tap the scoreboard'], pause: ['Esc', 'Start', 'Pause button'], next: ['Space', 'A', 'Tap the card'],
  },
};

// textos: {k} vira o botao da acao k (chip); **x** vira negrito
const TXT = {
  pt: {
    prize: 'Premio do treino (Desafios):', who: 'Seu Tinteiro', step: 'Passo {n} de {t}', next: '{k} pra continuar', done: 'Boa!', finish: '{k} pra voltar ao menu',
    welcome: ['Bem-vindo a Vila!', 'Eu sou o **Seu Tinteiro** e vou te ensinar a brigar de borracha. Cada tarefa so passa quando voce fizer. Da pra sair a qualquer hora na pausa ({pause}).'],
    look: ['Olhe em volta', 'Gire a camera com {look}. Olhe pros lados e pra cima.'],
    move: ['Ande', 'Ande pela Vila com {move}. Cinco passos largos bastam.'],
    body: ['Corpo de borracha', 'Corra com {sprint}, pule com {jump} e agache com {crouch}. Agachado voce erra menos e aparece menos.'],
    gSprint: 'Correr', gJump: 'Pular', gCrouch: 'Agachar',
    aim: ['Mire', 'Segure {ads} pra mirar pela arma. Mirando o tiro fica bem mais certeiro.'],
    targets: ['Derrube os bonecos', 'Tres bonecos de treino apareceram na sua frente. Atire com {fire}. Mirar na cabeca derruba mais rapido. **{c} de 3**'],
    reload: ['Recarregue', 'O pente acaba rapido. Recarregue com {reload} antes de entrar na briga.'],
    classes: ['As armas', '**Estalo** (pistola): sempre com voce. **Matraca** (submetralhadora): rapida, de perto. **Trovao** (fuzil): o meio-termo. **Bacamarte** (escopeta): arrasa de pertinho. **Luneta** (sniper): de longe, um tiro. **Lamina**: a faca. E o **Moedor**, a metralhadora que aparece no chao do mapa. Escolha a principal no Arsenal ou no lobby.'],
    swap: ['Troque de arma', 'Troque entre a principal e a pistola com {swap}. Trocar e mais rapido que recarregar.'],
    melee: ['Faca rapida', 'Encostou no inimigo? {melee} da uma facada sem trocar de arma.'],
    nades: ['Granadas', 'Jogue uma granada com {frag} ou um flash com {flash}. A granada estoura, o flash cega quem olhar.'],
    field: ['Equipamento de campo', 'Este e a **Mola**: use com {field} e pule em cima. Tem tambem o **Guarda-chuva** (segura tiro de frente), a **Bigorna** (cai onde voce mira) e o **Buraco portatil** (entra num lado, sai no outro). Ele recarrega sozinho; escolha o seu em Skills.'],
    streak: ['Sequencias', 'Derrubar sem cair libera sequencias. Voce ja tem o **Radar Espiao**: chame com {streak}. Depois vem a **Chuva de Bigornas**, o **Dirigivel** e a **Torta Atomica**. So uma fica no ar por vez na sala.'],
    use: ['O botao de usar', '{use} planta e desarma a bomba (Plantar a Bomba), troca a arma do chao pela da mao (Ultimo de Pe) e enche a bomba de bicicleta pra reerguer o parceiro (Dupla).'],
    modes: ['Os modos', '**Contra Todos**, **Mata-Mata**, **Escada de Armas**, **Captura a Bandeira**, **Dominacao**, **Plantar a Bomba**, **Infectado**, **Ultimo de Pe** (battle royale na Ilha Rebobina, com ringue de boxe pra quem cai) e **Ultimo de Pe: Dupla**. Quem cria a sala escolhe tudo no lobby. {board} mostra o placar.'],
    menus: ['Fora da partida', '**Arsenal**: monta a arma peca por peca, camuflagem e tracado; cada modelo sobe de nivel sozinho. **Skills**: duas passivas e o equipamento. **Desafios** do dia e de carreira. No nivel maximo, o **Prestigio**. Entre na conta **Rovex** pra salvar o progresso e chamar amigos.'],
    bye: ['Pronto pro show!', 'Agora e com voce. A cortina abre em "Jogar".'],
    dummy: 'Boneco',
  },
  en: {
    prize: 'Training reward (Challenges):', who: 'Mr. Inkwell', step: 'Step {n} of {t}', next: '{k} to continue', done: 'Nice!', finish: '{k} to go back to the menu',
    welcome: ['Welcome to the Village!', 'I am **Mr. Inkwell** and I will teach you to brawl in rubber. Each task only moves on when you do it. You can leave anytime from pause ({pause}).'],
    look: ['Look around', 'Turn the camera with {look}. Look left, right and up.'],
    move: ['Walk', 'Walk around the Village with {move}. Five big steps will do.'],
    body: ['Rubber body', 'Sprint with {sprint}, jump with {jump} and crouch with {crouch}. Crouched you miss less and show less.'],
    gSprint: 'Sprint', gJump: 'Jump', gCrouch: 'Crouch',
    aim: ['Aim', 'Hold {ads} to aim down the sights. Aiming makes every shot far more accurate.'],
    targets: ['Knock down the dummies', 'Three training dummies showed up in front of you. Fire with {fire}. Headshots drop them faster. **{c} of 3**'],
    reload: ['Reload', 'Mags run dry fast. Reload with {reload} before the next fight.'],
    classes: ['The weapons', '**Snap** (pistol): always with you. **Rattler** (SMG): fast, up close. **Thunder** (rifle): the all-rounder. **Blunderbuss** (shotgun): wrecks at point blank. **Spyglass** (sniper): long range, one shot. **Blade**: the knife. And the **Grinder**, the minigun lying around the map. Pick your primary in the Arsenal or the lobby.'],
    swap: ['Swap weapons', 'Switch between your primary and the pistol with {swap}. Swapping beats reloading.'],
    melee: ['Quick knife', 'Right on top of someone? {melee} stabs without switching weapons.'],
    nades: ['Grenades', 'Throw a grenade with {frag} or a flash with {flash}. The grenade blows up, the flash blinds whoever looks.'],
    field: ['Field gear', 'This is the **Spring**: use it with {field} and jump on it. There is also the **Umbrella** (blocks shots from the front), the **Anvil** (drops where you aim) and the **Portable Hole** (in one side, out the other). It recharges by itself; pick yours in Skills.'],
    streak: ['Streaks', 'Knockouts without dying unlock streaks. You already have the **Spy Radar**: call it with {streak}. Next come **Anvil Rain**, the **Blimp** and the **Atomic Pie**. Only one can be up in the room at a time.'],
    use: ['The use button', '{use} plants and defuses the bomb (Plant the Bomb), swaps the gun on the floor for yours (Last One Standing) and pumps your partner back up with the bicycle pump (Duo).'],
    modes: ['The modes', '**Free-for-All**, **Team Deathmatch**, **Gun Game**, **Capture the Flag**, **Domination**, **Plant the Bomb**, **Infected**, **Last One Standing** (battle royale on Rewind Island, with a boxing ring for whoever drops) and **Last Duo Standing**. Whoever creates the room sets it all up in the lobby. {board} shows the scoreboard.'],
    menus: ['Outside the match', '**Arsenal**: build your gun part by part, camo and tracer; each model levels up on its own. **Skills**: two passives and your field gear. Daily and career **Challenges**. At max level, **Prestige**. Sign in with **Rovex** to save progress and call friends.'],
    bye: ['Ready for the show!', 'Now it is up to you. The curtain opens in "Play".'],
    dummy: 'Dummy',
  },
};

const STEPS = ['welcome', 'look', 'move', 'body', 'aim', 'targets', 'reload', 'classes', 'swap', 'melee', 'nades', 'field', 'streak', 'use', 'modes', 'menus', 'bye'];
const INFO = new Set(['welcome', 'classes', 'use', 'modes', 'menus', 'bye']);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Tutorial {
  constructor(G, { quit, setField, reward }) {
    this.G = G; this.quit = quit; this.setField = setField; this.reward = reward;
    this.i = -1; this.st = {}; this.targets = []; this.kills = 0; this.started = false;
    const el = this.el = document.createElement('div');
    el.className = 'tut'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    // click (nao pointerdown): arrastar pra rolar o texto no celular nao conta como "continuar"
    el.addEventListener('pointerdown', (e) => { if (INFO.has(STEPS[this.i])) e.stopPropagation(); });
    el.addEventListener('click', (e) => { if (INFO.has(STEPS[this.i])) { e.stopPropagation(); this.advance(); } });
    document.body.classList.add('tutorial');
  }
  get L() { return getLang() === 'pt' ? 'pt' : 'en'; }
  dev() { return this.G.pad?.active ? 1 : isTouch ? 2 : 0; }
  key(k) { return KEYS[this.L][k][this.dev()]; }
  fmt(s, vars = {}) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? esc(vars[k]) : KEYS.pt[k] ? `<kbd>${esc(this.key(k))}</kbd>` : '');
  }

  // chamado quando o jogador nasce na partida
  begin() {
    if (this.started) return;
    this.started = true;
    document.body.appendChild(this.el); // fora do #hud: la' dentro a camada de toque (#touch, z 7) cobria o cartao e o toque nao chegava
    this.go(0);
  }
  go(i) {
    this.i = i; this.st = { t: 0 };
    const id = STEPS[i], G = this.G;
    if (id === 'targets') this.spawnTargets();
    if (id === 'field') this.setField('spring');
    if (id === 'streak') { const me = G.net?.core?.players.get(G.myId); if (me && !me.ready.includes('uav')) me.ready.push('uav'); }
    if (id === 'swap') this.st.w = G.player?.wpn;
    // fim: concluiu o treino = premio dos Desafios (modelo + camuflagem sorteados, uma vez so)
    if (id === 'bye') { this.finished = true; this.prize = this.reward?.() || null; audio.play('levelup', { ui: true, vol: 0.8, jitter: 0 }); }
    if (id === 'move') this.st.from = G.player ? [...G.player.pos] : null;
    this.render();
  }
  advance() {
    if (STEPS[this.i] === 'bye') { this.quit(); return; }
    audio.play('ui_click', { ui: true, vol: 0.6 });
    this.go(this.i + 1);
  }
  complete() {
    if (this.st.ok) return;
    this.st.ok = true;
    audio.play('unlock', { ui: true, vol: 0.55, jitter: 0 });
    this.el.classList.add('ok');
    setTimeout(() => { this.el.classList.remove('ok'); this.go(this.i + 1); }, 900);
    this.render();
  }

  render() {
    const id = STEPS[this.i], T = TXT[this.L], [title, body] = T[id];
    const goals = id === 'body' ? [['sprint', T.gSprint], ['jump', T.gJump], ['crouch', T.gCrouch]] : null;
    this.el.className = 'tut' + (INFO.has(id) ? ' info' : '') + (this.st.ok ? ' ok' : '');
    this.el.innerHTML = `<header><span class="tut-who">${esc(T.who)}</span><span class="tut-n">${esc(T.step.replace('{n}', this.i + 1).replace('{t}', STEPS.length))}</span></header>`
      + `<h3>${esc(this.st.ok ? T.done : title)}</h3><p>${this.fmt(body, { c: this.kills })}</p>`
      + (goals ? `<ul class="tut-goals">${goals.map(([k, n]) => `<li class="${this.st[k] ? 'on' : ''}">${esc(n)}</li>`).join('')}</ul>` : '')
      + (id === 'bye' && this.prize ? `<div class="tut-prize"><small>${esc(T.prize)}</small>${this.prize.map(x => `<b>${esc(x)}</b>`).join('')}</div>` : '')
      + (INFO.has(id) ? `<small class="tut-go">${this.fmt(id === 'bye' ? T.finish : T.next, { k: this.key('next') })}</small>` : '')
      + `<i class="tut-bar"><span style="width:${Math.round((this.i + (this.st.ok ? 1 : 0)) / STEPS.length * 100)}%"></span></i>`;
  }

  // ---------- bonecos de treino ----------
  spawnTargets() {
    const G = this.G, C = G.net?.core, P = G.player;
    if (!C || !P) return;
    C.wantBots = 3; C.balanceBots();
    this.targets = [...C.players.values()].filter(o => o.bot).slice(0, 3).map(o => o.id);
    // lugar: na frente do jogador (ou na direcao livre mais perto), 9 a 16 m, enxergando
    const eye = [P.pos[0], P.pos[1] + 1.6, P.pos[2]];
    let best = null;
    for (let k = 0; k < 16 && !best; k++) {
      const yaw = P.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
      const f = [-Math.sin(yaw), -Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)];
      const spots = [[9, -2.5], [12, 2.5], [16, 0]].map(([d, s]) => [P.pos[0] + f[0] * d + r[0] * s, P.pos[2] + f[1] * d + r[1] * s]);
      // no mesmo chao do jogador (nada de boneco em cima de telhado) e a vista
      if (spots.every(([x, z]) => standable(G.M, x, z) && Math.abs(floorAt(G.M, x, z) - P.pos[1]) < 1.2 && hasLOS(G.M, eye, [x, floorAt(G.M, x, z) + 1.2, z]))) best = { yaw, spots };
    }
    if (!best) { const f = [-Math.sin(P.yaw), -Math.cos(P.yaw)]; best = { yaw: P.yaw, spots: [[P.pos[0] + f[0] * 8, P.pos[2] + f[1] * 8], [P.pos[0] + f[0] * 11, P.pos[2] + f[1] * 11], [P.pos[0] + f[0] * 14, P.pos[2] + f[1] * 14]] }; }
    this.spots = best.spots;
    P.yaw = best.yaw; // vira o jogador pra eles
    this.targets.forEach((id, n) => this.placeTarget(id, n));
  }
  placeTarget(id, n) {
    const C = this.G.net?.core, o = C?.players.get(id), s = this.spots?.[n];
    if (!o || !s) return;
    const M = this.G.M, P = this.G.player;
    o.name = `${TXT[this.L].dummy} ${n + 1}`;
    o.pos = [s[0], floorAt(M, s[0], s[1]), s[1]]; o.vel = [0, 0, 0];
    o.yaw = P ? Math.atan2(o.pos[0] - P.pos[0], o.pos[2] - P.pos[2]) : 0;
    o.ai.think = 1e9; o.ai.target = null; o.ai.goal = null; o.ai.path = null; o.field = null; o.ready = [];
  }

  onEvent(e) {
    const G = this.G, id = STEPS[this.i], me = G.myId;
    if (e.k === 'spawn' && this.targets.includes(e.id)) setTimeout(() => this.placeTarget(e.id, this.targets.indexOf(e.id)), 0);
    if (e.k === 'kill' && e.a === me && this.targets.includes(e.v) && id === 'targets') { this.kills++; this.render(); if (this.kills >= 3) this.complete(); }
    if (e.k === 'swing' && e.id === me && id === 'melee') this.complete();
    if (e.k === 'throw' && e.id === me && id === 'nades') this.complete();
    if (e.k === 'field' && e.id === me && id === 'field') this.complete();
    if (e.k === 'streak' && e.id === me && id === 'streak') this.complete();
  }

  update(dt, inp) {
    if (!this.started || this.st.ok) return;
    const id = STEPS[this.i], P = this.G.player, st = this.st;
    if (!P) return;
    st.t += dt;
    if (INFO.has(id)) { if (inp.jumpPressed && st.t > 0.4) this.advance(); return; }
    if (id === 'look') { st.turn = (st.turn || 0) + Math.abs(P.yaw - (st.lastYaw ?? P.yaw)) + Math.abs(P.pitch - (st.lastPitch ?? P.pitch)); st.lastYaw = P.yaw; st.lastPitch = P.pitch; if (st.turn > 2.2) this.complete(); }
    if (id === 'move' && st.from && Math.hypot(P.pos[0] - st.from[0], P.pos[2] - st.from[2]) > 6) this.complete();
    if (id === 'body') {
      let ch = false;
      if (P.sprint && !st.sprint) { st.sprintT = (st.sprintT || 0) + dt; if (st.sprintT > 0.5) { st.sprint = ch = true; } }
      if (inp.jumpPressed && !st.jump) st.jump = ch = true;
      if (P.crouch && !st.crouch) st.crouch = ch = true;
      if (ch) { audio.play('ui_hover', { ui: true, vol: 0.5 }); this.render(); }
      if (st.sprint && st.jump && st.crouch) this.complete();
    }
    if (id === 'aim') { st.ads = P.adsK > 0.9 ? (st.ads || 0) + dt : 0; if (st.ads > 0.4) this.complete(); }
    if (id === 'reload' && P.reloadT > 0) this.complete();
    // bonecos sumiram (sala refeita, bot removido): monta de novo
    if (id === 'targets') { const C = this.G.net?.core; if (C && (this.targets.length < 3 || this.targets.some(t => !C.players.has(t)))) this.spawnTargets(); }
    if (id === 'swap' && P.wpn !== st.w && P.wpn !== 'melee') this.complete();
  }

  dispose() { this.el.remove(); document.body.classList.remove('tutorial'); }
}
