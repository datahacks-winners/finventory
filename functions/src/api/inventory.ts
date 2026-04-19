import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from '../config.js'

// ============================================================================
// Types
// ============================================================================

export interface CreateInventoryBatchRequest {
  sellerId: string
  locationId: string
  species: string
  quantityKg: number
  catchDate: admin.firestore.Timestamp
  landingDate: admin.firestore.Timestamp
  boatName?: string
  supplier?: string
  initialGrade: 'sushi' | 'a' | 'b' | 'c'
  storageMethod: 'ice' | 'refrigerated' | 'frozen' | 'live_tank'
  storageTempCelsius?: number
  notes?: string
}

export interface InventoryBatch {
  id: string
  sellerId: string
  locationId: string
  species: string
  quantityKg: number
  catchDate: admin.firestore.Timestamp
  landingDate: admin.firestore.Timestamp
  boatName?: string
  supplier?: string
  initialGrade: 'sushi' | 'a' | 'b' | 'c'
  currentGrade: 'sushi' | 'a' | 'b' | 'c'
  storageMethod: 'ice' | 'refrigerated' | 'frozen' | 'live_tank'
  storageTempCelsius?: number
  freshnessScore: number
  gradeExpiresAt?: admin.firestore.Timestamp
  status: 'in_storage' | 'listed' | 'partially_sold' | 'sold_out' | 'expired' | 'discarded'
  remainingKg: number
  listedKg: number
  soldKg: number
  sushiExpired: boolean
  notes?: string
  createdAt: admin.firestore.Timestamp
  updatedAt: admin.firestore.Timestamp
}

export interface InventoryMovement {
  id: string
  batchId: string
  type: 'received' | 'graded' | 'listed' | 'sold' | 'downgraded' | 'expired' | 'discarded' | 'transferred'
  quantityKg: number
  fromGrade?: 'sushi' | 'a' | 'b' | 'c'
  toGrade?: 'sushi' | 'a' | 'b' | 'c'
  orderId?: string
  listingId?: string
  notes?: string
  performedBy: string
  timestamp: admin.firestore.Timestamp
}

// ============================================================================
// Freshness Score Calculation
// ============================================================================

