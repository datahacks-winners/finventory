# Browse Listings Screen Design

**Project:** Fish Rescue App (finventory)
**Date:** 2026-04-18
**Status:** Approved
**Author:** Claude Code + Justin

---

## Overview

The Browse Listings screen is the primary discovery interface for buyers. It displays nearby seafood listings in a visual card grid with filtering, map view toggle, and real-time inventory updates.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browse Listings Screen                    │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  Filter Sheet   │  │     Listing Card Grid            │  │
│  │  - Species      │  │  ┌─────┐ ┌─────┐ ┌─────┐         │  │
│  │  - Grade        │  │  │card1│ │card2│ │card3│ ...     │  │
│  │  - Distance     │  │  └─────┘ └─────┘ └─────┘         │  │
│  │  - Price Range  │  │  ┌─────┐ ┌─────┐ ┌─────┐         │  │
│  │  (Slide up)     │  │  │card4│ │card5│ │card6│ ...     │  │
│  └─────────────────┘  │  └─────┘ └─────┘ └─────┘         │  │
│                       └─────────────────────────────────┘  │
│                                                               │
│  Toggle: [Grid View] [Map View]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI Framework | React Native |
| Navigation | Expo Router (file-based) |
| State Management | Zustand |
| Data Fetching | React Query (Firebase adapter) |
| Maps | Mapbox GL (@rnmapbox/maps) |
| Real-time | Firestore onSnapshot + Realtime DB |
| Location | Expo Location |
| Image Loading | Expo Image |

---

## Components

### 1. BrowseScreen (Main Container)

**File:** `apps/mobile/src/screens/BrowseScreen.tsx`

**Responsibilities:**
- Manage filter state
- Handle view toggle (grid/map)
- Coordinate data fetching
- Handle pull-to-refresh
- Show loading/error states

**State:**
```typescript
interface BrowseState {
  viewMode: 'grid' | 'map'
  filters: {
    species: string[]      // multi-select
    grades: string[]       // ['sushi', 'A', 'B']
    distance: number       // miles
    priceRange: [number, number]  // min, max
  }
  userLocation: {
    latitude: number
    longitude: number
  } | null
}
```

---

### 2. ListingCard Component

**File:** `apps/mobile/src/components/ListingCard.tsx`

**Visual Layout:**
```
┌─────────────────────────────────┐
│  [Photo]         [Grade Badge]  │
│                                  │
│  King Salmon        $12/lb       │
│  ⭐ 4.8  •  2.3 mi away         │
│  Caught: Today                   │
│  15 lbs remaining  🚗 Delivery   │
│                             [♡]  │
└─────────────────────────────────┘
```

**Props:**
```typescript
interface ListingCardProps {
  listing: {
    id: string
    species: string
    grade: 'sushi' | 'A' | 'B'
    photos: string[]
    pricePerUnit: number
    unit: 'lb' | 'kg'
    quantity: number
    freshnessDate: FirebaseFirestore.Timestamp
    location: { latitude: number; longitude: number }
    deliveryAvailable: boolean
    sellerId: string
  }
  distance: number  // calculated from user location
  sellerRating?: number
  onPress: () => void
  onFavoritePress: () => void
  isFavorite: boolean
}
```

**Features:**
- Hero image (first photo) with expo-image (cached)
- Grade badge (color-coded: sushi=blue, A=green, B=yellow)
- Favorite button (requires auth, shows auth modal if anonymous)
- Skeleton loading state
- Live quantity (updates via Realtime DB)

---

### 3. FilterSheet Component

**File:** `apps/mobile/src/components/FilterSheet.tsx`

**UI:** Bottom sheet (react-native-reanimated)

**Filters:**
- **Species:** Multi-select chip list
  ```
  [Salmon] [Tuna] [Cod] [Halibut] [Shrimp] ...
  ```
- **Grade:** Toggle chips
  ```
  [Sushi] [A] [B]
  ```
- **Distance:** Slider (1-50 miles)
  ```
  ◄─────●─────▶  25 mi
```
- **Price Range:** Dual-thumb slider
  ```
  ◄●───────●▶ $5 - $30/lb
```

**Props:**
```typescript
interface FilterSheetProps {
  visible: boolean
  filters: BrowseState['filters']
  onFiltersChange: (filters: BrowseState['filters']) => void
  onApply: () => void
  onReset: () => void
  onClose: () => void
}
```

---

### 4. ListingMap Component

**File:** `apps/mobile/src/components/ListingMap.tsx`

**Features:**
- Mapbox GL map centered on user location
- Listing pins with color-coded grades
- Pin tap → card preview bottom sheet
- Clustering for dense areas

**Props:**
```typescript
interface ListingMapProps {
  listings: ListingCardProps['listing'][]
  userLocation: { latitude: number; longitude: number }
  onListingPress: (listing: ListingCardProps['listing']) => void
}
```

---

### 5. BrowseStore (Zustand)

**File:** `apps/mobile/src/stores/browseStore.ts`

