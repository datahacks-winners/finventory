import { https } from '@google-cloud/functions-framework'
import { db, config } from './config.js'
import { encodeGeohash } from '../shared/utils/geohash.js'

// Types
export interface CreateListingRequest {
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  sushiCertNumber?: string
  sushiCertExpiry?: Date
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  latitude: number
  longitude: number
  photos: string[]
  freshnessDate: Date
  deliveryAvailable: boolean
  expiresAt: Date
}

export interface Listing {
  id: string
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  sushiCertNumber?: string
  sushiCertExpiry?: Date
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  photos: string[]
  freshnessDate: Date
  deliveryAvailable: boolean
  status: 'active' | 'pending_pickup' | 'sold' | 'expired'
  createdAt: Date
  expiresAt: Date
}

/**
 * Cloud Function 2nd Gen: Create a new listing
 * Trigger: HTTP
 * Authentication: Required via Firebase Auth token in headers
 */
https.onCall(createListing, async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' })
    return
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).send({ error: 'Unauthorized: No token provided' })
      return
    }

    // Note: In production, verify Firebase Auth token here
    // For now, extract user ID from token (simplified)
    const token = authHeader.substring(7)
    const userId = token // TODO: Verify with Firebase Admin SDK or Cloud Identity Platform

    const data: CreateListingRequest = req.body

    // Verify user is the seller
    if (data.sellerId !== userId) {
      res.status(403).send({ error: 'Cannot create listing for another user' })
      return
    }

    // Validate sushi grade requirements
    if (data.grade === 'sushi' && (!data.sushiCertNumber || !data.sushiCertExpiry)) {
      res.status(400).send({
        error: 'Sushi grade requires certificate number and expiry'
      })
      return
    }

    // Validate quantity
    if (data.quantity <= 0) {
      res.status(400).send({ error: 'Quantity must be positive' })
      return
    }

    // Validate price
    if (data.pricePerUnit <= 0) {
      res.status(400).send({ error: 'Price must be positive' })
      return
    }

    // Validate coordinates
    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      res.status(400).send({ error: 'Invalid coordinates' })
      return
    }

    // Validate expiry date
    const now = new Date()
    if (new Date(data.expiresAt) < now) {
      res.status(400).send({ error: 'Expiry date must be in the future' })
      return
    }

    // Create geohash
    const geohash = encodeGeohash(data.latitude, data.longitude)

    // Create listing document
    const listingRef = await db.collection(config.collections.listings).add({
      sellerId: data.sellerId,
      species: data.species.toLowerCase(),
      grade: data.grade,
      sushiCertNumber: data.sushiCertNumber,
      sushiCertExpiry: data.sushiCertExpiry ? new Date(data.sushiCertExpiry) : null,
      quantity: data.quantity,
      unit: data.unit,
      pricePerUnit: data.pricePerUnit,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        geohash
      },
      photos: data.photos,
      freshnessDate: new Date(data.freshnessDate),
      deliveryAvailable: data.deliveryAvailable,
      status: 'active',
      createdAt: now,
      expiresAt: new Date(data.expiresAt)
    })

    // Add to geo index collection for proximity queries
    await db.collection('geoIndex').doc(listingRef.id).set({
      geohash,
      latitude: data.latitude,
      longitude: data.longitude,
      listingId: listingRef.id,
      expiresAt: new Date(data.expiresAt),
      createdAt: now
    })

    res.status(200).send({
      success: true,
      listingId: listingRef.id
    })
  } catch (error) {
    console.error('Error creating listing:', error)
    res.status(500).send({ error: 'Failed to create listing', details: error.message })
  }
})

/**
 * Wrapper function for Cloud Functions 2nd Gen
 * Uses functions-framework for HTTP trigger
 */
export function createListing(req: any, res: any): Promise<void> {
  return https.onCall(createListingHandler)(req, res)
}

async function createListingHandler(req: any, res: any): Promise<void> {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' })
    return
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).send({ error: 'Unauthorized: No token provided' })
      return
    }

    // Note: In production, verify Firebase Auth token here
    const token = authHeader.substring(7)
    const userId = token // TODO: Verify with Firebase Admin SDK or Cloud Identity Platform

    const data: CreateListingRequest = req.body

    // Verify user is the seller
    if (data.sellerId !== userId) {
      res.status(403).send({ error: 'Cannot create listing for another user' })
      return
    }

    // Validate sushi grade requirements
    if (data.grade === 'sushi' && (!data.sushiCertNumber || !data.sushiCertExpiry)) {
      res.status(400).send({
        error: 'Sushi grade requires certificate number and expiry'
      })
      return
    }

    // Validate quantity
    if (data.quantity <= 0) {
      res.status(400).send({ error: 'Quantity must be positive' })
      return
    }

    // Validate price
    if (data.pricePerUnit <= 0) {
      res.status(400).send({ error: 'Price must be positive' })
      return
    }

    // Validate coordinates
    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      res.status(400).send({ error: 'Invalid coordinates' })
      return
    }

    // Validate expiry date
    const now = new Date()
    if (new Date(data.expiresAt) < now) {
      res.status(400).send({ error: 'Expiry date must be in the future' })
      return
    }

    // Create geohash
    const geohash = encodeGeohash(data.latitude, data.longitude)

    // Create listing document
    const listingRef = await db.collection(config.collections.listings).add({
      sellerId: data.sellerId,
      species: data.species.toLowerCase(),
      grade: data.grade,
      sushiCertNumber: data.sushiCertNumber,
      sushiCertExpiry: data.sushiCertExpiry ? new Date(data.sushiCertExpiry) : null,
      quantity: data.quantity,
      unit: data.unit,
      pricePerUnit: data.pricePerUnit,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        geohash
      },
      photos: data.photos,
      freshnessDate: new Date(data.freshnessDate),
      deliveryAvailable: data.deliveryAvailable,
      status: 'active',
      createdAt: now,
      expiresAt: new Date(data.expiresAt)
    })

    // Add to geo index collection for proximity queries
    await db.collection('geoIndex').doc(listingRef.id).set({
      geohash,
      latitude: data.latitude,
      longitude: data.longitude,
      listingId: listingRef.id,
      expiresAt: new Date(data.expiresAt),
      createdAt: now
    })

    res.status(200).send({
      success: true,
      listingId: listingRef.id
    })
  } catch (error) {
    console.error('Error creating listing:', error)
    res.status(500).send({ error: 'Failed to create listing', details: error.message })
  }
}
