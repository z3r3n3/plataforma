/* =========================================================
   SÓLIDOS GEOMÉTRICOS — simulador 3D para a aula
   (planificação animada, elementos, áreas e volumes, desafio)
   ========================================================= */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fmt = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('pt-BR', {maximumFractionDigits: d});
const PI_ESC = 3.14;                                   // π usado nas contas (como na escola)
const POL = {3:'triângulo', 4:'quadrado', 5:'pentágono', 6:'hexágono', 7:'heptágono', 8:'octógono'};
const POL_PL = {3:'triângulos', 4:'quadrados', 5:'pentágonos', 6:'hexágonos', 7:'heptágonos', 8:'octógonos'};
const ADJ = {3:'triangular', 4:'quadrangular', 5:'pentagonal', 6:'hexagonal', 7:'heptagonal', 8:'octogonal'};
const COR = {base:'#F2C14E', lat:'#2E9E8F', curva:'#5B8DEF'};
const CORN = {base:0xF2C14E, lat:0x2E9E8F, curva:0x5B8DEF};

/* ---------------- catálogo ---------------- */
const TIPOS = {
  cubo:     {grupo:'poli', params:[['a','Aresta (a)',1,10,4]]},
  para:     {grupo:'poli', params:[['c','Comprimento (c)',1,10,6],['l','Largura (l)',1,10,3],['h','Altura (h)',1,10,4]]},
  prisma:   {grupo:'poli', params:[['n','Lados da base (n)',3,8,3],['l','Aresta da base (l)',1,8,4],['h','Altura (h)',1,10,6]]},
  piramide: {grupo:'poli', params:[['n','Lados da base (n)',3,8,4],['l','Aresta da base (l)',1,8,4],['h','Altura (h)',1,10,5]]},
  cilindro: {grupo:'red',  params:[['r','Raio da base (r)',1,6,3],['h','Altura (h)',1,10,6]]},
  cone:     {grupo:'red',  params:[['r','Raio da base (r)',1,6,3],['h','Altura (h)',1,10,6]]},
  esfera:   {grupo:'red',  params:[['r','Raio (r)',1,6,3]]},
};
const ICONES = {
  cubo:'<path d="M8 12 20 6l12 6v14l-12 6-12-6z" fill="#F2C14E66" stroke="#14532D" stroke-width="2" stroke-linejoin="round"/><path d="M8 12l12 6 12-6M20 18v14" stroke="#14532D" stroke-width="2" fill="none"/>',
  para:'<path d="M4 14 14 9l22 5v12l-10 5-22-5z" fill="#F2C14E66" stroke="#14532D" stroke-width="2" stroke-linejoin="round"/><path d="M4 14l22 5 10-5M26 19v12" stroke="#14532D" stroke-width="2" fill="none"/>',
  prisma:'<path d="M8 30V14l8-8 8 8v16l-8 4z" fill="#2E9E8F44" stroke="#14532D" stroke-width="2" stroke-linejoin="round"/><path d="M16 6v24M8 14h16" stroke="#14532D" stroke-width="2" fill="none"/>',
  piramide:'<path d="M20 4 6 28l14 6 14-6z" fill="#2E9E8F44" stroke="#14532D" stroke-width="2" stroke-linejoin="round"/><path d="M20 4v30" stroke="#14532D" stroke-width="2"/>',
  cilindro:'<ellipse cx="20" cy="9" rx="11" ry="4" fill="#5B8DEF44" stroke="#14532D" stroke-width="2"/><path d="M9 9v22c0 2 5 4 11 4s11-2 11-4V9" fill="#5B8DEF33" stroke="#14532D" stroke-width="2"/>',
  cone:'<path d="M20 4 8 30c0 2 5 4 12 4s12-2 12-4z" fill="#5B8DEF44" stroke="#14532D" stroke-width="2" stroke-linejoin="round"/>',
  esfera:'<circle cx="20" cy="20" r="14" fill="#5B8DEF44" stroke="#14532D" stroke-width="2"/><ellipse cx="20" cy="20" rx="14" ry="5" fill="none" stroke="#14532D" stroke-width="1.5" stroke-dasharray="3 3"/>',
};

function spec(tipo, P){
  const s = {tipo, P:{...P}};
  if (tipo === 'cubo') s.nome = 'Cubo';
  if (tipo === 'para') s.nome = 'Paralelepípedo';
  if (tipo === 'prisma') s.nome = 'Prisma ' + ADJ[P.n];
  if (tipo === 'piramide') s.nome = 'Pirâmide ' + ADJ[P.n];
  if (tipo === 'cilindro') s.nome = 'Cilindro';
  if (tipo === 'cone') s.nome = 'Cone';
  if (tipo === 'esfera') s.nome = 'Esfera';
  s.poli = TIPOS[tipo].grupo === 'poli';
  return s;
}
const padrao = tipo => Object.fromEntries(TIPOS[tipo].params.map(p => [p[0], p[4]]));

/* polígono da base (x, z), com a 1ª aresta virada para a frente (+z) */
function basePoligono(sp){
  const P = sp.P;
  if (sp.tipo === 'cubo') { const a = P.a / 2; return [[-a, a], [a, a], [a, -a], [-a, -a]]; }
  if (sp.tipo === 'para') { const c = P.c / 2, l = P.l / 2; return [[-c, l], [c, l], [c, -l], [-c, -l]]; }
  const n = P.n, R = P.l / (2 * Math.sin(PI / n)), pts = [];
  for (let k = 0; k < n; k++){ const f = PI / 2 + PI / n - 2 * PI * k / n; pts.push([R * Math.cos(f), R * Math.sin(f)]); }
  return pts;
}

/* ---------------- números de cada sólido ---------------- */
function medidas(sp){
  const P = sp.P, M = {};
  if (sp.tipo === 'cubo'){ const a = P.a; Object.assign(M, {Ab:a*a, Al:4*a*a, At:6*a*a, V:a**3, d:a*Math.sqrt(3), F:6, Vt:8, A:12}); }
  if (sp.tipo === 'para'){ const {c, l, h} = P; Object.assign(M, {Ab:c*l, Al:2*(c*h + l*h), At:2*(c*l + c*h + l*h), V:c*l*h, d:Math.sqrt(c*c + l*l + h*h), F:6, Vt:8, A:12}); }
  if (sp.tipo === 'prisma' || sp.tipo === 'piramide'){
    const {n, l, h} = P, ap = l / (2 * Math.tan(PI / n)), R = l / (2 * Math.sin(PI / n)), Ab = n * l * ap / 2;
    Object.assign(M, {ap, R, Ab, per:n * l});
    if (sp.tipo === 'prisma') Object.assign(M, {Al:n * l * h, At:2 * Ab + n * l * h, V:Ab * h, F:n + 2, Vt:2 * n, A:3 * n});
    else { const g = Math.hypot(h, ap), al = Math.hypot(h, R); Object.assign(M, {g, al, Al:n * l * g / 2, At:Ab + n * l * g / 2, V:Ab * h / 3, F:n + 1, Vt:n + 1, A:2 * n}); }
  }
  if (sp.tipo === 'cilindro'){ const {r, h} = P; Object.assign(M, {Ab:r*r, Al:2*r*h, At:2*r*r + 2*r*h, V:r*r*h, comp:2*r}); }   // coeficientes de π
  if (sp.tipo === 'cone'){ const {r, h} = P, g = Math.hypot(r, h); Object.assign(M, {g, Ab:r*r, Al:r*g, At:r*r + r*g, V:r*r*h/3, ang:360 * r / g}); }
  if (sp.tipo === 'esfera'){ const {r} = P; Object.assign(M, {A:4*r*r, V:4*r**3/3}); }
  return M;
}

/* =========================================================
   CENA 3D
   ========================================================= */
const cena = $('#cena');
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
cena.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.12;
scene.add(new THREE.HemisphereLight(0xffffff, 0xC9C1AF, 0.85));
const sol = new THREE.DirectionalLight(0xffffff, 0.55); sol.position.set(6, 12, 8); scene.add(sol);
const sol2 = new THREE.DirectionalLight(0xffffff, 0.25); sol2.position.set(-8, 4, -6); scene.add(sol2);