```typescript
interface BrowseStore {
  // State
  filters: BrowseState['filters']
  viewMode: 'grid' | 'map'
  userLocation: BrowseState['userLocation']

  // Actions
  setFilters: (filters: Partial<BrowseState['filters']>) => void
  resetFilters: () => void
  setViewMode: (mode: 'grid' | 'map') => void
  setUserLocation: (location: { latitude: number; longitude: number }) => void
}
```

---

## Data Flow

### 1. Location Discovery

```typescript
// On mount, get user location
import * as Location from 'expo-location'

const getLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return null

  const location = await Location.getCurrentPositionAsync({})
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  }
}
```

### 2. Firestore Query with Filters

```typescript
// Build query based on active filters
const buildListingsQuery = (filters: BrowseState['filters']) => {
  let query = firestore()
    .collection('listings')
    .where('status', '==', 'active')
    .where('expiresAt', '>', firestore.FieldValue.serverTimestamp())

  // Apply filters
  if (filters.grades.length > 0) {
    query = query.where('grade', 'in', filters.grades)
  }

  if (filters.species.length > 0) {
    // Species filter handled client-side (no 'in' for arrays)
  }

  // Distance filter via geohash (geoIndex collection)
  // Price range handled client-side

  return query
}
```

### 3. Real-time Updates

```typescript
// Firestore onSnapshot for listings
const unsubscribe = buildListingsQuery(filters)
  .onSnapshot(snapshot => {
    const listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    // Apply client-side filters
    const filtered = applyClientFilters(listings, filters)
    setListings(filtered)
  })

// Realtime DB for live inventory count
const listingsRef = realtime().ref('live_inventory')
listingsRef.on('value', snapshot => {
  const inventory = snapshot.val()
  // Update card quantities in real-time
})
```

### 4. React Query Integration

```typescript
// Custom hook for listings
const useListings = (filters: BrowseState['filters']) => {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => fetchListings(filters),
    staleTime: 30_000,  // 30 seconds
    refetchInterval: 60_000  // 1 minute fallback
  })
}
```

---

## Screen States

### 1. Initial Loading
```typescript
// Show skeleton cards
<ListingCardSkeleton />
<ListingCardSkeleton />
<ListingCardSkeleton />
```

### 2. Empty State (No results)
```
┌─────────────────────────────────┐
│                                 │
│      🐟 No listings found       │
│                                 │
│    Try adjusting your filters   │
│    or expanding your distance   │
│                                 │
│    [Reset Filters]              │
└─────────────────────────────────┘
```

### 3. Error State
```
┌─────────────────────────────────┐
│         ⚠️  Something           │
│            went wrong           │
│                                 │
│    [Retry]  [Report Issue]      │
└─────────────────────────────────┘
```

### 4. Location Permission Denied
```
┌─────────────────────────────────┐
│     📍 Enable Location          │
│                                 │
│  Location access helps show     │
│  listings near you.             │
│                                 │
│     [Enable Location]           │
│     [Browse Without Location]   │
└─────────────────────────────────┘
```

---

## Navigation Flow

```
BrowseScreen
    │
    ├─► Tap ListingCard ──► ListingDetailScreen
    │
    ├─► Tap Favorite (anonymous) ──► AuthModal
    │
    └─► Tap Map Pin ──► ListingDetailScreen
```

---

## Performance Optimizations

1. **Pagination:** Load 20 listings initially, infinite scroll
2. **Image Caching:** expo-image with disk caching
3. **Query Debouncing:** Debounce filter changes (300ms)
4. **Clustering:** Map clustering for 50+ listings in view
5. **Lazy Loading:** Map view only loads when toggled

---

## File Structure

```
apps/mobile/src/
├── screens/
│   └── BrowseScreen.tsx
├── components/
│   ├── ListingCard.tsx
│   ├── ListingMap.tsx
│   ├── FilterSheet.tsx
│   └── ListingCardSkeleton.tsx
├── stores/
│   └── browseStore.ts
├── hooks/
│   ├── useListings.ts
│   └── useUserLocation.ts
├── services/
│   └── listings.ts
└── types/
    └── listing.ts
```

---

## Scope

**In scope (this implementation):**
- Grid view with listing cards
- Bottom sheet filters (species, grade, distance, price)
- Map view toggle with Mapbox GL
- Real-time inventory updates
- User location detection
- Pull-to-refresh
- Loading/error/empty states
- Favorite functionality (auth-gated)

**Out of scope (future work):**
- ListingDetailScreen (separate feature)
- Advanced map features (heatmap, shapes)
- Saved search alerts
- Search by species name

---

## Dependencies to Install

```bash
cd apps/mobile
npm install zustand @tanstack/react-query
npm install @rnmapbox/maps rnmapbox-gl-style-spec
npm install @react-native-async-storage/async-storage
npm install react-native-reanimated
npm install expo-location
```

---

## Notes

- Grade badges are static quality levels (per spec: no auto-downgrade)
- Unit display is flexible: "lb", "kg", or "each" depending on listing
- Distance calculated client-side using Haversine formula
- Mapbox access token required (add to .env)
- Firestore indexes needed for composite queries
