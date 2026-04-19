import { expect } from 'chai';
import { distanceInMiles } from '../src/utils/geohash.js';

// Test the matching logic directly (extracted from standingOrderMatcher.ts)
function checkMatch(listing: any, order: any): boolean {
  // Check species match
  const speciesMatch = order.species.includes('*') || order.species.includes(listing.species);
  if (!speciesMatch) return false;

  // Check grade match
  const gradeOrder: Record<string, number> = { sushi: 3, A: 2, B: 1 };
  if (gradeOrder[order.minGrade] > gradeOrder[listing.grade]) {
    return false;
  }

  // Check price match
  if (order.maxPricePerUnit && listing.pricePerUnit > order.maxPricePerUnit) {
    return false;
  }

  // Check distance
  const distance = distanceInMiles(
    order.location.latitude,
    order.location.longitude,
    listing.location.latitude,
    listing.location.longitude
  );

  return distance <= order.maxDistance;
}

describe('checkMatch', () => {
  const baseListing = {
    species: 'salmon',
    grade: 'A',
    pricePerUnit: 20,
    location: { latitude: 37.7749, longitude: -122.4194 }
  };

  const baseOrder = {
    species: ['salmon', 'tuna'],
    minGrade: 'B',
    maxPricePerUnit: 25,
    maxDistance: 10,
    location: { latitude: 37.7749, longitude: -122.4194 }
  };

  it('matches when all criteria align', () => {
    const result = checkMatch(baseListing, baseOrder);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.true;
  });

  it('rejects when species does not match', () => {
    const order = { ...baseOrder, species: ['tuna', 'cod'] };
    const result = checkMatch(baseListing, order);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.false;
  });

  it('accepts wildcard species match', () => {
    const order = { ...baseOrder, species: ['*'] };
    const result = checkMatch(baseListing, order);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.true;
  });

  it('rejects when grade is too low', () => {
    const listing = { ...baseListing, grade: 'B' };
    const order = { ...baseOrder, minGrade: 'A' };
    const result = checkMatch(listing, order);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.false;
  });

  it('accepts when grade meets minimum', () => {
    const listing = { ...baseListing, grade: 'sushi' };
    const order = { ...baseOrder, minGrade: 'A' };
    const result = checkMatch(listing, order);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.true;
  });

  it('rejects when price exceeds maximum', () => {
    const listing = { ...baseListing, pricePerUnit: 30 };
    const result = checkMatch(listing, baseOrder);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.false;
  });

  it('accepts when price is within limit', () => {
    const listing = { ...baseListing, pricePerUnit: 20 };
    const order = { ...baseOrder, maxPricePerUnit: 25 };
    const result = checkMatch(listing, order);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.true;
  });

  it('rejects when distance exceeds maximum', () => {
    const listing = { ...baseListing, location: { latitude: 40.7128, longitude: -74.0060 } };
    const result = checkMatch(listing, baseOrder);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.false;
  });

  it('accepts when distance is within range', () => {
    const listing = { ...baseListing, location: { latitude: 37.78, longitude: -122.41 } };
    const result = checkMatch(listing, baseOrder);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(result).to.be.true;
  });
});
