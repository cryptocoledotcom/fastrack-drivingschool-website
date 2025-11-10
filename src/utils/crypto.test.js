import { encrypt, decrypt } from './crypto';

describe('Encryption and Decryption', () => {
  // Test case 1: Basic encryption and decryption
  it('should encrypt and then decrypt back to the original string', () => {
    const originalText = 'This is a secret message.';
    const encryptedText = encrypt(originalText);
    const decryptedText = decrypt(encryptedText);

    expect(encryptedText).not.toBe(originalText); // Encrypted text should be different
    expect(decryptedText).toBe(originalText); // Decrypted text should match original
  });

  // Test case 2: Handling empty string
  it('should return null when encrypting an empty string', () => {
    expect(encrypt('')).toBeNull();
  });

  it('should return null when decrypting an empty string', () => {
    expect(decrypt('')).toBeNull();
  });

  // Test case 3: Handling null/undefined input
  it('should return null for null or undefined input during encryption or decryption', () => {
    expect(encrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeNull();
  });
});