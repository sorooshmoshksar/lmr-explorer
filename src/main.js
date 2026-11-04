import { generateSuburb, typeParts } from "./suburb.js";
import { createRng } from "./geom.js";
import { MapScene } from "./scene.js";
import { renderThumbnails } from "./thumbnails.js";
import { UI } from "./ui.js";

const status = document.getElementById("loading-status");
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// "Before LMR": every R2 lot that has been redeveloped goes back to a detached house.
function beforeScenario(suburb) {
  const rng = createRng(1907);
  return suburb.buildings.map((b, id) => {
    const lot = b.lotId >= 0 ? suburb.lots[b.lotId] : null;
    if (!lot || lot.zone !== "R2" || b.type === "detached" || !lot.frame) return { ...b, id };
    const { origin, u, v } = lot.frame;
    const parts = typeParts("detached", lot.frontage, lot.depth, rng).parts.map((p) => ({
      ...p,
      c: [origin[0] + u[0] * p.u + v[0] * p.v, origin[1] + u[1] * p.u + v[1] * p.v],
      angle: Math.atan2(u[1], u[0]),
    }));
    return { id, type: "detached", lotId: b.lotId, parts, storeys: 1, dwellings: 1 };
  });
}

async function start() {
  try {
    status.textContent = "Laying out streets and lots…";
    await nextFrame();
    const suburb = generateSuburb();
    status.textContent = "Building the 3D model…";
    await nextFrame();
    const before = beforeScenario(suburb);
    const scene = new MapScene(document.getElementById("map"), suburb, before);
    status.textContent = "Drawing building type diagrams…";
    await nextFrame();
    const thumbnails = renderThumbnails();
    const ui = new UI({ scene, suburb, beforeBuildings: before, thumbnails });
    window.lmr = { suburb, scene, ui };
    document.getElementById("loading").classList.add("done");
    setTimeout(() => document.getElementById("loading").remove(), 600);
  } catch (err) {
    console.error(err);
    status.textContent = `Something went wrong: ${err.message}`;
  }
}

start();
