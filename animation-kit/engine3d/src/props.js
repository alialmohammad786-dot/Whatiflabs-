import * as THREE from 'three';
import { materials } from './materials.js';
import { glowTexture, rng } from './textures.js';

const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const box = (w, h, d, mat, p = [0, 0, 0], r = [0, 0, 0]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(...p); m.rotation.set(...r); return m;
};

// ---------- pistol (barrel along +x, muzzle at .muzzle) ----------
export function pistol() {
  const M = materials();
  const g = new THREE.Group();
  g.add(box(0.19, 0.036, 0.03, M.gun, [0, 0.03, 0]));
  for (let i = 0; i < 7; i++) g.add(box(0.003, 0.03, 0.031, M.gunDark, [-0.085 + i * 0.007, 0.032, 0]));
  g.add(box(0.05, 0.012, 0.031, M.gunDark, [0.02, 0.03, 0])); // ejection port
  g.add(box(0.17, 0.022, 0.026, M.gunDark, [0.005, 0.003, 0]));
  const grip = box(0.04, 0.115, 0.03, M.gunDark, [-0.065, -0.052, 0], [0, 0, 0.22]); g.add(grip);
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 20, Math.PI), M.gunDark);
  tg.rotation.z = Math.PI; tg.position.set(-0.012, -0.008, 0); g.add(tg);
  g.add(box(0.004, 0.018, 0.006, M.gunDark, [-0.014, -0.015, 0], [0, 0, 0.3]));
  g.add(box(0.008, 0.008, 0.006, M.gunDark, [0.088, 0.052, 0]));
  g.add(box(0.012, 0.008, 0.02, M.gunDark, [-0.088, 0.052, 0]));
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 16), M.mouth);
  bore.rotation.z = Math.PI / 2; bore.position.set(0.0955, 0.03, 0); g.add(bore);
  g.muzzle = new THREE.Vector3(0.1, 0.03, 0);
  return shadow(g);
}

// first person arm holding the pistol (pistol frame = arm frame)
export function gunArm() {
  const M = materials();
  const g = new THREE.Group();
  const gun = pistol(); g.add(gun);
  const hand = new THREE.Group(); g.add(hand);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 32, 24), M.skin);
  palm.scale.set(0.95, 1.1, 0.8); palm.position.set(-0.075, -0.06, 0); hand.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.035, 4, 10), M.skin);
    f.rotation.x = Math.PI / 2; f.position.set(-0.045 - i * 0.004, -0.03 - i * 0.022, 0.026); hand.add(f);
  }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.05, 4, 10), M.skin);
  th.rotation.set(0, 0, -1.2); th.position.set(-0.04, 0.0, -0.022); hand.add(th);
  const fa = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.45, 8, 20), M.skin);
  fa.rotation.z = 1.05; fa.position.set(-0.29, -0.2, 0); hand.add(fa);
  g.muzzle = gun.muzzle;
  return shadow(g);
}

// ---------- bullet (nose along +y) with mushroom morph ----------
export function bullet(scale = 1) {
  const M = materials();
  const A = [[0, 0], [0.0052, 0], [0.0057, 0.0015], [0.0057, 0.006], [0.0057, 0.0105], [0.0052, 0.0135], [0.0042, 0.016], [0.0026, 0.0178], [0, 0.0186]];
  const B = [[0, 0.001], [0.0052, 0.001], [0.006, 0.0025], [0.0068, 0.006], [0.0095, 0.0085], [0.0125, 0.0098], [0.0118, 0.0108], [0.006, 0.0112], [0, 0.0112]];
  const smoothP = (P) => { const c = new THREE.SplineCurve(P.map(([r, y]) => new THREE.Vector2(r, y))); return c.getPoints(28); };
  const mk = (P) => new THREE.LatheGeometry(smoothP(P), 64);
  const ga = mk(A), gb = mk(B);
  // jagged splatter on the mushroom
  const p = gb.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const rad = Math.hypot(x, z);
    if (rad > 0.0065) { const a = Math.atan2(z, x); const k = 1 + (Math.sin(a * 6) * 0.09 + Math.sin(a * 11 + 1.3) * 0.05) * ((rad - 0.0065) / 0.006); p.setX(i, x * k); p.setZ(i, z * k); }
  }
  ga.morphAttributes.position = [gb.attributes.position];
  ga.computeVertexNormals();
  const m = new THREE.Mesh(ga, M.copper.clone());
  m.material.emissive = new THREE.Color(0x7a2408);
  m.scale.setScalar(scale);
  m.morphTargetInfluences = [0];
  m.castShadow = true;
  return m;
}

