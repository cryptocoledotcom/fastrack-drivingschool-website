import React, { useState } from 'react';
import './IdentityVerificationModal.css';

export const IdentityVerificationModal = ({ isOpen, question, onSubmit, error, attemptsLeft }) => {
  const [answer, setAnswer] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(answer);
    setAnswer(''); // Clear the input after submission
  };

  const isLockedOut = attemptsLeft <= 0;

  return (
    <div className="identity-modal-overlay">
      <div className="identity-modal-content">
        <h2>Identity Verification</h2>
        <p>To continue, please answer the following security question:</p>
        <p className="identity-modal-question">{question}</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="security-answer">Your Answer</label>
            <input
              id="security-answer"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              autoComplete="off"
              disabled={isLockedOut}
              required
            />
          </div>

          {error && <p className="identity-modal-error">{error}</p>}
          
          {!isLockedOut && attemptsLeft < 3 && <p className="identity-modal-attempts">Attempts remaining: {attemptsLeft}</p>}

          <button type="submit" className="btn btn-primary" disabled={isLockedOut}>
            Submit Answer
          </button>
        </form>
      </div>
    </div>
  );
};