const matFace = {}; ['base','lat','curva'].forEach(k => matFace[k] = new THREE.MeshStandardMaterial({color:CORN[k], side:THREE.DoubleSide, roughness:.65, metalness:0, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1, transparent:true, opacity:1}));
const matLinha = new THREE.LineBasicMaterial({color:0x1C2A22});
const matTrac = new THREE.LineDashedMaterial({color:0x9A3412, dashSize:.25, gapSize:.15});
const matMed = new THREE.LineBasicMaterial({color:0x9A3412});
const matVert = new THREE.MeshStandardMaterial({color:0x9A3412});
const matCubos = new THREE.LineBasicMaterial({color:0x14532D, transparent:true, opacity:.35});

function faceObj(pts, tipo){
  const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(PI / 2);
  const o = new THREE.Group();
  o.add(new THREE.Mesh(g, matFace[tipo]));
  const ln = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p => V3(p[0], 0, p[1]))), matLinha); ln.userData.aresta = 1;
  o.add(ln);
  o.userData = {pts, tipo};
  return o;
}
function rotulo(txt, escala){
  const c = document.createElement('canvas'), x = c.getContext('2d'), f = 44;
  x.font = `700 ${f}px Atkinson Hyperlegible, Segoe UI, sans-serif`;
  const w = Math.ceil(x.measureText(txt).width) + 28; c.width = w; c.height = f + 22;
  x.font = `700 ${f}px Atkinson Hyperlegible, Segoe UI, sans-serif`;
  x.fillStyle = 'rgba(255,255,255,.92)'; x.strokeStyle = '#9A3412'; x.lineWidth = 4;
  const rr = 16; x.beginPath(); x.moveTo(rr, 2); x.arcTo(w - 2, 2, w - 2, c.height - 2, rr); x.arcTo(w - 2, c.height - 2, 2, c.height - 2, rr); x.arcTo(2, c.height - 2, 2, 2, rr); x.arcTo(2, 2, w - 2, 2, rr); x.fill(); x.stroke();
  x.fillStyle = '#9A3412'; x.textBaseline = 'middle'; x.fillText(txt, 14, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t, depthTest:false, transparent:true}));
  s.renderOrder = 10; const k = escala * 0.5; s.scale.set(k * w / c.height, k, 1);
  return s;
}
function linha(a, b, trac){ const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), trac ? matTrac : matMed); if (trac) l.computeLineDistances(); l.renderOrder = 5; return l; }
function bolinhas(pts, esc){ const g = new THREE.Group(), geo = new THREE.SphereGeometry(0.07 * esc, 16, 12); pts.forEach(p => { const m = new THREE.Mesh(geo, matVert); m.position.copy(p); g.add(m); }); return g; }

/* ----- poliedros com dobradiças ----- */
function modeloPoliedro(sp){
  const base = basePoligono(sp), P = sp.P, h = sp.tipo === 'cubo' ? P.a : P.h, piramide = sp.tipo === 'piramide';
  const n = base.length, cx = base.reduce((s, p) => s + p[0], 0) / n, cz = base.reduce((s, p) => s + p[1], 0) / n;
  const root = new THREE.Group(), dob = [];
  root.add(faceObj(base, 'base'));
  for (let k = 0; k < n; k++){
    let A = base[k], B = base[(k + 1) % n];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    let u = [(B[0] - A[0]) / len, (B[1] - A[1]) / len], nn = [u[1], -u[0]];
    const mx = (A[0] + B[0]) / 2 - cx, mz = (A[1] + B[1]) / 2 - cz;
    if (nn[0] * mx + nn[1] * mz < 0) nn = [-nn[0], -nn[1]];
    let X = V3(u[0], 0, u[1]); const Z = V3(nn[0], 0, nn[1]);
    let Y = new THREE.Vector3().crossVectors(Z, X);
    if (Y.y < 0){ [A, B] = [B, A]; u = [-u[0], -u[1]]; X = V3(u[0], 0, u[1]); Y = new THREE.Vector3().crossVectors(Z, X); }
    const ap = nn[0] * mx + nn[1] * mz;
    const piv = new THREE.Object3D(); piv.position.set(A[0], 0, A[1]);
    piv.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const gira = new THREE.Object3D(); piv.add(gira); root.add(piv);
    if (piramide){
      const g = Math.hypot(h, ap);
      gira.add(faceObj([[0, 0], [len, 0], [len / 2, g]], 'lat'));
      dob.push({o:gira, ang:PI - Math.atan2(h, ap), fase:0});
    } else {
      gira.add(faceObj([[0, 0], [len, 0], [len, h], [0, h]], 'lat'));
      dob.push({o:gira, ang:PI / 2, fase:0});
      if (k === 0){
        const p2 = new THREE.Object3D(); p2.position.set(0, 0, h); gira.add(p2);
        const g2 = new THREE.Object3D(); p2.add(g2);
        g2.add(faceObj(base.map(p => { const dx = p[0] - A[0], dz = p[1] - A[1]; return [dx * u[0] + dz * u[1], -(dx * nn[0] + dz * nn[1])]; }), 'base'));
        dob.push({o:g2, ang:PI / 2, fase:1});
      }
    }
  }
  const tam = Math.max(h, ...base.map(p => Math.hypot(p[0], p[1]) * 2));
  /* elementos no sólido fechado */
  const verts = base.map(p => V3(p[0], 0, p[1]));
  if (piramide) verts.push(V3(cx, h, cz)); else base.forEach(p => verts.push(V3(p[0], h, p[1])));
  const esc = tam / 6;
  const med = new THREE.Group();
  const lab = (t, p) => { const s = rotulo(t, esc); s.position.copy(p); med.add(s); };
  const f0 = V3((base[0][0] + base[1][0]) / 2, 0, (base[0][1] + base[1][1]) / 2), fora = f0.clone().setY(0).normalize();
  if (sp.tipo === 'para'){
    lab(`c = ${P.c} cm`, f0.clone().addScaledVector(fora, .55 * esc));
    const ld = V3(base[1][0], 0, 0); lab(`l = ${P.l} cm`, ld.clone().add(V3(.65 * esc, 0, 0)));
    lab(`h = ${P.h} cm`, V3(base[1][0], h / 2, base[1][1]).add(V3(.55 * esc, 0, .35 * esc)));
  } else if (piramide){
    lab(`l = ${P.l} cm`, f0.clone().addScaledVector(fora, .55 * esc));
    med.add(linha(V3(cx, 0, cz), V3(cx, h, cz), true)); lab(`h = ${P.h} cm`, V3(cx + .2 * esc, h * .5, cz));
    med.add(linha(V3(cx, 0, cz), f0, true));
    med.add(linha(f0, V3(cx, h, cz), false)); lab(`g ≈ ${fmt(medidas(sp).g, 1)}`, f0.clone().lerp(V3(cx, h, cz), .5).addScaledVector(fora, .5 * esc));
  } else {
    const la = sp.tipo === 'cubo' ? 'a' : 'l', lv = sp.tipo === 'cubo' ? P.a : P.l;
    lab(`${la} = ${lv} cm`, f0.clone().addScaledVector(fora, .55 * esc));
    const hv = V3(base[1][0], h / 2, base[1][1]), fo = V3(base[1][0], 0, base[1][1]).normalize();
    lab(`${sp.tipo === 'cubo' ? 'a' : 'h'} = ${h} cm`, hv.addScaledVector(fo, .6 * esc));
  }
  /* cubinhos de 1 cm³ */
  let cubos = null;
  if (sp.tipo === 'cubo' || sp.tipo === 'para'){
    const c = sp.tipo === 'cubo' ? P.a : P.c, l = sp.tipo === 'cubo' ? P.a : P.l, pts = [];
    for (let i = 0; i <= c; i++) for (let j = 0; j <= h; j++){ pts.push(V3(-c/2 + i, j, -l/2), V3(-c/2 + i, j, l/2)); }
    for (let i = 0; i <= c; i++) for (let k = 0; k <= l; k++){ pts.push(V3(-c/2 + i, 0, -l/2 + k), V3(-c/2 + i, h, -l/2 + k)); }
    for (let j = 0; j <= h; j++) for (let k = 0; k <= l; k++){ pts.push(V3(-c/2, j, -l/2 + k), V3(c/2, j, -l/2 + k)); }
    cubos = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), matCubos);
  }
  const atualizar = t => {
    const t1 = Math.min(1, t / 0.75), t2 = Math.max(0, (t - 0.55) / 0.45);
    dob.forEach(d => { const tt = d.fase ? t2 : t1; d.o.rotation.x = -(1 - tt) * d.ang; });
  };
  return {root, atualizar, verts, med, cubos, tam, centro:V3(cx, h / 2, cz)};
}