export function calculateFreshnessScore(
  landingDate: admin.firestore.Timestamp,
  storageMethod: string,
  storageTempCelsius?: number,
  initialGrade: string = 'a'
): number {
  const now = Date.now()
  const landingTime = landingDate.toMillis()
  const ageHours = (now - landingTime) / (1000 * 60 * 60)
  
  // Base score starts at 100, decays over time
  let score = 100
  
  // Age decay (different curves by storage)
  const decayRates: Record<string, number> = {
    ice: 2.5,           // -2.5 points per hour
    refrigerated: 1.8,
    frozen: 0.1,
    live_tank: 1.2
  }
  
  score -= ageHours * (decayRates[storageMethod] || 2.0)
  
  // Temperature penalty (if applicable)
  if (storageTempCelsius !== undefined) {
    if (storageMethod === 'ice' && storageTempCelsius > 2) {
      score -= 10 // too warm for ice
    }
    if (storageMethod === 'refrigerated' && storageTempCelsius > 4) {
      score -= 15
    }
  }
  
  // Grade-specific adjustments
  // Sushi grade has stricter requirements
  if (initialGrade === 'sushi' && ageHours > 24) {
    score -= 20 // rapid penalty after 24 hours
  }
  
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function calculateGradeExpiry(
  landingDate: admin.firestore.Timestamp,
  initialGrade: string
): admin.firestore.Timestamp | undefined {
  if (initialGrade !== 'sushi') return undefined
  
  // Sushi expires 48 hours after landing
  const landingTime = landingDate.toMillis()
  const expiryTime = landingTime + (48 * 60 * 60 * 1000)
  return admin.firestore.Timestamp.fromMillis(expiryTime)
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a new inventory batch (when fish is received)
 */
export const createInventoryBatch = functions.https.onCall(
  async (data: CreateInventoryBatchRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = context.auth.uid

    // Verify user is the seller
    if (data.sellerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot create batch for another user')
    }

    // Validate quantity
    if (data.quantityKg <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Quantity must be positive')
    }

    // Validate dates
    const now = admin.firestore.Timestamp.now()
    if (data.landingDate > now) {
      throw new functions.https.HttpsError('invalid-argument', 'Landing date cannot be in the future')
    }

    // Validate location exists
    const locationDoc = await db.collection('sellerLocations').doc(data.locationId).get()
    if (!locationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Location not found')
    }
    const location = locationDoc.data()
    if (location?.sellerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Location does not belong to you')
    }

    try {
      // Calculate freshness score
      const freshnessScore = calculateFreshnessScore(
        data.landingDate,
        data.storageMethod,
        data.storageTempCelsius,
        data.initialGrade
      )

      // Calculate grade expiry (for sushi)
      const gradeExpiresAt = calculateGradeExpiry(data.landingDate, data.initialGrade)

      // Create batch document
      const batchRef = db.collection('inventoryBatches').doc()
      const batch: Omit<InventoryBatch, 'id'> = {
        sellerId: data.sellerId,
        locationId: data.locationId,
        species: data.species.toLowerCase(),
        quantityKg: data.quantityKg,
        catchDate: data.catchDate,
        landingDate: data.landingDate,
        boatName: data.boatName,
        supplier: data.supplier,
        initialGrade: data.initialGrade,
        currentGrade: data.initialGrade,
        storageMethod: data.storageMethod,
        storageTempCelsius: data.storageTempCelsius,
        freshnessScore,
        gradeExpiresAt,
        status: 'in_storage',
        remainingKg: data.quantityKg,
        listedKg: 0,
        soldKg: 0,
        sushiExpired: false,
        notes: data.notes,
        createdAt: now,
        updatedAt: now
      }

      await batchRef.set(batch)

      // Create movement record
      await db.collection('inventoryMovements').add({
        batchId: batchRef.id,
        type: 'received',
        quantityKg: data.quantityKg,
        performedBy: userId,
        timestamp: now
      })

      // Update seller stats
      await db.collection('users').doc(userId).update({
        'stats.totalInventoryReceived': admin.firestore.FieldValue.increment(data.quantityKg),
        'stats.inventoryBatchCount': admin.firestore.FieldValue.increment(1),
        updatedAt: now
      })

      return {
        success: true,
        batchId: batchRef.id,
        freshnessScore
      }
    } catch (error) {
      console.error('Error creating inventory batch:', error)
      throw new functions.https.HttpsError('internal', 'Failed to create inventory batch')
    }
  }
)

/**
 * Update batch (grade change, storage temp, etc.)
 */
export const updateInventoryBatch = functions.https.onCall(
  async (data: { batchId: string; updates: Partial<InventoryBatch> }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { batchId, updates } = data
    const userId = context.auth.uid

    // Get batch
    const batchRef = db.collection('inventoryBatches').doc(batchId)
    const batchDoc = await batchRef.get()

    if (!batchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Batch not found')
    }

    const batch = batchDoc.data() as InventoryBatch

    // Verify ownership
    if (batch.sellerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your batch')
    }

    // Don't allow changing critical fields directly
    const allowedUpdates = [
      'currentGrade',
      'storageMethod',
      'storageTempCelsius',
      'notes'
    ]

    const invalidUpdates = Object.keys(updates).filter(key => !allowedUpdates.includes(key))
    if (invalidUpdates.length > 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Cannot update: ${invalidUpdates.join(', ')}`
      )
    }

    try {
      const now = admin.firestore.Timestamp.now()
      const updateData: FirebaseFirestore.DocumentData = {
        updatedAt: now
      }

      // Handle grade change
      if (updates.currentGrade && updates.currentGrade !== batch.currentGrade) {
        updateData.currentGrade = updates.currentGrade
        
        // Create movement record
        await db.collection('inventoryMovements').add({
          batchId,
          type: 'graded',
          quantityKg: batch.remainingKg,
          fromGrade: batch.currentGrade,
          toGrade: updates.currentGrade,
          performedBy: userId,
          timestamp: now
        })
      }

      // Handle storage method/temp change
      if (updates.storageMethod) {
        updateData.storageMethod = updates.storageMethod
      }
      if (updates.storageTempCelsius !== undefined) {
        updateData.storageTempCelsius = updates.storageTempCelsius
      }

      // Recalculate freshness score if storage changed
      if (updates.storageMethod || updates.storageTempCelsius !== undefined) {
        updateData.freshnessScore = calculateFreshnessScore(
          batch.landingDate,
          updates.storageMethod || batch.storageMethod,
          updates.storageTempCelsius !== undefined ? updates.storageTempCelsius : batch.storageTempCelsius,
          updates.currentGrade || batch.currentGrade
        )
      }

      if (updates.notes) {
        updateData.notes = updates.notes
      }

      await batchRef.update(updateData)

      return { success: true }
    } catch (error) {
      console.error('Error updating batch:', error)
      throw new functions.https.HttpsError('internal', 'Failed to update batch')
    }
  }
)

/**
 * Convert batch to listing(s)
 */
export const convertBatchToListing = functions.https.onCall(
  async (data: { 
    batchId: string
    quantityKg: number
    pricePerKg: number
    photos: string[]
    deliveryAvailable: boolean
    expiresAt: admin.firestore.Timestamp
  }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = context.auth.uid
    const { batchId, quantityKg, pricePerKg, photos, deliveryAvailable, expiresAt } = data

    // Get batch
    const batchRef = db.collection('inventoryBatches').doc(batchId)
    const batchDoc = await batchRef.get()

    if (!batchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Batch not found')
    }

    const batch = batchDoc.data() as InventoryBatch

    // Verify ownership
    if (batch.sellerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your batch')
    }

    // Check available quantity
    const availableKg = batch.remainingKg - batch.listedKg
    if (quantityKg > availableKg) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Cannot list ${quantityKg}kg. Only ${availableKg}kg available.`
      )
    }

    // Get location for coordinates
    const locationDoc = await db.collection('sellerLocations').doc(batch.locationId).get()
    const location = locationDoc.data()

    try {
      const now = admin.firestore.Timestamp.now()

      // Create listing
      const { encodeGeohash } = await import('../utils/geohash.js')
      const geohash = encodeGeohash(location?.address?.latitude || 0, location?.address?.longitude || 0)

      const listingRef = await db.collection('listings').add({
        sellerId: userId,
        batchId,
        locationId: batch.locationId,
        species: batch.species,
        grade: batch.currentGrade,
        quantity: quantityKg,
        quantityListedFromBatch: quantityKg,
        unit: 'kg',
        pricePerUnit: pricePerKg,
        location: {
          latitude: location?.address?.latitude || 0,
          longitude: location?.address?.longitude || 0,
          geohash
        },
        photos,
        freshnessDate: batch.landingDate,
        freshnessScore: batch.freshnessScore,
        storageMethod: batch.storageMethod,
        catchDate: batch.catchDate,
        boatName: batch.boatName,
        deliveryAvailable,
        status: 'active',
        createdAt: now,
        expiresAt
      })

      // Update batch
      const newListedKg = batch.listedKg + quantityKg
      const newStatus: InventoryBatch['status'] = 
        newListedKg >= batch.remainingKg ? 'listed' : 'partially_sold'

      await batchRef.update({
        listedKg: newListedKg,
        status: newStatus,
        updatedAt: now
      })

      // Create movement record
      await db.collection('inventoryMovements').add({
        batchId,
        type: 'listed',
        quantityKg,
        listingId: listingRef.id,
        performedBy: userId,
        timestamp: now
      })

      // Add to geo index
      const { addGeoIndex } = await import('../utils/geohash.js')
      await addGeoIndex(db, listingRef.id, location?.address?.latitude || 0, location?.address?.longitude || 0, expiresAt)

      return {
        success: true,
        listingId: listingRef.id
      }
    } catch (error) {
      console.error('Error converting batch to listing:', error)
      throw new functions.https.HttpsError('internal', 'Failed to create listing from batch')
    }
  }
)

/**
 * Get inventory batches for a seller
 */
export const getInventoryBatches = functions.https.onCall(
  async (data: { 
    status?: InventoryBatch['status'][]
    locationId?: string
    species?: string
    limit?: number
  }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = context.auth.uid
    const { status, locationId, species, limit = 50 } = data

    try {
      let query: admin.firestore.Query = db.collection('inventoryBatches')
        .where('sellerId', '==', userId)
        .orderBy('createdAt', 'desc')

      if (status && status.length > 0) {
        query = query.where('status', 'in', status)
      }

      if (locationId) {
        query = query.where('locationId', '==', locationId)
      }

      if (species) {
        query = query.where('species', '==', species.toLowerCase())
      }

      const snapshot = await query.limit(limit).get()

      const batches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return { batches }
    } catch (error) {
      console.error('Error fetching batches:', error)
      throw new functions.https.HttpsError('internal', 'Failed to fetch batches')
    }
  }
)

/**
 * Get inventory movements for a batch
 */
export const getInventoryMovements = functions.https.onCall(
  async (data: { batchId: string; limit?: number }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { batchId, limit = 50 } = data

    // Verify batch ownership
    const batchDoc = await db.collection('inventoryBatches').doc(batchId).get()
    if (!batchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Batch not found')
    }

    const batch = batchDoc.data() as InventoryBatch
    if (batch.sellerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not your batch')
    }

    try {
      const snapshot = await db.collection('inventoryMovements')
        .where('batchId', '==', batchId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get()

      const movements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return { movements }
    } catch (error) {
      console.error('Error fetching movements:', error)
      throw new functions.https.HttpsError('internal', 'Failed to fetch movements')
    }
  }
)

/**
 * Discard/expired batch (mark as waste)
 */
export const discardInventoryBatch = functions.https.onCall(
  async (data: { batchId: string; reason: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { batchId, reason } = data
    const userId = context.auth.uid

    // Get batch
    const batchRef = db.collection('inventoryBatches').doc(batchId)
    const batchDoc = await batchRef.get()

    if (!batchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Batch not found')
    }

    const batch = batchDoc.data() as InventoryBatch

    // Verify ownership
    if (batch.sellerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your batch')
    }

    // Only allow discarding unsold inventory
    const unsoldKg = batch.remainingKg - batch.soldKg
    if (unsoldKg <= 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No unsold inventory to discard'
      )
    }

    try {
      const now = admin.firestore.Timestamp.now()

      // Update batch
      await batchRef.update({
        status: 'discarded',
        remainingKg: batch.soldKg, // Only sold amount remains
        updatedAt: now
      })

      // Create movement record
      await db.collection('inventoryMovements').add({
        batchId,
        type: 'discarded',
        quantityKg: unsoldKg,
        notes: reason,
        performedBy: userId,
        timestamp: now
      })

      // Cancel any active listings from this batch
      const listingsSnapshot = await db.collection('listings')
        .where('batchId', '==', batchId)
        .where('status', '==', 'active')
        .get()

      for (const listingDoc of listingsSnapshot.docs) {
        await listingDoc.ref.update({
          status: 'expired',
          updatedAt: now
        })
      }

      return { success: true, discardedKg: unsoldKg }
    } catch (error) {
      console.error('Error discarding batch:', error)
      throw new functions.https.HttpsError('internal', 'Failed to discard batch')
    }
  }
)

/**
 * Get inventory dashboard stats for a seller
 */
export const getInventoryDashboard = functions.https.onCall(
  async (_, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = context.auth.uid

    try {
      // Get all active batches
      const batchesSnapshot = await db.collection('inventoryBatches')
        .where('sellerId', '==', userId)
        .where('status', 'in', ['in_storage', 'listed', 'partially_sold'])
        .get()

      const batches = batchesSnapshot.docs.map(d => d.data() as InventoryBatch)

      // Calculate stats
      const stats = {
        totalBatches: batches.length,
        totalInventoryKg: batches.reduce((sum, b) => sum + b.remainingKg, 0),
        totalListedKg: batches.reduce((sum, b) => sum + b.listedKg, 0),
        totalSoldKg: batches.reduce((sum, b) => sum + b.soldKg, 0),
        availableForListingKg: batches.reduce((sum, b) => sum + (b.remainingKg - b.listedKg), 0),
        
        // By species
        bySpecies: {} as Record<string, { totalKg: number; listedKg: number; availableKg: number }>,
        
        // By grade
        byGrade: {
          sushi: { count: 0, kg: 0, expiringSoon: 0 },
          a: { count: 0, kg: 0 },
          b: { count: 0, kg: 0 },
          c: { count: 0, kg: 0 }
        } as Record<string, { count: number; kg: number; expiringSoon?: number }>,
        
        // Sushi expiring in next 12 hours
        sushiExpiringSoon: [] as InventoryBatch[]
      }

      const now = Date.now()
      const twelveHours = 12 * 60 * 60 * 1000

      for (const batch of batches) {
        // By species
        if (!stats.bySpecies[batch.species]) {
          stats.bySpecies[batch.species] = { totalKg: 0, listedKg: 0, availableKg: 0 }
        }
        stats.bySpecies[batch.species].totalKg += batch.remainingKg
        stats.bySpecies[batch.species].listedKg += batch.listedKg
        stats.bySpecies[batch.species].availableKg += (batch.remainingKg - batch.listedKg)

        // By grade
        if (stats.byGrade[batch.currentGrade]) {
          stats.byGrade[batch.currentGrade].count++
          stats.byGrade[batch.currentGrade].kg += batch.remainingKg
          
          // Check if sushi expiring soon
          if (batch.currentGrade === 'sushi' && batch.gradeExpiresAt) {
            const expiryTime = batch.gradeExpiresAt.toMillis()
            if (expiryTime - now < twelveHours) {
              stats.byGrade.sushi.expiringSoon = (stats.byGrade.sushi.expiringSoon || 0) + 1
              stats.sushiExpiringSoon.push(batch)
            }
          }
        }
      }

      return { stats }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      throw new functions.https.HttpsError('internal', 'Failed to fetch dashboard')
    }
  }
)
