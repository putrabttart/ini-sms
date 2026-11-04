import { DEVICES, TTL_SECONDS } from './policy.js';
import { getSupabase } from './supabase.js';

function cutoffIso(now = Date.now()) {
  return new Date(now - TTL_SECONDS * 1000).toISOString();
}

export async function insertMessage({ device, category, value, fingerprint }) {
  const supabase = getSupabase();
  const table = category === 'lab' ? 'lab_messages' : 'public_notices';
  const content = category === 'lab' ? { demo_code: value } : { notice_text: value };
  const { error } = await supabase.from(table).insert({
    device_id: device,
    ...content,
    request_hash: fingerprint,
  });
  if (!error) return 'saved';
  if (error.code === '23505') return 'duplicate';
  throw error;
}

export async function getDevices() {
  const supabase = getSupabase();
  const cutoff = cutoffIso();
  const [labResult, noticeResult] = await Promise.all([
    supabase.from('lab_messages').select('device_id,created_at').gt('created_at', cutoff),
    supabase.from('public_notices').select('device_id,created_at').gt('created_at', cutoff),
  ]);
  if (labResult.error) throw labResult.error;
  if (noticeResult.error) throw noticeResult.error;

  const counts = new Map();
  for (const row of [...labResult.data, ...noticeResult.data]) {
    const item = counts.get(row.device_id) || { count: 0, latest: null };
    item.count += 1;
    if (!item.latest || row.created_at > item.latest) item.latest = row.created_at;
    counts.set(row.device_id, item);
  }
  return Object.entries(DEVICES).map(([id, name]) => ({
    id,
    name,
    count: counts.get(id)?.count || 0,
    latest: counts.get(id)?.latest || null,
  }));
}

export async function getMessages(device) {
  const supabase = getSupabase();
  const cutoff = cutoffIso();
  const [labResult, noticeResult] = await Promise.all([
    supabase.from('lab_messages').select('id,demo_code,created_at').eq('device_id', device)
      .gt('created_at', cutoff).order('created_at', { ascending: false }).limit(50),
    supabase.from('public_notices').select('id,notice_text,created_at').eq('device_id', device)
      .gt('created_at', cutoff).order('created_at', { ascending: false }).limit(50),
  ]);
  if (labResult.error) throw labResult.error;
  if (noticeResult.error) throw noticeResult.error;

  return [
    ...labResult.data.map((row) => ({
      id: `lab-${row.id}`,
      kind: 'lab',
      sender: 'PENGIRIM UJI',
      text: `Kode pengujian: ${row.demo_code}`,
      code: row.demo_code,
      received_at: row.created_at,
    })),
    ...noticeResult.data.map((row) => ({
      id: `notice-${row.id}`,
      kind: 'notice',
      sender: 'PENGUMUMAN UJI',
      text: row.notice_text,
      code: null,
      received_at: row.created_at,
    })),
  ].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at)).slice(0, 50);
}

export async function deleteExpired() {
  const supabase = getSupabase();
  const cutoff = cutoffIso();
  const [labResult, noticeResult] = await Promise.all([
    supabase.from('lab_messages').delete().lte('created_at', cutoff),
    supabase.from('public_notices').delete().lte('created_at', cutoff),
  ]);
  if (labResult.error) throw labResult.error;
  if (noticeResult.error) throw noticeResult.error;
}
