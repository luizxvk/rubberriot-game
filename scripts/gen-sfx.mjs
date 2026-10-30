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
  sniper: ['loud cartoon elephant gun crack with long echo', 1.2],
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
