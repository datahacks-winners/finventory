import { expect } from 'chai';
import {
  encodeGeohash,
  decodeGeohash,
  distanceInMiles,
  getGeoHashesInRadius
} from '../src/utils/geohash.js';

describe('geohash utilities', () => {
  describe('encodeGeohash', () => {
    it('encodes coordinates to geohash', () => {
      const hash = encodeGeohash(37.7749, -122.4194);
      expect(hash).to.be.a('string');
      expect(hash.length).to.equal(9);
    });

    it('produces same hash for same coordinates', () => {
      const hash1 = encodeGeohash(37.7749, -122.4194);
      const hash2 = encodeGeohash(37.7749, -122.4194);
      expect(hash1).to.equal(hash2);
    });

    it('produces different hashes for different coordinates', () => {
      const hash1 = encodeGeohash(37.7749, -122.4194);
      const hash2 = encodeGeohash(40.7128, -74.0060);
      expect(hash1).to.not.equal(hash2);
    });
  });

  describe('decodeGeohash', () => {
    it('decodes geohash to coordinates', () => {
      const hash = encodeGeohash(37.7749, -122.4194);
      const decoded = decodeGeohash(hash);
      expect(decoded.latitude).to.be.closeTo(37.7749, 0.0001);
      expect(decoded.longitude).to.be.closeTo(-122.4194, 0.0001);
    });
  });

  describe('distanceInMiles', () => {
    it('calculates distance between two points', () => {
      const distance = distanceInMiles(37.7749, -122.4194, 40.7128, -74.0060);
      expect(distance).to.be.closeTo(2570, 10);
    });

    it('returns 0 for same point', () => {
      const distance = distanceInMiles(37.7749, -122.4194, 37.7749, -122.4194);
      expect(distance).to.be.closeTo(0, 0.01);
    });

    it('calculates short distance accurately', () => {
      const distance = distanceInMiles(37.7749, -122.4194, 37.7849, -122.4094);
      expect(distance).to.be.closeTo(0.9, 0.2);
    });
  });

  describe('getGeoHashesInRadius', () => {
    it('returns array of geohashes', () => {
      const hashes = getGeoHashesInRadius(37.7749, -122.4194, 10);
      expect(hashes).to.be.an('array');
      expect(hashes.length).to.be.greaterThan(0);
    });

    it('returns more hashes for larger radius', () => {
      const small = getGeoHashesInRadius(37.7749, -122.4194, 5);
      const large = getGeoHashesInRadius(37.7749, -122.4194, 20);
      expect(large.length).to.be.greaterThan(small.length);
    });

    it('returns hashes with consistent precision', () => {
      const hashes = getGeoHashesInRadius(37.7749, -122.4194, 10);
      hashes.forEach(hash => {
        expect(hash.length).to.equal(6);
      });
    });
  });
});