/* ----- corpos redondos ----- */
function malha(S, linhas){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((S + 1) * linhas * 3), 3));
  const idx = [];
  for (let j = 0; j < linhas - 1; j++) for (let i = 0; i < S; i++){ const a = j * (S + 1) + i, b = a + 1, c = a + S + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  g.setIndex(idx); return g;
}
function disco(r, tipo){
  const o = new THREE.Group(), g = new THREE.CircleGeometry(r, 72); g.rotateX(PI / 2);
  o.add(new THREE.Mesh(g, matFace[tipo]));
  const pts = []; for (let i = 0; i <= 72; i++){ const a = 2 * PI * i / 72; pts.push(V3(r * Math.cos(a), 0, r * Math.sin(a))); }
  const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matLinha); ln.userData.aresta = 1; o.add(ln);
  return o;
}
function modeloCilindro(sp){
  const {r, h} = sp.P, S = 96, L = 2 * PI * r, root = new THREE.Group();
  const geo = malha(S, 2), lat = new THREE.Mesh(geo, matFace.curva); root.add(lat);
  const bordaB = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:S + 1}, () => V3(0, 0, 0))), matLinha);
  const bordaT = bordaB.clone(); bordaT.geometry = bordaB.geometry.clone();
  const costura = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V3(), V3(), V3(), V3()]), matLinha);
  [bordaB, bordaT, costura].forEach(x => { x.userData.aresta = 1; root.add(x); });
  const pT = new THREE.Object3D(); pT.position.set(0, h, r); const dT = disco(r, 'base'); dT.position.set(0, 0, -r); pT.add(dT); root.add(pT);
  const pB = new THREE.Object3D(); pB.position.set(0, 0, r); const dB = disco(r, 'base'); dB.position.set(0, 0, -r); pB.add(dB); root.add(pB);
  const esc = Math.max(r * 2, h) / 6, med = new THREE.Group();
  med.add(linha(V3(0, 0, 0), V3(0, h, 0), true)); med.add(linha(V3(0, h, 0), V3(r, h, 0), false));
  const lab = (t, p) => { const s = rotulo(t, esc); s.position.copy(p); med.add(s); };
  lab(`h = ${h} cm`, V3(-.2 * esc, h / 2, 0)); lab(`r = ${r} cm`, V3(r / 2, h + .35 * esc, 0));
  const atualizar = t => {
    const k = (1 - t) / r, pos = geo.attributes.position, b = bordaB.geometry.attributes.position, tp = bordaT.geometry.attributes.position;
    for (let i = 0; i <= S; i++){
      const s = -L / 2 + L * i / S; let x, z;
      if (k < 1e-5){ x = s; z = r; } else { x = Math.sin(k * s) / k; z = r - (1 - Math.cos(k * s)) / k; }
      pos.setXYZ(i, x, 0, z); pos.setXYZ(S + 1 + i, x, h, z); b.setXYZ(i, x, 0, z); tp.setXYZ(i, x, h, z);
    }
    const c = costura.geometry.attributes.position;
    c.setXYZ(0, pos.getX(0), 0, pos.getZ(0)); c.setXYZ(1, pos.getX(0), h, pos.getZ(0)); c.setXYZ(2, pos.getX(S), 0, pos.getZ(S)); c.setXYZ(3, pos.getX(S), h, pos.getZ(S));
    [pos, b, tp, c].forEach(a => a.needsUpdate = true); geo.computeVertexNormals(); geo.computeBoundingSphere();
    [bordaB, bordaT, costura].forEach(x => x.geometry.computeBoundingSphere());
    pT.rotation.x = t * PI / 2; pB.rotation.x = -t * PI / 2;
  };
  return {root, atualizar, verts:[], med, tam:Math.max(2 * r, h), centro:V3(0, h / 2, 0)};
}
function modeloCone(sp){
  const {r, h} = sp.P, g = Math.hypot(r, h), S = 96, gira = new THREE.Group(), root = new THREE.Group();
  const F = V3(0, 0, r), A = V3(0, h, 0), e = V3(0, -h, r).divideScalar(g), m = V3(0, -r, -h).divideScalar(g);
  gira.position.copy(F); root.position.copy(F).multiplyScalar(-1); gira.add(root);
  const geo = malha(S, 2), lat = new THREE.Mesh(geo, matFace.curva); root.add(lat);
  const borda = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:S + 1}, () => V3())), matLinha);
  const costura = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V3(), V3(), V3(), V3()]), matLinha);
  [borda, costura].forEach(x => { x.userData.aresta = 1; root.add(x); });
  const pB = new THREE.Object3D(); pB.position.copy(F); const dB = disco(r, 'base'); dB.position.set(0, 0, -r); pB.add(dB); root.add(pB);
  const aF = Math.atan2(-h, -r), gam = Math.atan2(r, h);
  const esc = Math.max(r * 2, h) / 6, med = new THREE.Group();
  med.add(linha(V3(0, 0, 0), A, true)); med.add(linha(V3(0, 0, 0), V3(r, 0, 0), false)); med.add(linha(A, F, false));
  const lab = (t, p) => { const s = rotulo(t, esc); s.position.copy(p); med.add(s); };
  lab(`h = ${h} cm`, V3(-.25 * esc, h / 2, 0)); lab(`r = ${r} cm`, V3(r / 2, -.35 * esc, 0)); lab(`g ≈ ${fmt(g, 1)} cm`, A.clone().lerp(F, .5).add(V3(0, .15 * esc, .45 * esc)));
  const atualizar = t => {
    const rho = r + (g - r) * t, sb = Math.min(1, rho / g), cb = Math.sqrt(Math.max(0, 1 - sb * sb));
    const a = e.clone().multiplyScalar(cb).addScaledVector(m, sb);
    const w0 = e.clone().addScaledVector(a, -cb).divideScalar(sb);
    const b = new THREE.Vector3().crossVectors(w0, a);
    const pos = geo.attributes.position, bo = borda.geometry.attributes.position;
    for (let i = 0; i <= S; i++){
      const s = -PI * r + 2 * PI * r * i / S, f = s / rho;
      const d = a.clone().multiplyScalar(cb).addScaledVector(w0, sb * Math.cos(f)).addScaledVector(b, sb * Math.sin(f));
      const p = A.clone().addScaledVector(d, g);
      pos.setXYZ(i, A.x, A.y, A.z); pos.setXYZ(S + 1 + i, p.x, p.y, p.z); bo.setXYZ(i, p.x, p.y, p.z);
    }
    const c = costura.geometry.attributes.position;
    c.setXYZ(0, A.x, A.y, A.z); c.setXYZ(1, pos.getX(S + 1), pos.getY(S + 1), pos.getZ(S + 1)); c.setXYZ(2, A.x, A.y, A.z); c.setXYZ(3, pos.getX(2 * S + 1), pos.getY(2 * S + 1), pos.getZ(2 * S + 1));
    [pos, bo, c].forEach(x => x.needsUpdate = true); geo.computeVertexNormals(); geo.computeBoundingSphere();
    [borda, costura].forEach(x => x.geometry.computeBoundingSphere());
    pB.rotation.x = t * aF; gira.rotation.x = t * gam;
  };
  const casca = new THREE.Group(); casca.add(gira);
  return {root:casca, atualizar, verts:[A], med, tam:Math.max(2 * r, h), centro:V3(0, h / 2, 0)};
}
function modeloEsfera(sp){
  const {r} = sp.P, root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), matFace.curva));
  const eq = []; for (let i = 0; i <= 96; i++){ const a = 2 * PI * i / 96; eq.push(V3(r * Math.cos(a), 0, r * Math.sin(a))); }
  const l1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(eq), matTrac); l1.computeLineDistances(); root.add(l1);
  const med = new THREE.Group(), esc = 2 * r / 6;
  med.add(linha(V3(0, 0, 0), V3(r, 0, 0), false));
  const c = new THREE.Mesh(new THREE.SphereGeometry(.07 * esc, 16, 12), matVert); med.add(c);
  const s = rotulo(`r = ${r} cm`, esc); s.position.set(r / 2, .35 * esc, 0); med.add(s);
  root.position.y = r;
  med.position.y = r;
  return {root, atualizar:() => {}, verts:[], med, tam:2 * r, centro:V3(0, r, 0), semPlanif:true};
}
function modelo(sp){
  if (sp.poli) return modeloPoliedro(sp);
  if (sp.tipo === 'cilindro') return modeloCilindro(sp);
  if (sp.tipo === 'cone') return modeloCone(sp);
  return modeloEsfera(sp);
}

