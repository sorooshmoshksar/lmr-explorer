import {
  add, blob, bufferPolyline, centroid, createRng, dist, distanceToPolyline, lerp, pointInPolygon,
  polygonArea, sampler, segmentIntersection, smoothPath, sub,
} from "./geom.js";

export const AREA = { x0: -1300, x1: 1300, y0: -1150, y1: 1150 };
const CELL = 2;
const ROAD = 1;
const BLOCK = 2;
const LOT = 4;

const STREET_NAMES_EW = ["Wattle", "Lilly Pilly", "Grevillea", "Bottlebrush", "Waratah", "Kurrajong", "Boronia", "Tallowwood",
  "Blackbutt", "Coachwood", "Ironbark", "Turpentine", "Angophora", "Sassafras", "Callicoma", "Lomandra", "Correa",
  "Dianella", "Kunzea", "Hakea", "Melaleuca", "Leptospermum", "Westringia", "Brachychiton", "Ceratopetalum", "Doryanthes",
  "Eremophila", "Flindersia", "Gahnia", "Isopogon", "Jacksonia"];
const STREET_NAMES_NS = ["Rosedale", "Killara", "Mona", "Cowan", "Berowra", "Hornsby", "Pymble", "Gordon", "Lindfield",
  "Roseville", "Wahroonga", "Turramurra", "Warrawee", "Bobbin", "Duffy", "Kissing Point", "Ryde"];
const SUFFIX = ["Street", "Avenue", "Road", "Crescent", "Place", "Parade", "Close"];

const FRONTAGE = {
  detached: [15, 19], semi: [16, 18], dual: [16, 20], manor: [19, 23], terraces: [26, 36], townhouses: [30, 40],
  multi: [28, 36], lowrise: [22, 28], rfb: [34, 46], midrise: [42, 55],
};
const MAX_DEPTH = {
  detached: 42, semi: 40, dual: 44, manor: 42, terraces: 32, townhouses: 58, multi: 54, lowrise: 44, rfb: 48, midrise: 54,
};
const DWELLINGS = {
  detached: 1, semi: 2, dual: 2, manor: 4, terraces: 0, townhouses: 0, multi: 0, lowrise: 9, rfb: 24, midrise: 48, shoptop: 16,
};

function warp([x, y]) {
  return [
    x + 26 * Math.sin(y / 180 + 1.3) + 14 * Math.sin((x + y) / 300),
    y + 20 * Math.sin(x / 230 + 0.4) + 10 * Math.cos((x - y) / 210),
  ];
}

