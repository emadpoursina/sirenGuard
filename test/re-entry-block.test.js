import { test, expect } from 'bun:test';
import {
  createReEntryBlockRegistry,
  appIdentityKey,
  hostnameKey,
} from '../re-entry-block.js';

test('appIdentityKey prefers bundle id', () => {
  expect(appIdentityKey({ name: 'Safari', bundleId: 'com.apple.Safari' })).toBe(
    'bundle:com.apple.Safari',
  );
});

test('block registry expires entries', () => {
  const registry = createReEntryBlockRegistry(60);
  registry.add('site:example.com', 1000);
  expect(registry.isBlocked('site:example.com', 1000)).toBe(true);
  expect(registry.isBlocked('site:example.com', 61001)).toBe(false);
});

test('block registry finds the first matching key', () => {
  const registry = createReEntryBlockRegistry(60);
  registry.add('example.com', 1000);
  registry.add('youtube.com/shorts', 1000);
  expect(registry.find((key) => key.includes('shorts'), 1000)).toBe(
    'youtube.com/shorts',
  );
  expect(registry.find((key) => key.includes('shorts'), 61001)).toBe(null);
});

test('hostnameKey normalizes case', () => {
  expect(hostnameKey('Example.COM')).toBe('example.com');
});