/* ---------------- estado ---------------- */
const EST = {tipo:'cubo', P:{cubo:padrao('cubo')}, t:0, tocando:false, aba:'carac', vista:'3d'};
let SP, MOD, grupo = null, vertG = null;
const ck = id => $('#' + id).checked;

function montar(){
  if (grupo){ scene.remove(grupo); grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); } }); }
  SP = spec(EST.tipo, EST.P[EST.tipo]);
  MOD = modelo(SP);
  grupo = new THREE.Group(); grupo.add(MOD.root);
  vertG = bolinhas(MOD.verts, MOD.tam / 6); grupo.add(vertG);
  grupo.add(MOD.med); if (MOD.cubos) grupo.add(MOD.cubos);
  scene.add(grupo);
  aplicarT(EST.t, true);
  $('#t-nome').textContent = SP.nome;
  $('#t-grupo').textContent = SP.poli ? '· poliedro' : '· corpo redondo';
  $('#lb-cubos').style.display = MOD.cubos ? '' : 'none';
  $('#r-t').disabled = $('#b-play').disabled = !!MOD.semPlanif;
  if (MOD.semPlanif){ EST.t = 0; $('#r-t').value = 0; $('#t-pct').textContent = 'sem planificação'; }
  enquadrar(true);
  painel();
}
function visibilidade(){
  const fechado = EST.t < 0.02;
  vertG.visible = ck('c-vertices') && fechado;
  MOD.med.visible = ck('c-medidas') && fechado;
  if (MOD.cubos) MOD.cubos.visible = ck('c-cubos') && fechado;
  grupo.traverse(o => { if (o.userData && o.userData.aresta) o.visible = ck('c-arestas'); });
  Object.values(matFace).forEach(m => { m.opacity = ck('c-transp') ? 0.45 : 1; m.depthWrite = !ck('c-transp'); });
}
function aplicarT(t, sem){
  EST.t = t; MOD.atualizar(t);
  $('#r-t').value = Math.round(t * 1000);
  if (!MOD.semPlanif) $('#t-pct').textContent = t < 0.005 ? 'fechado' : t > 0.995 ? 'planificado' : Math.round(t * 100) + '%';
  visibilidade();
  if (!sem) enquadrar(false);
}
/* câmera */
const VISTAS = {'3d':V3(1, .75, 1.35), frente:V3(0, .12, 1), cima:V3(0, 1, .02), lado:V3(1, .15, 0)};
let alvoCam = null;
function caixa(){ grupo.updateMatrixWorld(true); const b = new THREE.Box3(); MOD.root.traverse(o => { if (o.isMesh) b.expandByObject(o); }); return b; }
function enquadrar(pular){
  const b = caixa(), c = b.getCenter(new THREE.Vector3()), r = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 1);
  let dir = VISTAS[EST.vista].clone().normalize();
  if (!pular){ dir = camera.position.clone().sub(controls.target).normalize(); }
  const dist = r / Math.sin((camera.fov * PI / 180) / 2) * (camera.aspect < 1 ? 1.35 / camera.aspect * .75 : 1.02);
  alvoCam = {pos:c.clone().addScaledVector(dir, dist), alvo:c};
  if (pular){ camera.position.copy(alvoCam.pos); controls.target.copy(c); alvoCam = null; }
}
function tamanho(){ const w = cena.clientWidth, h = cena.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }
new ResizeObserver(() => tamanho()).observe(cena);

let ult = performance.now();
function quadro(agora){
  const dt = Math.min(.05, (agora - ult) / 1000); ult = agora;
  if (EST.tocando){
    let t = EST.t + EST.dir * dt / 2.6;
    if (t >= 1){ t = 1; EST.tocando = false; vistaFim(); } if (t <= 0){ t = 0; EST.tocando = false; vistaFim(); }
    aplicarT(t); botaoPlay();
  }
  if (alvoCam){ camera.position.lerp(alvoCam.pos, .12); controls.target.lerp(alvoCam.alvo, .12); if (camera.position.distanceTo(alvoCam.pos) < .01) alvoCam = null; }
  controls.autoRotate = ck('c-girar'); controls.autoRotateSpeed = 1.6;
  controls.update(); renderer.render(scene, camera);
  requestAnimationFrame(quadro);
}
controls.addEventListener('start', () => { alvoCam = null; });
function botaoPlay(){ $('#b-play').textContent = EST.tocando ? '⏸ Pausar' : (EST.t > .5 ? '◀ Fechar' : '▶ Planificar'); }

/* ---------------- lateral: lista e medidas ---------------- */
function listaSolidos(){
  const item = t => `<button data-tipo="${t}" class="${t === EST.tipo ? 'on' : ''}"><svg viewBox="0 0 40 40">${ICONES[t]}</svg>${({cubo:'Cubo', para:'Paralelepípedo', prisma:'Prismas', piramide:'Pirâmides', cilindro:'Cilindro', cone:'Cone', esfera:'Esfera'})[t]}</button>`;
  $('#l-poli').innerHTML = ['cubo','para','prisma','piramide'].map(item).join('');
  $('#l-red').innerHTML = ['cilindro','cone','esfera'].map(item).join('');
}
function controlesMedidas(){
  const P = EST.P[EST.tipo];
  $('#params').innerHTML = TIPOS[EST.tipo].params.map(([k, rot, mi, ma]) => `<div class="param"><label for="p-${k}">${rot} <b id="v-${k}">${P[k]}${k === 'n' ? '' : ' cm'}</b></label><input type="range" id="p-${k}" min="${mi}" max="${ma}" step="1" value="${P[k]}" data-p="${k}"></div>`).join('')
    + (EST.tipo === 'prisma' || EST.tipo === 'piramide' ? `<p class="mini">Base: ${POL[P.n]} regular.</p>` : '');
  $('#params').querySelectorAll('[data-p]').forEach(inp => inp.oninput = () => {
    P[inp.dataset.p] = +inp.value; $('#v-' + inp.dataset.p).textContent = inp.value + (inp.dataset.p === 'n' ? '' : ' cm');
    montar(); if (inp.dataset.p === 'n') controlesMedidas();
  });
}
function escolher(tipo){
  EST.tipo = tipo; EST.P[tipo] = EST.P[tipo] || padrao(tipo); EST.t = 0; EST.tocando = false; EST.vista = '3d';
  listaSolidos(); controlesMedidas(); montar(); botaoPlay();
}

/* =========================================================
   PAINEL DE INFORMAÇÕES
   ========================================================= */