export function generateSuburb(seed = 280225) {
  const rng = createRng(seed);
  const W = Math.ceil((AREA.x1 - AREA.x0) / CELL);
  const H = Math.ceil((AREA.y1 - AREA.y0) / CELL);
  const flags = new Uint8Array(W * H);
  const lotGrid = new Int32Array(W * H).fill(-1);
  const cellOf = (x, y) => {
    const ix = Math.floor((x - AREA.x0) / CELL);
    const iy = Math.floor((y - AREA.y0) / CELL);
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return -1;
    return iy * W + ix;
  };
  const markDisc = (x, y, r, flag) => {
    const c0 = Math.floor((x - r - AREA.x0) / CELL);
    const c1 = Math.floor((x + r - AREA.x0) / CELL);
    const r0 = Math.floor((y - r - AREA.y0) / CELL);
    const r1 = Math.floor((y + r - AREA.y0) / CELL);
    for (let iy = Math.max(0, r0); iy <= Math.min(H - 1, r1); iy += 1) {
      for (let ix = Math.max(0, c0); ix <= Math.min(W - 1, c1); ix += 1) {
        const cx = AREA.x0 + (ix + 0.5) * CELL;
        const cy = AREA.y0 + (iy + 0.5) * CELL;
        if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) flags[iy * W + ix] |= flag;
      }
    }
  };
  const rasterize = (poly, fn) => {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of poly) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    const r0 = Math.max(0, Math.floor((minY - AREA.y0) / CELL));
    const r1 = Math.min(H - 1, Math.floor((maxY - AREA.y0) / CELL));
    for (let iy = r0; iy <= r1; iy += 1) {
      const y = AREA.y0 + (iy + 0.5) * CELL;
      const xs = [];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
        const a = poly[j];
        const b = poly[i];
        if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] - AREA.x0) / CELL - 0.5));
        const c1 = Math.min(W - 1, Math.floor((xs[k + 1] - AREA.x0) / CELL - 0.5));
        for (let ix = c0; ix <= c1; ix += 1) fn(iy * W + ix);
      }
    }
  };

  // ---------- main roads ----------
  const arterial = smoothPath([[-1400, -1060], [-760, -600], [-300, -170], [-20, -25], [280, 110], [760, 470], [1400, 980]], 18);
  const collectorN = smoothPath([[-20, -25], [-55, 300], [-90, 700], [-120, 1250]], 18);
  const collectorS = smoothPath([[-20, -25], [60, -400], [120, -800], [150, -1250]], 18);
  const mainRoads = [
    { name: "Kurrajong Road", kind: "arterial", half: 11, points: arterial },
    { name: "Village Parade", kind: "collector", half: 8.5, points: collectorN },
    { name: "Reserve Road", kind: "collector", half: 8.5, points: collectorS },
  ];

  // ---------- town centre (E1) ----------
  const art = sampler(arterial);
  const sOf = (target) => {
    let best = 0;
    let bestD = Infinity;
    for (let s = 0; s < art.total; s += 2) {
      const d = dist(art.at(s).p, target);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  };
  const artFrame = (s, side) => {
    const { p, t } = art.at(s);
    return { p, t, n: side > 0 ? [-t[1], t[0]] : [t[1], -t[0]] };
  };
  const stripPolygon = (s0, s1, side, v0, v1) => {
    const near = [];
    const far = [];
    for (let s = s0; s <= s1 + 0.01; s += (s1 - s0) / 20) {
      const { p, n } = artFrame(s, side);
      near.push(add(p, n, v0));
      far.push(add(p, n, v1));
    }
    return near.concat(far.reverse());
  };
  const sJunction = sOf([-20, -25]);
  const centreNorth = stripPolygon(sOf([-260, -150]), sOf([170, 60]), 1, 12, 150);
  const centreSouth = stripPolygon(sOf([170, 60]), sOf([340, 150]), -1, 12, 96);
  const centrePolys = [centreNorth, centreSouth];
  const inCentre = (p) => centrePolys.some((poly) => pointInPolygon(p, poly));
  const distToCentre = (p) => (inCentre(p) ? 0 : Math.min(...centrePolys.map((poly) => distanceToPolyline(p, poly, true))));

  // ---------- open space, bush and creeks ----------
  const westCreek = smoothPath([[-1400, 760], [-1080, 560], [-900, 300], [-760, 40], [-700, -260], [-560, -520], [-300, -760], [-60, -960], [200, -1250]], 10);
  const eastCreek = smoothPath([[1400, 380], [1120, 240], [980, -60], [1040, -420], [900, -760], [1000, -1250]], 10);
  const creeks = [
    { name: "Banksia Creek", points: westCreek },
    { name: "Kooringa Creek", points: eastCreek },
  ];
  const areas = [];
  const golf = blob([-640, -40], 330, 205, 0.3, rng, 0.1);
  const green = blob([150, 290], 105, 78, -0.2, rng, 0.06);
  const reserve = blob([-420, -720], 300, 165, -0.45, rng, 0.14);
  const schoolCentre = [560, -280];
  const schoolPoly = rotatedRect(schoolCentre, 180, 125, 0.17);
  const bushWest = bufferPolyline(westCreek, (f) => 58 + 16 * Math.sin(f * 17));
  const bushEast = bufferPolyline(eastCreek, (f) => 52 + 14 * Math.sin(f * 13 + 1));
  const remnants = [blob([700, 760], 68, 48, 0.4, rng, 0.15), blob([-560, 540], 55, 42, -0.3, rng, 0.15)];
  const churchCentre = [365, 452];
  const churchSite = rotatedRect(churchCentre, 46, 34, 0.17);
  const hca = rotatedRect([470, 520], 300, 175, 0.17);
  areas.push({ kind: "golf", name: "Banksia Creek Golf Club", zone: "RE2", polygon: golf });
  areas.push({ kind: "bush", name: "Waratah Ridge Reserve", zone: "C2", polygon: reserve });
  areas.push({ kind: "bush", name: "Banksia Creek bushland", zone: "C2", polygon: bushWest });
  areas.push({ kind: "bush", name: "Kooringa Creek bushland", zone: "C2", polygon: bushEast });
  areas.push({ kind: "park", name: "Village Green", zone: "RE1", polygon: green });
  areas.push({ kind: "school", name: "Banksia Creek Public School", zone: "SP2", polygon: schoolPoly });
  areas.push({ kind: "civic", name: "St Andrew's Church", zone: "R2", polygon: churchSite });
  const bushPolys = [reserve, bushWest, bushEast];
  const noRoadPolys = [golf, green, reserve, schoolPoly, bushWest, bushEast, ...centrePolys];

  const easementLine = [[-1400, 880], [1400, 640]];
  const overland = smoothPath([[230, -330], [430, -470], [660, -610], [900, -700]], 10);

  // ---------- local street grid ----------
  const theta = 0.1745;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const raw = new Map();
  const rawNode = (i, j) => {
    const key = `${i},${j}`;
    if (!raw.has(key)) {
      const u = i * 205 + rng.between(-12, 12);
      const v = j * 92 + rng.between(-8, 8);
      raw.set(key, [u * cos - v * sin, u * sin + v * cos]);
    }
    return raw.get(key);
  };
  const nearMain = (p) => mainRoads.some((r) => distanceToPolyline(p, r.points) < 26);
  const gridEdges = [];
  const addGridEdge = (i0, j0, i1, j1, name) => {
    const a = rawNode(i0, j0);
    const b = rawNode(i1, j1);
    const points = [];
    for (let k = 0; k <= 8; k += 1) points.push(warp(k === 0 ? a : k === 8 ? b : lerp(a, b, k / 8)));
    const margin = 120;
    if (points.every(([x, y]) => x < AREA.x0 - margin || x > AREA.x1 + margin || y < AREA.y0 - margin || y > AREA.y1 + margin)) return;
    if (points.some((p) => noRoadPolys.some((poly) => pointInPolygon(p, poly)))) return;
    const crosses = mainRoads.some((r) => crossesLine(points, r.points));
    if (!crosses) {
      const near = points.map(nearMain);
      if (near.filter(Boolean).length > 2) return;
      for (const [end, prev] of [[0, 1], [points.length - 1, points.length - 2]]) {
        if (!near[end]) continue;
        const road = mainRoads.find((r) => distanceToPolyline(points[end], r.points) < 26);
        const q = nearestOnPolyline(points[end], road.points);
        const dir = sub(q, points[prev]);
        const l = Math.hypot(dir[0], dir[1]) || 1;
        points[end] = add(q, dir, 1.5 / l);
      }
    }
    if (points.some((p) => pointInPolygon(p, churchSite))) return;
    gridEdges.push({ name, kind: "local", half: 6.5, points });
  };
  for (let j = -15; j <= 15; j += 1) {
    const ew = `${STREET_NAMES_EW[(j + 15) % STREET_NAMES_EW.length]} ${SUFFIX[(j + 30) % 4]}`;
    for (let i = -8; i < 8; i += 1) if (rng() > 0.05) addGridEdge(i, j, i + 1, j, ew);
  }
  for (let i = -8; i <= 8; i += 1) {
    const ns = `${STREET_NAMES_NS[(i + 8) % STREET_NAMES_NS.length]} ${SUFFIX[(i + 16) % 7]}`;
    for (let j = -15; j < 15; j += 1) if (rng() > 0.33) addGridEdge(i, j, i, j + 1, ns);
  }
  const roads = [...mainRoads, ...gridEdges];
  insertIntersections(roads, mainRoads.length);

  // ---------- footpaths through open space ----------
  const footpaths = [
    smoothPath([[60, 230], [150, 290], [250, 350]], 8),
    smoothPath([[150, 200], [150, 290], [140, 380]], 8),
    smoothPath([[60, -560], [-200, -640], [-420, -720], [-640, -820]], 8),
    smoothPath([[-330, -190], [-500, 40], [-700, 160]], 8),
    smoothPath([[-560, -520], [-480, -380], [-330, -260]], 8),
  ];

  // ---------- rasterise ----------
  for (const road of roads) {
    const s = sampler(road.points);
    for (let d = 0; d <= s.total; d += 1) {
      const { p } = s.at(d);
      markDisc(p[0], p[1], road.half, ROAD);
    }
  }
  for (const poly of [...noRoadPolys, churchSite]) rasterize(poly, (c) => { flags[c] |= BLOCK; });

  // ---------- walking network ----------
  const walk = computeWalk([...roads.map((r) => r.points), ...footpaths], centrePolys, inCentre);

  // ---------- zoning ----------
  const r3Patch = blob([520, 60], 150, 105, 0.3, rng, 0.08);
  const r1Patch = blob([-360, 420], 130, 90, -0.2, rng, 0.08);
  const zoneAt = (p) => {
    if (inCentre(p)) return "E1";
    const cell = cellOf(p[0], p[1]);
    if (cell < 0 || flags[cell] & BLOCK) {
      for (const a of areas) if (a.kind !== "civic" && pointInPolygon(p, a.polygon)) return a.zone;
    }
    if (pointInPolygon(p, hca)) return "R2";
    const d = distToCentre(p);
    if (d < 150) return "R4";
    const dArt = distanceToPolyline(p, arterial);
    const dCol = Math.min(distanceToPolyline(p, collectorN), distanceToPolyline(p, collectorS));
    if (d < 360 && (dArt < 120 || dCol < 90)) return "R3";
    if (pointInPolygon(p, r3Patch)) return "R3";
    if (pointInPolygon(p, r1Patch)) return "R1";
    return "R2";
  };

  // ---------- constraints ----------
  const bushDist = distanceField(bushPolys, 4);
  const constraintsAt = (p) => {
    const out = [];
    const bd = bushDist.at(p);
    if (bd < 70) out.push("bushfire");
    if (creeks.some((c) => distanceToPolyline(p, c.points) < 42) || distanceToPolyline(p, overland) < 17) out.push("flood");
    if (pointInPolygon(p, hca)) out.push("heritageArea");
    if (bd <= 0 || remnants.some((r) => pointInPolygon(p, r))) out.push("biodiversity");
    if (distanceToPolyline(p, easementLine) < 15) out.push("easement");
    return out;
  };

  // ---------- centre buildings and lots ----------
  const lots = [];
  const buildings = [];
  const addBuilding = (type, lotId, parts, extra = {}) => {
    const id = buildings.length;
    const height = Math.max(...parts.map((p) => p.h + (p.z || 0)));
    buildings.push({ id, type, lotId, parts, height, ...extra });
    return id;
  };
  const addLot = (lot) => {
    lot.id = lots.length;
    lots.push(lot);
    rasterize(lot.poly, (c) => {
      flags[c] |= LOT;
      lotGrid[c] = lot.id;
    });
    return lot;
  };
  const makeFrame = (origin, u, v) => ({
    origin, u, v,
    toWorld: (lu, lv) => [origin[0] + u[0] * lu + v[0] * lv, origin[1] + u[1] * lu + v[1] * lv],
  });
  const partsToWorld = (frame, parts) => parts.map((part) => ({
    ...part,
    c: frame.toWorld(part.u, part.v),
    angle: Math.atan2(frame.u[1], frame.u[0]),
  }));

  const centreStrip = (s0, s1, side, depth, kindFn) => {
    let s = s0;
    while (s < s1 - 18) {
      const F = Math.min(s1 - s, rng.between(28, 40));
      const a = artFrame(s, side);
      const b = artFrame(s + F, side);
      const mid = artFrame(s + F / 2, side);
      if ([a.p, b.p, mid.p].some((p) => mainRoads.slice(1).some((r) => distanceToPolyline(p, r.points) < 14))) {
        s += 6;
        continue;
      }
      const front = [add(a.p, a.n, 12), add(b.p, b.n, 12)];
      const poly = [front[0], front[1], add(b.p, b.n, 12 + depth), add(a.p, a.n, 12 + depth)];
      const u = sub(front[1], front[0]);
      const ul = Math.hypot(u[0], u[1]);
      const frame = makeFrame(front[0], [u[0] / ul, u[1] / ul], mid.n);
      const lot = addLot({
        poly, front, frontage: ul, depth, area: Math.abs(polygonArea(poly)), zone: "E1", type: "shoptop",
        street: "Kurrajong Road", number: 0, walk: 0,
      });
      const storeys = kindFn();
      const parts = [
        { u: ul / 2, v: depth / 2 - 1, w: ul - 1, d: depth - 4, h: 4.6, roof: "flat", role: "podium" },
        { u: ul / 2, v: 8.5, w: ul - 2.5, d: 13, h: (storeys - 1) * 3.1, z: 4.6, roof: "flat" },
      ];
      lot.frame = { origin: frame.origin, u: frame.u, v: frame.v };
      lot.buildingId = addBuilding("shoptop", lot.id, partsToWorld(frame, parts), { storeys });
      s += F;
    }
  };
  const sCentreN0 = sOf([-260, -150]);
  const sCentreN1 = sOf([170, 60]);
  centreStrip(sCentreN0 + 4, sCentreN1 - 4, 1, 24, () => (rng() < 0.5 ? 5 : 6));
  centreStrip(sCentreN1 + 4, sOf([340, 150]) - 4, -1, 22, () => (rng() < 0.5 ? 4 : 5));

  // Shopping centre, car parks and supermarket.
  const mall = artFrame(sJunction - 135, 1);
  const mallFrame = makeFrame(mall.p, mall.t, mall.n);
  const nonRes = [];
  nonRes.push({ kind: "retail", name: "Shopping Village", parts: partsToWorld(mallFrame, [
    { u: 0, v: 86, w: 200, d: 84, h: 11, roof: "flat" },
    { u: -40, v: 86, w: 60, d: 50, h: 4, z: 11, roof: "flat" },
  ]) });
  const deck = artFrame(sJunction + 70, 1);
  const deckFrame = makeFrame(deck.p, deck.t, deck.n);
  nonRes.push({ kind: "retail", name: "Village car park deck", parts: partsToWorld(deckFrame, [
    { u: 0, v: 88, w: 80, d: 70, h: 7.5, roof: "flat" },
  ]) });
  const smkt = artFrame((sCentreN1 + sOf([340, 150])) / 2, -1);
  const smktFrame = makeFrame(smkt.p, smkt.t, smkt.n);
  nonRes.push({ kind: "retail", name: "Supermarket", parts: partsToWorld(smktFrame, [
    { u: 0, v: 64, w: 90, d: 46, h: 8.5, roof: "flat" },
  ]) });
  const carparks = [
    stripPolygon(sJunction + 16, sJunction + 30, 1, 40, 140),
    stripPolygon(sJunction + 112, sCentreN1 - 6, 1, 40, 140),
  ];
  const schoolFrame = makeFrame(schoolCentre, [cosA(0.17), sinA(0.17)], [-sinA(0.17), cosA(0.17)]);
  nonRes.push({ kind: "school", name: "Banksia Creek Public School", parts: partsToWorld(schoolFrame, [
    { u: -55, v: 30, w: 60, d: 14, h: 7, roof: "flat" },
    { u: -10, v: 30, w: 14, d: 34, h: 7, roof: "flat" },
    { u: 40, v: 36, w: 50, d: 12, h: 4, roof: "hip" },
  ]) });
  const sportsField = rotatedRect(add(schoolCentre, [-6, -22]), 120, 56, 0.17);
  const churchFrame = makeFrame(churchCentre, [cosA(0.17), sinA(0.17)], [-sinA(0.17), cosA(0.17)]);
  nonRes.push({ kind: "church", name: "St Andrew's Church", parts: partsToWorld(churchFrame, [
    { u: 0, v: 0, w: 26, d: 11, h: 7, roof: "hip" },
    { u: -15, v: 0, w: 5, d: 5, h: 18, roof: "hip" },
  ]) });
  const golfFrame = makeFrame([-420, 120], [1, 0], [0, 1]);
  nonRes.push({ kind: "clubhouse", name: "Golf clubhouse", parts: partsToWorld(golfFrame, [
    { u: 0, v: 0, w: 34, d: 16, h: 6.5, roof: "hip" },
  ]) });
  for (const b of nonRes) addBuilding(b.kind, -1, b.parts, { name: b.name });

  // ---------- residential lots ----------
  const walkAt = (p) => walk.at(p);
  const free = (p) => {
    const c = cellOf(p[0], p[1]);
    return c >= 0 && !(flags[c] & (ROAD | BLOCK | LOT));
  };
  const insideArea = (p) => p[0] > AREA.x0 + 4 && p[0] < AREA.x1 - 4 && p[1] > AREA.y0 + 4 && p[1] < AREA.y1 - 4;
  const streetNumbers = new Map();

  const tryPlace = (road, S, side, s, type, F) => {
    const A = S.at(s);
    const B = S.at(s + F);
    if (A.t[0] * B.t[0] + A.t[1] * B.t[1] < 0.82) return null;
    const nA = side > 0 ? [-A.t[1], A.t[0]] : [A.t[1], -A.t[0]];
    const nB = side > 0 ? [-B.t[1], B.t[0]] : [B.t[1], -B.t[0]];
    const a = add(A.p, nA, road.half + 0.5);
    const b = add(B.p, nB, road.half + 0.5);
    const nm = [nA[0] + nB[0], nA[1] + nB[1]];
    const nl = Math.hypot(nm[0], nm[1]);
    const n = [nm[0] / nl, nm[1] / nl];
    const maxD = MAX_DEPTH[type];
    let depth = maxD;
    const edge = Math.min(0.25, 2.5 / F);
    for (const f of [edge, 0.5, 1 - edge]) {
      const start = lerp(a, b, f);
      let d = 2.5;
      while (d < maxD && free(add(start, n, d))) d += 1;
      depth = Math.min(depth, d);
    }
    depth -= 1.5;
    const minDepth = type === "detached" || type === "semi" ? 20 : 26;
    if (depth < minDepth) return null;
    const poly = [a, b, add(b, nB, depth), add(a, nA, depth)];
    if (!poly.every(insideArea)) return null;
    let total = 0;
    let used = 0;
    rasterize(poly, (c) => {
      total += 1;
      if (flags[c] & (ROAD | BLOCK | LOT)) used += 1;
    });
    if (!total || used / total > 0.03) return null;
    return { poly, front: [a, b], depth, n };
  };

  for (const road of roads) {
    const S = sampler(road.points);
    if (S.empty) continue;
    for (const side of [1, -1]) {
      let s = 6;
      while (s < S.total - 12) {
        const { p, t } = S.at(s);
        const n = side > 0 ? [-t[1], t[0]] : [t[1], -t[0]];
        const probe = add(p, n, road.half + 12);
        if (!free(probe) || !insideArea(probe)) {
          s += 3;
          continue;
        }
        const zone = zoneAt(probe);
        if (!zone.startsWith("R")) {
          s += 3;
          continue;
        }
        const walkDist = walkAt(probe);
        const inHca = pointInPolygon(probe, hca);
        let type = chooseType(zone, walkDist, inHca, rng);
        let F = rng.between(...FRONTAGE[type]);
        let placed = s + F < S.total - 4 ? tryPlace(road, S, side, s, type, F) : null;
        if (!placed && type !== "detached") {
          type = "detached";
          F = rng.between(...FRONTAGE.detached);
          placed = s + F < S.total - 4 ? tryPlace(road, S, side, s, type, F) : null;
        }
        if (!placed) {
          s += 3;
          continue;
        }
        const key = `${road.name}|${side}`;
        const num = (streetNumbers.get(key) || 0) + 1;
        streetNumbers.set(key, num);
        const frontage = dist(placed.front[0], placed.front[1]);
        const u = sub(placed.front[1], placed.front[0]);
        const frame = makeFrame(placed.front[0], [u[0] / frontage, u[1] / frontage], placed.n);
        const lot = addLot({
          poly: placed.poly, front: placed.front, frontage, depth: placed.depth,
          area: Math.abs(polygonArea(placed.poly)), zone, type, street: road.name,
          number: num * 2 - (side > 0 ? 1 : 0), walk: walkDist,
        });
        lot.frame = { origin: frame.origin, u: frame.u, v: frame.v };
        const gen = typeParts(type, frontage, placed.depth, rng);
        lot.buildingId = addBuilding(type, lot.id, partsToWorld(frame, gen.parts), { storeys: gen.storeys, dwellings: gen.dwellings });
        lot.yard = gen.yard.map(([lu, lv]) => frame.toWorld(lu, lv));
        s += F;
      }
    }
  }

  // ---------- lot attributes ----------
  for (const lot of lots) {
    const c = centroid(lot.poly);
    lot.centre = c;
    const samples = [c, ...lot.poly.map((p) => lerp(p, c, 0.15))];
    const set = new Set();
    for (const p of samples) for (const k of constraintsAt(p)) set.add(k);
    lot.constraints = [...set];
    lot.frontMid = lerp(lot.front[0], lot.front[1], 0.5);
    if (lot.zone !== "E1") lot.walk = walk.at(lot.frontMid);
  }
  const hcaLots = lots.filter((l) => l.constraints.includes("heritageArea") && l.type === "detached");
  for (const lot of hcaLots) if (rng() < 0.22) lot.heritageItem = true;
  const westItem = lots.filter((l) => l.type === "detached" && dist(l.centre, [-430, 330]) < 140);
  if (westItem[0]) westItem[0].heritageItem = true;
  if (westItem[3]) westItem[3].heritageItem = true;
  for (const lot of lots) if (lot.heritageItem) lot.constraints.push("heritageItem");

  // ---------- trees ----------
  const trees = [];
  const treeOk = (p) => {
    const c = cellOf(p[0], p[1]);
    return c >= 0 && !(flags[c] & ROAD);
  };
  const occupiedByBuilding = buildingFootprintTest(buildings);
  for (const road of roads) {
    const S = sampler(road.points);
    for (let s = 6; s < S.total; s += 11) {
      if (rng() > 0.55) continue;
      const { p, t } = S.at(s);
      for (const side of [1, -1]) {
        if (rng() > 0.6) continue;
        const q = add(p, [-t[1] * side, t[0] * side], road.half - 1.6);
        if (!inCentre(q)) trees.push([q[0], q[1], rng.between(2.4, 3.6), rng.between(6, 10)]);
      }
    }
  }
  for (const lot of lots) {
    if (!lot.yard) continue;
    for (const q of lot.yard) if (!occupiedByBuilding(q)) trees.push([q[0], q[1], rng.between(2.6, 4.4), rng.between(7, 13)]);
  }
  const mask = new Uint8Array(W * H);
  const scatter = (poly, spacing, prob, rMin, rMax, avoid) => {
    let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    for (const [x, y] of poly) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const cells = [];
    rasterize(poly, (c) => { mask[c] = 1; cells.push(c); });
    for (let y = minY; y < maxY; y += spacing) {
      for (let x = minX; x < maxX; x += spacing) {
        if (rng() > prob) continue;
        const p = [x + rng.between(-0.45, 0.45) * spacing, y + rng.between(-0.45, 0.45) * spacing];
        const c = cellOf(p[0], p[1]);
        if (c < 0 || !mask[c] || !treeOk(p) || (avoid && avoid(p))) continue;
        trees.push([p[0], p[1], rng.between(rMin, rMax), rng.between(9, 17)]);
      }
    }
    for (const c of cells) mask[c] = 0;
  };
  for (const poly of bushPolys) scatter(poly, 8.5, 0.92, 3.2, 5.6);
  for (const poly of remnants) scatter(poly, 10, 0.7, 3.2, 5.2, occupiedByBuilding);
  const fairways = [
    smoothPath([[-900, -120], [-700, -10], [-480, 40], [-360, 10]], 10),
    smoothPath([[-820, -230], [-620, -170], [-420, -120]], 10),
    smoothPath([[-760, 110], [-560, 140], [-430, 70]], 10),
  ];
  scatter(golf, 13, 0.55, 3.2, 5.2, (p) => fairways.some((f) => distanceToPolyline(p, f) < 26) || dist(p, [-420, 120]) < 30);
  scatter(green, 16, 0.4, 3, 4.8, (p) => ((p[0] - 150) / 62) ** 2 + ((p[1] - 290) / 44) ** 2 < 1 || footpaths.slice(0, 2).some((f) => distanceToPolyline(p, f) < 4));
  scatter(schoolPoly, 15, 0.3, 2.8, 4.2, (p) => pointInPolygon(p, sportsField) || occupiedByBuilding(p));

  // ---------- labels ----------
  const labels = [
    { text: "Shopping Village", sub: "LMR town centre", at: mall.p ? add(mall.p, mall.n, 86) : [0, 0], kind: "centre" },
    { text: "Kurrajong Road", at: art.at(sOf([-600, -480])).p, kind: "road" },
    { text: "Kurrajong Road", at: art.at(sOf([700, 430])).p, kind: "road" },
    { text: "Village Parade", at: [-80, 620], kind: "road" },
    { text: "Reserve Road", at: [95, -620], kind: "road" },
    { text: "Village Green", at: [150, 290], kind: "park" },
    { text: "Banksia Creek Golf Club", at: [-640, -40], kind: "park" },
    { text: "Waratah Ridge Reserve", at: [-430, -730], kind: "park" },
    { text: "Banksia Creek", at: [-890, 300], kind: "water" },
    { text: "Kooringa Creek", at: [1000, -100], kind: "water" },
    { text: "Banksia Creek Public School", at: schoolCentre, kind: "civic" },
    { text: "Heritage conservation area", at: [520, 560], kind: "heritage" },
  ];

  const lotAt = (p) => {
    const c = cellOf(p[0], p[1]);
    return c >= 0 && lotGrid[c] >= 0 ? lots[lotGrid[c]] : null;
  };
  const areaAt = (p) => areas.find((a) => pointInPolygon(p, a.polygon)) || null;

  return {
    area: AREA,
    roads,
    footpaths,
    creeks,
    areas,
    carparks,
    sportsField,
    oval: { centre: [150, 290], rx: 62, ry: 44, rotation: -0.2 },
    fairways,
    centre: { name: "Shopping Village", polygons: centrePolys },
    lots,
    buildings,
    trees,
    labels,
    zonesExtra: { r3Patch, r1Patch },
    constraintGeometry: {
      bushPolys, bushBuffer: 70, creeks, floodHalf: 42, overland, overlandHalf: 17, hca, remnants, easementLine, easementHalf: 15,
      heritageLots: lots.filter((l) => l.heritageItem), churchSite,
    },
    walk,
    zoneAt,
    constraintsAt,
    lotAt,
    areaAt,
    inCentre,
    stats: { lots: lots.length, buildings: buildings.length, trees: trees.length, roads: roads.length },
  };
}

