import { json, serverError } from '@/lib/http.js';
import { DEVICES } from '@/lib/policy.js';
import { getMessages } from '@/lib/repository.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const device = new URL(request.url).searchParams.get('device') || '';
  if (!Object.hasOwn(DEVICES, device)) return json({ error: 'Perangkat tidak ditemukan' }, 404);
  try {
    return json({ device, messages: await getMessages(device) });
  } catch (error) {
    return serverError(error);
  }
}
