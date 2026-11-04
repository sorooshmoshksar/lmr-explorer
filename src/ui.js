import {
  BANDS, BUILDING_TYPES, CATEGORIES, CONSTRAINTS, DISCLAIMER, DISCLAIMER_SECTIONS, GLOSSARY, HYPOTHETICAL_NOTE, LAST_CHECKED,
  MODULES, NON_RESIDENTIAL, SN_ARCHITECTS as SN, SOURCES, TOUR, TYPE_BY_ID, ZONES,
} from "../content/lmr-content.js";
import { bandOf, checkLot, standardFor } from "./rules.js";
import { KIND_FLAT, KIND_SLOPE } from "./buildings3d.js";

const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const TOUCH = matchMedia("(pointer: coarse)").matches;
const PHONE = matchMedia("(max-width: 640px)").matches;
const fmt = (n) => Math.round(n).toLocaleString("en-AU");
const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mixWhite = (hex, k) => hexRgb(hex).map((c) => c + (1 - c) * k);

const LAYERS = [
  { group: "LMR areas", items: [
    { id: "centre", label: "LMR town centre", swatch: BANDS.centre.colour, info: ["band", "centre"] },
    { id: "inner", label: "0–400 m walk", swatch: BANDS.inner.colour, info: ["band", "inner"] },
    { id: "outer", label: "400–800 m walk", swatch: BANDS.outer.colour, info: ["band", "outer"] },
  ] },
  { group: "Planning", items: [
    { id: "types", label: "Colour by building type", swatch: "linear-gradient(90deg,#e07a5f,#4f86c6,#3f8f7a)" },
    { id: "zoning", label: "Zoning", swatch: "linear-gradient(90deg,#fbefc9,#f2b880,#e48a5c)", info: ["zones"] },
    { id: "lots", label: "Lot boundaries", swatch: "#c3c9cc" },
  ] },
  { group: "Exclusions & constraints", items: [
    { id: "bushfire", label: "Bushfire-prone land", swatch: CONSTRAINTS.bushfire.colour, cat: "statutory", info: ["constraint", "bushfire"] },
    { id: "heritage", label: "Heritage items & area", swatch: CONSTRAINTS.heritageItem.colour, cat: "statutory", info: ["constraint", "heritageItem"] },
    { id: "flood", label: "Flood-prone land", swatch: CONSTRAINTS.flood.colour, cat: "assessment", info: ["constraint", "flood"] },
    { id: "biodiversity", label: "Biodiversity", swatch: CONSTRAINTS.biodiversity.colour, cat: "assessment", info: ["constraint", "biodiversity"] },
    { id: "easement", label: "Easement", swatch: CONSTRAINTS.easement.colour, cat: "design", info: ["constraint", "easement"] },
  ] },
  { group: "Map", items: [
    { id: "trees", label: "Trees", swatch: "#8a968a" },
    { id: "labels", label: "Labels", swatch: "#1d2731" },
  ] },
];
const OVERLAYS = ["centre", "inner", "outer", "types", "zoning", "bushfire", "heritage", "flood", "biodiversity", "easement"];

const VIEWS = {
  home: { target: [-40, 30], zoom: 1, polar: 0.98 },
  centre: { target: [-10, 40], zoom: 2.6, polar: 0.98 },
};

export class UI {
  constructor({ scene, suburb, beforeBuildings, thumbnails }) {
    this.scene = scene;
    this.suburb = suburb;
    this.beforeBuildings = beforeBuildings;
    this.thumbs = thumbnails;
    this.state = {
      layers: { centre: true, inner: true, outer: true, types: false, zoning: false, lots: true, bushfire: false, heritage: false, flood: false, biodiversity: false, easement: false, trees: true, labels: true },
      highlightType: null,
      selectedBuilding: null,
      selectedLot: null,
      checkType: "dual",
      mode: "after",
      thumbView: "axo",
    };
    this.progress = JSON.parse(localStorage.getItem("lmr-progress") || "{}");
    this.typeCounts = {};
    for (const b of suburb.buildings) this.typeCounts[b.type] = (this.typeCounts[b.type] || 0) + 1;

    this.buildSidebar();
    this.bindTopbar();
    this.bindMap();
    this.bindTools();
    $("#disclaimer-text").textContent = DISCLAIMER;
    const north = $(".north");
    this.scene.onRender = () => {
      const a = this.scene.screenOf([0, 0]);
      const b = this.scene.screenOf([0, 100]);
      north.style.transform = `rotate(${Math.atan2(b[0] - a[0], a[1] - b[1])}rad)`;
    };
    for (const [id, on] of Object.entries(this.state.layers)) this.scene.setLayer(id === "types" ? "_" : id, on);
    this.applyColours();
    this.renderLegend();
    this.showWelcome();
    if (PHONE) document.body.classList.remove("panel-open");
    this.requireDisclaimer();
  }

  // ---------- colours ----------
  applyColours() {
    const { buildings } = this.suburb;
    const s = this.state;
    const plain = [[1, 1, 1], [0.99, 0.99, 0.985], [0.975, 0.975, 0.97]];
    const accent = [[0.95, 0.42, 0.28], [0.93, 0.4, 0.26], [0.88, 0.36, 0.22]];
    const blue = [mixWhite(BANDS.centre.colour, 0.6), mixWhite(BANDS.centre.colour, 0.6), mixWhite(BANDS.centre.colour, 0.45)];
    const faded = [[1, 1, 1], [1, 1, 1], [0.985, 0.985, 0.98]];
    const typed = (type) => {
      const colour = TYPE_BY_ID[type]?.colour || NON_RESIDENTIAL[type]?.colour || "#9aa0a6";
      return [mixWhite(colour, 0.42), mixWhite(colour, 0.38), mixWhite(colour, 0.16)];
    };
    const pick = (type, selected) => {
      if (selected) return accent;
      if (s.highlightType) return type === s.highlightType ? typed(type) : faded;
      if (s.layers.types) return typed(type);
      if (s.layers.centre && (type === "shoptop" || type === "retail")) return blue;
      return plain;
    };
    const k = (set, kind) => (kind === KIND_FLAT ? set[0] : kind === KIND_SLOPE ? set[1] : set[2]);
    const selLot = s.selectedLot;
    this.scene.recolour(
      (id, kind) => k(pick(buildings[id].type, id === s.selectedBuilding), kind),
      (id, kind) => {
        const b = this.beforeBuildings[id];
        return k(pick(b.type, selLot !== null && b.lotId === selLot && s.selectedBuilding === null), kind);
      },
    );
  }

