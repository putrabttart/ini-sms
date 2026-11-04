import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { processWebhook } from '../lib/webhook.js';

const HP1_SECRET = 'a'.repeat(64);
const HP2_SECRET = 'b'.repeat(64);
const env = { SMS_SECRET_HP1: HP1_SECRET, SMS_SECRET_HP2: HP2_SECRET, PUBLIC_NOTICE_SENDERS: '' };

function signedRequest(device, from, text, secret = HP1_SECRET, rawBody) {
  const body = rawBody ?? JSON.stringify({ from, text, sentStamp: 123, receivedStamp: 124, sim: '0' });
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  return new Request(`https://example.test/api/webhook/${device}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': signature }, body,
  });
}

test('webhook menyimpan hanya kategori dan nilai aman tanpa sender/raw body', async () => {
  const saved = [];
  const insertMessage = async (record) => { saved.push(record); return 'saved'; };
  const result = await processWebhook(signedRequest('hp1', '+628111', 'LABTEST 123456'), 'hp1', { env, insertMessage });
  assert.deepEqual(result.body, { status: 'saved', device: 'hp1', category: 'lab' });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].value, '123456');
  assert.equal(saved[0].fingerprint.length, 64);
  assert.equal('from' in saved[0], false);
  assert.equal('rawBody' in saved[0], false);
});

test('OTP eksternal diabaikan dan repository tidak dipanggil', async () => {
  let calls = 0;
  const insertMessage = async () => { calls += 1; return 'saved'; };
  const result = await processWebhook(signedRequest('hp1', 'BANK', 'OTP bank 123456'), 'hp1', { env, insertMessage });
  assert.deepEqual(result.body, { status: 'ignored', reason: 'not_public_test_message' });
  assert.equal(calls, 0);
});

test('secret hp1 tidak dapat digunakan untuk hp2', async () => {
  const wrong = await processWebhook(signedRequest('hp2', 'A', 'LABTEST 123456', HP1_SECRET), 'hp2', { env });
  assert.equal(wrong.status, 401);
  const right = await processWebhook(signedRequest('hp2', 'A', 'LABTEST 123456', HP2_SECRET), 'hp2', {
    env, insertMessage: async () => 'saved',
  });
  assert.equal(right.status, 200);
});

test('webhook menolak device, JSON, dan ukuran yang tidak valid', async () => {
  assert.equal((await processWebhook(signedRequest('hp3', 'A', 'LABTEST 123456'), 'hp3', { env })).status, 404);
  assert.equal((await processWebhook(signedRequest('hp1', '', '', HP1_SECRET, '{bad'), 'hp1', { env })).status, 400);
  const large = 'x'.repeat(16 * 1024 + 1);
  assert.equal((await processWebhook(signedRequest('hp1', '', '', HP1_SECRET, large), 'hp1', { env })).status, 413);
});

test('status duplicate dari repository dipertahankan', async () => {
  const result = await processWebhook(signedRequest('hp1', 'A', 'LABTEST 123456'), 'hp1', {
    env, insertMessage: async () => 'duplicate',
  });
  assert.deepEqual(result.body, { status: 'duplicate', device: 'hp1', category: 'lab' });
});
