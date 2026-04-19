import { db } from '../firebase'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, Timestamp, getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { httpsCallable, getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getApp } from 'firebase/app'

export interface Order {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  quantity: number
  totalPrice: number
  status: 'pending' | 'picked_up' | 'cancelled'
  pickupQRCode: string
  deliveryOption: 'pickup' | 'delivery'
  deliveryAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  createdAt: Timestamp
  pickedUpAt?: Timestamp
  listing?: {
    species: string
    grade: string
    photos: string[]
    location: { address: string }
  }
}

// Get Firebase Functions instance
function getFunctionsInstance() {
  const app = getApp()
  const functions = getFunctions(app)
  
  // Use emulator in development if configured
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    connectFunctionsEmulator(functions, 'localhost', 5001)
  }
  
  return functions
}

export async function createOrder(
  listingId: string,
  quantity: number,
  deliveryOption: 'pickup' | 'delivery' = 'pickup',
  deliveryAddress?: { street: string; city: string; state: string; zipCode: string }
): Promise<{ success: boolean; orderId: string; pickupQRCode: string }> {
  const auth = getAuth()
  const user = auth.currentUser
  
  if (!user) {
    throw new Error('Must be authenticated')
  }

  const functions = getFunctionsInstance()
  const createOrderCallable = httpsCallable(functions, 'createOrder')
  
  const result = await createOrderCallable({
    listingId,
    quantity,
    deliveryOption,
    deliveryAddress,
    buyerId: user.uid,
  })
  
  return result.data as { success: boolean; orderId: string; pickupQRCode: string }
}

export async function confirmPickup(
  orderId: string,
  qrCode: string
): Promise<{ success: boolean; alreadyPickedUp: boolean }> {
  const functions = getFunctionsInstance()
  const confirmPickupCallable = httpsCallable(functions, 'confirmPickup')
  
  const result = await confirmPickupCallable({
    orderId,
    qrCode,
    scannerRole: 'buyer',
  })
  
  return result.data as { success: boolean; alreadyPickedUp: boolean }
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean }> {
  const functions = getFunctionsInstance()
  const cancelOrderCallable = httpsCallable(functions, 'cancelOrder')
  
  const result = await cancelOrderCallable({ orderId })
  
  return result.data as { success: boolean }
}

export function subscribeToMyOrders(
  userId: string,
  callback: (orders: Order[]) => void
): () => void {
  if (!db) {
    throw new Error('Firebase not initialized')
  }
  const firestore = db
  const q = query(
    collection(firestore, 'orders'),
    where('buyerId', '==', userId),
    orderBy('createdAt', 'desc')
  )

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[]

      const ordersWithListings = await Promise.all(
        orders.map(async (order) => {
          const listingDoc = await getDoc(doc(firestore, 'listings', order.listingId))
          if (listingDoc.exists()) {
            const listingData = listingDoc.data()
            order.listing = {
              species: listingData.species,
              grade: listingData.grade,
              photos: listingData.photos || [],
              location: listingData.location,
            }
          }
          return order
        })
      )

      callback(ordersWithListings)
    },
    (error) => {
      console.error('Error fetching orders:', error)
      callback([])
    }
  )

  return unsubscribe
}

export function subscribeToSellerOrders(
  sellerId: string,
  callback: (orders: Order[]) => void
): () => void {
  if (!db) {
    throw new Error('Firebase not initialized')
  }
  const firestore = db
  const q = query(
    collection(firestore, 'orders'),
    where('sellerId', '==', sellerId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[]

      const ordersWithListings = await Promise.all(
        orders.map(async (order) => {
          const listingDoc = await getDoc(doc(firestore, 'listings', order.listingId))
          if (listingDoc.exists()) {
            const listingData = listingDoc.data()
            order.listing = {
              species: listingData.species,
              grade: listingData.grade,
              photos: listingData.photos || [],
              location: listingData.location,
            }
          }
          return order
        })
      )

      callback(ordersWithListings)
    },
    (error) => {
      console.error('Error fetching seller orders:', error)
      callback([])
    }
  )

  return unsubscribe
}
