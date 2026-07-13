import { test, expect } from 'bun:test';

function canContinue({ mediaKind, minWatchMet, videoEnded }) {
  return mediaKind === 'video' ? minWatchMet || videoEnded : minWatchMet;
}

test('video allows continue after min watch or when clip ends', () => {
  expect(
    canContinue({ mediaKind: 'video', minWatchMet: false, videoEnded: false }),
  ).toBe(false);
  expect(
    canContinue({ mediaKind: 'video', minWatchMet: true, videoEnded: false }),
  ).toBe(true);
  expect(
    canContinue({ mediaKind: 'video', minWatchMet: false, videoEnded: true }),
  ).toBe(true);
});

test('image requires min watch before continue', () => {
  expect(
    canContinue({ mediaKind: 'image', minWatchMet: false, videoEnded: true }),
  ).toBe(false);
  expect(
    canContinue({ mediaKind: 'image', minWatchMet: true, videoEnded: true }),
  ).toBe(true);
});

test('fallback media still requires min watch', () => {
  expect(
    canContinue({ mediaKind: 'none', minWatchMet: false, videoEnded: false }),
  ).toBe(false);
  expect(
    canContinue({ mediaKind: 'none', minWatchMet: true, videoEnded: false }),
  ).toBe(true);
});
