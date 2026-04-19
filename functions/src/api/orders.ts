import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { notifyNewOrder, notifyOrderStatusUpdate } from '../utils/notifications.js'

export interface CreateOrderRequest {
  listingId: string
  buyerId: string
  quantity: number
  deliveryOption: 'pickup' | 'delivery'
  deliveryAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
  }
}

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
  createdAt: admin.firestore.Timestamp
  pickedUpAt?: admin.firestore.Timestamp
}

/**
 * Create a new order
 */
export const createOrder = onCall(
  async (request) => {
    const data = request.data as CreateOrderRequest

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid

    // Verify buyer ID
    if (data.buyerId !== userId) {
      throw new HttpsError('permission-denied', 'Cannot order for another user')
    }

    // Get listing
    const listingRef = db.collection('listings').doc(data.listingId)
    const listingDoc = await listingRef.get()

    if (!listingDoc.exists) {
      throw new HttpsError('not-found', 'Listing not found')
    }

    const listing = listingDoc.data()!

    // Check if listing is active
    if (listing.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Listing is not available')
    }

    // Check if listing has expired
    const now = admin.firestore.Timestamp.now()
    if (listing.expiresAt < now) {
      throw new HttpsError('failed-precondition', 'Listing has expired')
    }

    // Check if buyer is the seller
    if (listing.sellerId === userId) {
      throw new HttpsError('failed-precondition', 'Cannot buy your own listing')
    }

    // Validate quantity
    if (data.quantity <= 0) {
      throw new HttpsError('invalid-argument', 'Quantity must be positive')
    }

    if (data.quantity > listing.quantity) {
      throw new HttpsError('failed-precondition', 'Not enough quantity available')
    }

    // Validate delivery option
    if (data.deliveryOption === 'delivery' && !listing.deliveryAvailable) {
      throw new HttpsError('failed-precondition', 'Delivery not available for this listing')
    }

    if (data.deliveryOption === 'delivery' && !data.deliveryAddress) {
      throw new HttpsError('invalid-argument', 'Delivery address required')
    }

    // Generate unique QR code
    const pickupQRCode = `${data.listingId}-${userId}-${Date.now()}`

    try {
      // Calculate total price
      const totalPrice = data.quantity * listing.pricePerUnit

      // Create order
      const orderRef = await db.collection('orders').add({
        listingId: data.listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
        quantity: data.quantity,
        totalPrice,
        status: 'pending',
        pickupQRCode,
        deliveryOption: data.deliveryOption,
        deliveryAddress: data.deliveryAddress || null,
        createdAt: now
      })

      // Update listing quantity and status
      const newQuantity = listing.quantity - data.quantity
      const updates: admin.firestore.UpdateData<Record<string, unknown>> = {
        quantity: newQuantity
      }

      if (newQuantity === 0) {
        updates.status = 'sold'
      }

      await listingRef.update(updates)

      // Notify seller
      await notifyNewOrder(
        listing.sellerId,
        orderRef.id,
        `${listing.species} (${listing.grade} grade)`
      )

      return {
        success: true,
        orderId: orderRef.id,
        pickupQRCode
      }
    } catch (error) {
      console.error('Error creating order:', error)
      throw new HttpsError('internal', 'Failed to create order')
    }
  }
)

/**
 * Confirm order pickup (QR code scan)
 */
export const confirmPickup = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const data = request.data as { orderId: string; qrCode: string; scannerRole: 'buyer' | 'seller' }
    const { orderId, qrCode } = data

    // Get order
    const orderRef = db.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      throw new HttpsError('not-found', 'Order not found')
    }

    const order = orderDoc.data()!

    // Verify QR code
    if (order.pickupQRCode !== qrCode) {
      throw new HttpsError('permission-denied', 'Invalid QR code')
    }

    // Verify user is either buyer or seller
    const userId = request.auth.uid
    const isBuyer = userId === order.buyerId
    const isSeller = userId === order.sellerId

    if (!isBuyer && !isSeller) {
      throw new HttpsError('permission-denied', 'Not your order')
    }

    // Check if order is already picked up
    if (order.status === 'picked_up') {
      return {
        success: true,
        alreadyPickedUp: true
      }
    }

    // Check if order is cancelled
    if (order.status === 'cancelled') {
      throw new HttpsError('failed-precondition', 'Order is cancelled')
    }

    try {
      // Update order status
      await orderRef.update({
        status: 'picked_up',
        pickedUpAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Notify buyer
      await notifyOrderStatusUpdate(order.buyerId, orderId, 'picked_up')

      return {
        success: true,
        alreadyPickedUp: false
      }
    } catch (error) {
      console.error('Error confirming pickup:', error)
      throw new HttpsError('internal', 'Failed to confirm pickup')
    }
  }
)

/**
 * Cancel an order
 */
export const cancelOrder = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const data = request.data as { orderId: string }
    const { orderId } = data
    const userId = request.auth.uid

    // Get order
    const orderRef = db.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      throw new HttpsError('not-found', 'Order not found')
    }

    const order = orderDoc.data()!

    // Only buyer can cancel
    if (order.buyerId !== userId) {
      throw new HttpsError('permission-denied', 'Only buyer can cancel')
    }

    // Can only cancel pending orders
    if (order.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Cannot cancel completed order')
    }

    try {
      // Cancel order
      await orderRef.update({
        status: 'cancelled'
      })

      // Restore listing quantity
      const listingRef = db.collection('listings').doc(order.listingId)
      const listingDoc = await listingRef.get()

      if (listingDoc.exists) {
        await listingRef.update({
          quantity: admin.firestore.FieldValue.increment(order.quantity),
          status: 'active'
        })
      }

      return { success: true }
    } catch (error) {
      console.error('Error cancelling order:', error)
      throw new HttpsError('internal', 'Failed to cancel order')
    }
  }
)
