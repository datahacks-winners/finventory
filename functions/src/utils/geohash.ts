import * as geohash from 'ngeohash'
import * as admin from 'firebase-admin'

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface GeoResult {
  geohash: string
  latitude: number
  longitude: number
}

export function encodeGeohash(lat: number, lng: number, precision: number = 9): string {
  return geohash.encode(lat, lng, precision)
}

export function decodeGeohash(hash: string): GeoPoint {
  const decoded = geohash.decode(hash)
  return {
    latitude: decoded.latitude,
    longitude: decoded.longitude
  }
}

export function getGeoHashesInRadius(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): string[] {
  const radiusDegrees = radiusMiles / 69.0
  const latMin = centerLat - radiusDegrees
  const latMax = centerLat + radiusDegrees
  const lngMin = centerLng - radiusDegrees
  const lngMax = centerLng + radiusDegrees

  const hashes: string[] = []
  const precision = 6

  const latStep = 1 / Math.pow(5, precision / 2)
  const lngStep = latStep

  for (let lat = latMin; lat <= latMax; lat += latStep) {
    for (let lng = lngMin; lng <= lngMax; lng += lngStep) {
      const hash = encodeGeohash(lat, lng, precision)
      if (!hashes.includes(hash)) {
        hashes.push(hash)
      }
    }
  }

  return hashes
}

export function distanceInMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export interface GeoIndexEntry {
  geohash: string
  listingId: string
  latitude: number
  longitude: number
  expiresAt: admin.firestore.Timestamp
}

export async function addGeoIndex(
  db: admin.firestore.Firestore,
  listingId: string,
  latitude: number,
  longitude: number,
  expiresAt: admin.firestore.Timestamp
): Promise<void> {
  const hash = encodeGeohash(latitude, longitude)

  await db.collection('geoIndex').add({
    geohash: hash,
    listingId,
    latitude,
    longitude,
    expiresAt
  })
}

export async function removeGeoIndex(
  db: admin.firestore.Firestore,
  listingId: string
): Promise<void> {
  const snapshot = await db
    .collection('geoIndex')
    .where('listingId', '==', listingId)
    .get()

  const batch = db.batch()
  snapshot.forEach((doc) => {
    batch.delete(doc.ref)
  })

  await batch.commit()
}
