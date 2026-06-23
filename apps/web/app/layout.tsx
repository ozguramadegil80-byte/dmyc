import './globals.css';

export const metadata = {
  title: 'DMyC Yönetim Sistemi',
  description: 'DMyC çoklu ülke araç katalog yönetimi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
