(() => {
const $ = id => document.getElementById(id);
const V3 = THREE.Vector3, clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));
const SHIP_R = 2.4;

/* ---------- Renderer, scene, lampu ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 30000);
scene.add(camera);

const sunPos = new V3(3000, 1200, 2000);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 800 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.3;
scene.add(sun, sun.target, new THREE.HemisphereLight(0x8fa8ff, 0x1a1a2e, 0.55));

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(.25, 'rgba(255,190,90,.5)'); g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
sunMesh.position.copy(sunPos);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false }));
halo.scale.set(4200, 4200, 1); sunMesh.add(halo); scene.add(sunMesh);

/* ---------- Bintang ---------- */
const SN = 5000, sp = new Float32Array(SN * 3), sc = new Float32Array(SN * 3), tints = [[1, 1, 1], [.7, .8, 1], [1, .9, .7]];
for (let i = 0; i < SN; i++) {
  const th = Math.random() * 6.283, z = Math.random() * 2 - 1, s = Math.sqrt(1 - z * z), R = 9000, t = tints[(Math.random() * 3) | 0], k = .4 + Math.random() * .6;
  sp.set([s * Math.cos(th) * R, z * R, s * Math.sin(th) * R], i * 3); sc.set([t[0] * k, t[1] * k, t[2] * k], i * 3);
}
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false }));
stars.frustumCulled = false; stars.renderOrder = -1; scene.add(stars);

/* ---------- Planet ---------- */
function planetTex(d) {
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), gas = d.t === 'gas';
  x.fillStyle = d.c[0]; x.fillRect(0, 0, W, H);
  if (gas) {
    for (let y = 0; y < H; y++) {
      const v = Math.sin(y * .09) + Math.sin(y * .23 + 1) * .6 + Math.sin(y * .5) * .3;
      x.globalAlpha = .8; x.fillStyle = d.c[v > .6 ? 1 : v > -.2 ? 0 : v > -.9 ? 2 : 3]; x.fillRect(0, y, W, 1);
    }
  }
  for (let i = 0; i < (gas ? 120 : 420); i++) {
    x.globalAlpha = .25 + Math.random() * .35; x.fillStyle = d.c[(Math.random() * d.c.length) | 0]; x.beginPath();
    const r = gas ? 30 + Math.random() * 60 : 6 + Math.random() * 28;
    x.ellipse(Math.random() * W, Math.random() * H, r, r * (gas ? .12 : .7) * (Math.random() + .3), 0, 0, 6.3); x.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
const defs = [
  { n: 'Terra', p: [350, -40, -350], r: 120, t: 'rock', c: ['#1c5fb8', '#2f9e5a', '#d8e6f0', '#174a8a'], atm: 0x4da6ff },
  { n: 'Ignis', p: [-900, 150, -1400], r: 200, t: 'rock', c: ['#8a2a12', '#d9541e', '#3a1308', '#f08a3a'], atm: 0xff6a2a },
  { n: 'Gigas', p: [1300, -300, -2300], r: 320, t: 'gas', c: ['#c9a574', '#e6cfa3', '#a07848', '#8a6238'], atm: 0xffd9a0, ring: 1 },
  { n: 'Glacia', p: [-1800, -200, -3300], r: 150, t: 'rock', c: ['#cfe9f5', '#9fd0e8', '#ffffff', '#6fb0d0'], atm: 0x9fe2ff },
  { n: 'Viridis', p: [500, 500, -4400], r: 260, t: 'gas', c: ['#5b2a86', '#8e44ad', '#c39bd3', '#3a1a58'], atm: 0xc080ff }
];
const bodies = [{ n: 'Matahari', pos: sunPos, r: 500 }], planets = [];
const atmMat = c => new THREE.ShaderMaterial({
  uniforms: { uC: { value: new THREE.Color(c) } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 uC;varying vec3 vN;void main(){float i=pow(max(0.,.72-dot(vN,vec3(0.,0.,1.))),3.);gl_FragColor=vec4(uC*i*1.8,1.);}'
});
defs.forEach(d => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(d.r, 64, 48), new THREE.MeshStandardMaterial({ map: planetTex(d), roughness: .9, metalness: 0 }));
  m.position.set(...d.p); m.castShadow = m.receiveShadow = true; scene.add(m);
  const a = new THREE.Mesh(new THREE.SphereGeometry(d.r * 1.12, 48, 32), atmMat(d.atm)); a.position.copy(m.position); scene.add(a);
  if (d.ring) {
    const r = new THREE.Mesh(new THREE.RingGeometry(d.r * 1.4, d.r * 2.1, 96), new THREE.MeshStandardMaterial({ color: 0xcdb78a, side: THREE.DoubleSide, transparent: true, opacity: .65, roughness: 1 }));
    r.rotation.x = Math.PI / 2 + .35; r.position.copy(m.position); r.castShadow = r.receiveShadow = true; scene.add(r);
  }
  planets.push(m); bodies.push({ n: d.n, pos: m.position, r: d.r });
});

