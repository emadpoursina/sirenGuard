const mediaWrap = document.getElementById('media-wrap');
const captionEl = document.getElementById('caption');
const fallbackEl = document.getElementById('fallback');
const countdownEl = document.getElementById('countdown');
const continueBtn = document.getElementById('continue-btn');

let countdownTimer = null;
let remainingSec = 0;
let mediaKind = 'none';
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
    mediaKind === 'video' ? minWatchMet || videoEnded : minWatchMet;
  continueBtn.disabled = !canContinue;
  continueBtn.hidden = !canContinue;
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
  mediaKind = 'none';
  videoEnded = false;

  if (!payload.mediaUrl) {
    fallbackEl.hidden = false;
    return;
  }

  if (payload.mediaType === 'video') {
    mediaKind = 'video';
    const video = document.createElement('video');
    video.src = payload.mediaUrl;
    video.autoplay = true;
    video.playsInline = true;
    video.addEventListener('loadeddata', () => {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    });
    video.addEventListener('ended', () => {
      videoEnded = true;
      updateContinueState();
    });
    video.addEventListener('error', () => {
      fallbackEl.hidden = false;
      videoEnded = true;
      updateContinueState();
    });
    mediaWrap.appendChild(video);
  } else {
    mediaKind = 'image';
    const img = document.createElement('img');
    img.src = payload.mediaUrl;
    img.alt = 'Reminder';
    img.addEventListener('error', () => {
      fallbackEl.hidden = false;
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
  continueBtn.hidden = true;
  captionEl.textContent = payload.caption || '';
  renderMedia(payload);
  startCountdown(Number(payload.minWatchSec) || 10);
});
