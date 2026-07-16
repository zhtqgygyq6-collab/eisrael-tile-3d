import * as THREE from "./three.module.js";

/* ── Setup ─────────────────────────────────────────────────────────────── */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b09);
scene.fog = new THREE.FogExp2(0x0d0b09, 0.05);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

/* ── Procedural environment (warm atelier light) ───────────────────────── */
function makeEnvMap() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, "#070503");
  grad.addColorStop(0.40, "#1a130b");
  grad.addColorStop(0.52, "#7a6244");
  grad.addColorStop(0.60, "#d8b98a");
  grad.addColorStop(0.68, "#3c2d1a");
  grad.addColorStop(1.0, "#040302");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 6; i++) {
    const x = 120 + i * 160, y = 250 + Math.sin(i * 1.9) * 46;
    const r = 40 + (i % 3) * 38;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, "rgba(255,238,205,0.85)");
    rg.addColorStop(1, "rgba(255,238,205,0)");
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
scene.environment = makeEnvMap();

/* ── Procedural stone textures ─────────────────────────────────────────── */
function veinWalk(g, s, tint, width) {
  let x = Math.random() * s, y = -20;
  g.beginPath();
  g.moveTo(x, y);
  while (y < s + 20) {
    x += (Math.random() - 0.5) * 46;
    y += 14 + Math.random() * 30;
    g.lineTo(x, y);
  }
  g.strokeStyle = tint;
  g.lineWidth = width;
  g.lineJoin = "round";
  g.stroke();
}
function speckle(g, s, color, n, rMax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, Math.random() * rMax, 0, Math.PI * 2);
    g.fill();
  }
}
function makeStoneTexture(kind) {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  if (kind === "marble") {
    g.fillStyle = "#e9e2d5";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 5; i++) veinWalk(g, s, `rgba(140,130,115,${0.10 + Math.random() * 0.14})`, 5 + Math.random() * 10);
    for (let i = 0; i < 3; i++) veinWalk(g, s, `rgba(105,95,82,${0.16 + Math.random() * 0.12})`, 1.4 + Math.random() * 2.2);
    veinWalk(g, s, "rgba(160,130,90,0.14)", 2);
    speckle(g, s, "rgba(120,110,95,0.05)", 260, 2.4);
  } else if (kind === "travertine") {
    g.fillStyle = "#d3bc99";
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 6 + Math.random() * 14) {
      g.fillStyle = `rgba(${150 + Math.random() * 60 | 0},${120 + Math.random() * 45 | 0},${80 + Math.random() * 30 | 0},${0.10 + Math.random() * 0.16})`;
      g.fillRect(0, y, s, 3 + Math.random() * 9);
    }
    speckle(g, s, "rgba(90,70,45,0.10)", 420, 1.8);
  } else if (kind === "terracotta") {
    g.fillStyle = "#a5643a";
    g.fillRect(0, 0, s, s);
    speckle(g, s, "rgba(200,140,90,0.10)", 200, 16);
    speckle(g, s, "rgba(120,60,30,0.12)", 260, 8);
  } else { // slate
    g.fillStyle = "#2c2c31";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) veinWalk(g, s, `rgba(90,90,100,${0.08 + Math.random() * 0.10})`, 2 + Math.random() * 4);
    speckle(g, s, "rgba(160,160,175,0.05)", 500, 1.6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
const stoneMats = [
  new THREE.MeshStandardMaterial({ map: makeStoneTexture("marble"), roughness: 0.32, metalness: 0.05, envMapIntensity: 1.1 }),
  new THREE.MeshStandardMaterial({ map: makeStoneTexture("travertine"), roughness: 0.62, metalness: 0.0, envMapIntensity: 0.8 }),
  new THREE.MeshStandardMaterial({ map: makeStoneTexture("terracotta"), roughness: 0.7, metalness: 0.0, envMapIntensity: 0.7 }),
  new THREE.MeshStandardMaterial({ map: makeStoneTexture("slate"), roughness: 0.45, metalness: 0.12, envMapIntensity: 1.0 }),
];

/* ── Hero monolith: a grand marble slab ────────────────────────────────── */
const slabGroup = new THREE.Group();
{
  const slabMat = new THREE.MeshStandardMaterial({
    map: makeStoneTexture("marble"), roughness: 0.24, metalness: 0.06, envMapIntensity: 1.5,
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.16), slabMat);
  slabGroup.add(slab);
  // thin clay-bronze frame line floating around it
  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.01, 10, 140),
    new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.25, color: 0xd8a86f, envMapIntensity: 1.8 })
  );
  frame.name = "halo";
  slabGroup.add(frame);
}
scene.add(slabGroup);