/* ---------- Pesawat ---------- */
function buildShip() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const std = (color, m = .55, r = .3) => new THREE.MeshStandardMaterial({ color, metalness: m, roughness: r });
  const hull = std(0xdfe4ee), dark = std(0x252a36, .7, .4), blue = std(0x1b5bd8, .5, .35);
  const hullD = hull.clone(); hullD.side = THREE.DoubleSide;
  const glow = c => new THREE.MeshBasicMaterial({ color: c });
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; body.add(m); return m; };

  const prof = [[0, -3.3], [.5, -3.2], [.78, -2.5], [.86, -1], [.75, .8], [.48, 2.2], [.16, 3.3], [0, 3.8]].map(p => new THREE.Vector2(p[0], p[1]));
  const fg = new THREE.LatheGeometry(prof, 32); fg.rotateX(-Math.PI / 2);
  add(fg, hullD).scale.y = .8;
  [[-1.8, .84], [-.2, .86], [1.2, .72], [2.4, .5]].forEach(([z, r]) => { const t = add(new THREE.TorusGeometry(r, .045, 8, 32), dark, 0, 0, z); t.scale.y = .8; });
  const nose = add(new THREE.ConeGeometry(.17, .7, 16).rotateX(-Math.PI / 2), blue, 0, 0, -3.55);

  add(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0x7fd0ff, metalness: .2, roughness: .05, clearcoat: 1, transparent: true, opacity: .85 }), 0, .5, -1.1).scale.set(.5, .38, 1.25);

  const ws = new THREE.Shape(); ws.moveTo(.6, -.2); ws.lineTo(4.8, 1.8); ws.lineTo(4.8, 2.8); ws.lineTo(.6, 2.6); ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, { depth: .14, bevelEnabled: false }); wg.rotateX(Math.PI / 2); wg.translate(0, .07, 0);
  const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(1.5, 0); fs.lineTo(.4, 1.7); fs.lineTo(0, 1.7); fs.closePath();
  const fgm = new THREE.ExtrudeGeometry(fs, { depth: .1, bevelEnabled: false }); fgm.rotateY(Math.PI / 2); fgm.translate(-.05, 0, 0);
  const nozzles = [];
  [1, -1].forEach(s => {
    const w = add(wg, hull, 0, -.1, 0); w.scale.x = s;
    const st = add(new THREE.BoxGeometry(4.34, .03, .1), glow(0x33c8ff), s * 2.7, -.01, 1.75); st.rotation.y = -.256 * s * -1 * -1; st.castShadow = false;
    add(new THREE.SphereGeometry(.1, 12, 8), glow(s > 0 ? 0x44ff77 : 0xff3344), s * 4.85, -.1, 2.3);
    add(new THREE.CylinderGeometry(.07, .07, 2.4, 10).rotateX(Math.PI / 2), dark, s * 2.4, -.28, .6);
    add(new THREE.SphereGeometry(.09, 10, 8), glow(0x66e0ff), s * 2.4, -.28, -.62);
    const f = add(fgm, blue, s * .55, .35, 3.0); f.rotation.z = -.3 * s;
    add(new THREE.CylinderGeometry(.42, .5, 2.0, 18).rotateX(Math.PI / 2), hull, s * .65, -.05, 2.2);
    add(new THREE.TorusGeometry(.46, .05, 8, 20), blue, s * .65, -.05, 2.0);
    add(new THREE.ConeGeometry(.4, .6, 18).rotateX(-Math.PI / 2), dark, s * .65, -.05, .9);
    add(new THREE.CylinderGeometry(.34, .46, .5, 18, 1, true).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x15171d, metalness: .8, roughness: .35, side: THREE.DoubleSide }), s * .65, -.05, 3.35);
    add(new THREE.CircleGeometry(.33, 18), glow(0xff9a3a), s * .65, -.05, 3.2).castShadow = false;
    const n = new THREE.Object3D(); n.position.set(s * .65, -.05, 3.6); body.add(n); nozzles.push(n);
  });
  return { group: g, body, nozzles };
}
const ship = buildShip(); scene.add(ship.group);
const engLight = new THREE.PointLight(0xff7a2a, 2, 30); engLight.position.set(0, 0, 4.8); ship.group.add(engLight);

