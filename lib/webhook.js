import { classifyMessage, DEVICES, MAX_BODY_BYTES, requestFingerprint, secretForDevice, verifyHmac } from './policy.js';
import { insertMessage } from './repository.js';

export async function processWebhook(request, device, dependencies = {}) {
  if (!Object.hasOwn(DEVICES, device)) return { status: 404, body: { error: 'Perangkat tidak ditemukan' } };
  if (request.headers.has('transfer-encoding')) return { status: 400, body: { error: 'Nonaktifkan Chunked mode' } };
  const declaredLength = Number(request.headers.get('content-length') ?? Number.NaN);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { status: 413, body: { error: 'Request terlalu besar' } };
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES) {
    return { status: 413, body: { error: 'Ukuran request tidak diizinkan' } };
  }
  const env = dependencies.env || process.env;
  if (!verifyHmac(secretForDevice(device, env), rawBody, request.headers.get('x-signature') || '')) {
    return { status: 401, body: { error: 'HMAC tidak valid' } };
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody));
  } catch {
    return { status: 400, body: { error: 'JSON tidak valid' } };
  }
  const classified = classifyMessage(payload, env.PUBLIC_NOTICE_SENDERS || '');
  if (classified.error) return { status: classified.status, body: { error: classified.error } };
  if (classified.ignored) return { status: 200, body: { status: 'ignored', reason: classified.ignored } };

  const save = dependencies.insertMessage || insertMessage;
  const status = await save({
    device,
    category: classified.category,
    value: classified.value,
    fingerprint: requestFingerprint(device, rawBody),
  });
  return { status: 200, body: { status, device, category: classified.category } };
}
