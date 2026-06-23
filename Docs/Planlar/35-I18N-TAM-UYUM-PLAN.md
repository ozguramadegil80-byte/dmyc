# DMyC Plan 35 — i18n Tam Uyum

## Amaç

Plan 22-27 arasında eklenen tüm hardcoded Türkçe string'leri mevcut i18n
mimarisine taşımak. Sistem zaten `createTranslator` / `dictionaries` yapısını
kullanıyor; bu plan sadece eksiği kapatır.

---

## Bağlam

`apps/mobile/src/i18n/dictionaries.ts` dosyasında `tr` ve `en` sözlükleri yan
yana tutulmakta ve `createTranslator(locale)` ile çağrılmaktadır.

Plan 22-27'de eklenen bileşenler (`ContextQuestionCard`, `ServiceComplianceBlock`,
`ChargingClusterBlock`, `AssessmentInputStep`, `AssessmentResultBlock`,
`PremiumReportBlock`) ve backend template'leri bu sözlüğü kullanmıyor; string'ler
doğrudan kaynak kodda Türkçe olarak gömülü durumda.

---

## Neden Şimdi Değil

```text
- Plan 26 ve 27 henüz kullanıcı validasyonu görmedi
- i18n eklemek UI bileşenlerini refactor eder → regresyon riski
- GB Market (Plan 32) açılana kadar İngilizce tarafın test ortamı yok
- Önce içerik doğru olsun, sonra çevrilsin
```

---

## Kapsam

### 1. Mobile — Yeni Adım: assessment

```
AssessmentInputStep bileşeni:
  Başlık:            'GÜN 0 DEĞERLENDİRME'           → mobile.assessment.step
  Odometer label:    'Aracı kaç km ile aldınız?'       → mobile.assessment.odometerLabel
  Odometer hint:     'km'                               → (birim, locale formatla)
  Yıl label:         'Hangi yılda aldınız?'             → mobile.assessment.yearLabel
  Şehir başlığı:     'Kullanım şehri (opsiyonel)'       → mobile.assessment.cityLabel
  Pill: İstanbul     'İSTANBUL'                         → mobile.assessment.city.istanbul
  Pill: Ankara       'ANKARA'                           → mobile.assessment.city.ankara
  Pill: İzmir        'İZMİR'                            → mobile.assessment.city.izmir
  Pill: Bursa        'BURSA'                            → mobile.assessment.city.bursa
  Pill: Antalya      'ANTALYA'                          → mobile.assessment.city.antalya
  Pill: Diğer        'DİĞER'                            → mobile.assessment.city.other

AssessmentResultBlock bileşeni:
  Başlık:            'GÜN 0 DEĞERLENDİRME'             → mobile.assessment.step
  Senaryo badge:     (scenarioTitle, DB'den gelir — backend'den çevrilmiş dönmeli)
  Metrik — araç yaşı: 'ARAÇ YAŞI'                      → mobile.assessment.metric.vehicleAge
  Metrik — yıllık km: 'YILLIK KM'                      → mobile.assessment.metric.annualKm
  Metrik — tahmini EFC: 'TAHMİNİ EFC'                  → mobile.assessment.metric.estimatedEfc
  Metrik — pratik menzil: 'PRATİK MENZİL'              → mobile.assessment.metric.practicalRange
  Toggle aç:         'SENARYOYU GÖSTER'                 → mobile.assessment.showScenario
  Toggle kapat:      'KAPAT'                            → mobile.assessment.hideScenario
  Gün birimi:        'yıl' / 'years'                    → mobile.assessment.unit.years
  Km birimi:         'km/yıl'                           → mobile.assessment.unit.kmPerYear
```

### 2. Mobile — PremiumReportBlock

