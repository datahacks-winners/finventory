import { useEffect, useState, useCallback } from 'react';
import { useBrowseStore } from '../stores/browseStore';
import { subscribeToListings, subscribeToLiveInventory } from '../services/listings';
import { ListingWithDistance } from '../types/listing';

export function useListings() {
  const { filters, userLocation } = useBrowseStore();
  const [listings, setListings] = useState<ListingWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToListings(
      filters,
      userLocation,
      (updatedListings) => {
        setListings(updatedListings);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters, userLocation]);

  // Subscribe to live inventory updates
  useEffect(() => {
    const unsubscribe = subscribeToLiveInventory((inventory) => {
      setListings((prev) =>
        prev.map((listing) => ({
          ...listing,
          liveQuantity: inventory[listing.id] ?? listing.quantity,
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    // The onSnapshot will automatically refetch
  }, []);

  return { listings, loading, error, refetch };
}
