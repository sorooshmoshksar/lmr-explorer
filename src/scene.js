import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/CSS2DRenderer.js";
import { buildBuildingChunks, recolour, setClipping } from "./buildings3d.js";
import {
  buildBandLayers, buildBase, buildCentreLayer, buildConstraintLayers, buildLabels, buildLotLines, buildTrees, buildZoning, lotHighlight,
} from "./layers.js";

const AXO_POLAR = 0.98;
const PLAN_POLAR = 0.0001;

export class MapScene {
  constructor(container, suburb, beforeBuildings) {
    this.container = container;
    this.suburb = suburb;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xf6f5f1);
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = "label-layer";
    container.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 8000);
    this.viewHeight = 1500;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.screenSpacePanning = false;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.minZoom = 0.6;
    this.controls.maxZoom = 14;
    this.controls.zoomToCursor = true;
    this.controls.maxPolarAngle = 1.2;
    this.controls.addEventListener("change", () => this.requestRender());

    this.base = buildBase(suburb);
    this.zoning = buildZoning(suburb);
    this.zoning.visible = false;
    this.lotLines = buildLotLines(suburb);
    this.bands = buildBandLayers(suburb);
    this.centreLayer = buildCentreLayer(suburb);
    this.constraintLayers = buildConstraintLayers(suburb);
    this.trees = buildTrees(suburb);
    this.labels = buildLabels(suburb);
    this.after = buildBuildingChunks(suburb.buildings);
    this.before = buildBuildingChunks(beforeBuildings);
    this.before.group.visible = false;
    this.lotSelect = lotHighlight(0xe4572e);
    this.lotHover = lotHighlight(0x1d3557);
    this.lotHover.group.children[0].material.opacity = 0.08;

    this.scene.add(this.base, this.zoning, this.lotLines, this.bands.inner.mesh, this.bands.outer.mesh, this.centreLayer);
    for (const layer of Object.values(this.constraintLayers)) this.scene.add(layer.mesh);
    this.scene.add(this.after.group, this.before.group, this.trees, this.labels.group, this.lotSelect.group, this.lotHover.group);

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.split = null;
    this.clipA = new THREE.Plane();
    this.clipB = new THREE.Plane();

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.setView({ target: [-40, 40], zoom: 1, azimuth: -0.6, polar: AXO_POLAR }, false);
    this.requestRender();
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    const aspect = w / h;
    const half = this.viewHeight / 2;
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  requestRender() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.render();
    });
  }

  render() {
    const zoom = this.camera.zoom;
    for (const obj of this.labels.objects) {
      const kind = obj.userData.kind;
      obj.visible = this.labelsOn && (kind === "centre" || kind === "park" || zoom > 1.5 || (kind === "road" && zoom > 1.1));
    }
    if (this.split !== null) this.updateClip();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    if (this.onRender) this.onRender();
  }

  setLayer(id, on) {
    const map = {
      inner: this.bands.inner.mesh,
      outer: this.bands.outer.mesh,
      centre: this.centreLayer,
      zoning: this.zoning,
      trees: this.trees,
      lots: this.lotLines,
      ...Object.fromEntries(Object.entries(this.constraintLayers).map(([k, v]) => [k, v.mesh])),
    };
    if (id === "labels") this.labelsOn = on;
    else if (map[id]) map[id].visible = on;
    this.requestRender();
  }

  recolour(colourFor, beforeColourFor) {
    recolour(this.after.chunks, colourFor);
    recolour(this.before.chunks, beforeColourFor || colourFor);
    this.requestRender();
  }

  // ---------- views ----------
  currentView() {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const s = new THREE.Spherical().setFromVector3(offset);
    return { target: [this.controls.target.x, -this.controls.target.z], zoom: this.camera.zoom, azimuth: s.theta, polar: s.phi };
  }

  setView(view, animate = true) {
    const from = this.currentViewSafe();
    const to = { ...from, ...view };
    if (view.azimuth !== undefined) {
      let d = to.azimuth - from.azimuth;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      to.azimuth = from.azimuth + d;
    }
    const apply = (v) => {
      const target = new THREE.Vector3(v.target[0], 0, -v.target[1]);
      const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(3000, v.polar, v.azimuth));
      this.controls.target.copy(target);
      this.camera.position.copy(target).add(offset);
      this.camera.zoom = v.zoom;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(target);
      this.controls.update();
      this.requestRender();
    };
    if (!animate) {
      apply(to);
      return;
    }
    const t0 = performance.now();
    const dur = 750;
    cancelAnimationFrame(this.anim);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      const mix = (a, b) => a + (b - a) * e;
      apply({
        target: [mix(from.target[0], to.target[0]), mix(from.target[1], to.target[1])],
        zoom: Math.exp(mix(Math.log(from.zoom), Math.log(to.zoom))),
        azimuth: mix(from.azimuth, to.azimuth),
        polar: mix(from.polar, to.polar),
      });
      if (k < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }

  currentViewSafe() {
    if (!this.camera.position.lengthSq()) return { target: [0, 0], zoom: 1, azimuth: -0.6, polar: AXO_POLAR };
    return this.currentView();
  }

  rotate(dir) {
    const v = this.currentView();
    this.setView({ azimuth: v.azimuth + (dir * Math.PI) / 2 });
  }

  setPlan(plan) {
    this.setView({ polar: plan ? PLAN_POLAR : AXO_POLAR });
  }

  zoomBy(f) {
    this.setView({ zoom: Math.min(14, Math.max(0.6, this.camera.zoom * f)) }, true);
  }

  focus(point, zoom) {
    this.setView({ target: point, zoom: zoom ?? Math.max(this.camera.zoom, 3) });
  }

  // ---------- picking ----------
  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const showing = this.before.group.visible && this.split === null ? this.before : this.after;
    const hits = this.raycaster.intersectObjects(showing.chunks.map((c) => c.mesh), false);
    let building = null;
    for (const hit of hits) {
      if (this.split !== null && !this.clipKeeps(hit.point, showing === this.after)) continue;
      const chunk = hit.object.userData.chunk;
      building = chunk.owner[hit.face.a];
      break;
    }
    const ground = new THREE.Vector3();
    const ok = this.raycaster.ray.intersectPlane(this.groundPlane, ground);
    return { building, beforeLayer: showing === this.before, point: ok ? [ground.x, -ground.z] : null };
  }

  // ---------- before / after split ----------
  setSplit(value) {
    this.split = value;
    if (value === null) {
      setClipping(this.after, []);
      setClipping(this.before, []);
      this.before.group.visible = false;
      this.after.group.visible = true;
    } else {
      this.before.group.visible = true;
      this.after.group.visible = true;
      setClipping(this.before, [this.clipA]);
      setClipping(this.after, [this.clipB]);
    }
    this.requestRender();
  }

  showBeforeOnly(on) {
    this.split = null;
    setClipping(this.after, []);
    setClipping(this.before, []);
    this.before.group.visible = on;
    this.after.group.visible = !on;
    this.requestRender();
  }

  updateClip() {
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const halfWidth = (this.camera.right - this.camera.left) / 2 / this.camera.zoom;
    const origin = this.controls.target.clone().addScaledVector(right, this.split * halfWidth);
    // Before shows on the left of the divider, after on the right.
    this.clipA.setFromNormalAndCoplanarPoint(right.clone().negate(), origin);
    this.clipB.setFromNormalAndCoplanarPoint(right.clone(), origin);
  }

  clipKeeps(point, isAfter) {
    const plane = isAfter ? this.clipB : this.clipA;
    return plane.distanceToPoint(point) >= 0;
  }

  screenOf(p, h = 0) {
    const v = new THREE.Vector3(p[0], h, -p[1]).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return [((v.x + 1) / 2) * rect.width, ((1 - v.y) / 2) * rect.height];
  }
}
