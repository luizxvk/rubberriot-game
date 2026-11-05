// Trilha de cada dança pelo ElevenLabs (05/11, pedido dele): tematica e na duracao dela. Salva em public/sfx/dn_<id>.mp3, pula o que ja existe
// e para antes de acabar a cota do mes. Uso: node scripts/gen-dance-music.mjs [ids...]   (com --so-custo mostra o saldo e sai)
import fs from 'node:fs';
import path from 'node:path';
import { DANCES, danceLen } from '../src/dances.js';
const envTxt = fs.readFileSync(path.resolve('../.env.api-keys'), 'utf8');
const KEY = (envTxt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/) || [])[1];
if (!KEY) { console.error('sem ELEVENLABS_API_KEY'); process.exit(1); }
const OLD = ', 1930s cartoon rubber hose, old gramophone sound, instrumental, no vocals';
const PROMPT = {
  volta: 'boxing ring bell ringing three times, then triumphant victory brass fanfare with snare march, champion parade, crowd cheer imitated by brass',
  charleston: 'fast roaring twenties charleston jazz band, banjo, clarinet and stride piano, peppy', macarrao: 'wobbly slide trombone and slide whistle, loose rubbery silly groove with tuba',
  sapateado: 'tap dance solo with crisp tap shoes over a swinging jazz combo, ending with a big ta-da brass hit', lindy: 'hot swing big band lindy hop, driving walking bass and shouting brass',
  shimmy: 'sultry shimmying muted trumpet with brushed drums and a low clarinet, playful burlesque', cancan: 'french can-can galop, bright brass and cymbals, very fast and joyful, cabaret orchestra',
  polichinelo: 'gym class marching piano with whistle toots and bouncy spring sounds, cheerful exercise music', robo: 'music box and wind-up toy clockwork, ticking gears and mechanical xylophone, stiff stop-and-go rhythm',
  deslizada: 'smooth sneaky upright bass and vibraphone, sliding soft shoe rhythm with brushes', bamboleio: 'hawaiian steel guitar and ukulele, hula sway, relaxed tropical',
  marcha: 'small town brass marching band, snare drum and piccolo, proud and silly', cossaco: 'russian balalaika and accordion folk dance, accelerating, with stomps and hey shouts played by brass only',
  galinha: 'barnyard hoedown fiddle and clucking clarinet, comic chicken rhythm with woodblock', remador: 'sea shanty concertina and tuba, rowing rhythm, swaying back and forth',
  palmas: 'gospel piano and rhythmic hand claps, joyful clap-along groove, no singing', piao: 'carnival calliope waltz spinning faster and faster, merry-go-round organ',
  mexe: 'cartoon kitchen music with bubbling pot sounds, bassoon and pizzicato strings, mischievous witch stirring', reverencia: 'grand theatre orchestra finale fanfare, curtain call with applause and a big final chord',
  cambalhota: 'circus acrobat drum roll building tension, then trumpet fanfare and a cymbal crash at the landing', mortal: 'daredevil circus march, snare roll, whoosh in the air and triumphant brass finish',
  ombrinho: 'catchy modern viral dance beat played by a 1930s jazz band, punchy kick and muted trumpet riff', passinho: 'brazilian funk rhythm tamborzao played on old samba percussion and cavaquinho, fast and bouncy',
  cruzadinha: 'trendy lo-fi hip hop groove played on vintage upright piano and vinyl crackle, finger snaps', fiodental: 'goofy bouncy bass and kazoo, repetitive side to side groove, silly and catchy',
  aponta: 'funky wah-wah muted horns and hand claps, cocky strut groove, catchy', cospefogo: 'dragon roar and big whoosh of fire over dramatic low brass and timpani, carnival fire breather',
  coracao: 'sweet romantic violins and harp with soft sparkly chimes, lovestruck cartoon', canhao: 'party popper explosions and confetti cannon bursts over a joyful brass fanfare and slide whistle',
  raio: 'crackling electricity and thunder cracks over a mad scientist theremin and pipe organ', projetor: 'old film projector rattling and whirring over a silent movie piano, dramatic title card stingers',
};
const sub = async () => { const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } }); const j = await r.json(); return j.character_limit - j.character_count; };
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
let left = await sub(); console.log('saldo', left);
if (process.argv.includes('--so-custo')) process.exit(0);
const miss = Object.keys(DANCES).filter(k => !PROMPT[k]); if (miss.length) { console.error('sem prompt:', miss); process.exit(1); }
for (const id of (only.length ? only : Object.keys(DANCES))) {
  const out = `public/sfx/dn_${id}.mp3`; if (fs.existsSync(out)) { console.log('ja tem', id); continue; }
  const seconds = Math.max(3, Math.min(11, Math.ceil(danceLen(id))));
  if (left < seconds * 50) { console.log('PAROU: cota no fim, faltou', id, 'saldo', left); break; }
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: PROMPT[id] + OLD, duration_seconds: seconds, prompt_influence: 0.6 }) });
  if (!r.ok) { console.log('FALHOU', id, r.status, (await r.text()).slice(0, 180)); if (r.status === 401 || r.status === 402 || r.status === 429) break; continue; }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  const now = await sub(); console.log('gerado', id, seconds + ' s', 'custou', left - now, 'saldo', now); left = now;
}
