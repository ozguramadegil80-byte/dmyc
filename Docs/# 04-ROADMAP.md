# 04-ROADMAP.md

# EV Karnesi / Vehicle Reality Layer

## Ürün Yol Haritası

Bu roadmap teknik yapılacaklar listesi değildir.

Amaç:

```text
Doğru sırada ilerlemek.

Erken optimizasyon yapmamak.

Önce veri üretmek.

Sonra görünürlük sağlamak.

En son insight satmak.
```

---

## Aktif Yürütme Notu

```text
Mevcut aktif yürütme planı:
Docs/Planlar/24-SARJ-DAVRANIS-KUMELEME-PLAN.md
```

### Kapanmış Planlar (sıralı)

```text
Plan 05  — React Native + PostGIS foundation        ✅
Plan 06  — Vehicle dataset field audit              ✅
Plan 07  — Vehicle source validation                ✅
Plan 08  — Vehicle needs-review variant resolution  ✅
Plan 09  — Vehicle review evidence admin model      ✅
Plan 10  — Gerçek kullanım / Usage Profile          ✅
Plan 11  — Çoklu ülke market catalog                ✅
Plan 12  — Route Fingerprint                        ✅
Plan 13  — Battery Lifecycle                        ✅
Plan 14  — Community Layer                          ✅
Plan 15  — Otomatik Trip Algısı (Native GPS)        ✅
Plan 16  — Menzil Güven Planı                       ✅
Plan 17  — Premium Güven Katmanı                    ✅
Plan 18  — Trip Recap ve Share                      ✅
Plan 19  — Aylık / Yıllık Karne                     ✅
Plan 20  — Araç Sicili                              ✅
Plan 21  — Public EV Karnesi + QR                  ✅
Plan 22  — Soru Motoru Aktivasyonu                 ✅
Plan 23  — Servis / Bakım Takip                    ✅
Plan 24  — Şarj Davranış Kümeleme                  ✅
Plan 25  — Insight Studio / B2B                    ✅
Plan 26  — Gün 0 Değerlendirme Motoru              ✅
Plan 27  — Premium EV Kullanım Raporu              ✅
```

### Gelecek Planlar (Şimdi Değil)

```text
Plan 28  — Anlık Yeniden Hesaplama                 ⏳ Kullanıcı talebi bekleniyor
Plan 29  — Abonelik / Ödeme Sistemi                ⏳ 50+ aktif kullanıcı bekleniyor
Plan 30  — Admin UI Paneli                         ⏳ İş hacmi artınca
Plan 31  — Plaka / VIN Doğrulama                   ⏳ B2B talep veya e-devlet API erişimi
Plan 32  — GB Market Aktivasyonu                   ⏳ TR validasyon sonrası
Plan 33  — OEM / OBD Telemetri                     ⏳ OEM partner anlaşması gerekir
Plan 34  — AI Destekli Özellikler                  ⏳ 500+ araç verisi sonrası
Plan 35  — i18n Tam Uyum                           ⏳ Plan 32 öncesi tamamlanacak
```

Plan 10 kapsamındaki ilk gerçek kullanım döngüsü kapanmıştır: kullanıcı kaydı,
vehicle ownership, takip modu, trip recorder, şarj davranışı, usage profile projection
ve İlk Karne v2 kapalıdır.

Çoklu dil ve çoklu ülke / market katalog foundation (Plan 11) kapanmıştır.
Route Fingerprint (Plan 12), Battery Lifecycle (Plan 13), Community Layer (Plan 14),
Native GPS auto-trip (Plan 15), Menzil Güven Planı (Plan 16), Premium Güven Katmanı (Plan 17)
ve Trip Recap / Share (Plan 18) kapanmıştır.

---

# Faz 0 — Foundation

**Durum: ✅ KAPANDI — Plan 10**

## Amaç

Araç, kullanıcı ve yolculuk temelini kurmak.

## Çıktı

```text
Kullanıcı kayıt olabilir.

Araç ekleyebilir.

Araç katalog verisini görebilir.

İlk gün görünürlük alabilir.
```

---

### Yapılacaklar

```text
Authentication

users

vehicles

vehicle_specs

vehicle_ownerships

Araç model normalizasyonu

İlk araç ekranı

WLTP görünürlüğü

Temel araç bilgileri
```

