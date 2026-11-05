// Visual do Roube o Cofre (03/11): cofre redondo de desenho com porta que abre, anel de arrombar no chao,
// van de fuga com cifrao, bolsas de dinheiro (no cofre, nas costas de quem carrega, piscando no chao) e a barra do HUD.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ink, geo, toon, outline, PAL, wordTexture } from './toon.js';
import { HEIST, SMUGGLE } from '../shared/weapons.js';
import { heistFace } from '../shared/heist.js';
import { t } from './i18n.js';

const SEG = 24; // gomos do anel de arrombar

// modelos do Tripo (03/11, ele escolheu Cofre B e Van A): mantem a textura deles, troca o material pelo de desenho
// (luz chapada + contorno de tinta). Frente do Tripo = +x; `turn` gira pra frente que a cena espera. Um carregamento so.
const PROPS = {};
function loadProp(file, size, axis, turn) {
  return (PROPS[file] ||= new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/' + file).then(g => {
    const src = []; g.scene.traverse(o => { if (o.isMesh) src.push(o); });
    const box = new THREE.Box3().setFromObject(g.scene), dim = box.getSize(new THREE.Vector3());
    const k = size / dim[axis], mats = new Map();
    return () => {
      const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
      for (const o of src) {
        const map = o.material?.map || null; if (map) map.colorSpace = THREE.SRGBColorSpace;
        const m = new THREE.Mesh(o.geometry, mats.get(map) || mats.set(map, toon(0xffffff, { map })).get(map));
        m.applyMatrix4(o.matrixWorld); outline(m, 0.012); inner.add(m);
      }
      inner.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2); // pe no chao, centro no meio
      root.scale.setScalar(k); root.rotation.y = turn;
      return root;
    };
  }));
}

function vaultMesh() {
  const g = new THREE.Group();
  const frame = ink(geo(THREE.BoxGeometry, 3.6, 3.8, 1.4), PAL.dark, 0.06); frame.position.y = 1.9; g.add(frame);
  const top = ink(geo(THREE.BoxGeometry, 3.9, 0.3, 1.6), PAL.ink, 0.04); top.position.y = 3.95; g.add(top);
  // porta redonda presa na dobradica da esquerda (gira pra abrir)
  const hinge = new THREE.Group(); hinge.position.set(-1.45, 1.9, 0.75); g.add(hinge);
  const door = new THREE.Group(); door.position.x = 1.45; hinge.add(door);
  const plate = ink(geo(THREE.CylinderGeometry, 1.45, 1.45, 0.35, 28), PAL.light, 0.06); plate.rotation.x = Math.PI / 2; door.add(plate);
  const ring = ink(geo(THREE.TorusGeometry, 1.2, 0.08, 6, 28), PAL.ink, 0); ring.position.z = 0.19; door.add(ring);
  const dial = ink(geo(THREE.CylinderGeometry, 0.32, 0.32, 0.2, 18), PAL.ink, 0.03); dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.45, 0.27); door.add(dial);
  const mark = ink(geo(THREE.BoxGeometry, 0.05, 0.22, 0.05), PAL.red, 0); mark.position.set(0, 0.6, 0.39); door.add(mark);
  const wheel = new THREE.Group(); wheel.position.set(0, -0.35, 0.3); door.add(wheel);
  for (let i = 0; i < 3; i++) { const s = ink(geo(THREE.BoxGeometry, 1.2, 0.1, 0.1), PAL.ink, 0.02); s.rotation.z = i * Math.PI / 3; wheel.add(s); }
  g.userData = { hinge, dial, wheel };
  return g;
}