const INFO = {
  cubo:{def:'O <b>cubo</b> é um prisma em que <b>todas as 6 faces são quadrados iguais</b>. Também é chamado de <i>hexaedro regular</i> (hexa = 6). Todas as 12 arestas têm a mesma medida.',
    ex:'dado, cubo mágico, caixa de presente quadrada, cubo de gelo'},
  para:{def:'O <b>paralelepípedo</b> (bloco retangular) é um prisma cujas <b>6 faces são retângulos</b>. As faces opostas são iguais e paralelas. Tem três medidas: comprimento, largura e altura.',
    ex:'caixa de sapato, tijolo, caixa de leite, livro, geladeira'},
  prisma:{def:'<b>Prisma</b> é um poliedro com <b>duas bases iguais e paralelas</b> (polígonos) ligadas por <b>faces laterais que são paralelogramos</b> — aqui, retângulos, porque o prisma é reto. O nome do prisma vem do polígono da base.',
    ex:'barra de chocolate triangular, lápis sextavado (hexagonal), caixa de pizza, colmeia'},
  piramide:{def:'<b>Pirâmide</b> é um poliedro com <b>uma única base</b> (polígono) e <b>faces laterais triangulares</b> que se encontram em um mesmo ponto, o <b>vértice da pirâmide</b> (ápice). O nome vem do polígono da base.',
    ex:'pirâmides do Egito, telhado de casa, embalagens de chocolate, barraca de acampamento'},
  cilindro:{def:'O <b>cilindro</b> é um corpo redondo com <b>duas bases circulares iguais e paralelas</b> e uma <b>superfície lateral curva</b>. Ele <b>não é poliedro</b>, porque tem superfície curva. Ao planificar, a lateral vira um <b>retângulo</b> cujo comprimento é o contorno da base (2πr).',
    ex:'lata de refrigerante, rolo de papel, cano, copo, pilha'},
  cone:{def:'O <b>cone</b> é um corpo redondo com <b>uma base circular</b> e uma <b>superfície lateral curva</b> que termina em um ponto, o <b>vértice</b>. A <b>geratriz (g)</b> é a medida do vértice até a borda da base. Planificada, a lateral vira um <b>setor circular</b> de raio g.',
    ex:'casquinha de sorvete, chapéu de aniversário, cone de trânsito, funil'},
  esfera:{def:'A <b>esfera</b> é o corpo redondo em que <b>todos os pontos da superfície estão à mesma distância do centro</b> — essa distância é o <b>raio (r)</b>. Ela tem só uma superfície, toda curva, e <b>não pode ser planificada</b> sem rasgar ou esticar.',
    ex:'bola, laranja, bolinha de gude, globo terrestre'},
};
function facesLista(sp){
  const P = sp.P, M = medidas(sp), li = (cor, n, txt) => `<li><span class="cor" style="background:${cor}"></span><b>${n}</b> ${txt}</li>`;
  if (sp.tipo === 'cubo') return li(COR.base, 2, `quadrados nas bases (${P.a} cm de lado)`) + li(COR.lat, 4, 'quadrados nas faces laterais');
  if (sp.tipo === 'para') return li(COR.base, 2, `retângulos nas bases (${P.c} × ${P.l} cm)`) + li(COR.lat, 4, `retângulos nas faces laterais (${P.c} × ${P.h} e ${P.l} × ${P.h} cm)`);
  if (sp.tipo === 'prisma') return li(COR.base, 2, `${POL_PL[P.n]} nas bases (${P.n === 3 ? 'equiláteros' : 'regulares'}, lado ${P.l} cm)`) + li(COR.lat, P.n, `retângulos nas faces laterais (${P.l} × ${P.h} cm)`);
  if (sp.tipo === 'piramide') return li(COR.base, 1, `${POL[P.n]} na base (lado ${P.l} cm)`) + li(COR.lat, P.n, `triângulos isósceles nas faces laterais`);
  if (sp.tipo === 'cilindro') return li(COR.base, 2, `círculos nas bases (raio ${P.r} cm)`) + li(COR.curva, 1, `superfície lateral curva (planificada vira um retângulo de ${fmt(2 * PI_ESC * P.r)} cm × ${P.h} cm)`);
  if (sp.tipo === 'cone') return li(COR.base, 1, `círculo na base (raio ${P.r} cm)`) + li(COR.curva, 1, `superfície lateral curva (planificada vira um setor circular de raio g ≈ ${fmt(M.g, 1)} cm)`);
  return li(COR.curva, 1, 'superfície curva (sem faces planas)');
}
function abaCarac(){
  const sp = SP, M = medidas(sp), I = INFO[sp.tipo];
  let h = `<h3>${sp.nome}</h3><p class="def">${I.def}</p>`;
  if (sp.poli){
    h += `<h3>Elementos</h3><div class="elem"><div><b>${M.F}</b>faces</div><div><b>${M.Vt}</b>vértices</div><div><b>${M.A}</b>arestas</div></div>
      <p class="euler">Relação de Euler: V − A + F = 2 → ${M.Vt} − ${M.A} + ${M.F} = ${M.Vt - M.A + M.F} ✔</p>
      <p class="mini"><b>Face</b>: cada polígono que forma a superfície. <b>Aresta</b>: segmento onde duas faces se encontram. <b>Vértice</b>: ponto onde as arestas se encontram.</p>`;
    if (sp.tipo === 'prisma' || sp.tipo === 'piramide'){
      const n = sp.P.n;
      h += `<p class="mini">${sp.tipo === 'prisma' ? `Num prisma de base com ${n} lados: <b>F = n + 2</b>, <b>V = 2n</b>, <b>A = 3n</b>.` : `Numa pirâmide de base com ${n} lados: <b>F = n + 1</b>, <b>V = n + 1</b>, <b>A = 2n</b>.`} Mude “Lados da base” e veja os números mudarem.</p>`;
    }
  } else {
    const t = {cilindro:['2 superfícies planas (as bases) e 1 superfície curva', '0', 'não tem — as bordas circulares não são arestas de poliedro'],
      cone:['1 superfície plana (a base) e 1 superfície curva', '1 (o vértice do cone)', 'não tem — a borda da base é uma curva'],
      esfera:['1 superfície curva', '0', 'não tem']}[sp.tipo];
    h += `<h3>Elementos</h3><table class="tabela"><tr><td><b>Superfícies</b></td><td>${t[0]}</td></tr><tr><td><b>Vértices</b></td><td>${t[1]}</td></tr><tr><td><b>Arestas</b></td><td>${t[2]}</td></tr></table>
      <p class="mini">Corpos redondos rolam porque têm superfícies curvas. A relação de Euler vale só para poliedros.</p>`;
  }
  h += `<h3>Faces / figuras planas</h3><ul class="faces">${facesLista(sp)}</ul>`;
  if (sp.tipo === 'prisma' || sp.tipo === 'piramide' || sp.tipo === 'cubo' || sp.tipo === 'para')
    h += `<h3>Prisma × Pirâmide</h3><table class="tabela"><tr><td></td><td><b>Prisma</b></td><td><b>Pirâmide</b></td></tr><tr><td>Bases</td><td>2 iguais e paralelas</td><td>1</td></tr><tr><td>Faces laterais</td><td>retângulos (paralelogramos)</td><td>triângulos</td></tr><tr><td>Volume</td><td>Ab × h</td><td>(Ab × h) ÷ 3</td></tr></table>`;
  else h += `<h3>Poliedro × Corpo redondo</h3><p>Poliedros têm só faces planas (polígonos). Corpos redondos têm pelo menos uma superfície curva e por isso rolam.</p>`;
  h += `<h3>No dia a dia</h3><p>${I.ex}.</p>`;
  return h;
}

