# Finventory Mobile App Guide

**React Native app structure, patterns, and navigation**

---

## Tech Stack

| Category | Library |
|----------|---------|
| Framework | React Native 0.73+ |
| Language | TypeScript |
| Navigation | React Navigation 6 |
| State Management | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Styling | NativeWind (Tailwind) |
| Maps | Mapbox GL |
| Camera | Vision Camera |
| Forms | React Hook Form + Zod |
| Icons | Lucide React Native |

---

## Navigation Structure

```
RootNavigator (Stack)
├── AuthNavigator (Stack)
│   ├── WelcomeScreen
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ForgotPasswordScreen
│
├── MainTabNavigator (Bottom Tabs)
│   ├── BrowseTab (Stack)
│   │   ├── BrowseScreen (Map/List toggle)
│   │   ├── FilterScreen
│   │   └── ListingDetailScreen
│   │
│   ├── OrdersTab (Stack)
│   │   ├── OrdersListScreen
│   │   ├── OrderDetailScreen
│   │   └── QRScannerScreen
│   │
│   ├── StandingOrdersTab (Stack) ← CENTER TAB
│   │   ├── StandingOrdersScreen
│   │   ├── CreateStandingOrderScreen
│   │   └── MatchesScreen
│   │
│   └── ProfileTab (Stack)
│       ├── ProfileScreen
│       ├── EditProfileScreen
│       ├── MyListingsScreen
│       ├── CreateListingScreen (6-step flow)
│       └── SettingsScreen
```

### Tab Configuration

```typescript
// apps/mobile/src/navigation/MainTabNavigator.tsx
const MainTabs = createBottomTabNavigator({
  screens: {
    Browse: BrowseStack,
    Orders: OrdersStack,
    StandingOrders: {
      screen: StandingOrdersStack,
      options: {
        tabBarIcon: ({ color }) => <RefreshCw color={color} />,
        tabBarLabel: 'Auto-Buy'
      }
    },
    Profile: ProfileStack
  }
});
```

---

## Screen Directory

| Screen | Path | Purpose |
|--------|------|---------|
| BrowseScreen | `screens/browse/BrowseScreen.tsx` | Map/list toggle, filter sheet |
| ListingDetailScreen | `screens/listing/ListingDetailScreen.tsx` | Full listing view, order button |
| OrdersListScreen | `screens/orders/OrdersListScreen.tsx` | Buyer/seller order history |
| OrderDetailScreen | `screens/orders/OrderDetailScreen.tsx` | QR code, pickup details |
| QRScannerScreen | `screens/orders/QRScannerScreen.tsx` | Scan for pickup confirmation |
| StandingOrdersScreen | `screens/standing/StandingOrdersScreen.tsx` | List of auto-buy criteria |
| CreateStandingOrderScreen | `screens/standing/CreateStandingOrderScreen.tsx` | Set criteria for auto-matching |
| MatchesScreen | `screens/standing/MatchesScreen.tsx` | View matches, quick-order |
| ProfileScreen | `screens/profile/ProfileScreen.tsx` | User profile, stats |
| MyListingsScreen | `screens/profile/MyListingsScreen.tsx` | Seller's active listings |
| CreateListingScreen | `screens/seller/CreateListingScreen.tsx` | 6-step listing creation |

---

## State Management

### Stores (Zustand)

```typescript
// apps/mobile/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAnonymous: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAnonymous: false,
      setUser: (user) => set({ user, isAnonymous: !user?.email }),
      signOut: async () => {
        await firebaseSignOut();
        set({ user: null, isAnonymous: false });
      }
    }),
    { name: 'auth-storage' }
  )
);
```

### Server State (React Query)

```typescript
// apps/mobile/src/hooks/useListings.ts
import { useQuery } from '@tanstack/react-query';

export function useListings(filters: ListingFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => api.listings.browse(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listings.get(id),
    enabled: !!id
  });
}
```

---

## Key Components

### GradeBadge

```typescript
// apps/mobile/src/components/GradeBadge.tsx
interface GradeBadgeProps {
  grade: 'sushi' | 'a' | 'b';
  size?: 'sm' | 'md' | 'lg';
  showCertIcon?: boolean;
}

const gradeConfig = {
  sushi: { color: 'bg-purple-500', label: 'Sushi Grade' },
  a: { color: 'bg-blue-500', label: 'Grade A' },
  b: { color: 'bg-green-500', label: 'Grade B' }
};
```

### ListingCard

```typescript
// apps/mobile/src/components/ListingCard.tsx
interface ListingCardProps {
  listing: Listing;
  variant?: 'compact' | 'full';
  onPress: (id: string) => void;
  onFavorite?: (id: string) => void;
}

// Compact: Map popup
// Full: List view item
```

### FilterSheet

```typescript
// apps/mobile/src/components/filter/FilterSheet.tsx
interface FilterState {
  grades: Grade[];
  priceRange: [number, number];
  radiusKm: number;
  fishTypes: string[];
}
```

---

## Create Listing Flow (6 Steps)

