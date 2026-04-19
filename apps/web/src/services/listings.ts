     1|import { db } from '../firebase'
     2|import {
     3|  collection,
     4|  query,
     5|  where,
     6|  orderBy,
     7|  limit,
     8|  onSnapshot,
     9|  doc,
    10|  getDoc,
    11|  Timestamp,
    12|  QueryDocumentSnapshot,
    13|} from 'firebase/firestore'
    14|
    15|export interface Listing {
    16|  id: string
    17|  species: string
    18|  grade: 'sushi' | 'A' | 'B'
    19|  quantity: number
    20|  unit: string
    21|  pricePerUnit: number
    22|  freshnessDate: Timestamp
    23|  expiresAt: Timestamp
    24|  location: {
    25|    latitude: number
    26|    longitude: number
    27|    address: string
    28|  }
    29|  deliveryAvailable: boolean
    30|  deliveryFee?: number
    31|  sellerId: string
    32|  sellerName: string
    33|  photos: string[]
    34|  status: 'active' | 'sold' | 'expired'
    35|  sushiCertNumber?: string
    36|  sushiCertExpiry?: Timestamp
    37|  createdAt: Timestamp
    38|  updatedAt: Timestamp
    39|}
    40|
    41|export interface ListingWithDistance extends Listing {
    42|  distance?: number
    43|}
    44|
    45|export interface ListingFilters {
    46|  species: string[]
    47|  grades: string[]
    48|  priceRange: [number, number]
    49|  distance: number
    50|}
    51|
    52|function calculateDistance(
    53|  lat1: number,
    54|  lon1: number,
    55|  lat2: number,
    56|  lon2: number
    57|): number {
    58|  const R = 3959
    59|  const dLat = ((lat2 - lat1) * Math.PI) / 180
    60|  const dLon = ((lon2 - lon1) * Math.PI) / 180
    61|  const a =
    62|    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    63|    Math.cos((lat1 * Math.PI) / 180) *
    64|      Math.cos((lat2 * Math.PI) / 180) *
    65|      Math.sin(dLon / 2) *
    66|      Math.sin(dLon / 2)
    67|  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    68|  return R * c
    69|}
    70|
    71|export function subscribeToListings(
    72|  filters: ListingFilters,
    73|  userLocation: { latitude: number; longitude: number } | null,
    74|  callback: (listings: ListingWithDistance[]) => void
    75|): () => void {
    76|  if (!db) {
    77|    throw new Error('Firebase not initialized')
    78|  }
    79|
    80|  const now = Timestamp.now()
    81|
    82|  let q = query(
    83|    collection(db, 'listings'),
    84|    where('status', '==', 'active'),
    85|    where('expiresAt', '>', now),
    86|    orderBy('expiresAt', 'asc'),
    87|    limit(300)
    88|  )
    89|
    90|  if (filters.grades.length > 0 && filters.grades.length < 3) {
    91|    q = query(q, where('grade', 'in', filters.grades))
    92|  }
    93|
    94|  const unsubscribe = onSnapshot(
    95|    q,
    96|    (snapshot) => {
    97|      const listings = snapshot.docs.map((docSnapshot: QueryDocumentSnapshot) => ({
    98|        id: docSnapshot.id,
    99|        ...docSnapshot.data(),
   100|      })) as Listing[]
   101|
   102|      let filtered = listings
   103|
   104|      if (filters.species.length > 0) {
   105|        filtered = filtered.filter((l) =>
   106|          filters.species.some((s) =>
   107|            l.species.toLowerCase().includes(s.toLowerCase())
   108|          )
   109|        )
   110|      }
   111|
   112|      filtered = filtered.filter(
   113|        (l) =>
   114|          l.pricePerUnit >= filters.priceRange[0] &&
   115|          l.pricePerUnit <= filters.priceRange[1]
   116|      )
   117|
   118|      let withDistance: ListingWithDistance[] = filtered.map((l) => ({
   119|        ...l,
   120|        distance: userLocation
   121|          ? calculateDistance(
   122|              userLocation.latitude,
   123|              userLocation.longitude,
   124|              l.location.latitude,
   125|              l.location.longitude
   126|            )
   127|          : undefined,
   128|      }))
   129|
   130|      if (userLocation && filters.distance > 0) {
   131|        withDistance = withDistance.filter(
   132|          (l) => l.distance && l.distance <= filters.distance
   133|        )
   134|      }
   135|
   136|      // Sort by distance
   137|      withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
   138|
   139|      callback(withDistance)
   140|    },
   141|    (error) => {
   142|      console.error('Error fetching listings:', error)
   143|      callback([])
   144|    }
   145|  )
   146|
   147|  return unsubscribe
   148|}
   149|
   150|export async function fetchListingById(id: string): Promise<Listing | null> {
   151|  if (!db) {
   152|    throw new Error('Firebase not initialized')
   153|  }
   154|  const docRef = doc(db, 'listings', id)
   155|  const docSnap = await getDoc(docRef)
   156|  if (!docSnap.exists()) return null
   157|  return { id: docSnap.id, ...docSnap.data() } as Listing
   158|}
   159|