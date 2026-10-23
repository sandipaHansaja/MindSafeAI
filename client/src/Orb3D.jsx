import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { breathPhase } from './breath.js';

/* A calm, dreamy 3D scene: a floating faceted crystal above a pastel stepped pedestal,
   puffy drifting clouds, iridescent pearls and twinkling sparkles. The crystal's glow
   "breathes" on the same 8s cycle as the text label. */

const CRYSTAL_VERT = /* glsl */ `
varying vec3 vView; varying vec3 vWorldPos;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.);
  vView = mv.xyz; vWorldPos = (modelMatrix * vec4(position,1.)).xyz;
  gl_Position = projectionMatrix * mv;
}`;

// Flat-shaded facets (normal from screen-space derivatives) with a violet -> lilac -> pink-white
// gradient, bright edges and a glowing core. Rendered twice (back faces, then front faces).
const CRYSTAL_FRAG = /* glsl */ `
uniform float uTime; uniform float uBreath; uniform float uBack;
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uPale; uniform vec3 uPink;
varying vec3 vView; varying vec3 vWorldPos;
void main(){
  vec3 N = normalize(cross(dFdx(vView), dFdy(vView)));
  if (uBack > .5) N = -N;
  vec3 V = normalize(-vView);
  float ndv = clamp(abs(dot(N,V)),0.,1.);
  float fres = pow(1.-ndv, 2.);
  vec3 L = normalize(vec3(-.4,.8,.6));
  float diff = clamp(dot(N,L)*.5+.5,0.,1.);
  vec3 deep = uDeep; vec3 mid = uMid; vec3 pale = uPale; vec3 pink = uPink;
  vec3 col = mix(deep, mid, diff);
  col = mix(col, pale, fres*.75 + pow(diff,3.)*.35);
  col = mix(col, pink, smoothstep(.55,1.,sin(vWorldPos.y*2.2 + uTime*.4 + N.x*2.)*.5+.5) * .28);
  float spec = pow(clamp(dot(reflect(-L,N),V),0.,1.), 28.);
  col += spec * .9;
  col += (.10 + .22*uBreath) * pale;               // breathing inner glow
  float a = uBack > .5 ? .55 : (.74 + fres*.26);
  gl_FragColor = vec4(col, a);
}`;

const SPARK_VERT = /* glsl */ `
uniform float uTime; uniform float uPx; attribute float aSeed;
varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.);
  gl_Position = projectionMatrix * mv;
  float tw = .5 + .5*sin(uTime*(.8+aSeed*1.6) + aSeed*40.);
  gl_PointSize = uPx * (.35 + aSeed*.9) * (.5+tw) * .1 / -mv.z;
  vA = .25 + .75*tw;
}`;
const SPARK_FRAG = /* glsl */ `
varying float vA;
void main(){
  vec2 p = gl_PointCoord - .5;
  float d = length(p);
  float star = max(0., 1. - d*2.) * .8 + max(0., 1. - abs(p.x)*14.) * max(0., 1.-abs(p.y)*2.2) * .6
             + max(0., 1. - abs(p.y)*14.) * max(0., 1.-abs(p.x)*2.2) * .6;
  gl_FragColor = vec4(1.,.97,1., clamp(star,0.,1.) * vA);
}`;

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(0.35, outer); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function makeCloud(mat, seed) {
  const g = new THREE.Group();
  const puffs = [[0, 0, 0, 0.5], [0.55, -0.06, 0.05, 0.4], [-0.55, -0.08, 0, 0.38], [0.2, 0.28, 0, 0.38], [-0.25, 0.22, 0.05, 0.32], [0.95, -0.12, 0, 0.26], [-0.95, -0.14, 0, 0.24]];
  const geo = new THREE.IcosahedronGeometry(1, 4);
  for (const [x, y, z, r] of puffs) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(r, r * 0.92, r * 0.9); g.add(m);
  }
  g.userData.seed = seed;
  return g;
}

