import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTrackingTime, verifiedEndpoint, orderedPublicEvents } from '../src/utils/trackingPublic.js';

test('route endpoints require supplied bounded coordinates, never a name-based guess', () => {
  assert.equal(verifiedEndpoint({ city: 'Doha', country: 'Qatar' }), null);
  assert.equal(verifiedEndpoint({ lat: null, lng: null }), null);
  assert.equal(verifiedEndpoint({ lat: '', lng: '' }), null);
  assert.equal(verifiedEndpoint({ lat: 91, lng: 0 }), null);
  assert.equal(verifiedEndpoint({ lat: 0, lng: -181 }), null);
  assert.equal(verifiedEndpoint({ lat: 'NaN', lng: 20 }), null);
  assert.deepEqual(verifiedEndpoint({ port: 'Reported terminal', lat: '25.01', lng: '51.61' }), {
    port: 'Reported terminal', name: 'Reported terminal', lat: 25.01, lng: 51.61
  });
});

test('tracking timestamps are displayed explicitly in UTC and missing dates stay unknown', () => {
  assert.equal(formatTrackingTime(null), 'Not recorded');
  assert.equal(formatTrackingTime('invalid'), 'Not recorded');
  assert.equal(formatTrackingTime('2026-11-21'), '21 Nov 2026');
  assert.equal(formatTrackingTime('2026-11-21 10:30:00'), formatTrackingTime('2026-11-21T10:30:00Z'));
  assert.equal(formatTrackingTime('2026-11-21T13:30:00+03:00'), formatTrackingTime('2026-11-21T10:30:00Z'));
  assert.match(formatTrackingTime('2026-11-21 10:30:00'), /10:30 UTC$/);
});

test('event history is chronological, omits private events, and never synthesizes milestones', () => {
  const events = [
    { id: 3, event_time: '2026-11-23T10:00:00Z', is_public: true },
    { id: 2, event_time: '2026-11-22T10:00:00Z', is_public: false },
    { id: 1, event_time: '2026-11-21T10:00:00Z', is_public: true },
    { id: 4, event_time: '2026-11-24T10:00:00Z', is_public: 0 }
  ];
  assert.deepEqual(orderedPublicEvents(events).map(e => e.id), [1, 3]);
  assert.equal(events[0].id, 3);
  assert.deepEqual(orderedPublicEvents(undefined), []);
  assert.deepEqual(orderedPublicEvents([]), []);
});
