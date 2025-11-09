import CryptoJS from 'crypto-js';

// IMPORTANT: This key should be stored securely and not hardcoded.
// For this example, we'll use a hardcoded key, but in a real app,
// this should come from a secure environment variable.
const SECRET_KEY = 'your-super-secret-key-that-is-long-and-random';

export const encrypt = (text) => {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails, it can return an empty string. Treat this as a failure.
    if (!decryptedText) {
      return null;
    }
    return decryptedText;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null; // Return null or an empty string if decryption fails
  }
};