---

### Başarı Kriteri

```text
Kullanıcı araç ekledi.

Araç hakkında ilk değer aldı.
```

---

# Faz 1 — Trip Recorder

**Durum: ✅ KAPANDI — Plan 10 + Plan 15**

## Amaç

Gerçek kullanım verisini toplamaya başlamak.

## Çıktı

```text
Yolculuk kaydı
```

---

### Yapılacaklar

```text
trips

trip_points

GPS takip

Trip start (otomatik — hareket algısı ≥ 5 km/h, 15 sn debounce)

Trip stop (otomatik — duruş ≤ 2 km/h, 3 dakika debounce)

Mesafe hesabı

Süre hesabı

Hız hesabı
```

---

### Başarı Kriteri

```text
Kullanıcının ilk 20 yolculuğu kayıt altında.
```

---

# Faz 2 — Trip Context Engine

**Durum: 🔄 KISMİ KAPANDI — Plan 22 ile tamamlanacak**

## Amaç

Yolculuğa bağlam eklemek.

---

### Yapılacaklar

```text
trip_contexts             ✅ tablo mevcut

trip_behavior_signals     ✅ tablo mevcut

trip_context_questions    ✅ tablo mevcut

Hava durumu               ⬜ Plan 22

Yolcu                     ⬜ Plan 22

Klima                     ⬜ Plan 22

Yük                       ⬜ Plan 22

İlk soru motoru           ⬜ Plan 22

Sessizleşme motoru        ⬜ Plan 22
```

---

### Başarı Kriteri

```text
Sistem ilk çıkarımları yapabiliyor.
```

---

# Faz 3 — Charging Engine

**Durum: ✅ KAPANDI — Plan 10 + Plan 13**

## Amaç

Şarj oturumlarını tanımak.

---

### Yapılacaklar

```text
charge_sessions

charge_evidence

Şarj istasyonu tespiti

Şarj fotoğrafı

OCR

Maliyet hesabı
```

---

### Başarı Kriteri

```text
İlk doğrulanmış şarj oturumları oluştu.
```

---

# Faz 4 — İlk Karne

**Durum: 🔄 KISMİ KAPANDI — Plan 19 ✅ kapandı, Plan 26 (Gün 0) ile tamamlanacak**

## Amaç

Kullanıcıya görünür değer vermek.

---

### Yapılacaklar

```text
İlk Karne (first-card + usage profile)   ✅ Plan 10

monthly_reports                          ✅ Plan 19

annual_reports                           ✅ Plan 19

Enerji maliyeti                          ✅ Plan 19

Km başına maliyet                        ✅ Plan 19

Şarj sayısı                              ✅

Tüketim özeti                            ✅

Gün 0 değerlendirme motoru               ⬜ Plan 26
```

---

### Başarı Kriteri

Kullanıcı:

```text
Bu uygulama bana para ve tüketim görünürlüğü sağlıyor.
```

demeli.

---

# Faz 5 — Route Fingerprint

**Durum: ✅ KAPANDI — Plan 12**

## Amaç

Tekrarlayan rotaları öğrenmek.

---

### Yapılacaklar

```text
route_fingerprints

Sapma motoru

Normal rota profili

Tüketim benchmarkı
```

---

### Başarı Kriteri

```text
Ev → İş rotası öğrenildi.
```

---

# Faz 6 — Battery Lifecycle

**Durum: ✅ KAPANDI — Plan 13**

## Amaç

Batarya kullanım modelini kurmak.

---

### Yapılacaklar

```text
battery_cycle_events

vehicle_battery_lifecycle_stats

EFC

Stress Adjusted Cycle

SOC davranışı
```

---

### Başarı Kriteri

```text
İlk batarya yaşam sinyalleri oluştu.
```

---

# Faz 7 — Community Layer

**Durum: ✅ KAPANDI — Plan 14**

## Amaç

Topluluk benchmarklarını üretmek.

---

### Yapılacaklar

```text
similar_trip_clusters

route_community_benchmarks
```

---

### Başarı Kriteri

```text
Aynı araçlarla karşılaştırma yapılabiliyor.
```

---

# Faz 8 — Menzil Güven Planı

