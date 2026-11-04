export const LAST_CHECKED = "October 2026";

export const SOURCES = {
  lmrPolicy: {
    label: "NSW Planning – Low and mid-rise housing policy",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy",
  },
  lmrExclusions: {
    label: "NSW Planning – LMR exclusions and where the policy applies",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy/where-the-policy-applies",
  },
  housingSepp: {
    label: "State Environmental Planning Policy (Housing) 2021 – Chapter 6",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0714",
  },
  standardInstrument: {
    label: "Standard Instrument – Principal Local Environmental Plan (Dictionary)",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2006-0155",
  },
  designGuide: {
    label: "NSW Low Rise Housing Diversity Design Guide",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-rise-housing-diversity-code",
  },
  adg: {
    label: "NSW Apartment Design Guide",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/housing/apartment-design-guide",
  },
  bushfire: {
    label: "NSW RFS – Planning for Bush Fire Protection",
    url: "https://www.rfs.nsw.gov.au/plan-and-prepare/building-in-a-bush-fire-area/planning-for-bush-fire-protection",
  },
  spatialViewer: {
    label: "NSW Planning Portal – Spatial Viewer (check real maps)",
    url: "https://www.planningportal.nsw.gov.au/spatialviewer/",
  },
  planningPortal: {
    label: "NSW Planning Portal – Development and assessment",
    url: "https://www.planningportal.nsw.gov.au/",
  },
};

export const DISCLAIMER = "This map is an educational tool based on a hypothetical suburb. It does not show real "
  + "properties or development rights. Planning controls, exclusions, maps and standards may change. Always "
  + "check the current NSW Planning Portal, the relevant Local Environmental Plan, the Housing SEPP, a "
  + "planning certificate and advice from the council or a qualified planning professional before making "
  + "decisions.";

const UTM = "utm_source=lmr-explorer&utm_medium=referral&utm_campaign=lmr-map";

export const SN_ARCHITECTS = {
  name: "SN Architects",
  tagline: "Find out what you can build on your site",
  logo: {
    full: "assets/brand/sn-logo-black.png",
    fullWhite: "assets/brand/sn-logo-white.png",
    mark: "assets/brand/sn-mark-black.png",
    markWhite: "assets/brand/sn-mark-white.png",
  },
  url: `https://www.snarchitects.com.au/?${UTM}`,
  contactUrl: `https://www.snarchitects.com.au/contact?${UTM}`,
  phone: "(02) 7229 1915",
  phoneHref: "tel:+61272291915",
  mobile: "0405 242 821",
  mobileHref: "tel:+61405242821",
  email: "info@snarchitects.com.au",
  emailHref: "mailto:info@snarchitects.com.au?subject=LMR%20site%20enquiry%20(via%20LMR%20Explorer)",
  address: "12E Denawen Avenue, Castle Cove NSW 2069",
  intro: "SN Architects is a Sydney architecture practice led by NSW registered architects. We help homeowners, "
    + "families and developers understand the development potential of their land and turn it into a well-designed, "
    + "approved project.",
  pitch: "This map explains how LMR works on a hypothetical suburb. Every real site is different: zoning, walking "
    + "distance, lot size, heritage, flooding, bushfire, trees and council controls all change what you can build. "
    + "If you would like to know what is possible on your own property, contact SN Architects.",
  services: [
    "Site potential and feasibility studies under the LMR policy",
    "Dual occupancies, duplexes, terraces, townhouses and manor houses",
    "Low and mid-rise apartment buildings",
    "Design and documentation packages",
    "DA, CDC and CC approval documentation",
    "3D visualisation of your proposal",
  ],
};

export const HYPOTHETICAL_NOTE = "Banksia Creek is a hypothetical suburb. Its streets, addresses, lots, buildings, "
  + "zones, walking distances and constraints are invented for teaching. Any resemblance to a real place, "
  + "property or person is coincidental.";

