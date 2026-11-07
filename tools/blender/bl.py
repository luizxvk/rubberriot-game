# Ponte pro Blender aberto (06/11): fala com a extensao MCP da Blender Lab (soquete localhost:9876, JSON terminado em \0).
# Uso: python bl.py arquivo.py  (ou codigo pelo stdin). O codigo devolve dados em `result = {...}`.
import json, socket, sys
code = open(sys.argv[1], encoding='utf-8').read() if len(sys.argv) > 1 else sys.stdin.read()
s = socket.create_connection(('localhost', 9876), timeout=600)
s.sendall((json.dumps({'type': 'execute', 'code': code, 'strict_json': False}) + '\0').encode('utf-8'))
buf = b''
while not buf.endswith(b'\0'):
    ch = s.recv(65536)
    if not ch: break
    buf += ch
r = json.loads(buf.rstrip(b'\0').decode('utf-8'))
print(json.dumps(r, ensure_ascii=False, indent=1)[:20000])
sys.exit(0 if r.get('status') == 'ok' else 1)
