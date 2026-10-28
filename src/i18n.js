// Idiomas: pt e en. Texto de tela passa por t(); HTML estatico usa data-i18n.
const D = {
  pt: {
    ml_0: 'Ferrao', ml_1: 'Machadinha da Vovo', ml_2: 'Peixeira', ml_3: 'Pe de Cabra', ml_4: 'Racha-Cuca', ml_5: 'Agulhao', ml_6: 'Bico de Pato', ml_7: 'Facao', ml_8: 'Sobrevivente', ml_9: 'Quebra-Gelo', ml_10: 'Canivete', ml_11: 'Machado de Marcha', ml_12: 'Espadim', ml_13: 'Presa', ml_14: 'Machado X', eqMelee: 'Sai na faca rapida (V ou o botao de martelo)', camo_zebra: 'Zebra', camo_circus: 'Xadrez de Circo', camo_polka: 'Bolinhas', camo_newsprint: 'Jornal', camo_filmreel: 'Rolo de Filme', camo_toonfire: 'Fogo de Desenho', camo_electric: 'Eletrica', camo_hypno: 'Hipnose', camo_aquarium: 'Aquario', camo_chrome: 'Cromo Liquido', camo_phantom: 'Fantasma', camo_ember: 'Brasa (reativa)', camo_inkreact: 'Tinta Viva (reativa)', reacted: 'A camuflagem reagiu! Estagio {n}', cg_static: 'Estaticas', cg_anim: 'Animadas', cg_react: 'Reativas (evoluem com abates)', hudEdit: 'Ajustar HUD e botoes', heSize: 'Tamanho', heAlpha: 'Opacidade', heReset: 'Restaurar', heSave: 'Salvar', heHint: 'Arraste qualquer botao ou o analogico pra onde preferir.', challenges: 'Desafios', chDaily: 'Do dia', chCareer: 'Carreira', chReset: 'Novos em {n} h', chDoneStamp: 'feito', chMax: 'Completo', chT0: 'Bronze', chT1: 'Prata', chT2: 'Ouro', chDoneDaily: 'Desafio do dia completo!', chDoneCareer: 'Carreira {t} completa!', ch_kills: 'Derrube {n} inimigos', ch_head: 'Acerte a cuca {n} vezes', ch_melee: 'Derrube {n} com lamina', ch_pistol: '{n} abates com {w}', ch_smg: '{n} abates com {w}', ch_rifle: '{n} abates com {w}', ch_shotgun: '{n} abates com {w}', ch_sniper: '{n} abates com {w}', ch_nade: '{n} abates de granada', ch_assist: '{n} assistencias', ch_streak: 'Chame {n} sequencias', ch_win: 'Venca {n} partidas', ch_matches: 'Jogue {n} partidas', chCareerU: 'Desbloqueios', chReward: 'Libera', reqCh: 'Desafio', chUnlocked: 'Desafio completo! Liberou', ch_u_ember: 'Derrube {n} inimigos', ch_u_inkreact: 'Acerte {n} cabecadas', ch_u_sscope: '{n} cabecadas de luneta', ch_u_fscope: '{n} abates de fuzil', ch_u_handcannon: '{n} abates de pistola', ch_u_spitter: '{n} abates de submetralhadora', ch_u_heavy: '{n} abates de fuzil', ch_u_bolt: '{n} abates de sniper', ch_u_splitter: '{n} abates com lamina', ch_u_sword: '{n} abates com lamina', ch_u_fang: 'Chame {n} sequencias', slot_tracer: 'Tracado', ch_u_tr_fire: '{n} abates de escopeta', ch_u_tr_ink: '{n} assistencias', ch_u_tr_spark: '{n} abates de submetralhadora', ch_u_tr_rainbow: 'Venca {n} partidas', ch_u_tr_void: 'Acerte {n} cabecadas', ch_u_tr_toxic: '{n} abates de granada', ch_u_tr_gold: 'Chame {n} sequencias', ch_u_tr_ice: '{n} abates de sniper', chQueue: '+{n} na fila (liberados {d} de {t}). Fechou um, entra o proximo.', chAllDone: 'Tudo liberado!', reqQueue: 'Desafio na fila', installApp: 'Instalar app', pickNext: 'Arma no proximo renascimento', nextSpawn: 'Volta com {w} no proximo renascimento', unlPart: 'Nova peca liberada: {w}', unlCamo: 'Nova camuflagem: {w}', fm_auto: 'Automatica', fm_semi: 'Semi', fm_burst: 'Rajada de {n}', fm_bolt: 'Ferrolho', s_tracer: 'Tracado do tiro', tr_chalk: 'Giz', tr_fire: 'Fogo', tr_ink: 'Tinta', tr_spark: 'Faisca', tr_rainbow: 'Arco-iris', tr_none: 'Nenhum', tr_void: 'Vazio roxo', tr_toxic: 'Toxico', tr_gold: 'Ouro', tr_ice: 'Gelo', respawn: 'Renascer', autoIn: 'Toque pra voltar (sozinho em {n})', lbCast: 'Elenco da sessao', lbLeave: 'Sair do lobby', lbReady: 'Estou pronto', lbUnready: 'Ainda nao', lbYou: 'voce', lbBot: 'bot', lbReadyStamp: 'pronto',
    rovexStrip: 'Mais jogos como este na Rovex', gateText: 'Entre com a sua conta Rovex pra jogar. Seu nivel, suas armas e seus desafios ficam salvos nela.', gateGo: 'Entrar com a Rovex', gateNew: 'Ainda nao tem conta?', gateCreate: 'Crie gratis na Rovex', lbStart: 'Iniciar partida', lbHost: 'host', lbHostHint: 'Voce e o host. Chame quem quiser e inicie quando der.', lbWaitHost: 'Esperando o host iniciar', lbRoomLbl: 'Sala', copyCode: 'Copiar codigo', copied: 'Codigo copiado', lbInvite: 'Convidar amigos', inviteTitle: 'Chamar pra sala', inviteBtn: 'Chamar', inviteSent: 'Chamado', inviteNone: 'Voce ainda nao tem amigos na Rovex. Passe o codigo da sala pra quem quiser entrar.', inviteErr: 'Nao deu pra carregar seus amigos. Passe o codigo da sala.', inviteLoading: 'Buscando seus amigos...', online: 'online', close: 'Fechar', haveCode: 'Tem um codigo?', joinCode: 'Entrar', newRoom: 'Ou monte a sua sala', createRoom: 'Criar sala', playingAs: 'Jogando como {n}', guestHint: 'Entre na sua conta Rovex pra chamar amigos e guardar o progresso.', codeEmpty: 'Digite o codigo que te passaram.', noRoom: 'Nenhuma sala com o codigo {c}. Confira com quem te chamou.', mpDown: 'O servidor nao respondeu. Tente de novo em alguns segundos.', 
    lbWait: 'Esperando {n} jogador(es) dar pronto', lbAllSet: 'Todo mundo pronto', lbGo: 'Comecando em {n}', lvlShort: 'nv {n}',
    lbJoin: 'Entrando no meio da partida', ldLoading: 'Montando o cenario',
    tip1: 'Correndo, aperte agachar pra entrar de carrinho e sair do tiro.', tip2: 'Mirando, o recuo cai pela metade. No quadril, o laser ajuda.',
    tip3: 'Pente maior aguenta mais, mas a recarga e a mira ficam lentas.', tip4: 'Sniper sem mirar nunca acerta o meio da mira.',
    tip5: 'Correndo voce nao atira: solte o correr um instante antes de virar a esquina.', tip6: 'Aperte I pra inspecionar a arma.',
    tip7: 'Granada perto pisca na tela. Saia do raio.', tip8: 'Cada abate sobe o nivel da arma e libera pecas e camuflagens.',
    tip9: 'Na dominacao, ficar em cima da bandeira conta mais que matar.', tip10: 'Laser tatico entrega sua posicao. Use quando for pra perto.',
    presents: 'A Fokus Studios apresenta', tagline: 'Um tiroteio de borracha na Vila Borracha',
    play: 'Jogar', multiplayer: 'Multiplayer', arsenal: 'Arsenal', settings: 'Ajustes', controls: 'Controles', back: 'Voltar',
    pickShow: 'Escolha o espetaculo', botsIn: 'Bots na vila', botAim: 'Pontaria dos bots', easy: 'Molenga', mid: 'Esperto', hard: 'Afiado', curtains: 'Abrir as cortinas',
    mpHint: 'Rode npm run server no PC. No celular, use o mesmo Wi-Fi e abra o endereco de rede do PC.',
    yourName: 'Seu nome', roomCode: 'Codigo da sala', server: 'Servidor', botsFill: 'Bots completando a sala', joinRoom: 'Entrar na sala',
    mpFail: 'Confira se o servidor esta rodando (npm run server) e se o endereco esta certo.',
    teams: 'Em times', solo: 'Cada um por si',
    k_move: 'Andar', k_sprint: 'Correr (segurar)', k_tac: 'Disparada: toque duplo enquanto corre', k_jump: 'Pular. No ar, pula de novo.',
    k_crouch: 'Agachar. Correndo, entra de carrinho.', k_fire: 'Atirar', k_ads: 'Mirar', k_reload: 'Recarregar', k_swap: 'Trocar de arma',
    k_last: 'Arma anterior', k_frag: 'Granada de fragmentacao', k_flash: 'Granada de flash', k_streak: 'Usar sequencia de abates', k_board: 'Placar', k_pause: 'Pausa', key_lmb: 'Botao esquerdo', key_rmb: 'Botao direito', key_space: 'Espaco', key_wheel: '1 a 8, rodinha',
    intermission: 'Intervalo', resume: 'Voltar pro tiroteio', quit: 'Sair pro menu', theEnd: 'Fim', pancake: 'Virou panqueca!',
    rotate: 'Vire o celular de lado pra jogar.',
    s_fov: 'Campo de visao', s_sens: 'Sensibilidade', s_adsSens: 'Sensibilidade mirando', s_vmFov: 'Campo de visao da arma', s_master: 'Volume geral',
    s_music: 'Musica', s_sfx: 'Efeitos', s_grain: 'Grao e riscos do filme', s_res: 'Resolucao', s_film: 'Pelicula', film_color: 'Colorida a mao', film_bw: 'Preto e branco',
    s_tac: 'Disparada', tac_double: 'Shift duas vezes', tac_alt: 'Tecla Alt', s_invert: 'Inverter eixo vertical', s_hold: 'Agachar segurando', s_auto: 'Correr sempre',
    s_fps: 'Mostrar quadros por segundo', s_lang: 'Idioma', peekNote: 'Previa: item bloqueado, da pra ver mas nao equipar', s_aimAssist: 'Mira assistida', s_autoFire: 'Tiro automatico',
    slot_body: 'Corpo', slot_scope: 'Mira', slot_charger: 'Carregador', slot_handle: 'Empunhadura', slot_laser: 'Laser', slot_paint: 'Pintura (parte verde)', slot_accent: 'Destaque',
    slot_camo: 'Camuflagem', animated: 'Animada', reqWpn: 'Arma nivel {n}', reqPlayer: 'Jogador nivel {n}', reqBoth: 'Jogador {p} + arma {w}',
    wpnLevel: 'Arma nivel {n}', playerLevel: 'Nivel do jogador', maxed: 'Nivel maximo', s_unlockAll: 'Desbloquear tudo (teste)',
    camo_none: 'Sem camuflagem', camo_tiger: 'Tigre', camo_digital: 'Digital', camo_forest: 'Floresta', camo_urban: 'Urbano', camo_gold: 'Ouro Polido', camo_diamond: 'Diamante',
    camo_ink: 'Tinta Viva', camo_lava: 'Lava', camo_neonice: 'Gelo Neon', camo_rainbow: 'Arco-Iris', camo_aether: 'Eter Sombrio', camo_void: 'Vazio Estelar',
    xp_assist: 'Assistencia', b_assists: 'Assist.', xp_kill: 'Nocaute', xp_head: 'Na cuca', xp_streak: 'Sequencia', xp_flagCap: 'Bandeira capturada', xp_flagReturn: 'Bandeira devolvida', xp_zone: 'Ponto tomado', xp_win: 'Vitoria', xp_match: 'Partida jogada',
    levelUp: 'Subiu pro nivel {n}!', wpnUp: '{w} subiu pro nivel {n}!', unlocked: 'Desbloqueou: {s}', xpTotal: '+{n} XP nesta partida',
    mapLabel: 'Mapa', map_auto: 'Automatico', map_vila: 'Vila', map_fabrica: 'Fabrica', map_fronteira: 'Fronteira',
    roomsLoading: 'Procurando salas...', roomsOff: 'Servidor desligado. Rode npm run server no PC.', roomsOpen: 'Salas abertas', roomsNone: 'Nenhuma sala aberta. Crie uma abaixo.', refresh: 'Atualizar', roomPeople: '{h} pessoas, {n} no total',
    reconnecting: 'Reconectando... tentativa {n}', reconnected: 'De volta na sala',
    slot_ret: 'Reticula', retColor: 'Cor',
    ret_auto: 'Padrao da mira', ret_none: 'Precisa de uma mira', ret_dot: 'Ponto', ret_cross: 'Cruz', ret_circle: 'Circulo', ret_chevron: 'Chevron', ret_tee: 'T', ret_duplex: 'Duplex', ret_mildot: 'Mil-dot',
    n_frag: 'Granada', n_flash: 'Flash', s_uav: 'Radar Espiao', s_anvil: 'Chuva de Bigornas', s_blimp: 'Dirigivel',
    streakReady: '{s} pronto! Aperte X', streakAlly: '{n} chamou {s}!', streakEnemy: 'Inimigo chamou {s}!', streakNext: 'Sequencia em {n}',
    w_frag: 'Granada', w_anvil: 'Bigorna', w_blimp: 'Dirigivel', w_fall: 'queda',
    eqPrimary: 'Equipar {w} como principal', eqDone: '{w} equipada como principal', eqSecondary: '{w} vai sempre como secundaria',
    original: 'Original', free: 'Livre', loadingGuns: 'Os modelos das armas ainda estao carregando. Volte em um instante.',
    iron: 'Mira de ferro', noGrip: 'Sem empunhadura', noLaser: 'Sem laser', laserDot: 'Laser compacto', laserTac: 'Laser tatico', stdPart: 'Padrao', model: 'modelo', scopeBig: 'Luneta', scopeDot: 'Ponto vermelho', long: 'longa', mag: 'Pente', grip: 'Punho', origTag: 'original',
    st_dmg: 'Dano', st_rate: 'Cadencia', st_acc: 'Precisao', st_ctrl: 'Controle', st_ads: 'Mira rapida', st_mag: 'Pente', st_zoom: 'Zoom', st_reload: 'Recarga', st_move: 'Mobilidade', st_hip: 'Tiro de quadril',
    h_you: 'Voce', h_time: 'Tempo', h_goal: 'Meta', h_leader: 'Lider', h_weapon: 'Arma', h_red: 'Vermelhos', h_blue: 'Azuis', h_caps: 'Capturas pra vencer',
    b_player: 'Jogador', b_step: 'Degrau', b_kills: 'Nocautes', b_deaths: 'Quedas', b_score: 'Pontos', bot: 'bot',
    o_carry: 'Leve!', o_taken: 'Pegaram', o_drop: 'Caiu', o_base: 'Sua base', qps: 'qps',
    youCap: 'Voce', fall: 'queda', f_head: 'acertou a cuca de', f_kill: 'nocauteou', f_self: 'se achatou sozinho',
    killWords: ['NOCAUTE!', 'PANQUECA!', 'ACHATADO!', 'FORA!'], headTag: 'Na cuca',
    streak: { 2: 'Dois de uma vez', 3: 'Tres seguidos', 5: 'Imparavel', 7: 'Furacao de tinta', 10: 'Lenda da vila' },
    killedYou: '{n} te nocauteou', selfKill: 'Voce caiu sozinho', backIn: 'De volta em {n}',
    newGun: 'Nova arma: {w}', gotGun: 'Pegou {w}',
    flagRed: 'vermelha', flagBlue: 'azul', fl_take: '{w} pegou a bandeira {t}', fl_drop: 'A bandeira {t} caiu', fl_return: 'A bandeira {t} voltou pra base', fl_cap: '{w} capturou a bandeira {t}!',
    zoneTaken: 'Ponto {z} agora e dos {t}', joined: '{n} entrou na vila',
    winRed: 'Vitoria dos Vermelhos', winBlue: 'Vitoria dos Azuis', draw: 'Empate na vila', winName: '{n} levou a taca', endKills: '{n} nocautes', nextIn: 'Proxima sessao em {n} s',
    connLost: 'A conexao com o servidor caiu.',
    t_fire: 'Atirar', t_ads: 'Mirar', t_jump: 'Pular', t_crouch: 'Agachar', t_reload: 'Recarga', t_swap: 'Trocar', t_tac: 'Disparada', t_pause: 'Pausa', t_frag: 'Granada', t_flash: 'Flash', t_streak: 'Sequencia', t_inspect: 'Inspecionar', t_melee: 'Faca',
    w: { pan: 'Frigideira', pistol: 'Estalo', smg: 'Matraca', rifle: 'Trovao', shotgun: 'Bacamarte', minigun: 'Moedor', sniper: 'Luneta', rocket: 'Bum-Bum', melee: 'Lamina' },
    m: { ffa: 'Contra Todos', tdm: 'Mata-Mata', gungame: 'Escada de Armas', ctf: 'Captura a Bandeira', dom: 'Dominacao' },
    md: { ffa: 'Cada um por si. Quem chegar a 20 nocautes leva.', tdm: 'Vermelhos contra azuis. 40 nocautes do time vencem.', gungame: 'Cada nocaute troca seu modelo de arma: 16 degraus, da pistola ao canhao de mao.', ctf: 'Roube a bandeira deles e traga pra sua base. 3 capturas.', dom: 'Segure os pontos A, B e C. Cada ponto rende pontos por segundo.' },
  },
  en: {
    ml_0: 'Stinger', ml_1: 'Granny Hatchet', ml_2: 'Fish Knife', ml_3: 'Crowbar', ml_4: 'Skull Splitter', ml_5: 'Big Needle', ml_6: 'Duckbill', ml_7: 'Machete', ml_8: 'Survivor', ml_9: 'Ice Breaker', ml_10: 'Pocket Knife', ml_11: 'Marching Axe', ml_12: 'Shortsword', ml_13: 'Fang', ml_14: 'X Axe', eqMelee: 'Used for quick melee (V or the hammer button)', camo_zebra: 'Zebra', camo_circus: 'Circus Check', camo_polka: 'Polka Dots', camo_newsprint: 'Newsprint', camo_filmreel: 'Film Reel', camo_toonfire: 'Toon Fire', camo_electric: 'Electric', camo_hypno: 'Hypno', camo_aquarium: 'Aquarium', camo_chrome: 'Liquid Chrome', camo_phantom: 'Phantom', camo_ember: 'Ember (reactive)', camo_inkreact: 'Living Ink (reactive)', reacted: 'Camo reacted! Stage {n}', cg_static: 'Static', cg_anim: 'Animated', cg_react: 'Reactive (evolve with kills)', hudEdit: 'Adjust HUD and buttons', heSize: 'Size', heAlpha: 'Opacity', heReset: 'Reset', heSave: 'Save', heHint: 'Drag any button or the stick wherever you like.', challenges: 'Challenges', chDaily: 'Today', chCareer: 'Career', chReset: 'New ones in {n} h', chDoneStamp: 'done', chMax: 'Complete', chT0: 'Bronze', chT1: 'Silver', chT2: 'Gold', chDoneDaily: 'Daily challenge complete!', chDoneCareer: '{t} career tier complete!', ch_kills: 'Knock out {n} enemies', ch_head: 'Land {n} headshots', ch_melee: '{n} blade knockouts', ch_pistol: '{n} knockouts with the {w}', ch_smg: '{n} knockouts with the {w}', ch_rifle: '{n} knockouts with the {w}', ch_shotgun: '{n} knockouts with the {w}', ch_sniper: '{n} knockouts with the {w}', ch_nade: '{n} grenade knockouts', ch_assist: '{n} assists', ch_streak: 'Call in {n} streaks', ch_win: 'Win {n} matches', ch_matches: 'Play {n} matches', chCareerU: 'Unlocks', chReward: 'Unlocks', reqCh: 'Challenge', chUnlocked: 'Challenge complete! Unlocked', ch_u_ember: 'Knock out {n} enemies', ch_u_inkreact: 'Land {n} headshots', ch_u_sscope: '{n} sniper headshots', ch_u_fscope: '{n} rifle knockouts', ch_u_handcannon: '{n} pistol knockouts', ch_u_spitter: '{n} SMG knockouts', ch_u_heavy: '{n} rifle knockouts', ch_u_bolt: '{n} sniper knockouts', ch_u_splitter: '{n} blade knockouts', ch_u_sword: '{n} blade knockouts', ch_u_fang: 'Call in {n} streaks', slot_tracer: 'Tracer', ch_u_tr_fire: '{n} shotgun knockouts', ch_u_tr_ink: '{n} assists', ch_u_tr_spark: '{n} SMG knockouts', ch_u_tr_rainbow: 'Win {n} matches', ch_u_tr_void: 'Land {n} headshots', ch_u_tr_toxic: '{n} grenade knockouts', ch_u_tr_gold: 'Call in {n} streaks', ch_u_tr_ice: '{n} sniper knockouts', chQueue: '+{n} queued ({d} of {t} unlocked). Finish one and the next comes in.', chAllDone: 'Everything unlocked!', reqQueue: 'Challenge queued', installApp: 'Install app', pickNext: 'Weapon on next respawn', nextSpawn: '{w} on your next respawn', unlPart: 'New attachment: {w}', unlCamo: 'New camo: {w}', fm_auto: 'Full auto', fm_semi: 'Semi-auto', fm_burst: '{n}-round burst', fm_bolt: 'Bolt-action', s_tracer: 'Bullet tracer', tr_chalk: 'Chalk', tr_fire: 'Fire', tr_ink: 'Ink', tr_spark: 'Spark', tr_rainbow: 'Rainbow', tr_none: 'None', tr_void: 'Purple void', tr_toxic: 'Toxic', tr_gold: 'Gold', tr_ice: 'Ice', respawn: 'Respawn', autoIn: 'Tap to jump back in (auto in {n})', lbCast: "Tonight's cast", lbLeave: 'Leave lobby', lbReady: "I'm ready", lbUnready: 'Not yet', lbYou: 'you', lbBot: 'bot', lbReadyStamp: 'ready',
    rovexStrip: 'More games like this on Rovex', gateText: 'Sign in with your Rovex account to play. Your level, weapons and challenges stay saved there.', gateGo: 'Sign in with Rovex', gateNew: "Don't have an account?", gateCreate: 'Create one free on Rovex', lbStart: 'Start match', lbHost: 'host', lbHostHint: "You're the host. Invite whoever you want and start when ready.", lbWaitHost: 'Waiting for the host to start', lbRoomLbl: 'Room', copyCode: 'Copy code', copied: 'Code copied', lbInvite: 'Invite friends', inviteTitle: 'Invite to room', inviteBtn: 'Invite', inviteSent: 'Invited', inviteNone: "You don't have Rovex friends yet. Share the room code with anyone who wants in.", inviteErr: "Couldn't load your friends. Share the room code instead.", inviteLoading: 'Finding your friends...', online: 'online', close: 'Close', haveCode: 'Got a code?', joinCode: 'Join', newRoom: 'Or set up your own room', createRoom: 'Create room', playingAs: 'Playing as {n}', guestHint: 'Sign in to Rovex to invite friends and keep your progress.', codeEmpty: 'Type the code you were given.', noRoom: 'No room with code {c}. Check with whoever invited you.', mpDown: "The server didn't answer. Try again in a few seconds.", 
    lbWait: 'Waiting on {n} player(s) to ready up', lbAllSet: 'Everyone is ready', lbGo: 'Starting in {n}', lvlShort: 'lv {n}',
    lbJoin: 'Joining a match in progress', ldLoading: 'Building the set',
    tip1: 'While sprinting, press crouch to slide out of fire.', tip2: 'Aiming halves the recoil. From the hip, a laser helps.',
    tip3: 'Bigger mags hold more, but reload and aim slower.', tip4: 'A sniper fired from the hip never hits dead center.',
    tip5: "You can't shoot while sprinting: let go just before the corner.", tip6: 'Press I to inspect your weapon.',
    tip7: 'A grenade nearby flashes on screen. Get out of the blast.', tip8: 'Every kill levels your weapon and unlocks parts and camos.',
    tip9: 'In Domination, standing on the flag beats chasing kills.', tip10: 'A tactical laser gives away your spot. Use it up close.',
    presents: 'Fokus Studios presents', tagline: 'A rubber shootout in Rubberville',
    play: 'Play', multiplayer: 'Multiplayer', arsenal: 'Arsenal', settings: 'Settings', controls: 'Controls', back: 'Back',
    pickShow: 'Pick tonight\'s show', botsIn: 'Bots in town', botAim: 'Bot aim', easy: 'Wobbly', mid: 'Sharp', hard: 'Deadeye', curtains: 'Raise the curtain',
    mpHint: 'Run npm run server on the PC. On a phone, join the same Wi-Fi and open the PC\'s network address.',
    yourName: 'Your name', roomCode: 'Room code', server: 'Server', botsFill: 'Bots filling the room', joinRoom: 'Join room',
    mpFail: 'Check that the server is running (npm run server) and the address is right.',
    teams: 'Teams', solo: 'Every toon for itself',
    k_move: 'Move', k_sprint: 'Sprint (hold)', k_tac: 'Tactical sprint: double tap while sprinting', k_jump: 'Jump. Jump again in the air.',
    k_crouch: 'Crouch. While sprinting, slide.', k_fire: 'Shoot', k_ads: 'Aim', k_reload: 'Reload', k_swap: 'Switch weapon',
    k_last: 'Previous weapon', k_frag: 'Frag grenade', k_flash: 'Flashbang', k_streak: 'Use killstreak', k_board: 'Scoreboard', k_pause: 'Pause', key_lmb: 'Left button', key_rmb: 'Right button', key_space: 'Space', key_wheel: '1 to 8, wheel',
    intermission: 'Intermission', resume: 'Back to the shootout', quit: 'Quit to menu', theEnd: 'The End', pancake: 'Flattened!',
    rotate: 'Turn your phone sideways to play.',
    s_fov: 'Field of view', s_sens: 'Sensitivity', s_adsSens: 'Aiming sensitivity', s_vmFov: 'Weapon field of view', s_master: 'Master volume',
    s_music: 'Music', s_sfx: 'Effects', s_grain: 'Film grain and scratches', s_res: 'Resolution', s_film: 'Film stock', film_color: 'Hand-tinted', film_bw: 'Black and white',
    s_tac: 'Tactical sprint', tac_double: 'Double Shift', tac_alt: 'Alt key', s_invert: 'Invert vertical look', s_hold: 'Hold to crouch', s_auto: 'Always sprint',
    s_fps: 'Show frames per second', s_lang: 'Language', peekNote: 'Preview: locked item, you can look but not equip', s_aimAssist: 'Aim assist', s_autoFire: 'Auto fire',
    slot_body: 'Receiver', slot_scope: 'Optic', slot_charger: 'Magazine', slot_handle: 'Grip', slot_laser: 'Laser', slot_paint: 'Paint (green parts)', slot_accent: 'Accent',
    slot_camo: 'Camo', animated: 'Animated', reqWpn: 'Weapon level {n}', reqPlayer: 'Player level {n}', reqBoth: 'Player {p} + weapon {w}',
    wpnLevel: 'Weapon level {n}', playerLevel: 'Player level', maxed: 'Max level', s_unlockAll: 'Unlock everything (testing)',
    camo_none: 'No camo', camo_tiger: 'Tiger', camo_digital: 'Digital', camo_forest: 'Forest', camo_urban: 'Urban', camo_gold: 'Polished Gold', camo_diamond: 'Diamond',
    camo_ink: 'Living Ink', camo_lava: 'Lava', camo_neonice: 'Neon Ice', camo_rainbow: 'Rainbow', camo_aether: 'Dark Aether', camo_void: 'Starfield Void',
    xp_assist: 'Assist', b_assists: 'Ast.', xp_kill: 'Knockout', xp_head: 'Headshot', xp_streak: 'Streak', xp_flagCap: 'Flag captured', xp_flagReturn: 'Flag returned', xp_zone: 'Point taken', xp_win: 'Victory', xp_match: 'Match played',
    levelUp: 'Level {n} reached!', wpnUp: '{w} reached level {n}!', unlocked: 'Unlocked: {s}', xpTotal: '+{n} XP this match',
    mapLabel: 'Map', map_auto: 'Automatic', map_vila: 'Village', map_fabrica: 'Factory', map_fronteira: 'Frontier',
    roomsLoading: 'Looking for rooms...', roomsOff: 'Server is off. Run npm run server on the PC.', roomsOpen: 'Open rooms', roomsNone: 'No open rooms. Create one below.', refresh: 'Refresh', roomPeople: '{h} people, {n} total',
    reconnecting: 'Reconnecting... attempt {n}', reconnected: 'Back in the room',
    slot_ret: 'Reticle', retColor: 'Color',
    ret_auto: 'Optic default', ret_none: 'Needs an optic', ret_dot: 'Dot', ret_cross: 'Cross', ret_circle: 'Circle', ret_chevron: 'Chevron', ret_tee: 'T', ret_duplex: 'Duplex', ret_mildot: 'Mil-dot',
    n_frag: 'Grenade', n_flash: 'Flash', s_uav: 'Spy Radar', s_anvil: 'Anvil Rain', s_blimp: 'Blimp',
    streakReady: '{s} ready! Press X', streakAlly: '{n} called in {s}!', streakEnemy: 'Enemy called in {s}!', streakNext: 'Streak in {n}',
    w_frag: 'Grenade', w_anvil: 'Anvil', w_blimp: 'Blimp', w_fall: 'fall',
    eqPrimary: 'Equip {w} as primary', eqDone: '{w} is your primary', eqSecondary: '{w} always comes as your sidearm',
    original: 'Original', free: 'Custom', loadingGuns: 'The weapon models are still loading. Check back in a moment.',
    iron: 'Iron sights', noGrip: 'No grip', noLaser: 'No laser', laserDot: 'Compact laser', laserTac: 'Tactical laser', stdPart: 'Stock', model: 'model', scopeBig: 'Scope', scopeDot: 'Red dot', long: 'long', mag: 'Mag', grip: 'Grip', origTag: 'original',
    st_dmg: 'Damage', st_rate: 'Fire rate', st_acc: 'Accuracy', st_ctrl: 'Control', st_ads: 'Aim speed', st_mag: 'Magazine', st_zoom: 'Zoom', st_reload: 'Reload', st_move: 'Mobility', st_hip: 'Hip fire',
    h_you: 'You', h_time: 'Time', h_goal: 'Goal', h_leader: 'Leader', h_weapon: 'Weapon', h_red: 'Reds', h_blue: 'Blues', h_caps: 'Captures to win',
    b_player: 'Player', b_step: 'Rung', b_kills: 'Knockouts', b_deaths: 'Flops', b_score: 'Score', bot: 'bot',
    o_carry: 'Bring it!', o_taken: 'Taken', o_drop: 'Dropped', o_base: 'Your base', qps: 'fps',
    youCap: 'You', fall: 'fall', f_head: 'bonked', f_kill: 'knocked out', f_self: 'flattened themselves',
    killWords: ['KNOCKOUT!', 'PANCAKE!', 'FLATTENED!', 'BONK!'], headTag: 'Right on the noggin',
    streak: { 2: 'Double trouble', 3: 'Three in a row', 5: 'Unstoppable', 7: 'Ink tornado', 10: 'Town legend' },
    killedYou: '{n} knocked you out', selfKill: 'You flopped on your own', backIn: 'Back in {n}',
    newGun: 'New weapon: {w}', gotGun: 'Picked up {w}',
    flagRed: 'red', flagBlue: 'blue', fl_take: '{w} grabbed the {t} flag', fl_drop: 'The {t} flag dropped', fl_return: 'The {t} flag went home', fl_cap: '{w} captured the {t} flag!',
    zoneTaken: 'Point {z} now belongs to the {t}', joined: '{n} rolled into town',
    winRed: 'Reds win', winBlue: 'Blues win', draw: 'It\'s a draw', winName: '{n} takes the trophy', endKills: '{n} knockouts', nextIn: 'Next show in {n} s',
    connLost: 'Lost the connection to the server.',
    t_fire: 'Shoot', t_ads: 'Aim', t_jump: 'Jump', t_crouch: 'Crouch', t_reload: 'Reload', t_swap: 'Swap', t_tac: 'Dash', t_pause: 'Pause', t_frag: 'Grenade', t_flash: 'Flashbang', t_streak: 'Killstreak', t_inspect: 'Inspect', t_melee: 'Melee',
    w: { pan: 'Frying Pan', pistol: 'Snapper', smg: 'Rattler', rifle: 'Thunder', shotgun: 'Blunderbuss', minigun: 'Grinder', sniper: 'Spyglass', rocket: 'Boom-Boom', melee: 'Blade' },
    m: { ffa: 'Free-for-All', tdm: 'Team Deathmatch', gungame: 'Gun Game', ctf: 'Capture the Flag', dom: 'Domination' },
    md: { ffa: 'Every toon for itself. First to 20 knockouts wins.', tdm: 'Reds against Blues. First team to 40 knockouts wins.', gungame: 'Every knockout swaps your weapon model: 16 rungs, from pistol to hand cannon.', ctf: 'Steal their flag and bring it to your base. 3 captures win.', dom: 'Hold points A, B and C. Each point scores every second.' },
  },
};

let lang = 'en';
try { lang = localStorage.getItem('rr_lang') || (navigator.language || 'en').toLowerCase().startsWith('pt') ? (localStorage.getItem('rr_lang') || 'pt') : 'en'; } catch { /* */ }
if (!D[lang]) lang = 'en';

export function getLang() { return lang; }
export function setLang(l) {
  if (!D[l]) return;
  lang = l;
  try { localStorage.setItem('rr_lang', l); } catch { /* */ }
  document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en';
  translateDom();
}
export function t(key, vars) {
  let s = D[lang][key] ?? D.en[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}
export const wName = (id) => D[lang].w[id] || id;
export const modeName = (id) => D[lang].m[id] || id;
export const modeDesc = (id) => D[lang].md[id] || '';

export function translateDom() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
