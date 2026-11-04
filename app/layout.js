import './globals.css';

export const metadata = {
  title: 'SMS Receiver LAB | Inbox Pengujian',
  description: 'Laboratorium SMS Receiver untuk pesan pengujian non-sensitif.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1020',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
