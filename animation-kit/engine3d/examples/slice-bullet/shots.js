import * as THREE from 'three';
import { makeHuman, standArmor } from './human.js';
import { gunArm, bullet, katana, viceStand, bulletSplit, glowSprite, sparks, streak } from './props.js';
import { materials } from './materials.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, ikArm } from './anim.js';

export const DURATION = 25.6;

// [start, text, end?]
export const CAPTIONS = [
  [0.00, 'If you fired'],
  [0.56, 'a bullet straight'],
  [1.28, 'at a sword\'s'],
  [1.92, 'edge'],
  [2.48, 'you\'d expect the'],
  [3.12, 'blade to shatter'],
  [4.64, 'But most bullets'],
  [5.44, 'are soft lead'],
  [6.56, 'wrapped in a'],
  [7.12, 'thin copper jacket'],
  [8.56, 'And a katana\'s'],
  [9.52, 'edge is hardened'],
  [10.32, 'steel'],
  [10.88, 'far harder than'],
  [11.68, 'both'],
  [12.56, 'So when they'],
  [13.12, 'meet'],
  [13.52, 'the blade doesn\'t'],
  [14.32, 'break'],
  [14.96, 'It slices the'],
  [15.68, 'bullet clean in'],
  [16.64, 'two!'],
  [17.28, 'And the halves'],
  [18.00, 'fly off either'],
  [18.80, 'side'],
  [19.60, 'But no one'],
  [20.16, 'can react to'],
  [20.88, 'a real bullet'],
  [22.00, 'The sword has'],
  [22.72, 'to be waiting'],
  [23.52, 'right in its'],
  [24.08, 'path!', 24.83],
];
// [fadeInStart, fullStart, fullEnd, fadeOutEnd] to black
export const FADES = [[4.44, 4.56, 4.66, 4.8]];

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

// world set-up shared by the test shots: katana clamped upright, edge facing -x, bullet flies along +x at height HY
const HY = 1.5;
const BDIR = V(1, 0, 0);
function rig(scene) {
  const st = viceStand(); scene.add(st);
  const k = katana(); k.position.set(0, 1.08, 0); scene.add(k);
  const xE = k.edgeX(HY - 1.08);
  return { st, k, xE, E: V(xE, HY, 0) };
}
// orient a bullet so its nose points along +x and its cut plane is the blade plane (z = 0)
const BQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0)));