/* ----- planificação 2D (SVG) ----- */
function svgPoligonos(polys, extras){
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  polys.forEach(p => p.pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }));
  (extras || []).forEach(e => e.bb && e.bb.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }));
  const pad = Math.max(maxX - minX, maxY - minY) * .06 + .3, W = maxX - minX + 2 * pad, H = maxY - minY + 2 * pad, fs = Math.max(W, H) / 30;
  let s = `<svg viewBox="${minX - pad} ${minY - pad} ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Atkinson Hyperlegible, Segoe UI, sans-serif">`;
  polys.forEach(p => {
    s += `<polygon points="${p.pts.map(q => q.join(',')).join(' ')}" fill="${p.cor}" fill-opacity=".75" stroke="#1C2A22" stroke-width="${fs / 8}" stroke-linejoin="round"/>`;
    if (p.rot){ const cx = p.pts.reduce((a, q) => a + q[0], 0) / p.pts.length, cy = p.pts.reduce((a, q) => a + q[1], 0) / p.pts.length;
      s += `<text x="${cx}" y="${cy}" font-size="${fs}" text-anchor="middle" font-weight="700" fill="#1C2A22">${p.rot}</text>`;
      if (p.sub) s += `<text x="${cx}" y="${cy + fs * 1.15}" font-size="${fs * .8}" text-anchor="middle" fill="#1C2A22">${p.sub}</text>`; }
  });
  (extras || []).forEach(e => s += e.svg(fs));
  return s + '</svg>';
}
function netPoliedro(sp, comRotulos){
  const md = modeloPoliedro(sp); md.atualizar(1); md.root.updateMatrixWorld(true);
  const P = sp.P, M = medidas(sp), polys = [];
  md.root.traverse(o => {
    if (!o.userData || !o.userData.pts) return;
    const pts = o.userData.pts.map(p => { const v = o.localToWorld(V3(p[0], 0, p[1])); return [+v.x.toFixed(4), +v.z.toFixed(4)]; });
    let rot = '', sub = '';
    if (comRotulos){
      if (o.userData.tipo === 'base'){ rot = sp.tipo === 'para' ? 'retângulo' : POL[sp.tipo === 'cubo' ? 4 : P.n]; sub = sp.tipo === 'para' ? `${P.c} × ${P.l}` : `lado ${sp.tipo === 'cubo' ? P.a : P.l}`; }
      else if (sp.tipo === 'piramide'){ rot = 'triângulo'; sub = `b ${P.l} · alt ${fmt(M.g, 1)}`; }
      else if (sp.tipo === 'cubo'){ rot = 'quadrado'; sub = `lado ${P.a}`; }
      else if (sp.tipo === 'para'){ const L = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]); rot = 'retângulo'; sub = `${fmt(L)} × ${P.h}`; }
      else { rot = 'retângulo'; sub = `${P.l} × ${P.h}`; }
    }
    polys.push({pts, cor:COR[o.userData.tipo], rot, sub});
  });
  md.root.traverse(o => o.geometry && o.geometry.dispose());
  return svgPoligonos(polys);
}
function arco(cx, cy, R, a0, a1, n = 60){ const p = []; for (let i = 0; i <= n; i++){ const a = a0 + (a1 - a0) * i / n; p.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } return p; }
function netRedondo(sp, comRotulos){
  const P = sp.P, M = medidas(sp);
  if (sp.tipo === 'cilindro'){
    const {r, h} = P, L = 2 * PI * r, polys = [
      {pts:[[-L/2, 0], [L/2, 0], [L/2, h], [-L/2, h]], cor:COR.curva, rot:comRotulos ? 'retângulo' : '', sub:comRotulos ? `${fmt(2 * PI_ESC * r)} × ${h}` : ''},
      {pts:arco(0, -r, r, 0, 2 * PI), cor:COR.base, rot:comRotulos ? 'círculo' : '', sub:comRotulos ? `r = ${r}` : ''},
      {pts:arco(0, h + r, r, 0, 2 * PI), cor:COR.base, rot:comRotulos ? 'círculo' : '', sub:comRotulos ? `r = ${r}` : ''}];
    const ex = comRotulos ? [{bb:[[-L/2, h + 2.2*r], [L/2 + L * .16, h / 2]], svg:fs => `<text x="0" y="${h + 2 * r + fs * 1.3}" font-size="${fs}" text-anchor="middle" fill="#9A3412" font-weight="700">comprimento = 2πr ≈ ${fmt(2 * PI_ESC * r)} cm</text><text x="${L/2 + fs * .4}" y="${h/2}" font-size="${fs}" fill="#9A3412" font-weight="700">h = ${h}</text>`, }] : [];
    return svgPoligonos(polys, ex);
  }
  if (sp.tipo === 'cone'){
    const {r} = P, g = M.g, th = 2 * PI * r / g, a0 = PI / 2 - th / 2;
    const setor = [[0, 0], ...arco(0, 0, g, a0, a0 + th, 90)];
    const polys = [{pts:setor, cor:COR.curva, rot:comRotulos ? 'setor circular' : '', sub:comRotulos ? `raio g ≈ ${fmt(g, 1)}` : ''}, {pts:arco(0, g + r, r, 0, 2 * PI), cor:COR.base, rot:comRotulos ? 'círculo' : '', sub:comRotulos ? `r = ${r}` : ''}];
    const ex = comRotulos ? [{bb:[[g * 1.1, 0], [-g * 1.1, 0]], svg:fs => `<text x="0" y="${-fs * .6}" font-size="${fs}" text-anchor="middle" fill="#9A3412" font-weight="700">ângulo do setor ≈ ${fmt(M.ang, 0)}°</text>`}] : [];
    return svgPoligonos(polys, ex);
  }
  /* esfera: gomos (só uma aproximação) */
  const r = P.r, N = 12, w = 2 * PI * r / N, polys = [];
  for (let k = 0; k < N; k++){ const cx = -PI * r + w / 2 + k * w, pts = [];
    for (let i = 0; i <= 24; i++){ const lat = -PI / 2 + PI * i / 24; pts.push([cx + w / 2 * Math.cos(lat), r * lat]); }
    for (let i = 24; i >= 0; i--){ const lat = -PI / 2 + PI * i / 24; pts.push([cx - w / 2 * Math.cos(lat), r * lat]); }
    polys.push({pts, cor:COR.curva}); }
  return svgPoligonos(polys);
}
const netSVG = (sp, rot = true) => sp.poli ? netPoliedro(sp, rot) : netRedondo(sp, rot);
function abaPlanif(){
  const sp = SP, P = sp.P, M = medidas(sp);
  let h = `<h3>Planificação · ${sp.nome}</h3>`;
  if (sp.tipo === 'esfera') return h + `<p class="aviso">A esfera <b>não tem planificação exata</b>: qualquer tentativa de “abrir” a superfície no plano rasga ou estica. Por isso os mapas-múndi sempre deformam os continentes.</p><p>O mais perto que se chega são os <b>gomos</b> (como na casca da laranja ou numa bola de couro):</p><div class="net">${netSVG(sp)}</div>`;
  h += `<p class="mini">Use a barra <b>▶ Planificar</b> embaixo do sólido para ver ele abrir em 3D. Aqui está a planificação vista de cima, com o nome de cada figura plana.</p><div class="net">${netSVG(sp)}</div>`;
  h += `<h3>Figuras que aparecem</h3><ul class="faces">${facesLista(sp)}</ul>`;
  if (sp.tipo === 'cilindro') h += `<p class="def">Por que o retângulo mede <b>2πr</b>? Ele “abraça” a base: o comprimento do retângulo é igual ao <b>contorno da circunferência</b> da base: 2 × π × ${P.r} ≈ ${fmt(2 * PI_ESC * P.r)} cm.</p>`;
  if (sp.tipo === 'cone') h += `<p class="def">O arco do setor tem o mesmo comprimento do contorno da base (2πr ≈ ${fmt(2 * PI_ESC * P.r)} cm). O raio do setor é a geratriz g ≈ ${fmt(M.g, 2)} cm. Ângulo do setor = 360° × r ÷ g ≈ ${fmt(M.ang, 1)}°.</p>`;
  if (sp.poli) h += `<p class="def">A <b>área total</b> do sólido é a soma das áreas de todas as figuras da planificação. Veja a conta na aba <b>Área e volume</b>.</p>`;
  return h;
}

