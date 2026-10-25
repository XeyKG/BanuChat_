/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReminderCandidates,
  destinationForAccount,
  parseNotificationData,
} from '../src/notifications/model';

const principalId = '11111111-1111-4111-8111-111111111111';
const releaseId = '22222222-2222-4222-8222-222222222222';

test('notification payloads are strict, account-scoped and capability-scoped', () => {
  const payload = {
    schema: 'banuchat-notification-1',
    destination: 'calendar',
    recipient_scope: principalId,
    dedupe_key: `calendar:${releaseId}:event-020:24h`,
    resource_key: 'event-020',
  };
  assert.deepEqual(parseNotificationData(payload), payload);
  assert.equal(destinationForAccount(payload, principalId, ['calendar']), 'calendar');
  assert.equal(destinationForAccount(payload, principalId, ['announcements']), null);
  assert.equal(
    destinationForAccount(payload, '33333333-3333-4333-8333-333333333333', ['calendar']),
    null,
  );
  assert.equal(parseNotificationData({ ...payload, destination: '/login' }), null);
  assert.equal(parseNotificationData({ ...payload, recipient_scope: 'BCH-DEMO-4101' }), null);
  assert.equal(parseNotificationData({ ...payload, dedupe_key: 'unsafe value' }), null);
});

test('reminder planning uses synthetic resources, a 24-hour lead and stable deduplication', () => {
  const now = Date.parse('2026-10-24T12:00:00-05:00');
  const candidates = buildReminderCandidates({
    now,
    principalId,
    releaseId,
    calendarEvents: [
      {
        event_key: 'event-020',
        title: 'Evento ficticio actualizado',
        description: 'Dato sintético',
        event_type: 'general',
        starts_at: '2026-11-01T10:00:00-05:00',
        ends_at: '2026-11-01T10:45:00-05:00',
        course_key: null,
        announcement_key: null,
      },
      {
        event_key: 'event-020',
        title: 'Duplicado no programado',
        description: 'Dato sintético',
        event_type: 'general',
        starts_at: '2026-11-01T10:00:00-05:00',
        ends_at: null,
        course_key: null,
        announcement_key: null,
      },
      {
        event_key: 'past',
        title: 'Evento pasado',
        description: 'Dato sintético',
        event_type: 'general',
        starts_at: '2026-10-24T12:30:00-05:00',
        ends_at: null,
        course_key: null,
        announcement_key: null,
      },
    ],
    announcements: [
      {
        announcement_key: 'announcement-001',
        title: 'Anuncio ficticio',
        description: 'Dato sintético',
        valid_from: '2026-11-03T09:00:00-05:00',
        valid_until: null,
        temporal_status: 'upcoming',
      },
    ],
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].data.destination, 'calendar');
  assert.equal(candidates[0].fireAt.toISOString(), '2026-10-31T15:00:00.000Z');
  assert.equal(candidates[0].body, 'Evento ficticio actualizado');
  assert.equal(candidates[1].data.destination, 'announcements');
  assert.ok(candidates.every((candidate) => candidate.data.recipient_scope === principalId));
  assert.ok(candidates.every((candidate) => !JSON.stringify(candidate.data).includes('Dato sintético')));
});
