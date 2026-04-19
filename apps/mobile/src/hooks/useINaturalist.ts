import { useState, useEffect, useRef } from 'react';
import { SustainabilityInfo, SpeciesRecommendation } from '../types/inaturalist';
import {
  fetchSustainabilityInfo,
  fetchRankedSustainability,
} from '../services/inaturalist';
import { ListingWithDistance } from '../types/listing';

/**
 * Hook to fetch iNaturalist sustainability info for a single species.
 */
export function useSpeciesInfo(speciesName: string | undefined): SustainabilityInfo {
  const [state, setState] = useState<SustainabilityInfo>({
    taxon: null,
    level: 'unknown',
    score: 0,
    statusLabel: 'Loading...',
    statusColor: '#9CA3AF',
    iucnCode: 'NE',
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!speciesName) return;

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetchSustainabilityInfo(speciesName).then((info) => {
      if (!cancelled) setState(info);
    });

    return () => { cancelled = true; };
  }, [speciesName]);

  return state;
}

/**
 * Hook that derives unique species from listings, fetches their sustainability
 * info from iNaturalist, and returns them sorted from least to most harmful.
 */
export function useSustainabilityRecommendations(
  listings: ListingWithDistance[]
): { recommendations: SpeciesRecommendation[]; loading: boolean } {
  const [recommendations, setRecommendations] = useState<SpeciesRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const prevSpeciesKey = useRef<string>('');

  useEffect(() => {
    const speciesCounts: Record<string, number> = {};
    for (const l of listings) {
      const s = l.species.toLowerCase().trim();
      speciesCounts[s] = (speciesCounts[s] ?? 0) + 1;
    }

    const uniqueSpecies = Object.keys(speciesCounts);
    const speciesKey = [...uniqueSpecies].sort().join(',');

    if (speciesKey === prevSpeciesKey.current || uniqueSpecies.length === 0) return;
    prevSpeciesKey.current = speciesKey;

    let cancelled = false;
    setLoading(true);

    fetchRankedSustainability(uniqueSpecies).then((ranked) => {
      if (cancelled) return;
      setRecommendations(
        ranked.map(({ species, info }) => ({
          species,
          info,
          listingCount: speciesCounts[species] ?? 0,
        }))
      );
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [listings]);

  return { recommendations, loading };
}
