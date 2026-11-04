import * as THREE from "three";

export const EX = 1.3;
const LIGHT = new THREE.Vector3(-0.55, 0.8, -0.35).normalize();

export const KIND_FLAT = 0;
export const KIND_SLOPE = 1;
export const KIND_WALL = 2;

// Builds merged meshes (filled faces) and line segments (hidden-line edges) for a set of buildings,
// split into spatial chunks so raycasting and recolouring stay cheap.
export function buildBuildingChunks(buildings, { chunkSize = 330, lineColor = 0x5d666b } = {}) {
  const buckets = new Map();
  for (const b of buildings) {
    const c = b.parts[0].c;
    const key = `${Math.floor(c[0] / chunkSize)},${Math.floor(c[1] / chunkSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(b);
  }
  const fillMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide,
  });
  const lineMaterial = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.85 });
  const group = new THREE.Group();
  const chunks = [];
  for (const list of buckets.values()) {
    const chunk = buildChunk(list, fillMaterial, lineMaterial);
    chunks.push(chunk);
    group.add(chunk.mesh, chunk.lines);
  }
  return { group, chunks, fillMaterial, lineMaterial };
}

function buildChunk(list, fillMaterial, lineMaterial) {
  const pos = [];
  const shade = [];
  const kind = [];
  const owner = [];
  const lines = [];
  const ranges = new Map();
  const v3 = (p, h) => [p[0], h, -p[1]];
  const pushTri = (a, b, c, k, id) => {
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const n = ab.cross(ac).normalize();
    const lit = k === KIND_WALL ? 0.84 + 0.16 * Math.max(0, Math.abs(n.dot(LIGHT)) * 1.4) : 0.95 + 0.05 * Math.max(0, n.dot(LIGHT));
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      shade.push(Math.min(1, lit));
      kind.push(k);
      owner.push(id);
    }
  };
  const quad = (a, b, c, d, k, id) => {
    pushTri(a, b, c, k, id);
    pushTri(a, c, d, k, id);
  };
  const line = (a, b) => lines.push(a[0], a[1], a[2], b[0], b[1], b[2]);

  for (const b of list) {
    const start = pos.length / 3;
    for (const part of b.parts) {
      const ux = Math.cos(part.angle);
      const uy = Math.sin(part.angle);
      const vx = -uy;
      const vy = ux;
      const hw = part.w / 2;
      const hd = part.d / 2;
      const [cx, cy] = part.c;
      const corner = (su, sv) => [cx + ux * hw * su + vx * hd * sv, cy + uy * hw * su + vy * hd * sv];
      const base = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      const z0 = (part.z || 0) * EX;
      const z1 = z0 + part.h * EX;
      const B = base.map((p) => v3(p, z0));
      const T = base.map((p) => v3(p, z1));
      for (let i = 0; i < 4; i += 1) {
        const j = (i + 1) % 4;
        quad(B[i], B[j], T[j], T[i], KIND_WALL, b.id);
        line(B[i], B[j]);
        line(T[i], T[j]);
        line(B[i], T[i]);
      }
      if (part.roof === "hip") {
        const longU = part.w >= part.d;
        const hl = Math.max(hw, hd);
        const hs = Math.min(hw, hd);
        const L = longU ? [ux, uy] : [vx, vy];
        const S = longU ? [vx, vy] : [-ux, -uy];
        const rise = Math.min(hs * 0.55, 3.4) * EX;
        const p = (sl, ss) => v3([cx + L[0] * hl * sl + S[0] * hs * ss, cy + L[1] * hl * sl + S[1] * hs * ss], z1);
        const p0 = p(-1, -1);
        const p1 = p(1, -1);
        const p2 = p(1, 1);
        const p3 = p(-1, 1);
        const r = hl - hs;
        const r0 = v3([cx - L[0] * r, cy - L[1] * r], z1 + rise);
        const r1 = v3([cx + L[0] * r, cy + L[1] * r], z1 + rise);
        quad(p0, p1, r1, r0, KIND_SLOPE, b.id);
        quad(p2, p3, r0, r1, KIND_SLOPE, b.id);
        pushTri(p1, p2, r1, KIND_SLOPE, b.id);
        pushTri(p3, p0, r0, KIND_SLOPE, b.id);
        line(p0, r0);
        line(p3, r0);
        line(p1, r1);
        line(p2, r1);
        if (r > 0.05) line(r0, r1);
      } else {
        quad(T[0], T[1], T[2], T[3], KIND_FLAT, b.id);
      }
    }
    ranges.set(b.id, [start, pos.length / 3 - start]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, fillMaterial);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
  const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
  lineSegments.raycast = () => {};
  const chunk = {
    mesh,
    lines: lineSegments,
    ranges,
    shade: Float32Array.from(shade),
    kind: Uint8Array.from(kind),
    owner: Int32Array.from(owner),
  };
  mesh.userData.chunk = chunk;
  return chunk;
}

// colourFor(buildingId, kind) -> [r, g, b] in 0..1, before shading.
export function recolour(chunks, colourFor) {
  for (const chunk of chunks) {
    const attr = chunk.mesh.geometry.getAttribute("color");
    const arr = attr.array;
    let lastId = -1;
    let cache = null;
    for (let i = 0; i < chunk.owner.length; i += 1) {
      const id = chunk.owner[i];
      if (id !== lastId) {
        cache = [colourFor(id, KIND_FLAT), colourFor(id, KIND_SLOPE), colourFor(id, KIND_WALL)];
        lastId = id;
      }
      const c = cache[chunk.kind[i]];
      const s = chunk.shade[i];
      arr[i * 3] = c[0] * s;
      arr[i * 3 + 1] = c[1] * s;
      arr[i * 3 + 2] = c[2] * s;
    }
    attr.needsUpdate = true;
  }
}

export function setClipping(built, planes) {
  built.fillMaterial.clippingPlanes = planes;
  built.lineMaterial.clippingPlanes = planes;
  built.fillMaterial.needsUpdate = true;
  built.lineMaterial.needsUpdate = true;
}
