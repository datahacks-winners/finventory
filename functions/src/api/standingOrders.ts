import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { encodeGeohash } from '../utils/geohash.js'

export interface StandingOrder {
  id: string
  buyerId: string
  name: string
  species: string[]
  minGrade: 'sushi' | 'A' | 'B'
  maxDistance: number
  maxPricePerUnit?: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  isActive: boolean
  createdAt: admin.firestore.Timestamp
  lastMatchedAt?: admin.firestore.Timestamp
}

export interface CreateStandingOrderRequest {
  name: string
  species: string[]
  minGrade: 'sushi' | 'A' | 'B'
  maxDistance: number
  maxPricePerUnit?: number
  latitude: number
  longitude: number
}

/**
 * Create a new standing order
 */
export const createStandingOrder = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateStandingOrderRequest>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid

    // Validate inputs
    if (!data.name || data.name.trim().length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Name is required')
    }

    if (!data.species || data.species.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'At least one species is required')
    }

    if (data.maxDistance <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Max distance must be positive')
    }

    if (data.maxPricePerUnit !== undefined && data.maxPricePerUnit <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Max price must be positive')
    }

    // Validate coordinates
    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates')
    }

    // Normalize species to lowercase
    const normalizedSpecies = data.species.map((s) => s.toLowerCase())

    try {
      const geohash = encodeGeohash(data.latitude, data.longitude)

      const standingOrderRef = await db.collection('standingOrders').add({
        buyerId: userId,
        name: data.name.trim(),
        species: normalizedSpecies,
        minGrade: data.minGrade,
        maxDistance: data.maxDistance,
        maxPricePerUnit: data.maxPricePerUnit || null,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          geohash
        },
        isActive: true,
        createdAt: admin.firestore.Timestamp.now()
      })

      return {
        success: true,
        standingOrderId: standingOrderRef.id
      }
    } catch (error) {
      console.error('Error creating standing order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to create standing order')
    }
  }
)

/**
 * Update a standing order
 */
export const updateStandingOrder = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ standingOrderId: string; updates: Partial<StandingOrder> }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { standingOrderId, updates } = data
    const userId = request.auth.uid

    // Get standing order
    const soRef = db.collection('standingOrders').doc(standingOrderId)
    const soDoc = await soRef.get()

    if (!soDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Standing order not found')
    }

    const so = soDoc.data()!

    // Verify ownership
    if (so.buyerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your standing order')
    }

    // Don't allow changing buyerId
    if (updates.buyerId !== undefined) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot change buyer')
    }

    // Validate species if provided
    if (updates.species) {
      updates.species = updates.species.map((s) => s.toLowerCase())
    }

    try {
      await soRef.update(updates)
      return { success: true }
    } catch (error) {
      console.error('Error updating standing order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to update standing order')
    }
  }
)

/**
 * Delete a standing order
 */
export const deleteStandingOrder = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ standingOrderId: string }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { standingOrderId } = data
    const userId = request.auth.uid

    // Get standing order
    const soRef = db.collection('standingOrders').doc(standingOrderId)
    const soDoc = await soRef.get()

    if (!soDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Standing order not found')
    }

    const so = soDoc.data()!

    // Verify ownership
    if (so.buyerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your standing order')
    }

    try {
      await soRef.delete()
      return { success: true }
    } catch (error) {
      console.error('Error deleting standing order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to delete standing order')
    }
  }
)

/**
 * Get user's standing orders
 */
export const getMyStandingOrders = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid

    try {
      const snapshot = await db
        .collection('standingOrders')
        .where('buyerId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get()

      const standingOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))

      return { standingOrders }
    } catch (error) {
      console.error('Error getting standing orders:', error)
      throw new functions.https.HttpsError('internal', 'Failed to get standing orders')
    }
  }
)