export const DISCLAIMER_SECTIONS = [
  {
    title: "Hypothetical suburb",
    text: [
      HYPOTHETICAL_NOTE,
      "The map does not represent St Ives or any other real suburb, and it must not be used to work out what can be built on a real property.",
    ],
  },
  {
    title: "Educational purpose only",
    text: [
      "This tool explains, in simplified form, how the NSW Low and Mid-Rise Housing (LMR) policy works. It is general information, not legal, planning, financial or professional advice.",
      "The 'On this site' checklists are indicative illustrations for hypothetical lots. They are not a planning assessment and do not mean that development is permissible, approvable or feasible.",
    ],
  },
  {
    title: "Accuracy and currency",
    text: [
      `Planning content was last reviewed in ${LAST_CHECKED}. Legislation, maps, exclusions and standards change, and some values in this tool are simplified or marked 'verify'.`,
      "No warranty is given that the information is accurate, complete or current.",
    ],
  },
  {
    title: "Before making any decision",
    text: [
      "Check the official LMR maps on the NSW Planning Portal, the current Housing SEPP and local environmental plan, and obtain a section 10.7 planning certificate for the property.",
      "Seek advice from the relevant council and a qualified planning or legal professional.",
    ],
  },
  {
    title: "No liability",
    text: [
      "To the extent permitted by law, the authors accept no liability for any loss or damage arising from use of, or reliance on, this tool.",
      "This tool is not produced or endorsed by the NSW Government.",
      "Site-specific advice from SN Architects is only provided under a separate engagement.",
    ],
  },
];

export const ZONES = {
  R1: { name: "R1 General Residential", colour: "#f4d7a1", text: "A flexible residential zone that usually allows a wide range of housing types." },
  R2: { name: "R2 Low Density Residential", colour: "#fbefc9", text: "Mainly detached houses. The LMR policy now allows more housing types in R2 zones inside LMR housing areas." },
  R3: { name: "R3 Medium Density Residential", colour: "#f2b880", text: "Townhouses, terraces and smaller apartment buildings. LMR adds apartment standards in R3 near centres." },
  R4: { name: "R4 High Density Residential", colour: "#e48a5c", text: "Apartment buildings. LMR sets non-discretionary height and floor space standards near centres." },
  E1: { name: "E1 Local Centre", colour: "#a9c4e8", text: "Shops, services and jobs. Shop-top housing is commonly permitted. This is the LMR town centre in this example." },
  RE1: { name: "RE1 Public Recreation", colour: "#cfe6c2", text: "Public parks and sports grounds. Not a housing zone." },
  RE2: { name: "RE2 Private Recreation", colour: "#dcebc9", text: "Private open space such as a golf course. Not a housing zone." },
  C2: { name: "C2 Environmental Conservation", colour: "#b9d7b0", text: "Bushland and creek corridors protected for their environmental value. Not a housing zone." },
  SP2: { name: "SP2 Infrastructure (school)", colour: "#e4e0ef", text: "Land set aside for infrastructure such as schools." },
};

export const BANDS = {
  centre: {
    id: "centre",
    name: "LMR town centre",
    colour: "#3d6fc4",
    summary: "The centre that the walking distances are measured from.",
    body: [
      "Under the LMR policy a town centre is typically a mapped centre with an E1 Local Centre, E2 Commercial Centre or MU1 Mixed Use zone and a minimum range of shops and services, or a train or metro station entrance.",
      "In this hypothetical suburb, Shopping Village is the mapped LMR centre. Real centres are shown on the NSW Planning Portal Spatial Viewer.",
      "The centre itself is not an LMR housing area. Shop-top housing in the centre is controlled by the local plan and the zone.",
    ],
    sources: ["lmrPolicy", "spatialViewer"],
  },
  inner: {
    id: "inner",
    name: "0–400 m walking distance (inner area)",
    colour: "#f28c28",
    summary: "Inner LMR area: the most housing types and the highest LMR standards.",
    body: [
      "Land zoned R1, R2, R3 or R4 within about 400 m walking distance of the centre. Walking distance follows streets and paths, not a straight line.",
      "In R2 zones: dual occupancies, terraces, multi dwelling housing and low-rise residential flat buildings (up to 9.5 m) can be considered on lots that meet minimum sizes.",
      "In R3 and R4 zones: residential flat buildings and shop-top housing up to about 6 storeys (22 m, FSR 2.2:1 for flats) can be considered.",
      "Being inside the band does not mean a lot can be developed. Exclusions, lot size, width, heritage and other constraints still apply.",
    ],
    sources: ["lmrPolicy", "housingSepp"],
  },
  outer: {
    id: "outer",
    name: "400–800 m walking distance (outer area)",
    colour: "#ffd23f",
    summary: "Outer LMR area: more housing types allowed, at lower heights than the inner area.",
    body: [
      "Land zoned R1, R2, R3 or R4 between about 400 m and 800 m walking distance of the centre.",
      "In R2 zones: dual occupancies, terraces and multi dwelling housing can be considered on lots that meet minimum sizes. Low-rise apartments in R2 apply in the inner area only.",
      "In R3 and R4 zones: residential flat buildings up to about 4 storeys (17.5 m, FSR 1.5:1).",
      "Again, the band shows potential, not permission. Each lot must be checked.",
    ],
    sources: ["lmrPolicy", "housingSepp"],
  },
  beyond: {
    id: "beyond",
    name: "Beyond 800 m",
    colour: "#ffffff",
    summary: "Outside LMR housing areas. Dual occupancies may still be possible in R2 zones under the statewide Stage 1 reform.",
    body: [
      "Land more than about 800 m walking distance from a centre is not in an LMR housing area.",
      "Since 1 July 2024, dual occupancies and semi-detached dwellings are permitted with consent in R2 zones across NSW (with some exceptions), subject to the LMR standards.",
      "Other housing types depend on the zone and the local plan.",
    ],
    sources: ["lmrPolicy"],
  },
};

