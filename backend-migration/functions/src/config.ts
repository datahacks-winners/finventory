import { Firestore } from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage'
import { GoogleAuth } from 'google-auth-library'

// Configuration from environment variables
const PROJECT_ID = process.env.PROJECT_ID || 'finventory-gcp'
const REGION = process.env.REGION || 'us-central1'

// Initialize Google Cloud clients
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
})

export const db = new Firestore({
  projectId: PROJECT_ID
})

export const storage = new Storage({
  projectId: PROJECT_ID
})

export const authClient = auth

// Configuration constants
export const config = {
  projectId: PROJECT_ID,
  region: REGION,
  collections: {
    listings: 'listings',
    users: 'users',
    orders: 'orders',
    standingOrders: 'standingOrders'
  },
  buckets: {
    photos: 'finventory-photos',
    certificates: 'finventory-certificates'
  }
} as const