function cosA(a) { return Math.cos(a); }
function sinA(a) { return Math.sin(a); }

function rotatedRect([cx, cy], w, h, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

function nearestOnPolyline(p, line) {
  let best = line[0];
  let bestD = Infinity;
  for (let i = 0; i < line.length - 1; i += 1) {
    const a = line[i];
    const b = line[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const q = [a[0] + dx * t, a[1] + dy * t];
    const d = dist(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

function crossesLine(points, line) {
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let k = 0; k < line.length - 1; k += 1) if (segmentIntersection(points[i], points[i + 1], line[k], line[k + 1])) return true;
  }
  return false;
}

function insertIntersections(roads, mainCount) {
  const inserts = roads.map(() => []);
  for (let m = 0; m < mainCount; m += 1) {
    const main = roads[m].points;
    for (let r = m + 1; r < roads.length; r += 1) {
      const other = roads[r].points;
      for (let i = 0; i < main.length - 1; i += 1) {
        const a = main[i];
        const b = main[i + 1];
        for (let k = 0; k < other.length - 1; k += 1) {
          const c = other[k];
          const d = other[k + 1];
          if (Math.max(c[0], d[0]) < Math.min(a[0], b[0]) || Math.min(c[0], d[0]) > Math.max(a[0], b[0])) continue;
          if (Math.max(c[1], d[1]) < Math.min(a[1], b[1]) || Math.min(c[1], d[1]) > Math.max(a[1], b[1])) continue;
          const hit = segmentIntersection(a, b, c, d);
          if (!hit || (hit.u < 1e-6 && k > 0) || (hit.t < 1e-6 && i > 0)) continue;
          if (dist(hit.point, c) < 0.6 || dist(hit.point, d) < 0.6) {
            const end = dist(hit.point, c) < 0.6 ? c : d;
            inserts[m].push({ seg: i, t: hit.t, point: end });
            continue;
          }
          inserts[m].push({ seg: i, t: hit.t, point: hit.point });
          inserts[r].push({ seg: k, t: hit.u, point: hit.point });
        }
      }
    }
  }
  roads.forEach((road, r) => {
    if (!inserts[r].length) return;
    const out = [];
    for (let i = 0; i < road.points.length; i += 1) {
      out.push(road.points[i]);
      const here = inserts[r].filter((h) => h.seg === i).sort((a, b) => a.t - b.t);
      for (const h of here) out.push(h.point);
    }
    road.points = out;
  });
}

function computeWalk(lines, centrePolys, inCentre) {
  const nodes = [];
  const index = new Map();
  const adj = [];
  const key = (p) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
  const nodeOf = (p) => {
    const k = key(p);
    if (!index.has(k)) {
      index.set(k, nodes.length);
      nodes.push(p);
      adj.push([]);
    }
    return index.get(k);
  };
  const snapTargets = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const a = nodeOf(line[i]);
      const b = nodeOf(line[i + 1]);
      if (a === b) continue;
      const w = dist(line[i], line[i + 1]);
      adj[a].push([b, w]);
      adj[b].push([a, w]);
    }
    snapTargets.push(nodeOf(line[0]), nodeOf(line.at(-1)));
  }
  // Snap footpath ends to the nearest street node.
  for (const t of snapTargets) {
    if (adj[t].length > 1) continue;
    let best = -1;
    let bestD = 60;
    for (let i = 0; i < nodes.length; i += 1) {
      if (i === t) continue;
      const d = dist(nodes[i], nodes[t]);
      if (d < bestD && d > 0.01) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      adj[t].push([best, bestD]);
      adj[best].push([t, bestD]);
    }
  }
  const d = new Float64Array(nodes.length).fill(Infinity);
  const heap = [];
  const push = (n, v) => {
    heap.push([v, n]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  nodes.forEach((p, i) => {
    if (inCentre(p) || centrePolys.some((poly) => distanceToPolyline(p, poly, true) < 25)) {
      d[i] = 0;
      push(i, 0);
    }
  });
  while (heap.length) {
    const [v, n] = pop();
    if (v > d[n]) continue;
    for (const [m, w] of adj[n]) {
      if (v + w < d[m]) {
        d[m] = v + w;
        push(m, v + w);
      }
    }
  }
  const cell = 4;
  const nx = Math.ceil((AREA.x1 - AREA.x0) / cell);
  const ny = Math.ceil((AREA.y1 - AREA.y0) / cell);
  const field = new Float32Array(nx * ny).fill(Infinity);
  const reach = 40;
  const stamp = (p, value) => {
    const rc = Math.ceil(reach / cell);
    const cx = Math.floor((p[0] - AREA.x0) / cell);
    const cy = Math.floor((p[1] - AREA.y0) / cell);
    for (let iy = Math.max(0, cy - rc); iy <= Math.min(ny - 1, cy + rc); iy += 1) {
      for (let ix = Math.max(0, cx - rc); ix <= Math.min(nx - 1, cx + rc); ix += 1) {
        const x = AREA.x0 + (ix + 0.5) * cell;
        const y = AREA.y0 + (iy + 0.5) * cell;
        if ((x - p[0]) ** 2 + (y - p[1]) ** 2 > reach * reach) continue;
        const k = iy * nx + ix;
        if (value < field[k]) field[k] = value;
      }
    }
  };
  for (let n = 0; n < nodes.length; n += 1) {
    for (const [m, w] of adj[n]) {
      if (m < n || !Number.isFinite(d[n]) || !Number.isFinite(d[m])) continue;
      const steps = Math.max(1, Math.ceil(w / 3));
      for (let s = 0; s <= steps; s += 1) {
        const f = s / steps;
        const p = lerp(nodes[n], nodes[m], f);
        stamp(p, Math.min(d[n] + w * f, d[m] + w * (1 - f)));
      }
    }
  }
  for (const poly of centrePolys) scanFill(poly, cell, nx, ny, (k) => { field[k] = 0; });
  return {
    cell, nx, ny, field, nodes, nodeDist: d,
    at: (p) => {
      const ix = Math.floor((p[0] - AREA.x0) / cell);
      const iy = Math.floor((p[1] - AREA.y0) / cell);
      if (ix < 0 || iy < 0 || ix >= nx || iy >= ny) return Infinity;
      return field[iy * nx + ix];
    },
  };
}

function distanceField(polys, cell) {
  const nx = Math.ceil((AREA.x1 - AREA.x0) / cell);
  const ny = Math.ceil((AREA.y1 - AREA.y0) / cell);
  const big = 1e9;
  const f = new Float32Array(nx * ny).fill(big);
  for (const poly of polys) scanFill(poly, cell, nx, ny, (k) => { f[k] = 0; });
  const a = cell;
  const b = cell * Math.SQRT2;
  for (let iy = 0; iy < ny; iy += 1) {
    for (let ix = 0; ix < nx; ix += 1) {
      const k = iy * nx + ix;
      let v = f[k];
      if (ix > 0) v = Math.min(v, f[k - 1] + a);
      if (iy > 0) {
        v = Math.min(v, f[k - nx] + a);
        if (ix > 0) v = Math.min(v, f[k - nx - 1] + b);
        if (ix < nx - 1) v = Math.min(v, f[k - nx + 1] + b);
      }
      f[k] = v;
    }
  }
  for (let iy = ny - 1; iy >= 0; iy -= 1) {
    for (let ix = nx - 1; ix >= 0; ix -= 1) {
      const k = iy * nx + ix;
      let v = f[k];
      if (ix < nx - 1) v = Math.min(v, f[k + 1] + a);
      if (iy < ny - 1) {
        v = Math.min(v, f[k + nx] + a);
        if (ix < nx - 1) v = Math.min(v, f[k + nx + 1] + b);
        if (ix > 0) v = Math.min(v, f[k + nx - 1] + b);
      }
      f[k] = v;
    }
  }
  return {
    at: (p) => {
      const ix = Math.floor((p[0] - AREA.x0) / cell);
      const iy = Math.floor((p[1] - AREA.y0) / cell);
      if (ix < 0 || iy < 0 || ix >= nx || iy >= ny) return big;
      return f[iy * nx + ix];
    },
  };
}

function scanFill(poly, cell, nx, ny, fn) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  const r0 = Math.max(0, Math.floor((minY - AREA.y0) / cell));
  const r1 = Math.min(ny - 1, Math.floor((maxY - AREA.y0) / cell));
  for (let iy = r0; iy <= r1; iy += 1) {
    const y = AREA.y0 + (iy + 0.5) * cell;
    const xs = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
      const a = poly[j];
      const b = poly[i];
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - AREA.x0) / cell - 0.5));
      const c1 = Math.min(nx - 1, Math.floor((xs[k + 1] - AREA.x0) / cell - 0.5));
      for (let ix = c0; ix <= c1; ix += 1) fn(iy * nx + ix);
    }
  }
}

