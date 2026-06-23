# DMyC Anlık Yeniden Hesaplama Planı

## Amaç

Kullanıcı km bilgisini güncellediğinde `vehicle_assessments` kaydının otomatik yenilenmesi.
Premium rapor varsa onun da yeniden üretilmesi.

---

## Neden Şimdi Değil

```text
- Kullanıcı km güncelleme davranışı henüz gözlemlenmedi
- Plan 26 Day 0 değerlendirmesi tek seferlik; telemetri verileri geldikçe yerini zaten bırakıyor
- Önce gerçek kullanıcıdan km güncelleme talebi görmek lazım
```

---

## Kapsam

```text
Kapsam içi:
  - vehicle_ownerships.odometer_km güncelleme endpoint'i
  - PATCH /vehicle-ownerships/:id/odometer → güncelle + assessment tetikle
  - Mobil: SummaryStep'te "KM GÜNCELLE" input + buton
  - Yeni assessment oluşturulunca latestAssessment state yenilenir

Kapsam dışı:
  - Otomatik GPS mesafe entegrasyonu (OEM gerektirir)
  - Gerçek zamanlı odometer sync
```

---

## Hesap Tetikleyici

```text
PATCH /vehicle-ownerships/:id/odometer
  body: { odometerKm: number }
  → UPDATE vehicle_ownerships SET odometer_km = $1
  → POST /vehicles/:vehicleId/assessment (yeni hesap)
  → Response: { ownership, assessment }
```

---

## Mobil Akış

```text
SummaryStep → "KM GÜNCELLE" butonu
  → Modal / inline input: yeni km
  → Kaydet → backend çağrısı
  → latestAssessment yenilenir
  → GÜN 0 bloğu güncellenir
```

---

## Ön Koşul

```text
Plan 26 tamamlandı ✅
Kullanıcı validasyonundan km güncelleme talebi gelmesi bekleniyor.
```

---

## Durum: ⏳ BEKLEMEDE
