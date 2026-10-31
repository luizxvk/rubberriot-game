// Compartilhar (31/10, pedido dele): cartaz de PROCURADO do melhor da partida (PNG 1080x1350, formato do feed)
// e baixar/compartilhar arquivo. O retrato e o boneco de verdade, com o visual e a arma dele, num renderizador
// proprio pequeno (nao mexe no canvas do jogo).
import * as THREE from 'three';
import { Character } from './character.js';
import { t } from './i18n.js';

export const SITE = 'rubberriot.tryrovex.com';
const PAPER = '#ece9e1', INK = '#141210', RED = '#a83a2c';

let pr = null; // renderizador do retrato (criado uma vez)
function portrait({ look, team, wpn, lo }, w = 760, h = 600) {
  if (!pr) {
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true }); // fundo transparente: o mapa desfocado entra por baixo
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    renderer.setClearColor(0x000000, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a857c, 1.7));
    const l = new THREE.DirectionalLight(0xffffff, 2.3); l.position.set(2, 3, 4); scene.add(l);
    pr = { renderer, scene, cam: new THREE.PerspectiveCamera(26, 1, 0.05, 50) };
  }
  const { renderer, scene, cam } = pr;
  renderer.setSize(w, h, false);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  const ch = new Character(team || null, '', look || null);
  ch.tag.visible = false; if (ch.shadow) ch.shadow.visible = false;
  try { if (wpn && wpn !== 'fists') ch.setWeapon(wpn, lo || null); } catch { /* arma ainda carregando: sem arma */ }
  ch.update?.(0.016, { anim: 'idle', pitch: 0, alive: true, speed: 0, t: 0, airH: 0 });
  ch.root.rotation.y = Math.PI - 0.4; // de frente, em tres quartos (como foto de delegacia de desenho)
  scene.add(ch.root);
  cam.position.set(0.6, 1.35, 5.4); cam.lookAt(0, 1.12, 0); // boneco inteiro no quadro
  renderer.render(scene, cam);
  scene.remove(ch.root);
  return renderer.domElement;
}

// papel velho: grao, manchas e bordas queimadas
function paper(ctx, W, H) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 14; k++) { // manchas de cafe
    const x = Math.random() * W, y = Math.random() * H, r = 40 + Math.random() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(120,90,50,.10)'); g.addColorStop(1, 'rgba(120,90,50,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
  v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(60,40,20,.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
// texto que encolhe pra caber na largura
function fit(ctx, txt, x, y, maxW, size, font, color, stroke = 0) {
  let s = size; ctx.font = `${s}px ${font}`;
  while (ctx.measureText(txt).width > maxW && s > 18) { s -= 2; ctx.font = `${s}px ${font}`; }
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); }
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
}

// p = { name, kills, deaths, map (nome do mapa ja traduzido), look, team, wpn, lo }
export async function wantedPoster(p) {
  const W = 1080, H = 1350, DISP = "'Bowlby One', 'Arial Black', sans-serif", BODY = "'Grandstander', 'Trebuchet MS', sans-serif";
  try { await Promise.all([document.fonts.load(`80px 'Bowlby One'`), document.fonts.load(`800 40px 'Grandstander'`)]); } catch { /* fonte de reserva */ }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  paper(ctx, W, H);
  // moldura dupla de cartaz
  ctx.strokeStyle = INK; ctx.lineWidth = 14; ctx.strokeRect(34, 34, W - 68, H - 68);
  ctx.lineWidth = 4; ctx.strokeRect(62, 62, W - 124, H - 124);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  fit(ctx, t('wp_title'), W / 2, 230, W - 180, 190, DISP, INK);
  ctx.font = `800 46px ${BODY}`; ctx.fillStyle = INK; ctx.fillText(t('wp_sub'), W / 2, 296);
  // retrato com borda grossa, em tom de foto velha: o mapa da partida desfocado no fundo (faroeste) e o boneco na frente
  const px = (W - 760) / 2, py = 330;
  ctx.save();
  ctx.beginPath(); ctx.rect(px, py, 760, 600); ctx.clip();
  if (p.bg) {
    const bw = p.bg.width || 1, bh = p.bg.height || 1, k = Math.max(760 / bw, 600 / bh) * 1.06; // cobre o quadro (sobra pro desfoque nao mostrar borda)
    ctx.filter = 'blur(9px) grayscale(1) sepia(.5) contrast(.9) brightness(1.05)';
    ctx.drawImage(p.bg, px + 380 - bw * k / 2, py + 300 - bh * k / 2, bw * k, bh * k);
  } else { ctx.fillStyle = '#dcd7cb'; ctx.fillRect(px, py, 760, 600); }
  ctx.filter = 'grayscale(1) sepia(.35) contrast(1.15)';
  ctx.drawImage(portrait(p), px, py, 760, 600);
  ctx.restore();
  ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeRect(px, py, 760, 600);
  // nome, crime, recompensa
  fit(ctx, String(p.name || '?').toUpperCase(), W / 2, 1036, W - 200, 100, DISP, RED, 0);
  ctx.font = `800 40px ${BODY}`; ctx.fillStyle = INK;
  ctx.fillText(t('wp_crime', { n: p.kills || 0, m: p.map || '' }), W / 2, 1092);
  ctx.font = `800 34px ${BODY}`; ctx.fillText(t('wp_reward').toUpperCase(), W / 2, 1148);
  fit(ctx, t('wp_caps', { n: ((p.kills || 0) * 250 + 500).toLocaleString() }), W / 2, 1210, W - 220, 64, DISP, INK);
  ctx.font = `800 26px ${BODY}`; ctx.fillStyle = INK; ctx.fillText('Rubber Riot · ' + SITE, W / 2, H - 92);
  // carimbo torto de borracha no canto do retrato (longe do nome, que pode ser comprido)
  ctx.save(); ctx.translate(px + 760 - 150, py + 70); ctx.rotate(0.22);
  ctx.globalAlpha = 0.82; ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.strokeRect(-150, -46, 300, 92);
  ctx.font = `48px ${DISP}`; ctx.fillStyle = RED; ctx.fillText(t('wp_stamp'), 0, 18); ctx.restore();
  return new Promise(res => c.toBlob(res, 'image/png'));
}

// compartilha (celular) ou baixa (PC)
export async function shareFile(blob, filename, text) {
  const file = new File([blob], filename, { type: blob.type });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: text + ' ' + 'https://' + SITE }); return 'shared'; } } catch (e) { if (e?.name === 'AbortError') return 'aborted'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}

