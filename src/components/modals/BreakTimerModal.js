import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { formatTime } from '../../utils/formatTime';
import './Modals.css';

const BREAK_DURATION_SECONDS = 10 * 60;

const BreakTimerModal = ({ isOpen, onResume }) => {
  const [countdown, setCountdown] = useState(BREAK_DURATION_SECONDS);
  const [isBreakOver, setIsBreakOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset countdown when modal opens
      setCountdown(BREAK_DURATION_SECONDS);
      setIsBreakOver(false);

      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsBreakOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Cleanup interval on component unmount or when modal closes
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      className="modal-content break-timer-modal-content"
      overlayClassName="modal-overlay"
      contentLabel="Mandatory Break"
      ariaHideApp={false}
      shouldCloseOnOverlayClick={false} // Prevent closing by clicking outside
    >
      <h2>Mandatory 10-Minute Break</h2>
      <p>You have reached a 2-hour instructional time block. Please take your mandatory break.</p>
      {isBreakOver ? (
        <div className="break-over-actions">
          <p>Your break is over. You may now resume the course.</p>
          <button onClick={onResume} className="btn btn-primary">Resume Course</button>
        </div>
      ) : (
        <p className="modal-timer">Time Remaining: <strong>{formatTime(countdown)}</strong></p>
      )}
    </Modal>
  );
};

export default BreakTimerModal;