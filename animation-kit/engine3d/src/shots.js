import * as THREE from 'three';
import { makeHuman, standArmor } from './human.js';
import { gunArm, bullet, katana, viceStand, bulletSplit, rifleArms, bubbleTrail, glowSprite, sparks, streak } from './props.js';
import { materials } from './materials.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, ikArm } from './anim.js';

export const DURATION = 22.9;

// [start, text, end?]
export const CAPTIONS = [
  [0.00, 'If someone fired'],
  [0.88, 'a rifle at'],
  [1.52, 'you underwater'],
  [2.40, 'you\'d think you'],
  [2.96, 'were finished'],
  [4.24, 'But water is'],
  [5.04, 'eight hundred times'],
  [5.84, 'denser than air'],
  [7.20, 'So the faster'],
  [7.84, 'a bullet hits'],
  [8.56, 'it'],
  [8.88, 'the harder the'],
  [9.44, 'water hits back'],
  [10.88, 'A rifle bullet'],
  [11.84, 'shatters in less'],
  [12.72, 'than three feet!'],
  [13.92, 'A slower pistol'],
  [14.88, 'bullet goes deeper'],
  [16.08, 'but even that'],
  [16.64, 'dies after about'],
  [17.68, 'eight feet'],
  [18.80, 'So dive deep'],
  [19.68, 'enough'],
  [20.16, 'and the bullets'],
  [20.80, 'just sink right'],
  [21.52, 'past you!', 22.50],
];
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] to black
export const FADES = [[4.0, 4.14, 4.24, 4.4]];

const toWorld = (obj, v) => obj.localToWorld(v.clone());
function surfaceHit(scene, target, from, to) {
  scene.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(from, to.clone().sub(from).normalize(), 0, 10);
  const hits = rc.intersectObject(target, false);
  if (!hits.length) return { point: to.clone(), normal: from.clone().sub(to).normalize() };
  const n = hits[0].face.normal.clone().transformDirection(target.matrixWorld);
  return { point: hits[0].point, normal: n };
}
function idle(t, k = 1) { return Math.sin(t * 1.6) * 0.012 * k; }

// relaxed standing pose
const STAND = {
  lSh: [0.05, 0, 0.16], rSh: [0.05, 0, -0.16], lEl: [-0.25, 0, 0], rEl: [-0.25, 0, 0],
  lHip: [0, 0, 0.07], rHip: [0, 0, -0.07], lAn: [0, 0, -0.07], rAn: [0, 0, 0.07],
};
function standPose(h, t, extra = {}) {
  const p = { ...STAND, ...extra };
  p.chest = [idle(t) + (extra.chest?.[0] || 0), extra.chest?.[1] || 0, extra.chest?.[2] || 0];
  h.setPose(p);
}

// ===== "What if you fired a gun underwater?" =====
const WL = 4.0;                                   // water line (y)
const DIR = V(0.41, -0.912, 0).normalize();       // the way the bullets fly
const E = V(0, WL, 0);                            // where they enter the water
const along = s => E.clone().addScaledVector(DIR, s);
const ANG = Math.atan2(DIR.y, DIR.x);
const SW = V(1.44, 0.8, 0);                       // swimmer's chest (about 10 ft down)
const col = h => new THREE.Color(h);

