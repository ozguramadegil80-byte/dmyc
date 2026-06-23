# Vehicle Dataset Field Audit

## Amaç

Bu doküman `vehicle_specs_master.json` alanlarının DB, API, mobil export ve ilk karne ekranına nasıl taşındığını takip eder.

Faz 5A kapsamı kaynak doğruluğunu yeniden araştırmak değil, mevcut dataset alanlarının ürün akışına eksiksiz taşınmasını sağlamaktır. Kaynak doğrulama ayrı fazda yapılmalıdır.

## Mevcut Dataset Durumu

Kaynak dosya:

```text
Docs/vehicle_specs_master.json
```

Mevcut kayıt sayısı:

```text
30 araç
```

Mevcut ana alanlar:

```text
brand
model
variant
year_from
year_to
official_sales_status
battery_gross_kwh
battery_net_kwh
wltp_range_km
ac_max_kw
dc_max_kw
drive_type
vehicle_class
curb_weight_kg
official_efficiency_wh_km
recommended_daily_soc_min
recommended_daily_soc_max
heat_pump_available
heat_pump_standard
battery_chemistry
charging_port_type
towing_capacity_kg
seats
source_name
source_url
verification_level
```

## Alan Taşıma Kararı

DB şeması bu alanları zaten taşıyordu. Eksik olan kısım API DTO ve mobil export katmanıydı.

Faz 5A ile mobile kadar taşınan ek alanlar:

```text
catalogKey
vehicleSpecId
officialSalesStatus
curbWeightKg
heatPumpAvailable
heatPumpStandard
towingCapacityKg
seats
sourceName
sourceUrl
```

## Stable ID Kararı

Local katalog ve API katalog arasında kaynak değişince seçim bozulmaması için iki ayrı kimlik alanı kullanılacaktır.

```text
catalogKey    -> kaynak bağımsız stabil katalog anahtarı
vehicleSpecId -> DB vehicle_specs uuid değeri
```

Mobil seçim saklama için `catalogKey` kullanılmalıdır.

API üzerinden vehicle oluşturma gerektiğinde `vehicleSpecId` tercih edilir; uyumluluk için `catalogKey` fallback olarak desteklenir.

## İlk Karneye Eklenen Alanlar

İlk karne ekranı artık şu ek dataset değerlerini gösterebilir:

```text
Verimlilik
Ağırlık
Isı pompası
Koltuk sayısı
Kaynak adı
```

Bu alanlar kesin teşhis değil, katalog görünürlüğü olarak sunulmalıdır.

## Sonraki Dataset İşi

Kaynak doğruluğu ve güncellik ayrı ele alınmalıdır:

```text
Togg
Tesla
BYD
Hyundai
Kia
BMW
Mercedes-Benz
```

Öncelik, Türkiye'de aktif satılan ve onboarding akışında ilk görülecek araçlar olmalıdır.
