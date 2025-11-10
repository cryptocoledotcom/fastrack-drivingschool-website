import { createBlankSecurityForm, predefinedQuestions } from './securityUtils';

describe('createBlankSecurityForm', () => {
  it('should return an array with 3 items', () => {
    const form = createBlankSecurityForm();
    expect(form).toBeInstanceOf(Array);
    expect(form.length).toBe(3);
  });

  it('should return items with the correct structure', () => {
    const form = createBlankSecurityForm();
    form.forEach(item => {
      expect(item).toHaveProperty('question');
      expect(item).toHaveProperty('answer', '');
    });
  });

  it('should use the first three predefined questions', () => {
    const form = createBlankSecurityForm();
    expect(form[0].question).toBe(predefinedQuestions[0]);
    expect(form[1].question).toBe(predefinedQuestions[1]);
    expect(form[2].question).toBe(predefinedQuestions[2]);
  });
});