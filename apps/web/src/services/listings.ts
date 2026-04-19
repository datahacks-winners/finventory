import { db } from '../firebase'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore'

export interface Listing {
  id: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  quantity: number
  unit: string
  pricePerUnit: number
  freshnessDate: Timestamp
  expiresAt: Timestamp
  location: {
    latitude: number
    longitude: number
    address: string
  }
  deliveryAvailable: boolean
  deliveryFee?: number
  sellerId: string
  sellerName: string
  photos: string[]
  status: 'active' | 'sold' | 'expired'
  rating?: number
  reviewCount?: number
  sushiCertNumber?: string
  sushiCertExpiry?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ListingWithDistance extends Listing {
  distance?: number
}

export interface ListingFilters {
  species: string[]
  grades: string[]
  priceRange: [number, number]
  distance: number
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function subscribeToListings(
  filters: ListingFilters,
  userLocation: { latitude: number; longitude: number } | null,
  callback: (listings: ListingWithDistance[]) => void
): () => void {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  const now = Timestamp.now()

  let q = query(
    collection(db, 'listings'),
    where('status', '==', 'active'),
    where('expiresAt', '>', now),
    orderBy('expiresAt', 'asc'),
    limit(300)
  )

  if (filters.grades.length > 0 && filters.grades.length < 3) {
    q = query(q, where('grade', 'in', filters.grades))
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const listings = snapshot.docs.map((docSnapshot: QueryDocumentSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Listing[]

      let filtered = listings

      if (filters.species.length > 0) {
        filtered = filtered.filter((l) =>
          filters.species.some((s) =>
            l.species.toLowerCase().includes(s.toLowerCase())
          )
        )
      }

      filtered = filtered.filter(
        (l) =>
          l.pricePerUnit >= filters.priceRange[0] &&
          l.pricePerUnit <= filters.priceRange[1]
      )

      let withDistance: ListingWithDistance[] = filtered.map((l) => ({
        ...l,
        distance: userLocation
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              l.location.latitude,
              l.location.longitude
            )
          : undefined,
      }))

      if (userLocation && filters.distance > 0) {
        withDistance = withDistance.filter(
          (l) => l.distance && l.distance <= filters.distance
        )
      }

      // Sort by distance
      withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

      callback(withDistance)
    },
    (error) => {
      console.error('Error fetching listings:', error)
      callback([])
    }
  )

  return unsubscribe
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (!db) {
    throw new Error('Firebase not initialized')
  }
  const docRef = doc(db, 'listings', id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Listing
}
