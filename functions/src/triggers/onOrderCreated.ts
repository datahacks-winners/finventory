import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { rtdb } from '../config.js'

/**
 * Triggered when a new order is created
 * - Updates real-time inventory count
 */
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, _context) => {
    const order = snap.data()!

    // Get listing to update inventory
    const listingDoc = await admin.firestore().collection('listings').doc(order.listingId).get()

    if (!listingDoc.exists) {
      console.log(`Listing ${order.listingId} not found`)
      return
    }

    const listing = listingDoc.data()!

    // Update real-time inventory
    await rtdb.ref(`live_inventory/${order.listingId}`).update({
      count: listing.quantity,
      status: listing.status,
      lastUpdated: admin.database.ServerValue.TIMESTAMP
    })

    console.log(`Updated inventory for listing ${order.listingId}`)
  })
