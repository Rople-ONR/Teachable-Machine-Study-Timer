class StudyTimer {
  constructor() {
    this.elapsedMs = 0;
    this.running = false;
    this.startedAt = 0;
  }

  start(nowMs) {
    if (this.running) {
      return;
    }

    this.running = true;
    this.startedAt = nowMs - this.elapsedMs;
  }

  restart(nowMs) {
    this.elapsedMs = 0;
    this.running = true;
    this.startedAt = nowMs;
  }

  stop(nowMs) {
    if (!this.running) {
      return;
    }

    this.elapsedMs = nowMs - this.startedAt;
    this.running = false;
  }

  reset() {
    this.elapsedMs = 0;
    this.running = false;
    this.startedAt = 0;
  }

  getElapsed(nowMs) {
    if (this.running) {
      return Math.max(0, nowMs - this.startedAt);
    }

    return Math.max(0, this.elapsedMs);
  }

  getParts(nowMs) {
    const totalSeconds = Math.floor(this.getElapsed(nowMs) / 1000);

    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      totalSeconds,
    };
  }
}