**Durum: ✅ KAPANDI — Plan 16**

## Amaç

İlk premium değer önerisini çıkarmak.

---

### Yapılacaklar

```text
route_plans

route_scenarios

route_strategies

route_charge_stop_candidates
```

---

### Kullanıcı Akışı

```text
Nereden?
↓
Nereye?
↓
Kaç kişi?
↓
Yük var mı?
↓
Tahmini sonuç
```

---

### Başarı Kriteri

Kullanıcı:

```text
Bu araçla bu yolu yapabilir miyim?
```

sorusuna cevap alıyor.

---

# Faz 9 — Premium Güven Katmanı

**Durum: ✅ KAPANDI — Plan 17**

## Amaç

Ücretli katmanı açmak.

---

### Yapılacaklar

```text
Google Maps entegrasyonu

Şarj durağı optimizasyonu

Canlı rota takibi

trip_advisories

Sesli Enerji Koçu
```

---

### Başarı Kriteri

Kullanıcı:

```text
Yol boyunca bana eşlik ediyor.
```

demeli.

---

# Faz 10 — Trip Recap ve Share

**Durum: ✅ KAPANDI — Plan 18**

## Amaç

Viral katmanı oluşturmak.

---

### Yapılacaklar

```text
trip_recaps

trip_share_cards
```

---

### Başarı Kriteri

Kullanıcı yolculuğunu paylaşmaya başlıyor.

---

# Faz 11 — Araç Sicili

**Durum: ✅ KAPANDI — Plan 20**

## Amaç

Araç merkezli geçmiş oluşturmak.

---

### Yapılacaklar

```text
vehicle_state_snapshots

vehicle_public_reports

transfer_requests

vehicle_drivers

trip_driver_assignments

co_presence_events
```

---

### Başarı Kriteri

Araç satılsa bile geçmiş devam ediyor.

---

# Faz 12 — Public EV Karnesi

**Durum: ⬜ SIRADA — Plan 21 (Faz 11 bağımlı)**

## Amaç

İkinci el güven katmanı oluşturmak.

---

### Yapılacaklar

```text
QR raporları

Public URL

Doğrulama seviyesi

Karne paylaşımı
```

---

### Başarı Kriteri

```text
EV Karnesi Var
```

rozeti oluşuyor.

---

# Faz 13 — Charging Behavior Intelligence

**Durum: ⬜ SIRADA — Plan 24**

## Amaç

Şarj davranışını modellemek.

---

### Yapılacaklar

```text
charging_decision_events    ✅ tablo ve API hazır

charging_need_clusters      ⬜ Plan 24
```

---

### Başarı Kriteri

İlk şarj karar noktaları oluşuyor.

---

# Faz 14 — Charging Demand Intelligence

**Durum: ⬜ SIRADA — Plan 24**

## Amaç

Şarj talep haritaları üretmek.

---

### Yapılacaklar

```text
charging_demand_hotspots
```

---

### Başarı Kriteri

```text
Talep burada oluşuyor.
```

diyebiliyoruz.

---

# Faz 15 — Insight Studio

**Durum: ⬜ SIRADA — Plan 25**

## Amaç

B2B analiz katmanını açmak.

---

### Yapılacaklar

```text
ad_segments

insight_queries

AND / OR paneli

OEM sorguları

Enerji şirketi sorguları

Şarj operatörü sorguları
```

---

### Başarı Kriteri

İlk kurumsal müşteri gerçek veri üzerinden analiz alıyor.

---

# Faz 16 — Vehicle Reality Layer

**Durum: ⬜ VİZYON**

## Amaç

Tam vizyon.

---

### Sonuç

Sistem artık:

```text
Araç ne yaptı?

Kullanıcı nasıl kullandı?

Batarya nasıl yaşlandı?

Şarj ihtiyacı nerede doğdu?

Araç değeri nasıl değişti?
```

sorularına cevap verebiliyor.

---

# Roadmap Prensibi

Önem sırası:

```text
Veri
↓
Görünürlük
↓
Karne
↓
Güven
↓
Premium
↓
Sicil
↓
Topluluk
↓
Insight
↓
B2B
```

Bu sıra bozulmayacaktır.

Çünkü insight satabilmek için önce gerçek veri gerekir.
