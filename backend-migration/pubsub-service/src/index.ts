/**
 * Pub/Sub Push Notification Service Entry Point
 * This service runs continuously and processes Pub/Sub messages
 */

import { startSubscriptions } from './subscription.js'

async function main() {
  console.log('[PubSubService] Starting Pub/Sub Push Notification Service...')

  try {
    await startSubscriptions()
    console.log('[PubSubService] Service is running and listening for messages')
  } catch (error) {
    console.error('[PubSubService] Failed to start service:', error)
    process.exit(1)
  }

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('[PubSubService] Received SIGINT, shutting down gracefully...')
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('[PubSubService] Received SIGTERM, shutting down gracefully...')
    process.exit(0)
  })
}

main()
