const mediaWrap = document.getElementById('media-wrap');
const captionEl = document.getElementById('caption');
const fallbackEl = document.getElementById('fallback');
const countdownEl = document.getElementById('countdown');
const continueBtn = document.getElementById('continue-btn');

let countdownTimer = null;
let remainingSec = 0;
let mediaReady = false;
let minWatchMet = false;
let videoEnded = false;
let completed = false;

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function updateContinueState() {
  const canContinue =
    minWatchMet && (videoEnded || !document.querySelector('video'));
  continueBtn.disabled = !canContinue;
  if (canContinue) {
    countdownEl.textContent = 'You can continue';
  }
}

function startCountdown(minWatchSec) {
  remainingSec = minWatchSec;
  countdownEl.textContent = `Wait ${remainingSec}s`;
  clearCountdown();
  countdownTimer = setInterval(() => {
    remainingSec -= 1;
    if (remainingSec > 0) {
      countdownEl.textContent = `Wait ${remainingSec}s`;
      return;
    }
    minWatchMet = true;
    clearCountdown();
    updateContinueState();
  }, 1000);
}

function finishOnce() {
  if (completed) {
    return;
  }
  completed = true;
  clearCountdown();
  window.reminderOverlay.complete();
}

function renderMedia(payload) {
  mediaWrap.innerHTML = '';
  mediaWrap.hidden = true;
  fallbackEl.hidden = true;
  mediaReady = false;
  videoEnded = false;

  if (!payload.mediaUrl) {
    fallbackEl.hidden = false;
    mediaReady = true;
    return;
  }

  if (payload.mediaType === 'video') {
    const video = document.createElement('video');
    video.src = payload.mediaUrl;
    video.autoplay = true;
    video.playsInline = true;
    video.addEventListener('loadeddata', () => {
      mediaReady = true;
    });
    video.addEventListener('ended', () => {
      videoEnded = true;
      updateContinueState();
    });
    video.addEventListener('error', () => {
      fallbackEl.hidden = false;
      mediaReady = true;
      videoEnded = true;
      updateContinueState();
    });
    mediaWrap.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = payload.mediaUrl;
    img.alt = 'Reminder';
    img.addEventListener('load', () => {
      mediaReady = true;
      videoEnded = true;
      updateContinueState();
    });
    img.addEventListener('error', () => {
      fallbackEl.hidden = false;
      mediaReady = true;
      videoEnded = true;
      updateContinueState();
    });
    mediaWrap.appendChild(img);
  }

  mediaWrap.hidden = false;
}

continueBtn.addEventListener('click', () => {
  if (!continueBtn.disabled) {
    finishOnce();
  }
});

window.reminderOverlay.onShow((payload) => {
  completed = false;
  minWatchMet = false;
  continueBtn.disabled = true;
  captionEl.textContent = payload.caption || '';
  renderMedia(payload);
  startCountdown(Number(payload.minWatchSec) || 10);
});
