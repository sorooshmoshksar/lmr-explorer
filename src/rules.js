import { CONSTRAINTS, STANDARDS, TYPE_BY_ID, ZONES } from "../content/lmr-content.js";

export const bandOf = (walk) => (walk <= 400 ? "inner" : walk <= 800 ? "outer" : "beyond");

const fmt = (n) => Math.round(n).toLocaleString("en-AU");

// Simplified, educational interpretation of Housing SEPP Chapter 6. Returns checklist rows of
// { status: "pass" | "fail" | "warn" | "info", label, detail }.
export function checkLot(lot, typeId) {
  const type = TYPE_BY_ID[typeId];
  const rows = [];
  const band = lot.zone === "E1" ? "centre" : bandOf(lot.walk);
  const residential = /^R[1-4]$/.test(lot.zone);
  const lmrArea = residential && band !== "beyond";
  const statutory = lot.constraints.filter((c) => CONSTRAINTS[c]?.category === "statutory");
  const assessment = lot.constraints.filter((c) => CONSTRAINTS[c]?.category === "assessment");
  const design = lot.constraints.filter((c) => CONSTRAINTS[c]?.category === "design");

  if (typeId === "detached") {
    rows.push({ status: "info", label: "Not an LMR housing type", detail: "Detached houses are controlled by the local plan (and often the Codes SEPP), not by the LMR provisions." });
    rows.push({ status: residential ? "pass" : "fail", label: "Residential zone", detail: ZONES[lot.zone]?.name || lot.zone });
    return summarise(rows, type);
  }

  if (lot.zone === "E1") {
    rows.push({ status: typeId === "shoptop" ? "pass" : "fail", label: "Town centre zone (E1)", detail: typeId === "shoptop" ? "Shop-top housing is commonly permitted in E1 under the local plan." : "The town centre is not an LMR housing area. Housing here is controlled by the local plan." });
    rows.push({ status: "info", label: "Local plan controls apply", detail: "Height and FSR come from the LEP maps for the centre." });
    return summarise(rows, type);
  }

  // 1. Inside an LMR housing area?
  const stage1 = (typeId === "dual" || typeId === "semi") && lot.zone === "R2";
  if (lmrArea) {
    rows.push({ status: "pass", label: "Inside an LMR housing area", detail: `${band === "inner" ? "Inner" : "Outer"} area: about ${fmt(lot.walk)} m walk from the centre.` });
  } else if (stage1) {
    rows.push({ status: "pass", label: "Statewide dual occupancy reform", detail: `About ${Number.isFinite(lot.walk) ? fmt(lot.walk) : "> 800"} m walk, outside the LMR area, but dual occupancies and semi-detached dwellings are permitted in R2 statewide.` });
  } else {
    rows.push({ status: "fail", label: "Outside the LMR housing area", detail: `More than 800 m walk${residential ? "" : " or not a residential zone"}. The LMR provisions for this type do not apply; the local plan does.` });
  }

  // 2. Statutory exclusions.
  if (statutory.length) {
    rows.push({ status: "fail", label: "Statutory exclusion", detail: `${statutory.map((c) => CONSTRAINTS[c].name).join(", ")}: the LMR provisions do not apply to this land.` });
  } else {
    rows.push({ status: "pass", label: "No statutory exclusion shown", detail: "No mapped exclusion in this example. A planning certificate would confirm this for a real lot." });
  }

  // 3. Zone permits the type.
  const zoneResult = zoneCheck(typeId, lot.zone, band);
  rows.push(zoneResult);

  // 4–5. Lot size and width.
  const std = standardFor(typeId, lot.zone, band);
  if (std?.lotArea) {
    rows.push({ status: lot.area >= std.lotArea ? "pass" : "fail", label: "Minimum lot size", detail: `Lot ${fmt(lot.area)} m², LMR minimum ${fmt(std.lotArea)} m².` });
  }
  if (std?.width) {
    rows.push({ status: lot.frontage >= std.width ? "pass" : "fail", label: "Minimum lot width", detail: `Frontage ${lot.frontage.toFixed(1)} m, LMR minimum ${std.width} m.` });
  }

  // 6. Standards that would apply.
  if (std && zoneResult.status !== "fail") {
    const bits = [];
    if (std.fsr) bits.push(`FSR ${std.fsr}:1 (about ${fmt(std.fsr * lot.area)} m² floor area)`);
    if (std.height) bits.push(`height ${std.height} m${std.storeys ? ` (about ${std.storeys} storeys)` : ""}`);
    rows.push({ status: "info", label: "Indicative LMR standards", detail: `${bits.join(", ")}.${type.verify ? " Values to be verified." : ""}` });
  }

  // 7–8. Further assessment and design constraints.
  for (const c of assessment) rows.push({ status: "warn", label: CONSTRAINTS[c].name, detail: "Needs additional assessment and may limit or prevent this proposal." });
  for (const c of design) rows.push({ status: "warn", label: CONSTRAINTS[c].name, detail: "Design constraint: reduces the usable area of the lot." });

  return summarise(rows, type);
}

