'use client';

import { useRef, useState } from 'react';
import {
  fetchAdminSponsor,
  updateAdminSponsor,
  uploadSponsorLogo,
  type SponsorConfig,
} from '../lib/adminReviewApi';

type Props = {
  initial: SponsorConfig | null;
};

export function AdminSponsorConsole({ initial }: Props) {
  const [config, setConfig] = useState<SponsorConfig | null>(initial);
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '');
  const [clickUrl, setClickUrl] = useState(initial?.clickUrl ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showMsg = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const refresh = async () => {
    setIsBusy(true);
    setMessage(null);
    try {
      const next = await fetchAdminSponsor();
      if (next) {
        setConfig(next);
        setLogoUrl(next.logoUrl ?? '');
        setClickUrl(next.clickUrl ?? '');
        setLabel(next.label ?? '');
        setIsActive(next.isActive);
      }
    } catch {
      showMsg('Bağlantı hatası — API erişilemez.', true);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setMessage(null);
    try {
      const { url } = await uploadSponsorLogo(file);
      setLogoUrl(url);
      showMsg('Logo yüklendi — kaydetmeyi unutma.');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Yükleme başarısız.', true);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    setIsBusy(true);
    setMessage(null);
    try {
      const next = await updateAdminSponsor({
        logoUrl: logoUrl || null,
        clickUrl: clickUrl || null,
        label: label || null,
        isActive,
      });
      setConfig(next);
      showMsg('Kaydedildi.');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : 'Kaydetme hatası.', true);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="admin-users-shell">
      <div className="admin-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Sponsor Banner</h1>
          <button className="admin-btn admin-btn-ghost" onClick={refresh} disabled={isBusy || isUploading}>
            Yenile
          </button>
        </div>

        {message && (
          <p className={isError ? 'admin-banner-err' : 'admin-banner-ok'}>{message}</p>
        )}

        <div className="admin-card" style={{ maxWidth: 540 }}>

          {/* Logo yükleme */}
          <div className="admin-field">
            <p className="admin-label">Sponsor Logosu</p>
            <p className="admin-hint">Önerilen boyut: 360 × 84 px — yatay, şeffaf arka planlı PNG</p>
            <label className="admin-logo-drop">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <span className="admin-logo-drop-label">
                {isUploading ? 'Yükleniyor…' : '+ Logo Seç'}
              </span>
              <span className="admin-logo-drop-sub">PNG, JPG veya WebP · Maks. 5 MB</span>
            </label>
          </div>

          {/* Önizleme */}
          {logoUrl ? (
            <div className="admin-field">
              <p className="admin-label">Önizleme (uygulama banner'ı)</p>
              <div className="admin-logo-preview-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="sponsor logo önizleme" />
              </div>
            </div>
          ) : null}

          {/* Tıklama linki */}
          <div className="admin-field">
            <label className="admin-label" htmlFor="sp-click-url">Tıklanma Linki</label>
            <input
              id="sp-click-url"
              className="admin-input"
              type="url"
              placeholder="https://sponsor-sitesi.com"
              value={clickUrl}
              onChange={(e) => setClickUrl(e.target.value)}
            />
          </div>

          {/* Etiket */}
          <div className="admin-field">
            <label className="admin-label" htmlFor="sp-label">Etiket (opsiyonel)</label>
            <input
              id="sp-label"
              className="admin-input"
              type="text"
              placeholder="Sponsor adı"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Aktif toggle */}
          <div className="admin-check-row">
            <input
              id="sp-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label id="sp-active" className="admin-check-label" htmlFor="sp-active">
              Aktif — mobil uygulamada göster
            </label>
          </div>

          {config ? (
            <p className="admin-meta">
              Son güncelleme: {new Date(config.updatedAt).toLocaleString('tr-TR')}
            </p>
          ) : null}

          <button
            className="admin-btn admin-btn-primary"
            style={{ justifySelf: 'start' }}
            onClick={save}
            disabled={isBusy || isUploading}
          >
            {isBusy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
