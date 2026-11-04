import { timingSafeEqual } from 'node:crypto';
import { json, serverError } from '@/lib/http.js';
import { deleteExpired } from '@/lib/repository.js';

export const runtime = 'nodejs';

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request) {
  if (!authorized(request)) return json({ error: 'Tidak diizinkan' }, 401);
  try {
    await deleteExpired();
    return json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