// Clipe da jogada (31/10): grava a tela do jogo em pe (720x1280, formato de Reels) enquanto o replay roda,
// com o nome do jogo em cima e o link embaixo. MP4 quando o navegador deixa, senao WebM.
export class ClipRec {
  constructor(glCanvas, audioCtx, audioOut) {
    this.src = glCanvas;
    const c = this.c = document.createElement('canvas'); c.width = 720; c.height = 1280;
    this.ctx = c.getContext('2d');
    const stream = c.captureStream(30);
    // som do jogo junto (o que sai no master tambem vai pro arquivo)
    if (audioCtx && audioOut) { try { const dst = audioCtx.createMediaStreamDestination(); audioOut.connect(dst); this.aOut = audioOut; this.aDst = dst; dst.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); } catch { /* sem som */ } }
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    this.type = types.find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';
    this.rec = new MediaRecorder(stream, this.type ? { mimeType: this.type, videoBitsPerSecond: 6e6 } : undefined);
    this.parts = []; this.rec.ondataavailable = (e) => { if (e.data.size) this.parts.push(e.data); };
    this.rec.start(250);
  }
  // chamado logo depois do jogo desenhar o quadro
  draw() {
    const { ctx, src } = this, W = 720, H = 1280;
    ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, W, H);
    const k = H / src.height, w = src.width * k; // altura cheia, corta as laterais (centro da tela)
    ctx.drawImage(src, (W - w) / 2, 0, w, H);
    const DISP = "'Bowlby One', 'Arial Black', sans-serif", BODY = "'Grandstander', 'Trebuchet MS', sans-serif";
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = `64px ${DISP}`; ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeText('RUBBER RIOT', W / 2, 120); ctx.fillStyle = PAPER; ctx.fillText('RUBBER RIOT', W / 2, 120);
    // faixa do link embaixo (fica dentro da area segura do Reels)
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 6;
    const bw = 560, bh = 70, bx = (W - bw) / 2, by = H - 230;
    ctx.beginPath(); ctx.roundRect?.(bx, by, bw, bh, 18); if (!ctx.roundRect) ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `800 34px ${BODY}`; ctx.fillText(SITE, W / 2, by + 47);
  }
  stop() {
    return new Promise(res => {
      this.rec.onstop = () => { try { this.aOut?.disconnect(this.aDst); } catch { /* */ } res(new Blob(this.parts, { type: this.type || 'video/webm' })); };
      this.rec.stop();
    });
  }
}