export const CATEGORIES = {
  statutory: {
    id: "statutory",
    label: "Statutory exclusion",
    colour: "#c0392b",
    text: "The LMR provisions do not apply to this land. A proposal would need another planning pathway.",
  },
  assessment: {
    id: "assessment",
    label: "Additional assessment",
    colour: "#d68910",
    text: "LMR may still apply, but the constraint must be assessed and may reduce what can be built or stop it.",
  },
  design: {
    id: "design",
    label: "Design constraint",
    colour: "#7f8c8d",
    text: "Does not stop the policy applying, but shapes the design, the layout or the yield.",
  },
};

export const CONSTRAINTS = {
  bushfire: {
    id: "bushfire",
    name: "Bushfire-prone land",
    colour: "#d64545",
    category: "statutory",
    summary: "Land mapped as bushfire prone is excluded from the LMR provisions.",
    body: [
      "Councils map bushfire-prone land: the bushland itself and a buffer around it.",
      "The LMR policy does not apply to land identified as bushfire prone. Development may still be possible through other pathways, assessed against Planning for Bush Fire Protection.",
      "In this example, the buffer around the creek corridors and the reserve is shown as bushfire-prone land.",
    ],
    sources: ["lmrExclusions", "bushfire"],
  },
  flood: {
    id: "flood",
    name: "Flood-prone land",
    colour: "#3b82c4",
    category: "assessment",
    summary: "Flood-affected land needs flood assessment. Some high-hazard flood land is excluded from LMR.",
    body: [
      "Land near creeks and overland flow paths can flood. Flood planning controls set floor levels, safe access and evacuation requirements.",
      "Certain high-risk flood land (for example in specified catchments or flood categories) is excluded from the LMR provisions. Check the current exclusion list.",
      "In this example, flood land is treated as needing additional assessment. A real lot may be fully excluded.",
    ],
    sources: ["lmrExclusions"],
    verify: true,
  },
  heritageItem: {
    id: "heritageItem",
    name: "Heritage item",
    colour: "#7b4fa0",
    category: "statutory",
    summary: "An individually listed heritage item is excluded from the LMR provisions.",
    body: [
      "Heritage items are listed in the Local Environmental Plan or the State Heritage Register.",
      "The LMR provisions do not apply to land containing a heritage item. Changes are assessed through a development application with heritage advice.",
    ],
    sources: ["lmrExclusions"],
  },
  heritageArea: {
    id: "heritageArea",
    name: "Heritage conservation area",
    colour: "#9b72c4",
    category: "assessment",
    summary: "LMR can apply, but heritage conservation controls shape the design and must be assessed.",
    body: [
      "A heritage conservation area protects the character of a group of buildings and streets.",
      "The LMR provisions generally still apply in heritage conservation areas. The local heritage controls and the effect on the area's significance must be considered, usually through a development application.",
    ],
    sources: ["lmrPolicy"],
    verify: true,
  },
  biodiversity: {
    id: "biodiversity",
    name: "Biodiversity / significant vegetation",
    colour: "#3f8f5a",
    category: "assessment",
    summary: "Mapped biodiversity values and significant trees need ecological assessment.",
    body: [
      "Bushland, threatened species habitat and significant trees may be protected by the Biodiversity Conservation Act, the LEP or tree controls.",
      "This can reduce the buildable area or require offsets, even where LMR applies.",
    ],
    sources: ["lmrPolicy"],
    verify: true,
  },
  easement: {
    id: "easement",
    name: "Easement (transmission line)",
    colour: "#b23a8a",
    category: "design",
    summary: "An easement limits where buildings can go, but does not stop the policy applying.",
    body: [
      "Easements give another party rights over part of a lot, for example for power lines, drainage or sewer pipes.",
      "Buildings usually cannot be placed in the easement. This reduces the usable area and can make some housing types impractical.",
      "Some major pipeline corridors are LMR exclusions. Check the current list.",
    ],
    sources: ["lmrExclusions"],
  },
};

