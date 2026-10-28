// Regenera um SFX com prompt seguido mais a risca: node scripts/regen-one.mjs nome "prompt" duracao [pasta]
import fs from 'node:fs';
const KEY = (fs.readFileSync('../.env.api-keys', 'utf8').match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/) || [])[1];
const [name, text, dur, dir = 'public/sfx'] = process.argv.slice(2);
const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
  method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, duration_seconds: Number(dur), prompt_influence: 0.85 }),
});
if (!r.ok) { console.log('FALHOU', r.status, (await r.text()).slice(0, 200)); process.exit(1); }
fs.writeFileSync(`${dir}/${name}.mp3`, Buffer.from(await r.arrayBuffer()));
console.log('gerado', name);
