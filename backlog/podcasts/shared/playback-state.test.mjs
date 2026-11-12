import test from 'node:test';
import assert from 'node:assert/strict';

class FakeStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }
}

const storage = new FakeStorage();
globalThis.localStorage = storage;

const {
  clearPlaybackProgress,
  getPlaybackPlayCount,
  getPlaybackProgressTime,
  hasEpisodeBeenHeard,
  readPlaybackProgress,
  savePlaybackProgress,
} = await import('./playback-state.js');

test('tracks play counts without exposing them in the UI state', () => {
  clearPlaybackProgress('ep-1');
  savePlaybackProgress('ep-1', 40);
  savePlaybackProgress('ep-1', 80, { incrementPlayCount: true, resetPosition: true });

  assert.equal(getPlaybackPlayCount('ep-1'), 1);
  assert.equal(getPlaybackProgressTime('ep-1'), 0);
  assert.equal(readPlaybackProgress('ep-1')?.time, 0);
  assert.equal(hasEpisodeBeenHeard('ep-1', 120), true);
});

test('keeps resume time for partially listened episodes that were heard before', () => {
  clearPlaybackProgress('ep-2');
  savePlaybackProgress('ep-2', 38);
  savePlaybackProgress('ep-2', 62, { incrementPlayCount: true, resetPosition: true });
  savePlaybackProgress('ep-2', 42);

  assert.equal(getPlaybackPlayCount('ep-2'), 1);
  assert.equal(getPlaybackProgressTime('ep-2'), 42);
  assert.equal(hasEpisodeBeenHeard('ep-2', 200), true);
  assert.equal(readPlaybackProgress('ep-2')?.time, 42);
});