/* ---------- Api nitro (partikel shader, tanpa gambar) ---------- */
const N = 1300, fPos = new Float32Array(N * 3), fVel = new Float32Array(N * 3), fAge = new Float32Array(N).fill(1), fMax = new Float32Array(N).fill(1), fLife = new Float32Array(N).fill(1), fSize = new Float32Array(N);
const fg2 = new THREE.BufferGeometry();
fg2.setAttribute('position', new THREE.BufferAttribute(fPos, 3).setUsage(THREE.DynamicDrawUsage));
fg2.setAttribute('aLife', new THREE.BufferAttribute(fLife, 1).setUsage(THREE.DynamicDrawUsage));
fg2.setAttribute('aSize', new THREE.BufferAttribute(fSize, 1));
const fMat = new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 800 }, uBlue: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'attribute float aLife;attribute float aSize;varying float vL;uniform float uScale;void main(){vL=aLife;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/(-mv.z)*(1.-.5*aLife);gl_Position=projectionMatrix*mv;}',
  fragmentShader: 'varying float vL;uniform float uBlue;void main(){if(vL>=1.)discard;float d=length(gl_PointCoord-.5);if(d>.5)discard;float s=smoothstep(.5,0.,d);vec3 c=mix(vec3(1.,.95,.75),vec3(1.,.55,.12),smoothstep(0.,.35,vL));c=mix(c,vec3(.7,.1,.02),smoothstep(.35,1.,vL));c=mix(c,vec3(.35,.65,1.),uBlue*(1.-smoothstep(0.,.25,vL)));gl_FragColor=vec4(c,s*(1.-vL)*1.2);}'
});
const flame = new THREE.Points(fg2, fMat); flame.frustumCulled = false; scene.add(flame);
let head = 0, acc = 0, flamePower = .4;
const vel = new V3(), tmp = new V3(), back = new V3(), q2 = new THREE.Quaternion(), rnd = () => Math.random() * 2 - 1;

function updateFlame(dt) {
  ship.group.updateMatrixWorld(true); ship.body.getWorldQuaternion(q2); back.set(0, 0, 1).applyQuaternion(q2);
  const P = flamePower, rate = 70 + P * 320, life = .28 + P * .4, sz = 1.0 + P * 1.5, bs = 10 + P * 40, sp = 1.2 + P * 3;
  acc += rate * dt;
  while (acc >= 1) {
    acc--;
    ship.nozzles.forEach(n => {
      n.getWorldPosition(tmp); const i = head = (head + 1) % N, k = Math.random();
      fPos[i * 3] = tmp.x - vel.x * dt * k + rnd() * .1; fPos[i * 3 + 1] = tmp.y - vel.y * dt * k + rnd() * .1; fPos[i * 3 + 2] = tmp.z - vel.z * dt * k + rnd() * .1;
      const b = bs * (.7 + Math.random() * .6);
      fVel[i * 3] = vel.x * .75 + back.x * b + rnd() * sp; fVel[i * 3 + 1] = vel.y * .75 + back.y * b + rnd() * sp; fVel[i * 3 + 2] = vel.z * .75 + back.z * b + rnd() * sp;
      fAge[i] = 0; fMax[i] = life * (.7 + Math.random() * .6); fSize[i] = sz * (.7 + Math.random() * .6);
    });
  }
  const damp = Math.max(0, 1 - 1.5 * dt);
  for (let i = 0; i < N; i++) {
    if (fAge[i] < fMax[i]) {
      fAge[i] += dt;
      fPos[i * 3] += fVel[i * 3] * dt; fPos[i * 3 + 1] += fVel[i * 3 + 1] * dt; fPos[i * 3 + 2] += fVel[i * 3 + 2] * dt;
      fVel[i * 3] *= damp; fVel[i * 3 + 1] *= damp; fVel[i * 3 + 2] *= damp;
      fLife[i] = Math.min(1, fAge[i] / fMax[i]);
    } else fLife[i] = 1;
  }
  fg2.attributes.position.needsUpdate = fg2.attributes.aLife.needsUpdate = fg2.attributes.aSize.needsUpdate = true;
  fMat.uniforms.uBlue.value = P > .75 ? 1 : 0;
  fMat.uniforms.uScale.value = innerHeight * renderer.getPixelRatio() / (2 * Math.tan(camera.fov * Math.PI / 360));
  engLight.intensity = 1.2 + P * 3 + Math.random() * .6;
}

