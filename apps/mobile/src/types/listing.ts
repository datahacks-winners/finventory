import { Timestamp } from '@react-native-firebase/firestore';

export type Grade = 'sushi' | 'A' | 'B';
export type Unit = 'lb' | 'kg' | 'each';

export interface Listing {
  id: string;
  sellerId: string;
  species: string;
  grade: Grade;
  sushiCertNumber?: string;
  sushiCertExpiry?: Timestamp;
  quantity: number;
  unit: Unit;
  pricePerUnit: number;
  location: {
    latitude: number;
    longitude: number;
    geohash: string;
  };
  photos: string[];
  freshnessDate: Timestamp;
  deliveryAvailable: boolean;
  status: 'active' | 'pending_pickup' | 'sold' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface ListingWithDistance extends Listing {
  distance: number; // in miles
  sellerRating?: number;
  liveQuantity?: number; // from Realtime DB
}

export interface ListingFilters {
  species: string[]; // empty = all species
  grades: Grade[]; // empty = all grades
  distance: number; // max distance in miles, 0 = no limit
  priceRange: [number, number]; // [min, max] price per unit
}

export interface BrowseState {
  viewMode: 'grid' | 'map';
  filters: ListingFilters;
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;
}
