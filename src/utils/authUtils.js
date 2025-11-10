/**
 * The hardcoded UID for the admin user.
 * TODO: This should be replaced with a more robust role-based system.
 */
const ADMIN_UID = 'tkr4zpyuDbYrkAlYvJ9OCXDIVr52';

/**
 * Checks if a given user object corresponds to an admin user.
 * @param {object|null|undefined} user - The user object from Firebase Auth.
 * @returns {boolean} True if the user is an admin, false otherwise.
 */
export const isUserAdmin = (user) => {
  return !!user && user.uid === ADMIN_UID;
};