/* ---------- Input: dual joystick multi-touch ---------- */
const L = { x: 0, y: 0 }, R = { x: 0, y: 0 }, keys = {}, active = { L: null, R: null }, MAXR = 60;
const stickEl = { L: $('stickL'), R: $('stickR') };
let state = 'menu', nitro = false, brake = false;
function setStick(side, e) {
  const el = stickEl[side]; let dx = e.clientX - el._ox, dy = e.clientY - el._oy; const d = Math.hypot(dx, dy);
  if (d > MAXR) { dx *= MAXR / d; dy *= MAXR / d; }
  el.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
  const v = side === 'L' ? L : R; v.x = dx / MAXR; v.y = -dy / MAXR;
}
addEventListener('pointerdown', e => {
  if (state !== 'play' || e.target.closest('.btn')) return;
  const side = e.clientX < innerWidth / 2 ? 'L' : 'R'; if (active[side] !== null) return;
  active[side] = e.pointerId; const el = stickEl[side];
  el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; el.classList.add('on'); el._ox = e.clientX; el._oy = e.clientY; setStick(side, e);
});
addEventListener('pointermove', e => { for (const s of ['L', 'R']) if (active[s] === e.pointerId) setStick(s, e); });
const release = e => {
  for (const s of ['L', 'R']) if (active[s] === e.pointerId) {
    active[s] = null; stickEl[s].classList.remove('on'); stickEl[s].firstElementChild.style.transform = '';
    const v = s === 'L' ? L : R; v.x = v.y = 0;
  }
};
addEventListener('pointerup', release); addEventListener('pointercancel', release);
const hold = (id, fn) => {
  const b = $(id), off = () => { fn(false); b.classList.remove('on'); };
  b.addEventListener('pointerdown', e => { e.preventDefault(); fn(true); b.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, off));
};
hold('btnNitro', v => nitro = v); hold('btnBrake', v => brake = v);
addEventListener('keydown', e => keys[e.code] = true); addEventListener('keyup', e => keys[e.code] = false);
document.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- Login ---------- */
try { $('name').value = localStorage.getItem('sv_name') || ''; } catch (_) {}
$('form').addEventListener('submit', e => {
  e.preventDefault(); const n = $('name').value.trim() || 'Pilot';
  try { localStorage.setItem('sv_name', n); } catch (_) {}
  $('pilot').textContent = n; $('menu').classList.add('hide'); $('hud').classList.remove('hidden');
  ship.group.position.set(0, 0, 0); ship.group.quaternion.identity(); ship.body.rotation.set(0, 0, 0);
  speed = 60; energy = 100; state = 'play';
});

/* ---------- Loop ---------- */
let speed = 0, energy = 100, camYaw = 0, camPitch = 0, tt = 0, frame = 0;
const sm = { x: 0, y: 0 }, dq = new THREE.Quaternion(), eu = new THREE.Euler(), fwd = new V3(), off = new V3(), want = new V3(), look = new V3(), sunDir = new V3();

function lighting(pos) {
  sunDir.copy(sunPos).sub(pos).normalize();
  sun.position.copy(pos).addScaledVector(sunDir, 300); sun.target.position.copy(pos);
}