const LMR_R12_NOTE = "LMR standards are non-discretionary: if a proposal meets them, the council cannot refuse it on those grounds. If the local plan allows more, the more generous control applies.";

export const BUILDING_TYPES = [
  {
    id: "detached",
    name: "Detached house",
    colour: "#8c9ba5",
    roof: "hip",
    definition: "A building containing only one dwelling (called a dwelling house in the Standard Instrument).",
    configuration: "One house on one lot, usually with front and back gardens and a garage or driveway.",
    dwellings: "1 dwelling",
    considerations: ["Setbacks, landscaping and tree controls in the local plan", "Often eligible for complying development under the Codes SEPP"],
    lmr: "Not an LMR housing type. Detached houses are permitted under local plans in residential zones. The LMR policy allows more housing types on these lots.",
    sources: ["standardInstrument"],
  },
  {
    id: "semi",
    name: "Semi-detached dwelling",
    colour: "#59a89c",
    roof: "hip",
    definition: "A dwelling on its own lot of land that is attached to only one other dwelling.",
    configuration: "Two homes joined by a shared wall, each on its own Torrens title lot.",
    dwellings: "1 per lot (2 attached)",
    considerations: ["Lot subdivision rules", "Party wall fire separation"],
    lmr: "Stage 1 of the reforms permits dual occupancies and semi-detached dwellings with consent in R2 zones across NSW, subject to LMR standards.",
    sources: ["standardInstrument", "lmrPolicy"],
  },
  {
    id: "dual",
    name: "Dual occupancy",
    colour: "#3f8f7a",
    roof: "hip",
    definition: "Two dwellings on one lot of land, attached (by a common wall or floor) or detached. Does not include a secondary dwelling.",
    configuration: "Side-by-side duplex or one house behind the other, sharing a lot. Often subdivided afterwards.",
    dwellings: "2 dwellings",
    considerations: ["Minimum lot size and width", "Subdivision: each resulting lot at least 225 m² and 6 m wide (LMR)", "Driveways, parking and private open space"],
    lmr: "Permitted with consent in R2 zones statewide (from 1 July 2024). LMR standards: lot 450 m², width 12 m, FSR 0.65:1, height 9.5 m.",
    sources: ["standardInstrument", "lmrPolicy", "housingSepp"],
  },
  {
    id: "terraces",
    name: "Terraces",
    colour: "#e07a5f",
    roof: "hip",
    definition: "Multi dwelling housing where all dwellings are attached and face, and are generally aligned along, a public road.",
    configuration: "A row of narrow attached homes, each with its own street entry.",
    dwellings: "3 or more dwellings",
    considerations: ["Wide frontage needed (18 m under LMR)", "Rear lane or limited driveways", "Private open space for each home"],
    lmr: "Permitted in R2 within LMR housing areas. LMR standards: lot 500 m², width 18 m, FSR 0.7:1, height 9.5 m.",
    sources: ["housingSepp", "designGuide"],
  },
  {
    id: "townhouses",
    name: "Townhouses",
    colour: "#d1495b",
    roof: "hip",
    definition: "A common name for attached multi dwelling housing: usually two-storey homes with their own ground-level entry.",
    configuration: "Two rows of attached homes along a shared driveway, running deep into the lot.",
    dwellings: "3 or more dwellings",
    considerations: ["Shared driveway and visitor parking", "Strata or community title", "Overshadowing of neighbours"],
    lmr: "Assessed as multi dwelling housing. Permitted in R2 within LMR housing areas. LMR standards: lot 600 m², width 12 m, FSR 0.7:1, height 9.5 m.",
    sources: ["standardInstrument", "housingSepp", "designGuide"],
  },
  {
    id: "multi",
    name: "Multi dwelling housing",
    colour: "#c8a148",
    roof: "hip",
    definition: "Three or more dwellings (attached or detached) on one lot of land, each with access at ground level. Does not include a residential flat building.",
    configuration: "A cluster of villas or small homes around a shared driveway.",
    dwellings: "3 or more dwellings",
    considerations: ["Communal driveway and waste collection", "Landscaped area and deep soil", "Strata title"],
    lmr: "Permitted in R2 within LMR housing areas. LMR standards: lot 600 m², width 12 m, FSR 0.7:1, height 9.5 m.",
    sources: ["standardInstrument", "housingSepp", "designGuide"],
  },
  {
    id: "manor",
    name: "Manor house",
    colour: "#9b6fb5",
    roof: "hip",
    definition: "A building of no more than 2 storeys containing 3 or 4 dwellings, each attached to another, with at least one dwelling partly or wholly above another. A type of residential flat building.",
    configuration: "Looks like a large two-storey house but contains 3 or 4 apartments.",
    dwellings: "3–4 dwellings",
    considerations: ["Fits the scale of a detached-house street", "Shared stairs and parking"],
    lmr: "Treated here as a low-rise residential flat building. In R1 and R2 within the inner LMR area, the LMR standards are lot 500 m², width 12 m, FSR 0.8:1, height 9.5 m.",
    sources: ["standardInstrument", "housingSepp"],
    verify: true,
  },
  {
    id: "lowrise",
    name: "Low-rise apartment building",
    colour: "#4f86c6",
    roof: "flat",
    definition: "Not a legal term. A residential flat building (3 or more dwellings) of up to about 3 storeys.",
    configuration: "A small walk-up apartment block, often with car parking beneath or behind.",
    dwellings: "Typically 6–12 apartments",
    considerations: ["Apartment Design Guide (SEPP 65 / Housing SEPP Chapter 4) design quality", "Basement parking cost", "Communal open space"],
    lmr: "In R1 and R2 within the inner (0–400 m) LMR area: lot 500 m², width 12 m, FSR 0.8:1, height 9.5 m. Not permitted in R2 under LMR in the outer area.",
    sources: ["standardInstrument", "housingSepp", "adg"],
  },
  {
    id: "rfb",
    name: "Residential flat building",
    colour: "#3a5ba0",
    roof: "flat",
    definition: "A building containing 3 or more dwellings. Does not include attached dwellings, co-living housing or multi dwelling housing.",
    configuration: "An apartment building with shared lobby, lifts and stairs, typically 4 storeys in this example.",
    dwellings: "Typically 15–40 apartments",
    considerations: ["Apartment Design Guide", "Lot amalgamation often needed", "Deep soil and tree planting"],
    lmr: "In R3 and R4 zones within LMR areas. Inner: FSR 2.2:1, height 22 m (about 6 storeys). Outer: FSR 1.5:1, height 17.5 m (about 4 storeys). " + LMR_R12_NOTE,
    sources: ["standardInstrument", "housingSepp", "adg"],
    verify: true,
  },
  {
    id: "midrise",
    name: "Mid-rise apartment building",
    colour: "#2b2d6e",
    roof: "flat",
    definition: "Not a legal term. A residential flat building of about 5 or 6 storeys.",
    configuration: "A larger apartment building on an amalgamated site close to the centre.",
    dwellings: "Typically 30–70 apartments",
    considerations: ["Inner area of R3/R4 only (22 m)", "Amalgamation of several lots", "Transition to lower neighbours"],
    lmr: "Only in R3 and R4 within the inner (0–400 m) area: FSR 2.2:1, height 22 m. " + LMR_R12_NOTE,
    sources: ["housingSepp", "adg"],
    verify: true,
  },
  {
    id: "shoptop",
    name: "Shop-top housing",
    colour: "#6d4c41",
    roof: "flat",
    definition: "One or more dwellings located above ground-floor retail or business premises.",
    configuration: "Shops at street level with apartments above, usually in the town centre.",
    dwellings: "Varies",
    considerations: ["Active street frontage", "Noise, servicing and loading", "Local centre controls"],
    lmr: "LMR includes standards for shop-top housing in R3 and R4 zones where the local plan permits it. Inner: about 24 m (6 storeys). Outer: about 17.5 m (4 storeys). In the E1 centre itself, the local plan applies.",
    sources: ["standardInstrument", "housingSepp"],
    verify: true,
  },
];

