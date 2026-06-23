# DMyC Battery Lifecycle Planı

## Amaç

Bu planın amacı, şarj oturumlarından batarya yaşam döngüsü sinyali üretmek ve araç seviyesinde
ilk batarya kullanım profilini görünür hale getirmektir.

Bu faz batarya sağlığına kesin teşhis koymaz.

İlk hedef:

```text
Şarj oturumlarından EFC ve stress adjusted cycle üretmek.
Araç seviyesinde batarya yaşam özeti projection tablosu oluşturmak.
Kullanıcıya düşük güvenli ama dürüst batarya kullanım sinyali göstermek.
```

---

## Roadmap Bağlamı

Roadmap sırası:

```text
Faz 6 — Battery Lifecycle
```

Plan 12 kapsamında Route Fingerprint fazı kapanmıştır. Sıradaki ürün katmanı, şarj davranışını
batarya yaşam sinyaline çevirmektir.

Bağımlı mevcut temel:

```text
charge_sessions
charging_decision_events
vehicles
vehicle_ownerships
vehicle_specs
usage_profiles
```

Mevcut ürün dili kararı:

```text
Sistem gerçek batarya sağlığına kesin teşhis koymaz.
Bataryan yüzde X sağlıklı gibi kesin ifade kullanılmaz.
Sinyal, kullanım profili ve veri güveni dili kullanılır.
```

---

## Kapsam Dışı

Bu fazda yapılmayacak işler:

```text
Kesin SOH / health percentage iddiası
Servis teşhisi
OEM BMS verisi entegrasyonu
Hava durumu ve batarya sıcaklığı gerçek entegrasyonu
Community benchmark
İkinci el public karne
Batarya değişimi / servis sicili
```

---

## Veri Modeli

### battery_cycle_events

Her uygun şarj oturumundan tek batarya döngü olayı üretir.

Önerilen alanlar:

```text
id
vehicle_id
ownership_id
user_id
charge_session_id
start_soc
end_soc
soc_delta
efc_value
soc_band
charge_type
ambient_temp_c
estimated_battery_temp_band
soc_stress_score
temperature_stress_score
charge_power_stress_score
dc_stress_score
stress_multiplier
stress_adjusted_cycle
confidence_score
created_at
updated_at
```

Kurallar:

```text
charge_session_id tekildir.
start_soc ve end_soc yoksa event üretilmez.
soc_delta negatifse event üretilmez.
EFC = soc_delta / 100.
Stress adjusted cycle kesin sağlık değil, davranış ağırlıklı yıpranma sinyalidir.
```

### vehicle_battery_lifecycle_stats

Araç seviyesinde projection tablosudur.

Önerilen alanlar:

```text
vehicle_id
ownership_id
user_id
total_efc
total_stress_adjusted_cycles
avg_charge_start_soc
avg_charge_end_soc
ac_charge_count
dc_charge_count
dc_charge_ratio
high_soc_charge_count
low_soc_charge_count
estimated_high_soc_hours
estimated_low_soc_events
avg_stress_multiplier
battery_usage_grade
confidence_score
last_calculated_at
created_at
updated_at
```

---

## Fazlar

### Faz 13A: Plan ve Roadmap Senkronu

- `[x]` Roadmap Faz 6'nın sıradaki ürün fazı olduğu netleşir.
- `[x]` Plan 12'nin kapandığı ve yeni fazın buradan başladığı kayda geçer.
- `[x]` Roadmap aktif yürütme notu bu plana bağlanır.

### Faz 13B: DB Migration

- `[x]` `battery_cycle_events` tablosu eklenir.
- `[x]` `vehicle_battery_lifecycle_stats` tablosu eklenir.
- `[x]` `charge_session_id` tekil event ilişkisi kurulur.
- `[x]` Araç ve sahiplik indeksleri eklenir.

### Faz 13C: Battery Lifecycle Service

- `[x]` Şarj oturumundan EFC hesaplanır.
- `[x]` SOC bandı ve charge type çıkarılır.
- `[x]` Stress multiplier deterministik hesaplanır.
- `[x]` Araç seviyesinde lifecycle projection yenilenir.

### Faz 13D: Charge Session Entegrasyonu

- `[x]` `createChargeSession` sonrası battery lifecycle refresh çağrılır.
- `[x]` Eksik SOC veya geçersiz SOC oturumu sessizce dışarıda bırakılır.
- `[x]` Mevcut charge summary ve usage profile akışı bozulmaz.

### Faz 13E: API Okuma Yüzeyi

- `[x]` `GET /vehicles/:id/battery-lifecycle` eklenir.
- `[x]` Boş veri durumunda öğrenme mesajı döner.
- `[x]` API kesin batarya sağlığı yüzdesi döndürmez.

### Faz 13F: Mobil Görünürlük

- `[x]` Karne ekranında batarya yaşam sinyali kartı gösterilir.
- `[x]` EFC, stress adjusted cycle, DC oranı ve kullanım profili görünür olur.
- `[x]` UI metni kesin teşhis yerine sinyal/güven dili kullanır.
- `[x]` UI metinleri çoklu dil yapısına uygun anahtarlarla hazırlanır.

### Faz 13G: Doğrulama ve Smoke

- `[x]` SOC 20 → 80 şarjı 0.60 EFC üretir.
- `[x]` Yüksek SOC/DC şarjı daha yüksek stress multiplier üretir.
- `[x]` Eksik SOC event üretmez.
- `[x]` Projection toplamları doğru yenilenir.

---

## Kabul Kriterleri

Bu faz tamamlandı sayılırsa:

```text
Uygun şarj oturumundan battery_cycle_event üretilebiliyor.
Araç seviyesinde lifecycle projection güncelleniyor.
API batarya yaşam özetini döndürüyor.
Mobil karne ekranı batarya yaşam sinyalini gösteriyor.
Kesin batarya sağlığı iddiası yapılmıyor.
Eksik/veri güveni düşük oturumlar deterministik şekilde düşük güvenli veya dışarıda kalıyor.
```

---

## İlk Uygulama Kararı

İlk kodlama sırası:

```text
1. DB migration
2. BatteryLifecycleService
3. createChargeSession entegrasyonu
4. API okuma endpointi
5. Mobil görünürlük
6. Smoke doğrulama
```

Bu faz sağlık tahminiyle başlamamalıdır. Önce döngü ve davranış sinyali deterministik üretilmelidir.
---

## Uygulama Notları

2026-06-18 durumu:

```text
DB migration uygulandı.
API typecheck ve API build geçti.
Mobile typecheck geçti.
Mevcut db smoke geçti.
Battery lifecycle smoke geçti.
Faz 13 kapandı.
```