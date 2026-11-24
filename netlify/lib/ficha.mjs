// Ficha corta de cada auto: motor, transmisión, pasajeros, financiamiento y estado.
// Primero se usa lo que venga en la hoja (columnas "Motor", "Transmisión", "Pasajeros");
// si la columna está vacía, se deduce del título de Mercado Libre.
// Nunca se publican número de serie, teléfonos ni la descripción de la agencia.

const limpiar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Regla de Luis: los autos con MÁS de 6 años no se financian (el cliente debe preguntar).
export const ANIOS_MAX_FINANCIAMIENTO = 6;

// Año actual en la Ciudad de México (para no depender de la zona horaria del servidor)
export function anioActual() {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", year: "numeric" }).format(new Date()));
}

export function transmisionDe(valorHoja, titulo) {
  const v = limpiar(valorHoja);
  if (v) {
    if (/cvt/.test(v)) return "Automática CVT";
    if (/dsg|doble embrague/.test(v)) return "Automática DSG";
    if (/auto/.test(v)) return "Automática";
    if (/manual|estandar|std/.test(v)) return "Manual";
    return String(valorHoja).trim();
  }
  const t = ` ${limpiar(titulo)} `;
  if (/\bcvt\b/.test(t)) return "Automática CVT";
  if (/\bdsg\b/.test(t)) return "Automática DSG";
  if (/\b(at|aut|automatica|automatico|tiptronic)\b/.test(t)) return "Automática";
  if (/\b(mt|std|manual|estandar)\b/.test(t)) return "Manual";
  return "";
}

export function motorDe(valorHoja, titulo) {
  const v = String(valorHoja ?? "").trim();
  if (v) return /^\d\.\d$/.test(v) ? `${v} L` : v;
  const t = limpiar(titulo);
  const partes = [];
  const litros = t.match(/\b(\d\.\d)\b/);
  if (litros) partes.push(`${litros[1]} L`);
  const cil = t.match(/\b(v6|v8|v10|v12)\b/);
  if (cil) partes.push(cil[1].toUpperCase());
  if (/\bturbo\b|\btsi\b|\btfsi\b|\becoboost\b/.test(t)) partes.push("Turbo");
  if (/e-?power/.test(t)) partes.push("e-POWER híbrido");
  else if (/\b(phev|4xe|plug-?in)\b/.test(t)) partes.push("Híbrido enchufable");
  else if (/\bhibrido\b|\bhybrid\b|\bhev\b/.test(t)) partes.push("Híbrido");
  else if (/\belectrico\b|\bev\b/.test(t)) partes.push("Eléctrico");
  return partes.join(" · ");
}

export function pasajerosDe(valorHoja, titulo) {
  const n = Number(String(valorHoja ?? "").replace(/[^\d]/g, ""));
  if (n > 0 && n < 30) return n;
  const t = limpiar(titulo);
  const m = t.match(/\b(\d{1,2})\s*(pasajeros|pas|plazas|asientos)\b/);
  if (m) return Number(m[1]);
  if (/\b3\s*f(ilas)?\b/.test(t)) return 7; // "3 filas" / "3f" (X-Trail, Pathfinder…)
  if (/\b2\s*filas\b/.test(t)) return 5;
  return null;
}

// "si" = se puede financiar · "consultar" = más de 6 años o sin año · "contado" = particular
export function financiamientoDe(anio, esCliente) {
  if (esCliente) return "contado";
  if (!anio) return "consultar";
  return anioActual() - anio > ANIOS_MAX_FINANCIAMIENTO ? "consultar" : "si";
}