// ============ SHOT 1: gun fires at the clamped katana ============
function shot1({ makeStage }) {
  const scene = makeStage({ shadowSize: 2.5 });
  const { E } = rig(scene);
  const arm = gunArm(); scene.add(arm);
  const gunPos = V(-0.84, HY - 0.035, 0);
  arm.position.copy(gunPos);
  const flash = glowSprite(0xff7a8a, 0.12); scene.add(flash);
  const flash2 = glowSprite(0xffe0a0, 0.05); scene.add(flash2);
  const light = new THREE.PointLight(0xff9a70, 0, 2); scene.add(light);
  const b = bullet(1.3); scene.add(b);
  const bglow = glowSprite(0xff8a40, 0.05); scene.add(bglow);
  const c = cam(58);
  return {
    scene, camera: c,
    update(t) {
      scene.updateMatrixWorld(true);
      const muzzle = arm.localToWorld(arm.muzzle.clone());
      arm.position.y += HY - muzzle.y; scene.updateMatrixWorld(true);
      const mz = arm.localToWorld(arm.muzzle.clone());
      const f = t < 0.16 ? 1 - t / 0.16 : 0;
      flash.position.copy(mz).addScaledVector(BDIR, 0.03); flash.scale.setScalar(0.06 + 0.14 * f); flash.material.opacity = f;
      flash2.position.copy(mz).addScaledVector(BDIR, 0.01); flash2.scale.setScalar(0.09 * f + 0.001); flash2.material.opacity = f;
      light.position.copy(mz); light.intensity = 6 * f;
      arm.position.x = gunPos.x - 0.025 * f;
      b.position.copy(mz).addScaledVector(BDIR, 0.08 + t * 0.2); b.scale.setScalar(1.8);
      b.quaternion.setFromUnitVectors(V(0, 1, 0), BDIR);
      bglow.position.copy(b.position); bglow.material.opacity = 0.4;
      const k = easeInOut(range(t, 0.1, 2.4));
      const s = shake(t, 0.6);
      place(c, [lerp(-0.5, -0.42, k) + s[0], lerp(1.56, 1.52, k) + s[1], lerp(1.75, 1.5, k)], [-0.44, lerp(1.4, 1.43, k), 0]);
      return { dof: { focus: c.position.distanceTo(V(-0.5, HY, 0)), aperture: 0.0008, maxblur: 0.004 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 2: slow-motion bullet closing on the edge ============
function shot2({ makeStage }) {
  const scene = makeStage({ shadowSize: 1.5 });
  const { E } = rig(scene);
  const b = bullet(1.2); scene.add(b);
  const glow = glowSprite(0xff7a30, 0.05); scene.add(glow);
  const glint = glowSprite(0xffffff, 0.02); scene.add(glint);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      const gap = 0.02 + (2.3 - t) * 0.075;                       // nose-to-edge distance
      b.position.set(E.x - gap - 0.0186 * 1.2, HY, 0);
      b.quaternion.setFromUnitVectors(V(0, 1, 0), BDIR);
      b.rotateY(t * 2.5);
      glow.position.copy(b.position); glow.material.opacity = 0.3; glow.scale.setScalar(0.035);
      glint.position.set(E.x - 0.001, HY + 0.01 * Math.sin(t * 3), 0.001); glint.material.opacity = 0.35 + 0.35 * Math.sin(t * 5); glint.scale.setScalar(0.012);
      const k = range(t, 0, 2.3);
      const mid = V(b.position.x + 0.011, HY, 0);
      const s = shake(t, 0.15);
      place(c, [b.position.x - lerp(0.13, 0.1, k) + s[0] * 0.2, HY + lerp(0.025, 0.035, k) + s[1] * 0.2, lerp(0.1, 0.075, k)], [b.position.x + lerp(0.03, 0.022, k), HY + 0.002, 0]);
      return { dof: { focus: c.position.distanceTo(mid), aperture: 0.03, maxblur: 0.012 }, bloom: 0.55 };
    },
  };
}

// ============ SHOT 3: the bullet opens up: soft lead inside a thin copper jacket ============
function shot3({ makeStage }) {
  const scene = makeStage({ shadowSize: 0.3, sunDir: [-2, 5, 6] });
  const b = bulletSplit(1); scene.add(b);
  const P = V(0, 1.4, 0);
  const fill = new THREE.PointLight(0xffffff, 0.02, 0.5); scene.add(fill);
  const glow = glowSprite(0x9fc4ff, 0.05); scene.add(glow);
  const c = cam(28);
  return {
    scene, camera: c,
    update(t) {
      const open = easeInOut(range(t, 0.55, 1.5));
      const turn = -Math.PI / 2 + lerp(0.9, 0.0, easeInOut(range(t, 0, 1.4))) + Math.sin(t * 0.9) * 0.22 * range(t, 1.4, 2.2);
      b.position.set(P.x, P.y - 0.0093 + Math.sin(t * 1.3) * 0.0006, P.z);
      b.rotation.set(0.12, turn, -0.1);
      // near half (a, local +x → towards camera) slides off to the right and swings open
      b.a.position.set(0.003 * open, 0, -0.0085 * open);
      b.a.rotation.y = -1.25 * open;
      b.b.position.set(0, 0, 0.004 * open);
      fill.position.set(0.03, 1.42, 0.08);
      glow.position.set(P.x - 0.002, P.y, P.z - 0.03); glow.material.opacity = 0.16;
      const k = easeInOut(range(t, 0, 3.95));
      place(c, [lerp(0.014, 0.0, k), 1.4 + lerp(0.012, 0.004, k), lerp(0.14, 0.118, k)], [0.0045 * open, 1.4005, 0]);
      return { dof: { focus: c.position.distanceTo(P), aperture: 0.06, maxblur: 0.012 }, bloom: 0.4 };
    },
  };
}

// ============ SHOT 4: glide up the hardened edge ============
function shot4({ makeStage }) {
  const scene = makeStage({ shadowSize: 2, sunDir: [-4, 5, 3] });
  const { k: kt } = rig(scene);
  const glint = glowSprite(0xffffff, 0.03); scene.add(glint);
  const glint2 = glowSprite(0xbfd8ff, 0.06); scene.add(glint2);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0, 3.95));
      const y = lerp(1.32, 1.58, k);
      const ex = kt.edgeX(y - 1.08);
      const s = shake(t, 0.2);
      place(c, [ex - lerp(0.5, 0.4, k) + s[0] * 0.3, y - 0.2 + s[1] * 0.3, lerp(0.8, 0.6, k)], [ex + 0.012, y + 0.06, 0], 0.08);
      // a glint that races up the edge twice
      const gy = 1.22 + ((t * 0.55) % 1) * 0.7;
      glint.position.set(kt.edgeX(gy - 1.08) - 0.0005, gy, 0.0005);
      const a = Math.sin(((t * 0.55) % 1) * Math.PI);
      glint.material.opacity = 0.95 * a; glint.scale.setScalar(0.02 + 0.05 * a);
      glint2.position.copy(glint.position); glint2.material.opacity = 0.35 * a; glint2.scale.setScalar(0.16 * a + 0.001);
      return { dof: { focus: c.position.distanceTo(V(ex, y + 0.02, 0)), aperture: 0.004, maxblur: 0.006 }, bloom: 0.7 };
    },
  };
}

