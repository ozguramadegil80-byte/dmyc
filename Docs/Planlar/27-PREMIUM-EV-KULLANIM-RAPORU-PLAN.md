# DMyC Premium EV Kullanım Raporu Planı

## Amaç

Sistem verilerinden deterministik olarak üretilen, 4 bölümlü ve paylaşılabilir premium araç raporu.

---

## Roadmap Bağlamı

```text
Plan 26 (Gün 0) üstüne oturur.
İkinci el alıcısına ve araç sahibine:
  "Araç ne durumda? Nasıl kullanılmış? Ne kadar değer üretmiş?"
sorularını yanıtlar.
```

---

## 4 Bölüm

```text
1. Araç Ön Özeti       → vehicle_assessments (Plan 26 motoru, kullanıcıdan bağımsız)
2. Şoför Kullanım Özeti → battery_lifecycle + annual_reports (kullanıcı verisi)
3. Ekonomik Özet       → annual_reports + ElectricityTariffService
4. QR Doğrulama        → vehicle_public_reports
```

---

## Şoför Skoru Algoritması

```text
Skor = tüketim sapması × 0.40
     + DC şarj oranı × 0.30
     + stres döngü oranı × 0.30

5 Bant:
  85–100 → Sakin kullanım
  70–84  → Dengeli kullanım
  50–69  → Hafif agresif kullanım
  30–49  → Agresif kullanım
  <30    → Belirsiz / veri yetersiz
```

---

## Dış Batarya Raporları

```text
provider: 'TUV_Rheinland' | 'AVILOO' | 'Hella_Gutmann' | 'other'
soh_percent: opsiyonel
source_type: 'external_certified_report' | 'dealer_report' | 'owner_manual'
```

Provider field esnek. Tek marka kilitlemesi yok.

---

## Kritik Ayrım

```text
Araç Ön Özeti → savunulur, kullanıcıdan soyut
Şoför Özeti   → ayrı disclaimer, kullanıcıya ait veri
Dış Rapor     → "destekleyici belge bağlantısı"

"Bataryası sağlıklı" iddiası asla verilmez.
```

---

## Durum: ✅ KAPANDI

```text
Migration : 036_premium_report_foundation.sql
Servis    : premium-vehicle-report.service.ts
API       : POST /vehicles/:id/premium-report
            GET  /vehicles/:id/premium-report/latest
            GET  /vehicles/:id/premium-report/preview
            POST /vehicles/:id/external-battery-reports
            GET  /vehicles/:id/external-battery-reports
Mobil     : PremiumReportBlock — SummaryStep'te
```
