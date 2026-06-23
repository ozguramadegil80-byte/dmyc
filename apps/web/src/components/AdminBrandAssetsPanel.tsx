'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageUp, RotateCw, Save } from 'lucide-react';
import {
  fetchVehicleBrandAssets,
  updateVehicleBrandAsset,
  uploadVehicleImage,
  type VehicleBrandAsset,
} from '../lib/adminReviewApi';

type DraftMap = Record<string, { imageUrl: string; notes: string }>;

export function AdminBrandAssetsPanel() {
  const [assets, setAssets] = useState<VehicleBrandAsset[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [selectedBrand, setSelectedBrand] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busyBrand, setBusyBrand] = useState<string | null>(null);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.brand === selectedBrand) ?? assets[0] ?? null,
    [assets, selectedBrand],
  );
  const selectedDraft = selectedAsset ? drafts[selectedAsset.brand] : null;

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setMessage('Marka görselleri yükleniyor...');
    try {
      const freshAssets = await fetchVehicleBrandAssets();
      setAssets(freshAssets);
      setDrafts(createDrafts(freshAssets));
      setSelectedBrand((current) => freshAssets.find((asset) => asset.brand === current)?.brand ?? freshAssets[0]?.brand ?? '');
      setMessage('Marka görselleri hazır.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Marka görselleri yüklenemedi.');
    }
  }

  function updateDraft(brand: string, field: 'imageUrl' | 'notes', value: string) {
    setMessage(null);
    setDrafts((current) => ({
      ...current,
      [brand]: {
        imageUrl: current[brand]?.imageUrl ?? '',
        notes: current[brand]?.notes ?? '',
        [field]: value,
      },
    }));
  }

  async function saveAsset(asset: VehicleBrandAsset) {
    const draft = drafts[asset.brand];
    if (!draft) {
      return;
    }

    setBusyBrand(asset.brand);
    setMessage(null);

    try {
      const updated = await updateVehicleBrandAsset(asset.brand, {
        imageUrl: draft.imageUrl,
        notes: draft.notes,
      });
      setAssets((current) => current.map((item) => (item.brand === updated.brand ? updated : item)));
      setDrafts((current) => ({
        ...current,
        [updated.brand]: {
          imageUrl: updated.imageUrl ?? '',
          notes: updated.notes ?? '',
        },
      }));
      setMessage(`${updated.brand} kategori görseli kaydedildi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kategori görseli kaydedilemedi.');
    } finally {
      setBusyBrand(null);
    }
  }

  async function uploadAssetImage(asset: VehicleBrandAsset, file: File) {
    setBusyBrand(asset.brand);
    setMessage(null);

    try {
      const uploaded = await uploadVehicleImage(file, `${asset.brand} kategori`);
      updateDraft(asset.brand, 'imageUrl', uploaded.url);
      setMessage(`${asset.brand} görseli yüklendi. Kalıcı yapmak için Kaydet.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Görsel yüklenemedi.');
    } finally {
      setBusyBrand(null);
    }
  }

  return (
    <section className="brand-assets-panel">
      <div className="brand-assets-header">
        <div>
          <p className="eyebrow">Kategori Görselleri</p>
          <h2>Marka Kapakları</h2>
        </div>
        <button className="icon-button text-button" type="button" onClick={refresh} title="Marka görsellerini yenile">
          <RotateCw size={18} />
          Yenile
        </button>
      </div>

      <div className="brand-assets-layout">
        <div className="brand-assets-list" aria-label="Marka listesi">
          {assets.map((asset) => (
            <button
              className={`brand-asset-row ${selectedAsset?.brand === asset.brand ? 'selected' : ''}`}
              key={asset.brand}
              type="button"
              onClick={() => setSelectedBrand(asset.brand)}
            >
              <span>{asset.brand}</span>
              <small>{asset.vehicleCount} varyant</small>
            </button>
          ))}
        </div>

        {selectedAsset && selectedDraft ? (
          <div className="brand-asset-editor">
            <div className="brand-asset-preview">
              {selectedDraft.imageUrl ? (
                <img src={selectedDraft.imageUrl} alt={`${selectedAsset.brand} kategori görseli`} />
              ) : (
                <span>Görsel yok</span>
              )}
            </div>

            <div className="brand-asset-fields">
              <label>
                Marka
                <input value={selectedAsset.brand} readOnly />
              </label>
              <label>
                Kategori görsel URL
                <input
                  value={selectedDraft.imageUrl}
                  onChange={(event) => updateDraft(selectedAsset.brand, 'imageUrl', event.target.value)}
                  placeholder="https:// veya upload"
                />
              </label>
              <label>
                Admin notu
                <input
                  value={selectedDraft.notes}
                  onChange={(event) => updateDraft(selectedAsset.brand, 'notes', event.target.value)}
                  placeholder="Örn. ana seçim ekranında kullanılır"
                />
              </label>
              <div className="brand-asset-actions">
                <label className="upload-button">
                  <ImageUp size={16} />
                  {busyBrand === selectedAsset.brand ? 'İşleniyor' : 'Dosya seç'}
                  <input
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={busyBrand === selectedAsset.brand}
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadAssetImage(selectedAsset, file);
                      }
                      event.target.value = '';
                    }}
                  />
                </label>
                <button
                  className="primary-button save-spec-button"
                  type="button"
                  disabled={busyBrand === selectedAsset.brand}
                  onClick={() => saveAsset(selectedAsset)}
                >
                  <Save size={18} />
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">Marka kaydı bulunamadı.</p>
        )}
      </div>

      {message ? <p className="brand-assets-message">{message}</p> : null}
    </section>
  );
}

function createDrafts(assets: VehicleBrandAsset[]) {
  return Object.fromEntries(
    assets.map((asset) => [
      asset.brand,
      {
        imageUrl: asset.imageUrl ?? '',
        notes: asset.notes ?? '',
      },
    ]),
  );
}