// ============ SHOT 5: the edge slices the bullet in two ============
const TI5 = 2.85;
function splitState(b, kt, E, t, TI, { vIn = 0.045, vOut = 0.045, S = 1.2 } = {}) {
  // returns penetration depth of the nose past the edge and poses the halves
  const noseX = t < TI ? E.x - (TI - t) * vIn : E.x + (t - TI) * vOut + 0.5 * 0.12 * Math.max(0, t - TI - 0.7) ** 2;
  const pen = Math.max(0, noseX - E.x);
  b.position.set(noseX - 0.0186 * S, E.y, 0);
  b.quaternion.copy(BQ);
  const sep = (kt.halfThick(pen) + Math.min(0.006, Math.max(0, pen - 0.012) * 0.12)) / S;
  const ang = 0.32 * smooth((pen - 0.004) / 0.05);
  b.a.position.set(sep, 0, 0); b.b.position.set(-sep, 0, 0);
  b.a.rotation.set(0, 0, -ang); b.b.rotation.set(0, 0, ang);
  return { noseX, pen };
}
function shot5({ makeStage }) {
  const scene = makeStage({ shadowSize: 1.5 });
  const { k: kt, E } = rig(scene);
  const b = bulletSplit(1.2); scene.add(b);
  const glow = glowSprite(0xff7a30, 0.05); scene.add(glow);
  const sp = sparks(160, { speed: 0.3, spread: 1.5, gravity: -0.35, life: 1.0, size: 0.0024, dir: V(-1, 0.25, 0), seed: 5, color: [1, 0.5, 0.14] });
  sp.position.copy(E); scene.add(sp);
  const sp2 = sparks(80, { speed: 0.16, spread: 2.2, gravity: -0.2, life: 1.3, size: 0.0016, dir: V(0.3, 0.6, 0), seed: 8, color: [1, 0.8, 0.5] });
  sp2.position.copy(E); scene.add(sp2);
  const puff = glowSprite(0xffc080, 0.01); scene.add(puff);
  const light = new THREE.PointLight(0xff8040, 0, 0.5); light.position.set(E.x - 0.03, E.y + 0.01, 0.01); scene.add(light);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      const { noseX, pen } = splitState(b, kt, E, t, TI5);
      const it = t - TI5;
      b.copper.emissiveIntensity = 0.4 + 1.2 * smooth(range(it, 0, 0.3)) * (1 - 0.5 * range(it, 0.6, 1.8));
      glow.position.set(noseX - 0.012, HY, 0); glow.scale.setScalar(0.035 + 0.04 * smooth(range(it, 0, 0.3))); glow.material.opacity = 0.25 + 0.35 * smooth(range(it, 0, 0.25)) * (1 - range(it, 0.8, 1.9));
      sp.update(it); sp2.update(it - 0.05);
      puff.position.set(E.x - 0.002, HY, 0); puff.scale.setScalar(it > 0 ? 0.02 + it * 0.05 : 0.001); puff.material.opacity = it > 0 ? Math.max(0, 0.7 - it * 1.2) : 0;
      light.intensity = it > 0 ? 1.0 * Math.exp(-it * 1.8) : 0;
      // camera: behind and above the bullet, pushing in and rising over the split
      const k = easeInOut(range(t, 0, 4.75));
      const jolt = it > 0 ? Math.exp(-it * 7) * 0.0025 * Math.sin(it * 90) : 0;
      const s = shake(t, 0.15);
      place(c, [E.x - lerp(0.25, 0.1, k) + s[0] * 0.2, HY + lerp(0.045, 0.105, k) + s[1] * 0.2 + jolt, lerp(0.07, 0.006, k)],
        [E.x + lerp(-0.02, 0.008, k) + pen * 0.75, HY - 0.002, 0]);
      return { dof: { focus: c.position.distanceTo(V(Math.min(noseX, E.x + 0.02), HY, 0)), aperture: 0.045, maxblur: 0.018 }, bloom: 0.65 };
    },
  };
}