// ---------- sword (blade along +y, origin at grip) ----------
export function sword() {
  const M = materials();
  const g = new THREE.Group();
  const bg = new THREE.BoxGeometry(0.05, 0.85, 0.008, 1, 16, 1);
  const p = bg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.425, t = y / 0.85;
    const w = t > 0.88 ? (1 - t) / 0.12 : 1 - t * 0.25;
    p.setX(i, p.getX(i) * w); p.setZ(i, p.getZ(i) * (Math.abs(p.getX(i)) > 0.015 ? 0.35 : 1));
  }
  bg.translate(0, 0.425 + 0.09, 0); bg.computeVertexNormals();
  g.add(new THREE.Mesh(bg, M.steelBright));
  g.add(box(0.008, 0.6, 0.0095, M.steelDark, [0, 0.4, 0]));
  g.add(box(0.2, 0.022, 0.03, M.steelDark, [0, 0.08, 0]));
  const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 12), M.leather); g.add(gr);
  const pm = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), M.steelDark); pm.position.y = -0.08; g.add(pm);
  g.tip = new THREE.Vector3(0, 0.94, 0);
  return shadow(g);
}

// ---------- heater shield (front +z) ----------
export function shield() {
  const M = materials();
  const s = new THREE.Shape();
  s.moveTo(-0.27, 0.32); s.lineTo(0.27, 0.32);
  s.bezierCurveTo(0.29, 0.0, 0.2, -0.25, 0, -0.42);
  s.bezierCurveTo(-0.2, -0.25, -0.29, 0.0, -0.27, 0.32);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 3, curveSegments: 32 });
  // curve it a bit
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) - x * x * 0.5); }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, M.steel));
  const pts = s.getSpacedPoints(26);
  for (const q of pts) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.steelDark); r.position.set(q.x * 0.9, q.y * 0.9, 0.034 - q.x * q.x * 0.45); g.add(r); }
  return shadow(g);
}

// ---------- spiked mace (handle along +y, origin at grip) ----------
export function mace() {
  const M = materials();
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.62, 16), M.steelDark); h.position.y = 0.2; g.add(h);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 16), M.leather); g.add(wrap);
  const head = new THREE.Group(); head.position.y = 0.53; g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 32, 24), M.steel));
  const N = 22;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 12), M.steelBright);
    c.position.copy(dir.clone().multiplyScalar(0.085));
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    head.add(c);
  }
  g.head = head;
  return shadow(g);
}

// ---------- arrow (points +z, tip at origin) ----------
export function arrow() {
  const M = materials();
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.74, 10), M.wood);
  sh.rotation.x = Math.PI / 2; sh.position.z = -0.42; g.add(sh);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.055, 4), M.steelDark);
  hd.rotation.x = Math.PI / 2; hd.position.z = -0.027; g.add(hd);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.1), M.feather);
    const a = i * Math.PI * 2 / 3;
    f.rotation.set(0, 0, a); f.rotateX(Math.PI / 2); f.position.set(Math.cos(a) * 0.014, Math.sin(a) * 0.014, -0.72);
    g.add(f);
  }
  return shadow(g);
}

// ---------- bow (vertical, faces +z, grip at origin), dynamic draw ----------
export function bow() {
  const M = materials();
  const g = new THREE.Group();
  const L = 0.72;
  const limbMesh = new THREE.Mesh(new THREE.BufferGeometry(), M.woodDark); g.add(limbMesh);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 12), M.leather); g.add(grip);
  const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 1, 6), M.string);
  const s2 = s1.clone(); g.add(s1, s2);
  const tmp = new THREE.Vector3();
  function seg(m, a, b) {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    tmp.subVectors(b, a); m.scale.set(1, tmp.length(), 1);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
  }
  g.nock = new THREE.Vector3();
  g.update = (draw) => {
    const k = 0.1 + 0.16 * draw;
    const ys = L * (1 - 0.06 * draw);
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24 * 2 - 1;
      pts.push(new THREE.Vector3(0, t * ys, -k * t * t - 0.02 * Math.abs(t) ** 4 * (1 - draw)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    limbMesh.geometry.dispose();
    limbMesh.geometry = new THREE.TubeGeometry(curve, 48, 0.011, 8, false);
    const top = pts[24], bot = pts[0];
    g.nock.set(0, 0.035, -k - 0.02 - 0.58 * draw);
    seg(s1, top, g.nock); seg(s2, bot, g.nock);
  };
  g.update(0);
  return shadow(g);
}

// ---------- wooden armor stand ----------
export function stand() {
  const M = materials();
  const g = new THREE.Group();
  g.add(box(0.075, 1.5, 0.075, M.wood, [0, 0.75, 0]));
  g.add(box(0.4, 0.06, 0.07, M.wood, [0, 1.38, 0]));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.5;
    const leg = box(0.06, 0.55, 0.06, M.wood);
    leg.position.set(Math.cos(a) * 0.2, 0.2, Math.sin(a) * 0.2);
    leg.lookAt(Math.cos(a) * 2, 0.2, Math.sin(a) * 2); leg.rotateX(Math.PI / 2 - 0.65);
    g.add(leg);
    g.add(box(0.12, 0.05, 0.09, M.wood, [Math.cos(a) * 0.38, 0.025, Math.sin(a) * 0.38], [0, -a, 0]));
  }
  return shadow(g);
}

