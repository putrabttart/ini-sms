import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { classifyMessage, requestFingerprint, verifyHmac } from '../lib/policy.js';

const SECRET = 'a'.repeat(64);

test('HMAC memverifikasi raw body dan menolak signature yang salah', () => {
  const raw = Buffer.from('{"text":"LABTEST 123456"}');
  const signature = createHmac('sha256', SECRET).update(raw).digest('hex');
  assert.equal(verifyHmac(SECRET, raw, signature), true);
  assert.equal(verifyHmac(SECRET, Buffer.from('{}'), signature), false);
  assert.equal(verifyHmac(SECRET, raw, 'invalid'), false);
});

test('pesan dummy diterima tanpa bergantung pada sender', () => {
  assert.deepEqual(classifyMessage({ from: '+628000', text: 'LABTEST 111222' }), { category: 'lab', value: '111222' });
  assert.deepEqual(classifyMessage({ from: 'ALPHA', text: 'Tes koneksi HP 444555' }), { category: 'lab', value: '444555' });
});

test('OTP pihak ketiga dan pesan biasa selalu diabaikan', () => {
  for (const text of ['Netflix login code 123456', 'Disney+ verification code 987654', 'OTP bank 112233', 'Halo biasa']) {
    assert.deepEqual(classifyMessage({ from: 'SERVICE', text }), { ignored: 'not_public_test_message' });
  }
});

test('pengumuman default-deny dan hanya menerima sender yang diizinkan', () => {
  const payload = { from: 'OWNER', text: 'INFO PUBLIK: Jadwal pengujian sedang berjalan' };
  assert.deepEqual(classifyMessage(payload), { ignored: 'unapproved_announcement_sender' });
  assert.deepEqual(classifyMessage(payload, 'SECOND, OWNER'), {
    category: 'notice', value: 'Jadwal pengujian sedang berjalan',
  });
});

test('pengumuman menolak digit, URL, email, dan istilah autentikasi', () => {
  const unsafe = [
    'INFO PUBLIK: Jadwal dimulai pukul 8',
    'INFO PUBLIK: Buka https://example.org sekarang',
    'INFO PUBLIK: Hubungi admin@example.org segera',
    'INFO PUBLIK: Kode login sudah tersedia',
    'INFO PUBLIK: Netflix sedang tersedia',
  ];
  for (const text of unsafe) {
    assert.deepEqual(classifyMessage({ from: 'OWNER', text }, 'OWNER'), { ignored: 'unsafe_announcement' });
  }
});

test('payload malformed ditolak dan fingerprint terisolasi per device', () => {
  assert.deepEqual(classifyMessage({ text: 'LABTEST 123456' }), {
    error: 'Perlu field from dan text sebagai string', status: 400,
  });
  const raw = Buffer.from('{"same":true}');
  assert.equal(requestFingerprint('hp1', raw), requestFingerprint('hp1', raw));
  assert.notEqual(requestFingerprint('hp1', raw), requestFingerprint('hp2', raw));
});
