import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { rtdb } from '../config.js';
import { removeGeoIndex } from '../utils/geohash.js';
/**
 * Triggered when a listing is updated
 * - Updates real-time inventory
 * - Cleans up geo index if listing is sold/expired
 */
export const onListingUpdated = onDocumentUpdated('listings/{listingId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const listingId = event.params.listingId;
    // Update real-time inventory
    await rtdb.ref(`live_inventory/${listingId}`).update({
        count: after.quantity,
        status: after.status,
        lastUpdated: admin.database.ServerValue.TIMESTAMP
    });
    // Clean up geo index if listing is no longer active
    if (before.status === 'active' && after.status !== 'active') {
        await removeGeoIndex(admin.firestore(), listingId);
        console.log(`Cleaned up geo index for inactive listing ${listingId}`);
    }
    // Clean up real-time inventory if sold/expired
    if (after.status === 'sold' || after.status === 'expired') {
        await rtdb.ref(`live_inventory/${listingId}`).remove();
    }
});
