import { User } from '@react-native-firebase/auth';

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  phone?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  providers: string[];
  isAnonymous: boolean;
  sellerProfile?: SellerProfile;
  buyerProfile?: BuyerProfile;
  paymentMethods?: PaymentMethod[];
  notificationPreferences: NotificationPreferences;
}

export interface SellerProfile {
  businessName: string;
  description: string;
  certifications: Certification[];
  location: {
    latitude: number;
    longitude: number;
  };
  rating: number;
}

export interface Certification {
  type: string;
  number: string;
  expiryDate: FirebaseFirestore.Timestamp;
  verified: boolean;
}

export interface BuyerProfile {
  deliveryAddresses: DeliveryAddress[];
}

export interface DeliveryAddress {
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  stripePaymentMethodId: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface NotificationPreferences {
  orders: boolean;
  messages: boolean;
  standingOrderMatches: boolean;
  promotions: boolean;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAnonymous: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  linkAnonymousAccount: (provider: string) => Promise<void>;
}

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
