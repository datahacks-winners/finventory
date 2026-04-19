import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { calculateFreshnessScore } from '../api/inventory.js'

/**
 * Scheduled job: Update freshness scores and auto-downgrade sushi
 * Runs every hour
 */
export const freshnessMonitor = functions.pubsub.schedule('every 60 minutes').onRun(async (_context) => {
    console.log('Starting freshness monitor job...')
    
    const now = admin.firestore.Timestamp.now()
    const processed = {
      freshnessUpdates: 0,
      downgrades: 0,
      notifications: 0,
      errors: 0
    }

    try {
      // 1. Update freshness scores for all active batches
      const activeBatches = await db.collection('inventoryBatches')
        .where('status', 'in', ['in_storage', 'listed', 'partially_sold'])
        .get()

      console.log(`Processing ${activeBatches.size} active batches...`)

      for (const batchDoc of activeBatches.docs) {
        try {
          const batch = batchDoc.data()
          
          // Recalculate freshness score
          const newScore = calculateFreshnessScore(
            batch.landingDate,
            batch.storageMethod,
            batch.storageTempCelsius,
            batch.currentGrade
          )

          // Only update if changed significantly (> 5 points)
          if (Math.abs(newScore - batch.freshnessScore) >= 5) {
            await batchDoc.ref.update({
              freshnessScore: newScore,
              updatedAt: now
            })
            processed.freshnessUpdates++

            // Update linked active listings
            const listingsSnapshot = await db.collection('listings')
              .where('batchId', '==', batchDoc.id)
              .where('status', '==', 'active')
              .get()

            for (const listingDoc of listingsSnapshot.docs) {
              await listingDoc.ref.update({
                freshnessScore: newScore,
                updatedAt: now
              })
            }
          }
        } catch (error) {
          console.error(`Error updating batch ${batchDoc.id}:`, error)
          processed.errors++
        }
      }

      // 2. Auto-downgrade expired sushi grades
      const expiredSushi = await db.collection('inventoryBatches')
        .where('currentGrade', '==', 'sushi')
        .where('gradeExpiresAt', '<=', now)
        .where('sushiExpired', '==', false)
        .get()

      console.log(`Processing ${expiredSushi.size} expired sushi batches...`)

      for (const batchDoc of expiredSushi.docs) {
        try {
          const batch = batchDoc.data()
          
          await db.runTransaction(async (transaction) => {
            // Update batch
            transaction.update(batchDoc.ref, {
              currentGrade: 'a',
              sushiExpired: true,
              gradeExpiredAt: now,
              updatedAt: now
            })

            // Create movement record
            const movementRef = db.collection('inventoryMovements').doc()
            transaction.set(movementRef, {
              batchId: batchDoc.id,
              type: 'downgraded',
              quantityKg: batch.remainingKg,
              fromGrade: 'sushi',
              toGrade: 'a',
              notes: 'Auto-downgraded: Sushi grade expired after 48 hours',
              timestamp: now
            })

            // Downgrade active listings from this batch
            const listingsQuery = db.collection('listings')
              .where('batchId', '==', batchDoc.id)
              .where('status', '==', 'active')

            const listingsSnapshot = await transaction.get(listingsQuery)

            for (const listingDoc of listingsSnapshot.docs) {
              transaction.update(listingDoc.ref, {
                grade: 'a',
                gradeChanged: true,
                previousGrade: 'sushi',
                updatedAt: now
              })
            }

            return listingsSnapshot.size
          })

          processed.downgrades++

          // Send notifications
          try {
            // Notify seller
            await sendDowngradeNotification(batch.sellerId, batchDoc.id, batch)

            // Notify buyers with pending orders on listings from this batch
            const affectedOrders = await db.collection('orders')
              .where('batchId', '==', batchDoc.id)
              .where('status', 'in', ['pending', 'confirmed'])
              .get()

            for (const orderDoc of affectedOrders.docs) {
              await sendBuyerGradeChangeNotification(orderDoc.data().buyerId, orderDoc.id)
              processed.notifications++
            }
          } catch (notifError) {
            console.error('Error sending notifications:', notifError)
          }

        } catch (error) {
          console.error(`Error downgrading batch ${batchDoc.id}:`, error)
          processed.errors++
        }
      }

      // 3. Mark severely expired batches (7+ days old)
      const sevenDaysAgo = new Date(now.toMillis() - (7 * 24 * 60 * 60 * 1000))
      const veryOldBatches = await db.collection('inventoryBatches')
        .where('landingDate', '<=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .where('status', 'in', ['in_storage', 'listed', 'partially_sold'])
        .get()

      console.log(`Processing ${veryOldBatches.size} very old batches...`)

      for (const batchDoc of veryOldBatches.docs) {
        try {
          const batch = batchDoc.data()
          
          await batchDoc.ref.update({
            status: 'expired',
            freshnessScore: 0,
            updatedAt: now
          })

          // Create movement record
          await db.collection('inventoryMovements').add({
            batchId: batchDoc.id,
            type: 'expired',
            quantityKg: batch.remainingKg - batch.soldKg,
            notes: 'Auto-expired: Fish older than 7 days',
            timestamp: now
          })

          // Cancel active listings
          const listingsSnapshot = await db.collection('listings')
            .where('batchId', '==', batchDoc.id)
            .where('status', '==', 'active')
            .get()

          for (const listingDoc of listingsSnapshot.docs) {
            await listingDoc.ref.update({
              status: 'expired',
              updatedAt: now
            })
          }

          // Notify seller
          await sendExpiredNotification(batch.sellerId, batchDoc.id, batch)

        } catch (error) {
          console.error(`Error expiring batch ${batchDoc.id}:`, error)
          processed.errors++
        }
      }

      console.log('Freshness monitor complete:', processed)
      return null

    } catch (error) {
      console.error('Freshness monitor job failed:', error)
      throw error
    }
  })

/**
 * Helper: Send downgrade notification to seller
 */
async function sendDowngradeNotification(sellerId: string, batchId: string, batch: FirebaseFirestore.DocumentData) {
  try {
    const { notifyUser } = await import('../utils/notifications.js')
    
    await notifyUser({
      userId: sellerId,
      type: 'listing_update',
      title: 'Sushi Grade Expired',
      body: `${batch.species} (${batch.quantityKg}kg) auto-downgraded to Grade A. Sushi grade expired after 48 hours.`,
      data: {
        batchId,
        species: batch.species,
        fromGrade: 'sushi',
        toGrade: 'a'
      }
    })
  } catch (error) {
    console.error('Failed to send seller notification:', error)
  }
}

/**
 * Helper: Send grade change notification to buyer
 */
async function sendBuyerGradeChangeNotification(buyerId: string, orderId: string) {
  try {
    const { notifyUser } = await import('../utils/notifications.js')
    
    await notifyUser({
      userId: buyerId,
      type: 'order_update',
      title: 'Order Grade Changed',
      body: 'Your order grade has changed from Sushi to Grade A due to freshness expiry. Please review your order.',
      data: {
        orderId,
        fromGrade: 'sushi',
        toGrade: 'a'
      }
    })
  } catch (error) {
    console.error('Failed to send buyer notification:', error)
  }
}

/**
 * Helper: Send expired notification to seller
 */
async function sendExpiredNotification(sellerId: string, batchId: string, batch: FirebaseFirestore.DocumentData) {
  try {
    const { notifyUser } = await import('../utils/notifications.js')
    
    await notifyUser({
      userId: sellerId,
      type: 'listing_update',
      title: 'Inventory Expired',
      body: `${batch.species} (${batch.remainingKg - batch.soldKg}kg) has expired. Fish older than 7 days cannot be sold.`,
      data: {
        batchId,
        species: batch.species
      }
    })
  } catch (error) {
    console.error('Failed to send expired notification:', error)
  }
}
