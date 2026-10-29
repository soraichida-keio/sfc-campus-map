import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import geom from '../geom.json';
import { BLD, CATS } from './data.js';

const FH = 4.2;          // 1階あたりの高さ(m)。見映え優先でやや強調
const BAY = 4.6;         // 窓1スパンの幅(m)
const GAP = 7;           // 分解表示の階間隔(m)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const THEMES = {
  day: {
    bg: '#dfe7f1', fog: '#dfe7f1', table: '#c9d3e2', hemiSky: '#ffffff', hemiGround: '#b7c4a4', hemiI: 0.85,
    sun: '#fff1da', sunI: 3.0, wall: '#f5f3ee', ground: 0xffffff, slabTop: '#b9c0cb', earthTop: '#a79a86', earthBottom: '#6e6458',
    dim: '#d7dde6', emissive: 0, water: '#6cc2f0', tree: 1.0, exposure: 1.0,
  },
};

function makeWindowTextures() {
  const s = 128;
  const mk = (bg, fg, sill) => {
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, s, s);
    g.fillStyle = fg; g.fillRect(s * 0.16, s * 0.30, s * 0.68, s * 0.46);
    if (sill) { g.fillStyle = sill; g.fillRect(s * 0.12, s * 0.76, s * 0.76, s * 0.05); }
    g.fillStyle = bg === '#000' ? '#000' : 'rgba(0,0,0,0.10)';
    if (bg !== '#000') g.fillRect(0, s - 3, s, 3);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: mk('#ffffff', '#9fb0cb', '#dcdcdc'), emi: mk('#000', '#ffcf7a', null) };
}

// ポリゴン(x,z) → 壁ジオメトリ(世界座標)。floorFrom〜floorTo(階)。
function wallGeometry(poly, y0, y1, vRepeat) {
  let pts = poly.map((p) => ({ x: p[0], z: p[1] }));
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a.x * b.z - b.x * a.z; }
  if (area < 0) pts = pts.reverse();
  const pos = [], nor = [], uv = [];
  let u = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ex = b.x - a.x, ez = b.z - a.z, len = Math.hypot(ex, ez);
    if (len < 0.01) continue;
    const nx = ez / len, nz = -ex / len;
    const u0 = u / BAY, u1 = (u + len) / BAY; u += len;
    const v = [
      [a.x, y0, a.z, u0, 0], [a.x, y1, a.z, u0, vRepeat], [b.x, y1, b.z, u1, vRepeat],
      [a.x, y0, a.z, u0, 0], [b.x, y1, b.z, u1, vRepeat], [b.x, y0, b.z, u1, 0],
    ];
    for (const q of v) { pos.push(q[0], q[1], q[2]); nor.push(nx, 0, nz); uv.push(q[3], q[4]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function flatGeometry(poly, y) {
  const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], -p[1])));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

function polyCenter(blocks) {
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const b of blocks) for (const p of b.p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ };
}

export class CampusScene {
  constructor(canvasHost, opts = {}) {
    this.host = canvasHost;
    this.onPick = opts.onPick || (() => {});
    this.onHover = opts.onHover || (() => {});
    this.onReady = opts.onReady || (() => {});
    this.ambient = !!opts.ambient;
    this.theme = 'day';
    this.dirty = true;
    this.anims = [];
    this.buildings = {};   // id -> {group, meshes, color, ...}
    this.selected = null;
    this.hoverId = null;
    this.focusSet = null;  // null=全部。Set=強調する建物id
    this.floorSel = null;
    this.explodeT = 0;
    this.floorsGroup = null;
    this.size = geom.size;

    const w = canvasHost.clientWidth, h = canvasHost.clientHeight;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.ambient ? 1.5 : 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    canvasHost.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', 'SFCキャンパスの3Dマップ');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#dfe7f1', 1500, 4600);