function hideGround(scene) { scene.traverse(o => { if (o.material && o.material.isShadowMaterial) o.visible = false; }); }
function gradGeo(geo, top, mid, bot, y0, y1) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), T = col(top), M_ = col(mid), B = col(bot), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const k = clamp((p.getY(i) - y0) / (y1 - y0));
    if (k > 0.5) tmp.copy(M_).lerp(T, (k - 0.5) * 2); else tmp.copy(B).lerp(M_, k * 2);
    c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
}
// side-on cutaway: a block of water seen from outside, sky above
function cutaway(scene) {
  hideGround(scene);
  const wall = new THREE.Mesh(gradGeo(new THREE.PlaneGeometry(40, 9, 1, 12), 0x3fb2e6, 0x1877ad, 0x06304f, -4.5, 4.5), new THREE.MeshBasicMaterial({ vertexColors: true }));
  wall.position.set(0, WL - 4.5, -2.2); scene.add(wall);
  const body = new THREE.Mesh(new THREE.BoxGeometry(40, 9, 3.4), new THREE.MeshBasicMaterial({ color: 0x35b4e0, transparent: true, opacity: 0.16, depthWrite: false }));
  body.position.set(0, WL - 4.5, -0.5); body.renderOrder = 5; scene.add(body);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(40, 3.4), new THREE.MeshBasicMaterial({ color: 0x9fdcf8, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
  top.rotation.x = -Math.PI / 2; top.position.set(0, WL + 0.003, -0.5); top.renderOrder = 6; scene.add(top);
  const line = new THREE.Mesh(new THREE.BoxGeometry(40, 0.006, 0.01), new THREE.MeshBasicMaterial({ color: 0xeaf8ff }));
  line.position.set(0, WL, 1.2); scene.add(line);
}
// camera inside the water
function underwater(scene) {
  hideGround(scene);
  scene.userData.sky.visible = false;
  const dome = new THREE.Mesh(gradGeo(new THREE.SphereGeometry(40, 32, 24), 0x6fd0f5, 0x1b7fb8, 0x052a47, -22, 22), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -9; scene.add(dome);
  scene.fog = new THREE.Fog(0x1f7fb5, 2.5, 16);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x8fd8f8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  surf.rotation.x = -Math.PI / 2; surf.position.y = WL; scene.add(surf);
  const rays = [];
  for (let i = 0; i < 7; i++) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.35 + (i % 3) * 0.25, 9), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    ray.position.set(-3 + i * 1.1, WL - 4.2, -1.2 - (i % 4) * 0.9); ray.rotation.z = 0.28; scene.add(ray); rays.push(ray);
  }
  scene.userData.rays = t => rays.forEach((r, i) => { r.material.opacity = 0.02 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.7)); });
  scene.userData.rayList = rays;
}
function swimmer(scene) {
  const man = makeHuman('plain'); man.root.position.set(SW.x, SW.y - 1.35, 0); man.root.rotation.y = -Math.PI / 2; scene.add(man.root); return man;
}
function floatPose(man, t, { look = 0, fear = 0, speed = 1 } = {}) {
  const k = Math.sin(t * 2.2 * speed), k2 = Math.sin(t * 2.2 * speed + 1.6);
  man.root.position.y = SW.y - 1.35 + Math.sin(t * 1.1) * 0.03;
  man.setPose({
    spine: [0.05, 0, 0], chest: [-0.06 * look, 0, 0], neck: [-0.32 * look, 0, 0], head: [-0.3 * look, 0, 0],
    lSh: [0.15 * k, 0, 1.0 + 0.15 * k2], rSh: [-0.15 * k, 0, -1.0 - 0.15 * k2], lEl: [-0.6 - 0.2 * k2, 0, 0], rEl: [-0.6 + 0.2 * k2, 0, 0],
    lHip: [-0.3 + 0.25 * k, 0, 0.12], rHip: [-0.05 - 0.25 * k, 0, -0.12], lKn: [0.5 - 0.2 * k, 0, 0], rKn: [0.5 + 0.2 * k, 0, 0], lAn: [0.5, 0, 0], rAn: [0.5, 0, 0],
  });
  man.setMouth(fear);
}
function aimGun(scene, g, s) {                     // put a gun's muzzle at along(s), pointing down the path
  g.rotation.z = ANG; scene.add(g);
  const m = g.muzzle.clone().multiply(g.scale).applyAxisAngle(V(0, 0, 1), ANG);
  const p = along(s).sub(m); g.position.copy(p);
  return p.clone();
}
function muzzleFx(scene) {
  const f1 = glowSprite(0xff7a8a, 0.3), f2 = glowSprite(0xffe0a0, 0.2), light = new THREE.PointLight(0xff9a70, 0, 3);
  scene.add(f1, f2, light);
  return (p, f) => { f1.position.copy(p).addScaledVector(DIR, 0.05); f1.scale.setScalar(0.15 + 0.5 * f); f1.material.opacity = f; f2.position.copy(p); f2.scale.setScalar(0.3 * f + 0.001); f2.material.opacity = f; light.position.copy(p); light.intensity = 8 * f; };
}
const setBullet = (b, s, len) => { b.position.copy(along(s - len)); b.quaternion.setFromUnitVectors(V(0, 1, 0), DIR); };

