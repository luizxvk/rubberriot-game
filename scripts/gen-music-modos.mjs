// Trilhas por modo/mapa (06/11, pedido dele): mesma receita das music_m* (sound-generation, 22 s, gramofone), no tema de cada modo.
// Pula o que ja existe. Uso: node scripts/gen-music-modos.mjs [nome]
import fs from 'node:fs';
import path from 'node:path';
const envTxt = fs.readFileSync(path.resolve('../.env.api-keys'), 'utf8');
const KEY = (envTxt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/) || [])[1];
const END = ', steady loopable groove, old gramophone sound, instrumental';
const TRACKS = {
  music_heist: '1930s rubber hose cartoon caper music, sneaky tiptoe pizzicato strings and muted wah-wah trumpet, bank robbers sneaking, playful suspense, medium tempo' + END,
  music_borroes: '1930s cartoon spooky night music, skeleton dance xylophone and bassoon, eerie but silly haunted house, ink monsters creeping' + END,
  music_blitz: '1930s cartoon war march, big band brass fanfare with snare drum rolls and tuba, frantic huge battle, comedic and heroic, fast tempo' + END,
  music_bomb: '1930s cartoon ticking time bomb suspense, woodblock ticking clock rhythm with pizzicato bass and nervous clarinet, comedic tension' + END,
  music_escort: '1930s cartoon train ride music, chugging rhythm with banjo, slide whistle and steam whistle accents, bouncy locomotive groove' + END,
  music_deserto: '1930s cartoon western music, galloping banjo, harmonica and whistling melody, dusty desert showdown, comedic cowboy' + END,
  // 19/11 (pedido dele): Roubo ao Trem e um tema por percurso do Pulo do Gato
  music_trem: '1930s rubber hose cartoon train heist music, chugging locomotive rhythm on snare brushes, sneaky muted trumpet and pizzicato, steam whistle accents, daring robbery on a moving train' + END,
  music_bh_telhados: '1930s cartoon rooftop chase music, bouncy piano and clarinet hopping melody, cats jumping across village roofs, playful and quick' + END,
  music_bh_picadeiro: '1930s cartoon circus music, oompah tuba and calliope organ, acrobats leaping, marching circus galop, cheerful and dizzy' + END,
  music_bh_caixotes: '1930s cartoon sea shanty music, accordion and fiddle, jumping over crates on the docks with sharks below, bouncy nautical jig' + END,
  music_bh_montagem: '1930s cartoon factory music, clanking percussion and pumping brass, conveyor belts and pistons rhythm, mechanical comedic march' + END,
  music_bh_nanquim: '1930s cartoon dreamy surreal music, celesta and muted strings with wobbly saw sound, floating on ink clouds, mysterious and whimsical' + END,
};
const only = process.argv[2];
for (const [name, text] of Object.entries(TRACKS)) {
  if (only && name !== only) continue;
  const out = `public/sfx/${name}.mp3`;
  if (fs.existsSync(out)) { console.log('ok', name); continue; }
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, duration_seconds: 22, prompt_influence: 0.55 }) });
  if (!r.ok) { console.log('FALHOU', name, r.status, (await r.text()).slice(0, 200)); continue; }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log('gerado', name);
}
