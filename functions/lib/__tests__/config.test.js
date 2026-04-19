import { db, rtdb, auth, storage } from '../config.js';
describe('Firebase Config', () => {
    test('should export db instance', () => {
        expect(db).toBeDefined();
    });
    test('should export rtdb instance', () => {
        expect(rtdb).toBeDefined();
    });
    test('should export auth instance', () => {
        expect(auth).toBeDefined();
    });
    test('should export storage instance', () => {
        expect(storage).toBeDefined();
    });
});
