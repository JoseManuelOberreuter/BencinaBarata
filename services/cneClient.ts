import { getCneApiToken, getCneStationsUrl } from '../constants/config';
import type { Station } from '../types/station';

const CNE_BASE = 'https://api.cne.cl/api/v4';

function parseNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    // Miles con punto y decimal con coma (ej. 1.234,5)
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
      const n = parseFloat(t.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    const n = parseFloat(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const ARRAY_KEYS = [
  'features', // GeoJSON FeatureCollection
  'data',
  'estaciones',
  'resultados',
  'items',
  'records',
  'datos',
  'lista',
  'listado',
  'results',
  'content',
  'estacionesServicio',
];

/** La CNE a veces anida el arreglo (p. ej. `data: { estaciones: [...] }`). */
function extractArray(json: unknown, depth = 0): unknown[] {
  if (depth > 8) return [];
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  const o = json as Record<string, unknown>;
  for (const key of ARRAY_KEYS) {
    const v = o[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = extractArray(v, depth + 1);
      if (inner.length > 0) return inner;
    }
  }
  return [];
}

/** Respuestas de error frecuentes con HTTP 200: `{"status":"Token is Invalid"}`. */
function throwIfCneStatusError(json: unknown): void {
  if (!json || typeof json !== 'object') return;
  const o = json as Record<string, unknown>;
  if (typeof o.status !== 'string') return;
  const s = o.status.trim();
  if (!s) return;
  const lower = s.toLowerCase();
  if (lower === 'ok' || lower === 'success' || lower === '200') return;
  if (
    /token|authorization|invalid|inválido|not found|no encontrado|no autorizado|denegad|error/i.test(s)
  ) {
    throw new Error(s);
  }
}

function readCoordinates(raw: Record<string, unknown>): { lat: number; lon: number } | null {
  const geom = raw.geometry;
  if (geom && typeof geom === 'object' && !Array.isArray(geom)) {
    const g = geom as Record<string, unknown>;
    if (g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
      const lon = parseNumber(g.coordinates[0]);
      const lat = parseNumber(g.coordinates[1]);
      if (lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
  }

  const lat =
    parseNumber(raw.latitud) ??
    parseNumber(raw.lat) ??
    parseNumber(raw.latitude) ??
    parseNumber(raw.Latitud) ??
    parseNumber(raw.LATITUD) ??
    (raw.ubicacion && typeof raw.ubicacion === 'object'
      ? parseNumber((raw.ubicacion as Record<string, unknown>).latitud) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).lat) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).latitude)
      : null);

  const lon =
    parseNumber(raw.longitud) ??
    parseNumber(raw.lon) ??
    parseNumber(raw.lng) ??
    parseNumber(raw.longitude) ??
    parseNumber(raw.Longitud) ??
    parseNumber(raw.LONGITUD) ??
    (raw.ubicacion && typeof raw.ubicacion === 'object'
      ? parseNumber((raw.ubicacion as Record<string, unknown>).longitud) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).lng) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).lon) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).longitude)
      : null);

  let latF = lat;
  let lonF = lon;
  if ((latF == null || lonF == null) && raw.coordenadas && typeof raw.coordenadas === 'object') {
    const c = raw.coordenadas as Record<string, unknown>;
    latF = latF ?? parseNumber(c.lat) ?? parseNumber(c.latitude) ?? parseNumber(c.latitud);
    lonF = lonF ?? parseNumber(c.lng) ?? parseNumber(c.lon) ?? parseNumber(c.longitude) ?? parseNumber(c.longitud);
  }

  if (latF == null || lonF == null) return null;
  if (latF < -90 || latF > 90 || lonF < -180 || lonF > 180) return null;
  return { lat: latF, lon: lonF };
}

type PriceCandidate = { price: number; label?: string };

function collectPriceCandidates(raw: Record<string, unknown>): PriceCandidate[] {
  const candidates: PriceCandidate[] = [];

  const pushPrice = (p: unknown, label?: string) => {
    const n = parseNumber(p);
    if (n != null && n > 0) candidates.push({ price: n, label });
  };

  const precios =
    raw.precios ??
    raw.preciosCombustible ??
    raw.combustibles ??
    raw.precioPorCombustible ??
    raw.preciosVigentes ??
    raw.listaPrecios ??
    raw.detallePrecios ??
    raw.productos ??
    raw.preciosDetalle;

  /** API CNE v4: `precios` es un objeto `{ "93": { precio, ... }, "95": {...}, "GLP": {...} }`. */
  if (precios && typeof precios === 'object' && !Array.isArray(precios)) {
    for (const [combustibleKey, item] of Object.entries(precios)) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        pushPrice(
          o.precio ??
            o.valor ??
            o.precioUnitario ??
            o.monto ??
            o.precioVenta ??
            o.precioLista,
          combustibleKey,
        );
      }
    }
  }

  if (Array.isArray(precios)) {
    for (const item of precios) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const label =
          typeof o.nombre === 'string'
            ? o.nombre
            : typeof o.nombreProducto === 'string'
              ? o.nombreProducto
              : typeof o.descripcion === 'string'
                ? o.descripcion
                : typeof o.tipo === 'string'
                  ? o.tipo
                  : undefined;
        pushPrice(
          o.precio ??
            o.valor ??
            o.precioUnitario ??
            o.monto ??
            o.precioVenta ??
            o.precioLista,
          label,
        );
      }
    }
  }

  for (const key of Object.keys(raw)) {
    if (/precio/i.test(key) && key !== 'precios') {
      pushPrice(raw[key], key);
    }
  }

  for (const key of ['precio', 'precioGasolina93', 'precio_bencina_93', 'precioCombustible']) {
    pushPrice(raw[key]);
  }

  return candidates;
}

