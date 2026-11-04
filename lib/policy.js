import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const DEVICES = Object.freeze({
  hp1: 'SIM Pengujian 1',
  hp2: 'SIM Pengujian 2',
});
export const MAX_BODY_BYTES = 16 * 1024;
export const TTL_SECONDS = 15 * 60;

const TEST_RE = /^(?:Tes koneksi HP|LABTEST) ([0-9]{6})$/i;
const PUBLIC_PREFIX = /^INFO PUBLIK:\s*(.+)$/i;
const BLOCKED_NOTICE_TERMS = /\b(?:otp|kode|code|pin|password|passcode|token|verifikasi|verification|login|masuk|netflix|disney)\b/i;
const BLOCKED_NOTICE_LINK = /(?:https?:\/\/|www\.|@)/i;

export function secretForDevice(device, env = process.env) {
  if (device === 'hp1') return env.SMS_SECRET_HP1;
  if (device === 'hp2') return env.SMS_SECRET_HP2;
  return null;
}

export function verifyHmac(secret, rawBody, signature = '') {
  if (typeof secret !== 'string' || secret.length < 32 || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function classifyMessage(payload, noticeSenders = '') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || typeof payload.from !== 'string' || typeof payload.text !== 'string') {
    return { error: 'Perlu field from dan text sebagai string', status: 400 };
  }

  const bodyText = payload.text.trim();
  const demo = TEST_RE.exec(bodyText);
  if (demo) return { category: 'lab', value: demo[1] };

  const publicMatch = PUBLIC_PREFIX.exec(bodyText);
  if (!publicMatch) return { ignored: 'not_public_test_message' };
  const trusted = noticeSenders.split(',').map((value) => value.trim()).filter(Boolean);
  if (!trusted.includes(payload.from.trim())) return { ignored: 'unapproved_announcement_sender' };

  const notice = publicMatch[1].trim();
  if (notice.length < 8 || notice.length > 140 || /[0-9]/.test(notice)
      || BLOCKED_NOTICE_LINK.test(notice) || BLOCKED_NOTICE_TERMS.test(notice)) {
    return { ignored: 'unsafe_announcement' };
  }
  return { category: 'notice', value: notice };
}

export function requestFingerprint(device, rawBody) {
  return createHash('sha256').update(device).update(Buffer.from([0])).update(rawBody).digest('hex');
}
