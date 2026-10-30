// Gera as trilhas das partidas pelo ElevenLabs (sound-generation), variacoes comicas da do menu.
// Pula o que ja existe. Depois: cortar o silencio das pontas (ver scripts/trim-music.sh) pro loop nao ter buraco.
import fs from 'node:fs';
import path from 'node:path';
const envTxt = fs.readFileSync(path.resolve('../.env.api-keys'), 'utf8');
const KEY = (envTxt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/) || [])[1];
if (!KEY) { console.error('sem ELEVENLABS_API_KEY'); process.exit(1); }
const TRACKS = {
  // partidas (sorteia uma)
  music_m1: '1930s rubber hose cartoon chase music, frantic ragtime piano with slide trombone and woodblock, comedic, fast tempo, steady loopable groove, old gramophone sound, instrumental',
  music_m2: '1930s cartoon swing big band, wah-wah muted trumpets and oompah tuba bassline, mischievous and bouncy, steady loopable groove, old gramophone sound, instrumental',
  music_m3: 'old timey vaudeville honky tonk piano with kazoo and xylophone, silly slapstick mood, upbeat, steady loopable groove, old gramophone sound, instrumental',
  music_m4: '1930s cartoon brawl music, galloping banjo and clarinet with xylophone runs and cymbal hits, comedic action, steady loopable groove, old gramophone sound, instrumental',
  // battle royale / dupla: mais tenso, ainda comico
  music_br: '1930s cartoon sneaky suspense march, pizzicato strings, bassoon and tuba creeping, comedic tension building, steady loopable groove, old gramophone sound, instrumental',
};
for (const [name, text] of Object.entries(TRACKS)) {
  const out = `public/sfx/${name}.mp3`;
  if (fs.existsSync(out)) { console.log('ok', name); continue; }
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, duration_seconds: 22, prompt_influence: 0.55 }),
  });
  if (!r.ok) { console.log('FALHOU', name, r.status, (await r.text()).slice(0, 200)); continue; }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log('gerado', name);
}