// ---------- effects ----------
let _glow;
export function glowSprite(color = 0xffffff, size = 1) {
  _glow = _glow || glowTexture();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glow, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size);
  return s;
}

// deterministic spark burst: update(dt since burst)
export function sparks(count = 60, { speed = 2.5, spread = 1, gravity = -6, life = 0.6, color = [1, 0.75, 0.3], size = 0.02, seed = 9, dir = new THREE.Vector3(0, 0, 1) } = {}) {
  const r = rng(seed);
  _glow = _glow || glowTexture();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: _glow, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const V = [], Lf = [];
  const d = dir.clone().normalize();
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(spread).add(d).normalize().multiplyScalar(speed * (0.3 + r() * 0.9));
    V.push(v); Lf.push(life * (0.4 + r() * 0.8));
  }
  pts.update = (t) => {
    for (let i = 0; i < count; i++) {
      const tt = Math.max(0, t), v = V[i];
      pos[i * 3] = v.x * tt; pos[i * 3 + 1] = v.y * tt + 0.5 * gravity * tt * tt; pos[i * 3 + 2] = v.z * tt;
      const a = t < 0 ? 0 : Math.max(0, 1 - tt / Lf[i]);
      col[i * 3] = color[0] * a * 3; col[i * 3 + 1] = color[1] * a * 3; col[i * 3 + 2] = color[2] * a * 3;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  pts.update(-1);
  return pts;
}

// glowing tracer streak between two points
export function streak(color = 0xfff2dd) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const tmp = new THREE.Vector3();
  m.set = (a, b, r = 0.003, op = 0.7) => {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    tmp.subVectors(b, a); const L = tmp.length();
    m.scale.set(r, Math.max(L, 1e-4), r);
    if (L > 1e-5) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
    m.material.opacity = op; m.visible = op > 0.001 && L > 1e-4;
  };
  return m;
}

// ---------- red impact ripple overlay ----------
const NOISE = `
float h3(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
`;
export function rippleOverlay(target) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCenter: { value: new THREE.Vector3() }, uRadius: { value: 0 }, uAmp: { value: 0 },
      uTime: { value: 0 }, uRings: { value: 160 }, uSpot: { value: 0.04 }, uBlot: { value: 0 }, uSpotAmp: { value: 1 },
    },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: NOISE + `
      uniform vec3 uCenter; uniform float uRadius,uAmp,uTime,uRings,uSpot,uBlot,uSpotAmp; varying vec3 vPos;
      void main(){
        float d = distance(vPos,uCenter);
        float front = 1.0 - smoothstep(uRadius*0.75, uRadius, d);
        float wob = n3(vPos*30.0)*0.012;
        float rings = pow(0.5+0.5*sin((d+wob*0.4)*uRings - uTime*9.0), 7.0);
        float fall = mix(1.0, 0.45, clamp(d/max(uRadius,1e-3),0.,1.));
        float bl = smoothstep(0.55, 0.8, n3(vPos*22.0 + vec3(0.,uTime*0.3,0.))*0.7 + n3(vPos*60.0)*0.3);
        float core = exp(-d*d/(uSpot*uSpot));
        float a = (rings*0.85*fall)*front*uAmp + bl*uBlot*front + core*uSpotAmp*uAmp;
        a = clamp(a,0.,1.);
        vec3 c = mix(vec3(0.9,0.05,0.06), vec3(1.0,0.45,0.42), core*0.6 + rings*0.25);
        gl_FragColor = vec4(c*(1.0+core*0.8), a*0.88);
      }`,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.FrontSide,
  });
  const m = new THREE.Mesh(target.geometry, mat);
  m.renderOrder = 5;
  target.add(m);
  return m;
}

