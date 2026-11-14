// 좀비 미로 탈출 — 3D 1인칭 모바일 게임
import * as THREE from './three.module.min.js';

const $ = (id) => document.getElementById(id);
const T = 3;                 // 타일 한 칸 크기
const GW = 15, GH = 39;      // 전체 격자 (미로 0~14행, 보스 구역 15~26행, 공 좀비 방 28~37행)
const MAZE_N = 7;
const WALL_H = 3.4, BIG_H = 8;
const tc = (i) => i * T + T / 2;      // 타일 중심 좌표

// ───────────────────────── 난수 / 격자 ─────────────────────────
let seed = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() & 0xffffff);
function rnd() {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];

const grid = new Uint8Array(GW * GH).fill(1);   // 0 통로, 1 벽, 2 닫힌 문
const gi = (c, r) => r * GW + c;
const solid = (c, r) => c < 0 || r < 0 || c >= GW || r >= GH || grid[gi(c, r)] !== 0;
const solidAt = (x, z) => solid(Math.floor(x / T), Math.floor(z / T));

function buildGrid() {
  grid.fill(1);
  // 미로 (재귀 백트래킹)
  const seen = new Uint8Array(MAZE_N * MAZE_N);
  const stack = [[3, 0]];
  seen[3] = 1; grid[gi(7, 1)] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < MAZE_N && ny < MAZE_N && !seen[ny * MAZE_N + nx];
    });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy] = pick(opts);
    const nx = cx + dx, ny = cy + dy;
    seen[ny * MAZE_N + nx] = 1;
    grid[gi(2 * cx + 1 + dx, 2 * cy + 1 + dy)] = 0;
    grid[gi(2 * nx + 1, 2 * ny + 1)] = 0;
    stack.push([nx, ny]);
  }
  // 길을 조금 더 뚫어 순환로를 만든다 (도망갈 길)
  for (let n = 0, tries = 0; n < 9 && tries < 200; tries++) {
    const c = 1 + Math.floor(rnd() * 13), r = 1 + Math.floor(rnd() * 13);
    if ((c + r) % 2 === 1 && grid[gi(c, r)] === 1) { grid[gi(c, r)] = 0; n++; }
  }
  grid[gi(7, 14)] = 2;                                   // 미로 출구 문
  for (let r = 15; r <= 26; r++) for (let c = 1; c <= 13; c++) grid[gi(c, r)] = 0;   // 보스 구역
  for (const c of [6, 7, 8]) grid[gi(c, 27)] = 2;        // 큰 문
  for (let r = 28; r <= 37; r++) for (let c = 1; c <= 13; c++) grid[gi(c, r)] = 0;   // 공 좀비 방
}

// 원(반지름 rad)을 벽과 충돌시키며 이동
function moveCircle(p, dx, dz, rad) {
  for (const axis of [0, 1]) {
    if (axis === 0) p.x += dx; else p.z += dz;
    const c0 = Math.floor((p.x - rad) / T), c1 = Math.floor((p.x + rad) / T);
    const r0 = Math.floor((p.z - rad) / T), r1 = Math.floor((p.z + rad) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!solid(c, r)) continue;
      const nx = Math.max(c * T, Math.min(p.x, c * T + T));
      const nz = Math.max(r * T, Math.min(p.z, r * T + T));
      const ex = p.x - nx, ez = p.z - nz, d2 = ex * ex + ez * ez;
      if (d2 >= rad * rad) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (rad - d) / d; p.x += ex * k; p.z += ez * k; }
      else if (axis === 0) p.x -= dx; else p.z -= dz;
    }
  }
}

// (ox,oz)에서 (dx,dz) 방향으로 벽까지의 거리(방향 벡터 단위)
function rayWall(ox, oz, dx, dz, max) {
  let c = Math.floor(ox / T), r = Math.floor(oz / T);
  if (solid(c, r)) return 0;
  const sc = dx > 0 ? 1 : -1, sr = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(T / dx) : Infinity, tdz = dz !== 0 ? Math.abs(T / dz) : Infinity;
  let tx = dx !== 0 ? ((dx > 0 ? (c + 1) * T - ox : ox - c * T) / Math.abs(dx)) : Infinity;
  let tz = dz !== 0 ? ((dz > 0 ? (r + 1) * T - oz : oz - r * T) / Math.abs(dz)) : Infinity;
  for (let i = 0; i < 80; i++) {
    let t;
    if (tx < tz) { t = tx; tx += tdx; c += sc; } else { t = tz; tz += tdz; r += sr; }
    if (t > max) return max;
    if (solid(c, r)) return t;
  }
  return max;
}
function los(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
  if (d < 0.01) return true;
  return rayWall(ax, az, dx / d, dz / d, d) >= d - 0.01;
}
function raySphere(o, d, cx, cy, cz, rad) {
  const lx = cx - o.x, ly = cy - o.y, lz = cz - o.z;
  const tca = lx * d.x + ly * d.y + lz * d.z;
  if (tca < 0) return null;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > rad * rad) return null;
  return tca - Math.sqrt(rad * rad - d2);
}

// ───────────────────────── 렌더러 / 씬 ─────────────────────────
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
const SKY = 0x0b0d1c;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 3, 30);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 140);
camera.rotation.order = 'YXZ';
scene.add(camera);

scene.add(new THREE.AmbientLight(0x9aa4c8, 1.5));
const sun = new THREE.DirectionalLight(0xbfc8ff, 1.1);
sun.position.set(0.4, 1, 0.25);
scene.add(sun);
const lamp = new THREE.PointLight(0xffe2b0, 2.4, 16, 1);
camera.add(lamp);

