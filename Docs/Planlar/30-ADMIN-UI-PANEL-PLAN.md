# DMyC Admin UI Paneli Planı

## Amaç

Şu an curl / REST ile yapılan admin işlemlerini web arayüzüne taşımak.

---

## Neden Şimdi Değil

```text
- Mevcut admin endpoint'ler REST ile çalışıyor
- Kullanım sıklığı düşük: katalog güncelleme, tarife ekleme, segment yönetimi
- UI yazmak yerine ürünü büyütmek daha değerli
- İlk aşamada tek kişilik admin → araç gereksiz
```

---

## Kapsam

```text
Admin işlemleri (mevcut endpoint'ler üstüne web arayüzü):

Katalog Yönetimi:
  - Araç variant ekleme / düzenleme / silme
  - Araç görseli URL güncelleme
  - Piyasa (market) yönetimi

Tarife Yönetimi:
  - EPDK tarife dönemi ekleme (POST /admin/tariff-periods)
  - Tarife geçmişi görüntüleme

Segment Yönetimi:
  - Insight Studio ad segment ekleme / silme / refresh
  - Segment araç sayısı görüntüleme

Kullanıcı Yönetimi:
  - Kullanıcı listesi
  - Premium erişim manuel açma / kapatma

Sistem Durumu:
  - Migration durumu
  - Son hesaplama zamanları
```

---

## Teknik Seçenekler

```text
Tercih: Next.js (SSR) — ayrı /admin route'u
  - Mevcut API ile aynı host, /admin prefix
  - Admin API key ile auth (mevcut AdminApiKeyGuard kullanılır)
  - Tailwind + ShadCN UI

Alternatif: Retool / Appsmith (no-code admin panel)
  - Daha hızlı kurulum
  - Özelleştirme sınırlı
```

---

## Ön Koşul

```text
Admin işlem sıklığı artınca (haftada 3+ manuel işlem)
veya
takım büyüyünce (2+ kişi admin erişimine ihtiyaç duyunca)
```

---

## Durum: ⏳ BEKLEMEDE