function vanMesh() {
  // furgao de fuga anos 30: cabine arredondada, bau com faixa vermelha e cifrao, portas de tras abertas
  const g = new THREE.Group();
  const cargo = ink(geo(THREE.BoxGeometry, 2.6, 2.6, 4.2), PAL.paper, 0.07); cargo.position.set(0, 1.9, 0.8); g.add(cargo);
  const stripe = ink(geo(THREE.BoxGeometry, 2.66, 0.45, 4.26), PAL.red, 0); stripe.position.set(0, 1.5, 0.8); g.add(stripe);
  const cab = ink(geo(THREE.BoxGeometry, 2.4, 1.9, 1.9), PAL.dark, 0.06); cab.position.set(0, 1.55, -2.2); g.add(cab);
  const hood = ink(geo(THREE.CylinderGeometry, 0.85, 0.85, 2.3, 14, 1, false, 0, Math.PI), PAL.dark, 0.05); hood.rotation.z = Math.PI / 2; hood.position.set(0, 1.05, -3.4); g.add(hood);
  const glass = ink(geo(THREE.BoxGeometry, 2.2, 0.7, 0.08), PAL.light, 0.02); glass.position.set(0, 2.05, -3.17); g.add(glass);
  for (const [x, z] of [[-1.2, -2.6], [1.2, -2.6], [-1.2, 1.9], [1.2, 1.9]]) { const w = ink(geo(THREE.CylinderGeometry, 0.55, 0.55, 0.35, 14), PAL.ink, 0.04); w.rotation.z = Math.PI / 2; w.position.set(x, 0.55, z); g.add(w); }
  for (const s of [-1, 1]) { const d = ink(geo(THREE.BoxGeometry, 1.25, 2.4, 0.1), PAL.paper, 0.04); d.position.set(s * 1.85, 1.9, 3.3); d.rotation.y = s * 1.2; g.add(d); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: wordTexture('$', { burst: false, size: 128 }), transparent: true }));
  sign.position.set(1.32, 2.35, 0.8); sign.rotation.y = Math.PI / 2; g.add(sign);
  const sign2 = sign.clone(); sign2.position.x = -1.32; sign2.rotation.y = -Math.PI / 2; g.add(sign2);
  g.userData.own = [sign.geometry, sign.material];
  return g;
}

// caixote de contrabando (Contrabando, 04/11): madeira com tabuas cruzadas e carimbo vermelho
function crateMesh() {
  const g = new THREE.Group();
  const box = ink(geo(THREE.BoxGeometry, 0.9, 0.7, 0.7), 0xa07a4a, 0.04); g.add(box);
  for (const s0 of [-1, 1]) { const x = ink(geo(THREE.BoxGeometry, 0.95, 0.1, 0.06), 0x6e5032, 0); x.rotation.z = s0 * 0.62; x.position.z = 0.37; g.add(x); const x2 = x.clone(); x2.position.z = -0.37; g.add(x2); }
  const st = ink(geo(THREE.BoxGeometry, 0.3, 0.2, 0.02), PAL.red, 0); st.position.set(0.2, 0.18, 0.38); g.add(st);
  return g;
}
function bagMesh() {
  const g = new THREE.Group();
  const sack = ink(geo(THREE.SphereGeometry, 0.42, 12, 10), 0xb89a63, 0.04); sack.scale.set(1, 0.95, 0.85); g.add(sack);
  const neck = ink(geo(THREE.CylinderGeometry, 0.12, 0.2, 0.22, 10), 0xb89a63, 0.03); neck.position.y = 0.44; g.add(neck);
  const tie = ink(geo(THREE.TorusGeometry, 0.14, 0.04, 6, 12), PAL.ink, 0); tie.rotation.x = Math.PI / 2; tie.position.y = 0.4; g.add(tie);
  return g;
}

