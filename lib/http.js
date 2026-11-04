export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}

export function serverError(error) {
  console.error('Operasi server gagal', { name: error?.name || 'Error' });
  return json({ error: 'Layanan database sedang bermasalah' }, 503);
}
