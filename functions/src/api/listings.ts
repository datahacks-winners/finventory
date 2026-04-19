import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { addGeoIndex, removeGeoIndex } from '../utils/geohash.js'

// Types
export interface CreateListingRequest {
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  sushiCertNumber?: string
  sushiCertExpiry?: admin.firestore.Timestamp
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  latitude: number
  longitude: number
  photos: string[]
  freshnessDate: admin.firestore.Timestamp
  deliveryAvailable: boolean
  expiresAt: admin.firestore.Timestamp
}

export interface Listing {
  id: string
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  sushiCertNumber?: string
  sushiCertExpiry?: admin.firestore.Timestamp
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  photos: string[]
  freshnessDate: admin.firestore.Timestamp
  deliveryAvailable: boolean
  status: 'active' | 'pending_pickup' | 'sold' | 'expired'
  createdAt: admin.firestore.Timestamp
  expiresAt: admin.firestore.Timestamp
}

/**
 * Create a new listing
 */
export const createListing = onCall(
  {
    cors: ['http://localhost:5173', 'http://localhost:3000', 'https://finventory.web.app', 'https://finventory.com']
  },
  async (request) => {
    const data = request.data as CreateListingRequest

    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated'
      )
    }

    const userId = request.auth.uid

    // Verify user is the seller
    if (data.sellerId !== userId) {
      throw new HttpsError(
        'permission-denied',
        'Cannot create listing for another user'
      )
    }

    // Validate sushi grade requirements
    if (data.grade === 'sushi' && (!data.sushiCertNumber || !data.sushiCertExpiry)) {
      throw new HttpsError(
        'invalid-argument',
        'Sushi grade requires certificate number and expiry'
      )
    }

    // Validate quantity
    if (data.quantity <= 0) {
      throw new HttpsError(
        'invalid-argument',
        'Quantity must be positive'
      )
    }

    // Validate price
    if (data.pricePerUnit <= 0) {
      throw new HttpsError(
        'invalid-argument',
        'Price must be positive'
      )
    }

    // Validate coordinates
    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid coordinates'
      )
    }

    // Validate expiry date
    const now = admin.firestore.Timestamp.now()
    if (data.expiresAt < now) {
      throw new HttpsError(
        'invalid-argument',
        'Expiry date must be in the future'
      )
    }

    try {
      // Create geohash
      const { encodeGeohash } = await import('../utils/geohash.js')
      const geohash = encodeGeohash(data.latitude, data.longitude)

      // Create listing document
      const listingRef = await db.collection('listings').add({
        sellerId: data.sellerId,
        species: data.species.toLowerCase(),
        grade: data.grade,
        sushiCertNumber: data.sushiCertNumber,
        sushiCertExpiry: data.sushiCertExpiry,
        quantity: data.quantity,
        unit: data.unit,
        pricePerUnit: data.pricePerUnit,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          geohash
        },
        photos: data.photos,
        freshnessDate: data.freshnessDate,
        deliveryAvailable: data.deliveryAvailable,
        status: 'active',
        createdAt: now,
        expiresAt: data.expiresAt
      })

      // Add to geo index
      await addGeoIndex(db, listingRef.id, data.latitude, data.longitude, data.expiresAt)

      return {
        success: true,
        listingId: listingRef.id
      }
    } catch (error) {
      console.error('Error creating listing:', error)
      throw new HttpsError(
        'internal',
        'Failed to create listing'
      )
    }
  }
)

/**
 * Update a listing
 */
export const updateListing = onCall(
  {
    cors: ['http://localhost:5173', 'http://localhost:3000', 'https://finventory.web.app', 'https://finventory.com']
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const data = request.data as { listingId: string; updates: Partial<Listing> }
    const { listingId, updates } = data

    // Get listing
    const listingRef = db.collection('listings').doc(listingId)
    const listingDoc = await listingRef.get()

    if (!listingDoc.exists) {
      throw new HttpsError('not-found', 'Listing not found')
    }

    const listing = listingDoc.data() as Listing

    // Verify ownership
    if (listing.sellerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not your listing')
    }

    // Don't allow changing seller or critical fields
    const allowedUpdates = [
      'quantity',
      'pricePerUnit',
      'photos',
      'deliveryAvailable',
      'status'
    ]

    const invalidUpdates = Object.keys(updates).filter(
      (key) => !allowedUpdates.includes(key)
    )

    if (invalidUpdates.length > 0) {
      throw new HttpsError(
        'invalid-argument',
        `Cannot update: ${invalidUpdates.join(', ')}`
      )
    }

    try {
      await listingRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return { success: true }
    } catch (error) {
      console.error('Error updating listing:', error)
      throw new HttpsError('internal', 'Failed to update listing')
    }
  }
)

/**
 * Delete a listing
 */
export const deleteListing = onCall(
  {
    cors: ['http://localhost:5173', 'http://localhost:3000', 'https://finventory.web.app', 'https://finventory.com']
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const data = request.data as { listingId: string }
    const { listingId } = data

    // Get listing
    const listingRef = db.collection('listings').doc(listingId)
    const listingDoc = await listingRef.get()

    if (!listingDoc.exists) {
      throw new HttpsError('not-found', 'Listing not found')
    }

    const listing = listingDoc.data() as Listing

    // Verify ownership
    if (listing.sellerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not your listing')
    }

    // Only allow deleting active listings
    if (listing.status !== 'active') {
      throw new HttpsError(
        'failed-precondition',
        'Cannot delete listing with pending orders'
      )
    }

    try {
      // Remove from geo index
      await removeGeoIndex(db, listingId)

      // Delete listing
      await listingRef.delete()

      return { success: true }
    } catch (error) {
      console.error('Error deleting listing:', error)
      throw new HttpsError('internal', 'Failed to delete listing')
    }
  }
)