// selo flutuante que aparece atraves da parede (objetivo sempre visivel)
// 04/11 (pedido dele: estava feio e escuro): bilhete de teatro de 1930. Papel claro de cantos recortados, borda dupla de tinta,
// sombra chapada, faixa na cor do objetivo e uma setinha pra baixo. Claro de proposito: le em galpao escuro e no sol
function ticket(text, color) {
  const W = 512, H = 208, bh = 132, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), ink = '#141210', paper = '#f4efe2', x = 14, y = 12, w = W - 34, cut = 16;
  const shape = (ox, oy) => {
    g.beginPath(); g.moveTo(x + cut + ox, y + oy); g.lineTo(x + w - cut + ox, y + oy);
    g.arc(x + w + ox, y + oy, cut, Math.PI, Math.PI / 2, true); g.lineTo(x + w + ox, y + bh - cut + oy);
    g.arc(x + w + ox, y + bh + oy, cut, -Math.PI / 2, Math.PI, true);
    g.lineTo(W / 2 + 24 + ox, y + bh + oy); g.lineTo(W / 2 + ox, y + bh + 34 + oy); g.lineTo(W / 2 - 24 + ox, y + bh + oy); // setinha
    g.lineTo(x + cut + ox, y + bh + oy); g.arc(x + ox, y + bh + oy, cut, 0, -Math.PI / 2, true);
    g.lineTo(x + ox, y + cut + oy); g.arc(x + ox, y + oy, cut, Math.PI / 2, 0, true); g.closePath();
  };
  shape(9, 9); g.fillStyle = ink; g.fill();
  shape(0, 0); g.fillStyle = paper; g.fill(); g.lineWidth = 7; g.strokeStyle = ink; g.lineJoin = 'round'; g.stroke();
  g.save(); shape(0, 0); g.clip(); g.fillStyle = color; g.fillRect(x, y, w, 24); g.fillStyle = ink; g.fillRect(x, y + 24, w, 4); g.restore();
  g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(x + 22, y + 36, w - 44, bh - 46);
  let px = 62; const word = String(text).toUpperCase();
  do { g.font = `400 ${px}px "Bowlby One"`; px -= 2; } while (g.measureText(word).width > w - 76 && px > 24);
  g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, x + w / 2, y + 36 + (bh - 46) / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function label(text, color) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ticket(text, color), transparent: true, depthTest: false, fog: false, toneMapped: false }));
  s.renderOrder = 8; s.scale.set(4.1, 4.1 * 208 / 512, 1);
  return s;
}

export class HeistView {
  constructor(scene) {
    this.scene = scene; this.root = new THREE.Group(); scene.add(this.root);
    this.bags = new Map(); this.built = false; this.lastOpen = false;
  }

