import { INaturalistTaxon, SustainabilityInfo, SustainabilityLevel } from '../types/inaturalist';

const BASE_URL = 'https://api.inaturalist.org/v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: INaturalistTaxon | null;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): INaturalistTaxon | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCached(key: string, data: INaturalistTaxon | null): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch taxon data for a fish species by common name.
 * Returns null if not found.
 */
export async function fetchTaxonByName(speciesName: string): Promise<INaturalistTaxon | null> {
  const cacheKey = speciesName.toLowerCase().trim();
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const params = new URLSearchParams({
      q: speciesName,
      rank: 'species,subspecies,variety',
      per_page: '1',
      locale: 'en',
    });

    const response = await fetch(`${BASE_URL}/taxa?${params}`);
    if (!response.ok) throw new Error(`iNaturalist API error: ${response.status}`);

    const json = await response.json();
    const taxon: INaturalistTaxon | null = json.results?.[0] ?? null;
    setCached(cacheKey, taxon);
    return taxon;
  } catch (err) {
    console.error(`[iNaturalist] Failed to fetch taxon for "${speciesName}":`, err);
    setCached(cacheKey, null);
    return null;
  }
}

/**
 * Fetch full taxon details by iNaturalist taxon ID.
 */
export async function fetchTaxonById(taxonId: number): Promise<INaturalistTaxon | null> {
  const cacheKey = `id:${taxonId}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`${BASE_URL}/taxa/${taxonId}`);
    if (!response.ok) throw new Error(`iNaturalist API error: ${response.status}`);

    const json = await response.json();
    const taxon: INaturalistTaxon | null = json.results?.[0] ?? null;
    setCached(cacheKey, taxon);
    return taxon;
  } catch (err) {
    console.error(`[iNaturalist] Failed to fetch taxon ID ${taxonId}:`, err);
    return null;
  }
}

/**
 * IUCN numeric codes from iNaturalist:
 *   0  = NE (Not Evaluated)
 *   5  = DD (Data Deficient)
 *   10 = LC (Least Concern)
 *   20 = NT (Near Threatened)
 *   30 = VU (Vulnerable)
 *   40 = EN (Endangered)
 *   50 = CR (Critically Endangered)
 *   60 = EW (Extinct in the Wild)
 *   70 = EX (Extinct)
 */
const IUCN_META: Record<number, { label: string; code: string; level: SustainabilityLevel; color: string; score: number }> = {
  0:  { label: 'Not Evaluated',          code: 'NE', level: 'unknown',  color: '#9CA3AF', score: 0 },
  5:  { label: 'Data Deficient',         code: 'DD', level: 'unknown',  color: '#9CA3AF', score: 1 },
  10: { label: 'Least Concern',          code: 'LC', level: 'safe',     color: '#10B981', score: 2 },
  20: { label: 'Near Threatened',        code: 'NT', level: 'caution',  color: '#84CC16', score: 3 },
  30: { label: 'Vulnerable',             code: 'VU', level: 'caution',  color: '#F59E0B', score: 4 },
  40: { label: 'Endangered',             code: 'EN', level: 'avoid',    color: '#F97316', score: 5 },
  50: { label: 'Critically Endangered',  code: 'CR', level: 'avoid',    color: '#EF4444', score: 6 },
  60: { label: 'Extinct in the Wild',    code: 'EW', level: 'avoid',    color: '#7C3AED', score: 7 },
  70: { label: 'Extinct',               code: 'EX', level: 'avoid',    color: '#111827', score: 8 },
};

function getIUCNMeta(iucnCode: number | undefined) {
  if (iucnCode === undefined || iucnCode === null) {
    return IUCN_META[0]; // Not Evaluated
  }
  return IUCN_META[iucnCode] ?? IUCN_META[0];
}

/**
 * Build a SustainabilityInfo object from a taxon (or null).
 */
export function buildSustainabilityInfo(taxon: INaturalistTaxon | null): Omit<SustainabilityInfo, 'loading' | 'error'> {
  if (!taxon) {
    return {
      taxon: null,
      level: 'unknown',
      score: 0,
      statusLabel: 'Not Evaluated',
      statusColor: '#9CA3AF',
      iucnCode: 'NE',
    };
  }

  const iucnNum = taxon.conservation_status?.iucn;
  const meta = getIUCNMeta(iucnNum);

  return {
    taxon,
    level: meta.level,
    score: meta.score,
    statusLabel: meta.label,
    statusColor: meta.color,
    iucnCode: meta.code,
  };
}

/**
 * Fetch sustainability info for a species name.
 */
export async function fetchSustainabilityInfo(speciesName: string): Promise<SustainabilityInfo> {
  try {
    const taxon = await fetchTaxonByName(speciesName);
    return {
      ...buildSustainabilityInfo(taxon),
      loading: false,
      error: null,
    };
  } catch (err) {
    return {
      taxon: null,
      level: 'unknown',
      score: 0,
      statusLabel: 'Unknown',
      statusColor: '#9CA3AF',
      iucnCode: 'NE',
      loading: false,
      error: err instanceof Error ? err.message : 'Failed to load species data',
    };
  }
}

/**
 * Fetch sustainability info for multiple species and sort from least harmful (lowest score)
 * to most harmful (highest score).
 */
export async function fetchRankedSustainability(
  speciesNames: string[]
): Promise<Array<{ species: string; info: SustainabilityInfo }>> {
  const results = await Promise.all(
    speciesNames.map(async (species) => ({
      species,
      info: await fetchSustainabilityInfo(species),
    }))
  );

  return results.sort((a, b) => {
    // Sort ascending by score (safest first); unknown goes to end
    const aScore = a.info.level === 'unknown' ? 999 : a.info.score;
    const bScore = b.info.level === 'unknown' ? 999 : b.info.score;
    return aScore - bScore;
  });
}
