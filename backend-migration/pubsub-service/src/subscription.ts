import { PubSub } from '@google-cloud/pubsub'
import { sendStandingOrderMatchNotification } from './push.js'

/**
 * Pub/Sub Subscription Service
 * Subscribes to topics and processes messages
 */

const pubsub = new PubSub({
  projectId: process.env.PROJECT_ID || 'finventory-gcp'
})

interface MatchMessage {
  buyerId: string
  listingId: string
  species: string
  grade: string
  timestamp: string
}

/**
 * Subscribe to standing order matches topic
 * This function is called when the service starts
 */
export async function subscribeToStandingOrderMatches(): Promise<void> {
  const subscriptionName = 'standing-order-matches-push-sub'
  const topicName = 'standing-order-matches'

  try {
    // Get or create topic
    const topic = pubsub.topic(topicName)

    // Check if topic exists, create if not
    const [topicExists] = await topic.exists()
    if (!topicExists) {
      console.log(`[subscribeToStandingOrderMatches] Creating topic: ${topicName}`)
      await pubsub.createTopic(topicName)
    }

    // Get or create subscription
    let subscription = topic.subscription(subscriptionName)
    const [subscriptionExists] = await subscription.exists()

    if (!subscriptionExists) {
      console.log(`[subscribeToStandingOrderMatches] Creating subscription: ${subscriptionName}`)
      subscription = await topic.createSubscription(subscriptionName, {
        ackDeadlineSeconds: 60
      })
    }

    // Set up message handler
    subscription.on('message', async (message) => {
      try {
        const data: MatchMessage = JSON.parse(message.data.toString())

        console.log(
          `[StandingOrderMatches] Received message: Order ${data.buyerId} <- Listing ${data.listingId}`
        )

        // Send push notification
        await sendStandingOrderMatchNotification(data)

        // Acknowledge message
        message.ack()

        console.log(`[StandingOrderMatches] Message processed and acknowledged`)
      } catch (error) {
        console.error('[StandingOrderMatches] Error processing message:', error)
        // Negative acknowledge (message will be redelivered)
        message.nack()
      }
    })

    subscription.on('error', (error) => {
      console.error('[StandingOrderMatches] Subscription error:', error)
    })

    console.log(`[subscribeToStandingOrderMatches] Subscribed to topic: ${topicName}`)
  } catch (error) {
    console.error('[subscribeToStandingOrderMatches] Error:', error)
    throw error
  }
}

/**
 * Subscribe to order status updates topic
 */
export async function subscribeToOrderStatusUpdates(): Promise<void> {
  const subscriptionName = 'order-status-updates-push-sub'
  const topicName = 'order-status-updates'

  try {
    const topic = pubsub.topic(topicName)
    const [topicExists] = await topic.exists()

    if (!topicExists) {
      await pubsub.createTopic(topicName)
    }

    let subscription = topic.subscription(subscriptionName)
    const [subscriptionExists] = await subscription.exists()

    if (!subscriptionExists) {
      subscription = await topic.createSubscription(subscriptionName, {
        ackDeadlineSeconds: 60
      })
    }

    subscription.on('message', async (message) => {
      try {
        const data = JSON.parse(message.data.toString())

        // Send appropriate notification based on status
        switch (data.status) {
          case 'confirmed':
            // Send confirmation notification
            console.log(`[OrderStatusUpdates] Order ${data.orderId} confirmed`)
            break
          case 'picked_up':
            // Send pickup confirmation
            console.log(`[OrderStatusUpdates] Order ${data.orderId} picked up`)
            break
          case 'cancelled':
            // Send cancellation notification
            console.log(`[OrderStatusUpdates] Order ${data.orderId} cancelled`)
            break
        }

        message.ack()
      } catch (error) {
        console.error('[OrderStatusUpdates] Error processing message:', error)
        message.nack()
      }
    })

    console.log(`[subscribeToOrderStatusUpdates] Subscribed to topic: ${topicName}`)
  } catch (error) {
    console.error('[subscribeToOrderStatusUpdates] Error:', error)
    throw error
  }
}

/**
 * Start all subscriptions
 */
export async function startSubscriptions(): Promise<void> {
  console.log('[startSubscriptions] Starting Pub/Sub subscriptions...')

  await Promise.all([
    subscribeToStandingOrderMatches(),
    subscribeToOrderStatusUpdates()
  ])

  console.log('[startSubscriptions] All subscriptions started successfully')
}
