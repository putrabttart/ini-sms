import { json, serverError } from '@/lib/http.js';
import { processWebhook } from '@/lib/webhook.js';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { device } = await params;
    const result = await processWebhook(request, device);
    return json(result.body, result.status);
  } catch (error) {
    return serverError(error);
  }
}
