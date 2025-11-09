import React from 'react';
import './Modals.css';

const TimeLimitModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Time Limit Reached</h2>
        <p>{message}</p>
        <button onClick={onClose} className="btn btn-primary">
          OK
        </button>
      </div>
    </div>
  );
};

export default TimeLimitModal;