export const TYPE_BY_ID = Object.fromEntries(BUILDING_TYPES.map((t) => [t.id, t]));

export const NON_RESIDENTIAL = {
  retail: { name: "Shopping centre", colour: "#9aa0a6", text: "Shopping Village: supermarkets, shops and services. This is why the area is mapped as an LMR town centre." },
  school: { name: "Public school", colour: "#a9a3c4", text: "Banksia Creek Public School. Schools are part of the social infrastructure that supports more housing." },
  church: { name: "Church (heritage item)", colour: "#7b4fa0", text: "St Andrew's Church, a listed heritage item in this hypothetical suburb." },
  clubhouse: { name: "Golf clubhouse", colour: "#9aa0a6", text: "Banksia Creek Golf Club, private recreation land." },
};

// Simplified LMR standards (Housing SEPP Chapter 6). Values flagged verify in the prompt still need confirming.
export const STANDARDS = {
  dual: { lotArea: 450, width: 12, fsr: 0.65, height: 9.5 },
  semi: { lotArea: 450, width: 12, fsr: 0.65, height: 9.5 },
  terraces: { lotArea: 500, width: 18, fsr: 0.7, height: 9.5 },
  multi: { lotArea: 600, width: 12, fsr: 0.7, height: 9.5 },
  townhouses: { lotArea: 600, width: 12, fsr: 0.7, height: 9.5 },
  lowrise: { lotArea: 500, width: 12, fsr: 0.8, height: 9.5 },
  manor: { lotArea: 500, width: 12, fsr: 0.8, height: 9.5 },
  rfbInner: { lotArea: 500, width: 21, fsr: 2.2, height: 22, storeys: 6 },
  rfbOuter: { lotArea: 500, width: 21, fsr: 1.5, height: 17.5, storeys: 4 },
  shoptopInner: { fsr: 2.5, height: 24, storeys: 6 },
  shoptopOuter: { fsr: 2.0, height: 17.5, storeys: 4 },
};