// ============ SHOT 1: a rifle fires down at a swimmer ============
function shot1({ makeStage }) {
  const scene = makeStage({ shadowSize: 5 }); cutaway(scene);
  const man = swimmer(scene);
  const rf = rifleArms(); const base = aimGun(scene, rf, -0.75);
  const fx = muzzleFx(scene);
  const b = bullet(7); scene.add(b);
  const glow = glowSprite(0xff8a40, 0.25); scene.add(glow);
  const c = cam(40), TF = 0.9;
  return {
    scene, camera: c,
    update(t) {
      floatPose(man, t, { look: smooth(range(t, 0.2, 0.8)), fear: 0.9 * range(t, 1.0, 1.25) });
      const f = t >= TF && t < TF + 0.16 ? 1 - (t - TF) / 0.16 : 0;
      fx(along(-0.75), f); rf.position.copy(base).addScaledVector(DIR, -0.04 * f);
      b.visible = glow.visible = t >= TF;
      setBullet(b, -0.6 + (t - TF) * 0.3, 0.0186 * 7);
      glow.position.copy(b.position); glow.material.opacity = 0.4;
      const k = easeInOut(range(t, 0, 2.35)), s = shake(t, 0.6);
      place(c, [0.42 + s[0], lerp(2.25, 2.4, k) + s[1], lerp(9.8, 9.2, k)], [0.42, lerp(2.25, 2.4, k), 0]);
      return { dof: { focus: 8.4, aperture: 0.0003, maxblur: 0.002 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 2: he looks up, sure he's finished ============
function shot2({ makeStage }) {
  const scene = makeStage({ shadowSize: 3 }); underwater(scene);
  const man = swimmer(scene);
  const bub = bubbleTrail(40, { seed: 4, size: 0.035, rise: 0.35, life: 1.4, jitter: 0.02 }); scene.add(bub);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      floatPose(man, t + 2.35, { look: 1, fear: 0.9, speed: 1.7 });
      scene.userData.rays(t);
      bub.update(t, () => V(SW.x - 0.14, SW.y + 0.3, 0), 0.1, 1.9);
      const k = easeInOut(range(t, 0, 1.9)), s = shake(t, 0.5);
      place(c, [lerp(0.15, 0.4, k) + s[0], lerp(1.25, 1.2, k) + s[1], lerp(1.25, 0.95, k)], [SW.x - 0.03, SW.y + 0.3, 0]);
      return { dof: { focus: c.position.distanceTo(V(SW.x, SW.y + 0.3, 0)), aperture: 0.002, maxblur: 0.006 }, bloom: 0.5 };
    },
  };
}

// ============ SHOT 3: the bullet hits the surface ============
function shot3({ makeStage }) {
  const scene = makeStage({ shadowSize: 2 }); cutaway(scene);
  const S = 8, b = bullet(S); scene.add(b);
  const glow = glowSprite(0xff8a40, 0.2); scene.add(glow);
  const TI = 1.25;
  const sAt = t => t < TI ? -(TI - t) * 0.3 : 0.42 * (1 - Math.exp(-(t - TI) * 1.5));
  const splash = sparks(160, { speed: 1.5, spread: 0.8, gravity: -4.5, life: 0.9, size: 0.035, dir: V(-0.15, 1, 0), seed: 3, color: [0.8, 0.95, 1] }); splash.position.copy(E); scene.add(splash);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.copy(E).add(V(0, 0.006, 0)); ring.renderOrder = 7; scene.add(ring);
  const cav = streak(0xdff4ff); scene.add(cav);
  const bub = bubbleTrail(110, { seed: 6, size: 0.03, rise: 0.22, life: 1.3, jitter: 0.03 }); scene.add(bub);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      const s = sAt(t), it = t - TI;
      setBullet(b, s, 0.0186 * S);
      b.morphTargetInfluences[0] = 0.25 * smooth(range(it, 0, 1.2));
      glow.position.copy(b.position); glow.material.opacity = it < 0 ? 0.4 : 0.15;
      splash.update(it);
      ring.scale.setScalar(it > 0 ? 0.05 + it * 0.35 : 0.001); ring.material.opacity = it > 0 ? Math.max(0, 0.8 - it * 0.6) : 0;
      cav.set(along(0.0), along(Math.max(0.001, s - 0.0186 * S)), 0.05 * (1 - 0.5 * range(it, 0.6, 1.9)), it > 0.05 ? 0.4 * (1 - range(it, 0.9, 1.9)) : 0);
      bub.update(t, tb => along(sAt(tb) - 0.12), TI + 0.05, TI + 1.7);
      const k = easeInOut(range(t, 0, 2.9)), jolt = it > 0 ? Math.exp(-it * 6) * 0.01 * Math.sin(it * 70) : 0, sh = shake(t, 0.3);
      place(c, [0.12 + sh[0], lerp(4.06, 3.96, k) + jolt + sh[1], lerp(2.15, 1.8, k)], [0.06, lerp(4.0, 3.9, k), 0]);
      return { dof: { focus: c.position.distanceTo(E), aperture: 0.004, maxblur: 0.006 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 4: the water hits back — the bullet slows and mushrooms ============
function shot4({ makeStage }) {
  const scene = makeStage({ shadowSize: 1 }); underwater(scene);
  scene.userData.rayList.forEach(r => { r.visible = false; });
  const S = 1.6, b = bullet(S); scene.add(b);
  const sAt = t => 0.45 + 0.22 * (1 - Math.exp(-t * 0.7));
  const cav = streak(0xdff4ff); scene.add(cav);
  const bub = bubbleTrail(140, { seed: 8, size: 0.007, rise: 0.035, life: 1.6, jitter: 0.006 }); scene.add(bub);
  const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false })); r.quaternion.setFromUnitVectors(V(0, 0, 1), DIR); scene.add(r); return r; });
  const glow = glowSprite(0xffffff, 0.05); scene.add(glow);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      const s = sAt(t); setBullet(b, s, 0.0186 * S);
      const sq = 0.62 * smooth(range(t, 0.9, 3.0));
      b.morphTargetInfluences[0] = sq; b.material.emissiveIntensity = 0.4 + sq * 0.6;
      const nose = along(s - 0.0186 * S * 0.4 * sq);
      rings.forEach((r, i) => { const ph = (t * 1.1 + i / 3) % 1; r.position.copy(nose).addScaledVector(DIR, 0.004 - ph * 0.02); r.scale.setScalar(0.008 + ph * 0.03); r.material.opacity = 0.3 * (1 - ph) * range(t, 0.3, 0.9); });
      glow.position.copy(nose); glow.material.opacity = 0.35 * range(t, 0.3, 0.9); glow.scale.setScalar(0.03 + 0.01 * Math.sin(t * 9));
      cav.set(along(s - 0.3), along(s - 0.0186 * S - 0.002), 0.009 * (1 - 0.4 * sq), 0.14 * (1 - 0.5 * sq));
      bub.update(t, tb => along(sAt(tb) - 0.035), -0.6, 3.6);
      const k = easeInOut(range(t, 0, 3.65)), sh = shake(t, 0.15);
      const P = along(s - 0.012);
      place(c, [P.x - lerp(0.03, 0.0, k) + sh[0] * 0.2, P.y + lerp(0.012, 0.004, k) + sh[1] * 0.2, lerp(0.19, 0.165, k)], [P.x + 0.004, P.y - 0.002, 0]);
      return { dof: { focus: c.position.distanceTo(P), aperture: 0.04, maxblur: 0.012 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 5: a rifle bullet breaks up in under three feet ============
function shot5({ makeStage }) {
  const scene = makeStage({ shadowSize: 3 }); underwater(scene);
  const man = swimmer(scene);
  const M = materials();
  const S = 2.5, b = bullet(S); b.morphTargetInfluences[0] = 0.9; scene.add(b);
  const TS = 0.95, sS = 0.87, P0 = along(sS);
  const r = (() => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
  const lead = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.4 });
  const frags = Array.from({ length: 12 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.006 + r() * 0.01, 0), i % 3 ? M.copper : lead); m.scale.set(1, 0.5 + r(), 0.6 + r() * 0.6);
    m.userData.v = DIR.clone().multiplyScalar(0.25 + r() * 0.35).add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.55)); m.userData.w = [r() * 6, r() * 6, 0.05 + r() * 0.08];
    scene.add(m); return m;
  });
  const burst = sparks(150, { speed: 0.5, spread: 2.2, gravity: 0.5, life: 1.6, size: 0.022, dir: DIR, seed: 12, color: [0.8, 0.95, 1] }); burst.material.fog = false; burst.position.copy(P0); scene.add(burst);
  const flash = glowSprite(0xffffff, 0.3); flash.position.copy(P0); scene.add(flash);
  const cav = streak(0xdff4ff); scene.add(cav);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const it = t - TS;
      scene.userData.rays(t);
      floatPose(man, t + 10.8, { look: 1, fear: 0.7 * (1 - range(t, 1.6, 2.4)) });
      b.visible = it < 0; setBullet(b, sS - Math.max(0, -it) * 0.35, 0.0186 * S * 0.6);
      cav.set(along(0), along(Math.min(sS, sS + it * 0.35) - 0.03), 0.014, 0.3 * (1 - range(it, 0.2, 1.4)));
      frags.forEach(m => {
        m.visible = it >= 0; const q = Math.max(0, it), d = (1 - Math.exp(-3 * q)) / 3;
        m.position.copy(P0).addScaledVector(m.userData.v, d); m.position.y -= m.userData.w[2] * q + 0.02 * q * q;
        m.rotation.set(m.userData.w[0] + q * 3 * Math.exp(-q * 0.4), m.userData.w[1] + q * 2, 0);
      });
      burst.update(it);
      flash.material.opacity = it > 0 ? Math.max(0, 0.9 - it * 3) : 0; flash.scale.setScalar(0.1 + Math.max(0, it) * 0.6);
      const k = easeInOut(range(t, 1.45, 2.85)), jolt = it > 0 ? Math.exp(-it * 6) * 0.008 * Math.sin(it * 70) : 0;
      place(c, [lerp(0.2, 0.95, k), lerp(3.3, 2.2, k) + jolt, lerp(0.75, 5.0, k)], [lerp(P0.x, 0.98, k), lerp(P0.y - 0.02, 2.0, k), 0]);
      return { dof: { focus: lerp(0.8, 4.5, k), aperture: lerp(0.008, 0.0005, k), maxblur: 0.006 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 6: a slower pistol bullet goes deeper, then dies at about eight feet ============
function shot6({ makeStage }) {
  const scene = makeStage({ shadowSize: 5 }); cutaway(scene);
  const man = swimmer(scene);
  const arm = gunArm(); arm.scale.setScalar(2.4);
  arm.traverse(o => { if (o.geometry && o.geometry.type === 'CapsuleGeometry' && o.geometry.parameters.radius === 0.042) { const d = V(-0.8, -0.6, 0).normalize(); o.position.set(-0.075, -0.06, 0).addScaledVector(d, 0.3); o.quaternion.setFromUnitVectors(V(0, 1, 0), d); } }); const base = aimGun(scene, arm, -0.5);
  const fx = muzzleFx(scene);
  const S = 7, b = bullet(S); scene.add(b);
  const TF = 0.45, TD = 2.7;
  const sAt = t => -0.45 + 3.12 * (1 - Math.exp(-Math.max(0, t - TF) * 1.3));
  const splash = sparks(120, { speed: 2.2, spread: 0.8, gravity: -6, life: 0.7, size: 0.06, dir: V(-0.15, 1, 0), seed: 5, color: [0.8, 0.95, 1] }); splash.position.copy(E); scene.add(splash);
  const bub = bubbleTrail(170, { seed: 9, size: 0.07, rise: 0.22, life: 1.9, jitter: 0.035 }); scene.add(bub);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      floatPose(man, t + 13.85, { look: 1, fear: 0.6 * (1 - range(t, 2.6, 3.4)) });
      const f = t >= TF && t < TF + 0.16 ? 1 - (t - TF) / 0.16 : 0;
      fx(along(-0.5), f); arm.position.copy(base).addScaledVector(DIR, -0.05 * f);
      b.visible = t >= TF;
      const q = Math.max(0, t - TF - TD);
      setBullet(b, sAt(t), 0.0186 * S * 0.5);
      b.position.y -= 0.05 * q * q; b.rotateZ(q * 1.3); b.rotateX(q * 0.5);
      splash.update(t - TF - 0.12);
      bub.update(t, tb => along(sAt(tb) - 0.1), TF + 0.13, TF + TD);
      const k = easeInOut(range(t, 0.75, 3.5));
      place(c, [lerp(0.42, 0.95, k), lerp(2.4, 1.75, k), lerp(9.2, 4.7, k)], [lerp(0.42, 1.05, k), lerp(2.4, 1.6, k), 0]);
      return { dof: { focus: lerp(8.3, 4.7, k), aperture: 0.0003, maxblur: 0.002 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 7: deep enough, the bullets just sink past ============
function shot7({ makeStage }) {
  const scene = makeStage({ shadowSize: 3 }); underwater(scene);
  const man = swimmer(scene);
  const bs = [[0.95, 1.75, 0.25, 0.3], [1.12, 2.15, -0.2, 1.4], [0.8, 1.45, -0.05, 2.2], [1.2, 2.6, 0.35, 0.9], [0.7, 2.3, 0.15, 3.1]].map(([x, y, z, ph]) => { const b = bullet(3); b.morphTargetInfluences[0] = 0.12; scene.add(b); b.userData = { x, y, z, ph }; return b; });
  const bub = bubbleTrail(30, { seed: 14, size: 0.03, rise: 0.3, life: 1.6, jitter: 0.02 }); scene.add(bub);
  const c = cam(38);
  return {
    scene, camera: c,
    update(t) {
      floatPose(man, t + 18.7, { look: 0.45 - 0.35 * smooth(range(t, 0.8, 2.6)), fear: 0, speed: 0.7 });
      scene.userData.rays(t);
      bs.forEach(b => { const u = b.userData; b.position.set(u.x + Math.sin(t * 0.9 + u.ph) * 0.02, u.y - 0.2 * t, u.z); b.rotation.set(t * 0.9 + u.ph, u.ph, t * 0.6 + u.ph * 2); });
      bub.update(t, () => V(SW.x - 0.14, SW.y + 0.3, 0), 0.5, 3.8);
      const k = easeInOut(range(t, 0, 4.2)), s = shake(t, 0.4);
      place(c, [lerp(0.05, 0.3, k) + s[0], lerp(1.2, 1.12, k) + s[1], lerp(2.5, 2.0, k)], [1.25, 1.0, 0]);
      return { dof: { focus: 2.4, aperture: 0.0015, maxblur: 0.005 }, bloom: 0.5 };
    },
  };
}

export const SHOTS = [
  { start: 0.0, end: 2.35, build: shot1, mb: 3, mbWin: [[0.85, 1.1]] },
  { start: 2.35, end: 4.25, build: shot2 },
  { start: 4.25, end: 7.15, build: shot3 },
  { start: 7.15, end: 10.8, build: shot4 },
  { start: 10.8, end: 13.85, build: shot5 },
  { start: 13.85, end: 18.7, build: shot6, mb: 3, mbWin: [[0.4, 0.7]] },
  { start: 18.7, end: DURATION + 1, build: shot7 },
];
