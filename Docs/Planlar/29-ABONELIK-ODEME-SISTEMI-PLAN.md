# DMyC Abonelik / Ödeme Sistemi Planı

## Amaç

Premium özellikleri (premium rapor, gelişmiş analiz, dış rapor bağlama) ödeme arkasına almak.
Türkiye odaklı ödeme entegrasyonu.

---

## Neden Şimdi Değil

```text
- Kullanıcı validasyonu yapılmadan ödeme gate'i koymak dönüşümü öldürür
- Şu an sistemin değerini kanıtlaması lazım, kapı değil
- Teknik borç minimum tutulmalı, payment complexity eklenmeye hazır değil
```

---

## Planlanan Tier Yapısı

```text
Free:
  - Gün 0 değerlendirme
  - Yolculuk takibi (sınırsız)
  - Aylık karne
  - Topluluk kıyaslama (anonim)

Premium (aylık / yıllık):
  - Premium EV kullanım raporu
  - Şoför profili skoru
  - Dış batarya raporu bağlama
  - Gelişmiş şarj analizi
  - Insight Studio erişimi (B2B)
  - QR karne paylaşımı (doğrulama rozeti)
```

---

## Teknik Bileşenler

```text
Ödeme sağlayıcısı:
  - iyzico (Türkiye odaklı, yerel kart desteği)
  - Stripe TR (yedek)

DB:
  subscriptions tablosu:
    user_id, plan_code, status, current_period_ends_at,
    payment_provider, external_subscription_id, created_at

Mevcut:
  premium_access tablosu var → bu tabloya is_paid_plan flag eklenir
```

---

## API Yüzeyi

```text
POST /subscriptions/checkout   → ödeme session oluştur (iyzico token)
GET  /subscriptions/status     → aktif plan durumu
POST /subscriptions/webhook    → iyzico callback (ödeme onayı)
POST /subscriptions/cancel     → iptal
```

---

## Ön Koşul

```text
En az 50 aktif kullanıcı → premium talep gözlemlenmesi
Kullanıcı anket verisi: hangi özellikler ücretli olsun?
```

---

## Durum: ⏳ BEKLEMEDE