/* ── Tile field: scattered shards that assemble into a wall ────────────── */
const TILE_COUNT = 140;
const tileGeo = new THREE.BoxGeometry(0.62, 0.62, 0.055);
const tiles = [];
const tileGroup = new THREE.Group();
const COLS = 14, ROWS = 10, GAP = 0.7;
for (let i = 0; i < TILE_COUNT; i++) {
  const m = new THREE.Mesh(tileGeo, stoneMats[i % stoneMats.length]);
  // scattered start: a loose cloud around and behind the viewer's path
  const scatter = new THREE.Vector3(
    (Math.random() - 0.5) * 22,
    (Math.random() - 0.5) * 26 - 4,
    -2 - Math.random() * 16
  );
  // target: a neat wall grid
  const col = i % COLS, row = Math.floor(i / COLS);
  const grid = new THREE.Vector3(
    (col - (COLS - 1) / 2) * GAP,
    (row - (ROWS - 1) / 2) * GAP - 1.2,
    -6
  );
  const rotScatter = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  m.position.copy(scatter);
  m.rotation.copy(rotScatter);
  m.userData = { scatter, grid, rotScatter, seed: Math.random() * Math.PI * 2, delay: Math.random() * 0.22 };
  tiles.push(m);
  tileGroup.add(m);
}
scene.add(tileGroup);

/* ── Lights ────────────────────────────────────────────────────────────── */
const key = new THREE.DirectionalLight(0xffe9c4, 2.2);
key.position.set(4, 5, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xc98a52, 1.3);
rim.position.set(-5, -2, -2);
scene.add(rim);
scene.add(new THREE.AmbientLight(0x201812, 2.4));

/* ── Dust motes ────────────────────────────────────────────────────────── */
function makeDotSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(255,240,210,1)");
  rg.addColorStop(0.35, "rgba(220,185,130,0.5)");
  rg.addColorStop(1, "rgba(220,185,130,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const dotTex = makeDotSprite();
function makeDust(count, spread, size, depth) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 1.6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * depth;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size, map: dotTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xcfa878, opacity: 0.7,
  });
  return new THREE.Points(geo, mat);
}
const dustNear = makeDust(600, 14, 0.07, 10);
const dustFar = makeDust(1000, 26, 0.04, 22);
dustFar.position.z = -7;
scene.add(dustNear, dustFar);

/* ── Volumetric ray planes (raking workshop light) ─────────────────────── */
const rayUniforms = { uTime: { value: 0 }, uIntensity: { value: 1 } };
function makeRay(x, tilt, w, speed) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...rayUniforms, uSpeed: { value: speed }, uSeed: { value: Math.random() * 10 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime,uIntensity,uSpeed,uSeed;
      void main(){
        float x = smoothstep(0.,.5,vUv.x)*smoothstep(1.,.5,vUv.x);
        float y = smoothstep(0.,.35,vUv.y)*smoothstep(1.,.6,vUv.y);
        float flicker = .78 + .22*sin(uTime*uSpeed + uSeed);
        vec3 col = vec3(.85,.72,.5);
        gl_FragColor = vec4(col, x*y*.26*flicker*uIntensity);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 30), mat);
  m.position.set(x, 2, -9);
  m.rotation.z = tilt;
  return m;
}
const rays = new THREE.Group();
[[-6.5, 0.24, 2.8, 0.6], [-2.5, 0.1, 1.9, 1.0], [1, -0.05, 3.4, 0.45], [4.4, -0.2, 2.3, 0.85], [7.4, -0.32, 3, 0.6]]
  .forEach(([x, t, w, s]) => rays.add(makeRay(x, t, w, s)));
scene.add(rays);

/* ── Scroll choreography ───────────────────────────────────────────────── */
let scrollTarget = 0, scrollEased = 0;
const mouse = { x: 0, y: 0, ex: 0, ey: 0 };
addEventListener("scroll", () => {
  const max = document.body.scrollHeight - innerHeight;
  scrollTarget = max > 0 ? scrollY / max : 0;
}, { passive: true });
addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

// keyframes: [progress, slabX, slabY, slabZ, slabScale, camZ, rayIntensity, assemble]
const KF = [
  [0.00,  0.0,  0.0, -1.2, 1.00, 8.0, 1.0, 0.00],
  [0.16, -5.2,  0.3, -4.0, 0.62, 8.4, 0.7, 0.05],
  [0.34, -3.6,  1.4, -6.0, 0.50, 8.8, 1.1, 0.30],
  [0.52,  3.8,  1.8, -7.0, 0.46, 9.0, 0.6, 0.72],
  [0.70,  3.2,  2.2, -6.5, 0.44, 8.6, 0.9, 1.00],
  [0.86, -3.4,  1.6, -5.5, 0.48, 8.0, 1.2, 1.00],
  [1.00,  0.0, -5.2, -4.5, 0.80, 7.2, 1.4, 1.00],
];
function sampleKF(p) {
  for (let i = 0; i < KF.length - 1; i++) {
    const a = KF[i], b = KF[i + 1];
    if (p >= a[0] && p <= b[0]) {
      const t = (p - a[0]) / (b[0] - a[0]);
      const e = t * t * (3 - 2 * t);
      return a.map((v, j) => v + (b[j] - v) * e);
    }
  }
  return KF[KF.length - 1];
}

