import { json, serverError } from '@/lib/http.js';
import { getDevices } from '@/lib/repository.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return json({ retention_minutes: 15, devices: await getDevices() });
  } catch (error) {
    return serverError(error);
  }
}
