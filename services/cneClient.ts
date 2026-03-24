import type { Station } from '../types/station';

const CNE_BASE = 'https://api.cne.cl/api/v4';

function parseNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractArray(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    for (const key of ['data', 'estaciones', 'resultados', 'items', 'records']) {
      const v = o[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function readCoordinates(raw: Record<string, unknown>): { lat: number; lon: number } | null {
  const lat =
    parseNumber(raw.latitud) ??
    parseNumber(raw.lat) ??
    parseNumber(raw.latitude) ??
    (raw.ubicacion && typeof raw.ubicacion === 'object'
      ? parseNumber((raw.ubicacion as Record<string, unknown>).lat) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).latitude)
      : null);

  const lon =
    parseNumber(raw.longitud) ??
    parseNumber(raw.lon) ??
    parseNumber(raw.lng) ??
    parseNumber(raw.longitude) ??
    (raw.ubicacion && typeof raw.ubicacion === 'object'
      ? parseNumber((raw.ubicacion as Record<string, unknown>).lng) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).lon) ??
        parseNumber((raw.ubicacion as Record<string, unknown>).longitude)
      : null);

  if (lat == null || lon == null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function pickBestPrice(raw: Record<string, unknown>): { price: number; label?: string } | null {
  const candidates: { price: number; label?: string }[] = [];

  const pushPrice = (p: unknown, label?: string) => {
    const n = parseNumber(p);
    if (n != null && n > 0) candidates.push({ price: n, label });
  };

  const precios = raw.precios ?? raw.preciosCombustible ?? raw.combustibles ?? raw.precioPorCombustible;
  if (Array.isArray(precios)) {
    for (const item of precios) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const label =
          typeof o.nombre === 'string'
            ? o.nombre
            : typeof o.nombreProducto === 'string'
              ? o.nombreProducto
              : undefined;
        pushPrice(o.precio ?? o.valor ?? o.precioUnitario, label);
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

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const gasoline = candidates.find(
    (c) => c.label && /93|95|97|gasolina|bencina/i.test(c.label),
  );
  const chosen = gasoline ?? candidates.reduce((a, b) => (a.price < b.price ? a : b));
  return chosen;
}

function normalizeStation(raw: unknown, index: number): Station | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const coords = readCoordinates(o);
  if (!coords) return null;

  const priceInfo = pickBestPrice(o);
  if (!priceInfo) return null;

  const id =
    (typeof o.id === 'string' || typeof o.id === 'number' ? String(o.id) : null) ??
    (typeof o.idEstacion === 'string' || typeof o.idEstacion === 'number' ? String(o.idEstacion) : null) ??
    (typeof o.codigo === 'string' || typeof o.codigo === 'number' ? String(o.codigo) : null) ??
    `idx-${index}`;

  const name =
    (typeof o.nombre === 'string' && o.nombre.trim()) ||
    (typeof o.nombreFantasia === 'string' && o.nombreFantasia.trim()) ||
    (typeof o.razonSocial === 'string' && o.razonSocial.trim()) ||
    (typeof o.direccion === 'string' && o.direccion.trim()) ||
    'Estación de servicio';

  return {
    id,
    name,
    latitude: coords.lat,
    longitude: coords.lon,
    pricePerLiter: priceInfo.price,
    fuelLabel: priceInfo.label,
  };
}

export async function fetchStations(token: string): Promise<Station[]> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('Falta CNE_API_TOKEN. Regístrate en https://api.cne.cl/register');
  }

  const res = await fetch(`${CNE_BASE}/estaciones`, {
    headers: {
      Authorization: `Bearer ${trimmed}`,
      Accept: 'application/json',
    },
  });

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

  const rows = extractArray(json);
  const out: Station[] = [];
  rows.forEach((row, i) => {
    const s = normalizeStation(row, i);
    if (s) out.push(s);
  });
  return out;
}