/* ----- área e volume ----- */
const bloco = (tit, f, s, r) => `<div class="form"><h4>${tit}</h4><div class="f">${f}</div>${s ? `<div class="s">${s}</div>` : ''}<div class="r">${r}</div></div>`;
const piTxt = (coef, un) => `${fmt(coef)}π ≈ ${fmt(coef * PI_ESC)} ${un}`;
function abaCalc(){
  const sp = SP, P = sp.P, M = medidas(sp);
  let h = `<h3>Área e volume · ${sp.nome}</h3><p class="mini">Valores com as medidas escolhidas na esquerda. ${sp.poli ? '' : 'Usamos π ≈ 3,14.'} Área em cm², volume em cm³.</p>`;
  if (sp.tipo === 'cubo'){ const a = P.a;
    h += bloco('Área de uma face', 'A<sub>face</sub> = a²', `${a}² = ${a} × ${a}`, `${fmt(a*a)} cm²`);
    h += bloco('Área total (6 faces iguais)', 'A<sub>t</sub> = 6a²', `6 × ${a}² = 6 × ${a*a}`, `${fmt(M.At)} cm²`);
    h += bloco('Volume', 'V = a³', `${a}³ = ${a} × ${a} × ${a}`, `${fmt(M.V)} cm³`);
    h += bloco('Diagonal do cubo', 'd = a√3', `${a} × √3 ≈ ${a} × 1,73`, `≈ ${fmt(M.d)} cm`);
    h += `<p class="mini">Ligue <b>Cubinhos de 1 cm³</b> para ver que cabem ${a} × ${a} × ${a} = ${M.V} cubinhos.</p>`;
  }
  if (sp.tipo === 'para'){ const {c, l, h:al} = P;
    h += bloco('Área da base', 'A<sub>b</sub> = c × l', `${c} × ${l}`, `${fmt(M.Ab)} cm²`);
    h += bloco('Área lateral (4 retângulos)', 'A<sub>l</sub> = 2·c·h + 2·l·h', `2 × ${c} × ${al} + 2 × ${l} × ${al} = ${2*c*al} + ${2*l*al}`, `${fmt(M.Al)} cm²`);
    h += bloco('Área total', 'A<sub>t</sub> = 2(c·l + c·h + l·h)', `2 × (${c*l} + ${c*al} + ${l*al})`, `${fmt(M.At)} cm²`);
    h += bloco('Volume', 'V = c × l × h', `${c} × ${l} × ${al}`, `${fmt(M.V)} cm³`);
    h += bloco('Diagonal', 'D = √(c² + l² + h²)', `√(${c*c} + ${l*l} + ${al*al}) = √${c*c + l*l + al*al}`, `≈ ${fmt(M.d)} cm`);
    h += `<p class="mini">Ligue <b>Cubinhos de 1 cm³</b>: ${c} × ${l} = ${c*l} cubinhos na camada de baixo, e ${al} camadas.</p>`;
  }
  if (sp.tipo === 'prisma' || sp.tipo === 'piramide'){
    const {n, l, h:al} = P, esp = n === 3 ? ` (ou A<sub>b</sub> = l²√3 ÷ 4 = ${fmt(l*l)} × 1,73 ÷ 4)` : n === 4 ? ` (ou A<sub>b</sub> = l² = ${l*l})` : n === 6 ? ` (ou 6 triângulos equiláteros: 6 × l²√3 ÷ 4)` : '';
    h += bloco(`Área da base (${POL[n]} regular)`, 'A<sub>b</sub> = (perímetro × apótema) ÷ 2', `apótema ≈ ${fmt(M.ap)} cm · (${n} × ${l} × ${fmt(M.ap)}) ÷ 2${esp}`, `≈ ${fmt(M.Ab)} cm²`);
    if (sp.tipo === 'prisma'){
      h += bloco(`Área lateral (${n} retângulos)`, 'A<sub>l</sub> = n × l × h', `${n} × ${l} × ${al}`, `${fmt(M.Al)} cm²`);
      h += bloco('Área total', 'A<sub>t</sub> = 2·A<sub>b</sub> + A<sub>l</sub>', `2 × ${fmt(M.Ab)} + ${fmt(M.Al)}`, `≈ ${fmt(M.At)} cm²`);
      h += bloco('Volume', 'V = A<sub>b</sub> × h', `${fmt(M.Ab)} × ${al}`, `≈ ${fmt(M.V)} cm³`);
    } else {
      h += bloco('Apótema da pirâmide (altura de cada triângulo)', 'g = √(h² + a<sub>b</sub>²)', `√(${al}² + ${fmt(M.ap)}²)`, `≈ ${fmt(M.g)} cm`);
      h += bloco(`Área lateral (${n} triângulos)`, 'A<sub>l</sub> = n × (l × g) ÷ 2', `${n} × (${l} × ${fmt(M.g)}) ÷ 2`, `≈ ${fmt(M.Al)} cm²`);
      h += bloco('Área total', 'A<sub>t</sub> = A<sub>b</sub> + A<sub>l</sub>', `${fmt(M.Ab)} + ${fmt(M.Al)}`, `≈ ${fmt(M.At)} cm²`);
      h += bloco('Volume', 'V = (A<sub>b</sub> × h) ÷ 3', `(${fmt(M.Ab)} × ${al}) ÷ 3`, `≈ ${fmt(M.V)} cm³`);
      h += `<p class="def">Por que dividir por 3? Uma pirâmide cabe <b>exatamente 3 vezes</b> dentro do prisma de mesma base e mesma altura.</p>`;
    }
  }
  if (sp.tipo === 'cilindro'){ const {r, h:al} = P;
    h += bloco('Área da base (círculo)', 'A<sub>b</sub> = π r²', `π × ${r}² = ${r*r}π`, piTxt(M.Ab, 'cm²'));
    h += bloco('Área lateral (retângulo 2πr × h)', 'A<sub>l</sub> = 2π r h', `2 × π × ${r} × ${al} = ${M.Al}π`, piTxt(M.Al, 'cm²'));
    h += bloco('Área total', 'A<sub>t</sub> = 2·A<sub>b</sub> + A<sub>l</sub>', `2 × ${r*r}π + ${M.Al}π`, piTxt(M.At, 'cm²'));
    h += bloco('Volume', 'V = A<sub>b</sub> × h = π r² h', `π × ${r}² × ${al}`, piTxt(M.V, 'cm³'));
  }
  if (sp.tipo === 'cone'){ const {r, h:al} = P;
    h += bloco('Geratriz (Pitágoras)', 'g² = r² + h²', `g = √(${r}² + ${al}²) = √${r*r + al*al}`, `g ≈ ${fmt(M.g)} cm`);
    h += bloco('Área da base', 'A<sub>b</sub> = π r²', `π × ${r}²`, piTxt(M.Ab, 'cm²'));
    h += bloco('Área lateral (setor)', 'A<sub>l</sub> = π r g', `π × ${r} × ${fmt(M.g)}`, piTxt(M.Al, 'cm²'));
    h += bloco('Área total', 'A<sub>t</sub> = π r (r + g)', `π × ${r} × (${r} + ${fmt(M.g)})`, piTxt(M.At, 'cm²'));
    h += bloco('Volume', 'V = (π r² h) ÷ 3', `(π × ${r}² × ${al}) ÷ 3`, piTxt(M.V, 'cm³'));
    h += `<p class="def">O cone cabe <b>3 vezes</b> no cilindro de mesma base e mesma altura, por isso o volume é dividido por 3.</p>`;
  }
  if (sp.tipo === 'esfera'){ const {r} = P;
    h += bloco('Área da superfície', 'A = 4π r²', `4 × π × ${r}²`, piTxt(M.A, 'cm²'));
    h += bloco('Volume', 'V = (4 π r³) ÷ 3', `(4 × π × ${r}³) ÷ 3`, piTxt(M.V, 'cm³'));
    h += `<p class="def">Curiosidade: a área da esfera é igual a <b>4 círculos</b> de mesmo raio.</p>`;
  }
  h += `<h3>Lembretes</h3><ul class="faces"><li><b>Área</b> mede a superfície (quanto papel cobre o sólido) → unidade ao quadrado (cm²).</li><li><b>Volume</b> mede o espaço ocupado (quanto cabe dentro) → unidade ao cubo (cm³). 1 dm³ = 1 litro.</li><li>Prismas e cilindro: V = área da base × altura. Pirâmides e cone: dividir por 3.</li></ul>`;
  return h;
}

/* ----- desafio ----- */
const DES = {q:null, acertos:0, total:0, resp:false};
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pega = a => a[Math.floor(Math.random() * a.length)];
const um = sp => (/^(Pirâmide|Esfera)/.test(sp.nome) ? 'uma ' : 'um ') + sp.nome.toLowerCase();
const embaralha = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ALEAT = () => pega([spec('cubo', {a:3}), spec('para', {c:5, l:3, h:2}), spec('prisma', {n:3, l:3, h:4}), spec('prisma', {n:5, l:3, h:4}), spec('prisma', {n:6, l:3, h:4}),
  spec('piramide', {n:3, l:4, h:3}), spec('piramide', {n:4, l:4, h:3}), spec('piramide', {n:5, l:4, h:3}), spec('cilindro', {r:2, h:4}), spec('cone', {r:2, h:4})]);
