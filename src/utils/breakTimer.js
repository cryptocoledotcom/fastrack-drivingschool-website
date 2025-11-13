const INSTRUCTIONAL_TIME_PER_BREAK = 120 * 60; // 120 minutes in seconds

class BreakTimer {
  constructor({ showBreakModal, hideBreakModal, onTick } = {}) {
    this.instructionalTime = 0; // Total accumulated instructional time in seconds
    this.timerId = null;
    this.onBreak = false;
    this.breaksTaken = 0;

    // UI callback functions
    this.showBreakModal = showBreakModal;
    this.hideBreakModal = hideBreakModal;
    this.onTick = onTick;
  }

  start() {
    if (this.timerId) return; // Prevent multiple timers
    this.timerId = setInterval(() => {
      if (!this.onBreak) {
        this.instructionalTime++;
        if (this.onTick) {
          this.onTick(this.instructionalTime);
        }
        this.checkForMandatoryBreak();
      }
    }, 1000);
  }

  stop() {
    clearInterval(this.timerId);
    this.timerId = null;
  }

  checkForMandatoryBreak() {
    const nextBreakTime = (this.breaksTaken + 1) * INSTRUCTIONAL_TIME_PER_BREAK;
    if (this.instructionalTime >= nextBreakTime) {
      this.triggerBreak();
    }
  }

  triggerBreak() {
    this.onBreak = true;
    this.showBreakModal();
  }

  endBreak() {
    this.onBreak = false;
    this.breaksTaken++;
    this.hideBreakModal();
  }

  getInstructionalTime() {
    return this.instructionalTime;
  }

  isOnBreak() {
    return this.onBreak;
  }
}

module.exports = { BreakTimer };