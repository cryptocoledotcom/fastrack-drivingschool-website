import React from 'react';

const SecurityQuestionsDisplay = ({ questions, onEdit }) => {
  return (
    <div>
      {/* Display only the question text, not the encrypted answer */}
      <ul>
        {questions.map((q, index) => (
          <li key={index}><em>{q.question}</em></li>
        ))}
      </ul>
      <button onClick={onEdit} className="btn btn-secondary">
        Edit Security Questions
      </button>
    </div>
  );
};

export default SecurityQuestionsDisplay;