export const MODULES = [
  {
    id: "m1",
    title: "What is LMR?",
    lead: "The Low and Mid-Rise Housing policy lets more types of homes be built in well-located suburbs.",
    body: [
      "The NSW Government introduced the policy through the Housing SEPP to allow more housing choice near shops, services and public transport.",
      "Stage 1 (1 July 2024) allowed dual occupancies and semi-detached dwellings in R2 zones across NSW.",
      "Stage 2 (28 February 2025) allowed terraces, townhouses, manor houses, low-rise and mid-rise apartments within about 800 m walking distance of selected town centres and stations.",
      "It is aimed at 'missing middle' housing: homes between a detached house and a high-rise tower.",
    ],
    show: { layers: ["centre", "inner", "outer"], view: "home" },
  },
  {
    id: "m2",
    title: "Residential building types",
    lead: "Each building type has its own definition, lot size and design standards.",
    body: [
      "Click any building on the map to read what it is, then use the 'On this site' checklist to see if that type could be considered on that lot.",
      "Colour the map by building type with the 'Building types' layer. The sidebar list shows every type.",
      "Legal definitions come from the Standard Instrument LEP. Names like 'townhouse' and 'mid-rise apartment' are common terms, not legal ones.",
    ],
    show: { layers: ["types"], view: "home" },
  },
  {
    id: "m3",
    title: "The 400 m and 800 m areas",
    lead: "Walking distance from the centre decides which LMR standards apply.",
    body: [
      "Distances are measured as walking distance along streets and paths, not a straight radius. That is why the bands on the map have irregular edges.",
      "0–400 m (inner): the widest range of housing types and the highest standards (up to about 6 storeys in R3/R4).",
      "400–800 m (outer): terraces, townhouses and dual occupancies in R2; about 4 storeys in R3/R4.",
      "Real LMR maps use measured distances and published boundaries. Always check the official map.",
    ],
    show: { layers: ["centre", "inner", "outer"], view: "centre" },
  },
  {
    id: "m4",
    title: "Planning controls",
    lead: "Zone, lot size, width, floor space ratio and height work together.",
    body: [
      "Zone: R1–R4 residential zones are where LMR housing types can be considered.",
      "Lot size and width: each type has a minimum, for example 450 m² and 12 m for a dual occupancy.",
      "Floor space ratio (FSR): total floor area divided by site area. An FSR of 0.7:1 on a 600 m² lot allows about 420 m² of floor area.",
      "Height: measured from existing ground level. 9.5 m usually means two storeys plus a roof.",
      "Non-discretionary standards: if a proposal meets them, the council cannot refuse it for those reasons. A more generous local control still applies.",
    ],
    show: { layers: ["zoning"], view: "home" },
  },
  {
    id: "m5",
    title: "Exclusions and constraints",
    lead: "Some land is excluded from LMR. Other constraints need more assessment or shape the design.",
    body: [
      "Statutory exclusions (red): the LMR provisions do not apply, for example bushfire-prone land and heritage items.",
      "Additional assessment (amber): LMR may apply but the issue must be assessed, for example flooding, heritage conservation areas and biodiversity.",
      "Design constraints (grey): easements, trees, slope and access shape the layout and yield.",
      "Other exclusions include coastal wetlands and littoral rainforest, land near some pipelines, aircraft noise areas (ANEF 20+) and some land covered by other State policies. Check the current list.",
    ],
    show: { layers: ["bushfire", "flood", "heritage", "biodiversity", "easement"], view: "home" },
  },
  {
    id: "m6",
    title: "DA or CDC?",
    lead: "There are two main approval pathways.",
    body: [
      "Development application (DA): assessed by the council against the LEP, DCP and SEPPs. Needed for most LMR apartments and for anything that does not meet the complying development standards.",
      "Complying development certificate (CDC): a fast-track approval by a council or private certifier if a proposal meets every standard in the Codes SEPP. Some low-rise types such as dual occupancies and terraces may qualify.",
      "Exclusions such as heritage and bushfire often rule out CDC even where a DA is possible.",
    ],
    show: { layers: ["inner", "outer"], view: "home" },
  },
  {
    id: "m7",
    title: "From potential to project",
    lead: "Being inside the 800 m line is the start, not the end.",
    body: [
      "1. Check the official LMR map and the zone.",
      "2. Get a planning certificate (section 10.7) and confirm exclusions and constraints.",
      "3. Check lot size, width, slope, trees, easements and access.",
      "4. Test the design against the LMR standards, the design guides and the DCP.",
      "5. Talk to the council (pre-lodgement meeting) and qualified professionals.",
      "6. Lodge a DA or CDC through the NSW Planning Portal.",
    ],
    show: { layers: ["centre", "inner", "outer", "bushfire", "heritage"], view: "home" },
  },
];