```
Step 1: Photos
├── Camera/Gallery picker
├── 1-10 photos required
└── Photo preview grid

Step 2: Basic Info
├── Title input
├── Fish type selector
├── Quantity (kg)
└── Price per kg

Step 3: Sushi Certification (conditional)
├── Only shows if grade = "sushi"
├── Upload certificate
├── Catch time/date
└── Temperature log (optional)

Step 4: Freshness
├── Expiry date picker
├── Hours since catch
└── Storage temperature

Step 5: Logistics
├── Pickup location (map pin)
├── Allow delivery toggle
├── Delivery fee (if enabled)
└── Pickup time windows

Step 6: Review
├── Photo gallery preview
├── All details summary
├── Edit buttons per section
└── Submit button
```

---

## Real-Time Features

### Firestore Listeners

```typescript
// apps/mobile/src/hooks/useLiveListings.ts
import { useEffect } from 'react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';

export function useLiveListings(radius: number, center: GeoPoint) {
  useEffect(() => {
    const q = query(
      collection(db, 'listings'),
      where('status', '==', 'active'),
      where('location', '>=', geoHashStart),
      where('location', '<=', geoHashEnd)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Update cache
    });

    return () => unsubscribe();
  }, [radius, center]);
}
```

### Push Notifications (FCM)

```typescript
// apps/mobile/src/services/notifications.ts
export async function setupNotifications() {
  const token = await messaging().getToken();
  await api.users.updateFcmToken(token);

  messaging().onMessage(async remoteMessage => {
    // Foreground notification
    showLocalNotification(remoteMessage);
  });

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    // Background handling
    const { type, data } = remoteMessage.data;
    if (type === 'STANDING_ORDER_MATCH') {
      cacheMatch(data);
    }
  });
}
```

---

## Map Integration (Mapbox)

### BrowseScreen Map

```typescript
// apps/mobile/src/screens/browse/BrowseScreen.tsx
<MapboxGL.MapView
  style={styles.map}
  styleURL={MapboxGL.StyleURL.Street}
  onRegionDidChange={handleRegionChange}
>
  <MapboxGL.Camera
    zoomLevel={12}
    centerCoordinate={[lng, lat]}
  />
  {listings.map(listing => (
    <MapboxGL.PointAnnotation
      key={listing.id}
      id={listing.id}
      coordinate={[listing.location.lng, listing.location.lat]}
      onSelected={() => onListingSelect(listing)}
    >
      <GradePin grade={listing.grade} price={listing.pricePerKg} />
    </MapboxGL.PointAnnotation>
  ))}
</MapboxGL.MapView>
```

### GradePin Component

```typescript
// apps/mobile/src/components/map/GradePin.tsx
const gradeColors = {
  sushi: '#9333ea', // purple-600
  a: '#2563eb',      // blue-600
  b: '#16a34a'       // green-600
};
```

---

## QR Code Flow

### Display (Buyer)

```typescript
// OrderDetailScreen shows QR
<QRCode
  value={order.qrData}
  size={200}
  logo={{ uri: appLogo }}
/>
<Text className="text-2xl font-bold">{order.pickupCode}</Text>
```

### Scan (Seller)

```typescript
// QRScannerScreen
cameraProps={{
  codeScanner: {
    codeTypes: ['qr'],
    onCodeScanned: handleQRScan
  }
}}

async function handleQRScan(codes: Code[]) {
  const qrData = codes[0].value;
  const orderId = parseQRData(qrData);
  await api.orders.confirmPickup(orderId, { pickupCode });
}
```

---

## Camera Integration

### Photo Capture

```typescript
// apps/mobile/src/components/CameraCapture.tsx
import { Camera, useCameraDevice } from 'react-native-vision-camera';

export function CameraCapture({ onCapture }: Props) {
  const device = useCameraDevice('back');
  const { hasPermission } = useCameraPermission();

  const takePhoto = async () => {
    const photo = await camera.current.takePhoto({
      flash: 'auto',
      enableShutterSound: true
    });
    onCapture(photo.path);
  };
}
```

---

## Styling with NativeWind

```typescript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e'
        }
      }
    }
  }
};
```

Usage:

```tsx
<View className="flex-1 bg-white p-4">
  <Text className="text-lg font-bold text-ocean-900">
    Fresh Salmon
  </Text>
  <View className="mt-2 rounded-lg bg-gray-100 p-3">
    <GradeBadge grade="sushi" />
  </View>
</View>
```

---

## Environment Setup

### iOS

```bash
cd apps/mobile/ios
pod install
cd ..
npx react-native run-ios
```

### Android

```bash
cd apps/mobile/android
./gradlew clean
cd ..
npx react-native run-android
```

---

## Debugging

### Reactotron

```typescript
// apps/mobile/src/debugging/reactotron.ts
if (__DEV__) {
  Reactotron
    .configure()
    .useReactNative()
    .connect();
}
```

### Flipper

```bash
# Install Flipper desktop app
# Plugins enabled:
# - Network (API calls)
# - React DevTools
# - Redux Debugger (for Zustand)
```