function buildingFootprintTest(buildings) {
  const boxes = [];
  for (const b of buildings) {
    for (const part of b.parts) {
      boxes.push({ c: part.c, a: part.angle, hw: part.w / 2 + 1.5, hd: part.d / 2 + 1.5 });
    }
  }
  const bucket = new Map();
  const size = 40;
  const keyOf = (x, y) => `${Math.floor(x / size)},${Math.floor(y / size)}`;
  for (const box of boxes) {
    const r = Math.hypot(box.hw, box.hd);
    for (let x = box.c[0] - r; x <= box.c[0] + r + size; x += size) {
      for (let y = box.c[1] - r; y <= box.c[1] + r + size; y += size) {
        const k = keyOf(x, y);
        if (!bucket.has(k)) bucket.set(k, []);
        bucket.get(k).push(box);
      }
    }
  }
  return (p) => {
    const list = bucket.get(keyOf(p[0], p[1]));
    if (!list) return false;
    return list.some((box) => {
      const dx = p[0] - box.c[0];
      const dy = p[1] - box.c[1];
      const u = dx * Math.cos(box.a) + dy * Math.sin(box.a);
      const v = -dx * Math.sin(box.a) + dy * Math.cos(box.a);
      return Math.abs(u) < box.hw && Math.abs(v) < box.hd;
    });
  };
}

