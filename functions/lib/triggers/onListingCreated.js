import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, rtdb } from '../config.js';
import { distanceInMiles } from '../utils/geohash.js';
import { notifyStandingOrderMatch } from '../utils/notifications.js';
/**
 * Triggered when a new listing is created
 * - Updates real-time inventory
 * - Finds matching standing orders and notifies buyers
 */
export const onListingCreated = functions.firestore
    .document('listings/{listingId}')
    .onCreate(async (snap, context) => {
    const listing = snap.data();
    const listingId = context.params.listingId;
    // Update real-time inventory
    await rtdb.ref(`live_inventory/${listingId}`).set({
        count: listing.quantity,
        status: listing.status,
        lastUpdated: admin.database.ServerValue.TIMESTAMP
    });
    // Find matching standing orders
    const matchingOrders = await findMatchingStandingOrders(listing);
    // Notify matching buyers
    for (const order of matchingOrders) {
        await notifyStandingOrderMatch(order.buyerId, listingId, listing.species, listing.grade);
        // Update last matched timestamp
        await db.collection('standingOrders').doc(order.id).update({
            lastMatchedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    console.log(`Processed new listing ${listingId}, found ${matchingOrders.length} matches`);
});
async function findMatchingStandingOrders(listing) {
    // Get all active standing orders
    const snapshot = await db
        .collection('standingOrders')
        .where('isActive', '==', true)
        .get();
    const matches = [];
    for (const doc of snapshot.docs) {
        const order = doc.data();
        // Check species match
        const speciesMatch = order.species.includes('*') || order.species.includes(listing.species);
        if (!speciesMatch)
            continue;
        // Check grade match (standing order minGrade must be <= listing grade)
        const gradeOrder = { sushi: 3, A: 2, B: 1 };
        if (gradeOrder[order.minGrade] > gradeOrder[listing.grade]) {
            continue;
        }
        // Check price match
        if (order.maxPricePerUnit && listing.pricePerUnit > order.maxPricePerUnit) {
            continue;
        }
        // Check distance
        const distance = distanceInMiles(order.location.latitude, order.location.longitude, listing.location.latitude, listing.location.longitude);
        if (distance > order.maxDistance) {
            continue;
        }
        matches.push({
            id: doc.id,
            buyerId: order.buyerId
        });
    }
    return matches;
}