// ============ SHOT 6: real speed — the two halves fly off either side into a board ============
function shot6({ makeStage }) {
  const scene = makeStage({ shadowSize: 3 });
  const { E } = rig(scene);
  const M = materials();
  const board = new THREE.Group();
  for (let i = 0; i < 5; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.3), M.wood); pl.position.set(0, 1.25, (i - 2) * 0.305); pl.castShadow = pl.receiveShadow = true; board.add(pl); }
  for (const z of [-0.78, 0.78]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), M.woodDark); leg.position.set(0, 0.25, z); leg.castShadow = true; board.add(leg); }
  board.position.x = 1.25; scene.add(board);
  const hits = [V(1.224, 1.53, 0.3), V(1.224, 1.46, -0.3)];
  const TF = 0.35;
  const s0 = streak(0xffe2b0); scene.add(s0);
  const parts = hits.map((h, i) => {
    const st = streak(0xffc890); scene.add(st);
    const sp = sparks(70, { speed: 1.4, spread: 1.2, gravity: -5, life: 0.5, size: 0.02, dir: V(-1, 0.3, 0), seed: 11 + i, color: [1, 0.7, 0.35] }); sp.position.copy(h); scene.add(sp);
    const chips = sparks(40, { speed: 0.9, spread: 1.5, gravity: -6, life: 0.7, size: 0.028, dir: V(-1, 0.5, 0), seed: 21 + i, color: [0.5, 0.33, 0.18] }); chips.material.blending = THREE.NormalBlending; chips.position.copy(h); scene.add(chips);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshBasicMaterial({ color: 0x120a05 })); hole.rotation.y = -Math.PI / 2; hole.position.copy(h).add(V(-0.0005, 0, 0)); hole.scale.set(0.6, 1.3, 1); hole.visible = false; scene.add(hole);
    const gl = glowSprite(0xffb060, 0.2); gl.position.copy(h).add(V(-0.02, 0, 0)); scene.add(gl);
    return { st, sp, chips, hole, gl, h };
  });
  const spE = sparks(90, { speed: 1.6, spread: 1.4, gravity: -5, life: 0.45, size: 0.018, dir: V(-1, 0.3, 0), seed: 4, color: [1, 0.75, 0.35] }); spE.position.copy(E); scene.add(spE);
  const glE = glowSprite(0xffd090, 0.2); glE.position.copy(E); scene.add(glE);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      const a = range(t, TF - 0.05, TF), bq = range(t, TF, TF + 0.05), fade = 1 - range(t, TF + 0.05, TF + 0.3);
      s0.set(V(lerp(-3, E.x - 0.6, a), HY, 0), V(lerp(-2.2, E.x, a), HY, 0), 0.004, t > TF - 0.05 && t < TF + 0.04 ? 0.9 : 0);
      spE.update(t - TF); glE.material.opacity = t > TF ? Math.max(0, 1 - (t - TF) * 5) : 0; glE.scale.setScalar(0.12 + (t - TF) * 0.4);
      for (const p of parts) {
        const tip = E.clone().lerp(p.h, bq);
        p.st.set(E.clone().lerp(p.h, Math.max(0, bq - 0.55)), tip, 0.0035, t > TF && bq > 0 ? 0.85 * fade : 0);
        const ht = t - TF - 0.05;
        p.sp.update(ht); p.chips.update(ht); p.hole.visible = ht > 0;
        p.gl.material.opacity = ht > 0 ? Math.max(0, 0.9 - ht * 3) : 0; p.gl.scale.setScalar(0.1 + Math.max(0, ht) * 0.5);
      }
      const k = easeInOut(range(t, 0.5, 2.25));
      const jolt = t > TF ? Math.exp(-(t - TF) * 6) * 0.012 * Math.sin((t - TF) * 70) : 0;
      place(c, [lerp(-1.25, -0.1, k), lerp(1.75, 1.62, k) + jolt, lerp(1.9, 1.1, k)], [lerp(0.45, 1.25, k), lerp(1.4, 1.48, k), lerp(0, -0.05, k)]);
      return { dof: { focus: c.position.distanceTo(V(lerp(0.2, 1.2, k), 1.5, 0)), aperture: 0.0012, maxblur: 0.005 }, bloom: 0.6 };
    },
  };
}