function resize() {
  const w = innerWidth, h = innerHeight;
  const s = Math.min(1, 340 / Math.min(w, h));   // 낮은 해상도로 그려 픽셀풍 + 모바일 성능 확보
  renderer.setPixelRatio(1);
  renderer.setSize(Math.max(2, Math.floor(w * s)), Math.max(2, Math.floor(h * s)), false);
  camera.aspect = w / h;
  camera.fov = w > h ? 72 : 88;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// 코드로 그리는 픽셀 텍스처
function pixTex(draw, n = 32) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = n;
  draw(cv.getContext('2d'), n);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const noise = (g, n, base, amp) => {
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = (Math.random() - 0.5) * amp;
    g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`;
    g.fillRect(x, y, 1, 1);
  }
};
const texBrick = pixTex((g, n) => {
  noise(g, n, [96, 110, 104], 26);
  g.fillStyle = '#2c3431';
  for (let y = 0; y < n; y += 8) {
    g.fillRect(0, y, n, 1);
    for (let x = (y / 8) % 2 ? 0 : 8; x < n; x += 16) g.fillRect(x, y, 1, 8);
  }
  g.fillStyle = 'rgba(70,120,60,.5)';
  for (let i = 0; i < 10; i++) g.fillRect(Math.random() * n | 0, Math.random() * n | 0, 2, 1);
});
const texMetal = pixTex((g, n) => {
  noise(g, n, [84, 92, 118], 14);
  g.fillStyle = '#272b3c'; g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n); g.fillRect(0, 16, n, 1);
  g.fillStyle = '#b9c2e0'; for (const [x, y] of [[3, 3], [28, 3], [3, 13], [28, 13], [3, 19], [28, 19], [3, 29], [28, 29]]) g.fillRect(x, y, 1, 1);
  g.fillStyle = '#c9a53a'; g.fillRect(0, 30, n, 2);
});
texMetal.repeat.set(1, 2.4);
texBrick.repeat.set(2, 2);
const texFloor = pixTex((g, n) => {
  noise(g, n, [70, 70, 78], 20);
  g.fillStyle = '#2a2a31'; g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n); g.fillRect(0, 16, n, 1); g.fillRect(16, 0, 1, n);
});
texFloor.repeat.set(GW * 2, GH * 2);
const texWood = pixTex((g, n) => {
  noise(g, n, [122, 78, 40], 18);
  g.fillStyle = '#3d2410'; g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n); g.fillRect(15, 0, 2, n); g.fillRect(n - 1, 0, 1, n);
  g.fillStyle = '#e8c860'; g.fillRect(12, 15, 2, 3); g.fillRect(18, 15, 2, 3);
}, 32);

const mats = {};
const mat = (color) => mats[color] || (mats[color] = new THREE.MeshLambertMaterial({ color }));
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: opacity === 1 });
const unitBox = new THREE.BoxGeometry(1, 1, 1);
function box(parent, w, h, d, x, y, z, material) {
  const m = new THREE.Mesh(unitBox, typeof material === 'number' ? mat(material) : material);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// ───────────────────────── 월드 만들기 ─────────────────────────
const world = new THREE.Group();
scene.add(world);
let exitDoor, gate, finalDoor, mechaModel;
const keys = [], closets = [];
const MECHA_PARK = { x: tc(11), z: tc(17) };

function buildWorld() {
  world.clear(); keys.length = 0; closets.length = 0;
  buildGrid();

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GW * T, GH * T), new THREE.MeshLambertMaterial({ map: texFloor }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(GW * T / 2, 0, GH * T / 2);
  world.add(floor);

  // 벽 (인스턴스)
  const low = [], high = [];
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (grid[gi(c, r)] === 1) (r >= 14 ? high : low).push([c, r]);
  const m4 = new THREE.Matrix4();
  for (const [list, h, tex] of [[low, WALL_H, texBrick], [high, BIG_H, texMetal]]) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(T, h, T), new THREE.MeshLambertMaterial({ map: tex }), list.length);
    list.forEach(([c, r], i) => { m4.makeTranslation(tc(c), h / 2, tc(r)); im.setMatrixAt(i, m4); });
    world.add(im);
  }

  // 미로 출구 문 (열쇠 4개 필요)
  exitDoor = new THREE.Group();
  box(exitDoor, T, BIG_H, 0.6, 0, BIG_H / 2, 0, 0x8a1f1f);
  box(exitDoor, 0.7, 0.9, 0.8, 0, 1.5, 0, 0xe8c040);
  box(exitDoor, T, 0.3, 0.7, 0, 3.2, 0, 0x3a0c0c);
  exitDoor.position.set(tc(7), 0, tc(14));
  exitDoor.userData = { open: false, y: 0 };
  world.add(exitDoor);

  // 큰 문 (보스 처치 후 열 수 있다)
  gate = new THREE.Group();
  box(gate, T * 3, BIG_H, 0.8, 0, BIG_H / 2, 0, 0x3b4a78);
  box(gate, 0.3, BIG_H, 0.9, 0, BIG_H / 2, 0, 0xc9a53a);
  box(gate, T * 3, 0.4, 0.9, 0, 2.2, 0, 0xc9a53a);
  gate.position.set(tc(7), 0, tc(27));
  gate.userData = { open: false, y: 0 };
  world.add(gate);

  // 마지막 문 (공 좀비를 던진 뒤 생긴다)
  finalDoor = new THREE.Group();
  box(finalDoor, 3.0, 4.6, 0.3, 0, 2.3, 0, 0xf2f2ff);
  box(finalDoor, 2.4, 4.0, 0.34, 0, 2.2, 0, glow(0x9fe8ff));
  box(finalDoor, 0.25, 0.25, 0.5, 0.8, 2.1, 0, 0xe8c040);
  finalDoor.position.set(tc(7), 0, 38 * T - 0.2);
  finalDoor.visible = false; finalDoor.userData = { s: 0 };
  world.add(finalDoor);

  // 열쇠 4개
  for (const [cx, cy] of [[0, 1], [6, 0], [1, 6], [6, 5]]) {
    const k = new THREE.Group();
    const gold = glow(0xffd23c);
    box(k, 0.36, 0.36, 0.1, 0, 0.3, 0, gold); box(k, 0.16, 0.16, 0.12, 0, 0.3, 0, mat(0x6a4a00));
    box(k, 0.1, 0.5, 0.1, 0, -0.1, 0, gold); box(k, 0.22, 0.08, 0.1, 0.1, -0.3, 0, gold); box(k, 0.16, 0.08, 0.1, 0.08, -0.15, 0, gold);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 6), glow(0xffe680, 0.22));
    beam.position.y = 3.4; k.add(beam);
    k.position.set(tc(2 * cx + 1), 1.1, tc(2 * cy + 1));
    k.userData = { taken: false, c: 2 * cx + 1, r: 2 * cy + 1 };
    world.add(k); keys.push(k);
  }

  // 옷장 (벽에 붙여 배치)
  const used = new Set();
  const cells = [];
  for (let cy = 0; cy < MAZE_N; cy++) for (let cx = 0; cx < MAZE_N; cx++) cells.push([cx, cy]);
  const wanted = [[3, 2], [1, 3], [5, 3], [2, 5], [5, 6], [0, 0]];
  for (const [cx, cy] of wanted) {
    const c = 2 * cx + 1, r = 2 * cy + 1;
    const side = [[0, -1], [1, 0], [0, 1], [-1, 0]].find(([dx, dz]) => grid[gi(c + dx, r + dz)] === 1);
    if (!side || used.has(gi(c, r))) continue;
    used.add(gi(c, r));
    const w = new THREE.Group();
    const body = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ map: texWood }));
    body.scale.set(1.5, 2.5, 0.7); body.position.y = 1.25; w.add(body);
    box(w, 1.6, 0.12, 0.8, 0, 2.55, 0, 0x4a2c12);
    w.position.set(tc(c) + side[0] * (T / 2 - 0.4), 0, tc(r) + side[1] * (T / 2 - 0.4));
    w.rotation.y = Math.atan2(-side[0], -side[1]);
    w.userData = { c, r, out: { x: tc(c), z: tc(r) }, yaw: Math.atan2(side[0], side[1]) };
    world.add(w); closets.push(w);
  }

  // 메카 로봇 (주차 상태)
  mechaModel = new THREE.Group();
  const steel = 0x5f7fb8, dark = 0x2a3350;
  box(mechaModel, 0.9, 2.2, 1.0, -0.8, 1.1, 0, dark); box(mechaModel, 0.9, 2.2, 1.0, 0.8, 1.1, 0, dark);
  box(mechaModel, 1.1, 0.4, 1.5, -0.8, 0.2, 0.15, steel); box(mechaModel, 1.1, 0.4, 1.5, 0.8, 0.2, 0.15, steel);
  box(mechaModel, 2.8, 2.0, 1.8, 0, 3.2, 0, steel);
  box(mechaModel, 1.6, 0.9, 0.3, 0, 3.6, 0.9, glow(0x7fe0ff));
  box(mechaModel, 1.2, 0.8, 1.2, 0, 4.6, 0, dark);
  box(mechaModel, 0.7, 0.7, 2.4, -1.85, 3.3, 0.6, dark); box(mechaModel, 0.3, 0.3, 0.3, -1.85, 3.3, 1.9, glow(0xff3030));
  box(mechaModel, 0.7, 2.2, 0.7, 1.85, 2.6, 0, dark); box(mechaModel, 0.9, 0.6, 0.9, 1.85, 1.3, 0.1, 0xc9a53a);
  mechaModel.position.set(MECHA_PARK.x, 0, MECHA_PARK.z);
  mechaModel.rotation.y = Math.PI;
  world.add(mechaModel);
}

// 좀비 모델 (공용): +z 방향을 본다
function makeZombie(skin, cloth, eye) {
  const g = new THREE.Group();
  const u = g.userData;
  u.legL = box(g, 0.26, 0.8, 0.28, -0.17, 0.4, 0, cloth);
  u.legR = box(g, 0.26, 0.8, 0.28, 0.17, 0.4, 0, cloth);
  box(g, 0.7, 0.75, 0.4, 0, 1.15, 0, cloth);
  u.armL = box(g, 0.2, 0.2, 0.75, -0.46, 1.35, 0.35, skin);
  u.armR = box(g, 0.2, 0.2, 0.75, 0.46, 1.35, 0.35, skin);
  box(g, 0.5, 0.5, 0.5, 0, 1.8, 0, skin);
  box(g, 0.1, 0.1, 0.05, -0.12, 1.86, 0.26, glow(eye)); box(g, 0.1, 0.1, 0.05, 0.12, 1.86, 0.26, glow(eye));
  box(g, 0.26, 0.06, 0.05, 0, 1.68, 0.26, 0x301010);
  return g;
}
function walkAnim(g, t, amp = 0.5) {
  const u = g.userData, s = Math.sin(t) * amp;
  u.legL.position.z = s * 0.3; u.legR.position.z = -s * 0.3;
  u.armL.position.y = 1.35 + s * 0.06; u.armR.position.y = 1.35 - s * 0.06;
}

// 손에 든 무기 / 메카 팔 (카메라에 부착)
const gun = new THREE.Group();
box(gun, 0.07, 0.1, 0.34, 0, 0, -0.1, 0x30333c); box(gun, 0.07, 0.16, 0.08, 0, -0.1, 0.03, 0x5a3a1c);
const muzzle = box(gun, 0.14, 0.14, 0.06, 0, 0.01, -0.32, glow(0xfff0a0));
muzzle.visible = false;
gun.position.set(0.2, -0.2, -0.45);
camera.add(gun);

const mechArms = new THREE.Group();
const cannon = new THREE.Group();
box(cannon, 0.45, 0.45, 1.7, 0, 0, 0, 0x2a3350); box(cannon, 0.22, 0.22, 0.2, 0, 0, -0.95, glow(0xff3030));
cannon.position.set(-1.0, -0.75, -1.3);
const hand = new THREE.Group();
box(hand, 0.4, 0.4, 1.5, 0, 0, 0, 0x2a3350);
box(hand, 0.14, 0.5, 0.4, -0.2, 0, -0.9, 0xc9a53a); box(hand, 0.14, 0.5, 0.4, 0.2, 0, -0.9, 0xc9a53a);
hand.position.set(1.0, -0.75, -1.3);
mechArms.add(cannon, hand);
mechArms.visible = false;
camera.add(mechArms);

const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6).rotateX(Math.PI / 2), glow(0xff3838));
laser.visible = false; laser.frustumCulled = false;
scene.add(laser);
const laserHit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), glow(0xffd0a0));
laserHit.visible = false;
scene.add(laserHit);

// 파티클
const parts = [];
for (let i = 0; i < 48; i++) {
  const m = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.visible = false; scene.add(m);
  parts.push({ m, life: 0, vx: 0, vy: 0, vz: 0 });
}
let partI = 0;
function burst(x, y, z, color, n = 8, speed = 4, size = 0.14) {
  for (let i = 0; i < n; i++) {
    const p = parts[partI++ % parts.length];
    p.m.material.color.setHex(color); p.m.visible = true;
    p.m.position.set(x, y, z); p.m.scale.setScalar(size * (0.6 + Math.random()));
    p.vx = (Math.random() - 0.5) * speed; p.vy = Math.random() * speed; p.vz = (Math.random() - 0.5) * speed;
    p.life = 0.5 + Math.random() * 0.4;
  }
}

// ───────────────────────── 소리 ─────────────────────────
let ac = null;
function tone(freq, dur, type = 'square', vol = 0.12, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
const sfx = {
  shot: () => { tone(520, 0.09, 'square', 0.12, -400); tone(140, 0.12, 'sawtooth', 0.1, -90); },
  die: () => tone(180, 0.3, 'sawtooth', 0.12, -140),
  groan: () => tone(90, 0.5, 'sawtooth', 0.07, -30),
  key: () => { tone(880, 0.1, 'square', 0.1); setTimeout(() => tone(1320, 0.18, 'square', 0.1), 90); },
  hurt: () => tone(160, 0.25, 'square', 0.16, -100),
  door: () => tone(70, 0.8, 'sawtooth', 0.14, 40),
  no: () => tone(140, 0.15, 'square', 0.1),
  laser: () => tone(900 + Math.random() * 80, 0.09, 'sawtooth', 0.045),
  roar: () => { tone(70, 1.2, 'sawtooth', 0.2, -30); tone(55, 1.2, 'square', 0.12, -20); },
  board: () => { tone(220, 0.15, 'square', 0.1); setTimeout(() => tone(330, 0.15, 'square', 0.1), 120); setTimeout(() => tone(440, 0.25, 'square', 0.1), 240); },
  throwS: () => tone(300, 0.7, 'sawtooth', 0.14, 900),
  boom: () => tone(90, 0.7, 'sawtooth', 0.2, -60),
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'square', 0.12), i * 160)),
};

// ───────────────────────── 게임 상태 ─────────────────────────
const P = { x: 0, z: 0, yaw: Math.PI, pitch: 0, eye: 1.6, hp: 100, keys: 0, hidden: null, inMecha: false, hurtCd: 0, bob: 0 };
const S = { stage: 'title', running: false, time: 0, fireCd: 0, cine: null, msgT: 0, flags: {}, shake: 0 };
let zombies = [], boss = null, ballZ = null, balls = [];
const distMap = new Int16Array(GW * GH);
let distT = 0;

const OBJ = {
  maze: () => P.keys < 4 ? `열쇠를 찾아라 (${P.keys}/4)` : '출구의 빨간 문으로 가서 탈출하라!',
  boss: () => P.inMecha ? '레이저로 가장 센 좀비를 쓰러뜨려라!' : '메카 로봇에 타라!',
  gate: () => '큰 문을 열어라',
  ball: () => '공 던지는 좀비에게 다가가 잡아 던져라!',
  final: () => '새로 생긴 문으로 들어가라',
  win: () => '',
};

function say(text, sec = 2.6) {
  const m = $('msg'); m.textContent = text; m.classList.add('show'); S.msgT = sec;
}
function once(flag, text, sec) { if (!S.flags[flag]) { S.flags[flag] = 1; say(text, sec); } }

function hurt(n) {
  if (S.stage === 'win' || S.cine || P.hp <= 0) return;
  P.hp = Math.max(0, P.hp - n);
  $('hurt').style.opacity = 0.9; S.shake = 0.25;
  sfx.hurt();
  if (navigator.vibrate) navigator.vibrate(60);
  if (P.hp <= 0) {
    S.running = false; fireHeld = false; stick.id = null; stick.x = stick.y = 0;
    $('stickbase').classList.add('hidden');
    $('dead').classList.remove('hidden');
  }
}

function spawnZombie(far = 8) {
  let c, r, tries = 0;
  const pc = Math.floor(P.x / T), pr = Math.floor(P.z / T);
  do {
    c = 2 * Math.floor(rnd() * MAZE_N) + 1; r = 2 * Math.floor(rnd() * MAZE_N) + 1;
  } while (Math.abs(c - pc) + Math.abs(r - pr) < far && ++tries < 60);
  const g = makeZombie(0x7fbf5a, pick([0x3d5a8a, 0x7a4a3a, 0x555566, 0x8a7a3a]), 0xff3020);
  g.position.set(tc(c), 0, tc(r));
  world.add(g);
  return { g, x: tc(c), z: tc(r), tx: tc(c), tz: tc(r), pc: c, pr: r, aware: 0, think: rnd(), atk: 0, dead: 0, ph: rnd() * 6, respawn: 0 };
}
function resetZombies() {
  zombies.forEach((z) => world.remove(z.g));
  zombies = [];
  for (let i = 0; i < 7; i++) zombies.push(spawnZombie(7));
}
function clearBalls() { balls.forEach((b) => scene.remove(b.m)); balls = []; }

function setMecha(on) {
  P.inMecha = on;
  mechaModel.visible = !on;
  mechArms.visible = on; gun.visible = !on;
  $('cockpit').classList.toggle('hidden', !on);
  $('fire').textContent = on ? '레이저' : '발사';
}

function spawnBoss() {
  if (boss) world.remove(boss.g);
  const g = makeZombie(0x6a3a8a, 0x3a1030, 0xffe000);
  box(g, 0.12, 0.3, 0.12, -0.2, 2.2, 0, 0xe8e0c0); box(g, 0.12, 0.3, 0.12, 0.2, 2.2, 0, 0xe8e0c0);
  g.scale.setScalar(3.2);
  g.position.set(tc(7), 0, tc(24));
  world.add(g);
  boss = { g, x: tc(7), z: tc(24), hp: 100, atk: 1.5, wind: 0, dead: 0, ph: 0 };
  $('bosswrap').classList.remove('hidden');
}
function spawnBallZ() {
  if (ballZ) world.remove(ballZ.g);
  const g = makeZombie(0xe0a030, 0x9a3a10, 0x40ffff);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0xff4040));
  ball.position.set(0.46, 1.45, 0.8); g.add(ball);
  g.scale.setScalar(1.7);
  g.position.set(tc(7), 0, tc(35));
  world.add(g);
  ballZ = { g, x: tc(7), z: tc(35), cd: 1.2, ph: 0, state: 'alive', vx: 0, vy: 0, vz: 0 };
}

function setDoor(door, tiles, open) {
  door.userData.open = open;
  for (const [c, r] of tiles) grid[gi(c, r)] = open ? 0 : 2;
}
const EXIT_TILES = [[7, 14]], GATE_TILES = [[6, 27], [7, 27], [8, 27]];

function setStage(st) {
  S.stage = st;
  scene.fog.far = st === 'maze' ? 30 : 70;
  scene.fog.near = st === 'maze' ? 3 : 8;
  $('minimap').classList.toggle('hidden', st !== 'maze');
  $('bosswrap').classList.toggle('hidden', st !== 'boss');
}

// 구간 처음 상태로 되돌린다 (체력 0이 됐을 때 / 구간 시작)
function startStage(st) {
  setStage(st);
  P.hp = 100; P.hidden = null; P.hurtCd = 1; P.pitch = 0;
  S.cine = null; S.fireCd = 0;
  clearBalls();
  $('closet').classList.add('hidden');
  laser.visible = laserHit.visible = false;
  if (st === 'maze') {
    P.x = tc(7); P.z = tc(1);
    // 시작할 때 뚫린 길 쪽을 바라본다
    P.yaw = !solid(7, 2) ? Math.PI : !solid(8, 1) ? -Math.PI / 2 : Math.PI / 2;
    setMecha(false);
    resetZombies();
  } else if (st === 'boss') {
    P.x = tc(7); P.z = tc(15) + 1; P.yaw = Math.PI;
    setMecha(false);
    mechaModel.position.set(MECHA_PARK.x, 0, MECHA_PARK.z);
    setDoor(exitDoor, EXIT_TILES, false);
    spawnBoss();
  } else if (st === 'ball' || st === 'gate') {
    P.x = tc(7); P.z = tc(25); P.yaw = Math.PI;
    setMecha(true);
    if (st === 'ball') spawnBallZ();
  }
}

function newGame() {
  buildWorld();
  zombies = []; boss = null; ballZ = null;
  P.keys = 0; S.time = 0; S.flags = {};
  explored.fill(0);
  $('fade').style.opacity = 0;
  startStage('maze');
  S.running = true;
  say('열쇠 4개를 찾아 탈출하라!', 3);
}

// ───────────────────────── 입력 ─────────────────────────
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const looks = new Map();
let fireHeld = false, actionFn = null;
const keysDown = {};

function lookBy(dx, dy, k = 0.0052) {
  P.yaw -= dx * k;
  P.pitch = Math.max(-1.2, Math.min(1.2, P.pitch - dy * k));
}
const hud = $('hud');
hud.addEventListener('pointerdown', (e) => {
  if (!S.running) return;
  e.preventDefault();
  if (e.pointerType === 'mouse') {
    if (e.target.id === 'act') return;
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    fireHeld = true;
    return;
  }
  if (e.target.id === 'act') return;
  if (e.target.id === 'fire') {
    fireHeld = true; $('fire').classList.add('down');
    looks.set(e.pointerId, { x: e.clientX, y: e.clientY, fire: true });   // 발사 버튼을 누른 채로도 조준 가능
    return;
  }
  if (stick.id === null && e.clientX < innerWidth * 0.45) {
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0;
    const b = $('stickbase'); b.classList.remove('hidden'); b.style.left = e.clientX + 'px'; b.style.top = e.clientY + 'px';
    $('stickknob').style.transform = '';
    $('stickhint').classList.add('hidden');
  } else {
    looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
});
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    if (document.pointerLockElement === canvas) lookBy(e.movementX, e.movementY, 0.0026);
    return;
  }
  if (e.pointerId === stick.id) {
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const d = Math.hypot(dx, dy), R = 50;
    if (d > R) { dx *= R / d; dy *= R / d; }
    stick.x = dx / R; stick.y = dy / R;
    $('stickknob').style.transform = `translate(${dx}px,${dy}px)`;
  } else if (looks.has(e.pointerId)) {
    const l = looks.get(e.pointerId);
    if (S.running) lookBy(e.clientX - l.x, e.clientY - l.y);
    l.x = e.clientX; l.y = e.clientY;
  }
});
function pointerEnd(e) {
  if (e.pointerType === 'mouse') { fireHeld = false; return; }
  if (e.pointerId === stick.id) {
    stick.id = null; stick.x = stick.y = 0; $('stickbase').classList.add('hidden');
  }
  const l = looks.get(e.pointerId);
  if (l) {
    if (l.fire) { fireHeld = false; $('fire').classList.remove('down'); }
    looks.delete(e.pointerId);
  }
}
addEventListener('pointerup', pointerEnd);
addEventListener('pointercancel', pointerEnd);
$('act').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (S.running && actionFn) actionFn(); });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => {
  keysDown[e.code] = true;
  if ((e.code === 'KeyE' || e.code === 'Space') && S.running && actionFn && !e.repeat) actionFn();
});
addEventListener('keyup', (e) => { keysDown[e.code] = false; });
document.addEventListener('visibilitychange', () => { last = performance.now(); });

function begin() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { /* 소리 없이 진행 */ } }
  ac?.resume?.();
  const el = document.documentElement;
  try { el.requestFullscreen?.({ navigationUI: 'hide' })?.then(() => screen.orientation?.lock?.('landscape')?.catch(() => {}))?.catch(() => {}); } catch (_) { /* 전체화면 미지원 */ }
  for (const id of ['title', 'dead', 'win']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
}
$('start').addEventListener('click', () => { begin(); newGame(); });
$('again').addEventListener('click', () => { begin(); newGame(); });
$('retry').addEventListener('click', () => {
  begin();
  startStage(S.stage === 'gate' || S.stage === 'final' ? 'ball' : S.stage);
  S.running = true;
});

// ───────────────────────── 행동(파란 버튼) ─────────────────────────
function findAction() {
  if (S.cine) return null;
  if (P.hidden) return ['나가기', () => {
    P.x = P.hidden.userData.out.x; P.z = P.hidden.userData.out.z; P.hidden = null;
    $('closet').classList.add('hidden');
  }];
  const near = (x, z, d) => Math.hypot(P.x - x, P.z - z) < d;
  if (S.stage === 'maze') {
    for (const w of closets) if (near(w.position.x, w.position.z, 1.9)) return ['옷장에\n숨기', () => {
      P.hidden = w; P.yaw = w.userData.yaw; P.pitch = 0;
      $('closet').classList.remove('hidden');
      zombies.forEach((z) => { z.aware = 0; });
      once('hide', '숨었다! 좀비가 찾지 못한다', 2.2);
    }];
    if (!exitDoor.userData.open && near(tc(7), tc(14), 3.2)) return ['문 열기', () => {
      if (P.keys < 4) { sfx.no(); say(`열쇠가 부족해! (${P.keys}/4)`); return; }
      setDoor(exitDoor, EXIT_TILES, true); sfx.door(); say('문이 열렸다!');
    }];
  }
  if (S.stage === 'boss' && !P.inMecha && near(mechaModel.position.x, mechaModel.position.z, 4.2)) return ['메카\n탑승', () => {
    P.x = mechaModel.position.x; P.z = mechaModel.position.z;
    setMecha(true); sfx.board();
    say('메카 탑승! 레이저 버튼으로 공격!', 2.6);
  }];
  if (S.stage === 'gate' && near(tc(7), tc(27), 6.5)) return ['문 열기', () => {
    setDoor(gate, GATE_TILES, true); sfx.door();
    P.hp = 100;
    setStage('ball'); spawnBallZ();
    say('공 던지는 좀비가 나타났다! 공에 맞으면 체력이 1/10씩 줄어든다', 3.6);
  }];
  if (S.stage === 'ball' && ballZ?.state === 'alive' && near(ballZ.x, ballZ.z, 6.5)) return ['잡아\n던지기', () => {
    S.cine = { type: 'throw', t: 0 }; ballZ.state = 'grabbed';
    clearBalls(); laser.visible = laserHit.visible = false;
  }];
  if (S.stage === 'final' && near(finalDoor.position.x, finalDoor.position.z, 6)) return ['문으로\n들어가기', () => {
    S.cine = { type: 'end', t: 0 };
    setStage('win');
    $('fade').style.opacity = 1; sfx.win();
  }];
  return null;
}

// ───────────────────────── 전투 ─────────────────────────
const vDir = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
function aimRay() {
  camera.getWorldDirection(vDir);
  vA.copy(camera.position);
  let t = rayWall(vA.x, vA.z, vDir.x, vDir.z, 90);
  if (vDir.y < -0.001) t = Math.min(t, -vA.y / vDir.y);
  return t;
}

function shootPistol() {
  S.fireCd = 0.3;
  sfx.shot();
  muzzle.visible = true; gun.position.z = -0.38; gun.rotation.x = 0.18;
  setTimeout(() => { muzzle.visible = false; }, 60);
  const wallT = aimRay();
  let best = null, bestT = wallT;
  for (const z of zombies) {
    if (z.dead) continue;
    const t = Math.min(raySphere(vA, vDir, z.x, 1.0, z.z, 0.72) ?? 1e9, raySphere(vA, vDir, z.x, 1.75, z.z, 0.48) ?? 1e9);
    if (t < bestT) { bestT = t; best = z; }
  }
  // 총소리를 들은 가까운 좀비들이 몰려온다
  for (const z of zombies) if (!z.dead && !P.hidden && Math.hypot(z.x - P.x, z.z - P.z) < 13) z.aware = Math.max(z.aware, 3);
  if (best) {
    best.dead = 0.001; best.respawn = 22 + rnd() * 10;
    sfx.die(); burst(best.x, 1.3, best.z, 0x6fd04a, 10);
    return;
  }
  if (boss && !boss.dead && raySphere(vA, vDir, boss.x, 3, boss.z, 2.2) !== null) {
    burst(vA.x + vDir.x * 3, vA.y + vDir.y * 3, vA.z + vDir.z * 3, 0xaaaaaa, 3, 2);
    say('권총이 통하지 않는다! 메카 로봇에 타라!', 2.4);
    return;
  }
  vB.copy(vA).addScaledVector(vDir, bestT - 0.05);
  burst(vB.x, vB.y, vB.z, 0xcccccc, 3, 2, 0.08);
}

function fireLaser(dt) {
  let t = aimRay();
  let target = null;
  if (boss && !boss.dead) {
    const tb = Math.min(raySphere(vA, vDir, boss.x, 2.6, boss.z, 2.1) ?? 1e9, raySphere(vA, vDir, boss.x, 5.2, boss.z, 1.5) ?? 1e9);
    if (tb < t) { t = tb; target = 'boss'; }
  }
  if (ballZ?.state === 'alive') {
    const tb = raySphere(vA, vDir, ballZ.x, 1.7, ballZ.z, 1.6);
    if (tb !== null && tb < t) { t = tb; target = 'ball'; }
  }
  vB.copy(vA).addScaledVector(vDir, t);
  cannon.getWorldPosition(vA);
  laser.position.copy(vA).lerp(vB, 0.5);
  laser.lookAt(vB);
  laser.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, vA.distanceTo(vB));
  laser.visible = true;
  laserHit.position.copy(vB); laserHit.scale.setScalar(0.7 + Math.random() * 0.6); laserHit.visible = true;
  if (Math.random() < 0.5) sfx.laser();
  if (target === 'boss') {
    boss.hp -= 15 * dt;
    if (Math.random() < 0.4) burst(vB.x, vB.y, vB.z, 0xc040ff, 2, 5);
    if (boss.hp <= 0) killBoss();
  } else if (target === 'ball') {
    if (Math.random() < 0.4) burst(vB.x, vB.y, vB.z, 0x40ffff, 2, 5);
    once('shield', '레이저가 튕겨 나간다! 가까이 가서 손으로 잡아 던져라!', 3.2);
  }
}

function killBoss() {
  boss.hp = 0; boss.dead = 0.001;
  sfx.boom(); S.shake = 0.6;
  burst(boss.x, 3, boss.z, 0xc040ff, 30, 9, 0.3);
  P.hp = 100;
  setStage('gate');
  say('가장 센 좀비를 쓰러뜨렸다! 큰 문을 열자', 3.5);
}

// ───────────────────────── 갱신 ─────────────────────────
function updateDistMap() {
  distMap.fill(-1);
  const pc = Math.floor(P.x / T), pr = Math.min(15, Math.floor(P.z / T));
  if (solid(pc, pr)) return;
  const q = [gi(pc, pr)];
  distMap[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], c = i % GW, r = (i / GW) | 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nr > 15 || solid(nc, nr)) continue;
      const j = gi(nc, nr);
      if (distMap[j] < 0) { distMap[j] = distMap[i] + 1; q.push(j); }
    }
  }
}

function updateZombies(dt) {
  distT -= dt;
  if (distT <= 0) { distT = 0.3; updateDistMap(); }
  for (const z of zombies) {
    if (z.dead) {
      z.dead += dt;
      z.g.rotation.x = -Math.min(1, z.dead / 0.35) * Math.PI / 2;
      z.g.position.y = Math.min(1, z.dead / 0.35) * 0.25;
      if (z.dead > 1.2) z.g.visible = false;
      if (z.dead > z.respawn) {         // 시간이 지나면 멀리서 새 좀비가 나타난다
        world.remove(z.g);
        Object.assign(z, spawnZombie(9));
      }
      continue;
    }
    const dx = P.x - z.x, dz = P.z - z.z, d = Math.hypot(dx, dz);
    const sees = !P.hidden && d < 16 && los(z.x, z.z, P.x, P.z);
    if (sees) { if (z.aware <= 0) sfx.groan(); z.aware = 5; }
    else z.aware = Math.max(0, z.aware - dt);
    if (P.hidden) z.aware = 0;

    const c = Math.floor(z.x / T), r = Math.floor(z.z / T);
    z.think -= dt;
    const arrived = Math.hypot(z.tx - z.x, z.tz - z.z) < 0.12;
    if (z.aware > 0 && sees && d < 4.5) { z.tx = P.x; z.tz = P.z; }
    else if (arrived || (z.aware > 0 && z.think <= 0)) {
      z.think = 0.45;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => [c + dc, r + dr]).filter(([nc, nr]) => nr <= 15 && !solid(nc, nr));
      let next = null;
      if (z.aware > 0 && distMap[gi(c, r)] > 0) {
        next = nb.reduce((b, n) => (distMap[gi(n[0], n[1])] >= 0 && (!b || distMap[gi(n[0], n[1])] < distMap[gi(b[0], b[1])]) ? n : b), null);
      } else if (arrived) {
        const fwd = nb.filter(([nc, nr]) => nc !== z.pc || nr !== z.pr);
        next = fwd.length ? pick(fwd) : nb[0];
      }
      if (next) { z.pc = c; z.pr = r; z.tx = tc(next[0]); z.tz = tc(next[1]); }
    }
    const mx = z.tx - z.x, mz = z.tz - z.z, md = Math.hypot(mx, mz);
    if (md > 0.05) {
      const sp = (z.aware > 0 ? 3.1 : 1.5) * dt, k = Math.min(1, sp / md);
      moveCircle(z, mx * k, mz * k, 0.35);
      z.g.rotation.y = Math.atan2(mx, mz);
      z.ph += dt * (z.aware > 0 ? 11 : 6);
      walkAnim(z.g, z.ph);
    }
    z.g.position.set(z.x, 0, z.z);
    z.atk -= dt;
    if (!P.hidden && d < 1.15 && z.atk <= 0) { z.atk = 1.1; hurt(20); }
  }
}

function updateBoss(dt) {
  if (!boss) return;
  if (boss.dead) {
    boss.dead += dt;
    const k = Math.min(1, boss.dead / 0.9);
    boss.g.rotation.x = -k * Math.PI / 2; boss.g.position.y = k * 0.8;
    return;
  }
  $('bossbar').style.width = boss.hp + '%';
  const dx = P.x - boss.x, dz = P.z - boss.z, d = Math.hypot(dx, dz);
  const reach = P.inMecha ? 4.6 : 3.4;
  boss.atk -= dt;
  if (boss.wind > 0) {
    boss.wind -= dt;
    boss.g.userData.armL.position.y = boss.g.userData.armR.position.y = 1.35 + Math.sin((0.5 - boss.wind) * Math.PI * 2) * 0.5;
    if (boss.wind <= 0) {
      S.shake = 0.3; sfx.boom();
      if (d < reach + 0.8) hurt(P.inMecha ? 10 : 25);
    }
  } else if (d < reach && boss.atk <= 0) { boss.wind = 0.5; boss.atk = 1.7; }
  else if (d > reach * 0.7) {
    const sp = (boss.hp < 50 ? 3.7 : 3.0) * dt;
    moveCircle(boss, dx / d * sp, dz / d * sp, 1.3);
    boss.ph += dt * 6; walkAnim(boss.g, boss.ph);
  }
  boss.g.rotation.y = Math.atan2(dx, dz);
  boss.g.position.set(boss.x, 0, boss.z);
}

const ballGeo = new THREE.SphereGeometry(0.42, 8, 6);
function updateBallZ(dt) {
  if (!ballZ) return;
  if (ballZ.state === 'alive') {
    ballZ.ph += dt;
    ballZ.x = tc(7) + Math.sin(ballZ.ph * 0.7) * 9;
    const dx = P.x - ballZ.x, dz = P.z - ballZ.z;
    ballZ.g.rotation.y = Math.atan2(dx, dz);
    ballZ.g.position.set(ballZ.x, 0, ballZ.z);
    walkAnim(ballZ.g, ballZ.ph * 6);
    ballZ.cd -= dt;
    ballZ.g.userData.armR.position.y = 1.35 + (ballZ.cd < 0.3 ? 0.4 : 0);
    if (ballZ.cd <= 0) {
      ballZ.cd = 1.5;
      const m = new THREE.Mesh(ballGeo, mat(0xff4040));
      const ox = ballZ.x, oy = 2.6, oz = ballZ.z;
      const ty = P.eye - 0.5, ddx = P.x - ox, ddy = ty - oy, ddz = P.z - oz, dd = Math.hypot(ddx, ddy, ddz) || 1, sp = 15;
      m.position.set(ox, oy, oz); scene.add(m);
      balls.push({ m, vx: ddx / dd * sp, vy: ddy / dd * sp, vz: ddz / dd * sp, life: 5 });
      tone(400, 0.12, 'square', 0.06, 200);
    }
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i], p = b.m.position;
    p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt; b.life -= dt;
    b.m.rotation.x += dt * 9;
    const hitR = P.inMecha ? 1.7 : 0.7, cy = P.inMecha ? P.eye - 1.2 : P.eye - 0.6;
    const hit = Math.hypot(p.x - P.x, p.z - P.z) < hitR && Math.abs(p.y - cy) < (P.inMecha ? 2.6 : 1.1);
    if (hit) { hurt(10); burst(p.x, p.y, p.z, 0xff4040, 8); }      // 공에 맞으면 체력의 1/10 감소
    if (hit || b.life <= 0 || p.y < 0.3 || solidAt(p.x, p.z)) { scene.remove(b.m); balls.splice(i, 1); }
  }
}

function updateCine(dt) {
  const c = S.cine;
  c.t += dt;
  if (c.type === 'throw') {
    const z = ballZ;
    if (c.t < 0.6) {            // 손을 뻗어 붙잡는다
      const k = c.t / 0.6;
      hand.position.z = -1.3 - k * 0.9;
      hand.getWorldPosition(vA);
      camera.getWorldDirection(vDir);
      z.g.position.lerp(vB.set(vA.x + vDir.x * 1.6, vA.y - 1.4, vA.z + vDir.z * 1.6), Math.min(1, k * 1.3));
    } else if (c.t < 1.0) {     // 뒤로 당겼다가
      const k = (c.t - 0.6) / 0.4;
      hand.position.z = -2.2 + k * 1.3; hand.position.y = -0.75 + k * 0.5;
      hand.getWorldPosition(vA);
      camera.getWorldDirection(vDir);
      z.g.position.set(vA.x + vDir.x * 1.6, vA.y - 1.4, vA.z + vDir.z * 1.6);
      z.g.rotation.z = k * 1.2;
    } else {                    // 멀리 던진다
      if (z.state !== 'thrown') {
        z.state = 'thrown'; sfx.throwS(); S.shake = 0.4;
        camera.getWorldDirection(vDir);
        z.vx = vDir.x * 30; z.vz = vDir.z * 30; z.vy = 19;
      }
      const k = Math.min(1, (c.t - 1.0) / 0.2);
      hand.position.z = -0.9 - k * 1.6; hand.position.y = -0.25 - k * 0.5;
      z.vy -= 9 * dt;
      z.g.position.x += z.vx * dt; z.g.position.y += z.vy * dt; z.g.position.z += z.vz * dt;
      z.g.rotation.x += dt * 14; z.g.rotation.z += dt * 9;
      if (c.t > 2.6) {
        world.remove(z.g); ballZ = null;
        hand.position.set(1.0, -0.75, -1.3);
        S.cine = null;
        setStage('final');
        finalDoor.visible = true; finalDoor.userData.s = 0;
        sfx.key();
        say('공 던지는 좀비가 사라졌다! 문이 생겼다!', 3.5);
      }
    }
  } else if (c.type === 'end' && c.t > 1.5) {
    S.cine = null; S.running = false;
    const sec = Math.floor(S.time);
    $('wintime').textContent = `탈출 시간 ${Math.floor(sec / 60)}분 ${sec % 60}초`;
    $('hud').classList.add('hidden');
    $('win').classList.remove('hidden');
  }
}

// 미니맵 (지나간 곳만 보인다)
const explored = new Uint8Array(GW * 15);
const mm = $('minimap').getContext('2d');
function drawMinimap() {
  const pc = Math.floor(P.x / T), pr = Math.floor(P.z / T);
  for (let r = pr - 1; r <= pr + 1; r++) for (let c = pc - 1; c <= pc + 1; c++) if (c >= 0 && r >= 0 && c < GW && r < 15) explored[r * GW + c] = 1;
  mm.clearRect(0, 0, 60, 60);
  for (let r = 0; r < 15; r++) for (let c = 0; c < GW; c++) {
    if (!explored[r * GW + c]) continue;
    const v = grid[gi(c, r)];
    mm.fillStyle = v === 1 ? '#8a9a92' : v === 2 ? '#e33' : '#23262e';
    mm.fillRect(c * 4, r * 4, 4, 4);
  }
  mm.fillStyle = '#b87a3a';
  for (const w of closets) if (explored[w.userData.r * GW + w.userData.c]) mm.fillRect(w.userData.c * 4 + 1, w.userData.r * 4 + 1, 2, 2);
  mm.fillStyle = '#ffd23c';
  for (const k of keys) if (!k.userData.taken && explored[k.userData.r * GW + k.userData.c]) mm.fillRect(k.userData.c * 4 + 1, k.userData.r * 4 + 1, 2, 2);
  const px = P.x / T * 4, pz = P.z / T * 4;
  mm.fillStyle = '#fff'; mm.fillRect(px - 1.5, pz - 1.5, 3, 3);
  mm.fillStyle = '#6cf'; mm.fillRect(px - Math.sin(P.yaw) * 3 - 1, pz - Math.cos(P.yaw) * 3 - 1, 2, 2);
}

let hudT = 0, lastAct = null;
function update(dt) {
  S.time += dt;
  if (S.msgT > 0 && (S.msgT -= dt) <= 0) $('msg').classList.remove('show');
  const hurtEl = $('hurt');
  if (hurtEl.style.opacity > 0) hurtEl.style.opacity = Math.max(0, hurtEl.style.opacity - dt * 1.6);

  // 이동
  let f = -stick.y, s = stick.x;
  if (keysDown.KeyW || keysDown.ArrowUp) f += 1;
  if (keysDown.KeyS || keysDown.ArrowDown) f -= 1;
  if (keysDown.KeyD) s += 1;
  if (keysDown.KeyA) s -= 1;
  if (keysDown.ArrowLeft) P.yaw += dt * 2.2;
  if (keysDown.ArrowRight) P.yaw -= dt * 2.2;
  const mag = Math.hypot(f, s);
  if (mag > 1) { f /= mag; s /= mag; }
  if (!P.hidden && !S.cine && mag > 0.05) {
    const sp = (P.inMecha ? 6 : 5) * dt, sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
    moveCircle(P, (-sn * f + cs * s) * sp, (-cs * f - sn * s) * sp, P.inMecha ? 1.25 : 0.4);
    const before = Math.sin(P.bob);
    P.bob += dt * (P.inMecha ? 6 : 10) * Math.min(1, mag);
    if (P.inMecha && before > 0 && Math.sin(P.bob) <= 0) { tone(60, 0.12, 'square', 0.08); S.shake = Math.max(S.shake, 0.08); }
  }

  // 열쇠 줍기
  for (const k of keys) {
    if (k.userData.taken) continue;
    k.rotation.y += dt * 2.5;
    k.position.y = 1.1 + Math.sin(S.time * 3 + k.position.x) * 0.12;
    if (!P.hidden && Math.hypot(P.x - k.position.x, P.z - k.position.z) < 1.1) {
      k.userData.taken = true; k.visible = false; P.keys++;
      sfx.key();
      say(P.keys < 4 ? `열쇠 획득! (${P.keys}/4)` : '열쇠 4개를 모두 모았다! 출구로 도망쳐라!', 2.8);
    }
  }

  // 문 애니메이션
  for (const [d, h] of [[exitDoor, BIG_H], [gate, BIG_H]]) {
    const target = d.userData.open ? -h - 0.2 : 0;
    d.userData.y += Math.sign(target - d.userData.y) * Math.min(Math.abs(target - d.userData.y), dt * 6);
    d.position.y = d.userData.y;
  }
  if (finalDoor.visible) {
    finalDoor.userData.s = Math.min(1, finalDoor.userData.s + dt * 1.2);
    finalDoor.scale.set(1, finalDoor.userData.s, 1);
  }

  // 구간 전환: 미로를 빠져나오면 가장 센 좀비 등장
  if (S.stage === 'maze' && P.z > tc(15) + 0.4) {
    zombies.forEach((z) => world.remove(z.g)); zombies = [];
    setDoor(exitDoor, EXIT_TILES, false);
    P.hp = 100;
    setStage('boss'); spawnBoss();
    sfx.roar(); S.shake = 0.6;
    say('가장 센 좀비가 나타났다! 옆의 메카 로봇에 타라!', 3.6);
  }

  // 공격
  S.fireCd -= dt;
  laser.visible = laserHit.visible = false;
  if (fireHeld && !P.hidden && !S.cine) {
    if (P.inMecha) fireLaser(dt);
    else if (S.fireCd <= 0) shootPistol();
  }
  gun.position.z += (-0.45 - gun.position.z) * Math.min(1, dt * 14);
  gun.rotation.x += (0 - gun.rotation.x) * Math.min(1, dt * 14);

  if (S.stage === 'maze') updateZombies(dt);
  if (S.stage === 'boss' || S.stage === 'gate') updateBoss(dt);
  updateBallZ(dt);
  if (S.cine) updateCine(dt);

  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt; p.vy -= 12 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    if (p.life <= 0) p.m.visible = false;
  }

  // 카메라
  const eyeT = P.hidden ? 1.5 : P.inMecha ? 4.3 : 1.6;
  P.eye += (eyeT - P.eye) * Math.min(1, dt * 5);
  S.shake = Math.max(0, S.shake - dt);
  const sh = S.shake * 0.25;
  if (P.hidden) camera.position.set(P.hidden.position.x, P.eye, P.hidden.position.z);
  else camera.position.set(P.x + (Math.random() - 0.5) * sh, P.eye + Math.sin(P.bob) * (P.inMecha ? 0.12 : 0.045) + (Math.random() - 0.5) * sh, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);

  // HUD (가끔만 갱신)
  hudT -= dt;
  if (hudT <= 0) {
    hudT = 0.1;
    $('hpbar').style.width = P.hp + '%';
    $('hptext').textContent = '체력 ' + Math.ceil(P.hp);
    document.querySelectorAll('#keys span').forEach((e, i) => e.classList.toggle('on', i < P.keys));
    $('objective').textContent = OBJ[S.stage]?.() ?? '';
    if (S.stage === 'maze') drawMinimap();
    const a = findAction();
    actionFn = a ? a[1] : null;
    const label = a ? a[0] : null;
    if (label !== lastAct) {
      lastAct = label;
      $('act').classList.toggle('hidden', !a);
      if (a) $('act').innerText = label;
    }
    $('fire').classList.toggle('hidden', !!P.hidden);
    $('cross').classList.toggle('hidden', !!P.hidden);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S.running) update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// 타이틀 화면 배경용으로 월드를 미리 만들어 둔다
buildWorld();
P.x = tc(7); P.z = tc(1);
camera.position.set(P.x, 1.6, P.z);
camera.rotation.set(0, Math.PI, 0);
requestAnimationFrame(frame);

// 테스트/디버그용
window.__zg = { P, S, grid, keys, closets, get zombies() { return zombies; }, get boss() { return boss; }, get ballZ() { return ballZ; }, startStage, update, T, GW };
