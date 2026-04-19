import * as geohash from 'ngeohash';
export function encodeGeohash(lat, lng, precision = 9) {
    return geohash.encode(lat, lng, precision);
}
export function decodeGeohash(hash) {
    const decoded = geohash.decode(hash);
    return {
        latitude: decoded.latitude,
        longitude: decoded.longitude
    };
}
export function getGeoHashesInRadius(centerLat, centerLng, radiusMiles) {
    const radiusDegrees = radiusMiles / 69.0;
    const latMin = centerLat - radiusDegrees;
    const latMax = centerLat + radiusDegrees;
    const lngMin = centerLng - radiusDegrees;
    const lngMax = centerLng + radiusDegrees;
    const hashes = [];
    const precision = 6;
    const latStep = 1 / Math.pow(5, precision / 2);
    const lngStep = latStep;
    for (let lat = latMin; lat <= latMax; lat += latStep) {
        for (let lng = lngMin; lng <= lngMax; lng += lngStep) {
            const hash = encodeGeohash(lat, lng, precision);
            if (!hashes.includes(hash)) {
                hashes.push(hash);
            }
        }
    }
    return hashes;
}
export function distanceInMiles(lat1, lng1, lat2, lng2) {
    const R = 3959;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
export async function addGeoIndex(db, listingId, latitude, longitude, expiresAt) {
    const hash = encodeGeohash(latitude, longitude);
    await db.collection('geoIndex').add({
        geohash: hash,
        listingId,
        latitude,
        longitude,
        expiresAt
    });
}
export async function removeGeoIndex(db, listingId) {
    const snapshot = await db
        .collection('geoIndex')
        .where('listingId', '==', listingId)
        .get();
    const batch = db.batch();
    snapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}