function zoneCheck(typeId, zone, band) {
  const label = "Zone allows this type (with LMR)";
  const name = ZONES[zone]?.name || zone;
  const ok = (detail) => ({ status: "pass", label, detail: `${name}: ${detail}` });
  const no = (detail) => ({ status: "fail", label, detail: `${name}: ${detail}` });
  const maybe = (detail) => ({ status: "warn", label, detail: `${name}: ${detail}` });
  switch (typeId) {
    case "semi":
    case "dual":
      return zone === "R2" ? ok("permitted with consent.") : maybe("depends on the local plan.");
    case "terraces":
    case "townhouses":
    case "multi":
      if (zone === "R2") return band === "beyond" ? no("only within LMR housing areas.") : ok("permitted within the LMR area.");
      return zone === "R4" ? maybe("usually permitted; check the local plan.") : ok("generally permitted.");
    case "manor":
    case "lowrise":
      if (zone === "R1" || zone === "R2") return band === "inner" ? ok("low-rise flat buildings permitted in the inner area.") : no("low-rise flat buildings in R1/R2 apply in the inner (0–400 m) area only.");
      return ok("assessed as a residential flat building.");
    case "rfb":
      if (zone === "R3" || zone === "R4") return ok(`flat buildings permitted (${band === "inner" ? "up to about 6 storeys" : "up to about 4 storeys"}).`);
      return no("4-storey flat buildings are only covered in R3/R4. Consider a low-rise apartment in R1/R2.");
    case "midrise":
      if ((zone === "R3" || zone === "R4") && band === "inner") return ok("up to about 6 storeys in the inner area.");
      if (zone === "R3" || zone === "R4") return no("the outer area allows about 4 storeys, not 6.");
      return no("mid-rise apartments are only covered in R3/R4 in the inner area.");
    case "shoptop":
      return zone === "R3" || zone === "R4" ? maybe("only where the local plan permits shop-top housing.") : no("not usually permitted in this zone.");
    default:
      return maybe("check the local plan.");
  }
}

export function standardFor(typeId, zone, band) {
  if (["manor", "lowrise"].includes(typeId) && (zone === "R3" || zone === "R4")) return band === "inner" ? STANDARDS.rfbInner : STANDARDS.rfbOuter;
  if (typeId === "rfb" || typeId === "midrise") return band === "inner" ? STANDARDS.rfbInner : STANDARDS.rfbOuter;
  if (typeId === "shoptop") return band === "inner" ? STANDARDS.shoptopInner : STANDARDS.shoptopOuter;
  return STANDARDS[typeId] || null;
}

function summarise(rows, type) {
  const fail = rows.some((r) => r.status === "fail");
  const warn = rows.some((r) => r.status === "warn");
  let outcome;
  if (fail) outcome = { status: "fail", text: `${type.name}: not supported by the LMR provisions on this lot. Other pathways may exist.` };
  else if (warn) outcome = { status: "warn", text: `${type.name}: may be supported, subject to further assessment.` };
  else outcome = { status: "pass", text: `${type.name}: may be supported. Indicative only.` };
  return { rows, outcome };
}
