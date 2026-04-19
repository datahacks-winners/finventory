export interface INaturalistTaxon {
  id: number;
  name: string; // scientific name
  preferred_common_name?: string;
  rank: string;
  wikipedia_url?: string;
  wikipedia_summary?: string;
  default_photo?: {
    medium_url: string;
    attribution: string;
  };
  conservation_status?: {
    status: string; // e.g. "lc", "en", "cr"
    status_name: string; // e.g. "least_concern", "endangered"
    iucn: number; // IUCN numeric code
    source_description?: string;
    url?: string;
  };
  observations_count?: number;
  taxon_photos?: Array<{
    photo: {
      medium_url: string;
      attribution: string;
    };
  }>;
}

export type SustainabilityLevel = 'safe' | 'caution' | 'avoid' | 'unknown';

export interface SustainabilityInfo {
  taxon: INaturalistTaxon | null;
  level: SustainabilityLevel;
  score: number; // lower = more sustainable (0 = best, 8 = worst)
  statusLabel: string;
  statusColor: string;
  iucnCode: string;
  loading: boolean;
  error: string | null;
}

export interface SpeciesRecommendation {
  species: string;
  info: SustainabilityInfo;
  listingCount: number;
}