function chooseType(zone, walk, inHca, rng) {
  if (inHca) return rng.pick([["detached", 0.85], ["semi", 0.15]]);
  const band = walk <= 400 ? "inner" : walk <= 800 ? "outer" : "beyond";
  if (zone === "R4") {
    return rng.pick([["midrise", band === "inner" ? 0.55 : 0.08], ["rfb", 0.35], ["townhouses", 0.08], ["detached", 0.07]]);
  }
  if (zone === "R3") {
    return rng.pick([["rfb", 0.3], ["townhouses", 0.18], ["terraces", 0.14], ["multi", 0.1], ["manor", 0.08], ["lowrise", 0.08], ["detached", 0.2]]);
  }
  if (zone === "R1") {
    return rng.pick([["townhouses", 0.2], ["multi", 0.2], ["terraces", 0.15], ["lowrise", 0.15], ["dual", 0.1], ["detached", 0.2]]);
  }
  if (band === "inner") {
    return rng.pick([["detached", 0.45], ["dual", 0.12], ["semi", 0.06], ["terraces", 0.08], ["townhouses", 0.07], ["multi", 0.07], ["manor", 0.07], ["lowrise", 0.08]]);
  }
  if (band === "outer") {
    return rng.pick([["detached", 0.6], ["dual", 0.12], ["semi", 0.06], ["terraces", 0.07], ["townhouses", 0.06], ["multi", 0.06], ["manor", 0.03]]);
  }
  return rng.pick([["detached", 0.84], ["dual", 0.1], ["semi", 0.06]]);
}