/** Mapa combustible → precio (si hay claves repetidas, queda el menor). */
function candidatesToFuelPrices(candidates: PriceCandidate[]): Record<string, number> {
  const out: Record<string, number> = {};
  let anon = 0;
  for (const c of candidates) {
    const key = (c.label?.trim() || `precio_${anon++}`).trim();
    const prev = out[key];
    if (prev == null || c.price < prev) out[key] = c.price;
  }
  return out;
}

function pickFromCandidates(candidates: PriceCandidate[]): { price: number; label?: string } | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const gasoline = candidates.find(
    (c) => c.label && /93|95|97|gasolina|bencina/i.test(c.label),
  );
  return gasoline ?? candidates.reduce((a, b) => (a.price < b.price ? a : b));
}

function pickBestPrice(raw: Record<string, unknown>): { price: number; label?: string } | null {
  return pickFromCandidates(collectPriceCandidates(raw));
}

/** GeoJSON Feature o filas con `properties` / envoltorios típicos de la CNE. */
function unwrapStationRecord(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.type === 'Feature' && raw.properties && typeof raw.properties === 'object') {
    const props = raw.properties as Record<string, unknown>;
    return raw.geometry !== undefined ? { ...props, geometry: raw.geometry } : { ...props };
  }
  const nested =
    raw.estacion ??
    raw.Estacion ??
    raw.estacionServicio ??
    raw.datos ??
    raw.attributes ??
    raw.Attributes;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...(nested as Record<string, unknown>), ...raw };
  }
  return raw;
}

function normalizeStation(raw: unknown, index: number): Station | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = unwrapStationRecord(raw as Record<string, unknown>);
  const coords = readCoordinates(o);
  if (!coords) return null;

  const candidates = collectPriceCandidates(o);
  if (candidates.length === 0) return null;
  const fuelPrices = candidatesToFuelPrices(candidates);
  const priceInfo = pickFromCandidates(candidates);
  if (!priceInfo) return null;

  const id =
    (typeof o.codigo === 'string' || typeof o.codigo === 'number' ? String(o.codigo) : null) ??
    (typeof o.id === 'string' || typeof o.id === 'number' ? String(o.id) : null) ??
    (typeof o.idEstacion === 'string' || typeof o.idEstacion === 'number' ? String(o.idEstacion) : null) ??
    `idx-${index}`;

  const ub =
    o.ubicacion && typeof o.ubicacion === 'object'
      ? (o.ubicacion as Record<string, unknown>)
      : null;
  const distribuidor =
    o.distribuidor && typeof o.distribuidor === 'object'
      ? (o.distribuidor as Record<string, unknown>)
      : null;
  const marca =
    distribuidor && typeof distribuidor.marca === 'string' ? distribuidor.marca.trim() : '';
  const comuna =
    ub && typeof ub.nombre_comuna === 'string' ? ub.nombre_comuna.trim() : '';

  /** Marca (COPEC, Shell, …) es lo que el usuario reconoce; `razon_social` es la razón legal. */
  const name =
    (marca && (comuna ? `${marca} · ${comuna}` : marca)) ||
    (typeof o.nombre === 'string' && o.nombre.trim()) ||
    (typeof o.nombreFantasia === 'string' && o.nombreFantasia.trim()) ||
    (typeof o.razon_social === 'string' && o.razon_social.trim()) ||
    (typeof o.razonSocial === 'string' && o.razonSocial.trim()) ||
    (typeof o.direccion === 'string' && o.direccion.trim()) ||
    (ub && typeof ub.direccion === 'string' && ub.direccion.trim()) ||
    'Estación de servicio';

  return {
    id,
    name,
    latitude: coords.lat,
    longitude: coords.lon,
    pricePerLiter: priceInfo.price,
    fuelLabel: priceInfo.label,
    fuelPrices,
  };
}

async function readCneEstacionesResponse(res: Response): Promise<Station[]> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('La respuesta de la CNE no es JSON válido.');
  }

  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && typeof (json as { status?: unknown }).status === 'string'
        ? String((json as { status: string }).status)
        : `Error HTTP ${res.status}`;
    throw new Error(msg);
  }

  /** La CNE a veces responde 200 con `{"status":"Token is Invalid"}` y sin lista. */
  throwIfCneStatusError(json);

  const rows = extractArray(json);
  const out: Station[] = [];
  rows.forEach((row, i) => {
    const s = normalizeStation(row, i);
    if (s) out.push(s);
  });

  if (out.length === 0 && rows.length > 0) {
    throw new Error(
      'La API devolvió estaciones pero no pudimos leer coordenadas/precios. Revisa el formato en apidocs.cne.cl.',
    );
  }

  return out;
}

/**
 * Descarga estaciones. Si existe `CNE_STATIONS_URL` en config, hace GET ahí (sin Bearer en el cliente).
 * Si no, usa `CNE_API_TOKEN` contra la API CNE.
 */
export async function fetchStations(): Promise<Station[]> {
  const proxyUrl = getCneStationsUrl().trim();
  if (proxyUrl) {
    const res = await fetch(proxyUrl, {
      headers: { Accept: 'application/json' },
    });
    return readCneEstacionesResponse(res);
  }

  const token = getCneApiToken().trim();
  if (!token) {
    throw new Error(
      'Falta CNE_STATIONS_URL o CNE_API_TOKEN. Regístrate en https://api.cne.cl/register (ver .env.example).',
    );
  }

  const res = await fetch(`${CNE_BASE}/estaciones`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  return readCneEstacionesResponse(res);
}
