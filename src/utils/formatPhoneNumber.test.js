import formatPhoneNumber from './formatPhoneNumber';

describe('formatPhoneNumber', () => {
  it('should format a 10-digit number correctly', () => {
    expect(formatPhoneNumber('4129748858')).toBe('(412) 974-8858');
  });

  it('should handle a number with a country code', () => {
    expect(formatPhoneNumber('14129748858')).toBe('+1 (412) 974-8858');
  });

  it('should strip non-numeric characters', () => {
    expect(formatPhoneNumber('(412) 974-8858')).toBe('(412) 974-8858');
    expect(formatPhoneNumber('412-974-8858')).toBe('(412) 974-8858');
  });

  it('should return null for an incomplete number', () => {
    expect(formatPhoneNumber('412974')).toBeNull();
  });

  it('should return null for a number that is too long', () => {
    expect(formatPhoneNumber('123456789012')).toBeNull();
  });

  it('should return null for non-numeric input', () => {
    expect(formatPhoneNumber('abcdefghij')).toBeNull();
  });
});