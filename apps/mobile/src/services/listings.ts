import firestore from '@react-native-firebase/firestore';
import realtime from '@react-native-firebase/database';
import { Listing, ListingFilters, ListingWithDistance } from '../types/listing';

/**
 * Calculate distance between two points in miles using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Fetch listings from Firestore with real-time updates
 */
export function subscribeToListings(
  filters: ListingFilters,
  userLocation: { latitude: number; longitude: number } | null,
  callback: (listings: ListingWithDistance[]) => void
): () => void {
  let query = firestore()
    .collection('listings')
    .where('status', '==', 'active')
    .where('expiresAt', '>', firestore.FieldValue.serverTimestamp())
    .orderBy('expiresAt', 'asc')
    .limit(100);

  // Apply grade filter if specified
  if (filters.grades.length > 0 && filters.grades.length < 3) {
    query = query.where('grade', 'in', filters.grades);
  }

  const unsubscribe = query.onSnapshot(
    (snapshot) => {
      const listings: Listing[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Listing[];

      // Apply client-side filters
      const filtered = applyClientFilters(listings, filters, userLocation);
      callback(filtered);
    },
    (error) => {
      console.error('Error fetching listings:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Apply client-side filters (species, distance, price)
 */
function applyClientFilters(
  listings: Listing[],
  filters: ListingFilters,
  userLocation: { latitude: number; longitude: number } | null
): ListingWithDistance[] {
  return listings
    .filter((listing) => {
      // Species filter
      if (filters.species.length > 0 && !filters.species.includes(listing.species)) {
        return false;
      }

      // Price filter
      if (
        listing.pricePerUnit < filters.priceRange[0] ||
        listing.pricePerUnit > filters.priceRange[1]
      ) {
        return false;
      }

      // Distance filter
      if (userLocation && filters.distance > 0) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          listing.location.latitude,
          listing.location.longitude
        );
        if (distance > filters.distance) {
          return false;
        }
      }

      return true;
    })
    .map((listing) => ({
      ...listing,
      distance: userLocation
        ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            listing.location.latitude,
            listing.location.longitude
          )
        : 0,
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Subscribe to live inventory updates from Realtime Database
 */
export function subscribeToLiveInventory(
  callback: (inventory: Record<string, number>) => void
): () => void {
  const ref = realtime().ref('live_inventory');

  const listener = ref.on('value', (snapshot) => {
    const data = snapshot.val();
    callback(data || {});
  });

  return () => ref.off('value', listener);
}
