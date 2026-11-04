'use client';

import { useEffect, useState } from 'react';

function prettyTime(date) {
  if (!date) return 'Belum ada pesan';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? '-'
    : new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(parsed);
}

async function readJson(url, signal) {
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Gagal memuat data (${response.status})`);
  return response.json();
}

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [retention, setRetention] = useState(15);
  const [clock, setClock] = useState('--:--:--');
  const [error, setError] = useState('');

  useEffect(() => {
    const updateClock = () => setClock(new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date()));
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let controller;
    const refreshDevices = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const payload = await readJson('/api/devices', controller.signal);
        setDevices(payload.devices);
        setRetention(payload.retention_minutes);
        setSelected((current) => payload.devices.some((device) => device.id === current)
          ? current
          : payload.devices[0]?.id || null);
        setError('');
      } catch (refreshError) {
        if (refreshError.name !== 'AbortError') setError(refreshError.message);
      }
    };
    refreshDevices();
    const timer = setInterval(refreshDevices, 20000);
    return () => { clearInterval(timer); controller?.abort(); };
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    let controller;
    const refreshMessages = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const payload = await readJson(`/api/messages?device=${encodeURIComponent(selected)}`, controller.signal);
        setMessages(payload.messages);
        setError('');
      } catch (refreshError) {
        if (refreshError.name !== 'AbortError') setError(refreshError.message);
      }
    };
    refreshMessages();
    const timer = setInterval(refreshMessages, 20000);
    return () => { clearInterval(timer); controller?.abort(); };
  }, [selected]);

  const chosen = devices.find((device) => device.id === selected);
  const totalMessages = devices.reduce((total, device) => total + device.count, 0);

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">S</div>
          <div><strong>SMS RECEIVER</strong><span>LABORATORIUM / ONLINE</span></div>
        </div>
        <div className="top-right"><span className="dot" /><span>Online HTTPS</span><span className="top-divider" /><span>{clock}</span></div>
      </header>

      <main>
        <section className="hero">
          <div className="kicker"><span className="kicker-indicator" /> DASHBOARD PENGUJIAN</div>
          <h1>Semua pesan uji.<br /><span>Dalam satu inbox.</span></h1>
          <p>Pantau kiriman SMS dummy dari perangkat Android. Dashboard hanya menampilkan kode uji buatan sendiri dan pengumuman umum yang disetujui. Pesan verifikasi akun sungguhan tidak disimpan.</p>
          <div className="hero-metrics">
            <div><strong>{devices.length || '-'}</strong><span>Perangkat terdaftar</span></div>
            <div><strong>{devices.length ? totalMessages : '-'}</strong><span>Pesan tersimpan</span></div>
            <div><strong>{retention}<span className="inline-unit">m</span></strong><span>Retensi pesan</span></div>
          </div>
        </section>

        <section className="workspace">
          <aside className="sidebar card">
            <div className="section-heading"><div><span className="eyebrow">PERANGKAT</span><h2>Pilih inbox</h2></div><span className="count-bubble">{devices.length}</span></div>
            <div className="device-list">
              {!devices.length && !error && <div className="skeleton">Memuat perangkat...</div>}
              {devices.map((device) => (
                <button className={`device${selected === device.id ? ' selected' : ''}`} type="button" key={device.id} onClick={() => setSelected(device.id)}>
                  <span className="device-icon" aria-hidden="true">HP</span>
                  <span className="device-copy"><strong>{device.name}</strong><small>{device.latest ? `Terakhir: ${prettyTime(device.latest)}` : 'Menunggu SMS uji'}</small></span>
                  <span className="device-count">{device.count}</span>
                </button>
              ))}
            </div>
            <div className="sidebar-note"><div className="note-icon">i</div><div><strong>Pengingat keamanan</strong><p>Inbox publik hanya menampilkan pesan uji dan pengumuman yang disetujui, bukan OTP akun nyata.</p></div></div>
          </aside>

          <section className="inbox card">
            <div className="inbox-header"><div><span className="eyebrow">KOTAK MASUK</span><h2>{chosen?.name || 'Memuat inbox...'}</h2><p>Pesan dummy dan informasi umum yang disetujui</p></div><div className="refresh-label">REFRESH 20 DTK</div></div>
            <div className="table-heading"><span>PESAN TERBARU</span><span>{messages.length} pesan</span></div>
            <div className="message-list" aria-live="polite">
              {error && <div className="error">{error}</div>}
              {!error && messages.length === 0 && <div className="empty-state"><div className="empty-icon">SMS</div><h3>Belum ada SMS pengujian</h3><p>Kirim SMS uji: Tes koneksi HP 123456 dari nomor yang kamu kendalikan. Pesan autentikasi sungguhan tidak ditampilkan.</p></div>}
              {!error && messages.map((message) => <MessageCard message={message} key={message.id} />)}
            </div>
          </section>
        </section>
        <footer><span>SMS Receiver LAB v2.0</span><span>Next.js + Supabase | Pesan uji yang disetujui</span></footer>
      </main>
    </div>
  );
}

function MessageCard({ message }) {
  const [copyLabel, setCopyLabel] = useState('Salin kode');
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(message.code);
      setCopyLabel('Tersalin');
      setTimeout(() => setCopyLabel('Salin kode'), 1400);
    } catch {
      setCopyLabel('Gagal salin');
    }
  }
  return (
    <article className="sms-card">
      <div className="sms-top"><div className="sms-sender"><span className="sms-symbol">SMS</span><span>{message.sender}</span></div><span className="sms-time">{prettyTime(message.received_at)}</span></div>
      <div className="sms-body">{message.text}</div>
      {message.kind === 'lab' && message.code && <div className="sms-codebar"><div><div className="sms-code-label">KODE DUMMY</div><div className="sms-code">{message.code}</div></div><button className="copy-button" type="button" onClick={copyCode}>{copyLabel}</button></div>}
    </article>
  );
}