/* ---- theme palettes (crystal colours are raw shader values; hex values are converted to linear) ---- */
const hex = (h) => new THREE.Color(h).toArray();
const COLS = ['deep', 'mid', 'pale', 'pink', 'stone', 'stoneEm', 'shade', 'shadeEm', 'cloud', 'cloudEm', 'sky', 'ground', 'sun', 'rim', 'core', 'moonC'];
const NUMS = ['cloudEmI', 'hemi', 'sunI', 'moon'];
const PALETTES = {
  morning: {
    deep: [0.33, 0.27, 0.92], mid: [0.62, 0.54, 0.99], pale: [0.93, 0.88, 1], pink: [1, 0.76, 0.9],
    stone: 0xf1ecff, stoneEm: 0xe9e1ff, shade: 0xe3dbfb, shadeEm: 0xd7ccff, cloud: 0xffffff, cloudEm: 0xf4efff, cloudEmI: 0.55,
    sky: 0xffffff, ground: 0xd9ccff, hemi: 1.1, sun: 0xfff3ff, sunI: 2.2, rim: 0xb8a6ff, core: 0xa99bff, moonC: 0xfff6d8, moon: 0,
  },
  evening: {
    deep: [0.62, 0.14, 0.46], mid: [0.93, 0.38, 0.45], pale: [1, 0.86, 0.78], pink: [1, 0.6, 0.55],
    stone: 0xffe6d6, stoneEm: 0xffd2b8, shade: 0xf7cfc2, shadeEm: 0xf0b9a8, cloud: 0xffeee4, cloudEm: 0xffc9a8, cloudEmI: 0.6,
    sky: 0xfff0e0, ground: 0xffb59a, hemi: 1.15, sun: 0xffd2a8, sunI: 2.4, rim: 0xff9fc0, core: 0xff9a7a, moonC: 0xfff6d8, moon: 0,
  },
  night: {
    deep: [0.16, 0.18, 0.62], mid: [0.36, 0.4, 0.92], pale: [0.7, 0.75, 1], pink: [0.62, 0.5, 1],
    stone: 0x4a5096, stoneEm: 0x2c3280, shade: 0x383d80, shadeEm: 0x222870, cloud: 0x9aa2e6, cloudEm: 0x4a52a8, cloudEmI: 0.45,
    sky: 0x93a3ff, ground: 0x1a1c4a, hemi: 0.75, sun: 0xa8b6ff, sunI: 1.1, rim: 0x8a7bff, core: 0x7b8cff, moonC: 0xfff3c8, moon: 1,
  },
};
const prep = (p) => { const o = {}; COLS.forEach((k) => { o[k] = typeof p[k] === 'number' ? hex(p[k]) : [...p[k]]; }); NUMS.forEach((k) => { o[k] = p[k]; }); return o; };
const lerpInto = (cur, tgt, k) => {
  let moving = false;
  COLS.forEach((key) => cur[key].forEach((v, i) => { const d = tgt[key][i] - v; if (Math.abs(d) > 0.0005) { cur[key][i] = v + d * k; moving = true; } else cur[key][i] = tgt[key][i]; }));
  NUMS.forEach((key) => { const d = tgt[key] - cur[key]; if (Math.abs(d) > 0.0005) { cur[key] += d * k; moving = true; } else cur[key] = tgt[key]; });
  return moving;
};

