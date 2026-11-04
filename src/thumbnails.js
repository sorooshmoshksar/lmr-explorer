import * as THREE from "three";
import { BUILDING_TYPES } from "../content/lmr-content.js";
import { createRng } from "./geom.js";
import { buildBuildingChunks, recolour, KIND_WALL } from "./buildings3d.js";
import { typeParts } from "./suburb.js";

const DEMO_LOT = {
  detached: [17, 40], semi: [17, 38], dual: [18, 42], terraces: [32, 30], townhouses: [34, 56], multi: [32, 52],
  manor: [21, 40], lowrise: [26, 42], rfb: [44, 46], midrise: [50, 54], shoptop: [36, 26],
};

const mixWhite = (hex, k) => {
  const c = new THREE.Color(hex);
  return [c.r + (1 - c.r) * k, c.g + (1 - c.g) * k, c.b + (1 - c.b) * k];
};

// Returns { [typeId]: { axo: dataURL, plan: dataURL } }.
export function renderThumbnails(width = 320, height = 210) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(2);
  renderer.setSize(width, height);
  const out = {};
  for (const type of BUILDING_TYPES) {
    const [F, D] = DEMO_LOT[type.id];
    const rng = createRng(7);
    let parts;
    if (type.id === "shoptop") {
      parts = [
        { u: F / 2, v: D / 2 - 1, w: F - 1, d: D - 4, h: 4.6, roof: "flat" },
        { u: F / 2, v: 8.5, w: F - 2.5, d: 13, h: 4 * 3.1, z: 4.6, roof: "flat" },
      ];
    } else {
      parts = typeParts(type.id, F, D, rng).parts;
    }
    const building = { id: 0, parts: parts.map((p) => ({ ...p, c: [p.u - F / 2, p.v - D / 2], angle: 0 })) };
    const built = buildBuildingChunks([building], { lineColor: 0x384046 });
    const roof = mixWhite(type.colour, 0.55);
    const wall = mixWhite(type.colour, 0.3);
    recolour(built.chunks, (_, kind) => (kind === KIND_WALL ? wall : roof));
    const scene = new THREE.Scene();
    scene.add(built.group);
    const lot = [[-F / 2, -D / 2], [F / 2, -D / 2], [F / 2, D / 2], [-F / 2, D / 2]];
    const pts = [];
    lot.forEach((a, i) => {
      const b = lot[(i + 1) % 4];
      pts.push(a[0], 0.05, -a[1], b[0], 0.05, -b[1]);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x9aa3a8 })));
    const street = new THREE.Mesh(new THREE.PlaneGeometry(F + 16, 7), new THREE.MeshBasicMaterial({ color: 0xe8eaeb }));
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0, D / 2 + 5);
    scene.add(street);

    const size = Math.max(F, D) * 0.78 + 6;
    const camera = new THREE.OrthographicCamera(-size * (width / height), size * (width / height), size, -size, -500, 500);
    camera.position.set(-90, 95, 120);
    camera.lookAt(0, 6, 0);
    camera.zoom = 1.75;
    camera.updateProjectionMatrix();
    renderer.setClearColor(0xffffff, 0);
    renderer.render(scene, camera);
    const axo = renderer.domElement.toDataURL("image/png");

    const plan = new THREE.OrthographicCamera(-size * (width / height), size * (width / height), size, -size, -500, 500);
    plan.position.set(0, 200, 0);
    plan.up.set(0, 0, -1);
    plan.lookAt(0, 0, 0);
    plan.zoom = 1.5;
    plan.updateProjectionMatrix();
    renderer.render(scene, plan);
    out[type.id] = { axo, plan: renderer.domElement.toDataURL("image/png") };
    built.group.traverse((o) => o.geometry?.dispose());
  }
  renderer.dispose();
  return out;
}