  // ---------- sidebar ----------
  buildSidebar() {
    const side = $("#sidebar");
    side.innerHTML = "";
    const nav = el(`<nav class="card nav-card" aria-label="Menu">
        <button data-act="learn"><b>Learning Centre</b><span>7 short modules</span></button>
        <button data-act="compare"><b>Compare types</b><span>Side by side</span></button>
        <button data-act="glossary"><b>Glossary</b><span>Planning terms</span></button>
        <button data-act="disclaimer"><b>Disclaimer</b><span>Read before use</span></button>
      </nav>`);
    const navActions = { learn: () => this.openLearning(), compare: () => this.openCompare(), glossary: () => this.openGlossary(), disclaimer: () => this.openDisclaimer() };
    nav.querySelectorAll("button").forEach((b) => {
      b.onclick = () => { document.body.classList.remove("sidebar-open"); navActions[b.dataset.act](); };
    });
    side.append(nav);
    side.append(el(`
      <section class="card intro">
        <p class="eyebrow">Start here</p>
        <h2>What is LMR?</h2>
        <p>The NSW Low and Mid-Rise Housing policy allows more types of homes, like terraces, townhouses and small apartment buildings, within walking distance of local centres and stations.</p>
        <div class="row">
          <button class="btn primary" data-act="tour">Take the tour</button>
          <button class="btn" data-act="module">Module 1</button>
        </div>
      </section>`));
    side.querySelector('[data-act="tour"]').onclick = () => this.startTour();
    side.querySelector('[data-act="module"]').onclick = () => this.openLearning("m1");
    const sn = el(`<section class="card sn-card">
        <img class="sn-card-logo" src="${SN.logo.fullWhite}" alt="${SN.name}" />
        <h3 class="sn-title">Have a real site in mind?</h3>
        <p>Find out what you could build on your own property. Our architects can assess your site under the LMR policy.</p>
        <div class="row">
          <a class="btn sn-primary" href="${SN.contactUrl}" target="_blank" rel="noopener">Get site advice</a>
          <button class="btn sn-ghost" data-act="sn">About us</button>
        </div>
      </section>`);
    sn.querySelector('[data-act="sn"]').onclick = () => this.openSnArchitects();
    side.append(sn);

    for (const group of LAYERS) {
      const sec = el(`<section class="card"><h3>${group.group}</h3><div class="layer-list"></div></section>`);
      const list = $(".layer-list", sec);
      for (const item of group.items) {
        const row = el(`
          <label class="layer" data-layer="${item.id}">
            <input type="checkbox" ${this.state.layers[item.id] ? "checked" : ""}>
            <span class="swatch${item.cat ? ` cat-${item.cat}` : ""}" style="background:${item.swatch}"></span>
            <span class="layer-name">${item.label}</span>
            ${item.info ? '<button class="info-btn" title="What is this?" aria-label="About this layer">i</button>' : ""}
          </label>`);
        $("input", row).onchange = (e) => this.setLayer(item.id, e.target.checked);
        if (item.info) {
          $(".info-btn", row).onclick = (e) => {
            e.preventDefault();
            this.showInfo(...item.info);
          };
        }
        list.append(row);
      }
      if (group.group === "Exclusions & constraints") {
        list.append(el(`<div class="cat-key">
          <span><i class="dot" style="background:${CATEGORIES.statutory.colour}"></i>Statutory exclusion</span>
          <span><i class="dot" style="background:${CATEGORIES.assessment.colour}"></i>Additional assessment</span>
          <span><i class="dot" style="background:${CATEGORIES.design.colour}"></i>Design constraint</span>
        </div>`));
      }
      side.append(sec);
    }

    const types = el(`<section class="card"><h3>Residential building types</h3><p class="hint">Click a type to highlight it on the map.</p><div class="type-list"></div></section>`);
    for (const t of BUILDING_TYPES) {
      const btn = el(`<button class="type-chip" data-type="${t.id}">
        <span class="swatch" style="background:${t.colour}"></span>
        <span class="type-name">${t.name}</span>
        <span class="count">${this.typeCounts[t.id] || 0}</span>
      </button>`);
      btn.onclick = () => this.highlightType(this.state.highlightType === t.id ? null : t.id, true);
      $(".type-list", types).append(btn);
    }
    side.append(types);

    const learn = el(`<section class="card"><h3>Learning Centre</h3><ol class="module-list"></ol></section>`);
    for (const m of MODULES) {
      const li = el(`<li><button class="link" data-m="${m.id}">${m.title}</button>${this.progress[m.id] ? '<span class="done" title="Completed">✓</span>' : ""}</li>`);
      $("button", li).onclick = () => this.openLearning(m.id);
      $(".module-list", learn).append(li);
    }
    side.append(learn);
  }

  setLayer(id, on, quiet = false) {
    this.state.layers[id] = on;
    const box = document.querySelector(`.layer[data-layer="${id}"] input`);
    if (box) box.checked = on;
    if (id === "types" || id === "centre") this.applyColours();
    if (id !== "types") this.scene.setLayer(id, on);
    if (!quiet) this.renderLegend();
  }

  applyLayerSet(list) {
    for (const id of OVERLAYS) this.setLayer(id, list.includes(id), true);
    this.renderLegend();
  }

  highlightType(id, focus = false) {
    this.state.highlightType = id;
    document.querySelectorAll(".type-chip").forEach((b) => b.classList.toggle("active", b.dataset.type === id));
    this.applyColours();
    this.renderLegend();
    if (id) {
      this.showType(id);
      if (focus) {
        const list = this.suburb.buildings.filter((b) => b.type === id);
        if (list.length) {
          const near = list.sort((a, b) => Math.hypot(...a.parts[0].c) - Math.hypot(...b.parts[0].c))[0];
          this.scene.focus(near.parts[0].c, Math.max(this.scene.camera.zoom, 2.2));
        }
      }
    }
  }

  // ---------- legend ----------
  renderLegend() {
    const L = this.state.layers;
    const rows = [];
    if (L.centre) rows.push(`<div><span class="sw" style="background:${BANDS.centre.colour};opacity:.6"></span>LMR town centre</div>`);
    if (L.inner) rows.push(`<div><span class="sw" style="background:${BANDS.inner.colour};opacity:.6"></span>0–400 m walk (inner)</div>`);
    if (L.outer) rows.push(`<div><span class="sw" style="background:${BANDS.outer.colour};opacity:.7"></span>400–800 m walk (outer)</div>`);
    const cons = [["bushfire", "bushfire"], ["heritage", "heritageItem"], ["heritage", "heritageArea"], ["flood", "flood"], ["biodiversity", "biodiversity"], ["easement", "easement"]];
    for (const [layer, id] of cons) {
      if (!L[layer]) continue;
      const c = CONSTRAINTS[id];
      rows.push(`<div><span class="sw hatch" style="--c:${c.colour}"></span>${c.name}<em class="cat cat-${c.category}">${CATEGORIES[c.category].label}</em></div>`);
    }
    if (L.types || this.state.highlightType) {
      const list = this.state.highlightType ? [TYPE_BY_ID[this.state.highlightType]] : BUILDING_TYPES;
      rows.push(`<div class="legend-sub">Building types</div>`);
      for (const t of list) rows.push(`<div><span class="sw" style="background:${t.colour}"></span>${t.name}</div>`);
    }
    if (L.zoning) {
      rows.push(`<div class="legend-sub">Zones</div>`);
      for (const z of ["R1", "R2", "R3", "R4", "E1", "RE1", "RE2", "C2"]) rows.push(`<div><span class="sw" style="background:${ZONES[z].colour}"></span>${ZONES[z].name}</div>`);
    }
    $("#legend").innerHTML = rows.length ? `<h4>Legend</h4>${rows.join("")}` : `<h4>Legend</h4><div class="muted">Turn on layers in the sidebar.</div>`;
    $("#legend").hidden = false;
  }

