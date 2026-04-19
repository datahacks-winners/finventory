import { db } from '../firebase'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

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

const API_URL = import.meta.env.VITE_API_URL || 'https://api-eodwatsp5q-uc.a.run.app'

async function getAuthToken(): Promise<string> {
  const auth = getAuth()
  const user = auth.currentUser
  if (!user) {
    throw new Error('Must be authenticated')
  }
  return user.getIdToken()
}

export async function createOrder(
  listingId: string,
  quantity: number,
  deliveryOption: 'pickup' | 'delivery' = 'pickup',
  deliveryAddress?: { street: string; city: string; state: string; zipCode: string }
): Promise<{ success: boolean; orderId: string; pickupQRCode: string }> {
  const token = await getAuthToken()
  const auth = getAuth()
  const user = auth.currentUser

  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      listingId,
      quantity,
      deliveryOption,
      deliveryAddress,
      buyerId: user?.uid,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to create order')
  }

  return response.json()
}

export async function confirmPickup(
  orderId: string,
  qrCode: string
): Promise<{ success: boolean; alreadyPickedUp: boolean }> {
  const token = await getAuthToken()

  const response = await fetch(`${API_URL}/orders/${orderId}/confirm-pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      qrCode,
      scannerRole: 'buyer',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to confirm pickup')
  }

  return response.json()
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean }> {
  const token = await getAuthToken()

  const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to cancel order')
  }

  return response.json()
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