// ---------- katana (blade along +y, cutting edge towards -x, origin at the grip) ----------
const K_W = 0.04, K_Y0 = 0.135, K_L = 0.725, K_CURVE = 0.03;
export function katana() {
  const M = materials();
  const g = new THREE.Group();
  const bg = new THREE.BoxGeometry(K_W, K_L, 0.007, 2, 28, 1);
  const p = bg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + K_L / 2) / K_L;
    let x = p.getX(i), z = p.getZ(i);
    if (x < -K_W / 4) z = 0;                                   // sharp wedge edge
    else if (x < K_W / 4) z *= 0.8;
    if (t > 0.9) { const k = (1 - t) / 0.1; x = K_W / 2 - (K_W / 2 - x) * k; z *= Math.max(k, 0.05); }   // tip tapers to the spine
    p.setX(i, x + K_CURVE * t * t); p.setZ(i, z); p.setY(i, p.getY(i) + K_L / 2 + K_Y0);
  }
  bg.computeVertexNormals();
  const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0xeef1f5, metalness: 0.9, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15, emissive: 0x2c3138, envMapIntensity: 1.5 });
  g.add(new THREE.Mesh(bg, bladeMat));
  const collar = box(0.034, 0.03, 0.0095, M.rivet, [0, K_Y0 + 0.012, 0]); g.add(collar);
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.006, 32), M.steelDark); tsuba.position.y = K_Y0 - 0.006; tsuba.scale.z = 0.8; g.add(tsuba);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0165, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.85 }));
  grip.scale.z = 0.75; g.add(grip);
  for (let i = 0; i < 9; i++) {                                // wrap diamonds
    const d = box(0.012, 0.012, 0.026, M.rivet, [0, -0.1 + i * 0.025, 0], [0, 0, Math.PI / 4]); d.scale.x = 0.9; g.add(d);
  }
  const capEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.014, 16), M.steelDark); capEnd.position.y = -0.13; capEnd.scale.z = 0.78; g.add(capEnd);
  g.edgeX = (y) => { const t = clamp01((y - K_Y0) / K_L); return -K_W / 2 + K_CURVE * t * t; };
  g.halfThick = (depth) => 0.0035 * Math.min(1, Math.max(0, depth) / (K_W * 0.75));
  return shadow(g);
}
const clamp01 = x => Math.min(1, Math.max(0, x));

// ---------- post with a steel vice that holds a sword upright (grip centre at y = 1.08) ----------
export function viceStand() {
  const M = materials();
  const g = new THREE.Group();
  g.add(box(0.1, 0.96, 0.1, M.wood, [0.005, 0.48, 0]));
  g.add(box(0.42, 0.05, 0.42, M.woodDark, [0, 0.025, 0]));
  g.add(box(0.07, 0.2, 0.03, M.steelDark, [0, 1.06, 0.034]));
  g.add(box(0.07, 0.2, 0.03, M.steelDark, [0, 1.06, -0.034]));
  g.add(box(0.12, 0.03, 0.12, M.steelDark, [0, 0.975, 0]));
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 10), M.steelBright); bolt.rotation.x = Math.PI / 2; bolt.position.set(0, 1.03, 0); g.add(bolt);
  return shadow(g);
}

