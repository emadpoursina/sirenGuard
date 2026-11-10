import { test, expect } from 'bun:test';
const {
  hostnameMatches,
  normalizeWebsiteTarget,
  urlMatchesTarget,
  findMatchingTarget,
} = require('../siren-guard-extension/hostname-match.js');

test('*.example.com matches apex and subdomains', () => {
  expect(hostnameMatches('example.com', '*.example.com')).toBe(true);
  expect(hostnameMatches('www.example.com', '*.example.com')).toBe(true);
  expect(hostnameMatches('music.example.com', '*.example.com')).toBe(true);
});

test('*.example.com does not match other domains', () => {
  expect(hostnameMatches('notexample.com', '*.example.com')).toBe(false);
  expect(hostnameMatches('example.org', '*.example.com')).toBe(false);
});

test('explicit hostname matches apex and www', () => {
  expect(hostnameMatches('instagram.com', 'instagram.com')).toBe(true);
  expect(hostnameMatches('www.instagram.com', 'instagram.com')).toBe(true);
});

test('*.youtube.com matches common YouTube hostnames', () => {
  expect(hostnameMatches('youtube.com', '*.youtube.com')).toBe(true);
  expect(hostnameMatches('www.youtube.com', '*.youtube.com')).toBe(true);
  expect(hostnameMatches('music.youtube.com', '*.youtube.com')).toBe(true);
});

test('hostname patterns ignore the path portion of a target', () => {
  expect(hostnameMatches('www.youtube.com', 'youtube.com/shorts')).toBe(true);
  expect(hostnameMatches('m.youtube.com', '*.youtube.com/shorts')).toBe(true);
  expect(hostnameMatches('vimeo.com', 'youtube.com/shorts')).toBe(false);
});

test('hostname-only targets match every path', () => {
  expect(urlMatchesTarget('https://youtube.com/watch?v=1', 'youtube.com')).toBe(
    true
  );
  expect(
    urlMatchesTarget('https://www.youtube.com/shorts/abc', 'youtube.com')
  ).toBe(true);
});

test('path targets match the path and anything under it', () => {
  const target = 'youtube.com/shorts';
  expect(urlMatchesTarget('https://youtube.com/shorts', target)).toBe(true);
  expect(urlMatchesTarget('https://youtube.com/shorts/abc', target)).toBe(true);
  expect(
    urlMatchesTarget('https://youtube.com/shorts/?feature=share', target)
  ).toBe(true);
  expect(urlMatchesTarget('https://youtube.com/watch', target)).toBe(false);
  expect(urlMatchesTarget('https://youtube.com/shorts-archive', target)).toBe(
    false
  );
});

test('path targets work with wildcard subdomains', () => {
  const target = '*.youtube.com/shorts';
  expect(urlMatchesTarget('https://youtube.com/shorts/abc', target)).toBe(true);
  expect(urlMatchesTarget('https://m.youtube.com/shorts/abc', target)).toBe(
    true
  );
  expect(urlMatchesTarget('https://youtube.com/watch', target)).toBe(false);
});

test('leading-star shorthand works like a subdomain wildcard', () => {
  const target = '*youtube.com/shorts';
  expect(urlMatchesTarget('https://www.youtube.com/shorts/abc', target)).toBe(
    true
  );
  expect(urlMatchesTarget('https://youtube.com/shorts/abc', target)).toBe(true);
  expect(urlMatchesTarget('https://youtube.com/watch', target)).toBe(false);
});

test('path wildcards match any suffix', () => {
  const target = 'youtube.com/shorts*';
  expect(urlMatchesTarget('https://youtube.com/shorts', target)).toBe(true);
  expect(urlMatchesTarget('https://youtube.com/shorts/abc', target)).toBe(true);
  expect(urlMatchesTarget('https://youtube.com/watch', target)).toBe(false);
});

test('normalizeWebsiteTarget strips scheme, www, query and trailing slash', () => {
  expect(
    normalizeWebsiteTarget('https://www.YouTube.com/shorts/?feature=share')
  ).toBe('youtube.com/shorts');
  expect(normalizeWebsiteTarget('*.youtube.com')).toBe('*.youtube.com');
  expect(normalizeWebsiteTarget('*youtube.com/shorts')).toBe(
    '*youtube.com/shorts'
  );
  expect(normalizeWebsiteTarget('not a site')).toBe(null);
});

test('findMatchingTarget returns the first configured target that matches', () => {
  const targets = ['youtube.com/shorts', 'youtube.com'];
  expect(findMatchingTarget('https://youtube.com/shorts/abc', targets)).toBe(
    'youtube.com/shorts'
  );
  expect(findMatchingTarget('https://youtube.com/watch', targets)).toBe(
    'youtube.com'
  );
  expect(findMatchingTarget('https://vimeo.com', targets)).toBe(null);
});
