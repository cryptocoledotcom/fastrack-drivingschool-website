/**
 * A predefined list of security questions available to the user.
 */
export const predefinedQuestions = [
  "What was your first pet's name?",
  "What was the model of your first car?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What is the name of your favorite childhood friend?",
];

/**
 * Creates a blank security form with the first 3 predefined questions.
 * @returns {Array<object>} An array of objects, each with a 'question' and an empty 'answer'.
 */
export const createBlankSecurityForm = () => {
  return predefinedQuestions.slice(0, 3).map(q => ({ question: q, answer: '' }));
};