// ---------- bullet made of two halves (copper jacket, lead core). Local +y = nose, cut plane x = 0 ----------
export function bulletSplit(scale = 1) {
  const M = materials();
  const A = [[0, 0], [0.0052, 0], [0.0057, 0.0015], [0.0057, 0.006], [0.0057, 0.0105], [0.0052, 0.0135], [0.0042, 0.016], [0.0026, 0.0178], [0, 0.0186]];
  const pts = new THREE.SplineCurve(A.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(28);
  const copper = M.copper.clone(); copper.emissive = new THREE.Color(0x7a2408); copper.side = THREE.DoubleSide;
  const lead = new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.75, roughness: 0.42, side: THREE.DoubleSide });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe08a4c, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide });
  const face = (k) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0].x * k, pts[0].y);
    pts.forEach(q => s.lineTo(q.x * k, 0.0093 + (q.y - 0.0093) * (k < 1 ? 0.9 : 1)));
    [...pts].reverse().forEach(q => s.lineTo(-q.x * k, 0.0093 + (q.y - 0.0093) * (k < 1 ? 0.9 : 1)));
    const geo = new THREE.ShapeGeometry(s, 24); geo.rotateY(Math.PI / 2); return geo;   // into the y-z plane
  };
  const g = new THREE.Group();
  const mk = (sign) => {
    const h = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.LatheGeometry(pts, 48, sign > 0 ? 0 : Math.PI, Math.PI), copper); shell.castShadow = true; h.add(shell);
    const rimF = new THREE.Mesh(face(1), rimMat); rimF.position.x = sign * 0.00002; h.add(rimF);
    const leadF = new THREE.Mesh(face(0.84), lead); leadF.position.x = -sign * 0.00006; h.add(leadF);
    g.add(h); return h;
  };
  g.a = mk(1); g.b = mk(-1);          // a: local x >= 0, b: local x <= 0
  g.scale.setScalar(scale);
  g.copper = copper;
  return g;
}

// ---------- rifle held by two hands (barrel along +x, muzzle at .muzzle) ----------
export function rifleArms() {
  const M = materials();
  const g = new THREE.Group();
  const cyl = (r, l, mat, p) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 16), mat); m.rotation.z = Math.PI / 2; m.position.set(...p); return m; };
  g.add(cyl(0.011, 0.56, M.gunDark, [0.28, 0, 0]));
  g.add(cyl(0.015, 0.05, M.gunDark, [0.545, 0, 0]));
  g.add(box(0.32, 0.055, 0.04, M.gunDark, [-0.12, -0.008, 0]));
  g.add(box(0.3, 0.042, 0.046, M.wood, [0.14, -0.016, 0]));
  g.add(box(0.34, 0.095, 0.04, M.wood, [-0.42, -0.045, 0], [0, 0, 0.13]));
  g.add(box(0.04, 0.11, 0.03, M.gunDark, [-0.07, -0.075, 0], [0, 0, 0.18]));
  g.add(cyl(0.017, 0.22, M.gunDark, [-0.1, 0.05, 0]));
  g.add(cyl(0.022, 0.03, M.gunDark, [0.015, 0.05, 0])); g.add(cyl(0.022, 0.03, M.gunDark, [-0.215, 0.05, 0]));
  for (const [x, y, ax, ay, az] of [[0.14, -0.05, -0.45, -0.3, 0.12], [-0.2, -0.075, -0.4, -0.22, -0.1]]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), M.skin); hand.scale.set(1.1, 0.9, 0.85); hand.position.set(x, y, 0); g.add(hand);
    const fa = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.5, 8, 16), M.skin);
    const d = new THREE.Vector3(ax, ay, az).normalize();
    fa.position.set(x, y, 0).addScaledVector(d, 0.3); fa.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(fa);
  }
  g.muzzle = new THREE.Vector3(0.57, 0, 0);
  return shadow(g);
}

// ---------- bubbles born along a path, then rising and fading: update(t, pathFn, t0, t1) ----------
export function bubbleTrail(n = 80, { seed = 1, size = 0.02, rise = 0.25, life = 1.6, jitter = 0.02, color = [0.8, 0.95, 1] } = {}) {
  const r = rng(seed);
  _glow = _glow || glowTexture();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: _glow, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  pts.frustumCulled = false;
  const J = [], W = [];
  for (let i = 0; i < n; i++) { J.push([(r() - 0.5) * 2 * jitter, (r() - 0.5) * 2 * jitter, (r() - 0.5) * 2 * jitter]); W.push([r() * 6.28, 0.6 + r() * 0.8]); }
  pts.update = (t, pathFn, t0, t1) => {
    for (let i = 0; i < n; i++) {
      const tb = t0 + (t1 - t0) * i / (n - 1), a = t - tb, k = W[i][1];
      if (a < 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
      const p = pathFn(tb);
      pos[i * 3] = p.x + J[i][0] + Math.sin(a * 3 + W[i][0]) * jitter * 0.5;
      pos[i * 3 + 1] = p.y + J[i][1] + rise * k * a;
      pos[i * 3 + 2] = p.z + J[i][2] + Math.cos(a * 2.3 + W[i][0]) * jitter * 0.5;
      const al = Math.max(0, 1 - a / (life * k)) * 1.6;
      col[i * 3] = color[0] * al; col[i * 3 + 1] = color[1] * al; col[i * 3 + 2] = color[2] * al;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  return pts;
}
