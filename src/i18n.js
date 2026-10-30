// Idiomas: pt e en. Texto de tela passa por t(); HTML estatico usa data-i18n.
const D = {
  pt: {
    ml_0: 'Ferrao', ml_1: 'Machadinha da Vovo', ml_2: 'Peixeira', ml_3: 'Pe de Cabra', ml_4: 'Racha-Cuca', ml_5: 'Agulhao', ml_6: 'Bico de Pato', ml_7: 'Facao', ml_8: 'Sobrevivente', ml_9: 'Quebra-Gelo', ml_10: 'Canivete', ml_11: 'Machado de Marcha', ml_12: 'Espadim', ml_13: 'Presa', ml_14: 'Machado X', eqMelee: 'Sai na faca rapida (V, R3 no controle ou o botao de martelo)', camo_zebra: 'Zebra', camo_circus: 'Xadrez de Circo', camo_polka: 'Bolinhas', camo_newsprint: 'Jornal', camo_filmreel: 'Rolo de Filme', camo_toonfire: 'Fogo de Desenho', camo_electric: 'Eletrica', camo_hypno: 'Hipnose', camo_aquarium: 'Aquario', camo_chrome: 'Cromo Liquido', camo_phantom: 'Fantasma', camo_ember: 'Brasa (reativa)', camo_inkreact: 'Tinta Viva (reativa)', reacted: 'A camuflagem reagiu! Estagio {n}', cg_static: 'Estaticas', cg_anim: 'Animadas', cg_react: 'Reativas (evoluem com abates)', hudEdit: 'Ajustar HUD e botoes', heSize: 'Tamanho', heAlpha: 'Opacidade', heReset: 'Restaurar', heSave: 'Salvar', heHint: 'Arraste qualquer botao ou o analogico pra onde preferir.', challenges: 'Desafios', chDaily: 'Do dia', chCareer: 'Carreira', chReset: 'Novos em {n} h', chDoneStamp: 'feito', chMax: 'Completo', chT0: 'Bronze', chT1: 'Prata', chT2: 'Ouro', chDoneDaily: 'Desafio do dia completo!', chDoneCareer: 'Carreira {t} completa!', ch_kills: 'Derrube {n} inimigos', ch_head: 'Acerte a cuca {n} vezes', ch_melee: 'Derrube {n} com lamina', ch_pistol: '{n} abates com {w}', ch_smg: '{n} abates com {w}', ch_rifle: '{n} abates com {w}', ch_shotgun: '{n} abates com {w}', ch_sniper: '{n} abates com {w}', ch_nade: '{n} abates de granada', ch_assist: '{n} assistencias', ch_streak: 'Chame {n} sequencias', ch_win: 'Venca {n} partidas', ch_matches: 'Jogue {n} partidas', chCareerU: 'Desbloqueios', chReward: 'Libera', reqCh: 'Desafio', chUnlocked: 'Desafio completo! Liberou', ch_u_ember: 'Derrube {n} inimigos', ch_u_inkreact: 'Acerte {n} cabecadas', ch_u_sscope: '{n} cabecadas de luneta', ch_u_fscope: '{n} abates de fuzil', ch_u_handcannon: '{n} abates de pistola', ch_u_spitter: '{n} abates de submetralhadora', ch_u_heavy: '{n} abates de fuzil', ch_u_bolt: '{n} abates de sniper', ch_u_splitter: '{n} abates com lamina', ch_u_sword: '{n} abates com lamina', ch_u_fang: 'Chame {n} sequencias', slot_tracer: 'Tracado', ch_u_tr_fire: '{n} abates de escopeta', ch_u_tr_ink: '{n} assistencias', ch_u_tr_spark: '{n} abates de submetralhadora', ch_u_tr_rainbow: 'Venca {n} partidas', ch_u_tr_void: 'Acerte {n} cabecadas', ch_u_tr_toxic: '{n} abates de granada', ch_u_tr_gold: 'Chame {n} sequencias', ch_u_tr_ice: '{n} abates de sniper', chQueue: '+{n} na fila (liberados {d} de {t}). Fechou um, entra o proximo.', chAllDone: 'Tudo liberado!', reqQueue: 'Desafio na fila', installApp: 'Instalar app', pickNext: 'Arma no proximo renascimento', nextSpawn: 'Volta com {w} no proximo renascimento', unlPart: 'Nova peca liberada: {w}', unlCamo: 'Nova camuflagem: {w}', fm_auto: 'Automatica', fm_semi: 'Semi', fm_burst: 'Rajada de {n}', fm_bolt: 'Ferrolho', s_tracer: 'Tracado do tiro', tr_chalk: 'Giz', tr_fire: 'Fogo', tr_ink: 'Tinta', tr_spark: 'Faisca', tr_rainbow: 'Arco-iris', tr_none: 'Nenhum', tr_void: 'Vazio roxo', tr_toxic: 'Toxico', tr_gold: 'Ouro', tr_ice: 'Gelo', respawn: 'Renascer', autoIn: 'Toque pra voltar (sozinho em {n})', lbCast: 'Elenco da sessao', lbLeave: 'Sair do lobby', lbReady: 'Estou pronto', lbUnready: 'Ainda nao', lbYou: 'voce', lbBot: 'bot', lbReadyStamp: 'pronto',
    rovexStrip: 'Mais jogos como este na Rovex', gateText: 'Entre com a sua conta Rovex pra jogar. Seu nivel, suas armas e seus desafios ficam salvos nela.', gateGo: 'Entrar com a Rovex', gateNew: 'Ainda nao tem conta?', gateCreate: 'Crie gratis na Rovex', lbStart: 'Iniciar partida', lbHost: 'host', lbHostHint: 'Voce e o host. Chame quem quiser e inicie quando der.', lbWaitHost: 'Esperando o host iniciar', lbRoomLbl: 'Sala', copyCode: 'Copiar codigo', copied: 'Codigo copiado', lbInvite: 'Convidar amigos', inviteTitle: 'Chamar pra sala', inviteBtn: 'Chamar', inviteSent: 'Chamado', inviteNone: 'Voce ainda nao tem amigos na Rovex. Passe o codigo da sala pra quem quiser entrar.', inviteErr: 'Nao deu pra carregar seus amigos. Passe o codigo da sala.', inviteLoading: 'Buscando seus amigos...', online: 'online', close: 'Fechar', haveCode: 'Tem um codigo?', joinCode: 'Entrar', newRoom: 'Ou monte a sua sala', createRoom: 'Criar sala', playingAs: 'Jogando como {n}', guestHint: 'Entre na sua conta Rovex pra chamar amigos e guardar o progresso.', codeEmpty: 'Digite o codigo que te passaram.', noRoom: 'Nenhuma sala com o codigo {c}. Confira com quem te chamou.', roomFull: 'A sala {c} esta cheia (16 jogadores). Monte a sua ou espere abrir vaga.', mpDown: 'O servidor nao respondeu. Tente de novo em alguns segundos.', mpBusy: 'Os servidores estao lotados agora. Entre numa sala que ja existe ou tente de novo em alguns minutos.', 
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
    epTitle: 'Rovex Elite', epSub: 'Camo e selo exclusivos', epOn: 'Voce e Elite: XP em dobro', epChip: 'XP 2x', epChipOn: 'Ativo',
    fsOn: 'Tela cheia', fsOff: 'Sair da tela cheia', igTitle: 'Instalar o Rubber Riot', igOk: 'Entendi', igOpen: 'Abrir o jogo no Chrome',
    igAndroid: ['Abra o menu do Chrome (os tres pontinhos no canto de cima)', 'Toque em "Instalar app" ou "Adicionar a tela inicial"', 'Pronto: o jogo vira um icone no celular e abre em tela cheia'],
    igIos: ['Abra este site no Safari', 'Toque em Compartilhar (o quadrado com a seta pra cima)', 'Escolha "Adicionar a Tela de Inicio" e confirme'],
    igPc: ['No Chrome ou no Edge, clique no icone de instalar no fim da barra de endereco (o monitor com a setinha)', 'Ou abra o menu (tres pontinhos) > "Transmitir, salvar e compartilhar" > "Instalar pagina como app"'],
    igRovex: ['Aqui dentro da Rovex o jogo ja roda direto, sem instalar', 'Pra ter o app separado no celular ou no PC, abra o site do jogo no Chrome', 'La, toque em "Instalar app" no menu inicial'],
    skTab: 'Skills', skSlot: 'Slot {n}', skFree: 'Livre', skLvl: 'Nivel {n}', skHint: 'Duas skills ao mesmo tempo. Toque num slot pra escolher qual trocar, depois numa skill.', skOff: 'Toque de novo pra tirar',
    ch_u_ww_stg: '{n} cabecadas de fuzil', ch_u_ww_garand: '{n} abates de sniper', ch_u_ww_thompson: 'Derrube 3 em 4 s, {n} vezes', ch_u_ww_ppsh: '{n} abates de submetralhadora', ch_u_ww_1911: '{n} abates de pistola', ch_u_ww_c96: '{n} cabecadas de pistola', ch_u_ww_tt: 'Venca {n} partidas', 
    slot_ammo: 'Municao', am_none: 'Normal', amd_none: 'Bala comum, sem truque', am_fire: 'Flamejante', amd_fire: 'O alvo pega fogo: mais 14 de dano em 2 s', am_trace: 'Tracante', amd_trace: 'Quem voce acerta aparece no seu minimapa por 3 s', am_boom: 'Explosiva', amd_boom: 'Estoura no alvo e respinga em quem estiver perto', am_ap: 'Perfurante', amd_ap: 'Atravessa parede fina (com 75% do dano)', am_up_burn: 'Queima', am_up_mark: 'Marca no mapa', am_up_splash: 'Respingo', am_up_pierce: 'Atravessa parede', ch_u_am_fire: 'Derrube {n} inimigos', ch_u_am_trace: '{n} assistencias', ch_u_am_boom: '{n} abates de granada', ch_u_am_ap: 'Acerte {n} cabecadas', 
    t_field: 'Equipamento', skField: 'Equipamento de campo', skFieldHint: 'Um por vez. Use com Z, direcional pra direita ou o botao na tela; recarrega sozinho.', fdCd: '(recarga {n} s)', fieldReady: '{w} pronto!', kc_who: '{n} te viu...', kc_shot: '{w}, de {d} m', kc_you: '...e voce virou panqueca', kc_head: 'NA CUCA!', fieldFail: 'Mire num chao a vista (mais perto)', fd_umbrella: 'Guarda-chuva', fdd_umbrella: 'Abre na frente por 5 s e segura tiro e soco que vem de frente.', fd_spring: 'Mola', fdd_spring: 'Trampolim no chao por 20 s: quem pisa voa alto.', fd_hole: 'Buraco Portatil', fdd_hole: 'Um buraco no seu pe e outro onde voce mira: entra num, sai no outro.', fd_anvil: 'Bigorna', fdd_anvil: 'Cai do ceu no ponto que voce mira.', 
    prestN: 'Prestigio {n}', prestGo: 'Prestigio: voltar pro nivel 1 e ganhar uma estrela', prestSure: 'Certeza? Toque de novo (armas, camos e skills continuam)', prestStamp: 'Prestigio {n}!', prestCamo: 'Camo Prestigio liberada em todas as armas', camo_prestigio: 'Prestigio', 
    tipOk: 'Toque pra fechar', tip_br: 'Ultimo de Pe', tipd_br: 'Voce nasce so no soco (3 socos derrubam). Pegue arma, colete e leite no chao e fique dentro da iris. Ninguem renasce.', tip_iris: 'A iris esta fechando', tipd_iris: 'O circulo claro no minimapa e a proxima zona. Fora dela a pelicula queima e voce perde vida.', tip_armor: 'Colete', tipd_armor: 'A barra listrada embaixo da vida e o colete: ele segura 70% do dano ate acabar.', tip_crate: 'Caixote do dirigivel', tipd_crate: 'Traz o Moedor e enche o colete. Todo mundo ve o caixote cair, entao chegue rapido.', tip_swap: 'Duas principais', tipd_swap: 'Voce leva 2 armas principais e a pistola. Pra trocar, segure o botao de usar em cima da arma no chao.', tip_field: 'Equipamento de campo', tipd_field: 'Seu equipamento sai com Z (direcional pra direita no controle, botao com o icone no celular) e recarrega sozinho.', tip_ammo: 'Bala especial', tipd_ammo: 'Sua arma esta com municao especial. Cada uma ganha uma coisa e perde outra: veja no Arsenal, peca Municao.', tip_skills: 'Skills', tipd_skills: 'Duas skills ficam ligadas o tempo todo. Embaixo, escolha um equipamento de campo pra usar na partida.', 
    ring_wait: 'Indo pro Ringue de Boxe!', ring_waitSub: 'Esperando um adversario: quem ganhar no soco volta pra ilha', ring_go: 'Ringue de Boxe!', ring_vs: '{a} x {b}: so no soco, quem ganhar volta', ring_back: 'De volta pra ilha!', ring_backSub: 'Voce ganhou no soco e voltou de balao, com uma pistola', tip_ring: 'Ringue de Boxe', tipd_ring: 'Na primeira queda voce ganha uma chance: luta 1 contra 1 no soco. Quem ganhar volta pra ilha de balao.', 
    sk_maos: 'Mao Leve', skd_maos: 'Recarrega 25% e troca de arma 30% mais rapido', sk_mola: 'Perna de Mola', skd_mola: 'Pula 30% mais alto', sk_borracha: 'Corpo de Borracha', skd_borracha: 'Anda e corre 8% mais rapido',
    sk_catador: 'Catador', skd_catador: 'Cada abate devolve um pente da arma na mao', sk_lince: 'Olho de Lince', skd_lince: 'Mira 25% mais rapido e com 15% menos recuo', sk_sangue: 'Sangue Frio', skd_sangue: 'Abaixo de 35 de vida, recarrega e mira 30% mais rapido',
    sk_bolso: 'Bolso Fundo', skd_bolso: '+1 granada de cada tipo e 30% mais municao', sk_cuca: 'Cuca Dura', skd_cuca: 'Cabecada em voce tira bem menos vida', sk_couro: 'Couro Grosso', skd_couro: '30% menos dano de explosao',
    sk_pano: 'Pe de Pano', skd_pano: 'Seus tiros nao chamam os bots', sk_folego: 'Folego de Gato', skd_folego: 'A vida volta sozinha depois de 4 s sem levar dano', sk_pavio: 'Pavio Curto', skd_pavio: 'Sequencias custam um abate a menos',
    ww_sniper_3: 'Ping Velho', ww_fusil_9: 'Trovao de Lata', ww_subfusil_11: 'Maquina de Escrever', ww_subfusil_12: 'Tamborzao', ww_pistol_7: 'Quarenta e Cinco', ww_pistol_8: 'Cabo de Vassoura', ww_pistol_9: 'Estrelinha',
    sideTitle: 'Escolha seu lado', sideAtk: 'Ataque', sideAtkTip: 'Leva a bomba e planta no A ou no B', sideDef: 'Defesa', sideDefTip: 'Segura o A e o B e desarma a bomba', sideCount: '{n} de {max} pessoas', sideNote: 'No intervalo os lados trocam', sideSwap: 'Trocar lado',
    eliteOnly: 'Exclusiva do Elite Rovex', camo_hexelite: 'Favo Elite (reativa)', eliteTag: 'Elite Rovex',
    gsParts: 'Pecas', gsStats: 'Status', slot_bp: 'Variante', bpNone: 'Montagem livre', bpNoneSub: 'Voce escolhe cada peca', bpSub: 'Ja montada, com {c}', bpToday: 'Elite de hoje: {c}', bpLocked: 'Sai num desafio de elite',
    bp_faisca: 'Faisca de Palco', bp_fornalha: 'Fornalha', bp_pararaios: 'Para-Raios', bp_grandefinal: 'Grande Final', bp_matabarrao: 'Mata-Borrao',
    camo_hellfire: 'Inferno de Palco', camo_tesla: 'Bobina Tesla', camo_inkwell: 'Poco de Nanquim', camo_marquee: 'Letreiro', cg_legend: 'Lendarias (desafio de elite)',
    elTitle: 'Elite do dia', elDone: 'Elite completo! Liberou', elReward: 'Libera: {v} ({w}) com {c}', elAllBp: 'Todas as variantes na mao: vale o XP',
    el_e_head: 'Acerte {n} cabecadas', el_e_streak: 'Sequencia de {n} sem cair', el_e_multi: 'Derrube 3 em 4 s, {n} vezes', el_e_melee: 'Derrube {n} com lamina', el_e_sniperhead: '{n} cabecadas de sniper', el_e_wins: 'Venca {n} partidas ou rodadas', el_e_nuke: 'Chame a Torta Atomica', el_e_kills: 'Derrube {n} inimigos',
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
    n_frag: 'Granada', n_flash: 'Flash', s_uav: 'Radar Espiao', s_anvil: 'Chuva de Bigornas', s_blimp: 'Dirigivel', s_nuke: 'Torta Atomica', w_nuke: 'Torta Atomica',
    nukeYou: 'Voce pediu a Torta Atomica!', nukeYouSub: 'Cai do ceu em {t} s. Fica de olho.', nukeEnemy: '{n} pediu a Torta Atomica!', nukeEnemySub: 'Cai do ceu em {t} s. Nao tem onde se esconder.', nukeAlly: '{n} pediu a Torta Atomica!', nukeAllySub: 'Cai do ceu em {t} s. Todo inimigo vai pro chao.', nukeHit: 'TORTADA!', nukeHitSub: '{n} derrubados de uma vez',
    streakReady: 'Liberou: {s}! {k}', how_kb: 'Aperte X', how_pad: 'Aperte pra cima no direcional', how_touch: 'Toque no botao da estrela', streakAlly: '{n} chamou {s}!', streakEnemy: 'Inimigo chamou {s}!', streakNext: 'Sequencia em {n}',
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
    ml_0: 'Stinger', ml_1: 'Granny Hatchet', ml_2: 'Fish Knife', ml_3: 'Crowbar', ml_4: 'Skull Splitter', ml_5: 'Big Needle', ml_6: 'Duckbill', ml_7: 'Machete', ml_8: 'Survivor', ml_9: 'Ice Breaker', ml_10: 'Pocket Knife', ml_11: 'Marching Axe', ml_12: 'Shortsword', ml_13: 'Fang', ml_14: 'X Axe', eqMelee: 'Used for quick melee (V, R3 on a controller or the hammer button)', camo_zebra: 'Zebra', camo_circus: 'Circus Check', camo_polka: 'Polka Dots', camo_newsprint: 'Newsprint', camo_filmreel: 'Film Reel', camo_toonfire: 'Toon Fire', camo_electric: 'Electric', camo_hypno: 'Hypno', camo_aquarium: 'Aquarium', camo_chrome: 'Liquid Chrome', camo_phantom: 'Phantom', camo_ember: 'Ember (reactive)', camo_inkreact: 'Living Ink (reactive)', reacted: 'Camo reacted! Stage {n}', cg_static: 'Static', cg_anim: 'Animated', cg_react: 'Reactive (evolve with kills)', hudEdit: 'Adjust HUD and buttons', heSize: 'Size', heAlpha: 'Opacity', heReset: 'Reset', heSave: 'Save', heHint: 'Drag any button or the stick wherever you like.', challenges: 'Challenges', chDaily: 'Today', chCareer: 'Career', chReset: 'New ones in {n} h', chDoneStamp: 'done', chMax: 'Complete', chT0: 'Bronze', chT1: 'Silver', chT2: 'Gold', chDoneDaily: 'Daily challenge complete!', chDoneCareer: '{t} career tier complete!', ch_kills: 'Knock out {n} enemies', ch_head: 'Land {n} headshots', ch_melee: '{n} blade knockouts', ch_pistol: '{n} knockouts with the {w}', ch_smg: '{n} knockouts with the {w}', ch_rifle: '{n} knockouts with the {w}', ch_shotgun: '{n} knockouts with the {w}', ch_sniper: '{n} knockouts with the {w}', ch_nade: '{n} grenade knockouts', ch_assist: '{n} assists', ch_streak: 'Call in {n} streaks', ch_win: 'Win {n} matches', ch_matches: 'Play {n} matches', chCareerU: 'Unlocks', chReward: 'Unlocks', reqCh: 'Challenge', chUnlocked: 'Challenge complete! Unlocked', ch_u_ember: 'Knock out {n} enemies', ch_u_inkreact: 'Land {n} headshots', ch_u_sscope: '{n} sniper headshots', ch_u_fscope: '{n} rifle knockouts', ch_u_handcannon: '{n} pistol knockouts', ch_u_spitter: '{n} SMG knockouts', ch_u_heavy: '{n} rifle knockouts', ch_u_bolt: '{n} sniper knockouts', ch_u_splitter: '{n} blade knockouts', ch_u_sword: '{n} blade knockouts', ch_u_fang: 'Call in {n} streaks', slot_tracer: 'Tracer', ch_u_tr_fire: '{n} shotgun knockouts', ch_u_tr_ink: '{n} assists', ch_u_tr_spark: '{n} SMG knockouts', ch_u_tr_rainbow: 'Win {n} matches', ch_u_tr_void: 'Land {n} headshots', ch_u_tr_toxic: '{n} grenade knockouts', ch_u_tr_gold: 'Call in {n} streaks', ch_u_tr_ice: '{n} sniper knockouts', chQueue: '+{n} queued ({d} of {t} unlocked). Finish one and the next comes in.', chAllDone: 'Everything unlocked!', reqQueue: 'Challenge queued', installApp: 'Install app', pickNext: 'Weapon on next respawn', nextSpawn: '{w} on your next respawn', unlPart: 'New attachment: {w}', unlCamo: 'New camo: {w}', fm_auto: 'Full auto', fm_semi: 'Semi-auto', fm_burst: '{n}-round burst', fm_bolt: 'Bolt-action', s_tracer: 'Bullet tracer', tr_chalk: 'Chalk', tr_fire: 'Fire', tr_ink: 'Ink', tr_spark: 'Spark', tr_rainbow: 'Rainbow', tr_none: 'None', tr_void: 'Purple void', tr_toxic: 'Toxic', tr_gold: 'Gold', tr_ice: 'Ice', respawn: 'Respawn', autoIn: 'Tap to jump back in (auto in {n})', lbCast: "Tonight's cast", lbLeave: 'Leave lobby', lbReady: "I'm ready", lbUnready: 'Not yet', lbYou: 'you', lbBot: 'bot', lbReadyStamp: 'ready',
    rovexStrip: 'More games like this on Rovex', gateText: 'Sign in with your Rovex account to play. Your level, weapons and challenges stay saved there.', gateGo: 'Sign in with Rovex', gateNew: "Don't have an account?", gateCreate: 'Create one free on Rovex', lbStart: 'Start match', lbHost: 'host', lbHostHint: "You're the host. Invite whoever you want and start when ready.", lbWaitHost: 'Waiting for the host to start', lbRoomLbl: 'Room', copyCode: 'Copy code', copied: 'Code copied', lbInvite: 'Invite friends', inviteTitle: 'Invite to room', inviteBtn: 'Invite', inviteSent: 'Invited', inviteNone: "You don't have Rovex friends yet. Share the room code with anyone who wants in.", inviteErr: "Couldn't load your friends. Share the room code instead.", inviteLoading: 'Finding your friends...', online: 'online', close: 'Close', haveCode: 'Got a code?', joinCode: 'Join', newRoom: 'Or set up your own room', createRoom: 'Create room', playingAs: 'Playing as {n}', guestHint: 'Sign in to Rovex to invite friends and keep your progress.', codeEmpty: 'Type the code you were given.', noRoom: 'No room with code {c}. Check with whoever invited you.', roomFull: 'Room {c} is full (16 players). Set up your own or wait for a spot.', mpDown: "The server didn't answer. Try again in a few seconds.", mpBusy: 'Servers are packed right now. Join an existing room or try again in a few minutes.', 
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
    epTitle: 'Rovex Elite', epSub: 'Exclusive camo + badge', epOn: "You're Elite: double XP", epChip: '2x XP', epChipOn: 'Active',
    fsOn: 'Fullscreen', fsOff: 'Exit fullscreen', igTitle: 'Install Rubber Riot', igOk: 'Got it', igOpen: 'Open the game in Chrome',
    igAndroid: ['Open the Chrome menu (the three dots up top)', 'Tap "Install app" or "Add to Home screen"', 'Done: the game becomes an icon on your phone and opens fullscreen'],
    igIos: ['Open this site in Safari', 'Tap Share (the square with the arrow pointing up)', 'Choose "Add to Home Screen" and confirm'],
    igPc: ['In Chrome or Edge, click the install icon at the end of the address bar (the monitor with the arrow)', 'Or open the menu (three dots) > "Cast, save and share" > "Install page as app"'],
    igRovex: ['Inside Rovex the game already runs, no install needed', 'For a standalone app on your phone or PC, open the game site in Chrome', 'There, tap "Install app" on the main menu'],
    skTab: 'Skills', skSlot: 'Slot {n}', skFree: 'Empty', skLvl: 'Level {n}', skHint: 'Two skills at a time. Tap a slot to pick which one to swap, then a skill.', skOff: 'Tap again to remove',
    ch_u_ww_stg: '{n} rifle headshots', ch_u_ww_garand: '{n} sniper kills', ch_u_ww_thompson: 'Drop 3 in 4 s, {n} times', ch_u_ww_ppsh: '{n} SMG kills', ch_u_ww_1911: '{n} pistol kills', ch_u_ww_c96: '{n} pistol headshots', ch_u_ww_tt: 'Win {n} matches', 
    slot_ammo: 'Ammo', am_none: 'Standard', amd_none: 'Plain bullets, no tricks', am_fire: 'Incendiary', amd_fire: 'Sets the target on fire: 14 more damage over 2 s', am_trace: 'Tracer', amd_trace: 'Whoever you hit shows on your minimap for 3 s', am_boom: 'Explosive', amd_boom: 'Pops on the target and splashes anyone close by', am_ap: 'Armor piercing', amd_ap: 'Goes through thin walls (at 75% damage)', am_up_burn: 'Burns', am_up_mark: 'Map mark', am_up_splash: 'Splash', am_up_pierce: 'Pierces walls', ch_u_am_fire: 'Drop {n} enemies', ch_u_am_trace: '{n} assists', ch_u_am_boom: '{n} grenade kills', ch_u_am_ap: 'Land {n} headshots', 
    t_field: 'Field gear', skField: 'Field gear', skFieldHint: 'One at a time. Use with Z, d-pad right or the on-screen button; it recharges by itself.', fdCd: '({n} s recharge)', fieldReady: '{w} ready!', kc_who: '{n} spotted you...', kc_shot: '{w}, from {d} m', kc_you: '...and you got flattened', kc_head: 'BONK!', fieldFail: 'Aim at visible ground (closer)', fd_umbrella: 'Umbrella', fdd_umbrella: 'Opens in front for 5 s and stops shots and punches from the front.', fd_spring: 'Spring', fdd_spring: 'A trampoline on the ground for 20 s: whoever steps on it flies.', fd_hole: 'Portable Hole', fdd_hole: 'One hole at your feet and one where you aim: go in one, come out the other.', fd_anvil: 'Anvil', fdd_anvil: 'Drops from the sky where you aim.', 
    prestN: 'Prestige {n}', prestGo: 'Prestige: back to level 1 for a star', prestSure: 'Sure? Tap again (guns, camos and skills stay)', prestStamp: 'Prestige {n}!', prestCamo: 'Prestige camo unlocked on every gun', camo_prestigio: 'Prestige', 
    tipOk: 'Tap to close', tip_br: 'Last One Standing', tipd_br: 'You start with only your fists (3 punches drop someone). Grab guns, vests and milk off the ground and stay inside the iris. No respawns.', tip_iris: 'The iris is closing', tipd_iris: 'The light circle on the minimap is the next zone. Outside it the film burns and you lose health.', tip_armor: 'Vest', tipd_armor: 'The striped bar under your health is your vest: it soaks 70% of the damage until it runs out.', tip_crate: 'Blimp crate', tipd_crate: 'It brings the Grinder and fills your vest. Everyone sees it fall, so get there fast.', tip_swap: 'Two primaries', tipd_swap: 'You carry 2 primaries and the pistol. To swap, hold the use button over the gun on the ground.', tip_field: 'Field gear', tipd_field: 'Your gear fires with Z (d-pad right on a controller, the icon button on mobile) and recharges by itself.', tip_ammo: 'Special ammo', tipd_ammo: 'Your gun has special ammo. Each one gains something and loses something: check the Arsenal, Ammo part.', tip_skills: 'Skills', tipd_skills: 'Two skills are always on. Below, pick one field gear to use in matches.', 
    ring_wait: 'Off to the Boxing Ring!', ring_waitSub: 'Waiting for an opponent: win with your fists to get back on the island', ring_go: 'Boxing Ring!', ring_vs: '{a} vs {b}: fists only, the winner goes back', ring_back: 'Back on the island!', ring_backSub: 'You won the bout and floated back by balloon, with a pistol', tip_ring: 'Boxing Ring', tipd_ring: 'Your first knockout gets a second chance: a 1 vs 1 fistfight. The winner floats back to the island.', 
    sk_maos: 'Quick Hands', skd_maos: 'Reload 25% and swap weapons 30% faster', sk_mola: 'Spring Legs', skd_mola: 'Jump 30% higher', sk_borracha: 'Rubber Body', skd_borracha: 'Walk and run 8% faster',
    sk_catador: 'Scavenger', skd_catador: 'Every kill gives back one mag for the gun in hand', sk_lince: 'Lynx Eye', skd_lince: 'Aim 25% faster with 15% less recoil', sk_sangue: 'Cold Blood', skd_sangue: 'Under 35 health, reload and aim 30% faster',
    sk_bolso: 'Deep Pockets', skd_bolso: '+1 of each grenade and 30% more ammo', sk_cuca: 'Hard Head', skd_cuca: 'Headshots on you hurt a lot less', sk_couro: 'Thick Hide', skd_couro: '30% less blast damage',
    sk_pano: 'Soft Shoes', skd_pano: 'Your shots do not draw the bots', sk_folego: 'Nine Lives', skd_folego: 'Health comes back by itself after 4 s without damage', sk_pavio: 'Short Fuse', skd_pavio: 'Streaks cost one kill less',
    ww_sniper_3: 'Old Ping', ww_fusil_9: 'Tin Thunder', ww_subfusil_11: 'Typewriter', ww_subfusil_12: 'Big Drum', ww_pistol_7: 'Forty-Five', ww_pistol_8: 'Broomhandle', ww_pistol_9: 'Little Star',
    sideTitle: 'Pick your side', sideAtk: 'Attack', sideAtkTip: 'Carry the bomb and plant it at A or B', sideDef: 'Defense', sideDefTip: 'Hold A and B and defuse the bomb', sideCount: '{n} of {max} players', sideNote: 'Sides switch at halftime', sideSwap: 'Switch side',
    eliteOnly: 'Rovex Elite exclusive', camo_hexelite: 'Elite Comb (reactive)', eliteTag: 'Rovex Elite',
    gsParts: 'Attachments', gsStats: 'Stats', slot_bp: 'Variant', bpNone: 'Custom build', bpNoneSub: 'Pick every part yourself', bpSub: 'Pre-built, with {c}', bpToday: "Today's elite: {c}", bpLocked: 'Comes from an elite challenge',
    bp_faisca: 'Stage Spark', bp_fornalha: 'Furnace', bp_pararaios: 'Lightning Rod', bp_grandefinal: 'Grand Finale', bp_matabarrao: 'Blotter',
    camo_hellfire: 'Stage Inferno', camo_tesla: 'Tesla Coil', camo_inkwell: 'Inkwell', camo_marquee: 'Marquee', cg_legend: 'Legendary (elite challenge)',
    elTitle: 'Daily elite', elDone: 'Elite complete! Unlocked', elReward: 'Unlocks: {v} ({w}) with {c}', elAllBp: 'You own every variant: XP only',
    el_e_head: 'Land {n} headshots', el_e_streak: 'Get a {n} streak without dying', el_e_multi: 'Drop 3 in 4 s, {n} times', el_e_melee: '{n} blade knockouts', el_e_sniperhead: '{n} sniper headshots', el_e_wins: 'Win {n} matches or rounds', el_e_nuke: 'Call in the Atomic Pie', el_e_kills: 'Knock out {n} enemies',
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
    n_frag: 'Grenade', n_flash: 'Flash', s_uav: 'Spy Radar', s_anvil: 'Anvil Rain', s_blimp: 'Blimp', s_nuke: 'Atomic Pie', w_nuke: 'Atomic Pie',
    nukeYou: 'You called in the Atomic Pie!', nukeYouSub: 'It drops from the sky in {t} s.', nukeEnemy: '{n} called in the Atomic Pie!', nukeEnemySub: 'It drops in {t} s. There is nowhere to hide.', nukeAlly: '{n} called in the Atomic Pie!', nukeAllySub: 'It drops in {t} s. Every enemy goes down.', nukeHit: 'PIED!', nukeHitSub: '{n} knocked out at once',
    streakReady: '{s} ready! {k}', how_kb: 'Press X', how_pad: 'Press up on the D-pad', how_touch: 'Tap the star button', streakAlly: '{n} called in {s}!', streakEnemy: 'Enemy called in {s}!', streakNext: 'Streak in {n}',
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

// ---------- temporada 2 (29/10): mapas novos, infectado, contagem, fim de partida, controle ----------
Object.assign(D.pt, {
  map_estaleiro: 'Estaleiro', map_refinaria: 'Refinaria',
  tip1: 'Agachado o tiro abre menos. Levante pra correr.',
  tip11: 'No Infectado, quem cai vira infectado. Recue atirando, nunca deixe encostar.',
  tip12: 'Com controle: segure o gatilho esquerdo pra mirar e o direito pra atirar.',
  k_jump: 'Pular', k_crouch: 'Agachar (aperte de novo pra levantar)', k_melee: 'Faca rapida', k_inspect: 'Inspecionar a arma',
  k_look: 'Olhar', k_menu: 'Navegar nos menus', k_back: 'Voltar', k_confirm: 'Confirmar',
  ctlKb: 'Teclado e mouse', ctlPad: 'Controle', ctlTouch: 'Toque',
  t_stick: 'Analogico esquerdo', t_drag: 'Arrastar no lado direito', t_auto: 'Tiro automatico (Ajustes)',
  lbPickTitle: 'Sua arma', s_xhair: 'Mira', t_use: 'Plantar / desarmar', k_use: 'Plantar / desarmar a bomba (segurar)', bomb_atk: 'Ataque', bomb_def: 'Defesa', roundN: 'Rodada {n}', bombLbl: 'Bomba',
    bombHere: 'bomba aqui', bombDropped: 'bomba no chao', bombPlanting: 'Plantando a bomba', bombDefusing: 'Desarmando', bombHoldPlant: 'Segure {k} pra plantar', bombHoldDefuse: 'Segure {k} pra desarmar',
    bombCarry: 'Voce esta com a bomba', bombYouCarry: 'Voce leva a bomba: plante no A ou no B', bombAtkGoal: 'Escolte a bomba ate o A ou o B', bombDefGoal: 'Defenda o A e o B',
    roundWon: 'Rodada ganha!', roundLost: 'Rodada perdida', why_boom: 'A bomba explodiu', why_defuse: 'A bomba foi desarmada', why_elim: 'O outro time caiu inteiro', why_time: 'O tempo acabou sem bomba',
    bombHalf: 'Intervalo: os times trocaram de lado', bombPlanted: 'Bomba plantada no {s}!', bombDefusedBy: '{n} desarmou a bomba', bombDropFeed: 'A bomba caiu no chao',
    specWatching: 'Assistindo {n}', specMap: 'Vendo o mapa', bombOutRound: 'Voce volta na proxima rodada', specNext: 'Proximo', specMapBtn: 'Mapa', k_spec: 'Morto: clique troca de colega, M mostra o mapa',
    xp_plant: 'Bomba plantada', xp_defuse: 'Bomba desarmada', xp_roundWin: 'Rodada ganha', rotate: 'Vire o celular de lado', rotateSub: 'O Rubber Riot roda deitado. Gire o aparelho e a cortina abre.', ammoLow: 'Municao baixa', ammoReload: 'Recarregue', ammoReloadKey: 'Recarregue [{k}]', ammoOut: 'Sem municao: troque de arma', ammoReloading: 'Recarregando', film_full: 'Colorido', s_threat: 'Alerta de inimigo em volta da mira', s_xhairColor: 'Cor da mira', xh_cross: 'Cruz', xh_crossdot: 'Cruz e ponto', xh_dot: 'Ponto', xh_circle: 'Circulo', xh_tee: 'T', s_aimAssistPad: 'Mira assistida no controle', lbPickHint: 'Nasce com ela. Muda tambem na pausa.',
  countWait: 'Esperando todo mundo carregar', countReady: 'Prepare-se', countGo: 'Ja!',
  inf_h_surv: 'Sobreviventes', inf_h_inf: 'Infectados', inf_in: 'Infeccao em', inf_firstYou: 'Voce e o primeiro infectado!', inf_firstSub: 'Pegue todo mundo na lamina',
  inf_first: '{n} e o primeiro infectado!', inf_you: 'Voce foi infectado!', inf_youSub: 'Agora caca quem sobrou', inf_got: '{n} foi infectado',
  inf_lastYou: 'Ultimo sobrevivente!', inf_lastSub: 'Radar ligado e municao cheia', inf_last: '{n} e o ultimo sobrevivente!',
  inf_winInf: 'Os infectados tomaram a vila', inf_winSurv: 'Os sobreviventes aguentaram', xp_survive: 'Sobreviveu', xp_challenge: 'Desafios',
  endCast: 'Placar final', endProg: 'Seu progresso', endUnl: 'Liberado nesta partida', endNothing: 'Nada novo desta vez. Continue que vem coisa.', endLvl: 'Nivel {n}', endLvlUp: 'Subiu pro nivel {n}!',
  newsTitle: 'Novidades da temporada', chNew: 'novo',
  news: [
    ['Plantar a Bomba', 'Rodadas sem renascer: o ataque planta no A ou no B, a defesa desarma. Quem cai assiste um colega ou o mapa.'],
    ['Modo Infectado', 'Um vira infectado e caca o resto na lamina. Quem cai, vira tambem. Aguente ate o fim do tempo.'],
    ['Dois mapas novos', 'Estaleiro, um patio de conteineres sem respiro, e Refinaria, com a torre de bombeamento no meio do deserto.'],
    ['Suporte a controle', 'Conecte um controle e jogue com mira assistida. Funciona nos menus tambem.'],
    ['Movimento mais firme', 'Sem carrinho e sem pulo duplo: anda e para na hora, pulo baixo e mira estavel.'],
    ['Fim de partida novo', 'Veja o XP que ganhou e tudo o que liberou na partida.'],
  ],
});
Object.assign(D.en, {
  map_estaleiro: 'Shipyard', map_refinaria: 'Refinery',
  tip1: 'Crouching tightens your spread. Stand up to sprint.',
  tip11: 'In Infected, whoever falls turns infected. Back off while shooting and never let them reach you.',
  tip12: 'On a controller: hold the left trigger to aim and the right one to shoot.',
  k_jump: 'Jump', k_crouch: 'Crouch (press again to stand)', k_melee: 'Quick knife', k_inspect: 'Inspect weapon',
  k_look: 'Look', k_menu: 'Move through menus', k_back: 'Back', k_confirm: 'Confirm',
  ctlKb: 'Keyboard and mouse', ctlPad: 'Controller', ctlTouch: 'Touch',
  t_stick: 'Left stick', t_drag: 'Drag on the right side', t_auto: 'Auto fire (Settings)',
  lbPickTitle: 'Your weapon', s_xhair: 'Crosshair', t_use: 'Plant / defuse', k_use: 'Plant / defuse the bomb (hold)', bomb_atk: 'Attack', bomb_def: 'Defense', roundN: 'Round {n}', bombLbl: 'Bomb',
    bombHere: 'bomb here', bombDropped: 'bomb on the ground', bombPlanting: 'Planting the bomb', bombDefusing: 'Defusing', bombHoldPlant: 'Hold {k} to plant', bombHoldDefuse: 'Hold {k} to defuse',
    bombCarry: 'You have the bomb', bombYouCarry: 'You carry the bomb: plant it at A or B', bombAtkGoal: 'Escort the bomb to A or B', bombDefGoal: 'Defend A and B',
    roundWon: 'Round won!', roundLost: 'Round lost', why_boom: 'The bomb went off', why_defuse: 'The bomb was defused', why_elim: 'The other team went down', why_time: 'Time ran out with no bomb',
    bombHalf: 'Halftime: teams switched sides', bombPlanted: 'Bomb planted at {s}!', bombDefusedBy: '{n} defused the bomb', bombDropFeed: 'The bomb dropped',
    specWatching: 'Watching {n}', specMap: 'Map view', bombOutRound: 'You come back next round', specNext: 'Next', specMapBtn: 'Map', k_spec: 'Dead: click switches teammate, M shows the map',
    xp_plant: 'Bomb planted', xp_defuse: 'Bomb defused', xp_roundWin: 'Round won', rotate: 'Turn your phone sideways', rotateSub: 'Rubber Riot plays in landscape. Rotate your device and the curtain opens.', ammoLow: 'Low ammo', ammoReload: 'Reload', ammoReloadKey: 'Reload [{k}]', ammoOut: 'Out of ammo: switch weapons', ammoReloading: 'Reloading', film_full: 'Full color', s_threat: 'Enemy alert around the crosshair', s_xhairColor: 'Crosshair color', xh_cross: 'Cross', xh_crossdot: 'Cross and dot', xh_dot: 'Dot', xh_circle: 'Circle', xh_tee: 'T', s_aimAssistPad: 'Controller aim assist', lbPickHint: 'You spawn with it. You can also change it from pause.',
  countWait: 'Waiting for everyone to load', countReady: 'Get ready', countGo: 'Go!',
  inf_h_surv: 'Survivors', inf_h_inf: 'Infected', inf_in: 'Infection in', inf_firstYou: 'You are the first infected!', inf_firstSub: 'Get everyone with the blade',
  inf_first: '{n} is the first infected!', inf_you: 'You got infected!', inf_youSub: 'Now hunt whoever is left', inf_got: '{n} got infected',
  inf_lastYou: 'Last survivor!', inf_lastSub: 'Radar on and full ammo', inf_last: '{n} is the last survivor!',
  inf_winInf: 'The infected took the village', inf_winSurv: 'The survivors held out', xp_survive: 'Survived', xp_challenge: 'Challenges',
  endCast: 'Final score', endProg: 'Your progress', endUnl: 'Unlocked this match', endNothing: 'Nothing new this time. Keep going, more is coming.', endLvl: 'Level {n}', endLvlUp: 'Level {n} reached!',
  newsTitle: 'New this season', chNew: 'new',
  news: [
    ['Plant the Bomb', 'Rounds with no respawn: attack plants at A or B, defense defuses. Whoever falls watches a teammate or the map.'],
    ['Infected mode', 'One player turns infected and hunts the rest with a blade. Whoever falls turns too. Hold out until time runs out.'],
    ['Two new maps', 'Shipyard, a container yard with no breathing room, and Refinery, with a pump tower in the middle of the desert.'],
    ['Controller support', 'Plug in a controller and play with aim assist. Menus work too.'],
    ['Tighter movement', 'No slide and no double jump: you stop on a dime, jump low and aim steady.'],
    ['New end of match', 'See the XP you earned and everything you unlocked in the match.'],
  ],
});
Object.assign(D.pt.m, { infect: 'Infectado', bomb: 'Plantar a Bomba' });
Object.assign(D.en.m, { infect: 'Infected', bomb: 'Plant the Bomb' });
Object.assign(D.pt.md, { bomb: 'Ataque planta a bomba no A ou no B, defesa desarma. Sem renascer na rodada: quem cai assiste. 4 rodadas vencem.', infect: 'Um vira infectado. Quem ele pegar vira tambem. Sobreviva ate o fim do tempo.' });
Object.assign(D.en.md, { bomb: 'Attack plants the bomb at A or B, defense defuses. No respawn in the round: whoever falls spectates. 4 rounds win.', infect: 'One turns infected. Everyone they catch turns too. Survive until time runs out.' });

// battle royale (Ultimo de Pe): modo, punhos, iris, loot e as areas da Ilha Rebobina
Object.assign(D.pt.m, { br: 'Ultimo de Pe' }); Object.assign(D.en.m, { br: 'Last One Standing' });
Object.assign(D.pt.md, { br: 'Battle royale: nasce no soco, pega arma e colete no chao e foge da iris que fecha. Sem renascer. Ultimo de pe vence.' });
Object.assign(D.en.md, { br: 'Battle royale: start with your fists, grab guns and vests off the ground and outrun the closing iris. No respawn. Last one standing wins.' });
Object.assign(D.pt.w, { fists: 'Punhos' }); Object.assign(D.en.w, { fists: 'Fists' });
Object.assign(D.pt, { map_ilha: 'Ilha Rebobina', br_left: 'Restam', br_swap: 'Segure E: trocar {a} por {b}', br_swapPad: 'Segure X: trocar {a} por {b}', br_swapTouch: 'Segure o botao de usar: trocar {a} por {b}', br_iris: 'Iris', br_closed: 'Fechada', br_closing: 'Fechando', br_closeIn: 'Iris fecha em',
  br_drop: 'Caixote no ar!', br_dropSub: 'O dirigivel soltou um caixote: Moedor e colete cheio', br_irisGo: 'A iris esta fechando!', br_irisGoSub: 'Corra pro circulo claro no mapa',
  br_outside: 'Fora da iris! Volte pro circulo', br_place: 'Voce ficou em {n}º', br_placeSub: 'Fim da linha. Assista ou volte pro menu', br_lastN: 'So restam {n}!',
  br_got_armor: '+ Colete', br_got_hp: '+ Leite (vida)', br_got_nade: '+ Granada', br_got_crate: 'Caixote! Moedor e colete cheio',
  area_coreto: 'Coreto das Moscas', area_manivela: 'Vila Manivela', area_porto: 'Porto Remendado', area_fazenda: 'Fazenda Tinteiro', area_soluco: 'Refinaria Soluco',
  area_projetor: 'Morro do Projetor', area_serraria: 'Serraria Ziguezague', area_pedreira: 'Pedreira Engasgada', area_brejo: 'Brejo do Rolo' });
Object.assign(D.en, { map_ilha: 'Rewind Island', br_left: 'Left', br_swap: 'Hold E: swap {a} for {b}', br_swapPad: 'Hold X: swap {a} for {b}', br_swapTouch: 'Hold the use button: swap {a} for {b}', br_iris: 'Iris', br_closed: 'Closed', br_closing: 'Closing', br_closeIn: 'Iris closes in',
  br_drop: 'Crate incoming!', br_dropSub: 'The blimp dropped a crate: Grinder and a full vest', br_irisGo: 'The iris is closing!', br_irisGoSub: 'Run to the light circle on the map',
  br_outside: 'Outside the iris! Get back in the circle', br_place: 'You placed #{n}', br_placeSub: 'End of the reel. Watch or head back to the menu', br_lastN: 'Only {n} left!',
  br_got_armor: '+ Vest', br_got_hp: '+ Milk (health)', br_got_nade: '+ Grenade', br_got_crate: 'Crate! Grinder and a full vest',
  area_coreto: 'Fly Bandstand', area_manivela: 'Crank Village', area_porto: 'Patched Harbor', area_fazenda: 'Inkwell Farm', area_soluco: 'Hiccup Refinery',
  area_projetor: 'Projector Hill', area_serraria: 'Zigzag Sawmill', area_pedreira: 'Choking Quarry', area_brejo: 'Reel Swamp' });

Object.assign(D.pt, { prestOnly: 'So com prestigio' }); Object.assign(D.en, { prestOnly: 'Prestige only' });
// lobby: configuracao da partida (host) e troca de host
Object.assign(D.pt, { lbCfg: 'Partida', cfg_mode: 'Modo', cfg_map: 'Mapa', cfg_players: 'Jogadores', cfg_limit: 'Meta', cfg_time: 'Tempo', cfg_difficulty: 'Pontaria',
  cfgAutoTag: '(auto)', cfgDef: 'Padrao ({n})', cfgMin: '{n} min', cfgPrev: 'Anterior:', cfgNext: 'Proximo:', cfgHostOnly: 'So o host muda', cfgYouHost: 'Voce e o host',
  newHost: '{n} agora e o host', newHostYou: 'Voce agora e o host da sala' });
Object.assign(D.en, { lbCfg: 'Match', cfg_mode: 'Mode', cfg_map: 'Map', cfg_players: 'Players', cfg_limit: 'Score limit', cfg_time: 'Time', cfg_difficulty: 'Bot aim',
  cfgAutoTag: '(auto)', cfgDef: 'Default ({n})', cfgMin: '{n} min', cfgPrev: 'Previous:', cfgNext: 'Next:', cfgHostOnly: 'Only the host can change this', cfgYouHost: 'You are the host',
  newHost: '{n} is now the host', newHostYou: 'You are now the room host' });
Object.assign(D.pt, { streakWait: '{s} no ar: espere {n} s', streakGap: 'Sequencia liberada em {n} s' });
Object.assign(D.en, { streakWait: '{s} in the air: wait {n} s', streakGap: 'Streaks open again in {n} s' });
Object.assign(D.pt, { mpOr: 'ou', createRoomSub: 'Voce vira o host e escolhe modo, mapa e bots no lobby' });
Object.assign(D.en, { mpOr: 'or', createRoomSub: 'You become the host and pick mode, map and bots in the lobby' });
Object.assign(D.pt, { frTitle: 'Amigos jogando', frPlayers: '{n} na sala' });
Object.assign(D.en, { frTitle: 'Friends playing', frPlayers: '{n} in room' });
Object.assign(D.pt, { quickPlay: 'Jogo rapido', quickPlaySub: 'Cai numa partida rolando agora ou abre uma com bots' });
Object.assign(D.en, { quickPlay: 'Quick play', quickPlaySub: 'Jump into a match in progress or start one with bots' });
Object.assign(D.pt, { bodyLevel: '{m}: nivel {n}' }); Object.assign(D.en, { bodyLevel: '{m}: level {n}' });
Object.assign(D.pt, { cfgPickMode: 'Escolha o modo' }); Object.assign(D.en, { cfgPickMode: 'Pick a mode' });
Object.assign(D.pt, { tutorial: 'Treino' }); Object.assign(D.en, { tutorial: 'Training' });
Object.assign(D.pt, { ch_tutorial: 'Treino com o Seu Tinteiro', ch_tutorialRw: 'um modelo de arma e uma camuflagem, sorteados', ch_tutorialGo: 'Fazer o treino' });
Object.assign(D.en, { ch_tutorial: 'Training with Mr. Inkwell', ch_tutorialRw: 'a random weapon model and a random camo', ch_tutorialGo: 'Start training' });
// Ultimo de Pe em dupla: caido, bomba de bicicleta, reerguer
Object.assign(D.pt.m, { duo: 'Ultimo de Pe: Dupla' }); Object.assign(D.en.m, { duo: 'Last Duo Standing' });
Object.assign(D.pt.md, { duo: 'Battle royale em dupla. Zerou a vida, voce fica caido e o parceiro te reergue com a bomba de bicicleta. Ultima dupla de pe vence.' });
Object.assign(D.en.md, { duo: 'Battle royale in pairs. Run out of health and you go down; your partner pumps you back up with a bicycle pump. Last duo standing wins.' });
Object.assign(D.pt, { duo_feed: '{n} caiu', duo_feedMe: 'Voce caiu', duo_downMe: 'Voce caiu!', duo_downMeSub: 'Rasteje pra perto do parceiro: ele te reergue com a bomba',
  duo_downMate: '{n} caiu!', duo_pump: 'Segure E em cima dele: bomba de bicicleta', duo_pumpPad: 'Segure X em cima dele: bomba de bicicleta', duo_pumpTouch: 'Segure usar: bomba de bicicleta',
  duo_pumping: 'Enchendo... {p}%', duo_revFeed: '{a} reergueu {n}', duo_upMe: 'De pe de novo!', duo_upMeSub: '{n} te encheu com a bomba', duo_upDone: 'Voce reergueu {n}!',
  duo_downTitle: 'CAIDO', duo_bleed: 'Sai do jogo em {n} s se ninguem te encher', duo_beingPumped: 'Seu parceiro esta te enchendo!', xp_revive: 'Reergueu o parceiro',
  tip_duo: 'Dupla', tipd_duo: 'Zerou a vida? Voce fica caido e rasteja. O parceiro segura usar em cima de voce por 4 s pra te reerguer. Se a dupla toda cair, saem os dois.' });
Object.assign(D.en, { duo_feed: '{n} is down', duo_feedMe: 'You went down', duo_downMe: 'You are down!', duo_downMeSub: 'Crawl to your partner: they can pump you back up',
  duo_downMate: '{n} is down!', duo_pump: 'Hold E on them: bicycle pump', duo_pumpPad: 'Hold X on them: bicycle pump', duo_pumpTouch: 'Hold use: bicycle pump',
  duo_pumping: 'Pumping... {p}%', duo_revFeed: '{a} pumped {n} back up', duo_upMe: 'Back on your feet!', duo_upMeSub: '{n} pumped you up', duo_upDone: 'You pumped {n} back up!',
  duo_downTitle: 'DOWN', duo_bleed: 'Out in {n} s unless someone pumps you', duo_beingPumped: 'Your partner is pumping you up!', xp_revive: 'Partner revive',
  tip_duo: 'Duo', tipd_duo: 'Out of health? You go down and crawl. Your partner holds use on you for 4 s to get you back up. If the whole duo goes down, both are out.' });

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

// selo do Elite da Rovex ao lado do nome (lobby, placar): hexagono violeta da marca + "Elite"
export const eliteTag = () => `<i class="elite-tag" title="${t('eliteTag')}"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3L57 17V45L32 59L7 45V17L32 3Z" fill="none" stroke="currentColor" stroke-width="6"/><path d="M32 18L35.5 26L44 27L38 33L39 42L32 38L25 42L26 33L20 27L28.5 26L32 18Z"/></svg>Elite</i>`;
