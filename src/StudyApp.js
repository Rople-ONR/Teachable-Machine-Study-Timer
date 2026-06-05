class StudyApp {
  constructor() {
    this.studyTimer = new StudyTimer();
    this.restTimer = new StudyTimer();
    this.mode = "waiting";
    this.latestLabel = "waiting";
    this.latestConfidence = 0;
    this.stableLabel = "";
    this.pendingLabel = "";
    this.pendingCount = 0;
    this.requiredStableFrames = 3;
    this.minimumConfidence = 0.55;
    this.phoneWarningStartedAt = null;
    this.lastClockParts = { hours: -1, minutes: -1, seconds: -1 };
    this.flipStartedAt = { hours: -1000, minutes: -1000, seconds: -1000 };
    this.flipDuration = 720;
    this.cameraWidth = 320;
    this.cameraHeight = 240;
  }

  updateClassification(results, nowMs) {
    if (!results || !results[0]) {
      return;
    }

    const top = results[0];
    this.latestLabel = top.label;
    this.latestConfidence = top.confidence || 0;

    if (this.latestConfidence < this.minimumConfidence) {
      return;
    }

    if (this.pendingLabel !== this.latestLabel) {
      this.pendingLabel = this.latestLabel;
      this.pendingCount = 1;
      return;
    }

    this.pendingCount += 1;
    if (this.pendingCount < this.requiredStableFrames || this.stableLabel === this.latestLabel) {
      return;
    }

    this.stableLabel = this.latestLabel;
    this.applyAction(this.getActionForClass(this.stableLabel), nowMs);
  }

  update(nowMs) {
    if (this.mode === "phoneWarning" && this.phoneWarningStartedAt !== null) {
      if (nowMs - this.phoneWarningStartedAt >= 5000) {
        this.enterRest(nowMs);
      }
    }
  }

  getActionForClass(className) {
    if (className === "studying") {
      return "studyStart";
    }

    if (className === "note_with_pen") {
      return "studyKeep";
    }

    if (className === "phone") {
      return "warning";
    }

    if (className === "close_note" || className === "desk" || className === "sleeping") {
      return "rest";
    }

    return "unknown";
  }

  applyAction(action, nowMs) {
    if (this.mode === "waiting") {
      if (action === "studyStart") {
        this.enterStudy(nowMs, true);
      }
      return;
    }

    if (this.mode === "rest") {
      if (action === "studyStart") {
        this.enterStudy(nowMs, true);
      }
      return;
    }

    if (this.mode === "study" || this.mode === "phoneWarning") {
      if (action === "studyStart" || action === "studyKeep") {
        if (this.mode === "phoneWarning") {
          this.mode = "study";
          this.phoneWarningStartedAt = null;
        }
        return;
      }

      if (action === "rest") {
        this.enterRest(nowMs);
        return;
      }

      if (action === "warning" && this.mode !== "phoneWarning") {
        this.mode = "phoneWarning";
        this.phoneWarningStartedAt = nowMs;
      }
    }
  }

  enterStudy(nowMs, resetTimer) {
    this.mode = "study";
    this.phoneWarningStartedAt = null;
    this.restTimer.reset();

    if (resetTimer) {
      this.studyTimer.restart(nowMs);
    } else {
      this.studyTimer.start(nowMs);
    }
  }

  enterRest(nowMs) {
    this.studyTimer.stop(nowMs);
    this.restTimer.restart(nowMs);
    this.mode = "rest";
    this.phoneWarningStartedAt = null;
  }

  draw(video) {
    const nowMs = millis();
    this.update(nowMs);

    this.drawCafeBackground(false);

    if (this.mode === "waiting") {
      this.drawWaitingScreen();
    } else if (this.mode === "study" || this.mode === "phoneWarning") {
      this.drawStudyScreen(nowMs);
      if (this.mode === "phoneWarning") {
        this.drawPhoneWarning(nowMs);
      }
    } else if (this.mode === "rest") {
      this.drawRestScreen(nowMs);
    }

    this.drawCamera(video);
    this.drawActionBadge();
  }

  drawCafeBackground(blurred) {
    push();
    if (blurred) {
      drawingContext.filter = "blur(8px)";
    }

    noStroke();
    background(19, 54, 40);

    for (let y = 0; y < height; y += 3) {
      const t = y / Math.max(1, height);
      fill(lerp(30, 12, t), lerp(88, 42, t), lerp(62, 38, t));
      rect(0, y, width, 3);
    }

    fill(212, 235, 172, 34);
    ellipse(width * 0.18, height * 0.1, width * 0.55, height * 0.45);
    fill(92, 151, 95, 42);
    ellipse(width * 0.78, height * 0.18, width * 0.5, height * 0.42);

    this.drawWindowLight();
    this.drawPlants();
    this.drawCafeLights();

    drawingContext.filter = "none";
    pop();
  }

  drawWindowLight() {
    push();
    noStroke();
    for (let i = 0; i < 7; i += 1) {
      fill(240, 255, 206, 14 - i);
      quad(
        width * 0.08 + i * 12,
        0,
        width * 0.5 + i * 22,
        0,
        width * 0.84 + i * 34,
        height,
        width * 0.42 + i * 18,
        height
      );
    }

    stroke(218, 234, 186, 58);
    strokeWeight(2);
    line(width * 0.11, 0, width * 0.11, height * 0.55);
    line(width * 0.27, 0, width * 0.27, height * 0.48);
    line(width * 0.05, height * 0.18, width * 0.36, height * 0.18);
    pop();
  }

  drawPlants() {
    push();
    noStroke();
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 83) % width;
      const baseY = height - 40 - (i % 4) * 22;
      const leafCount = 5 + (i % 4);
      fill(20, 78 + (i % 3) * 20, 45, 145);
      for (let j = 0; j < leafCount; j += 1) {
        const angle = -PI / 2 + map(j, 0, leafCount - 1, -0.8, 0.8);
        push();
        translate(x + j * 6, baseY);
        rotate(angle);
        ellipse(0, -26 - j * 2, 18, 58);
        pop();
      }
    }
    pop();
  }

  drawCafeLights() {
    push();
    noStroke();
    for (let i = 0; i < 5; i += 1) {
      const x = width * (0.18 + i * 0.18);
      const y = 38 + (i % 2) * 22;
      stroke(68, 55, 38, 120);
      strokeWeight(2);
      line(x, 0, x, y);
      noStroke();
      fill(245, 216, 132, 42);
      ellipse(x, y + 18, 92, 92);
      fill(255, 222, 137, 178);
      ellipse(x, y + 18, 26, 26);
    }
    pop();
  }

  drawWaitingScreen() {
    push();
    fill(244, 252, 230);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(this.responsiveText(42, 64));
    text("\uC88B\uC740 \uACF5\uBD80 \uC2DC\uAC04\uC774\uC5D0\uC694", width / 2, height * 0.33);

    textStyle(NORMAL);
    textSize(22);
    fill(217, 233, 194);
    text("\uB3D9\uC791\uC774 \uAC10\uC9C0\uB418\uBA74 \uD0C0\uC774\uBA38\uAC00 \uC2DC\uC791\uB429\uB2C8\uB2E4", width / 2, height * 0.43);

    textSize(this.responsiveText(44, 72));
    fill(255, 242, 190);
    const now = new Date();
    text(this.formatClock(now), width / 2, height * 0.55);

    textStyle(BOLD);
    textSize(20);
    fill(221, 238, 202);
    text(this.formatDate(now), width / 2, height * 0.63);
    pop();
  }

  drawStudyScreen(nowMs) {
    push();
    const parts = this.studyTimer.getParts(nowMs);
    this.updateFlipTriggers(parts, nowMs);

    fill(232, 245, 218);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(22);
    text("STUDY TIMER", width / 2, height * 0.18);

    const cardW = constrain(width * 0.22, 145, 220);
    const cardH = constrain(height * 0.24, 130, 190);
    const gap = constrain(width * 0.035, 26, 46);
    const centerY = height * 0.51;
    const startX = width / 2 - cardW - gap;

    this.drawFlipCard(startX, centerY, cardW, cardH, parts.hours, "\uC2DC", "hours", nowMs);
    this.drawColon(startX + cardW / 2 + gap / 2, centerY);
    this.drawFlipCard(width / 2, centerY, cardW, cardH, parts.minutes, "\uBD84", "minutes", nowMs);
    this.drawColon(width / 2 + cardW / 2 + gap / 2, centerY);
    this.drawFlipCard(width / 2 + cardW + gap, centerY, cardW, cardH, parts.seconds, "\uCD08", "seconds", nowMs);
    pop();
  }

  updateFlipTriggers(parts, nowMs) {
    ["hours", "minutes", "seconds"].forEach((partName) => {
      if (this.lastClockParts[partName] !== parts[partName]) {
        this.flipStartedAt[partName] = nowMs;
        this.lastClockParts[partName] = parts[partName];
      }
    });
  }

  drawFlipCard(cx, cy, w, h, value, unit, partName, nowMs) {
    const progress = constrain((nowMs - this.flipStartedAt[partName]) / this.flipDuration, 0, 1);
    const eased = 1 - pow(1 - progress, 3);
    const foldScale = abs(cos(eased * PI));
    const isFoldingDown = eased < 0.5;
    const valueText = nf(value, 2);

    push();
    rectMode(CENTER);
    noStroke();
    fill(0, 0, 0, 70);
    rect(cx + 8, cy + 12, w, h, 8);

    fill(26, 34, 30);
    rect(cx, cy, w, h, 8);
    fill(38, 50, 44);
    rect(cx, cy - h * 0.25, w, h * 0.5, 8, 8, 0, 0);
    fill(20, 27, 25);
    rect(cx, cy + h * 0.25, w, h * 0.5, 0, 0, 8, 8);

    stroke(120, 137, 110, 95);
    strokeWeight(2);
    line(cx - w * 0.46, cy, cx + w * 0.46, cy);
    noStroke();

    this.drawCardNumber(cx, cy, valueText, w);

    if (progress < 1) {
      const panelY = isFoldingDown ? cy - h * 0.25 : cy + h * 0.25;
      const shade = isFoldingDown ? 58 : 22;
      fill(255, 255, 255, shade);
      rect(cx, panelY, w, h * 0.5 * max(0.08, foldScale), 8);
      fill(0, 0, 0, 70 * (1 - foldScale));
      rect(cx, panelY, w, h * 0.5 * max(0.08, foldScale), 8);
    }

    fill(225, 241, 210);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(18);
    text(unit, cx, cy + h * 0.68);
    pop();
  }

  drawCardNumber(cx, cy, valueText, w) {
    push();
    fill(244, 250, 230);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(constrain(w * 0.48, 58, 94));
    text(valueText, cx, cy - 4);
    pop();
  }

  drawColon(x, y) {
    push();
    noStroke();
    fill(234, 245, 218);
    ellipse(x, y - 22, 10, 10);
    ellipse(x, y + 22, 10, 10);
    pop();
  }

  drawRestScreen(nowMs) {
    this.drawCafeBackground(true);
    const parts = this.restTimer.getParts(nowMs);

    push();
    fill(8, 18, 14, 120);
    rect(0, 0, width, height);

    textAlign(CENTER, CENTER);
    fill(245, 252, 232);
    textStyle(BOLD);
    textSize(this.responsiveText(46, 72));
    const now = new Date();
    text(this.formatClock(now), width / 2, height * 0.33);

    textSize(20);
    fill(221, 238, 202);
    text(this.formatDate(now), width / 2, height * 0.42);

    textSize(22);
    fill(218, 236, 199);
    text("\uD734\uC2DD \uC2DC\uAC04", width / 2, height * 0.52);

    textStyle(BOLD);
    textSize(this.responsiveText(38, 58));
    fill(255, 232, 156);
    text(`${nf(parts.hours, 2)}:${nf(parts.minutes, 2)}:${nf(parts.seconds, 2)}`, width / 2, height * 0.61);
    pop();
  }

  drawPhoneWarning(nowMs) {
    const elapsed = nowMs - this.phoneWarningStartedAt;
    const remaining = max(0, ceil((5000 - elapsed) / 1000));
    const progress = constrain(elapsed / 5000, 0, 1);
    const dialogW = constrain(width * 0.42, 380, 540);
    const dialogH = 220;
    const x = width / 2 - dialogW / 2;
    const y = height / 2 - dialogH / 2;

    push();
    noStroke();
    fill(0, 0, 0, 92);
    rect(0, 0, width, height);

    fill(0, 0, 0, 76);
    rect(x + 10, y + 12, dialogW, dialogH, 3);

    fill(242, 242, 242);
    stroke(98, 98, 98);
    strokeWeight(1);
    rect(x, y, dialogW, dialogH, 3);

    noStroke();
    fill(20, 84, 164);
    rect(x + 1, y + 1, dialogW - 2, 34, 2, 2, 0, 0);

    fill(255);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(15);
    text("\uC2A4\uD130\uB514 \uD0C0\uC774\uBA38", x + 14, y + 18);

    fill(231, 231, 231);
    stroke(110);
    rect(x + dialogW - 31, y + 7, 22, 20, 2);
    stroke(38);
    strokeWeight(2);
    line(x + dialogW - 25, y + 12, x + dialogW - 15, y + 22);
    line(x + dialogW - 15, y + 12, x + dialogW - 25, y + 22);

    noStroke();
    fill(255, 196, 66);
    triangle(x + 56, y + 74, x + 28, y + 126, x + 84, y + 126);
    fill(56, 44, 18);
    rect(x + 53, y + 89, 6, 22, 2);
    ellipse(x + 56, y + 118, 6, 6);

    fill(26, 26, 26);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(18);
    text("\uD734\uB300\uD3F0 \uC0AC\uC6A9\uC774 \uAC10\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", x + 106, y + 70);

    textStyle(NORMAL);
    textSize(14);
    fill(68, 68, 68);
    text(`${remaining}\uCD08 \uD6C4 \uD734\uC2DD \uBAA8\uB4DC\uB85C \uC804\uD658\uB429\uB2C8\uB2E4.`, x + 106, y + 103);

    fill(216);
    rect(x + 106, y + 138, dialogW - 146, 12, 2);
    fill(20, 84, 164);
    rect(x + 106, y + 138, (dialogW - 146) * progress, 12, 2);

    fill(235);
    stroke(130);
    rect(x + dialogW - 108, y + dialogH - 48, 78, 28, 2);
    noStroke();
    fill(42);
    textAlign(CENTER, CENTER);
    textSize(13);
    text("OK", x + dialogW - 69, y + dialogH - 34);
    pop();
  }

  drawCamera(video) {
    if (!video) {
      return;
    }

    const x = 16;
    const y = height - this.cameraHeight - 16;

    push();
    noStroke();
    fill(0, 0, 0, 120);
    rect(x - 6, y - 6, this.cameraWidth + 12, this.cameraHeight + 12, 8);
    image(video, x, y, this.cameraWidth, this.cameraHeight);
    noFill();
    stroke(237, 249, 221);
    strokeWeight(2);
    rect(x, y, this.cameraWidth, this.cameraHeight, 4);
    pop();
  }

  drawActionBadge() {
    push();
    const statusText = this.getModeLabel();
    textSize(14);
    textStyle(BOLD);
    const chipW = max(168, textWidth(statusText) + 28);
    const x = 18;
    const y = max(18, height - this.cameraHeight - 54);

    noStroke();
    fill(12, 26, 20, 178);
    rect(x, y, chipW, 32, 16);
    fill(235, 246, 218);
    textAlign(LEFT, CENTER);
    text(statusText, x + 14, y + 16);
    pop();
  }

  getModeLabel() {
    if (this.mode === "study") {
      return "\uACF5\uBD80 \uC911";
    }

    if (this.mode === "phoneWarning") {
      return "\uD734\uB300\uD3F0 \uACBD\uACE0";
    }

    if (this.mode === "rest") {
      return "\uD734\uC2DD \uC911";
    }

    return "\uB3D9\uC791 \uAC10\uC9C0 \uC911";
  }

  formatClock(date) {
    return `${nf(date.getHours(), 2)}:${nf(date.getMinutes(), 2)}:${nf(date.getSeconds(), 2)}`;
  }

  formatDate(date) {
    const weekdays = [
      "\uC77C\uC694\uC77C",
      "\uC6D4\uC694\uC77C",
      "\uD654\uC694\uC77C",
      "\uC218\uC694\uC77C",
      "\uBAA9\uC694\uC77C",
      "\uAE08\uC694\uC77C",
      "\uD1A0\uC694\uC77C",
    ];

    return `${date.getFullYear()}\uB144 ${nf(date.getMonth() + 1, 2)}\uC6D4 ${nf(date.getDate(), 2)}\uC77C ${weekdays[date.getDay()]}`;
  }

  responsiveText(minSize, maxSize) {
    return constrain(width * 0.055, minSize, maxSize);
  }
}
