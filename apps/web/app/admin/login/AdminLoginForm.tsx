'use client';

import { Globe2, LogIn } from 'lucide-react';
import { FormEvent, useState } from 'react';

const marketDefaults = {
  TR: 'tr',
  GB: 'en',
} as const;

export function AdminLoginForm() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [marketCode, setMarketCode] = useState<keyof typeof marketDefaults>('TR');
  const [contentLocale, setContentLocale] = useState<'tr' | 'en'>('tr');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, marketCode, contentLocale }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? 'Giriş yapılamadı.');
        return;
      }
      window.location.assign('/admin/vehicles');
    } catch {
      setMessage('Giriş servisine ulaşılamadı.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell" style={{ background: '#080f10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <section className="login-panel" style={{ background: '#0d1a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxWidth: 560, width: '100%', padding: 32 }}>
        <div className="login-brand" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/yatay-logo.png" alt="DMyC" style={{ height: 30, width: 'auto' }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>YÖNETİM SİSTEMİ</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>
            Kullanıcı adı
            <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Şifre
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <div className="login-context-grid">
            <label>
              Çalışılacak ülke
              <select
                value={marketCode}
                onChange={(event) => {
                  const market = event.target.value as keyof typeof marketDefaults;
                  setMarketCode(market);
                  setContentLocale(marketDefaults[market]);
                }}
              >
                <option value="TR">Türkiye (TR)</option>
                <option value="GB">Birleşik Krallık (GB)</option>
              </select>
            </label>
            <label>
              İçerik dili
              <select value={contentLocale} onChange={(event) => setContentLocale(event.target.value as 'tr' | 'en')}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div className="login-context-note">
            <Globe2 size={18} />
            <p>Panel menüleri Türkçe kalır. Araç adları, kaynaklar ve pazar içerikleri seçilen içerik dilinde yönetilir.</p>
          </div>

          {message ? <p className="login-error" role="alert">{message}</p> : null}

          <button className="primary-button login-submit" disabled={isSubmitting} type="submit">
            <LogIn size={18} />
            {isSubmitting ? 'Giriş yapılıyor...' : 'Panele gir'}
          </button>
        </form>
      </section>
    </main>
  );
}
