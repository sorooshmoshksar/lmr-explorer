import * as THREE from "three";
import { CSS2DObject } from "three/addons/CSS2DRenderer.js";
import { BANDS, CONSTRAINTS, ZONES } from "../content/lmr-content.js";

const v3 = (p, h = 0) => new THREE.Vector3(p[0], h, -p[1]);

function shapeMesh(polygons, color, h, opacity = 1) {
  const geoms = polygons.map((poly) => {
    const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  });
  const material = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false });
  const group = new THREE.Group();
  for (const g of geoms) {
    const m = new THREE.Mesh(g, material);
    m.position.y = h;
    group.add(m);
  }
  return group;
}

function outline(polylines, color, h, closed = true, opacity = 1) {
  const pts = [];
  for (const line of polylines) {
    const n = closed ? line.length : line.length - 1;
    for (let i = 0; i < n; i += 1) {
      const a = line[i];
      const b = line[(i + 1) % line.length];
      pts.push(a[0], h, -a[1], b[0], h, -b[1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }));
  lines.raycast = () => {};
  return lines;
}

function ribbon(points, half, color, h) {
  const pos = [];
  const idx = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const [x, y] = points[i];
    pos.push(x - ty * half, h, -(y + tx * half), x + ty * half, h, -(y - tx * half));
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, depthWrite: false, side: THREE.DoubleSide }));
}

