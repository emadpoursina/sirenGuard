import { test, expect } from 'bun:test';
const { hostnameMatches } = require('../siren-guard-extension/hostname-match.js');

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