function numOps(cert, outros){ const s = new Set([cert]); outros.forEach(o => { if (o > 0 && s.size < 4) s.add(o); }); let k = 1; while (s.size < 4){ s.add(cert + k * (k % 2 ? 1 : -1) + (k > 2 ? 2 : 0)); k++; } return embaralha([...s]).map(v => ({html:fmt(v), ok:v === cert})); }
const GERADORES = [
  () => { const n = rnd(3, 8), pir = Math.random() < .5, sp = spec(pir ? 'piramide' : 'prisma', {n, l:3, h:4}), M = medidas(sp), qual = pega(['faces', 'vértices', 'arestas']), v = {faces:M.F, 'vértices':M.Vt, arestas:M.A}[qual];
    return {txt:`Quantas <b>${qual}</b> tem ${um(sp).replace(/^(\S+) (.*)$/, '$1 <b>$2</b>')}?`, ops:numOps(v, [M.F, M.Vt, M.A, v + 2, v - 1]), expl:`${sp.nome}: F = ${M.F}, V = ${M.Vt}, A = ${M.A}. Confere com Euler: ${M.Vt} − ${M.A} + ${M.F} = 2.`, sp}; },
  () => { const sp = ALEAT(), nomes = embaralha([...new Set(['Cubo', 'Paralelepípedo', 'Prisma triangular', 'Prisma pentagonal', 'Prisma hexagonal', 'Pirâmide triangular', 'Pirâmide quadrangular', 'Pirâmide pentagonal', 'Cilindro', 'Cone'])].filter(x => x !== sp.nome)).slice(0, 3);
    return {txt:'Esta é a planificação de qual sólido?', fig:netSVG(sp, false), ops:embaralha([sp.nome, ...nomes]).map(x => ({html:x, ok:x === sp.nome})), expl:`É a planificação de: ${sp.nome}.`, sp}; },
  () => { let sps = []; while (sps.length < 4){ const s = ALEAT(); if (!sps.some(x => x.nome === s.nome)) sps.push(s); }
    const cert = sps[0]; return {txt:`Qual destas é a planificação de ${um(cert).replace(/^(\S+) (.*)$/, '$1 <b>$2</b>')}?`, ops:embaralha(sps.map(s => ({html:netSVG(s, false), ok:s === cert}))), expl:`Repare nas bases e nas faces laterais de: ${cert.nome}.`, sp:cert, figOps:true}; },
  () => { const q = pega([['um prisma', 'retângulos (paralelogramos)'], ['uma pirâmide', 'triângulos'], ['um cubo', 'quadrados'], ['um cilindro', 'um retângulo (a superfície lateral planificada)'], ['um cone', 'um setor circular (a superfície lateral planificada)']]);
    const todas = ['retângulos (paralelogramos)', 'triângulos', 'quadrados', 'um retângulo (a superfície lateral planificada)', 'um setor circular (a superfície lateral planificada)', 'círculos'];
    return {txt:`Na planificação, a parte lateral de <b>${q[0]}</b> é formada por:`, ops:embaralha([q[1], ...embaralha(todas.filter(x => x !== q[1])).slice(0, 3)]).map(x => ({html:x, ok:x === q[1]})), expl:`Faces laterais de ${q[0]}: ${q[1]}.`}; },
  () => { const t = pega(['cubo', 'para', 'cil', 'pir', 'cone']);
    if (t === 'cubo'){ const a = rnd(2, 6); return {txt:`Um cubo tem aresta de <b>${a} cm</b>. Qual é o seu volume?`, ops:numOps(a**3, [6*a*a, 3*a, a*a, 12*a]).map(o => ({...o, html:o.html + ' cm³'})), expl:`V = a³ = ${a} × ${a} × ${a} = ${a**3} cm³.`}; }
    if (t === 'para'){ const c = rnd(2, 8), l = rnd(2, 5), h = rnd(2, 6), v = c*l*h; return {txt:`Uma caixa tem <b>${c} cm</b> de comprimento, <b>${l} cm</b> de largura e <b>${h} cm</b> de altura. Qual é o volume?`, ops:numOps(v, [c+l+h, 2*(c*l+c*h+l*h), c*l, v/2|0]).map(o => ({...o, html:o.html + ' cm³'})), expl:`V = c × l × h = ${c} × ${l} × ${h} = ${v} cm³.`}; }
    if (t === 'pir'){ const l = rnd(2, 6), h = 3 * rnd(1, 3), v = l*l*h/3; return {txt:`Uma pirâmide de base quadrada tem aresta da base <b>${l} cm</b> e altura <b>${h} cm</b>. Qual é o volume?`, ops:numOps(v, [l*l*h, l*l, 2*v, v + l]).map(o => ({...o, html:o.html + ' cm³'})), expl:`V = (A<sub>b</sub> × h) ÷ 3 = (${l*l} × ${h}) ÷ 3 = ${v} cm³.`}; }
    if (t === 'cil'){ const r = rnd(1, 4), h = rnd(2, 8), v = +(PI_ESC*r*r*h).toFixed(2); return {txt:`Uma lata cilíndrica tem raio <b>${r} cm</b> e altura <b>${h} cm</b>. Qual é o volume? (use π = 3,14)`, ops:numOps(v, [+(2*PI_ESC*r*h).toFixed(2), +(PI_ESC*r*h).toFixed(2), +(PI_ESC*r*r).toFixed(2), +(v/3).toFixed(2)]).map(o => ({...o, html:o.html + ' cm³'})), expl:`V = π r² h = 3,14 × ${r*r} × ${h} = ${fmt(v)} cm³.`}; }
    const r = rnd(1, 4), h = 3 * rnd(1, 3), v = +(PI_ESC*r*r*h/3).toFixed(2); return {txt:`Um cone tem raio <b>${r} cm</b> e altura <b>${h} cm</b>. Qual é o volume? (use π = 3,14)`, ops:numOps(v, [+(PI_ESC*r*r*h).toFixed(2), +(PI_ESC*r*h).toFixed(2), +(PI_ESC*r*r).toFixed(2)]).map(o => ({...o, html:o.html + ' cm³'})), expl:`V = (π r² h) ÷ 3 = (3,14 × ${r*r} × ${h}) ÷ 3 = ${fmt(v)} cm³.`}; },
  () => { const sp = spec(pega(['prisma', 'piramide']), {n:rnd(3, 8), l:3, h:4}), M = medidas(sp); return {txt:`Um poliedro tem <b>${M.Vt} vértices</b> e <b>${M.A} arestas</b>. Pela relação de Euler, quantas faces ele tem?`, ops:numOps(M.F, [M.A - M.Vt, M.Vt + M.A, M.F + 2, M.F - 1]), expl:`V − A + F = 2 → ${M.Vt} − ${M.A} + F = 2 → F = ${M.F}. (É ${um(sp)}.)`, sp}; },
  () => { const a = rnd(2, 6); return {txt:`Quanto papel (área total) é preciso para cobrir um cubo de aresta <b>${a} cm</b>?`, ops:numOps(6*a*a, [a**3, 4*a*a, a*a, 12*a]).map(o => ({...o, html:o.html + ' cm²'})), expl:`O cubo tem 6 faces quadradas: 6 × ${a}² = ${6*a*a} cm².`}; },
];
function novaQuestao(){ DES.q = pega(GERADORES)(); DES.resp = false; }
function abaDesafio(){
  if (!DES.q) novaQuestao();
  const q = DES.q;
  return `<h3>Desafio</h3><p class="mini">Projete e deixe a turma responder. Toque na alternativa para conferir.</p><p class="placar">Acertos: ${DES.acertos} de ${DES.total}</p>
    <p style="font-size:18px">${q.txt}</p>${q.fig ? `<div class="net">${q.fig}</div>` : ''}
    <div class="ops">${q.ops.map((o, i) => `<button data-op="${i}" class="${DES.resp ? (o.ok ? 'certa' : (DES.resp === i + 1 ? 'errada' : '')) : ''}">${o.html}</button>`).join('')}</div>
    ${DES.resp ? `<div class="fb ${q.ops[DES.resp - 1].ok ? 'ok' : 'no'}">${q.ops[DES.resp - 1].ok ? '✅ Isso mesmo!' : '❌ Não é essa.'} ${q.expl}</div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap">${q.sp && DES.resp ? `<button class="btn" data-a="ver-sp">Ver este sólido em 3D</button>` : ''}<button class="btn pri" data-a="prox-q">Próxima pergunta →</button></div>`;
}

function painel(){
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('on', b.dataset.aba === EST.aba));
  $('#painel').innerHTML = ({carac:abaCarac, planif:abaPlanif, calc:abaCalc, desafio:abaDesafio})[EST.aba]();
}

/* ---------------- eventos ---------------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tipo) return escolher(b.dataset.tipo);
  if (b.dataset.aba){ EST.aba = b.dataset.aba; return painel(); }
  if (b.dataset.vista) return vista(b.dataset.vista);
  if (b.dataset.op != null && !DES.resp){ const i = +b.dataset.op; DES.resp = i + 1; DES.total++; if (DES.q.ops[i].ok) DES.acertos++; return painel(); }
  if (b.dataset.a === 'prox-q'){ novaQuestao(); return painel(); }
  if (b.dataset.a === 'ver-sp'){ const s = DES.q.sp; EST.P[s.tipo] = {...s.P}; EST.aba = 'carac'; return escolher(s.tipo); }
});
function vistaFim(){ if (EST.t >= .99) vista(SP.poli ? 'cima' : 'frente'); else if (EST.t <= .01) vista('3d'); }
function vista(v){
  EST.vista = v;
  const b = caixa(), c = b.getCenter(new THREE.Vector3()), r = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 1);
  const dist = r / Math.sin((camera.fov * PI / 180) / 2) * (camera.aspect < 1 ? 1.35 / camera.aspect * .75 : 1.02);
  alvoCam = {pos:c.clone().addScaledVector(VISTAS[v].clone().normalize(), dist), alvo:c};
}
$('#r-t').addEventListener('input', e => { EST.tocando = false; aplicarT(+e.target.value / 1000); botaoPlay(); });
$('#r-t').addEventListener('change', vistaFim);
$('#b-play').addEventListener('click', () => {
  if (EST.tocando){ EST.tocando = false; } else { EST.dir = EST.t > .5 ? -1 : 1; EST.tocando = true; }
  botaoPlay();
});
['c-arestas','c-vertices','c-medidas','c-transp','c-cubos'].forEach(id => $('#' + id).addEventListener('change', visibilidade));
$('#b-tela').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); });

listaSolidos(); controlesMedidas(); tamanho(); montar(); botaoPlay();
requestAnimationFrame(quadro);
})();
