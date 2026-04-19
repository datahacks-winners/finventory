import { db } from '../firebase'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore'
import { httpsCallable, getFunctions } from 'firebase/functions'

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

const functions = getFunctions()

export async function createOrder(
  listingId: string,
  quantity: number,
  deliveryOption: 'pickup' | 'delivery' = 'pickup',
  deliveryAddress?: { street: string; city: string; state: string; zipCode: string }
): Promise<{ success: boolean; orderId: string; pickupQRCode: string }> {
  const createOrderCallable = httpsCallable(functions, 'createOrder')

  const result = await createOrderCallable({
    listingId,
    quantity,
    deliveryOption,
    deliveryAddress,
  })

  return result.data as { success: boolean; orderId: string; pickupQRCode: string }
}

export async function confirmPickup(
  orderId: string,
  qrCode: string
): Promise<{ success: boolean; alreadyPickedUp: boolean }> {
  const confirmPickupCallable = httpsCallable(functions, 'confirmPickup')

  const result = await confirmPickupCallable({
    orderId,
    qrCode,
    scannerRole: 'buyer',
  })

  return result.data as { success: boolean; alreadyPickedUp: boolean }
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean }> {
  const cancelOrderCallable = httpsCallable(functions, 'cancelOrder')

  const result = await cancelOrderCallable({ orderId })
  return result.data as { success: boolean }
}

export function subscribeToMyOrders(
  userId: string,
  callback: (orders: Order[]) => void
): () => void {
  const q = query(
    collection(db, 'orders'),
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
          const listingDoc = await getDoc(doc(db, 'listings', order.listingId))
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
  const q = query(
    collection(db, 'orders'),
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
          const listingDoc = await getDoc(doc(db, 'listings', order.listingId))
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