  // ---------- top bar ----------
  bindTopbar() {
    $("#btn-learn").onclick = () => this.openLearning(MODULES.find((m) => !this.progress[m.id])?.id || "m1");
    $("#btn-tour").onclick = () => this.startTour();
    $("#btn-compare").onclick = () => this.openCompare();
    $("#btn-glossary").onclick = () => this.openGlossary();
    $("#btn-sidebar").onclick = () => document.body.classList.toggle("sidebar-open");
    $("#map").addEventListener("pointerdown", () => document.body.classList.remove("sidebar-open"));
    $("#btn-disclaimer").onclick = () => this.openDisclaimer();
    $("#btn-sn").onclick = () => this.openSnArchitects();
    $("#footer-sn").onclick = () => this.openSnArchitects();
    $("#modal-close").onclick = () => this.closeModal();
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal" && !this.modalLocked) this.closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.modalLocked) return;
        if (!$("#modal").hidden) this.closeModal();
        else if (this.tourIndex !== undefined) this.endTour();
        else this.clearSelection();
      }
    });

    const input = $("#search");
    const results = $("#search-results");
    const index = [
      ...BUILDING_TYPES.map((t) => ({ label: t.name, kind: "Building type", run: () => this.highlightType(t.id, true) })),
      ...Object.values(CONSTRAINTS).map((c) => ({ label: c.name, kind: CATEGORIES[c.category].label, run: () => {
        const layer = c.id.startsWith("heritage") ? "heritage" : c.id;
        this.setLayer(layer, true);
        this.showInfo("constraint", c.id);
      } })),
      ...["centre", "inner", "outer", "beyond"].map((b) => ({ label: BANDS[b].name, kind: "LMR area", run: () => this.showInfo("band", b) })),
      ...MODULES.map((m, i) => ({ label: `Module ${i + 1}: ${m.title}`, kind: "Learning", run: () => this.openLearning(m.id) })),
      ...GLOSSARY.map(([term, def]) => ({ label: term, kind: "Glossary", run: () => this.openGlossary(term), def })),
      ...Object.entries(ZONES).map(([k, z]) => ({ label: z.name, kind: "Zone", run: () => { this.setLayer("zoning", true); this.showInfo("zones", k); } })),
      ...[...new Set(this.suburb.lots.map((l) => l.street))].map((street) => ({ label: street, kind: "Street", run: () => this.focusStreet(street) })),
    ];
    const run = (item) => {
      results.hidden = true;
      input.value = "";
      item.run();
    };
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        results.hidden = true;
        return;
      }
      const numMatch = q.match(/^(\d+)\s+(.+)$/);
      const hits = [];
      if (numMatch) {
        const lot = this.suburb.lots.find((l) => String(l.number) === numMatch[1] && l.street.toLowerCase().startsWith(numMatch[2]));
        if (lot) hits.push({ label: `${lot.number} ${lot.street}`, kind: "Address", run: () => this.selectLot(lot.id, true) });
      }
      hits.push(...index.filter((i) => i.label.toLowerCase().includes(q) || i.def?.toLowerCase().includes(q)).slice(0, 9));
      results.innerHTML = "";
      if (!hits.length) results.append(el(`<div class="muted pad">No matches. Try "terrace", "flood" or "FSR".</div>`));
      for (const h of hits) {
        const b = el(`<button><span>${h.label}</span><em>${h.kind}</em></button>`);
        b.onclick = () => run(h);
        results.append(b);
      }
      results.hidden = false;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#search-results button")?.click();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search")) results.hidden = true;
    });
  }

  focusStreet(street) {
    const lots = this.suburb.lots.filter((l) => l.street === street);
    const mid = lots[Math.floor(lots.length / 2)];
    if (mid) this.selectLot(mid.id, true);
  }

  // ---------- map interaction ----------
  bindMap() {
    const canvas = this.scene.renderer.domElement;
    const tip = $("#tooltip");
    let down = null;
    let hoverQueued = false;
    let lastMove = null;
    canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || e.button !== 0) return;
      this.handleClick(this.scene.pick(e.clientX, e.clientY));
    });
    canvas.addEventListener("pointermove", (e) => {
      lastMove = e;
      if (hoverQueued || e.buttons) return;
      hoverQueued = true;
      setTimeout(() => {
        hoverQueued = false;
        this.handleHover(lastMove, tip);
      }, 60);
    });
    canvas.addEventListener("pointerleave", () => {
      tip.hidden = true;
      this.scene.lotHover.set(null);
      this.scene.requestRender();
    });
  }

  describePoint(point) {
    const s = this.suburb;
    if (!point) return null;
    const lot = s.lotAt(point);
    if (lot) return { lot };
    if (s.inCentre(point)) return { band: "centre" };
    const area = s.areaAt(point);
    return { area, walk: s.walk.at(point), constraints: s.constraintsAt(point) };
  }

  handleHover(e, tip) {
    const hit = this.scene.pick(e.clientX, e.clientY);
    let html = "";
    let lot = null;
    if (hit.building !== null) {
      const b = hit.beforeLayer ? this.beforeBuildings[hit.building] : this.suburb.buildings[hit.building];
      lot = b.lotId >= 0 ? this.suburb.lots[b.lotId] : null;
      const name = TYPE_BY_ID[b.type]?.name || b.name || NON_RESIDENTIAL[b.type]?.name;
      html = `<strong>${name}</strong>${lot ? `<span>${this.address(lot)}</span>` : ""}${hit.beforeLayer ? "<span>Before LMR scenario</span>" : ""}`;
    } else if (hit.point) {
      const d = this.describePoint(hit.point);
      if (d?.lot) {
        lot = d.lot;
        html = `<strong>${this.address(lot)}</strong><span>${lot.zone} · ${this.bandLabel(lot)}</span>`;
      } else if (d?.band === "centre") {
        html = `<strong>Shopping Village</strong><span>LMR town centre</span>`;
      } else if (d?.area) {
        html = `<strong>${d.area.name}</strong><span>${ZONES[d.area.zone]?.name || ""}</span>`;
      }
    }
    this.scene.lotHover.set(lot && lot.id !== this.state.selectedLot ? lot.poly : null);
    this.scene.requestRender();
    if (!html) {
      tip.hidden = true;
      return;
    }
    tip.innerHTML = html;
    const rect = this.scene.container.getBoundingClientRect();
    tip.style.left = `${e.clientX - rect.left + 14}px`;
    tip.style.top = `${e.clientY - rect.top + 14}px`;
    tip.hidden = false;
  }

  handleClick(hit) {
    if (hit.building !== null) {
      const b = hit.beforeLayer ? this.beforeBuildings[hit.building] : this.suburb.buildings[hit.building];
      if (b.lotId >= 0) {
        this.selectLot(b.lotId, false, hit.beforeLayer ? null : b.id);
      } else {
        this.state.selectedBuilding = hit.beforeLayer ? null : b.id;
        this.state.selectedLot = null;
        this.scene.lotSelect.set(null);
        this.applyColours();
        this.showNonResidential(b);
      }
      return;
    }
    const d = this.describePoint(hit.point);
    if (!d) return;
    if (d.lot) {
      this.selectLot(d.lot.id);
      return;
    }
    this.clearSelection(false);
    const L = this.state.layers;
    const cons = (d.constraints || []).filter((c) => L[c.startsWith("heritage") ? "heritage" : c]);
    if (d.band === "centre") this.showInfo("band", "centre");
    else if (cons.length) this.showInfo("constraint", cons[0]);
    else if (d.area) this.showArea(d.area, d);
    else if (Number.isFinite(d.walk) && d.walk <= 800 && (L.inner || L.outer)) this.showInfo("band", bandOf(d.walk));
    else this.showWelcome();
  }

  selectLot(lotId, focus = false, buildingId = undefined) {
    const lot = this.suburb.lots[lotId];
    this.state.selectedLot = lotId;
    this.state.selectedBuilding = buildingId === undefined ? lot.buildingId ?? null : buildingId;
    if (this.state.mode === "before") this.state.selectedBuilding = null;
    this.scene.lotSelect.set(lot.poly);
    this.applyColours();
    if (focus) this.scene.focus(lot.centre, Math.max(this.scene.camera.zoom, 4));
    const building = this.state.selectedBuilding !== null ? this.suburb.buildings[this.state.selectedBuilding] : null;
    if (building && TYPE_BY_ID[building.type]) this.state.checkType = building.type === "detached" ? "dual" : building.type;
    this.showLot(lot, building);
  }

  clearSelection(resetPanel = true) {
    this.state.selectedLot = null;
    this.state.selectedBuilding = null;
    this.scene.lotSelect.set(null);
    this.applyColours();
    if (resetPanel) this.showWelcome();
  }

  // ---------- tools ----------
  bindTools() {
    $("#tool-zoom-in").onclick = () => this.scene.zoomBy(1.4);
    $("#tool-zoom-out").onclick = () => this.scene.zoomBy(1 / 1.4);
    $("#tool-rot-l").onclick = () => this.scene.rotate(-1);
    $("#tool-rot-r").onclick = () => this.scene.rotate(1);
    $("#tool-home").onclick = () => this.scene.setView({ ...VIEWS.home, azimuth: -0.6 });
    $("#tool-centre").onclick = () => this.scene.setView(VIEWS.centre);
    const planBtn = $("#tool-plan");
    planBtn.onclick = () => {
      const plan = !planBtn.classList.contains("active");
      planBtn.classList.toggle("active", plan);
      planBtn.textContent = plan ? "3D" : "Plan";
      this.scene.setPlan(plan);
    };
    const handle = $("#split-handle");
    document.querySelectorAll("#beforeafter button").forEach((btn) => {
      btn.onclick = () => this.setMode(btn.dataset.mode);
    });
    let dragging = false;
    handle.addEventListener("pointerdown", (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = this.scene.container.getBoundingClientRect();
      const x = Math.min(rect.width - 20, Math.max(20, e.clientX - rect.left));
      handle.style.left = `${x}px`;
      this.scene.split = (x / rect.width) * 2 - 1;
      this.scene.requestRender();
    });
    handle.addEventListener("pointerup", () => { dragging = false; });
  }

  setMode(mode) {
    this.state.mode = mode;
    document.querySelectorAll("#beforeafter button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    const handle = $("#split-handle");
    if (mode === "split") {
      const rect = this.scene.container.getBoundingClientRect();
      handle.style.left = `${rect.width / 2}px`;
      handle.hidden = false;
      this.scene.setSplit(0);
    } else {
      handle.hidden = true;
      this.scene.setSplit(null);
      this.scene.showBeforeOnly(mode === "before");
    }
    if (PHONE) document.body.classList.remove("panel-open");
    else if (mode !== "after") this.showInfo("beforeafter");
  }

  // ---------- panel ----------
  panel(html) {
    const p = $("#panel-body");
    p.innerHTML = html;
    p.scrollTop = 0;
    document.body.classList.add("panel-open");
    p.querySelectorAll("[data-info]").forEach((b) => {
      b.onclick = () => this.showInfo(...b.dataset.info.split(":"));
    });
    p.querySelectorAll("[data-type]").forEach((b) => {
      b.onclick = () => this.highlightType(b.dataset.type, true);
    });
    p.querySelectorAll("[data-layers]").forEach((b) => {
      b.onclick = () => this.applyLayerSet(b.dataset.layers.split(","));
    });
    return p;
  }

  sourcesHtml(keys = []) {
    if (!keys.length) return "";
    return `<div class="sources"><h4>Sources</h4><ul>${keys.map((k) => `<li><a href="${SOURCES[k].url}" target="_blank" rel="noopener">${SOURCES[k].label}</a></li>`).join("")}</ul><p class="muted small">Last checked ${LAST_CHECKED}.</p></div>`;
  }

  showWelcome() {
    this.panel(`
      <p class="eyebrow">Banksia Creek NSW · hypothetical</p>
      <h2>Explore the map</h2>
      <div class="hypo-note"><span class="badge-hypo">Hypothetical suburb</span><p>${HYPOTHETICAL_NOTE}</p></div>
      <ul class="steps">
        <li><b>${TOUCH ? "Tap" : "Click"} a building</b> to learn what type it is and whether it could be built on its lot.</li>
        <li><b>${TOUCH ? "Tap" : "Click"} a lot</b> to see its zone, walking distance and constraints, then test any housing type.</li>
        <li><b>Turn on layers</b> to see the 400 m / 800 m walking areas and exclusions.</li>
        ${TOUCH
          ? `<li><b>Drag one finger</b> to pan, <b>pinch</b> to zoom, <b>twist two fingers</b> to rotate. Use the buttons for 90° turns and plan view.</li>`
          : `<li><b>Drag</b> to pan, <b>scroll</b> to zoom, <b>right-drag</b> to rotate. Use the buttons for 90° turns and plan view.</li>`}
      </ul>
      <div class="callout"><b>Remember:</b> being inside the 800 m line is a starting point, not permission. Every lot needs checking.</div>
      <div class="stat-grid">
        <div><b>${fmt(this.suburb.lots.filter((l) => /^R/.test(l.zone) && l.walk <= 400).length)}</b><span>lots within 400 m</span></div>
        <div><b>${fmt(this.suburb.lots.filter((l) => /^R/.test(l.zone) && l.walk > 400 && l.walk <= 800).length)}</b><span>lots 400–800 m</span></div>
        <div><b>${fmt(this.suburb.lots.filter((l) => l.constraints.some((c) => CONSTRAINTS[c].category === "statutory")).length)}</b><span>lots with an exclusion</span></div>
      </div>
      <button class="btn primary wide" id="welcome-tour">Start the guided tour</button>
      ${this.snCtaHtml()}
    `);
    $("#welcome-tour").onclick = () => this.startTour();
    this.bindSnCta($("#panel-body"));
  }

  address(lot) {
    return lot.zone === "E1" ? "Kurrajong Road (town centre)" : `${lot.number} ${lot.street}`;
  }

  bandLabel(lot) {
    if (lot.zone === "E1") return "Town centre";
    if (!Number.isFinite(lot.walk)) return "beyond 800 m walk";
    const b = bandOf(lot.walk);
    return b === "inner" ? `${fmt(lot.walk)} m walk (inner)` : b === "outer" ? `${fmt(lot.walk)} m walk (outer)` : `${fmt(lot.walk)} m walk (outside LMR)`;
  }

  typeAbout(t, compact = false) {
    const thumb = this.thumbs?.[t.id];
    return `
      ${thumb ? `<figure class="thumb"><img src="${thumb[this.state.thumbView]}" alt="${t.name} diagram"><figcaption>
        <button class="seg ${this.state.thumbView === "axo" ? "active" : ""}" data-thumb="axo">3D</button>
        <button class="seg ${this.state.thumbView === "plan" ? "active" : ""}" data-thumb="plan">Plan</button></figcaption></figure>` : ""}
      <dl class="facts">
        <dt>Definition</dt><dd>${t.definition}</dd>
        <dt>Typical form</dt><dd>${t.configuration}</dd>
        <dt>Dwellings</dt><dd>${t.dwellings}</dd>
        ${compact ? "" : `<dt>Key considerations</dt><dd><ul>${t.considerations.map((c) => `<li>${c}</li>`).join("")}</ul></dd>`}
        <dt>Under LMR</dt><dd>${t.lmr}${t.verify ? ' <span class="verify">verify</span>' : ""}</dd>
      </dl>`;
  }

  bindThumbs(p, rerender) {
    p.querySelectorAll("[data-thumb]").forEach((b) => {
      b.onclick = () => {
        this.state.thumbView = b.dataset.thumb;
        rerender();
      };
    });
  }

  showType(id) {
    const t = TYPE_BY_ID[id];
    const p = this.panel(`
      <p class="eyebrow">Residential building type</p>
      <h2><span class="swatch big" style="background:${t.colour}"></span>${t.name}</h2>
      <div class="tags"><span class="tag ok">Exists in NSW</span><span class="tag">${this.typeCounts[id] || 0} on this map</span></div>
      ${this.typeAbout(t)}
      <p class="hint">Click one of the highlighted buildings to check whether this type could be built on that lot.</p>
      <button class="btn" id="clear-hl">Clear highlight</button>
      ${this.sourcesHtml(t.sources)}`);
    $("#clear-hl").onclick = () => this.highlightType(null);
    this.bindThumbs(p, () => this.showType(id));
  }

  showLot(lot, building) {
    const type = building ? TYPE_BY_ID[building.type] : null;
    const band = lot.zone === "E1" ? "centre" : bandOf(lot.walk);
    const consChips = lot.constraints.length
      ? lot.constraints.map((c) => `<button class="chip cat-${CONSTRAINTS[c].category}" data-info="constraint:${c}">${CONSTRAINTS[c].name}</button>`).join("")
      : '<span class="muted">None mapped in this example</span>';
    const options = BUILDING_TYPES.filter((t) => t.id !== "shoptop" || lot.zone !== "R2").map((t) => `<option value="${t.id}" ${t.id === this.state.checkType ? "selected" : ""}>${t.name}</option>`).join("");
    const result = checkLot(lot, this.state.checkType);
    const icon = { pass: "✓", fail: "✕", warn: "!", info: "i" };
    const std = standardFor(this.state.checkType, lot.zone, band);
    const p = this.panel(`
      ${type ? `<p class="eyebrow">Building</p><h2><span class="swatch big" style="background:${type.colour}"></span>${type.name}</h2>
        <div class="tags"><span class="tag ok">Exists in NSW</span>${building.dwellings ? `<span class="tag">${building.dwellings} dwelling${building.dwellings > 1 ? "s" : ""}</span>` : ""}${building.storeys ? `<span class="tag">${building.storeys} storey${building.storeys > 1 ? "s" : ""}</span>` : ""}</div>
        <details class="about" ${this.aboutOpen ? "open" : ""}><summary>About this building type</summary>${this.typeAbout(type, true)}${this.sourcesHtml(type.sources)}</details>`
        : `<p class="eyebrow">Lot</p><h2>${this.address(lot)}</h2>`}
      <section class="site">
        <h3>On this site <span class="badge-hypo">Hypothetical lot</span></h3>
        <table class="kv">
          <tr><th>Address</th><td>${this.address(lot)}</td></tr>
          <tr><th>Zone</th><td><button class="link" data-info="zones:${lot.zone}">${ZONES[lot.zone]?.name || lot.zone}</button></td></tr>
          <tr><th>Walking distance</th><td><button class="link" data-info="band:${band === "beyond" ? "beyond" : band}">${this.bandLabel(lot)}</button></td></tr>
          <tr><th>Lot area</th><td>${fmt(lot.area)} m²</td></tr>
          <tr><th>Frontage</th><td>${lot.frontage.toFixed(1)} m</td></tr>
          <tr><th>Constraints</th><td class="chips">${consChips}</td></tr>
        </table>
        <label class="check-type">Could this lot support a…
          <select id="check-type">${options}</select>
        </label>
        <div class="outcome ${result.outcome.status}">${result.outcome.text}</div>
        <ul class="checklist">${result.rows.map((r) => `<li class="${r.status}"><i>${icon[r.status]}</i><div><b>${r.label}</b><span>${r.detail}</span></div></li>`).join("")}</ul>
        ${std?.fsr && lot.zone !== "E1" ? this.envelopeHtml(lot, std) : ""}
        ${this.snCtaHtml("Is this similar to your property?")}
        <p class="caveat">Indicative only. Based on a simplified version of the Housing SEPP for a hypothetical lot. Real proposals depend on current maps, the LEP, DCP, a planning certificate and professional advice. This is not planning advice. <button class="link" id="lot-disclaimer">Read the disclaimer</button></p>
      </section>`);
    $("#lot-disclaimer").onclick = () => this.openDisclaimer();
    this.bindSnCta(p);
    $("#check-type").onchange = (e) => {
      this.state.checkType = e.target.value;
      this.aboutOpen = $("details.about", p)?.open;
      this.showLot(lot, building);
    };
    const det = $("details.about", p);
    if (det) {
      det.addEventListener("toggle", () => { this.aboutOpen = det.open; });
      this.bindThumbs(p, () => {
        this.aboutOpen = true;
        this.showLot(lot, building);
      });
    }
  }

  envelopeHtml(lot, std) {
    const gfa = std.fsr * lot.area;
    const footprint = Math.min(lot.area * 0.5, gfa / Math.max(1, Math.floor((std.height - 1) / 3.1)));
    return `<div class="envelope"><h4>What the numbers mean here</h4>
      <div class="bar"><span style="width:${Math.min(100, (gfa / (lot.area * 2.4)) * 100)}%"></span></div>
      <p>FSR ${std.fsr}:1 on ${fmt(lot.area)} m² allows about <b>${fmt(gfa)} m²</b> of floor area, roughly ${fmt(gfa / 90)} homes of 90 m², within a height of ${std.height} m. A footprint of about ${fmt(footprint)} m² would leave the rest for gardens, setbacks and parking.</p></div>`;
  }

  showNonResidential(b) {
    const info = NON_RESIDENTIAL[b.type] || { name: b.name, text: "" };
    this.panel(`
      <p class="eyebrow">Non-residential building</p>
      <h2>${b.name || info.name}</h2>
      <p>${info.text}</p>
      ${b.type === "retail" ? `<button class="btn" data-info="band:centre">About LMR town centres</button>` : ""}
      ${b.type === "church" ? `<button class="btn" data-info="constraint:heritageItem">About heritage items</button>` : ""}`);
  }

  showArea(area, d) {
    const z = ZONES[area.zone];
    this.panel(`
      <p class="eyebrow">${z?.name || "Open space"}</p>
      <h2>${area.name}</h2>
      <p>${z?.text || ""}</p>
      ${area.kind === "bush" ? `<div class="callout">Bushland like this generates <button class="link" data-info="constraint:bushfire">bushfire-prone land</button> around it, which is excluded from LMR.</div>` : ""}
      ${Number.isFinite(d.walk) && d.walk <= 800 ? `<p class="muted">About ${fmt(d.walk)} m walk from the centre, but not a residential zone, so LMR housing provisions do not apply.</p>` : ""}`);
  }

  showInfo(kind, id) {
    if (kind === "band") {
      const b = BANDS[id];
      const lots = this.suburb.lots.filter((l) => /^R/.test(l.zone) && (id === "centre" ? false : bandOf(l.walk) === id));
      this.panel(`
        <p class="eyebrow">LMR area</p>
        <h2><span class="swatch big" style="background:${b.colour};${id === "beyond" ? "border:1px solid #ccc" : ""}"></span>${b.name}</h2>
        <p class="lead">${b.summary}</p>
        ${b.body.map((t) => `<p>${t}</p>`).join("")}
        ${id !== "centre" ? `<div class="stat-grid"><div><b>${fmt(lots.length)}</b><span>residential lots on this map</span></div><div><b>${fmt(lots.filter((l) => l.constraints.some((c) => CONSTRAINTS[c].category === "statutory")).length)}</b><span>of them excluded</span></div></div>` : ""}
        ${id === "inner" || id === "outer" ? this.bandTable(id) : ""}
        <button class="btn" data-layers="centre,inner,outer">Show LMR areas on the map</button>
        ${this.sourcesHtml(b.sources)}`);
      return;
    }
    if (kind === "constraint") {
      const c = CONSTRAINTS[id];
      const cat = CATEGORIES[c.category];
      const layer = id.startsWith("heritage") ? "heritage" : id;
      this.panel(`
        <p class="eyebrow">Constraint</p>
        <h2><span class="swatch big hatch" style="--c:${c.colour}"></span>${c.name}</h2>
        <div class="cat-banner cat-${c.category}"><b>${cat.label}</b><span>${cat.text}</span></div>
        <p class="lead">${c.summary}</p>
        ${c.body.map((t) => `<p>${t}</p>`).join("")}
        ${c.verify ? '<p><span class="verify">verify</span> Check the current exclusion list before relying on this.</p>' : ""}
        <button class="btn" id="show-layer">Show on map</button>
        ${this.sourcesHtml(c.sources)}`);
      $("#show-layer").onclick = () => this.setLayer(layer, true);
      return;
    }
    if (kind === "zones") {
      this.panel(`
        <p class="eyebrow">Zoning</p>
        <h2>Land use zones</h2>
        <p>Zones come from the council's Local Environmental Plan. LMR housing types apply to residential zones R1–R4 within LMR areas.</p>
        <ul class="zone-list">${Object.entries(ZONES).map(([k, z]) => `<li class="${k === id ? "active" : ""}"><span class="swatch" style="background:${z.colour}"></span><div><b>${z.name}</b><span>${z.text}</span></div></li>`).join("")}</ul>
        <button class="btn" data-layers="zoning">Show zoning on the map</button>`);
      return;
    }
    if (kind === "beforeafter") {
      this.panel(`
        <p class="eyebrow">Before and after</p>
        <h2>How LMR can change a street</h2>
        <p><b>Before LMR</b> shows every R2 lot as a detached house. <b>Today</b> shows the mix of housing types the policy allows near the centre.</p>
        <p>Use <b>Split</b> and drag the handle across the map to compare.</p>
        <p class="muted">The "today" scenario is illustrative. Change happens lot by lot, over many years, and only where owners choose to redevelop.</p>`);
    }
  }

  bandTable(id) {
    const rows = [
      ["Dual occupancy / semi", "R2", "450 m² · 12 m · FSR 0.65 · 9.5 m", "450 m² · 12 m · FSR 0.65 · 9.5 m"],
      ["Terraces", "R2", "500 m² · 18 m · FSR 0.7 · 9.5 m", "500 m² · 18 m · FSR 0.7 · 9.5 m"],
      ["Multi dwelling / townhouses", "R2", "600 m² · 12 m · FSR 0.7 · 9.5 m", "600 m² · 12 m · FSR 0.7 · 9.5 m"],
      ["Low-rise apartments / manor", "R1, R2", "500 m² · 12 m · FSR 0.8 · 9.5 m", "Not under LMR"],
      ["Residential flat building", "R3, R4", "FSR 2.2 · 22 m (≈6 storeys)", "FSR 1.5 · 17.5 m (≈4 storeys)"],
      ["Shop-top housing", "R3, R4*", "24 m (≈6 storeys)", "17.5 m (≈4 storeys)"],
    ];
    const col = id === "inner" ? 2 : 3;
    return `<table class="std"><thead><tr><th>Type</th><th>Zone</th><th>${id === "inner" ? "0–400 m" : "400–800 m"}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[col]}</td></tr>`).join("")}</tbody></table>
      <p class="muted small">Minimum lot size · width · FSR · height. Simplified; *where the local plan permits. Some values flagged for verification.</p>`;
  }

  // ---------- modals ----------
  openModal(title, html, wide = false) {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal .modal-card").classList.toggle("wide", wide);
    $("#modal").hidden = false;
    return $("#modal-body");
  }

  closeModal() {
    if (this.modalLocked) return;
    $("#modal").hidden = true;
  }

  disclaimerHtml() {
    return DISCLAIMER_SECTIONS.map((s) => `<section class="disc-section"><h3>${s.title}</h3>${s.text.map((t) => `<p>${t}</p>`).join("")}</section>`).join("")
      + `<p class="muted small">Official sources: <a href="${SOURCES.spatialViewer.url}" target="_blank" rel="noopener">NSW Planning Portal Spatial Viewer</a> · <a href="${SOURCES.lmrPolicy.url}" target="_blank" rel="noopener">NSW LMR policy</a> · <a href="${SOURCES.housingSepp.url}" target="_blank" rel="noopener">Housing SEPP</a></p>`;
  }

  // ---------- SN Architects ----------
  snCtaHtml(title = "Want to know what you can build on your site?") {
    return `<aside class="sn-cta">
      <div class="sn-cta-head">
        <img class="sn-cta-mark" src="${SN.logo.markWhite}" alt="" />
        <div>
          <p class="sn-eyebrow">${SN.name}</p>
          <h4>${title}</h4>
        </div>
      </div>
      <p>This map uses a hypothetical suburb. For your real property, ${SN.name} can tell you:</p>
      <ul class="sn-checks">
        <li>whether your lot is inside an LMR area</li>
        <li>which housing types fit your site</li>
        <li>how many dwellings and how much floor area</li>
      </ul>
      <div class="sn-actions">
        <a class="btn sn-primary" href="${SN.contactUrl}" target="_blank" rel="noopener">Get site advice</a>
        <a class="btn sn-ghost" href="${SN.phoneHref}">Call ${SN.phone}</a>
      </div>
      <button class="link sn-more">About ${SN.name} &rarr;</button>
    </aside>`;
  }

  bindSnCta(root) {
    root.querySelectorAll(".sn-more").forEach((b) => { b.onclick = () => this.openSnArchitects(); });
  }

  openSnArchitects() {
    this.openModal(`About ${SN.name}`, `
      <div class="sn-about">
        <div class="sn-hero">
          <img src="${SN.logo.fullWhite}" alt="${SN.name}" />
          <div>
            <h2>${SN.tagline}</h2>
            <p>${SN.intro}</p>
          </div>
        </div>
        <p class="lead">${SN.pitch}</p>
        <h3>How we can help</h3>
        <ul class="sn-services">${SN.services.map((s) => `<li>${s}</li>`).join("")}</ul>
        <div class="sn-contact">
          <div><span>Phone</span><a href="${SN.phoneHref}">${SN.phone}</a></div>
          <div><span>Mobile</span><a href="${SN.mobileHref}">${SN.mobile}</a></div>
          <div><span>Email</span><a href="${SN.emailHref}">${SN.email}</a></div>
          <div><span>Studio</span>${SN.address}</div>
        </div>
        <div class="sn-actions">
          <a class="btn sn-primary" href="${SN.contactUrl}" target="_blank" rel="noopener">Contact ${SN.name}</a>
          <a class="btn" href="${SN.emailHref}">Email us</a>
          <a class="btn" href="${SN.url}" target="_blank" rel="noopener">Visit snarchitects.com.au</a>
        </div>
        <p class="muted small">The map itself is a general educational tool. Site-specific advice is provided separately by ${SN.name}.</p>
      </div>`);
  }

  openDisclaimer() {
    this.openModal("Disclaimer", this.disclaimerHtml());
  }

  // Shown on first visit; must be acknowledged before using the map.
  requireDisclaimer() {
    if (localStorage.getItem("lmr-disclaimer-ack") === LAST_CHECKED) return;
    const body = this.openModal("Before you start", `
      <div class="disc-intro">
        <span class="badge-hypo big">Hypothetical suburb</span>
        <p class="lead">This is an educational map of an <b>invented</b> NSW suburb. It is not a real place and it is not planning advice.</p>
      </div>
      ${this.disclaimerHtml()}
      <label class="disc-ack"><input type="checkbox" id="disc-check"> I understand that this map shows a hypothetical suburb and is for education only.</label>
      <button class="btn primary wide" id="disc-accept" disabled>Enter the map</button>`);
    this.modalLocked = true;
    $("#modal-close").hidden = true;
    const check = $("#disc-check", body);
    const accept = $("#disc-accept", body);
    check.onchange = () => { accept.disabled = !check.checked; };
    accept.onclick = () => {
      localStorage.setItem("lmr-disclaimer-ack", LAST_CHECKED);
      this.modalLocked = false;
      $("#modal-close").hidden = false;
      this.closeModal();
    };
  }

  openLearning(id) {
    const m = MODULES.find((x) => x.id === id) || MODULES[0];
    const idx = MODULES.indexOf(m);
    const body = this.openModal("Learning Centre", `
      <div class="learn">
        <nav class="learn-nav">${MODULES.map((x, i) => `<button class="${x.id === m.id ? "active" : ""}" data-m="${x.id}"><span>${i + 1}</span>${x.title}${this.progress[x.id] ? "<em>✓</em>" : ""}</button>`).join("")}</nav>
        <article>
          <p class="eyebrow">Module ${idx + 1} of ${MODULES.length}</p>
          <h2>${m.title}</h2>
          <p class="lead">${m.lead}</p>
          ${m.body.map((t) => `<p>${t}</p>`).join("")}
          <button class="btn primary" id="learn-show">Show on map</button>
          ${idx === MODULES.length - 1 ? this.snCtaHtml("Ready to look at your own site?") : ""}
          <div class="learn-foot">
            ${idx > 0 ? `<button class="btn" data-m="${MODULES[idx - 1].id}">← Previous</button>` : "<span></span>"}
            ${idx < MODULES.length - 1 ? `<button class="btn primary" data-m="${MODULES[idx + 1].id}">Next module →</button>` : `<button class="btn primary" id="learn-done">Finish</button>`}
          </div>
        </article>
      </div>`, true);
    body.querySelectorAll("[data-m]").forEach((b) => { b.onclick = () => this.openLearning(b.dataset.m); });
    $("#learn-show").onclick = () => {
      this.closeModal();
      this.applyLayerSet(m.show.layers);
      this.scene.setView(VIEWS[m.show.view]);
      if (m.id === "m2") this.showType("terraces");
      else if (m.id === "m3") this.showInfo("band", "inner");
      else if (m.id === "m5") this.showInfo("constraint", "bushfire");
      else if (m.id === "m4") this.showInfo("zones", "R2");
    };
    $("#learn-done")?.addEventListener("click", () => this.closeModal());
    this.bindSnCta(body);
    if (!this.progress[m.id]) {
      this.progress[m.id] = true;
      localStorage.setItem("lmr-progress", JSON.stringify(this.progress));
      this.buildSidebar();
    }
  }

  openCompare() {
    const cell = (t) => {
      const s = { dual: "450 m² / 12 m", semi: "450 m² / 12 m", terraces: "500 m² / 18 m", townhouses: "600 m² / 12 m", multi: "600 m² / 12 m", manor: "500 m² / 12 m", lowrise: "500 m² / 12 m", rfb: "Varies (often amalgamated)", midrise: "Varies (amalgamated)", shoptop: "Local plan", detached: "Local plan" }[t.id];
      const where = { detached: "All residential zones (local plan)", semi: "R2 statewide", dual: "R2 statewide", terraces: "R2 within 800 m", townhouses: "R2 within 800 m", multi: "R2 within 800 m", manor: "R1/R2 within 400 m", lowrise: "R1/R2 within 400 m", rfb: "R3/R4 within 800 m", midrise: "R3/R4 within 400 m", shoptop: "E1 centre; R3/R4 if LEP permits" }[t.id];
      const height = { detached: "Local plan", semi: "9.5 m", dual: "9.5 m", terraces: "9.5 m", townhouses: "9.5 m", multi: "9.5 m", manor: "9.5 m", lowrise: "9.5 m", rfb: "17.5–22 m", midrise: "22 m", shoptop: "17.5–24 m" }[t.id];
      return { s, where, height };
    };
    const body = this.openModal("Compare building types", `
      <p class="muted">Side-by-side summary of the residential building types. Values are simplified LMR standards; verify before use.</p>
      <div class="compare">${BUILDING_TYPES.map((t) => {
        const c = cell(t);
        return `<article class="cmp" data-type="${t.id}">
          <img src="${this.thumbs?.[t.id]?.axo || ""}" alt="">
          <h4><span class="swatch" style="background:${t.colour}"></span>${t.name}</h4>
          <dl><dt>Dwellings</dt><dd>${t.dwellings}</dd><dt>Where (LMR)</dt><dd>${c.where}</dd><dt>Min lot / width</dt><dd>${c.s}</dd><dt>Max height</dt><dd>${c.height}</dd></dl>
        </article>`;
      }).join("")}</div>`, true);
    body.querySelectorAll(".cmp").forEach((card) => {
      card.onclick = () => {
        this.closeModal();
        this.highlightType(card.dataset.type, true);
      };
    });
  }

  openGlossary(term) {
    const body = this.openModal("Glossary", `<dl class="glossary">${GLOSSARY.map(([t, d]) => `<dt id="g-${t.replace(/\W/g, "")}" class="${t === term ? "hl" : ""}">${t}</dt><dd>${d}</dd>`).join("")}</dl>`);
    if (term) body.querySelector(`#g-${term.replace(/\W/g, "")}`)?.scrollIntoView({ block: "center" });
  }

  // ---------- tour ----------
  startTour() {
    this.closeModal();
    this.tourIndex = 0;
    this.renderTour();
  }

  endTour() {
    this.tourIndex = undefined;
    $("#tour-card").hidden = true;
    document.body.classList.remove("touring");
    this.highlightType(null);
  }

  renderTour() {
    const i = this.tourIndex;
    const step = TOUR[i];
    const card = $("#tour-card");
    card.innerHTML = `
      <div class="tour-progress">${TOUR.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
      <p class="eyebrow">Guided tour · ${i + 1} of ${TOUR.length}</p>
      <h3>${step.title}</h3>
      <p>${TOUCH ? step.text.replace(/\bClick\b/g, "Tap").replace(/\bclick\b/g, "tap") : step.text}</p>
      <div class="row">
        <button class="btn" id="tour-skip">${i === TOUR.length - 1 ? "Close" : "Skip tour"}</button>
        <span class="spacer"></span>
        ${i > 0 ? '<button class="btn" id="tour-prev">Back</button>' : ""}
        ${i < TOUR.length - 1 ? '<button class="btn primary" id="tour-next">Next</button>' : '<button class="btn primary" id="tour-learn">Open Learning Centre</button>'}
      </div>`;
    card.hidden = false;
    document.body.classList.add("touring");
    document.body.classList.remove("sidebar-open");
    $("#tour-skip").onclick = () => this.endTour();
    $("#tour-prev")?.addEventListener("click", () => { this.tourIndex -= 1; this.renderTour(); });
    $("#tour-next")?.addEventListener("click", () => { this.tourIndex += 1; this.renderTour(); });
    $("#tour-learn")?.addEventListener("click", () => { this.endTour(); this.openLearning("m1"); });
    this.highlightType(null);
    this.applyLayerSet(step.layers);
    if (step.layers.includes("lots")) this.setLayer("lots", true);
    this.scene.setView({ ...VIEWS[step.view], azimuth: -0.6 });
    if (i === 3) this.showType("townhouses");
    else if (i === 1) this.showInfo("band", "centre");
    else if (i === 2) this.showInfo("band", "inner");
    else if (i === 4) this.showInfo("constraint", "bushfire");
    else if (i === 5) {
      const clean = (l) => l.zone === "R2" && l.walk < 400 && l.type === "detached" && !l.constraints.length;
      const lots = this.suburb.lots.filter(clean);
      const lot = lots.find((l) => l.frontage >= 18 && l.area >= 500) || lots.find((l) => l.area >= 450);
      if (lot) {
        const checkType = lot.frontage >= 18 ? "terraces" : "dual";
        this.selectLot(lot.id, true);
        this.state.checkType = checkType;
        this.showLot(lot, this.suburb.buildings[lot.buildingId]);
      }
    } else if (i === 0) this.showWelcome();
  }
}
