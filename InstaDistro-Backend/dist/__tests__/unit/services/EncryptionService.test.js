"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EncryptionService_1 = require("../../../services/auth/EncryptionService");
describe('EncryptionService', () => {
    describe('encrypt', () => {
        it('should encrypt a plain text password', () => {
            const plaintext = 'mySecurePassword123';
            const encrypted = EncryptionService_1.encryptionService.encrypt(plaintext);
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(plaintext);
            expect(encrypted.length).toBeGreaterThan(0);
            expect(encrypted).toContain(':'); // IV separator
        });
        it('should produce different ciphertext for same input (random IV)', () => {
            const plaintext = 'samePassword';
            const encrypted1 = EncryptionService_1.encryptionService.encrypt(plaintext);
            const encrypted2 = EncryptionService_1.encryptionService.encrypt(plaintext);
            expect(encrypted1).not.toBe(encrypted2);
        });
        it('should handle empty strings', () => {
            const encrypted = EncryptionService_1.encryptionService.encrypt('');
            expect(encrypted).toBeDefined();
            expect(encrypted.length).toBeGreaterThan(0);
        });
        it('should handle special characters', () => {
            const specialChars = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
            const encrypted = EncryptionService_1.encryptionService.encrypt(specialChars);
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(specialChars);
        });
        it('should handle unicode characters', () => {
            const unicode = '密码🔒パスワード';
            const encrypted = EncryptionService_1.encryptionService.encrypt(unicode);
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(unicode);
        });
    });
    describe('decrypt', () => {
        it('should decrypt encrypted text back to original', () => {
            const plaintext = 'mySecurePassword123';
            const encrypted = EncryptionService_1.encryptionService.encrypt(plaintext);
            const decrypted = EncryptionService_1.encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should handle empty string encryption/decryption', () => {
            const plaintext = '';
            const encrypted = EncryptionService_1.encryptionService.encrypt(plaintext);
            const decrypted = EncryptionService_1.encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should handle special characters roundtrip', () => {
            const plaintext = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
            const encrypted = EncryptionService_1.encryptionService.encrypt(plaintext);
            const decrypted = EncryptionService_1.encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should handle unicode characters roundtrip', () => {
            const plaintext = '密码🔒パスワード';
            const encrypted = EncryptionService_1.encryptionService.encrypt(plaintext);
            const decrypted = EncryptionService_1.encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
        it('should throw error for invalid ciphertext format', () => {
            expect(() => {
                EncryptionService_1.encryptionService.decrypt('invalid-ciphertext');
            }).toThrow();
        });
        it('should throw error for tampered ciphertext', () => {
            const plaintext = 'password';
            const encrypted = EncryptionService_1.encryptionService.encrypt(plaintext);
            const tampered = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';
            expect(() => {
                EncryptionService_1.encryptionService.decrypt(tampered);
            }).toThrow();
        });
    });
    describe('encrypt/decrypt roundtrip', () => {
        const testCases = [
            'simple',
            'with spaces and numbers 123',
            'VeryLongPasswordWithManyCharacters1234567890!@#$%^&*()',
            '密码',
            '🔒🔐🗝️',
            '\n\t\r',
            '{"json": "value"}',
            'a'.repeat(1000), // Long string
        ];
        testCases.forEach((testCase) => {
            it(`should handle roundtrip for: "${testCase.substring(0, 50)}..."`, () => {
                const encrypted = EncryptionService_1.encryptionService.encrypt(testCase);
                const decrypted = EncryptionService_1.encryptionService.decrypt(encrypted);
                expect(decrypted).toBe(testCase);
            });
        });
    });
});
