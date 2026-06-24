# Plan: Sürücü Zekası ve Kişiselleştirilmiş Menzil

**Hedef:** EV Karnesi'ni araç bazlı değil sürücü bazlı yapmak.  
Aynı model, aynı yük → farklı sürücü = farklı gerçek menzil.  
Sistem bunu ölçsün, açıklasın ve tahmin etsin.

---

## Faz A — Sürüş Davranışı (Temel)

**Durum:** Migration 041 hazır. Servis kodu yok.

### A1 — Behavior Analiz Servisi
- Trip kapandıktan sonra `trip_points` hız serisi okunur
- 3 saniyelik sliding window ile delta hesaplanır
- Eşik aşımları `trip_behavior_events`'e yazılır
- Trip başına `trip_eco_score` hesaplanır (formül: docs/behavior.md)

### A2 — Route Fingerprint Güncelleme
- Trip tamamlanınca `route_fingerprints.behavior_eco_score` rolling average güncellenir (α=0.3)
- `behavior_trip_count` artırılır
- İlk 3 trip'te score gösterilmez (yetersiz veri)

### A3 — Trip Özeti UI
- Yolculuk bittikten sonra özet kartında: kaç hard brake, kaç ani hızlanma, trip eco score
- "Bu yolculukta 2 sert fren yaptınız" tarzı

---

## Faz B — Sürücü Verimliliği Faktörü

### B1 — Driver Efficiency Factor
- `users` tablosuna `driver_efficiency_factor numeric(5,4) DEFAULT 1.0` eklenir
- Hesaplama: son 20 trip'in ağırlıklı eco_score ortalamasından türetilir
- Eco score 100 → factor 1.0, eco score 70 → factor 0.85, eco score 50 → factor 0.75
- Formül: `factor = 0.5 + (eco_score / 200)` (min 0.5, max 1.0)

### B2 — Menzil Tahmininde Kullanım
- Mevcut menzil hesabı: `battery_kwh × (1000 / efficiency_wh_km)`
- Yeni hesap: `× driver_efficiency_factor`
- Örnek: 613 km WLTP × 0.85 = 521 km gerçekçi menzil

---

## Faz C — Hava Durumu Entegrasyonu

### C1 — OpenWeatherMap Bağlantısı
- Trip başladığında (ya da bittiğinde) trip konumu + zaman ile `current weather` çekilir
- `trips` tablosuna eklenir:
  ```
  ambient_temp_c    numeric(5,2)
  weather_condition text   -- 'clear', 'rain', 'snow', 'cloudy'
  hvac_inferred     text   -- 'cooling', 'heating', 'none', 'unknown'
  ```
- Ücretsiz plan: 1000 çağrı/gün yeterli (her trip = 1 çağrı)

### C2 — HVAC Çıkarımı
- `ambient_temp_c > 25°C` → `hvac_inferred = 'cooling'`
- `ambient_temp_c < 5°C` → `hvac_inferred = 'heating'`
- Arası → `'none'`
- Bu çıkarım push bildirimi ile kullanıcıya onaylatılır (Faz D)

### C3 — Araç Kataloğuna HVAC Tüketimi
- `mobile_vehicle_catalog` JSON şemasına eklenir:
  ```
  hvacCoolingKw: number   -- klima tüketimi (varsayılan 2.5)
  hvacHeatingKw: number   -- ısıtma tüketimi (heat pump'sız 5.0, heat pump'lı 2.0)
  ```
- Heat pump bilgisi zaten var (`heatPumpStandard`) → heating kW otomatik seçilir
- Migration ile `vehicle_specs` tablosuna da eklenir

### C4 — Menzil Hesabına HVAC Dahil Etme
- `hvac_kwh = hvacCoolingKw × trip_duration_hours`
- Efektif menzil kaybı: `hvac_kwh / (efficiency_wh_km / 1000)` km
- Kullanıcıya: "Klimanız bu yolculukta ~28 km menzil düşürdü"

---

## Faz D — Push Bildirimleri (Klima Sorusu)

### D1 — Yolculuk Sonu Klima Bildirimi
- Trip bittikten **10-15 dakika** sonra gönderilir
- Koşul: `hvac_inferred = 'cooling'` VEYA `'heating'` (hava sıcaklığı eşiği aşıldı)
- Bildirim metni:
  - Sıcak: "Bugün X°C'ydi — klimayı açtınız mı? Menzil hesabınıza ekleyelim."
  - Soğuk: "Bugün X°C'ydi — ısıtma kullandınız mı?"
- Kullanıcı tıklayınca app içinde "Evet / Hayır" kartı açılır

### D2 — Öğrenme ve Susma Kuralı
- Kullanıcı "Evet" → `user_hvac_confirmations` +1
- **2 kez "Evet"** aynı koşulda (sıcak/soğuk) → artık sorulmaz, otomatik `hvac_inferred = 'cooling'` kabul edilir
- "Hayır" → o trip için `hvac_inferred = 'none'` yazılır
- **2 kez "Hayır"** → artık sorulmaz, otomatik `'none'` kabul edilir
- `users` tablosuna eklenir:
  ```
  hvac_cooling_learned  text DEFAULT 'unknown'  -- 'yes' | 'no' | 'unknown'
  hvac_heating_learned  text DEFAULT 'unknown'  -- 'yes' | 'no' | 'unknown'
  hvac_cooling_confirmations  integer DEFAULT 0
  hvac_heating_confirmations  integer DEFAULT 0
  ```

### D3 — Zamanlanmış Bildirim
- Trip sonu timestamp + 10 dakika → `setTimeout` (mevcut `unknownRouteNotifyTimerRef` pattern ile aynı)
- Sadece `ambient_temp_c` eşik dışındaysa ve `learned` = `'unknown'` ise tetiklenir

---

## Faz E — Karne ve Raporlama

### E1 — Sürücü Karnesi Sayfası
- Araç karnesi (mevcut) + Sürücü karnesi (yeni tab)
- Sürücü karnesi: eco_score trendi, davranış özeti, HVAC kullanım etkisi

### E2 — Rota Bazlı Karşılaştırma
- "Ev→İş hattında ortalama 8 kWh / 18 TL"
- "Bu davranışlarınızı iyileştirseniz tahminen 6.8 kWh / 15.3 TL (-%15)"
- Tasarruf hesabı: (mevcut_eco_score → hedef 85) delta × ortalama_rota_enerji

---

## Bağımlılıklar ve Sıra

```
A1 → A2 → A3          (behavior base — bağımsız, hemen yapılabilir)
B1 → B2               (driver factor — A1 tamamlandıktan sonra)
C1 → C2 → C3 → C4    (weather — bağımsız, API key lazım)
D1 → D2 → D3          (push — C1 ve C2 tamamlandıktan sonra)
E1 → E2               (UI — B ve C tamamlandıktan sonra)
```

## Dış Bağımlılıklar
- OpenWeatherMap API key (ücretsiz plan yeterli)
- `expo-notifications` zaten kurulu (A36-B'de eklendi)

---

## Migration Listesi
| No | İçerik |
|----|--------|
| 041 | `trip_behavior_events` + `route_fingerprints` behavior sütunları ✅ |
| 042 | `trips.ambient_temp_c`, `weather_condition`, `hvac_inferred` |
| 043 | `users` HVAC öğrenme sütunları |
| 044 | `vehicle_specs` HVAC tüketim sütunları |
| 045 | `users.driver_efficiency_factor` |