// ============ SHOT 7: nobody can react — the sword has to be waiting in the path ============
function shot7({ makeStage }) {
  const scene = makeStage({ shadowSize: 3.5, sunDir: [-2, 6, 5] });
  const man = makeHuman('plain'); man.root.rotation.y = -1.05; scene.add(man.root);
  const holder = new THREE.Group(); man.j.rWr.add(holder); holder.position.set(0, -0.07, 0); holder.rotation.x = Math.PI / 2;
  const kt = katana(); kt.rotation.y = Math.PI / 2; holder.add(kt);
  const fwd = V(Math.sin(-1.05), 0, Math.cos(-1.05));           // the way he faces
  const T1 = 0.75, T2 = 4.35;                                   // first bullet (missed), second bullet (split)
  const s1 = streak(0xffe2b0); scene.add(s1);
  const s2 = streak(0xffe2b0); scene.add(s2);
  const sa = streak(0xffc890), sb = streak(0xffc890); scene.add(sa, sb);
  const sp = sparks(120, { speed: 1.8, spread: 1.5, gravity: -5, life: 0.55, size: 0.02, dir: fwd.clone().add(V(0, 0.3, 0)), seed: 6, color: [1, 0.75, 0.35] }); scene.add(sp);
  const gl = glowSprite(0xffd090, 0.2); scene.add(gl);
  const c = cam(38);
  let hitP = V(0, 1.4, 0), nrm = V(0, 0, 1);
  return {
    scene, camera: c,
    update(t) {
      const swing = easeIn(range(t, 1.25, 1.7)), raise = smooth(range(t, 0.95, 1.25));
      const guard = easeInOut(range(t, 2.5, 3.3));
      const flinch = t > T2 ? Math.exp(-(t - T2) * 5) : 0;
      man.setPose({
        ...STAND, drop: -0.03 * swing * (1 - guard) - 0.02 * guard,
        spine: [0.12 * swing * (1 - guard) + 0.03 * guard - 0.05 * flinch, lerp(-0.15, 0.25, swing) * (1 - guard), 0],
        chest: [idle(t) + 0.04 * guard, lerp(-0.1, 0.2, swing) * (1 - guard), 0],
        neck: [0.02, lerp(0.0, 0.25, range(t, 0.8, 1.0)) * (1 - range(t, 1.9, 2.4)), 0], head: [-0.03 - 0.08 * flinch, 0, 0],
        lSh: [0.05, 0, 0.2], lEl: [-0.3 - 0.4 * guard, 0, 0],
        lHip: [-0.18 * guard, 0, 0.1], rHip: [0.14 * guard, 0, -0.1], lKn: [0.2 * guard, 0, 0], rKn: [0.12 * guard, 0, 0],
      });
      man.setMouth(t > 1.75 && t < 2.5 ? 0.8 : (flinch > 0.2 ? 0.6 : 0));
      man.root.updateMatrixWorld(true);
      // sword hand (man local) and blade direction
      const H = kf(t, [[0, [-0.3, 0.98, 0.16]], [0.95, [-0.3, 0.98, 0.16]], [1.25, [-0.28, 1.72, -0.12]], [1.7, [0.0, 1.12, 0.5]], [2.5, [-0.05, 1.05, 0.46]], [3.3, [-0.06, 1.02, 0.46]], [6.2, [-0.06, 1.02, 0.46]]], easeInOut);
      const B = kf(t, [[0, [0.05, -0.75, 0.65]], [0.95, [0.05, -0.75, 0.65]], [1.25, [0.1, 0.75, -0.65]], [1.7, [0.15, -0.35, 0.92]], [2.5, [0.1, -0.2, 0.97]], [3.3, [0, 1, 0.06]], [6.2, [0, 1, 0.06]]], easeInOut);
      ikArm(man, 'r', man.root.localToWorld(V(...H)), man.root.localToWorld(V(-0.7, 1.0, -0.5)), V(...B).applyQuaternion(man.root.quaternion));
      scene.updateMatrixWorld(true);
      if (t >= 3.3) { hitP = kt.localToWorld(V(kt.edgeX(0.36), 0.36, 0)); nrm = V(0, 0, 1).transformDirection(kt.matrixWorld); }
      // bullet 1: passes in front of him long before he moves
      const p1a = V(-4, 1.42, 0.55).addScaledVector(fwd, 0), d1 = fwd.clone().negate();
      const q = range(t, T1 - 0.04, T1 + 0.06);
      const from1 = V(0, 1.86, 0).addScaledVector(fwd, 5).add(V(fwd.z, 0, -fwd.x).multiplyScalar(0.3));
      s1.set(from1.clone().addScaledVector(d1, lerp(0, 9, Math.max(0, q - 0.25))), from1.clone().addScaledVector(d1, lerp(0, 9, q)), 0.004, q > 0 && q < 1 ? 0.9 : 0);
      // bullet 2: straight onto the waiting edge, splits either side of him
      const from2 = hitP.clone().addScaledVector(fwd, 5);
      const q2 = range(t, T2 - 0.04, T2);
      s2.set(from2.clone().lerp(hitP, Math.max(0, q2 - 0.3)), from2.clone().lerp(hitP, q2), 0.004, q2 > 0 && t < T2 + 0.03 ? 0.9 : 0);
      const q3 = range(t, T2, T2 + 0.07), fade = 1 - range(t, T2 + 0.07, T2 + 0.35);
      const oa = hitP.clone().addScaledVector(fwd, -5).addScaledVector(nrm, 3.6).add(V(0, 1.9, 0)), ob = hitP.clone().addScaledVector(fwd, -5).addScaledVector(nrm, -3.6).add(V(0, -0.3, 0));
      sa.set(hitP.clone().lerp(oa, Math.max(0, q3 - 0.5)), hitP.clone().lerp(oa, q3), 0.0035, t > T2 ? 0.85 * fade : 0);
      sb.set(hitP.clone().lerp(ob, Math.max(0, q3 - 0.5)), hitP.clone().lerp(ob, q3), 0.0035, t > T2 ? 0.85 * fade : 0);
      sp.position.copy(hitP); sp.update(t - T2);
      gl.position.copy(hitP); gl.material.opacity = t > T2 ? Math.max(0, 1 - (t - T2) * 4) : 0; gl.scale.setScalar(0.12 + Math.max(0, t - T2) * 0.5);
      const k = easeInOut(range(t, 2.3, 4.0));
      const jolt = t > T2 ? Math.exp(-(t - T2) * 6) * 0.012 * Math.sin((t - T2) * 70) : 0;
      const s = shake(t, 0.5);
      place(c, [lerp(-0.35, -0.75, k) + s[0], lerp(1.2, 1.38, k) + s[1] + jolt, lerp(3.7, 2.5, k)], [lerp(-0.1, -0.3, k), lerp(1.08, 1.3, k), 0.1]);
      return { dof: { focus: c.position.distanceTo(V(-0.1, 1.3, 0.2)), aperture: 0.0015, maxblur: 0.006 }, bloom: 0.55 };
    },
  };
}

export const SHOTS = [
  { start: 0.0, end: 2.4, build: shot1, mb: 3, mbWin: [[0, 0.25]] },
  { start: 2.4, end: 4.6, build: shot2 },
  { start: 4.6, end: 8.55, build: shot3 },
  { start: 8.55, end: 12.5, build: shot4 },
  { start: 12.5, end: 17.25, build: shot5 },
  { start: 17.25, end: 19.5, build: shot6, mb: 3, mbWin: [[0.25, 0.7]] },
  { start: 19.5, end: DURATION + 1, build: shot7, mb: 3, mbWin: [[0.65, 0.9], [1.2, 1.8], [4.28, 4.75]] },
];
