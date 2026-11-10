// Gera os SFX pelo ElevenLabs (sound-generation). Pula o que ja existe.
import fs from 'node:fs';
import path from 'node:path';
const envTxt = fs.readFileSync(path.resolve('../.env.api-keys'), 'utf8');
const KEY = (envTxt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/) || [])[1];
if (!KEY) { console.error('sem ELEVENLABS_API_KEY'); process.exit(1); }
const SFX = {
  pistol: ['single loud pistol gunshot, sharp punchy bang, close mic, dry, short tail, no music', 0.7],
  smg: ['single submachine gun shot, one round only, snappy punchy crack, close, dry, no echo', 0.5],
  rifle: ['single assault rifle gunshot, one round, heavy punchy boom with short crack, close mic, no music', 0.7],
  shotgun: ['big cartoon blunderbuss blast with comedic boom and echo', 1.0],
  sniper: ['classic cartoon sniper rifle shot sound effect, one huge deep booming PUMMM blast, fat low thump with a comedic rubbery bounce and a short rolling echo, exaggerated old cartoon, no ricochet, no music', 1.3], // 30/10: refeito mais PUM (o velho em opcoes/sniper_original.mp3)
  rocket: ['cartoon firework rocket launch whoosh with slide whistle', 1.0],
  minigun: ['cartoon gatling gun rattle, short burst, toy machine', 0.5],
  pan: ['cartoon frying pan bonk hit on head', 0.6],
  explosion: ['1930s cartoon dynamite explosion kaboom with debris', 1.6],
  reload: ['cartoon gun reload, springy clicks and ratchet', 1.0],
  hit: ['cartoon punch impact, loud comedic pow thud, single hit', 0.5],
  hitmarker: ['tiny wood block tick', 0.3],
  death: ['cartoon character defeated, descending slide whistle with bonk', 1.5],
  jump: ['cartoon boing spring jump', 0.5],
  step: ['cartoon soft tiptoe footstep, single', 0.3],
  pickup: ['cartoon pickup ding with xylophone run up', 0.7],
  slide: ['cartoon skid slide whistle down short', 0.6],
  flag: ['old vaudeville trumpet fanfare short', 1.5],
  capture: ['cartoon bicycle horn honk twice', 0.8],
  ui: ['soft piano key plink', 0.3],
  iris: ['old film projector start clatter', 1.5],
  ui_hover: ['very soft muted wooden xylophone tap, gentle', 0.3],
  ui_click: ['cartoon soft button press pop, round and warm', 0.3],
  ui_back: ['soft descending two note xylophone', 0.5],
  step2: ['cartoon soft shoe footstep on wood, single light tap', 0.3],
  land: ['cartoon soft landing thud with tiny spring', 0.4],
  empty: ['dry click of empty toy gun trigger', 0.3],
  swap: ['cartoon weapon swap whoosh with click', 0.5],
  ads: ['soft cloth rustle and metal tick, aim', 0.3],
  whoosh: ['fast cartoon zip whoosh dash', 0.5],
  headshot: ['cartoon bonk on head with bell ding', 0.6],
  killstamp: ['cartoon cymbal crash short with honk', 0.8],
  music: ['1930s ragtime jazz piano and brass loop, upbeat, old gramophone sound, instrumental', 20],
  // 29/10: momentos que estavam mudos (contagem, inicio de rodada, fim, assistencia, renascer)
  tick: ['single cartoon wooden clock tick, short and dry, toy clock', 0.5],
  go: ['short cartoon referee whistle toot, playful, single blow', 0.6],
  win: ['short 1930s vaudeville brass ta-da victory sting, cartoon', 1.8],
  lose: ['cartoon sad trombone wah wah wah, short and funny', 1.8],
  ding: ['tiny soft cartoon bell ding, light and bright', 0.5],
  poof: ['soft cartoon pop poof appear, light puff', 0.5],
  bolt: ['cartoon bolt action rifle cycling, exaggerated springy clack-clunk with a tiny boing, comedic, close, dry, no gunshot', 0.6],
  umbrella: ['cartoon umbrella popping open, quick whoosh and springy fwump, comedic, close, dry', 0.6],
  spring: ['big cartoon spring boing, wobbly bouncy doing-g-g sound, comedic, dry', 0.8],
  hole: ['cartoon portable hole slurp, quick suction pop and slide whistle down then up, comedic', 1.0],
  anvilfall: ['cartoon falling whistle descending pitch then heavy metal clank thud, comedic', 1.6],
  fieldready: ['tiny cartoon toy bell ding with a soft wooden click, light and bright', 0.5],
  comic: ['quick comic book page flip with paper swish and a cartoon stamp thump', 0.8],
  prestige: ['short 1930s vaudeville brass fanfare with drum roll and cymbal, triumphant, cartoon', 2.5],
  ringbell: ['boxing ring bell, two quick loud dings, old 1930s arena, slight echo', 1.2],
  crowd: ['1930s cartoon boxing crowd cheering and whistling, short burst, comedic', 2.0],
  pump: ['cartoon bicycle pump pumping three times, squeaky tchu tchu tchu with air hiss, comedic', 1.4],
  balloon: ['cartoon balloon inflating then floating away with a whistle, comedic, light', 1.2],
  // 30/10: bate-volta (paraquedas)
  chute: ['cartoon parachute popping open, big cloth fwump with a springy boing and a short slide whistle up, comedic', 1.2],
  wind: ['steady falling through the sky wind rush, whooshing air, seamless loop, no music', 3.0],
  splat: ['cartoon character slamming flat into the ground from high up, big comedic splat thud with a squeaky rubber honk', 1.0],
  aa12: ['cartoon automatic shotgun single blast, punchy chunky BLAM with a springy metallic clack, comedic and exaggerated, short tail, no echo, no music', 0.6], // 30/10: AA-12 (Liquidificador)
  revolver: ['classic 1940s theatrical cartoon gunshot sound effect, one big booming rumbling PRRRUMMM blast with a deep rolling low echo, old cartoon pistol shot, comedic and exaggerated, no ricochet, no music', 1.3],
  // 01/11: alarme da Torta Atomica, kit da Luneta e um som proprio pra cada modelo (g_<corpo>)
  nukealarm: ['soft gentle cartoon warning chime, a smooth rising slide whistle into three mellow xylophone notes and a soft wobbly vibraphone shimmer, playful and comedic but calm and pleasant, no siren, no horn, no voice, no music', 2.2], // 01/11: a sirene ficou horrorosa; comico mas suave
  chargeup: ['cartoon charging energy hum rising in pitch, wobbly theremin and springy coil whine building up for three seconds, comedic', 3.0],
  megashot: ['gigantic exaggerated cartoon cannon gunshot, earth shaking KA-BLAMMO with a long rumbling echo, a bell ding and a slide whistle down, comedic and thunderous, no music', 2.0],
  g_pistol_1: ['single real 9mm pistol gunshot, sharp loud snappy crack-bang with a crisp metallic slide clack, tight and punchy, slightly exaggerated cartoon style, mid-high pitch, one shot only, short tail, no music, no voice', 0.5], // 03/11: tiro de verdade (pedido dele; antigo em opcoes/)
  g_pistol_2: ['cartoon automatic pistol shot that sounds like a popcorn kernel popping, poppy pang, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.5],
  g_pistol_3: ['single Desert Eagle .50 magnum pistol gunshot, extremely loud powerful thunderous BOOM with a hard supersonic crack, heavy punch and a short rolling echo, the biggest handgun, slightly exaggerated cartoon style, one shot only, no music, no voice', 0.9], // 03/11: e a Deagle, bem mais forte (antigo em opcoes/)
  g_pistol_4: ['cartoon pistol firing a quick three round burst, tat-tat-tat light and bouncy, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_pistol_5: ['long barrel cartoon target pistol shot, thin whistling crack ping, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_pistol_6: ['single real compact pistol gunshot, loud sharp aggressive bang with a snappy crack and a quick metallic slide clack, punchy, slightly exaggerated cartoon style, mid-high pitch, one shot only, short tail, no music, no voice', 0.5], // 03/11: tiro de verdade (antigo em opcoes/)
  g_pistol_7: ['1940s heavy service pistol cartoon shot, round chunky bang with a short echo, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_pistol_8: ['old broomhandle pistol cartoon shot, woody hollow clack bang, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_pistol_9: ['old soviet style pistol cartoon shot, sharp sparkly crack with a tiny twinkle, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.5],
  g_subfusil_1: ['cartoon submachine gun single shot like a wooden rattle crack, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_2: ['cartoon smg single shot with a buzzing bee like zip, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_3: ['cartoon smg shot with a bouncy waltz like oom-pah thump, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_4: ['cartoon smg single shot with a whooshing windy crack, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_5: ['cartoon smg single shot that sounds like a fast spit ptoo with a bang, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_6: ['cartoon compact smg hip fire shot, short punchy thwack, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_7: ['cartoon smg single shot like a tap dance heel click with a pop, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_8: ['cartoon carbine shot, two quick crisp knocks tok-tok, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_9: ['cartoon smg single shot with an angry hornet sting zzap, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_10: ['cartoon smg single shot like a small tack hammer tink bang, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_12: ['1940s drum magazine submachine gun single shot, fast rattling brrt chunk, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.4],
  g_subfusil_13: ['single real submachine gun gunshot, one 9mm SMG round, fast tight snappy crack with a punchy metallic clack, like an MP5 or Uzi, slightly exaggerated cartoon style, mid-high pitch, one shot only, very short tail, no music, no voice', 0.4], // 03/11: o sanfona ficou horrivel; tiro de SMG de verdade (antigo em opcoes/)
  g_fusil_1: ['cartoon assault rifle single shot, rolling thunder crack, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_fusil_2: ['cartoon rifle shot in a short two round burst with stormy thunderclap, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_fusil_3: ['cartoon precise rifle shot, thin needle like ping crack, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_fusil_4: ['cartoon heavy rifle shot, big fat thudding boom, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.7],
  g_fusil_5: ['cartoon rifle shot, light pattering drizzle crack, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_fusil_6: ['cartoon rifle shot like four barbershop quartet voices going bom in harmony with a bang, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.7],
  g_fusil_7: ['cartoon rifle shot with an electric lightning zap crack, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  g_fusil_9: ['1940s assault rifle cartoon shot, tinny tin can rattling bang, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.6],
  // 03/11 (pedido dele): o grave dele era horrivel; agora estalado e comico (antigo no scratchpad da sessao)
  flamer: ['short cartoon flamethrower burst, whooshy FWOOOSH of fire with a crackle and a comedic little puff at the end, mid pitch, 1930s rubber hose cartoon, no music, no voice', 0.6], // lanca-chamas (03/11)
  g_pistol_11: ['single cartoon sawed-off double barrel shotgun blast, big chunky KA-BLAM with a scattered buckshot rattle and a comedic springy boing at the end, punchy, mid pitch, not bassy, 1930s rubber hose cartoon, one shot only, short tail, no music, no voice', 0.8], // serrada (03/11)
  g_fusil_13: ['single AK-47 gunshot, the classic sharp loud AK crack-pop with a metallic punch and a short snappy echo, slightly exaggerated cartoon style with a tiny springy rubber twang at the very end, mid-high pitch, not bassy, one shot only, no music, no voice', 0.6], // pipocadeira: som de AK (03/11)
  g_lmg_1: ['single M249 light machine gun shot, one round, heavy fast punchy rattling boom with a metallic clack, close mic, slightly exaggerated cartoon style, short tail, no music', 0.5],
  g_lmg_2: ['single M60 heavy machine gun shot, one round, deep thumping powerful bang with a chunky metallic clack, close mic, slightly exaggerated cartoon style with a tiny rubbery bounce, short tail, no music', 0.55],
  g_fusil_11: ['cartoon rifle shot like a pile driver slam, metallic clang boom, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.7],
  g_fusil_12: ['single designated marksman rifle gunshot, 7.62 DMR, very loud thunderous booming crack with a deep heavy punch and a big rolling outdoor echo, powerful, slightly exaggerated cartoon style, one shot only, no music, no voice', 0.9], // 03/11: DMR estrondoso (antigo em opcoes/)
  g_shotgun_1: ['cartoon blunderbuss shotgun blast, big brassy BLAM with rattling bits, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.9],
  g_shotgun_2: ['cartoon shotgun blast that sounds like a giant sneeze ah-CHOO bang, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 0.9],
  g_sniper_0: ['cartoon sniper rifle shot, long booming crack echoing across a canyon, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 1.2],
  g_sniper_1: ['single real bolt-action sniper rifle gunshot, loud supersonic crack and deep boom with a short outdoor echo, one shot only, no music, no voice', 1.2], // 01/11: ele quer tiro de sniper de verdade (o pica-pau ficou comico demais)
  g_sniper_2: ['cartoon heavy sniper shot like a sledgehammer slam BONG boom, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 1.2],
  g_sniper_3: ['old 1940s bolt action rifle cartoon shot with a ringing ping, single shot, comedic 1930s rubber hose cartoon, short tail, no music, no voice', 1.0],
  g_sniper_4: ['single huge booming cartoon sniper rifle shot, thunderous deep KA-BOOOM blast with a big rolling echo, ending in a loud ringing cast-iron frying pan CLANG tail, exaggerated old cartoon, one shot only, no music, no voice', 1.3], // 03/11: estrondoso como a Luneta, com cauda de panela (antigo no scratchpad)
  // 04/11: Sabre de Neon
  saber_on: ['energy sword igniting, a rising electric neon tube buzz that snaps on with a bright hum, slightly comedic 1930s cartoon flavor, close, short, no music, no voice', 1.0],
  saber_swing: ['fast swing of a humming neon energy blade, doppler whoosh with electric buzz, short and clean, no music, no voice', 0.6],
  saber_hit: ['energy blade striking, sharp electric crackle zap with a sizzling burn, punchy comedic cartoon hit, short, no music, no voice', 0.6],
  // 03/11: Roube o Cofre
  safetick: ['cartoon safe cracking, combination dial clicking tick tick tick then a heavy satisfying CLACK of the lock, close, dry, no music, no voice', 2.0],
  siren: ['1930s cartoon police siren wailing up and down with a comedic bell, short alarm, no music, no voice', 3.0],
  cashreg: ['old cash register KA-CHING with coins jingling, cartoon, short and bright, no music, no voice', 1.0],
  // 03/11: sequencias grandes
  // 10/11 (pedido dele): som de recompensa do Elite (cada premio que entra + fanfarra no fim)
  reward_card: ['soft warm music box chime with a gentle airy shimmer, smooth and round, calm reward card reveal, quiet, no harsh attack, no noise, no music bed', 0.9],
  reward_fanfare: ['gentle warm celebratory jingle, soft muted trumpet and celesta playing a short rising melody, smooth and flowing, 1930s cartoon charm, not loud, no drums, no crash', 2.8],
  reward_section: ['soft rising harp glissando with a warm low tone, smooth and calm, chapter transition, quiet', 1.2],
  chat_pop: ['very soft round bubble pop with a tiny warm wooden tick, gentle and quiet, speech balloon appearing', 0.5],
  planefly: ['1930s cartoon biplane flying low overhead, buzzing propeller engine passing by with a rattling machine gun strafing burst, comedic, no music, no voice', 5.0],
  trainwhistle: ['loud cartoon steam train whistle toot toot followed by fast chugging locomotive charging closer, comedic 1930s rubber hose cartoon, no music, no voice', 3.5],
  bomberdrone: ['enormous slow airship passing overhead, deep heavy rumbling engine drone that shakes the ground, ominous low frequency, huge and menacing with a faint comedic creak, no music, no voice', 8.0],
  eraser: ['cartoon pencil eraser rubbing fast on paper, squeaky scribble rub then a soft comedic pop, close, dry, no music, no voice', 1.2],
  firedrop: ['cartoon fireball falling with a whistle and landing in a soft fiery FWOOMP burst with crackle, comedic, no music, no voice', 1.0],
};
for (const [name, [text, dur]] of Object.entries(SFX)) {
  const out = `public/sfx/${name}.mp3`;
  if (fs.existsSync(out)) { console.log('ok', name); continue; }
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, duration_seconds: Math.max(0.5, dur), prompt_influence: 0.5 }),
  });
  if (!r.ok) { console.log('FALHOU', name, r.status, (await r.text()).slice(0, 200)); continue; }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log('gerado', name);
}