export default function Orb3D({ reduceMotion, theme = 'morning' }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const mount = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return undefined; // no WebGL: the CSS fallback underneath stays visible
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
    camera.position.set(0, 0.35, 9.4);
    camera.lookAt(0, -0.05, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xd9ccff, 1.1); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3ff, 2.2); sun.position.set(-3, 5, 5); scene.add(sun);
    const rim = new THREE.DirectionalLight(0xb8a6ff, 1.4); rim.position.set(4, 2, -3); scene.add(rim);
    const coreLight = new THREE.PointLight(0xa99bff, 6, 7, 1.6); coreLight.position.set(0, 0.85, 0.6); scene.add(coreLight);

    const root = new THREE.Group(); scene.add(root);
    const disposables = [envTex];
    const track = (o) => { disposables.push(o); return o; };

    /* --- pedestal --- */
    const stoneMat = track(new THREE.MeshStandardMaterial({ color: 0xf1ecff, roughness: 0.55, metalness: 0.0, emissive: 0xe9e1ff, emissiveIntensity: 0.18 }));
    const stoneShade = track(new THREE.MeshStandardMaterial({ color: 0xe3dbfb, roughness: 0.6, emissive: 0xd7ccff, emissiveIntensity: 0.15 }));
    const box = (w, h, d, x, y, z, mat) => {
      const m = new THREE.Mesh(track(new RoundedBoxGeometry(w, h, d, 6, Math.min(w, h, d) * 0.14)), mat);
      m.position.set(x, y, z); root.add(m); return m;
    };
    box(3.5, 0.34, 2.3, 0, -2.2, 0, stoneShade);        // base slab
    box(1.5, 1.35, 1.35, 0.35, -1.36, -0.05, stoneMat); // pillar
    box(1.05, 0.42, 1.15, -0.98, -1.84, 0.1, stoneMat); // step
    box(0.7, 0.78, 0.95, 1.35, -1.64, 0.05, stoneShade); // side block
    const pillarTopY = -1.36 + 1.35 / 2;

    const glowTex = track(glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,.5)'));
    const topGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }));
    topGlow.scale.set(2.6, 1.1, 1); topGlow.position.set(0.35, pillarTopY + 0.05, 0.2); root.add(topGlow);

    /* --- floating crystal --- */
    const profile = [[0.001, -1.08], [0.44, -0.5], [0.52, 0.32], [0.001, 1.1]].map(([x, y]) => new THREE.Vector2(x, y));
    const cGeo = track(new THREE.LatheGeometry(profile, 6));
    const shared = { uDeep: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uPale: { value: new THREE.Color() }, uPink: { value: new THREE.Color() } };
    const mk = (back) => track(new THREE.ShaderMaterial({
      vertexShader: CRYSTAL_VERT, fragmentShader: CRYSTAL_FRAG, transparent: true, depthWrite: !!back ? false : true,
      side: back ? THREE.BackSide : THREE.FrontSide,
      uniforms: { uTime: { value: 0 }, uBreath: { value: 0 }, uBack: { value: back ? 1 : 0 }, ...shared },
    }));
    const backMat = mk(true); const frontMat = mk(false);
    const crystal = new THREE.Group();
    const cBack = new THREE.Mesh(cGeo, backMat); cBack.renderOrder = 1;
    const cFront = new THREE.Mesh(cGeo, frontMat); cFront.renderOrder = 2;
    crystal.add(cBack, cFront);
    crystal.position.set(0.35, 0.82, 0); crystal.scale.setScalar(0.98);
    root.add(crystal);

    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }));
    coreGlow.scale.set(2.4, 2.4, 1); coreGlow.position.copy(crystal.position); coreGlow.renderOrder = 3; root.add(coreGlow);

    /* --- soft clouds --- */
    const cloudMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xf4efff, emissiveIntensity: 0.55 }));
    const clouds = [
      { x: -2.0, y: 1.55, z: 0.4, s: 0.85, seed: 0 },
      { x: 2.05, y: 0.75, z: -0.4, s: 0.7, seed: 1.7 },
      { x: -1.75, y: -0.65, z: 0.9, s: 0.62, seed: 3.1 },
      { x: 1.5, y: -2.05, z: 1.1, s: 0.55, seed: 4.6 },
    ].map((c) => {
      const g = makeCloud(cloudMat, c.seed); g.position.set(c.x, c.y, c.z); g.scale.setScalar(c.s);
      g.userData.base = new THREE.Vector3(c.x, c.y, c.z); root.add(g); return g;
    });

    /* --- iridescent pearls --- */
    const pearlColors = [0xffc2d9, 0xbfe9ff, 0xcfc2ff, 0xffe0c2, 0xc4f2e2];
    const pearls = pearlColors.map((col, i) => {
      const m = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.13 + (i % 3) * 0.05, 40, 24)),
        track(new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 1, iridescenceIOR: 1.6, envMapIntensity: 1.6 }))
      );
      m.userData = { a: (i / pearlColors.length) * Math.PI * 2, r: 1.5 + (i % 2) * 0.45, y: -0.2 + i * 0.4, sp: 0.1 + i * 0.025 };
      root.add(m); return m;
    });

    /* --- sparkles --- */
    const SP = 70; const sp = new Float32Array(SP * 3); const ss = new Float32Array(SP);
    for (let i = 0; i < SP; i++) {
      sp.set([(Math.random() - 0.5) * 5.4, (Math.random() - 0.35) * 4.6, (Math.random() - 0.3) * 2.6], i * 3); ss[i] = Math.random();
    }
    const spGeo = track(new THREE.BufferGeometry());
    spGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); spGeo.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    const spMat = track(new THREE.ShaderMaterial({
      vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: 300 * dpr } },
    }));
    const sparkles = new THREE.Points(spGeo, spMat); sparkles.frustumCulled = false; root.add(sparkles);

    /* --- moon (fades in at night) --- */
    const moonMat = track(new THREE.MeshBasicMaterial({ color: 0xfff3c8, transparent: true, opacity: 0, toneMapped: false }));
    const moon = new THREE.Mesh(track(new THREE.SphereGeometry(0.3, 40, 24)), moonMat);
    moon.position.set(2.0, 2.0, -1.4); root.add(moon);
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    moonGlow.scale.set(2.4, 2.4, 1); moonGlow.position.copy(moon.position); root.add(moonGlow);

    /* --- theme: smooth cross-fade between palettes --- */
    let target = prep(PALETTES[themeRef.current] || PALETTES.morning);
    const cur = prep(PALETTES[themeRef.current] || PALETTES.morning);
    const setRGB = (c, a) => c.setRGB(a[0], a[1], a[2]);
    const applyTheme = () => {
      setRGB(shared.uDeep.value, cur.deep); setRGB(shared.uMid.value, cur.mid); setRGB(shared.uPale.value, cur.pale); setRGB(shared.uPink.value, cur.pink);
      setRGB(stoneMat.color, cur.stone); setRGB(stoneMat.emissive, cur.stoneEm);
      setRGB(stoneShade.color, cur.shade); setRGB(stoneShade.emissive, cur.shadeEm);
      setRGB(cloudMat.color, cur.cloud); setRGB(cloudMat.emissive, cur.cloudEm); cloudMat.emissiveIntensity = cur.cloudEmI;
      setRGB(hemi.color, cur.sky); setRGB(hemi.groundColor, cur.ground); hemi.intensity = cur.hemi;
      setRGB(sun.color, cur.sun); sun.intensity = cur.sunI; setRGB(rim.color, cur.rim);
      setRGB(coreLight.color, cur.core); setRGB(coreGlow.material.color, cur.core); setRGB(topGlow.material.color, cur.core);
      setRGB(moonMat.color, cur.moonC); setRGB(moonGlow.material.color, cur.moonC);
      moonMat.opacity = cur.moon; moonGlow.material.opacity = cur.moon * 0.55; moon.visible = moonGlow.visible = cur.moon > 0.01;
    };
    applyTheme();
    apiRef.current = {
      setTheme(name) {
        target = prep(PALETTES[name] || PALETTES.morning);
        if (reduceMotion) { Object.assign(cur, prep(PALETTES[name] || PALETTES.morning)); applyTheme(); renderer.render(scene, camera); }
      },
    };

    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e) => {
      const r = mount.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1.5, 1.5);
      pointer.y = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1.5, 1.5);
    };
    if (!reduceMotion) window.addEventListener('pointermove', onMove, { passive: true });

    const resize = () => {
      const w = mount.clientWidth || 300; const h = mount.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.95 ? 35 / Math.max(w / h, 0.7) : 35;
      camera.updateProjectionMatrix();
      spMat.uniforms.uPx.value = h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(mount);

    let raf = 0; let running = true; let visible = true;
    const t0 = performance.now();
    const frame = () => {
      if (!running) return;
      const time = reduceMotion ? 2.0 : (performance.now() - t0) / 1000;
      const breath = 0.5 - 0.5 * Math.cos(breathPhase() * Math.PI * 2);
      if (lerpInto(cur, target, 0.045)) applyTheme();
      moon.position.y = 2.0 + Math.sin(time * 0.3) * 0.06; moonGlow.position.y = moon.position.y;

      // crystal: slow turn + gentle float, glow & size follow the breath
      crystal.rotation.y = time * 0.35 + pointer.sx * 0.5;
      crystal.rotation.z = Math.sin(time * 0.5) * 0.04;
      crystal.position.y = 0.82 + Math.sin(time * 0.9) * 0.12 + breath * 0.06;
      coreGlow.position.y = crystal.position.y;
      coreLight.position.y = crystal.position.y;
      const cs = 0.96 + breath * 0.05; crystal.scale.setScalar(cs);
      coreGlow.material.opacity = 0.55 + breath * 0.4;
      coreGlow.scale.setScalar(2.1 + breath * 0.9);
      coreLight.intensity = 4 + breath * 5;
      topGlow.material.opacity = 0.55 + breath * 0.35;
      frontMat.uniforms.uTime.value = backMat.uniforms.uTime.value = time;
      frontMat.uniforms.uBreath.value = backMat.uniforms.uBreath.value = breath;

      clouds.forEach((c, i) => {
        const b = c.userData.base; const s = c.userData.seed;
        c.position.x = b.x + Math.sin(time * 0.12 + s) * 0.35;
        c.position.y = b.y + Math.sin(time * 0.35 + s * 2) * 0.1;
        c.position.z = b.z + pointer.sx * 0.15 * (i % 2 ? -1 : 1);
      });
      pearls.forEach((p) => {
        const u = p.userData; const a = u.a + time * u.sp;
        p.position.set(0.35 + Math.cos(a) * u.r, u.y + Math.sin(time * 0.7 + u.a) * 0.18, Math.sin(a) * u.r * 0.6 + 0.3);
      });
      spMat.uniforms.uTime.value = time;

      // smooth parallax toward the pointer
      pointer.sx += (pointer.x - pointer.sx) * 0.06; pointer.sy += (pointer.y - pointer.sy) * 0.06;
      root.rotation.y = pointer.sx * 0.28; root.rotation.x = pointer.sy * 0.07;

      renderer.render(scene, camera);
      if (!reduceMotion && visible) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && running && !reduceMotion) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    });
    io.observe(mount);
    const onVis = () => { if (!document.hidden && visible && running && !reduceMotion) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', onVis);
    frame();

    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect(); io.disconnect();
      disposables.forEach((d) => d.dispose?.());
      apiRef.current = null; glowTex.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [reduceMotion]);

  useEffect(() => { apiRef.current?.setTheme(theme); }, [theme]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
