// Configuration for Pub/Sub Push Service

export const config = {
  projectId: process.env.PROJECT_ID || 'finventory-gcp',
  region: process.env.REGION || 'us-central1',
  collections: {
    users: 'users',
    orders: 'orders',
    listings: 'listings',
    standingOrders: 'standingOrders'
  },
  topics: {
    standingOrderMatches: 'standing-order-matches',
    orderStatusUpdates: 'order-status-updates'
  }
} as const