/* ── DOM: loader, reveals, progress ────────────────────────────────────── */
const loader = document.getElementById("loader");
const barEl = loader.querySelector(".loader-line span");
let fakePct = 0;
const loadTimer = setInterval(() => {
  fakePct = Math.min(100, fakePct + Math.random() * 18);
  barEl.style.width = fakePct + "%";
  if (fakePct >= 100) {
    clearInterval(loadTimer);
    loader.classList.add("done");
    document.querySelectorAll(".hero .reveal").forEach((el, i) =>
      setTimeout(() => el.classList.add("in"), 150 + i * 160));
  }
}, 90);

const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) {
      const sibs = [...en.target.parentElement.querySelectorAll(".reveal")];
      const idx = sibs.indexOf(en.target);
      setTimeout(() => en.target.classList.add("in"), (idx % 6) * 110);
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.25 });
document.querySelectorAll(".panel:not(.hero) .reveal").forEach((el) => io.observe(el));

const progressBar = document.getElementById("progressBar");

/* ── Resize ────────────────────────────────────────────────────────────── */
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ── Loop ──────────────────────────────────────────────────────────────── */
const clock = new THREE.Clock();
const _v = new THREE.Vector3();
function tick() {
  const t = clock.getElapsedTime();
  scrollEased += (scrollTarget - scrollEased) * 0.06;
  mouse.ex += (mouse.x - mouse.ex) * 0.05;
  mouse.ey += (mouse.y - mouse.ey) * 0.05;

  const [, sx, sy, sz, ss, camZ, rayI, assemble] = sampleKF(scrollEased);

  // hero slab
  slabGroup.position.set(sx + mouse.ex * 0.25, sy + Math.sin(t * 0.7) * 0.1, sz);
  slabGroup.scale.setScalar(ss);
  slabGroup.rotation.y = Math.sin(t * 0.3) * 0.3 + scrollEased * Math.PI * 2 + mouse.ex * 0.1;
  slabGroup.rotation.x = Math.sin(t * 0.42) * 0.08 + mouse.ey * 0.1;
  const halo = slabGroup.getObjectByName("halo");
  if (halo) { halo.rotation.x = t * 0.35; halo.rotation.y = t * 0.2; }

  // tile assembly: each tile lerps scatter → grid with its own stagger
  for (const tile of tiles) {
    const u = tile.userData;
    const local = THREE.MathUtils.clamp((assemble - u.delay) / (1 - u.delay || 1), 0, 1);
    const e = local * local * (3 - 2 * local);
    _v.lerpVectors(u.scatter, u.grid, e);
    // gentle float that dies out once seated in the wall
    const drift = (1 - e);
    tile.position.set(
      _v.x + Math.sin(t * 0.6 + u.seed) * 0.35 * drift,
      _v.y + Math.cos(t * 0.5 + u.seed * 1.3) * 0.35 * drift,
      _v.z + Math.sin(t * 0.4 + u.seed * 0.7) * 0.3 * drift
    );
    tile.rotation.set(
      u.rotScatter.x * (1 - e) + Math.sin(t * 0.3 + u.seed) * 0.2 * drift,
      u.rotScatter.y * (1 - e) + Math.cos(t * 0.25 + u.seed) * 0.2 * drift,
      u.rotScatter.z * (1 - e)
    );
  }

  camera.position.z = camZ;
  camera.position.x = mouse.ex * 0.45;
  camera.position.y = -scrollEased * 1.4 + mouse.ey * -0.3;
  camera.lookAt(0, slabGroup.position.y * 0.35 - scrollEased * 1.2, slabGroup.position.z * 0.3);

  rayUniforms.uTime.value = t;
  rayUniforms.uIntensity.value = rayI;
  rays.position.y = 2 - scrollEased * 6;

  dustNear.rotation.y = t * 0.02;
  dustNear.position.y = -scrollEased * 3;
  dustFar.rotation.y = -t * 0.012;
  dustFar.position.y = -scrollEased * 1.4;

  progressBar.style.width = scrollEased * 100 + "%";
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

/* ── Card tilt ─────────────────────────────────────────────────────────── */
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
  });
  card.addEventListener("mouseleave", () => { card.style.transform = ""; });
});
