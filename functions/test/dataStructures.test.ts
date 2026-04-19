import { expect } from 'chai';

describe('data structures and utilities', () => {
  describe('array operations', () => {
    it('removes duplicates from array', () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const unique = removeDuplicates(arr);
      expect(unique).to.deep.equal([1, 2, 3]);
    });

    it('sorts array of numbers', () => {
      const arr = [3, 1, 4, 1, 5];
      const sorted = sortNumbers(arr);
      expect(sorted).to.deep.equal([1, 1, 3, 4, 5]);
    });

    it('finds max value in array', () => {
      const arr = [3, 7, 2, 9, 1];
      const max = findMax(arr);
      expect(max).to.equal(9);
    });

    it('finds min value in array', () => {
      const arr = [3, 7, 2, 9, 1];
      const min = findMin(arr);
      expect(min).to.equal(1);
    });

    it('calculates average of array', () => {
      const arr = [2, 4, 6, 8];
      const avg = calculateAverage(arr);
      expect(avg).to.equal(5);
    });
  });

  describe('string operations', () => {
    it('capitalizes first letter', () => {
      const result = capitalize('salmon');
      expect(result).to.equal('Salmon');
    });

    it('converts to title case', () => {
      const result = toTitleCase('fresh atlantic salmon');
      expect(result).to.equal('Fresh Atlantic Salmon');
    });

    it('truncates long text', () => {
      const text = 'This is a very long description that should be truncated';
      const result = truncate(text, 20);
      expect(result.length).to.be.at.most(23); // 20 + '...'
      expect(result).to.include('...');
    });

    it('generates slug from text', () => {
      const result = slugify('Fresh Salmon Filet');
      expect(result).to.equal('fresh-salmon-filet');
    });
  });

  describe('object operations', () => {
    it('merges two objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { c: 3, d: 4 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged = mergeObjects(obj1 as any, obj2 as any);
      expect(merged).to.deep.equal({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('picks specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const picked = pickProperties(obj, ['a', 'c']);
      expect(picked).to.deep.equal({ a: 1, c: 3 });
    });

    it('omits specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const omitted = omitProperties(obj, ['b', 'd']);
      expect(omitted).to.deep.equal({ a: 1, c: 3 });
    });

    it('gets nested property safely', () => {
      const obj = { a: { b: { c: 5 } } };
      const value = getNestedProperty(obj, 'a.b.c');
      expect(value).to.equal(5);
    });

    it('returns undefined for missing nested property', () => {
      const obj = { a: { b: { c: 5 } } };
      const value = getNestedProperty(obj, 'a.b.d');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(value).to.be.undefined;
    });
  });

  describe('date utilities', () => {
    it('formats date as ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).to.equal('2024-01-15');
    });

    it('calculates days between dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-08');
      const days = daysBetween(date1, date2);
      expect(days).to.equal(7);
    });

    it('adds days to date', () => {
      const date = new Date('2024-01-01');
      const result = addDays(date, 7);
      expect(result.toISOString().split('T')[0]).to.equal('2024-01-08');
    });

    it('checks if date is in past', () => {
      const past = new Date(Date.now() - 100000);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isPast(past)).to.be.true;
    });

    it('checks if date is in future', () => {
      const future = new Date(Date.now() + 100000);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isFuture(future)).to.be.true;
    });
  });

  describe('numeric utilities', () => {
    it('rounds to decimal places', () => {
      const result = roundToDecimals(3.14159, 2);
      expect(result).to.equal(3.14);
    });

    it('clamps number within range', () => {
      expect(clamp(5, 0, 10)).to.equal(5);
      expect(clamp(-5, 0, 10)).to.equal(0);
      expect(clamp(15, 0, 10)).to.equal(10);
    });

    it('generates random integer in range', () => {
      const result = randomInt(1, 10);
      expect(result).to.be.at.least(1);
      expect(result).to.be.at.most(10);
    });

    it('checks if number is in range', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(inRange(5, 1, 10)).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(inRange(0, 1, 10)).to.be.false;
    });
  });

  describe('collection utilities', () => {
    it('groups array by key', () => {
      const items = [
        { category: 'fish', name: 'salmon' },
        { category: 'fish', name: 'tuna' },
        { category: 'shellfish', name: 'shrimp' }
      ];
      const grouped = groupBy(items, 'category');
      expect(Object.keys(grouped)).to.have.lengthOf(2);
      expect(grouped.fish).to.have.lengthOf(2);
      expect(grouped.shellfish).to.have.lengthOf(1);
    });

    it('chunks array into groups', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunked = chunk(arr, 2);
      expect(chunked).to.deep.equal([[1, 2], [3, 4], [5]]);
    });

    it('shuffles array', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle([...arr]);
      expect(shuffled).to.have.lengthOf(5);
      expect(shuffled).to.include.members(arr);
    });

    it('partitions array by predicate', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const [even, odd] = partition(arr, n => n % 2 === 0);
      expect(even).to.deep.equal([2, 4, 6]);
      expect(odd).to.deep.equal([1, 3, 5]);
    });
  });

  describe('validation utilities', () => {
    it('checks if value is defined', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isDefined(null)).to.be.false;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isDefined(undefined)).to.be.false;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isDefined(0)).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isDefined('')).to.be.true;
    });

    it('checks if value is empty', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isEmpty('')).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isEmpty([])).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isEmpty({})).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isEmpty([1])).to.be.false;
    });

    it('checks if value is in range', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isInRange(5, [1, 2, 3, 4, 5])).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isInRange(6, [1, 2, 3, 4, 5])).to.be.false;
    });

    it('checks if all items match predicate', () => {
      const arr = [2, 4, 6, 8];
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(all(arr, n => n % 2 === 0)).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(all(arr, n => n > 5)).to.be.false;
    });

    it('checks if any item matches predicate', () => {
      const arr = [1, 2, 3, 4, 5];
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(any(arr, n => n > 4)).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(any(arr, n => n > 10)).to.be.false;
    });
  });

  describe('type checking utilities', () => {
    it('identifies arrays', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isArray([1, 2, 3])).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isArray('not an array')).to.be.false;
    });

    it('identifies plain objects', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isPlainObject({ a: 1 } as object)).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isPlainObject([1, 2] as object)).to.be.false;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions, @typescript-eslint/no-explicit-any
      expect(isPlainObject(null as any)).to.be.false;
    });

    it('identifies numbers', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isNumber(42)).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isNumber('42')).to.be.false;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isNumber(NaN)).to.be.false;
    });

    it('identifies strings', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isString('hello')).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(isString(123)).to.be.false;
    });
  });

  describe('id generation', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).to.not.equal(id2);
    });

    it('generates IDs with consistent length', () => {
      const id = generateId();
      expect(id.length).to.be.greaterThan(0);
    });

    it('generates nanoid-compliant IDs', () => {
      const id = generateNanoId();
      expect(id).to.match(/^[a-zA-Z0-9_-]+$/);
    });
  });
});

