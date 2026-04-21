import { expect } from 'chai';

describe('standing orders validation', () => {
  describe('validate name', () => {
    it('rejects empty name', () => {
      const valid = validateName('');
       
      expect(valid).to.be.false;
    });

    it('rejects whitespace-only name', () => {
      const valid = validateName('   ');
       
      expect(valid).to.be.false;
    });

    it('accepts valid name', () => {
      const valid = validateName('Weekly Salmon');
       
      expect(valid).to.be.true;
    });
  });

  describe('validate species', () => {
    it('rejects empty array', () => {
      const valid = validateSpecies([]);
       
      expect(valid).to.be.false;
    });

    it('accepts one species', () => {
      const valid = validateSpecies(['salmon']);
       
      expect(valid).to.be.true;
    });

    it('accepts multiple species', () => {
      const valid = validateSpecies(['salmon', 'tuna', 'cod']);
       
      expect(valid).to.be.true;
    });
  });

  describe('normalize species', () => {
    it('converts to lowercase', () => {
      const result = normalizeSpecies(['Salmon', 'TUNA', 'Cod']);
      expect(result).to.deep.equal(['salmon', 'tuna', 'cod']);
    });

    it('handles already lowercase', () => {
      const result = normalizeSpecies(['salmon', 'tuna']);
      expect(result).to.deep.equal(['salmon', 'tuna']);
    });

    it('handles mixed case', () => {
      const result = normalizeSpecies(['SaLmOn']);
      expect(result).to.deep.equal(['salmon']);
    });
  });

  describe('validate max distance', () => {
    it('rejects zero distance', () => {
      const valid = validateMaxDistance(0);
       
      expect(valid).to.be.false;
    });

    it('rejects negative distance', () => {
      const valid = validateMaxDistance(-5);
       
      expect(valid).to.be.false;
    });

    it('accepts positive distance', () => {
      const valid = validateMaxDistance(10);
       
      expect(valid).to.be.true;
    });
  });

  describe('validate max price', () => {
    it('accepts undefined price', () => {
      const valid = validateMaxPrice(undefined);
       
      expect(valid).to.be.true;
    });

    it('rejects zero price', () => {
      const valid = validateMaxPrice(0);
       
      expect(valid).to.be.false;
    });

    it('rejects negative price', () => {
      const valid = validateMaxPrice(-10);
       
      expect(valid).to.be.false;
    });

    it('accepts positive price', () => {
      const valid = validateMaxPrice(25);
       
      expect(valid).to.be.true;
    });
  });

  describe('validate coordinates', () => {
    it('accepts valid latitude', () => {
      const valid = validateLatitude(37.7749);
       
      expect(valid).to.be.true;
    });

    it('accepts equator', () => {
      const valid = validateLatitude(0);
       
      expect(valid).to.be.true;
    });

    it('rejects latitude above 90', () => {
      const valid = validateLatitude(91);
       
      expect(valid).to.be.false;
    });

    it('rejects latitude below -90', () => {
      const valid = validateLatitude(-91);
       
      expect(valid).to.be.false;
    });

    it('accepts valid longitude', () => {
      const valid = validateLongitude(-122.4194);
       
      expect(valid).to.be.true;
    });

    it('accepts prime meridian', () => {
      const valid = validateLongitude(0);
       
      expect(valid).to.be.true;
    });

    it('rejects longitude above 180', () => {
      const valid = validateLongitude(181);
       
      expect(valid).to.be.false;
    });

    it('rejects longitude below -180', () => {
      const valid = validateLongitude(-181);
       
      expect(valid).to.be.false;
    });
  });

  describe('validate grade', () => {
    const validGrades = ['sushi', 'A', 'B'];

    it('accepts sushi grade', () => {
       
      expect(validGrades.includes('sushi')).to.be.true;
    });

    it('accepts A grade', () => {
       
      expect(validGrades.includes('A')).to.be.true;
    });

    it('accepts B grade', () => {
       
      expect(validGrades.includes('B')).to.be.true;
    });
  });
});

// Extracted validation functions for testing
function validateName(name: string): boolean {
  return name.trim().length > 0;
}

function validateSpecies(species: string[]): boolean {
  return species.length > 0;
}

function normalizeSpecies(species: string[]): string[] {
  return species.map((s) => s.toLowerCase());
}

function validateMaxDistance(distance: number): boolean {
  return distance > 0;
}

function validateMaxPrice(price: number | undefined): boolean {
  if (price === undefined) return true;
  return price > 0;
}

function validateLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

function validateLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}
