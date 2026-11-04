export function createRng(seed) {
  let state = seed | 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.between = (a, b) => a + (b - a) * next();
  next.pick = (weights) => {
    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    let r = next() * total;
    for (const [value, w] of weights) {
      r -= w;
      if (r <= 0) return value;
    }
    return weights.at(-1)[0];
  };
  return next;
}

export const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const len = (a) => Math.hypot(a[0], a[1]);
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

export function centroid(points) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

export function pointInPolygon([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
}

export function distanceToPolyline(p, line, closed = false) {
  let best = Infinity;
  const n = closed ? line.length : line.length - 1;
  for (let i = 0; i < n; i += 1) best = Math.min(best, distanceToSegment(p, line[i], line[(i + 1) % line.length]));
  return best;
}

export function smoothPath(points, samplesPerSegment = 12) {
  const out = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t
        + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
        + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(points.at(-1));
  return out;
}

export function resample(points, step) {
  const s = sampler(points);
  const out = [];
  const count = Math.max(1, Math.round(s.total / step));
  for (let i = 0; i <= count; i += 1) out.push(s.at((s.total * i) / count).p);
  return out;
}

export function sampler(points) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const length = dist(a, b);
    if (length < 1e-6) continue;
    segments.push({ a, b, length, start: total });
    total += length;
  }
  let cursor = 0;
  const at = (s) => {
    if (!segments.length) return { p: points[0], t: [1, 0] };
    if (cursor >= segments.length || s < segments[cursor].start) cursor = 0;
    while (cursor < segments.length - 1 && s > segments[cursor].start + segments[cursor].length) cursor += 1;
    const seg = segments[cursor];
    const f = Math.min(1, Math.max(0, (s - seg.start) / seg.length));
    const t = [(seg.b[0] - seg.a[0]) / seg.length, (seg.b[1] - seg.a[1]) / seg.length];
    return { p: lerp(seg.a, seg.b, f), t };
  };
  return { total, at, empty: segments.length === 0 };
}

export function bufferPolyline(points, halfWidth) {
  const s = sampler(points);
  const left = [];
  const right = [];
  const steps = Math.max(2, Math.ceil(s.total / 8));
  for (let i = 0; i <= steps; i += 1) {
    const { p, t } = s.at((s.total * i) / steps);
    const w = typeof halfWidth === "function" ? halfWidth(i / steps) : halfWidth;
    left.push([p[0] - t[1] * w, p[1] + t[0] * w]);
    right.push([p[0] + t[1] * w, p[1] - t[0] * w]);
  }
  return left.concat(right.reverse());
}

export function blob(centre, rx, ry, rotation, rng, wobble = 0.12, count = 48) {
  const phases = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const r = 1 + wobble * (Math.sin(a * 2 + phases[0]) * 0.6 + Math.sin(a * 3 + phases[1]) * 0.3 + Math.sin(a * 5 + phases[2]) * 0.2);
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r;
    points.push([
      centre[0] + x * Math.cos(rotation) - y * Math.sin(rotation),
      centre[1] + x * Math.sin(rotation) + y * Math.cos(rotation),
    ]);
  }
  return points;
}

export function segmentIntersection(a, b, c, d) {
  const r = sub(b, a);
  const s = sub(d, c);
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-9) return null;
  const q = sub(c, a);
  const t = (q[0] * s[1] - q[1] * s[0]) / denom;
  const u = (q[0] * r[1] - q[1] * r[0]) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { point: add(a, r, t), t, u };
}