    this.camera = new THREE.PerspectiveCamera(32, w / h, 5, 6000);
    this.camera.position.set(-260, 330, 520);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.09;
    this.controls.maxPolarAngle = 1.38; this.controls.minPolarAngle = 0.0;
    this.controls.minDistance = 45; this.controls.maxDistance = 2600;
    this.controls.screenSpacePanning = false;
    this.controls.target.set(40, 0, -10);
    this.controls.rotateSpeed = 0.7; this.controls.zoomSpeed = 0.9;
    this.controls.addEventListener('change', () => { this.dirty = true; });
    this.controls.addEventListener('start', () => { this.cancelFly(); });

    this.texWin = makeWindowTextures();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pickables = [];

    this.buildLights();
    this.buildGround();
    this.buildBuildings();
    this.buildTrees();
    this.buildPonds();
    this.applyTheme('day', true);
    if (this.ambient) {
      this.controls.enabled = false; this.controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; this.controls.autoRotateSpeed = 0.45;
      this.renderer.domElement.style.pointerEvents = 'none';
    }

    this.bindEvents();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvasHost);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.onReady();
  }

  invalidate() { this.dirty = true; }

  // ---------- 構築 ----------
  buildLights() {
    this.hemi = new THREE.HemisphereLight('#fff', '#b7c4a4', 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1da', 2.6);
    this.sun.position.set(-330, 520, 240);
    this.sun.target.position.set(40, 0, 0);
    this.sun.castShadow = true;
    const q = (this.ambient || window.innerWidth < 800) ? 2048 : 4096;
    this.sun.shadow.mapSize.set(q, q);
    const c = this.sun.shadow.camera; const R = 520;
    c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 100; c.far = 1400;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6; this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    this.rim = new THREE.DirectionalLight('#6e8bff', 0);
    this.rim.position.set(380, 240, -300);
    this.scene.add(this.rim);
  }

  buildGround() {
    const [W, D] = this.size;
    this.groundGroup = new THREE.Group();
    // 台座(島のような厚み)
    const shapes = geom.land.map((poly) => new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], -p[1]))));
    const topGeo = new THREE.ShapeGeometry(shapes); topGeo.rotateX(-Math.PI / 2); topGeo.translate(0, -0.15, 0);
    this.slabTop = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ color: '#b9c0cb', roughness: 1 }));
    this.slabTop.receiveShadow = true;
    // 側面(土)
    const sideParts = [];
    for (const poly of geom.land) {
      const g = wallGeometry(poly, -0.15, -15, 1);
      sideParts.push(g);
    }
    const sideGeo = sideParts.length === 1 ? sideParts[0] : sideParts[0];
    // 頂点カラーで上→下のグラデーション
    const pos = sideGeo.getAttribute('position'); const col = [];
    this.earthTopC = new THREE.Color('#a79a86'); this.earthBotC = new THREE.Color('#6e6458');
    for (let i = 0; i < pos.count; i++) { const t = clamp((-0.15 - pos.getY(i)) / 14.85, 0, 1); const c = this.earthTopC.clone().lerp(this.earthBotC, t); col.push(c.r, c.g, c.b); }
    sideGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.slabSide = new THREE.Mesh(sideGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    this.slabSide.castShadow = true; this.slabSide.receiveShadow = true;
    // 地図テクスチャ
    const tex = new THREE.TextureLoader().load('/ground.png', () => this.invalidate());
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    this.groundMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, metalness: 0, alphaTest: 0.02 });
    const plane = new THREE.PlaneGeometry(W, D); plane.rotateX(-Math.PI / 2);
    this.groundMesh = new THREE.Mesh(plane, this.groundMat);
    this.groundMesh.receiveShadow = true; this.groundMesh.position.y = 0.02;
    this.pickables.push(this.groundMesh);
    // 机(遠景)
    const tbl = new THREE.Mesh(new THREE.CircleGeometry(4000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c9d3e2', roughness: 1 }));
    tbl.position.y = -15.2; tbl.receiveShadow = true; this.table = tbl;
    this.groundGroup.add(this.slabTop, this.slabSide, this.groundMesh, tbl);
    this.scene.add(this.groundGroup);
  }

  catMaterials(cat) {
    const c = new THREE.Color(CATS[cat].color);
    const roof = new THREE.MeshStandardMaterial({ color: c.clone(), roughness: 0.62, metalness: 0.02 });
    const wall = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f5f3ee').lerp(c, 0.10), map: this.texWin.map, roughness: 0.82,
      emissive: new THREE.Color('#ffcf7a'), emissiveMap: this.texWin.emi, emissiveIntensity: 0,
    });
    return { roof, wall };
  }

  buildBuildings() {
    this.baseGroup = new THREE.Group();
    this.scene.add(this.baseGroup);
    for (const [id, blocks] of Object.entries(geom.b)) {
      const meta = BLD[id]; if (!meta) continue;
      const mats = this.catMaterials(meta.cat);
      const g = new THREE.Group(); g.name = id;
      const entry = { id, meta, group: g, mats, blocks: [], baseColors: { roof: mats.roof.color.clone(), wall: mats.wall.color.clone() }, dimK: 0 };
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 });
      entry.edgeMat = edgeMat;
      for (const bl of blocks) {
        const fl = meta.fl[bl.k] ?? meta.fl.m ?? 3;
        const h = fl * FH;
        const wall = new THREE.Mesh(wallGeometry(bl.p, 0, h, fl), mats.wall);
        const roof = new THREE.Mesh(flatGeometry(bl.p, h), mats.roof);
        wall.castShadow = true; wall.receiveShadow = true; roof.castShadow = true; roof.receiveShadow = true;
        wall.userData.id = id; roof.userData.id = id;
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(flatGeometry(bl.p, h + 0.06)), edgeMat);
        g.add(wall, roof, edges);
        this.pickables.push(wall, roof);
        entry.blocks.push({ ...bl, fl, h });
      }
      entry.center = polyCenter(blocks);
      entry.maxH = Math.max(...entry.blocks.map((b) => b.h));
      this.buildings[id] = entry;
      this.baseGroup.add(g);
    }
  }

  buildTrees() {
    const t = geom.trees; const n = t.length / 3;
    const crownGeo = new THREE.IcosahedronGeometry(1, 0); crownGeo.scale(1, 1.15, 1); crownGeo.translate(0, 2.9, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.8, 5); trunkGeo.translate(0, 0.9, 0);
    this.crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), n);
    this.trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#7a5c3e', roughness: 1 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    const rnd = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < n; i++) {
      const sc = t[i * 3 + 2] / 100; // 0.7..1.4
      p.set(t[i * 3] / 10, 0.05, t[i * 3 + 1] / 10);
      const rr = rnd(i);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr * 6.28);
      s.set(sc * 2.5, sc * 2.4, sc * 2.5); m.compose(p, q, s); this.crowns.setMatrixAt(i, m);
      s.set(sc, sc, sc); m.compose(p, q, s); this.trunks.setMatrixAt(i, m);
      c.setHSL(0.27 + rnd(i + 7) * 0.07, 0.42 + rnd(i + 3) * 0.12, 0.34 + rnd(i + 5) * 0.12);
      this.crowns.setColorAt(i, c);
    }
    this.crowns.castShadow = true; this.crowns.receiveShadow = true; this.trunks.castShadow = true;
    this.crowns.instanceMatrix.needsUpdate = true; this.crowns.instanceColor.needsUpdate = true;
    this.scene.add(this.trunks, this.crowns);
  }

  buildPonds() {
    this.pondMats = [];
    for (const poly of geom.ponds) {
      const g = flatGeometry(poly, 0.35);
      const mat = new THREE.MeshStandardMaterial({ color: '#6cc2f0', roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.92 });
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; this.scene.add(m); this.pondMats.push(mat);
    }
  }

  // ---------- テーマ ----------
  applyTheme(name, instant) {
    this.theme = name; const T = THEMES[name];
    this.scene.background = new THREE.Color(T.bg);
    this.scene.fog.color.set(T.fog);
    this.hemi.color.set(T.hemiSky); this.hemi.groundColor.set(T.hemiGround); this.hemi.intensity = T.hemiI;
    this.sun.color.set(T.sun); this.sun.intensity = T.sunI;
    this.rim.intensity = 0;
    this.table.material.color.set(T.table);
    this.slabTop.material.color.set(T.slabTop);
    this.earthTopC.set(T.earthTop); this.earthBotC.set(T.earthBottom);
    const pos = this.slabSide.geometry.getAttribute('position'); const col = this.slabSide.geometry.getAttribute('color');
    for (let i = 0; i < pos.count; i++) { const t = clamp((-0.15 - pos.getY(i)) / 14.85, 0, 1); const c = this.earthTopC.clone().lerp(this.earthBotC, t); col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true;
    this.groundMat.color.set(T.ground);
    this.crowns.material.color.set(new THREE.Color().setScalar(T.tree));
    for (const m of this.pondMats) m.color.set(T.water);
    this.renderer.toneMappingExposure = 1.0;
    for (const e of Object.values(this.buildings)) {
      e.mats.wall.emissiveIntensity = T.emissive * 0.9;
      e.baseColors.wall.set('#f5f3ee').lerp(new THREE.Color(CATS[e.meta.cat].color), 0.10);
    }
    this.refreshColors();
    if (this.floorsGroup) this.setFloor(this.floorSel);
    this.invalidate();
  }

  // 強調/減光/ホバー/選択の見た目をまとめて反映
  refreshColors() {
    const T = THEMES[this.theme]; const dimC = new THREE.Color(T.dim);
    for (const e of Object.values(this.buildings)) {
      const isSel = this.selected === e.id;
      const focused = !this.focusSet || this.focusSet.has(e.id);
      const dim = (this.selected && !isSel) ? 0.78 : (focused ? 0 : 0.82);
      e.mats.roof.color.copy(e.baseColors.roof).lerp(dimC, dim);
      e.mats.wall.color.copy(e.baseColors.wall).lerp(dimC, dim);
      e.mats.wall.emissiveIntensity = T.emissive * 0.9 * (1 - dim);
      const hov = this.hoverId === e.id && !dim;
      e.mats.roof.emissive.set(hov ? CATS[e.meta.cat].color : '#000'); e.mats.roof.emissiveIntensity = hov ? 0.38 : 0;
    }
    this.invalidate();
  }

  setFocus(set) { this.focusSet = set && set.size ? set : null; this.refreshColors(); }

  // ---------- 選択・分解表示 ----------
  select(id, floor = null) {
    if (this.selected && this.selected !== id) this.clearFloors(true);
    this.selected = id; this.floorSel = floor;
    if (id) {
      if (!this.floorsGroup) this.makeFloors(id);
      this.setFloor(floor);
      const from = this.explodeT;
      this.animate(0.7, (t) => { this.explodeT = from + (1 - from) * ease(t); this.layoutFloors(); }, null, 'explode');
    } else {
      this.clearFloors(false);
    }
    this.refreshColors();
  }

  makeFloors(id) {
    const e = this.buildings[id]; if (!e) return;
    const grp = new THREE.Group(); grp.userData.id = id;
    const T = THEMES[this.theme];
    const nFloors = Math.max(...e.blocks.map((b) => b.fl));
    const floors = [];
    const catC = new THREE.Color(CATS[e.meta.cat].color);
    for (const bl of e.blocks) {
      for (let f = 0; f < bl.fl; f++) {
        const y0 = f * FH, y1 = (f + 1) * FH;
        const wallMat = e.mats.wall.clone(); wallMat.map = this.texWin.map; wallMat.emissiveMap = this.texWin.emi;
        const wall = new THREE.Mesh(wallGeometry(bl.p, y0, y1, 1), wallMat);
        const plateMat = new THREE.MeshStandardMaterial({ color: catC.clone(), roughness: 0.62 });
        const plate = new THREE.Mesh(flatGeometry(bl.p, y1), plateMat);
        wall.castShadow = plate.castShadow = true; wall.receiveShadow = plate.receiveShadow = true;
        wall.userData = { id, floor: f + 1 }; plate.userData = { id, floor: f + 1 };
        const isTop = f + 1 === bl.fl;
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(flatGeometry(bl.p, y1 + 0.05)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
        const fg = new THREE.Group(); fg.add(wall, plate, edges); fg.userData = { floor: f + 1, wallMat, plateMat, plate, wall, isTop };
        grp.add(fg); floors.push(fg);
      }
    }
    this.floorsGroup = grp; this.floorList = floors; this.nFloors = nFloors;
    this.scene.add(grp);
    e.group.visible = false;
    this.pickables = this.pickables.filter((p) => !p.userData.floor);
    for (const fg of floors) { this.pickables.push(fg.userData.wall, fg.userData.plate); }
    this.layoutFloors();
  }

  layoutFloors() {
    if (!this.floorsGroup) return;
    for (const fg of this.floorList) fg.position.y = (fg.userData.floor - 1) * GAP * this.explodeT;
    this.invalidate();
  }

  setFloor(f) {
    this.floorSel = f;
    if (!this.floorsGroup) return;
    const T = THEMES[this.theme];
    const accent = new THREE.Color('#fbbf24');
    const e = this.buildings[this.selected]; const catC = new THREE.Color(CATS[e.meta.cat].color);
    for (const fg of this.floorList) {
      const on = f && fg.userData.floor === f; const off = f && !on;
      const pc = catC.clone();
      if (!fg.userData.isTop) pc.lerp(new THREE.Color('#ffffff'), off ? 0.78 : 0.5);
      else if (off) pc.lerp(new THREE.Color(T.dim), 0.12);
      fg.userData.plateMat.color.copy(on ? accent : pc);
      fg.userData.plateMat.emissive.set(on ? '#f59e0b' : '#000'); fg.userData.plateMat.emissiveIntensity = on ? 0.5 : 0;
      const base = '#f5f3ee';
      fg.userData.wallMat.color.set(base).lerp(on ? accent : catC, on ? 0.35 : 0.1);
      if (off) fg.userData.wallMat.color.lerp(new THREE.Color(T.dim), 0.35);
      fg.userData.wallMat.emissiveIntensity = THEMES[this.theme].emissive * (on ? 1.3 : 0.7);
    }
    this.invalidate();
  }

  clearFloors(immediate) {
    const done = () => {
      if (!this.floorsGroup) return;
      this.scene.remove(this.floorsGroup);
      this.floorsGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this.pickables = this.pickables.filter((p) => !p.userData.floor);
      this.floorsGroup = null; this.floorList = [];
      for (const e of Object.values(this.buildings)) e.group.visible = true;
      this.explodeT = 0; this.invalidate();
    };
    if (immediate || !this.floorsGroup) { this.cancelAnim('explode'); done(); return; }
    const from = this.explodeT;
    this.animate(0.5, (t) => { this.explodeT = from * (1 - ease(t)); this.layoutFloors(); }, done, 'explode');
  }

  // ---------- アニメーション ----------
  animate(dur, step, done, key) {
    if (key) this.cancelAnim(key);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { step(1); if (done) done(); this.invalidate(); return; }
    this.anims.push({ t0: performance.now(), dur: dur * 1000, step, done, key });
    this.invalidate();
  }
  cancelAnim(key) { this.anims = this.anims.filter((a) => a.key !== key); }
  cancelFly() { this.cancelAnim('fly'); }

  flyTo({ x, z, dist, azimuth, polar, y = 0 }, dur = 1.1) {
    const cam = this.camera, ctl = this.controls;
    const from = { tgt: ctl.target.clone(), off: cam.position.clone().sub(ctl.target) };
    const sph0 = new THREE.Spherical().setFromVector3(from.off);
    const sph1 = new THREE.Spherical(dist ?? sph0.radius, polar ?? sph0.phi, azimuth ?? sph0.theta);
    // 方位角の最短経路
    let d = sph1.theta - sph0.theta; d = Math.atan2(Math.sin(d), Math.cos(d)); sph1.theta = sph0.theta + d;
    sph1.phi = clamp(sph1.phi, 0.0001, ctl.maxPolarAngle);
    sph1.radius = clamp(sph1.radius, ctl.minDistance, ctl.maxDistance);
    const to = new THREE.Vector3(x ?? from.tgt.x, y, z ?? from.tgt.z);
    this.animate(dur, (t) => {
      const k = ease(t);
      ctl.target.lerpVectors(from.tgt, to, k);
      const s = new THREE.Spherical(sph0.radius + (sph1.radius - sph0.radius) * k, sph0.phi + (sph1.phi - sph0.phi) * k, sph0.theta + (sph1.theta - sph0.theta) * k);
      cam.position.copy(ctl.target).add(new THREE.Vector3().setFromSpherical(s));
      ctl.update();
    }, null, 'fly');
  }

  // 画面上の見やすい位置(パネルを避けた中央)に対象が来るよう、注視点をずらして移動
  aim({ x, z, y = 0, dist, polar, azimuth }, dur = 1.1, off = this.uiOffset ? this.uiOffset() : { x: 0, y: 0 }) {
    const cur = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const az = azimuth ?? cur.theta, ph = clamp(polar ?? cur.phi, 0.0001, this.controls.maxPolarAngle), D = dist ?? cur.radius;
    const mpp = (2 * Math.tan((this.camera.fov / 2) * Math.PI / 180) * D) / this.host.clientHeight;
    const rx = Math.cos(az), rz = -Math.sin(az), bx = Math.sin(az), bz = Math.cos(az);
    const k = mpp / Math.max(0.35, Math.cos(ph));
    const tx = x - rx * off.x * mpp - bx * off.y * k;
    const tz = z - rz * off.x * mpp - bz * off.y * k;
    this.flyTo({ x: tx, z: tz, y, dist: D, polar: ph, azimuth: az }, dur);
  }

  flyToBuilding(id) {
    const e = this.buildings[id]; if (!e) return;
    const nF = Math.max(...e.blocks.map((b) => b.fl));
    const stack = e.maxH + (nF - 1) * GAP;
    const size = Math.max(e.center.w, e.center.d, stack * 1.1);
    this.aim({ x: e.center.x, z: e.center.z, y: stack * 0.4, dist: clamp(size * 2.7 + 90, 150, 460), polar: 0.95 });
  }

  viewMode(mode) {
    if (mode === '2d') this.flyTo({ polar: 0.0001, azimuth: -Math.PI / 2, dist: Math.max(520, this.camera.position.distanceTo(this.controls.target)) }, 0.9); // 北が上
    else this.flyTo({ polar: 0.95, azimuth: -0.42 }, 0.9);
  }
  rotateBy(rad) { const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target)); this.flyTo({ azimuth: sph.theta + rad }, 0.6); }
  zoomBy(f) { const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target)); this.flyTo({ dist: sph.radius * f }, 0.5); }
  resetView() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    const portrait = w / h < 0.8;                       // スマホの縦画面では視野を広げて、キャンパス全体が入るようにする
    this.camera.fov = portrait ? 46 : 32; this.camera.updateProjectionMatrix();
    const half = Math.tan((this.camera.fov / 2) * Math.PI / 180);
    const dist = clamp((portrait ? 740 : 860) / (2 * half * (w / h)), 640, 2300);
    // スマホでは建物が集まっている場所(重心)を中央に。PC は左パネルぶんの補正つきの中心
    this.aim(portrait ? { x: -59, z: -74, y: 0, dist, polar: 0.95, azimuth: -0.42 } : { x: 40, z: -10, y: 0, dist, polar: 0.95, azimuth: -0.42 }, 1.2);
  }
  startAmbient() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    const dist = clamp(720 / (2 * 0.2867 * (w / h)), 600, 1500);
    const mobile = w < 760;
    this.controls.target.set(mobile ? 20 : -60, 0, -10);
    const s = new THREE.Spherical(dist, 0.92, -0.5);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(s));
    this.controls.update(); this.invalidate();
  }
  flyToPoint(x, z, dist = 190) { this.flyTo({ x, z, dist, polar: 0.95 }, 1.0); }

  getAzimuth() { return new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target)).theta; }
  getPolar() { return new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target)).phi; }
  getDistance() { return this.camera.position.distanceTo(this.controls.target); }

  // 3D → 画面座標
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.host.clientWidth, y: (-v.y * 0.5 + 0.5) * this.host.clientHeight, vis: v.z < 1 && v.z > -1 };
  }
  labelAnchor(id) { const e = this.buildings[id]; return [e.center.x, e.maxH + 2.5, e.center.z]; }

  // ---------- 経路の表示 ----------
  clearRoute() {
    if (this.routeGroup) { this.scene.remove(this.routeGroup); this.routeGroup.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); this.routeGroup = null; this.routeCurve = null; }
    this.invalidate();
  }
  /** path: [[x,z],…]  fit: 経路が収まるようにカメラを寄せる */
  showRoute(path, { fit = true } = {}) {
    this.clearRoute();
    if (!path || path.length < 2) return;
    const g = new THREE.Group();
    const pts = path.map((p) => new THREE.Vector3(p[0], 1.4, p[1]));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3);
    const seg = Math.max(32, pts.length * 8);
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, 0.85, 8, false), new THREE.MeshBasicMaterial({ color: 0xffb21a }));
    const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, 2.0, 8, false), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.35, depthWrite: false }));
    const mk = (p, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 14), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, roughness: 0.4 })); m.position.copy(p).setY(3.4); return m; };
    this.routeMarker = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    g.add(halo, core, mk(pts[0], 0x2fbf71), mk(pts[pts.length - 1], 0xe5484d), this.routeMarker);
    this.scene.add(g); this.routeGroup = g; this.routeCurve = curve; this.invalidate();
    if (fit) {
      let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; for (const p of path) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }
      const ext = Math.max(maxX - minX, maxZ - minZ, 60);
      this.aim({ x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, y: 0, dist: clamp(ext * 1.9 + 90, 160, 900), polar: 0.9 }, 1.2);
    }
  }

  // ---------- 入力 ----------
  bindEvents() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (ev) => { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (ev) => {
      if (!down) return; const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y); const dt = performance.now() - down.t; down = null;
      if (moved < 6 && dt < 600) { const hit = this.pick(ev); this.onPick(hit); }
    });
    el.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'touch' || ev.buttons) return;
      const hit = this.pick(ev); const id = hit && hit.id || null;
      if (id !== this.hoverId) { this.hoverId = id; el.style.cursor = id ? 'pointer' : 'grab'; this.refreshColors(); this.onHover(id, ev); }
    });
    el.addEventListener('pointerleave', () => { if (this.hoverId) { this.hoverId = null; this.refreshColors(); this.onHover(null); } });
  }

  pick(ev) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    for (const h of hits) {
      if (h.object === this.groundMesh) return { id: null, point: h.point };
      if (h.object.userData.id) return { id: h.object.userData.id, floor: h.object.userData.floor || null, point: h.point };
    }
    return { id: null };
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.invalidate();
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    let animating = false;
    if (this.anims.length) {
      const cur = this.anims; this.anims = [];
      for (const a of cur) {
        const t = clamp((now - a.t0) / a.dur, 0, 1); a.step(t);
        if (t < 1) this.anims.push(a); else if (a.done) a.done();
      }
      animating = true;
    }
    if (this.routeCurve && this.routeMarker) { const t = ((now / 5200) % 1); this.routeMarker.position.copy(this.routeCurve.getPoint(t)).setY(3.6); animating = true; }
    if (this.ambient && this.controls.autoRotate) animating = true;
    const moved = this.controls.update();
    // 範囲外へのパンを制限
    const t = this.controls.target; const lim = 460;
    const cx = clamp(t.x, -lim, lim), cz = clamp(t.z, -lim * 0.8, lim * 0.8);
    if (cx !== t.x || cz !== t.z) { this.camera.position.x += cx - t.x; this.camera.position.z += cz - t.z; t.x = cx; t.z = cz; this.dirty = true; }
    if (this.dirty || animating || moved) {
      this.dirty = false;
      this.renderer.render(this.scene, this.camera);
      if (this.onFrame) this.onFrame();
    }
  }
}
