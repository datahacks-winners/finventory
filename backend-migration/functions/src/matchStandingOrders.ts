import { pubsub } from '@google-cloud/functions-framework'
import { db, config } from './config.js'
import { distanceInMiles } from '../../shared/utils/geohash.js'

// Types
export interface StandingOrder {
  id: string
  buyerId: string
  species: string[]
  minGrade: 'sushi' | 'A' | 'B'
  maxPricePerUnit?: number
  maxDistance: number
  location: {
    latitude: number
    longitude: number
  }
  isActive: boolean
  lastMatchedAt?: Date
}

export interface Listing {
  id: string
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  status: 'active' | 'pending_pickup' | 'sold' | 'expired'
  expiresAt: Date
}

/**
 * Cloud Function 2nd Gen: Match standing orders with new listings
 * Trigger: Pub/Sub (scheduled via Cloud Scheduler)
 * Schedule: Every 5 minutes
 */
export async function matchStandingOrders(
  event: pubsub.Message,
  context: pubsub.Context
): Promise<void> {
  try {
    const now = new Date()

    console.log('[matchStandingOrders] Starting execution at:', now.toISOString())

    // Get all active listings
    const listingsSnapshot = await db
      .collection(config.collections.listings)
      .where('status', '==', 'active')
      .where('expiresAt', '>', now)
      .get()

    if (listingsSnapshot.empty) {
      console.log('[matchStandingOrders] No active listings found')
      return
    }

    console.log(`[matchStandingOrders] Found ${listingsSnapshot.size} active listings`)

    // Get all active standing orders
    const standingOrdersSnapshot = await db
      .collection(config.collections.standingOrders)
      .where('isActive', '==', true)
      .get()

    if (standingOrdersSnapshot.empty) {
      console.log('[matchStandingOrders] No active standing orders found')
      return
    }

    console.log(`[matchStandingOrders] Found ${standingOrdersSnapshot.size} active standing orders`)

    let matchCount = 0
    const notificationPromises: Promise<void>[] = []

    // Check each listing against each standing order
    for (const listingDoc of listingsSnapshot.docs) {
      const listing = {
        id: listingDoc.id,
        ...listingDoc.data()
      } as Listing

      for (const soDoc of standingOrdersSnapshot.docs) {
        const order = {
          id: soDoc.id,
          ...soDoc.data()
        } as StandingOrder

        // Skip if recently matched (within last hour)
        if (order.lastMatchedAt) {
          const lastMatched = new Date(order.lastMatchedAt)
          const hoursSinceMatch = (now.getTime() - lastMatched.getTime()) / (1000 * 60 * 60)
          if (hoursSinceMatch < 1) {
            continue
          }
        }

        // Check for match
        const isMatch = checkMatch(listing, order)

        if (isMatch) {
          console.log(
            `[matchStandingOrders] Match found: Listing ${listing.id} -> Order ${order.id}`
          )

          // Queue notification (will be sent to Pub/Sub)
          notificationPromises.push(
            sendMatchNotification(order.buyerId, listing.id, listing.species, listing.grade)
          )

          // Update last matched timestamp
          await soDoc.ref.update({
            lastMatchedAt: now
          })

          matchCount++
        }
      }
    }

    // Send all notifications
    await Promise.all(notificationPromises)

    console.log(`[matchStandingOrders] Completed: ${matchCount} matches found`)
  } catch (error) {
    console.error('[matchStandingOrders] Error:', error)
    throw error
  }
}

/**
 * Check if a listing matches a standing order criteria
 */
function checkMatch(listing: Listing, order: StandingOrder): boolean {
  // Check species match
  const speciesMatch = order.species.includes('*') || order.species.includes(listing.species)
  if (!speciesMatch) {
    return false
  }

  // Check grade match
  const gradeOrder: Record<string, number> = { sushi: 3, A: 2, B: 1 }
  if (gradeOrder[order.minGrade] > gradeOrder[listing.grade]) {
    return false
  }

  // Check price match
  if (order.maxPricePerUnit && listing.pricePerUnit > order.maxPricePerUnit) {
    return false
  }

  // Check distance
  const distance = distanceInMiles(
    order.location.latitude,
    order.location.longitude,
    listing.location.latitude,
    listing.location.longitude
  )

  return distance <= order.maxDistance
}

/**
 * Send match notification via Pub/Sub
 * This publishes to a topic that the push notification service subscribes to
 */
async function sendMatchNotification(
  buyerId: string,
  listingId: string,
  species: string,
  grade: string
): Promise<void> {
  // Import Pub/Sub dynamically
  const { PubSub } = await import('@google-cloud/pubsub')
  const pubsub = new PubSub({
    projectId: config.projectId
  })

  const topicName = 'standing-order-matches'
  const dataBuffer = Buffer.from(
    JSON.stringify({
      buyerId,
      listingId,
      species,
      grade,
      timestamp: new Date().toISOString()
    })
  )

  try {
    const messageId = await pubsub.topic(topicName).publish(dataBuffer)
    console.log(`[sendMatchNotification] Notification ${messageId} sent to ${buyerId}`)
  } catch (error) {
    console.error('[sendMatchNotification] Error publishing notification:', error)
    throw error
  }
}