// Helper functions for testing
function removeDuplicates<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function sortNumbers(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

function findMax(arr: number[]): number {
  return Math.max(...arr);
}

function findMin(arr: number[]): number {
  return Math.min(...arr);
}

function calculateAverage(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

function mergeObjects<T>(obj1: T, obj2: T): T {
  return { ...obj1, ...obj2 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickProperties<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

function omitProperties<T>(obj: T, keys: string[]): Partial<T> {
  const result = { ...obj };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keys.forEach(key => delete (result as any)[key]);
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isPast(date: Date): boolean {
  return date < new Date();
}

function isFuture(date: Date): boolean {
  return date > new Date();
}

function roundToDecimals(num: number, decimals: number): number {
  return Number(num.toFixed(decimals));
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function inRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((result, item) => {
    const groupKey = String(item[key]);
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  return [arr.filter(predicate), arr.filter(item => !predicate(item))];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDefined(value: any): boolean {
  return value !== null && value !== undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isEmpty(value: any): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  if (typeof value === 'string') return value.length === 0;
  return false;
}

function isInRange<T>(value: T, arr: T[]): boolean {
  return arr.includes(value);
}

function all<T>(arr: T[], predicate: (item: T) => boolean): boolean {
  return arr.every(predicate);
}

function any<T>(arr: T[], predicate: (item: T) => boolean): boolean {
  return arr.some(predicate);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isArray(value: any): boolean {
  return Array.isArray(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPlainObject(value: any): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isString(value: any): boolean {
  return typeof value === 'string';
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function generateNanoId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 21; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