function updateMenu(dt) {
  const a = Math.sin(tt * .35) * 1.3 + .5;
  ship.group.position.set(0, Math.sin(tt * 1.2) * .25, 0);
  ship.body.rotation.z = Math.sin(tt * .8) * .06;
  camera.position.set(Math.sin(a) * 11.5, 3 + Math.sin(tt * .5), Math.cos(a) * 11.5);
  camera.up.set(0, 1, 0); camera.lookAt(0, -1.6, 0);
  vel.set(0, 0, 0); flamePower = .45; engLight.intensity; lighting(ship.group.position);
}

function updatePlay(dt) {
  const k = c => keys[c] ? 1 : 0;
  const lx = clamp(L.x + k('KeyD') - k('KeyA')), ly = clamp(L.y + k('KeyW') - k('KeyS'));
  const cx = clamp(R.x + k('ArrowRight') - k('ArrowLeft')), cy = clamp(R.y + k('ArrowUp') - k('ArrowDown'));
  const boost = (nitro || keys.ShiftLeft || keys.ShiftRight) && energy > 2, stop = brake || keys.Space;
  const g = ship.group, pos = g.position;

  sm.x += (lx - sm.x) * Math.min(1, dt * 6); sm.y += (ly - sm.y) * Math.min(1, dt * 6);
  eu.set(sm.y * 1.4 * dt, -sm.x * 1.5 * dt, 0, 'YXZ'); g.quaternion.multiply(dq.setFromEuler(eu)).normalize();
  ship.body.rotation.z += (-sm.x * .8 - ship.body.rotation.z) * Math.min(1, dt * 5);

  const target = stop ? 0 : boost ? 230 : 65;
  speed += (target - speed) * Math.min(1, dt * (boost ? 1.2 : 1.6));
  energy = clamp(energy + (boost ? -22 : 9) * dt, 0, 100);
  fwd.set(0, 0, -1).applyQuaternion(g.quaternion); vel.copy(fwd).multiplyScalar(speed);
  pos.addScaledVector(vel, dt);

  let warn = false;
  bodies.forEach(b => {
    tmp.copy(pos).sub(b.pos); const d = tmp.length(), m = b.r + SHIP_R;
    if (d < m) {
      pos.copy(b.pos).addScaledVector(tmp, m / d);
      const ap = -fwd.dot(tmp) / d; if (ap > 0) speed *= 1 - ap * Math.min(1, dt * 10);
    }
    if (d - b.r < 40 + speed * .4) warn = true;
  });

  camYaw = cx ? clamp(camYaw + cx * 2.6 * dt, -3.2, 3.2) : camYaw * (1 - Math.min(1, dt * 1.6));
  camPitch = cy ? clamp(camPitch + cy * 2 * dt, -1.1, 1.2) : camPitch * (1 - Math.min(1, dt * 1.6));
  off.set(0, 0, 13); eu.set(-(camPitch + .2), camYaw, 0, 'YXZ'); off.applyEuler(eu); off.y += 2; off.applyQuaternion(g.quaternion);
  want.copy(pos).add(off);
  bodies.forEach(b => { tmp.copy(want).sub(b.pos); const d = tmp.length(), m = b.r + 6; if (d < m) want.copy(b.pos).addScaledVector(tmp, m / d); });
  camera.position.lerp(want, 1 - Math.exp(-16 * dt));
  camera.up.set(0, 1, 0).applyQuaternion(g.quaternion);
  look.copy(pos).addScaledVector(fwd, 14); camera.lookAt(look);
  camera.fov += (62 + clamp((speed - 65) / 165) * 22 - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();

  flamePower = boost ? 1.1 : stop ? .15 : .4 + speed / 400 * .2;
  lighting(pos);

  if (frame % 4 === 0) {
    $('spd').textContent = Math.round(speed * 12); $('energy').style.width = energy + '%';
    let best = bodies[0], bd = 1e9; bodies.forEach(b => { const d = pos.distanceTo(b.pos) - b.r; if (d < bd) { bd = d; best = b; } });
    $('near').textContent = best.n; $('dist').textContent = Math.max(0, Math.round(bd * 10)); $('warn').classList.toggle('on', warn && bd < 60 + speed * .3);
  }
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05); tt += dt; frame++;
  state === 'play' ? updatePlay(dt) : updateMenu(dt);
  updateFlame(dt);
  planets.forEach(p => p.rotation.y += dt * .02);
  stars.position.copy(camera.position);
  renderer.render(scene, camera);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
loop();
})();
