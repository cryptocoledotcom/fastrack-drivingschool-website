import React from 'react';

const SecurityQuestionsEditForm = ({
  form,
  predefinedQuestions,
  onFormChange,
  onSave,
  onCancel,
  hasExistingQuestions,
}) => {
  return (
    <form className="auth-form" onSubmit={onSave}>
      <p>
        Please select and answer three security questions. These will be used to
        verify your identity during the course.
      </p>
      {form.map((item, index) => (
        <div key={index} style={{ marginBottom: '1rem' }}>
          <label htmlFor={`question-${index}`}>Question {index + 1}:</label>
          <select
            id={`question-${index}`}
            value={item.question}
            onChange={(e) => onFormChange(index, 'question', e.target.value)}
            required
          >
            {predefinedQuestions.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <label htmlFor={`answer-${index}`} className="sr-only">
            Answer {index + 1}
          </label>
          <input
            type="text"
            id={`answer-${index}`}
            placeholder="Your Answer"
            value={item.answer}
            onChange={(e) => onFormChange(index, 'answer', e.target.value)}
            required
            autoComplete="off"
          />
        </div>
      ))}
      <button type="submit" className="btn btn-secondary" style={{ marginRight: '1rem' }}>Save Questions</button>
      {hasExistingQuestions && (
        <button type="button" onClick={onCancel} className="btn">Cancel</button>
      )}
    </form>
  );
};

export default SecurityQuestionsEditForm;