export function buildBase(suburb) {
  const { area } = suburb;
  const group = new THREE.Group();
  const w = area.x1 - area.x0;
  const d = area.y1 - area.y0;
  const cx = (area.x0 + area.x1) / 2;
  const cy = (area.y0 + area.y1) / 2;
  const plinthH = 14;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, plinthH, d), new THREE.MeshBasicMaterial({ color: 0xf3f3f1, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
  plinth.position.set(cx, -plinthH / 2 - 0.02, -cy);
  const plinthEdges = new THREE.LineSegments(new THREE.EdgesGeometry(plinth.geometry), new THREE.LineBasicMaterial({ color: 0x8d969b }));
  plinthEdges.position.copy(plinth.position);
  plinthEdges.raycast = () => {};
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(cx, 0, -cy);
  top.name = "ground";
  group.add(plinth, plinthEdges, top);

  const areaColours = { golf: 0xeaf1e1, park: 0xe6f0dc, bush: 0xdfe9d8, school: 0xf1eff5, civic: 0xf2eef6 };
  for (const a of suburb.areas) group.add(shapeMesh([a.polygon], areaColours[a.kind] || 0xf0f0f0, 0.03));
  group.add(shapeMesh(suburb.carparks, 0xefefed, 0.04));
  group.add(outline(suburb.areas.filter((a) => a.kind !== "civic").map((a) => a.polygon), 0xb7c2b3, 0.06));
  for (const f of suburb.fairways) group.add(ribbon(f, 24, 0xf3f8ee, 0.05));
  group.add(outline([suburb.sportsField], 0xa7b2a5, 0.07));
  const { centre: oc, rx, ry, rotation } = suburb.oval;
  const oval = [];
  for (let i = 0; i < 64; i += 1) {
    const a = (i / 64) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    oval.push([oc[0] + x * Math.cos(rotation) - y * Math.sin(rotation), oc[1] + x * Math.sin(rotation) + y * Math.cos(rotation)]);
  }
  group.add(outline([oval], 0xa7b2a5, 0.07));
  for (const creek of suburb.creeks) group.add(ribbon(creek.points, 3, 0xbcd3e6, 0.08));

  for (const road of suburb.roads) {
    const colour = road.kind === "arterial" ? 0xe1e4e6 : road.kind === "collector" ? 0xe6e8ea : 0xebedee;
    group.add(ribbon(road.points, road.half - 1.2, colour, 0.1));
  }
  for (const f of suburb.footpaths) group.add(ribbon(f, 1.2, 0xe9e5dc, 0.09));
  return group;
}

export function buildLotLines(suburb) {
  return outline(suburb.lots.map((l) => l.poly), 0xc3c9cc, 0.3);
}

export function buildZoning(suburb) {
  const pos = [];
  const col = [];
  const c = new THREE.Color();
  for (const lot of suburb.lots) {
    c.set(ZONES[lot.zone]?.colour || "#ffffff");
    const [a, b, d, e] = lot.poly;
    for (const p of [a, b, d, a, d, e]) {
      pos.push(p[0], 0.12, -p[1]);
      col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
  const group = new THREE.Group();
  group.add(mesh);
  for (const a of suburb.areas) {
    if (!ZONES[a.zone] || a.kind === "civic") continue;
    group.add(shapeMesh([a.polygon], ZONES[a.zone].colour, 0.11, 0.6));
  }
  group.add(shapeMesh(suburb.centre.polygons, ZONES.E1.colour, 0.11, 0.7));
  return group;
}

// A canvas-textured plane covering the study area.
class CanvasLayer {
  constructor(area, h, opacity, pxPerMetre = 0.8) {
    this.area = area;
    this.scale = pxPerMetre;
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round((area.x1 - area.x0) * pxPerMetre);
    this.canvas.height = Math.round((area.y1 - area.y0) * pxPerMetre);
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    const geometry = new THREE.PlaneGeometry(area.x1 - area.x0, area.y1 - area.y0);
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, opacity, depthWrite: false }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set((area.x0 + area.x1) / 2, h, -(area.y0 + area.y1) / 2);
    this.mesh.raycast = () => {};
  }
  px(p) {
    return [(p[0] - this.area.x0) * this.scale, (this.area.y1 - p[1]) * this.scale];
  }
  path(points, closed = true) {
    const { ctx } = this;
    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, y] = this.px(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (closed) ctx.closePath();
  }
  done() {
    this.texture.needsUpdate = true;
  }
}

function hatch(colour, spacing = 9, cross = false, width = 1.6) {
  const c = document.createElement("canvas");
  c.width = spacing;
  c.height = spacing;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(-1, spacing + 1);
  ctx.lineTo(spacing + 1, -1);
  if (cross) {
    ctx.moveTo(-1, -1);
    ctx.lineTo(spacing + 1, spacing + 1);
  }
  ctx.stroke();
  return c;
}

// Draws a region given by drawFn(layer, grow): opaque edge, light tint fill and hatching.
function paintRegion(layer, colour, drawFn, { cross = false, tint = 0.22, edge = 2.2, spacing = 9 } = {}) {
  const tmp = document.createElement("canvas");
  tmp.width = layer.canvas.width;
  tmp.height = layer.canvas.height;
  const sub = Object.create(layer);
  sub.ctx = tmp.getContext("2d");
  const ctx = sub.ctx;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  drawFn(sub, edge);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tmp.width, tmp.height);
  const inner = document.createElement("canvas");
  inner.width = tmp.width;
  inner.height = tmp.height;
  const sub2 = Object.create(layer);
  sub2.ctx = inner.getContext("2d");
  sub2.ctx.lineJoin = "round";
  sub2.ctx.lineCap = "round";
  sub2.ctx.fillStyle = "#000";
  sub2.ctx.strokeStyle = "#000";
  drawFn(sub2, 0);
  sub2.ctx.globalCompositeOperation = "source-in";
  const c = new THREE.Color(colour);
  sub2.ctx.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${tint})`;
  sub2.ctx.fillRect(0, 0, inner.width, inner.height);
  sub2.ctx.globalCompositeOperation = "source-atop";
  sub2.ctx.fillStyle = sub2.ctx.createPattern(hatch(colour, spacing, cross), "repeat");
  sub2.ctx.fillRect(0, 0, inner.width, inner.height);
  // Edge ring = outer shape minus inner shape.
  const ring = document.createElement("canvas");
  ring.width = tmp.width;
  ring.height = tmp.height;
  const rctx = ring.getContext("2d");
  const sub3 = Object.create(layer);
  sub3.ctx = rctx;
  rctx.lineJoin = "round";
  rctx.lineCap = "round";
  rctx.fillStyle = colour;
  rctx.strokeStyle = colour;
  drawFn(sub3, edge);
  rctx.globalCompositeOperation = "destination-out";
  rctx.drawImage(inner, 0, 0);
  rctx.fillStyle = "#000";
  rctx.strokeStyle = "#000";
  drawFn(sub3, 0);
  layer.ctx.drawImage(inner, 0, 0);
  layer.ctx.drawImage(ring, 0, 0);
}

const polyRegion = (polys) => (layer, grow) => {
  const { ctx } = layer;
  for (const poly of polys) {
    layer.path(poly);
    ctx.fill();
    if (grow > 0) {
      ctx.lineWidth = grow * 2;
      ctx.stroke();
    }
  }
};
const bufferRegion = (lines, halfMetres, closed = false, fill = false) => (layer, grow) => {
  const { ctx } = layer;
  for (const line of lines) {
    layer.path(line, closed);
    ctx.lineWidth = 2 * (halfMetres * layer.scale + grow);
    ctx.stroke();
    if (fill && closed) ctx.fill();
  }
};

export function buildBandLayers(suburb) {
  const { area, walk } = suburb;
  const inBand = (v, low, high) => v <= high && (v > low || low === 0);
  const make = (low, high, colour) => {
    const layer = new CanvasLayer(area, 0.2, 1, 0.8);
    const { ctx } = layer;
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    ctx.lineCap = "round";
    for (const road of suburb.roads) {
      ctx.lineWidth = 2 * road.half * layer.scale;
      for (let i = 0; i < road.points.length - 1; i += 1) {
        const a = road.points[i];
        const b = road.points[i + 1];
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (!inBand(walk.at(mid), low, high) || suburb.inCentre(mid)) continue;
        layer.path([a, b], false);
        ctx.stroke();
      }
    }
    ctx.lineWidth = 1;
    for (const lot of suburb.lots) {
      if (!/^R/.test(lot.zone) || !inBand(lot.walk, low, high)) continue;
      layer.path(lot.poly);
      ctx.fill();
      ctx.stroke();
    }
    layer.mesh.material.opacity = 0.45;
    layer.done();
    return layer;
  };
  return {
    inner: make(0, 400, BANDS.inner.colour),
    outer: make(400, 800, BANDS.outer.colour),
  };
}

export function buildCentreLayer(suburb) {
  const group = new THREE.Group();
  group.add(shapeMesh(suburb.centre.polygons, BANDS.centre.colour, 0.33, 0.28));
  group.add(outline(suburb.centre.polygons, 0x283982, 0.36));
  return group;
}

export function buildConstraintLayers(suburb) {
  const g = suburb.constraintGeometry;
  const layers = {};
  const mk = (h) => new CanvasLayer(suburb.area, h, 0.75, 0.9);

  const bushfire = mk(0.24);
  paintRegion(bushfire, CONSTRAINTS.bushfire.colour, (layer, grow) => {
    const { ctx } = layer;
    for (const poly of g.bushPolys) {
      layer.path(poly);
      ctx.fill();
      ctx.lineWidth = 2 * (g.bushBuffer * layer.scale + grow);
      ctx.stroke();
    }
  }, { cross: true, tint: 0.16, spacing: 10 });
  bushfire.done();
  layers.bushfire = bushfire;

  const flood = mk(0.25);
  paintRegion(flood, CONSTRAINTS.flood.colour, (layer, grow) => {
    bufferRegion(g.creeks.map((c) => c.points), g.floodHalf)(layer, grow);
    bufferRegion([g.overland], g.overlandHalf)(layer, grow);
  }, { tint: 0.28, spacing: 7 });
  flood.done();
  layers.flood = flood;

  const heritage = mk(0.26);
  paintRegion(heritage, CONSTRAINTS.heritageArea.colour, polyRegion([g.hca]), { tint: 0.14, spacing: 12 });
  paintRegion(heritage, CONSTRAINTS.heritageItem.colour, polyRegion([...g.heritageLots.map((l) => l.poly), g.churchSite]), { cross: true, tint: 0.35, spacing: 6, edge: 1.6 });
  heritage.done();
  layers.heritage = heritage;

  const bio = mk(0.27);
  paintRegion(bio, CONSTRAINTS.biodiversity.colour, polyRegion([...g.bushPolys, ...g.remnants]), { tint: 0.18, spacing: 11 });
  bio.done();
  layers.biodiversity = bio;

  const easement = mk(0.28);
  paintRegion(easement, CONSTRAINTS.easement.colour, bufferRegion([g.easementLine], g.easementHalf), { tint: 0.2, spacing: 8 });
  const { ctx } = easement;
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = CONSTRAINTS.easement.colour;
  ctx.lineWidth = 2;
  easement.path(g.easementLine, false);
  ctx.stroke();
  easement.done();
  layers.easement = easement;

  return layers;
}

export function buildTrees(suburb) {
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const offsets = new Float32Array(suburb.trees.length * 3);
  const radii = new Float32Array(suburb.trees.length);
  suburb.trees.forEach(([x, y, r, h], i) => {
    offsets[i * 3] = x;
    offsets[i * 3 + 1] = h * 1.1;
    offsets[i * 3 + 2] = -y;
    radii[i] = r;
  });
  quad.setAttribute("offset", new THREE.InstancedBufferAttribute(offsets, 3));
  quad.setAttribute("radius", new THREE.InstancedBufferAttribute(radii, 1));
  quad.instanceCount = suburb.trees.length;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      fill: { value: new THREE.Color(0xfbfcf9) },
      line: { value: new THREE.Color(0x8a968a) },
    },
    vertexShader: `
      attribute vec3 offset;
      attribute float radius;
      varying vec2 vUv;
      void main() {
        vUv = position.xy;
        vec4 mv = modelViewMatrix * vec4(offset, 1.0);
        mv.xy += position.xy * radius;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 fill;
      uniform vec3 line;
      varying vec2 vUv;
      void main() {
        float r = length(vUv);
        if (r > 1.0) discard;
        float w = fwidth(r);
        float ring = smoothstep(1.0 - w * 2.0, 1.0 - w * 0.6, r);
        float inner = (1.0 - smoothstep(w * 0.4, w * 1.4, abs(r - 0.52))) * 0.28;
        vec3 c = mix(mix(fill, line, inner), line, ring);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(quad, material);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return mesh;
}

export function buildLabels(suburb) {
  const group = new THREE.Group();
  const objects = [];
  for (const label of suburb.labels) {
    const el = document.createElement("div");
    el.className = `map-label map-label--${label.kind}`;
    el.innerHTML = label.sub ? `<strong>${label.text}</strong><span>${label.sub}</span>` : label.text;
    const obj = new CSS2DObject(el);
    obj.position.copy(v3(label.at, label.kind === "centre" ? 26 : 4));
    obj.userData.kind = label.kind;
    group.add(obj);
    objects.push(obj);
  }
  return { group, objects };
}

export function lotHighlight(color) {
  const fill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  const line = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, depthWrite: false }));
  const group = new THREE.Group();
  group.add(fill, line);
  group.visible = false;
  fill.raycast = () => {};
  line.raycast = () => {};
  return {
    group,
    set(poly) {
      if (!poly) {
        group.visible = false;
        return;
      }
      const [a, b, c, d] = poly;
      const h = 0.4;
      const tri = [a, b, c, a, c, d].flatMap((p) => [p[0], h, -p[1]]);
      fill.geometry.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3));
      line.geometry.setAttribute("position", new THREE.Float32BufferAttribute(poly.flatMap((p) => [p[0], h + 0.05, -p[1]]), 3));
      fill.geometry.computeBoundingSphere();
      line.geometry.computeBoundingSphere();
      group.visible = true;
    },
  };
}