```
Bölüm 1 — Araç Ön Özeti:
  Başlık:            'ARAÇ ÖN ÖZETİ'                   → mobile.premium.report.vehicleSummary
  Metrik — wltp:     'WLTP MENZİL'                     → mobile.premium.report.metric.wltp
  Metrik — pratik:   'PRATİK MENZİL'                   → mobile.premium.report.metric.practical
  Metrik — batarya:  'BATARYA'                          → mobile.premium.report.metric.battery
  Metrik — pazar:    'PAZAR DEĞERİ'                     → mobile.premium.report.metric.marketValue

Bölüm 2 — Şoför Kullanım Özeti:
  Başlık:            'ŞOFÖR KULLANIM ÖZETİ'            → mobile.premium.report.drivingStyle
  Stil label:        'Kullanım Stili'                   → mobile.premium.report.drivingStyleLabel
  Skor label:        'Skor'                             → mobile.premium.report.scoreLabel
  Şarj stili:        'Şarj Stili'                      → mobile.premium.report.chargingStyle
  Tüketim sapması:   'Tüketim Sapması'                 → mobile.premium.report.consumptionDev
  DC oranı:          'DC Oranı'                         → mobile.premium.report.dcRatio
  Güven:             'Güven'                            → mobile.premium.report.confidence

Bölüm 3 — Ekonomik Özet:
  Başlık:            'EKONOMİK ÖZET'                   → mobile.premium.report.economicSummary
  Toplam enerji:     'TOPLAM ENERJİ'                   → mobile.premium.report.metric.totalEnergy
  Toplam maliyet:    'TOPLAM MALİYET'                  → mobile.premium.report.metric.totalCost
  Tahmini tasarruf:  'TAHMİNİ TASARRUF'               → mobile.premium.report.metric.savings
  Yakıt karşılaştırması: 'YAKITLA KARŞILAŞTIRMA'      → mobile.premium.report.metric.fuelComparison

Bölüm 4 — Harici Batarya Raporu:
  Başlık:            'HARİCİ BATARYA RAPORU'           → mobile.premium.report.externalBattery
  Boş durum:         'Harici batarya raporu eklenmemiş.' → mobile.premium.report.externalBattery.empty
  SOH label:         'SOH'                              → mobile.premium.report.metric.soh
  Tarih label:       'Tarih'                            → mobile.premium.report.metric.date
  Kaynak label:      'Sağlayıcı'                        → mobile.premium.report.metric.provider
  Rapor ekle başlık: 'Harici Rapor Ekle'               → mobile.premium.report.addExternal
  URL placeholder:   'Rapor URL'                       → mobile.premium.report.urlPlaceholder
  Tarih placeholder: 'YYYY-MM-DD'                      → (sabit format)
  SOH placeholder:   'SOH %'                           → mobile.premium.report.sohPlaceholder
  Sağlayıcı placeholder: 'TÜV / AVILOO / ...'         → mobile.premium.report.providerPlaceholder
  Kaydet butonu:     'KAYDET'                           → mobile.premium.report.save
  Rapor oluştur:     'RAPOR OLUŞTUR'                   → mobile.premium.report.generate
```

### 3. Mobile — Plan 22/23 Bileşenleri

```
ContextQuestionCard:
  SERVICE_VISIT seçenekleri:
    'Servis bakım / muayene'    → mobile.contextQ.serviceType.maintenance
    'Lastik değişimi'           → mobile.contextQ.serviceType.tires
    'Ön bakım / kontrol'        → mobile.contextQ.serviceType.inspection
    'Donanım değişimi'          → mobile.contextQ.serviceType.hardware
    'Diğer'                    → mobile.contextQ.serviceType.other

ServiceComplianceBlock:
  'SERVİS UYUMU'               → mobile.service.title
  Metrik — 'TOPLAM'            → mobile.service.metric.total
  Metrik — 'SONRAKİ'           → mobile.service.metric.next
  Metrik — 'ARALIK'            → mobile.service.metric.interval
  Durum etiketleri             → mobile.service.status.*
```

### 4. Mobile — Plan 24 Bileşeni