// Parts are boxes in lot-local coordinates: u along the frontage, v away from the street.
export function typeParts(type, F, D, rng) {
  const parts = [];
  const yard = [];
  let storeys = 1;
  let dwellings = DWELLINGS[type] || 1;
  const hip = (u, v, w, d, h) => parts.push({ u, v, w, d, h, roof: "hip" });
  const flat = (u, v, w, d, h, z = 0) => parts.push({ u, v, w, d, h, z, roof: "flat" });
  const backYard = (vFrom, count) => {
    for (let i = 0; i < count; i += 1) {
      const v = rng.between(vFrom, D - 2.5);
      if (v > vFrom) yard.push([rng.between(2.5, F - 2.5), v]);
    }
  };
  switch (type) {
    case "detached": {
      storeys = rng() < 0.38 ? 2 : 1;
      const w = Math.min(F - 3, rng.between(10, 14));
      const d = Math.min(D - 16, rng.between(12, 17));
      const u = 1.5 + w / 2 + rng.between(0, F - 3 - w);
      hip(u, 7 + d / 2, w, d, storeys * 3.1);
      if (rng() < 0.55 && F - w > 6.5) flat(u + (u < F / 2 ? w / 2 + 2.2 : -w / 2 - 2.2), 9 + 3, 3.6, 6, 2.8);
      if (rng() < 0.25) flat(rng.between(3, F - 3), D - 3.5, 3, 2.6, 2.3);
      backYard(7 + d + 3, 3);
      break;
    }
    case "semi": {
      storeys = rng() < 0.6 ? 2 : 1;
      const w = (F - 2.4) / 2;
      const d = Math.min(D - 15, 14);
      hip(1.2 + w / 2, 6.5 + d / 2, w, d, storeys * 3.1);
      hip(1.2 + w * 1.5, 6.5 + d / 2, w, d, storeys * 3.1);
      backYard(6.5 + d + 3, 3);
      break;
    }
    case "dual": {
      storeys = 2;
      if (rng() < 0.6) {
        const w = (F - 2.6) / 2;
        const d = Math.min(D - 15, 16);
        hip(1.3 + w / 2, 6.5 + d / 2, w, d, 6.4);
        hip(1.3 + w * 1.5, 6.5 + d / 2, w, d, 6.4);
        backYard(6.5 + d + 3, 2);
      } else {
        const w = F - 4;
        hip(F / 2 + 0.5, 6.5 + 5.5, w, 11, 6.4);
        const back = Math.min(10, D - 30);
        if (back > 6) hip(F / 2 + 0.5, 6.5 + 11 + 6 + back / 2, w - 1, back, 3.2);
        else dwellings = 2;
        backYard(D - 4, 1);
      }
      break;
    }
    case "manor": {
      storeys = 2;
      const w = F - 4;
      const d = Math.min(D - 16, 16);
      hip(F / 2, 7 + d / 2, w, d, 6.4);
      flat(F / 2, 7 + d + 3.2, w * 0.5, 4, 2.6);
      backYard(7 + d + 6, 2);
      break;
    }
    case "terraces": {
      storeys = 2;
      const n = Math.max(3, Math.floor((F - 2) / 6));
      const w = (F - 2) / n;
      const d = Math.min(D - 12, 13);
      for (let i = 0; i < n; i += 1) hip(1 + w * (i + 0.5), 4.5 + d / 2, w, d, 6.4);
      dwellings = n;
      for (let i = 0; i < n; i += 1) if (rng() < 0.4) yard.push([1 + w * (i + 0.5), D - 3]);
      break;
    }
    case "townhouses": {
      storeys = 2;
      const rowW = Math.min(11, (F - 8) / 2);
      const unitD = 7;
      const n = Math.max(2, Math.floor((D - 9) / unitD));
      for (const u of [1 + rowW / 2, F - 1 - rowW / 2]) {
        for (let i = 0; i < n; i += 1) hip(u, 6 + unitD * (i + 0.5), rowW, unitD, 6.4);
      }
      dwellings = n * 2;
      yard.push([F / 2, D - 3]);
      break;
    }
    case "multi": {
      storeys = 1;
      const w = Math.min(F * 0.55, 14);
      const n = Math.max(3, Math.floor((D - 8) / 12));
      const step = (D - 8) / n;
      for (let i = 0; i < n; i += 1) hip(1.5 + w / 2, 6 + step * (i + 0.5), w, step - 3, 3.3);
      dwellings = n;
      for (let i = 0; i < n; i += 1) yard.push([rng.between(w + 6, F - 2.5), 6 + step * (i + 0.5)]);
      break;
    }
    case "lowrise": {
      storeys = 3;
      const w = F - 7;
      const d = Math.min(D - 14, 22);
      flat(F / 2, 7 + d / 2, w, d, 9.3);
      flat(F / 2, 7 + d / 2, w * 0.25, d * 0.3, 1.8, 9.3);
      dwellings = Math.round((w * d * 3 * 0.8) / 80);
      backYard(7 + d + 3, 2);
      break;
    }
    case "rfb": {
      storeys = 4;
      const d = Math.min(D - 16, 22);
      if (F > 40) {
        const w = (F - 12) / 2;
        flat(3 + w / 2, 8 + d / 2, w, d, 12.4);
        flat(F - 3 - w / 2, 8 + d / 2, w, d, 12.4);
        flat(F / 2, 8 + d / 2, 6, 8, 12.4);
      } else {
        flat(F / 2, 8 + d / 2, F - 8, d, 12.4);
      }
      dwellings = Math.round(((F - 8) * d * 4 * 0.8) / 80);
      backYard(8 + d + 3, 3);
      break;
    }
    case "midrise": {
      storeys = 6;
      const d = 18;
      flat(F / 2, 8 + d / 2, F - 8, d, 18.6);
      const back = D - 8 - d - 10;
      if (back > 8) flat(5 + 7, 8 + d + back / 2, 14, back, 15.5);
      flat(F / 2, 8 + d / 2, (F - 8) * 0.6, d * 0.6, 2.2, 18.6);
      dwellings = Math.round(((F - 8) * d * 6 * 0.8 + Math.max(0, back) * 14 * 5 * 0.8) / 80);
      backYard(8 + d + 3, 3);
      break;
    }
    default:
      hip(F / 2, D / 2, F - 4, D - 14, 3.1);
  }
  return { parts, yard, storeys, dwellings };
}
