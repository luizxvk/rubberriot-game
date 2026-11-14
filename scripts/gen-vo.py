# Locutor Callum (ElevenLabs eleven_v3) + filtro de radio antigo. Gera public/sfx/vo_<chave>.mp3
# Uso (dentro de tinta-louca): python scripts/gen-vo.py scripts/vo-lines/<arquivo>.json
#   o JSON e {"chave": "[excited] texto em ingles", ...}; chaves que ja tem mp3 sao puladas (nao gasta credito)
# Chave ELEVENLABS_API_KEY em ../.env.api-keys. Copia tambem pra rubber-riot-video/identidade-2026-11-06/locutor-callum/
# e junta o texto no falas.json de la. Locutor SO EM INGLES (regra dele); legenda PT/EN vai no i18n (vosub_<chave>).
import json, os, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = next(l.split('=', 1)[1].strip().strip('"') for l in open(os.path.join(ROOT, '..', '.env.api-keys'), encoding='utf-8') if l.startswith('ELEVENLABS_API_KEY='))
VOICE = 'N2lVS1w4EtoT3dr4eOWO'  # Callum - Husky Trickster (escolhido por ele 06/11)
ARQ = os.path.join(ROOT, '..', 'rubber-riot-video', 'identidade-2026-11-06', 'locutor-callum')
FILTRO = ('[0]silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
          'vibrato=f=4.5:d=0.02,highpass=f=450,lowpass=f=2800,acompressor=threshold=-20dB:ratio=6:makeup=6,asoftclip=type=tanh,'
          'aecho=0.9:0.85:18:0.2,loudnorm=I=-15:TP=-1.5:LRA=7[v];[1]highpass=f=1500,lowpass=f=5000[n];'
          '[2]highpass=f=3000,agate=threshold=0.45:ratio=20:attack=0.01:release=5,volume=0.08[c];'
          # 14/11 (pedido dele: "antes de sair o audio sai um chiado, deixar apenas a voz"): o chiado e os estalos ficam de fora
          # (peso 0); a voz sai com o vao entre as palavras limpo, sem cauda de ruido no comeco nem no fim
          '[v][n][c]amix=inputs=3:duration=first:normalize=0:weights=1 0 0,afftdn=nr=20:nf=-40,'
          'agate=threshold=0.04:ratio=8:attack=2:release=120:range=0.03,silenceremove=start_periods=1:start_threshold=-30dB,'
          'afade=t=in:d=0.012,alimiter=limit=0.95')

lines = json.load(open(sys.argv[1], encoding='utf-8'))
tmp = tempfile.mkdtemp()
for k, text in lines.items():
    out = os.path.join(ROOT, 'public', 'sfx', f'vo_{k}.mp3')
    if os.path.exists(out): print(k, 'ja existe, pulando'); continue
    body = json.dumps({'text': text, 'model_id': 'eleven_v3', 'voice_settings': {'stability': 0.0}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128', data=body,
                                 headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
    raw = os.path.join(tmp, f'raw-{k}.mp3')
    open(raw, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.012:d=30',
                    '-f', 'lavfi', '-i', 'anoisesrc=color=white:amplitude=0.5:d=30', '-filter_complex', FILTRO,
                    '-ar', '44100', '-b:a', '128k', out], check=True)
    if os.path.isdir(ARQ):
        import shutil; shutil.copy(out, ARQ)
    print(k, 'ok')
if os.path.isdir(ARQ):
    fj = os.path.join(ARQ, 'falas.json'); f = json.load(open(fj, encoding='utf-8')) if os.path.exists(fj) else {}
    f.update(lines); json.dump(f, open(fj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