```
ChargingClusterBlock:
  'ŞARJ KÜMESI'                → mobile.charging.cluster.title
  Küme label'ları              → mobile.charging.cluster.type.*
```

### 5. Backend — ev-assessment.service.ts

Şu an backend 3 senaryo template'ini Türkçe olarak DB'ye yazar.
GB Market geldiğinde İngilizce metin de gerekecek.

```
Strateji seçenekleri:

A) Locale parametreli template (önerilen MVP için):
   createAssessment(vehicleId, ownershipId, input, locale: 'tr' | 'en' = 'tr')
   → renderTemplate(scenarioId, computed, locale)
   → DB'ye locale_code kolonu eklenir
   → İngilizce template'ler de yazılır

B) Sadece ID sakla, frontend render et:
   DB'de scenarioId + scenarioParams (JSON) saklanır
   Frontend createTranslator ile render eder
   → Daha esnek ama frontend'e mantık taşır

Seçim: Plan 32 (GB Market) başlamadan önce karar verilecek.
```

Senaryo şablonları (şu an hardcoded Türkçe, Plan 26):
```
HEAVY_USED_WORN → senaryoBody TR + EN gerekecek
UNDER_USED_CLEAN → senaryoBody TR + EN
NORMAL_USAGE → senaryoBody TR + EN
```

### 6. Backend — premium-vehicle-report.service.ts

```
chargingStyleLabel() return değerleri (Türkçe hardcoded):
  'Yoğun hızlı şarj kullanımı'   → backend locale param veya enum
  'Yüksek SOC eğilimi'           → 
  'Dikkatli ve AC ağırlıklı'     →
  'Normal takip'                 →

drivingStyleLabel() bant adları (Türkçe hardcoded):
  'Sakin'        → 
  'Dengeli'      →
  'Hafif agresif' →
  'Agresif'      →
  'Belirsiz'     →
```

---

## Uygulama Sırası

```text
1. dictionaries.ts'e yeni key'leri ekle (tr + en çiftleri)
2. App.tsx: AssessmentInputStep, AssessmentResultBlock → translate() ile sar
3. App.tsx: PremiumReportBlock → translate() ile sar
4. App.tsx: ContextQuestionCard SERVICE_VISIT options → locale-aware yap
5. App.tsx: ServiceComplianceBlock labels → translate()
6. ev-assessment.service.ts: locale parametresi ekle, İngilizce template yaz
7. premium-vehicle-report.service.ts: locale parametresi ekle
8. Migration: vehicle_assessments tablosuna locale_code kolonu ekle
9. TypeScript derleme kontrolü
```

---

## Para Birimi ve Sayı Biçimlendirme

```
Şu an hardcoded:
  TL simgesi: '₺'
  Ondalık: Türkçe formatı (. bin ayracı, , ondalık)

Plan 32 (GB) gelince:
  currency: 'TRY' → locale: 'tr-TR' → ₺
  currency: 'GBP' → locale: 'en-GB' → £

Mevcut vehicle_ownerships.preferred_currency kolonu kullanılabilir.
Formatlamak için Intl.NumberFormat yeterli — dış kütüphane gerekmez.
```

---

## Ön Koşul / Bağımlılık

```text
Plan 35 tamamlanmadan Plan 32 (GB Market Aktivasyon) başlayamaz.
Çünkü GB kullanıcısına hâlâ Türkçe string'ler gösterilir.

Plan 35 için önkoşul yok — bağımsız refactor planı.
```

---

## Başarı Kriteri

```text
- App.tsx'te hardcoded Türkçe string kalmaz (metrik label'lar dahil)
- Dil 'en' seçildiğinde tüm yeni bileşenler İngilizce render eder
- Backend template'leri locale parametresiyle ayrı dil döner
- TypeScript derleme hatası yok
```

---

## Durum: ⏳ BEKLEMEDE

Plan 32 (GB Market) açılmadan önce tamamlanacak.