export const TOUR = [
  { title: "Welcome to Banksia Creek", text: "This is a hypothetical NSW suburb. It is used to explain how the Low and Mid-Rise Housing (LMR) policy works.", layers: [], view: "home" },
  { title: "The LMR centre", text: "Shopping Village (blue) is the town centre. Its shops and services are why more housing is encouraged nearby.", layers: ["centre"], view: "centre" },
  { title: "Walking distances", text: "Orange is within 400 m walk; yellow is 400–800 m. Distances follow streets and paths, so the edges are irregular.", layers: ["centre", "inner", "outer"], view: "home" },
  { title: "Building types", text: "Each colour is a residential building type. Click a building to learn what it is and whether it could be built on its lot.", layers: ["types"], view: "centre" },
  { title: "Exclusions and constraints", text: "Red hatching is excluded from LMR (bushfire, heritage items). Blue, purple and green need more assessment.", layers: ["bushfire", "flood", "heritage", "biodiversity", "easement"], view: "home" },
  { title: "Check a lot", text: "Click any lot to see its zone, walking distance, constraints and an indicative checklist for each building type.", layers: ["centre", "inner", "outer", "lots"], view: "centre" },
  { title: "Keep learning", text: "Open the Learning Centre for seven short modules. For advice on a real site, contact SN Architects.", layers: ["centre", "inner", "outer"], view: "home" },
];

export const GLOSSARY = [
  ["FSR", "Floor space ratio: gross floor area divided by site area."],
  ["LEP", "Local Environmental Plan: the council's main planning instrument (zones, heights, FSR, heritage)."],
  ["DCP", "Development Control Plan: detailed design guidelines from the council."],
  ["SEPP", "State Environmental Planning Policy: a NSW-wide planning instrument."],
  ["DA", "Development application, assessed by the council or a planning panel."],
  ["CDC", "Complying development certificate: fast-track approval for proposals that meet set standards."],
  ["Non-discretionary standard", "A standard that, if met, cannot be used to refuse a development."],
  ["Walking distance", "Distance measured along a walkable route, not a straight line."],
  ["Planning certificate", "A section 10.7 certificate from the council listing the controls on a lot."],
];