  build(H) {
    this.built = true;
    if (H.kind === 'smuggle') return this.buildSmuggle(H);
    const face = heistFace(H); // porta virada pro lado de quem ataca (mesmo giro da caixa solida)
    this.vault = vaultMesh(); this.vault.position.fromArray(H.vault); this.vault.rotation.y = face; this.root.add(this.vault);
    this.van = vanMesh(); this.van.position.fromArray(H.van); this.van.rotation.y = face + Math.PI; this.root.add(this.van);
    // troca pelos modelos do Tripo quando carregarem (o de codigo fica so ate la)
    const swap = (old, make) => { const g = new THREE.Group(); g.position.copy(old.position); g.rotation.copy(old.rotation); g.add(make()); g.userData = { tripo: true, own: old.userData.own }; this.root.remove(old); this.root.add(g); return g; };
    loadProp('heist_vault.glb', 3.8, 'y', -Math.PI / 2).then(make => { if (this.vault && this.root.parent) this.vault = swap(this.vault, make); }).catch(e => console.warn('cofre do Tripo:', e));
    loadProp('heist_van.glb', 5.2, 'x', Math.PI / 2).then(make => { if (this.van && this.root.parent) this.van = swap(this.van, make); }).catch(e => console.warn('van do Tripo:', e));
    // anel de arrombar: gomos que enchem
    this.segGeo = new THREE.RingGeometry(HEIST.crackR - 0.5, HEIST.crackR, 4, 1, 0, Math.PI * 2 / SEG * 0.85);
    this.segOff = new THREE.MeshBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.segOn = new THREE.MeshBasicMaterial({ color: PAL.red, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.segs = [];
    for (let i = 0; i < SEG; i++) { const m = new THREE.Mesh(this.segGeo, this.segOff); m.rotation.x = -Math.PI / 2; m.rotation.z = (i / SEG) * Math.PI * 2; m.position.set(H.vault[0], H.vault[1] + 0.06, H.vault[2]); this.root.add(m); this.segs.push(m); }
    this.vanRingGeo = new THREE.RingGeometry(HEIST.vanR - 0.3, HEIST.vanR, 32);
    this.vanRing = new THREE.Mesh(this.vanRingGeo, new THREE.MeshBasicMaterial({ color: 0x2e7d32, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    this.vanRing.rotation.x = -Math.PI / 2; this.vanRing.position.set(H.van[0], H.van[1] + 0.06, H.van[2]); this.root.add(this.vanRing);
    this.vLbl = label(t('hsVault'), '#a83a2c'); this.vLbl.position.set(H.vault[0], H.vault[1] + 6, H.vault[2]); this.root.add(this.vLbl);
    this.nLbl = label(t('hsVan'), '#2e7d32'); this.nLbl.position.set(H.van[0], H.van[1] + 4.2, H.van[2]); this.root.add(this.nLbl);
  }

  // Contrabando: sem cofre nem van (pilha e barco sao do mapa); so o anel da entrega no conves e as placas
  buildSmuggle(H) {
    this.smuggle = true; this.segs = []; this.flights = [];
    this.vanRingGeo = new THREE.RingGeometry(SMUGGLE.vanR - 0.3, SMUGGLE.vanR, 32);
    this.vanRing = new THREE.Mesh(this.vanRingGeo, new THREE.MeshBasicMaterial({ color: 0x2e7d32, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    this.vanRing.rotation.x = -Math.PI / 2; this.vanRing.position.set(H.van[0], H.van[1] + 0.06, H.van[2]); this.root.add(this.vanRing);
    this.vLbl = label(t('smPile'), '#a83a2c'); this.vLbl.position.set(H.vault[0], H.vault[1] + 5, H.vault[2]); this.root.add(this.vLbl);
    this.nLbl = label(t('smBoat'), '#2e7d32'); this.nLbl.position.set(H.van[0], H.van[1] + 4.5, H.van[2]); this.root.add(this.nLbl);
  }
  // passe no ar: arco do ponto de quem jogou ate o colega (ou ate o chao)
  pass(e) { this.flights ||= []; this.flights.push({ from: e.from, to: e.to, at: e.at, dur: e.dur || 0.55, t: 0 }); }

  // H = estado do servidor; posOf(id) = posicao atual de um jogador (eu ou remoto)
  sync(H, posOf, myId) {
    if (!H) return;
    // 04/11 (hotfix): trocar Cofre <-> Contrabando no lobby reaproveitava a cena: o Cais ficava com cofre, van e placa do outro modo
    const key = H.kind + '|' + H.vault + '|' + H.van;
    if (this.built && this.key !== key) this.clear();
    this.key = key;
    if (!this.built) this.build(H);
    this.H = H; this.posOf = posOf; this.myId = myId;
    const k = Math.round(H.crack * SEG);
    this.segs.forEach((m, i) => { m.material = H.open || i < k ? this.segOn : this.segOff; });
    for (const [id, st, carrier, pos] of H.bags) {
      let b = this.bags.get(id);
      if (!b) { b = this.smuggle ? crateMesh() : bagMesh(); this.root.add(b); this.bags.set(id, b); }
      b.userData.st = st; b.userData.carrier = carrier; b.userData.pos = pos; b.userData.slot = id;
    }
  }

  update(dt, time) {
    const H = this.H;
    if (H && this.smuggle) return this.updateSmuggle(dt, time);
    if (!H || !this.vault) return;
    // porta abre de vez quando o cofre abre; o segredo gira enquanto arromba
    const u = this.vault.userData;
    if (u.tripo) {
      // modelo inteiro: treme enquanto arromba e da um pulo quando abre
      if (H.open && !this.popT) this.popT = time; else if (!H.open) this.popT = 0; // rodada nova: fecha de novo
      const pop = this.popT ? Math.max(0, 1 - (time - this.popT) * 2) : 0;
      this.vault.children[0].position.set(!H.open && H.state === 'crack' ? Math.sin(time * 40) * 0.04 : 0, Math.sin(pop * Math.PI) * 0.6, 0);
    } else {
      const want = H.open ? -1.9 : 0, hg = u.hinge;
      hg.rotation.y += (want - hg.rotation.y) * Math.min(1, dt * 3);
      if (!H.open && H.state === 'crack') { u.dial.rotation.y += dt * 6; u.wheel.rotation.z += dt * 2; }
    }
    const blink = H.state === 'contest' && Math.floor(time * 4) % 2;
    for (const m of this.segs) m.visible = !blink;
    this.vanRing.material.opacity = 0.45 + Math.sin(time * 4) * 0.2;
    for (const b of this.bags.values()) {
      const u = b.userData;
      // a minha nas costas nao aparece (em primeira pessoa ela tampava a camera); o HUD avisa
      b.visible = u.st !== 3 && (u.st !== 0 || H.open) && !(u.st === 1 && u.carrier === this.myId);
      if (!b.visible) continue;
      if (u.st === 0) { // empilhadas na boca do cofre
        const row = u.slot % 4, col = Math.floor(u.slot / 4);
        b.position.set(H.vault[0] + (row - 1.5) * 0.7, H.vault[1] + 0.4 + col * 0.7, H.vault[2]);
        const f = this.vault.rotation.y; b.position.x += Math.sin(f) * 1.4; b.position.z += Math.cos(f) * 1.4;
      } else if (u.st === 1) { // nas costas de quem carrega
        const p = this.posOf?.(u.carrier) || u.pos;
        if (p) b.position.set(p[0], p[1] + 1.75 + Math.sin(time * 9) * 0.05, p[2]);
      } else if (u.pos) { // no chao, pulando e piscando
        b.position.set(u.pos[0], u.pos[1] + 0.45 + Math.abs(Math.sin(time * 3)) * 0.3, u.pos[2]);
        b.visible = Math.floor(time * 5) % 4 !== 0;
      }
      b.rotation.y += dt * (u.st === 2 ? 2 : 0.4);
    }
  }

  updateSmuggle(dt, time) {
    const H = this.H;
    this.vanRing.material.opacity = 0.45 + Math.sin(time * 4) * 0.2;
    for (const f of this.flights) f.t += dt;
    this.flights = this.flights.filter(f => f.t < f.dur + 0.1);
    for (const b of this.bags.values()) {
      const u = b.userData;
      b.visible = u.st !== 3 && !(u.st === 1 && u.carrier === this.myId);
      if (!b.visible) continue;
      if (u.st === 0) { // empilhados na pilha do armazem (2 andares de 4)
        const row = u.slot % 4, col = Math.floor(u.slot / 4);
        b.position.set(H.vault[0] + (row - 1.5) * 1, H.vault[1] + 0.35 + col * 0.72, H.vault[2] - 2.2); b.rotation.set(0, 0, 0);
      } else if (u.st === 1) { // erguido acima da cabeca (a bola de rugbi do desenho)
        const p = this.posOf?.(u.carrier) || u.pos;
        if (p) b.position.set(p[0], p[1] + 2.05 + Math.sin(time * 9) * 0.05, p[2]);
        b.rotation.x = 0; b.rotation.y += dt * 0.5;
      } else if (u.st === 4) { // no ar: arco do passe
        const f = this.flights.find(x => x.to === u.carrier) || this.flights[this.flights.length - 1];
        const to = (f && (this.posOf?.(f.to) || f.at)) || u.pos, from = f?.from || u.pos;
        const k = f ? Math.min(1, f.t / f.dur) : 1;
        if (from && to) b.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] + 1.4 - from[1]) * k + Math.sin(k * Math.PI) * 2.2, from[2] + (to[2] - from[2]) * k);
        b.rotation.x += dt * 9;
      } else if (u.pos) { // no chao, pulando e piscando
        b.position.set(u.pos[0], u.pos[1] + 0.4 + Math.abs(Math.sin(time * 3)) * 0.25, u.pos[2]); b.rotation.x = 0;
        b.visible = Math.floor(time * 5) % 4 !== 0; b.rotation.y += dt * 2;
      }
    }
  }

  // barra do topo: arrombando (gomos) ou dinheiro na van (meta); papel e rodada embaixo
  hud(H, myTeam, inGame) {
    let bar = document.getElementById('hsBar');
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'esc-bar hs-bar'; bar.id = 'hsBar'; bar.hidden = true;
      bar.innerHTML = '<div class="eb-track"><i class="eb-fill" id="hsFill"></i><span id="hsMarks"></span></div><p class="eb-st"><span class="eb-n red" id="hsRed">0</span><em id="hsState"></em><span class="eb-n blue" id="hsBlue">0</span></p><p class="eb-role" id="hsRole"></p>';
      document.getElementById('hud').appendChild(bar);
      bar.dataset.marks = '';
    }
    bar.hidden = !H || !inGame;
    if (bar.hidden) return;
    // marcas da meta: uma por bolsa ($) ou por caixote (Contrabando)
    const nm = Math.round(H.quota / (this.smuggle ? 1 : HEIST.bagValue)), mk = (this.smuggle ? 's' : 'h') + nm, sym = this.smuggle ? '#' : '$';
    if (bar.dataset.marks !== mk) { bar.dataset.marks = mk; document.getElementById('hsMarks').innerHTML = Array.from({ length: nm - 1 }, (_, i) => '<i style="left:' + ((i + 1) / nm * 100).toFixed(1) + '%">' + sym + '</i>').join(''); }
    const k = H.open ? H.money / H.quota : H.crack;
    document.getElementById('hsFill').style.width = (Math.min(1, k) * 100).toFixed(1) + '%';
    document.getElementById('hsFill').classList.toggle('money', H.open);
    document.getElementById('hsMarks').hidden = !H.open;
    document.getElementById('hsRed').textContent = H.wins.red; document.getElementById('hsBlue').textContent = H.wins.blue;
    const st = this.smuggle ? t('smCount', { n: H.money, q: H.quota }) : H.open ? `$${H.money.toLocaleString('pt-BR')} / $${H.quota.toLocaleString('pt-BR')}` : H.state === 'contest' ? t('hsContest') : H.state === 'crack' ? t('hsCrack') + ' ' + Math.round(H.crack * 100) + '%' : t('hsVault');
    const se = document.getElementById('hsState'); if (se.textContent !== st) se.textContent = st;
    bar.dataset.st = H.state;
    const mine = H.bags.some(b => b[1] === 1 && b[2] === this.myId);
    const role = mine && this.smuggle ? t('smYou') : mine ? '$ ' + t('hsYouBag') : (myTeam === H.atk ? t('hsAtk') : myTeam ? t('hsDef') : '') + ' · ' + t('hsRound', { n: H.round });
    const re = document.getElementById('hsRole'); if (re.textContent !== role) { re.textContent = role; re.className = 'eb-role ' + (mine ? 'bag' : myTeam || ''); }
  }

  // tira tudo da cena e volta pro estado de antes do build (a raiz fica)
  clear() {
    this.freeParts();
    for (const c of [...this.root.children]) this.root.remove(c);
    this.bags.clear(); this.built = false; this.smuggle = false; this.lastOpen = false; this.segs = []; this.flights = [];
    this.vault = this.van = this.vanRing = this.vLbl = this.nLbl = null; this.segGeo = this.segOff = this.segOn = this.vanRingGeo = null; this.H = null;
  }
  dispose() {
    this.root.parent?.remove(this.root);
    this.freeParts();
    document.getElementById('hsBar')?.setAttribute('hidden', '');
  }
  freeParts() {
    this.segGeo?.dispose(); this.segOff?.dispose(); this.segOn?.dispose(); this.vanRingGeo?.dispose(); this.vanRing?.material.dispose();
    for (const l of [this.vLbl, this.nLbl]) { l?.material.map?.dispose(); l?.material.dispose(); }
    if (this.van?.userData.own) for (const o of this.van.userData.own) o.dispose();
  }
}
