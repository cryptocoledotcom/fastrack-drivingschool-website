import { isUserAdmin } from './authUtils';

describe('isUserAdmin', () => {
  it('should return true for the admin user', () => {
    const adminUser = { uid: 'tkr4zpyuDbYrkAlYvJ9OCXDIVr52' };
    expect(isUserAdmin(adminUser)).toBe(true);
  });

  it('should return false for a non-admin user', () => {
    const regularUser = { uid: 'some-other-user-id' };
    expect(isUserAdmin(regularUser)).toBe(false);
  });

  it('should return false for a null user object', () => {
    expect(isUserAdmin(null)).toBe(false);
  });

  it('should return false for an undefined user object', () => {
    expect(isUserAdmin(undefined)).toBe(false);
  });

  it('should return false for a user object without a uid', () => {
    const userWithoutUid = { email: 'test@test.com' };
    expect(isUserAdmin(userWithoutUid)).toBe(false);
  });
});