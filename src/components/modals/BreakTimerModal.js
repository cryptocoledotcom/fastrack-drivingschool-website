import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { formatTime } from '../../utils/formatTime';

const BREAK_DURATION_SECONDS = 10 * 60;

const BreakTimerModal = ({ isOpen, onResume, _test_isBreakOver = false }) => {
  const [countdown, setCountdown] = useState(BREAK_DURATION_SECONDS);
  const [isBreakOver, setIsBreakOver] = useState(_test_isBreakOver);

  useEffect(() => {
    // Only start the timer if the modal is open AND we are not forcing the "break over" state for a story.
    if (isOpen && !_test_isBreakOver) {
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
  }, [isOpen, _test_isBreakOver, isBreakOver]);

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
          <button 
            onClick={onResume} 
            className="btn btn-primary btn-resume"
          >
            Resume Course
          </button>
        </div>
      ) : (
        <div className="modal-timer">
          <p>
          Time Remaining: 
          <strong>{formatTime(countdown)}</strong>
          </p>
        </div>
      )}
    </Modal>
  );
};

export default BreakTimerModal;