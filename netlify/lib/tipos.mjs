// Clasifica cada auto por tipo de vehículo (SUV, Sedán, Hatchback, Pickup, Van) a partir del modelo.
// Si un modelo no está en la lista, se usan pistas del título; si tampoco hay pistas, queda "Otro".
// Para agregar un modelo: escríbelo en minúsculas, sin espacios ni guiones (ej. "cx-5" → "cx5").

const TIPOS = {
  SUV: [
    // Nissan / Infiniti
    "kicks", "xtrail", "pathfinder", "murano", "juke", "qashqai", "armada", "qx50", "qx55", "qx60", "qx80",
    // Chevrolet / GMC / Cadillac
    "captiva", "groove", "tracker", "trax", "equinox", "blazer", "traverse", "tahoe", "suburban", "trailblazer",
    "acadia", "terrain", "yukon", "escalade", "xt4", "xt5", "xt6",
    // Buick
    "enclave", "encore", "envision", "envista",
    // VW / SEAT / CUPRA
    "tiguan", "taos", "tcross", "teramont", "touareg", "troc", "nivus", "arona", "ateca", "tarraco", "formentor",
    // Kia / Hyundai
    "sportage", "seltos", "sorento", "sonet", "niro", "tucson", "santafe", "santa", "creta", "kona", "venue", "palisade",
    // Mazda / Toyota / Honda
    "cx3", "cx30", "cx5", "cx50", "cx9", "cx90", "rav4", "highlander", "sequoia", "4runner", "landcruiser",
    "corollacross", "crv", "hrv", "brv", "pilot", "wrv",
    // Jeep / Dodge / Ford / Lincoln
    "compass", "cherokee", "grandcherokee", "grand", "wrangler", "renegade", "commander", "journey", "durango",
    "ecosport", "escape", "edge", "explorer", "expedition", "bronco", "territory", "navigator", "nautilus", "aviator", "corsair",
    // Renault / Peugeot / MG / Mitsubishi / Subaru / Suzuki / chinas / premium
    "duster", "koleos", "captur", "arkana", "2008", "3008", "5008", "rx5", "rx8", "zs", "hs", "gs",
    "outlander", "asx", "eclipsecross", "forester", "outback", "crosstrek", "xv", "vitara", "grandvitara", "jimny",
    "cs35", "cs55", "x35", "x55", "x70", "tiggo", "jetour", "haval", "jolion", "h6",
    "x1", "x2", "x3", "x4", "x5", "x6", "x7", "q2", "q3", "q5", "q7", "q8", "gla", "glb", "glc", "gle", "gls",
    "xc40", "xc60", "xc90", "claseglc", "clasegla", "claseglb", "clasegle", "clasegls", "clasegl", "claseg", "macan", "cayenne", "evoque", "discovery", "rangerover", "defender",
  ],
  Sedán: [
    "versa", "sentra", "altima", "maxima", "vdrive", "tsuru",
    "aveo", "onix", "cavalier", "malibu", "optra",
    "jetta", "vento", "virtus", "passat", "bora",
    "rio", "forte", "k3", "k4", "accent", "elantra", "sonata", "ioniq",
    "3", "6", "corolla", "camry", "civic", "accord", "city", "insight",
    "301", "408", "a3", "a4", "a5", "a6", "serie3", "serie5", "clasec", "clasea", "clasee",
    "clasecla", "clases", "claseclase", "charger", "300", "cla", "s60", "s90", "a6", "serie4", "attrage", "lancer", "mirageg4", "mg5", "gt", "logan", "fluence", "dart", "fusion", "figosedan",
  ],
  Hatchback: [
    "march", "note", "tiida", "spark", "beat", "swift", "ignite", "baleno", "polo", "gol", "up", "golf", "crossfox",
    "i10", "picanto", "mirage", "kwid", "sandero", "stepway", "208", "fiesta", "figo", "fit", "mini", "cooper",
    "grandi10", "a1", "ibiza", "leon", "2", "yarishb", "500", "mobi", "uno", "argo", "pulse", "fastback",
  ],
  Pickup: [
    "frontier", "np300", "navara", "s10", "colorado", "silverado", "cheyenne", "tornado", "montana",
    "ranger", "f150", "lobo", "maverick", "hilux", "tacoma", "tundra", "700", "1500", "2500", "4000",
    "saveiro", "amarok", "l200", "oroch", "alaskan", "gladiator", "strada", "toro", "d22", "sierra", "canyon",
  ],
  Van: [
    "urvan", "nv200", "nv350", "caddy", "transporter", "crafter", "multivan", "sprinter", "express", "h1", "staria",
    "partner", "rifter", "expert", "kangoo", "trafic", "transit", "odyssey", "sienna", "hiace", "carnival", "sedona",
    "towncountry", "town", "pacifica", "promaster", "ertiga", "xl7", "avanza", "rush", "spacewagon", "eurovan",
  ],
};

// Índice inverso: "kicks" → "SUV"
const INDICE = new Map();
for (const [tipo, modelos] of Object.entries(TIPOS)) for (const m of modelos) if (!INDICE.has(m)) INDICE.set(m, tipo);

const limpiar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function tipoVehiculo(marca, modelo, titulo) {
  const t = limpiar(titulo);

  // 1) Carrocería escrita en el título (el mismo modelo puede ser sedán o hatchback: Rio, Yaris, Mazda 2…)
  if (/\b(hb|hatchback|hatch)\b/.test(t)) return "Hatchback";
  if (/\bsedan\b/.test(t)) return "Sedán";

  // 2) Modelo en la lista. "Mazda Mazda 3" → modelo "3"; "Santa Fe" → "santafe"; "X-Trail" → "xtrail"
  const marcaL = limpiar(marca);
  let m = limpiar(modelo).replace(new RegExp(`^${marcaL}\\s+`), "");
  const palabras = m.split(/\s+/).filter(Boolean);
  const claves = [palabras.join(""), palabras.slice(0, 2).join(""), palabras[0] || ""].map((k) => k.replace(/[^a-z0-9]/g, ""));
  for (const k of claves) if (k && INDICE.has(k)) return INDICE.get(k);

  // 3) Marcas que casi siempre son de un tipo
  if (marcaL === "ram") return "Pickup";

  // 4) Últimas pistas del título (solo si el modelo no se reconoció; "7 pasajeros" también lo dicen SUVs)
  if (/\b(cargo van|van|\d+\s*pas)\b/.test(t)) return "Van";
  if (/\b(cabina|cab|pick ?up|chasis)\b/.test(t)) return "Pickup";

  return "Otro";
}
