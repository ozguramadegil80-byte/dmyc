# DMyC Variant Ailesi Dataset Revizyon Planı

## Kısa Anlayış

Mevcut `vehicle_specs_master.json` ilk katalog için yeterli bir başlangıç verdi, ancak araç gerçekliği yalnızca `brand + model` seviyesinde çözülemez. Birçok elektrikli araçta teknik veri, donanım ve satış gerçekliği `variant` seviyesinde değişiyor.

Bu nedenle yeni dataset yaklaşımı şu olmalı:

```text
brand
model
model family
variant spec
```

Yani kullanıcı mobilde yalnızca marka ve model seçmeyecek; modelden sonra gerçek satış varyantını seçecek. İlk karne de bu varyant kaydı üzerinden üretilecek.

## Problem

Eski yaklaşım:

```text
BMW -> i4 -> tek/eksik model kaydı
Tesla -> Model Y -> tek/eksik model kaydı
Togg -> T10X -> tek/eksik model kaydı
```

Yeni gerçek:

```text
BMW -> i4 -> i4 eDrive40 Sport Line / M Sport / Edition M Sport
Tesla -> Model Y -> Arkadan Çekiş / Long Range RWD / Long Range AWD / Performance
Togg -> T10X -> V1 Standart Menzil / V1 Uzun Menzil / V2 Uzun Menzil / V2 4More
```

Bu yüzden master JSON eksik çıktı. Eksik olan sadece teknik alanlar değil; katalog ekseni yanlış granülerlikte kurulmuş oldu.

## Ruhsat Variant Değildir

Ruhsat çoğu zaman DMyC'nin ihtiyaç duyduğu gerçek teknik variantı vermez. Ruhsat tarafında genelde araç ailesini çözmeye yarayan daha kaba bilgiler bulunur.

Örnek ruhsat gerçekliği:

```text
Marka: TOGG
Tip: T10X
Ticari Ad: T10X
```

veya:

```text
Marka: TESLA
Tip: Model Y
Ticari Ad: Model Y
```

Ama çoğu durumda şu teknik/satış variantları ruhsatta açıkça geçmez:

```text
V1
V2
4More
Long Range
Performance
AWD
```

Bu nedenle model:

```text
Ruhsat
≠
Variant
```

şeklinde kabul edilmelidir.

Gerçek dünya akışı:

```text
Ruhsat / OCR / manuel marka-model girişi
↓
Araç ailesi bulunur
↓
Variant manifest üzerinden aday variantlar çıkarılır
↓
Kullanıcı gerçek variantı seçer
↓
İlk karne variant spec üzerinden üretilir
```

Tesla örneği:

```text
Ruhsat:
Tesla Model Y

Kullanıcıya sor:
○ Model Y Arkadan Çekiş
○ Model Y Long Range Arkadan Çekiş
○ Model Y Long Range AWD
○ Model Y Performance
```

Togg örneği:

```text
Ruhsat:
TOGG T10X

Kullanıcıya sor:
○ T10X V1 RWD Standart Menzil
○ T10X V1 RWD Uzun Menzil
○ T10X V2 RWD Uzun Menzil
○ T10X V2 4More Obsidiyen
```

Bu yüzden variant manifest yalnızca katalog temizliği için değil, ruhsat/OCR sonrası kimlik çözümleme için de gereklidir. Ruhsat genellikle `brand + model` verir; batarya, menzil, çekiş, trim, ısı pompası ve performans seviyesini güvenilir biçimde vermez.

Önerilen ayrım:

```text
Vehicle Identity:
  brand
  model

Vehicle Variant:
  variant_display_name
  battery
  drive_type
  range_type
  trim
```

OCR ileride eklendiğinde hedef akış:

```text
Ruhsat tara
↓
Tesla Model Y bulundu
↓
4 variant ihtimali var
↓
Kullanıcı variant seçsin
```

Bu karar özellikle şu markalarda kritik kabul edilmelidir:

```text
Tesla
BMW
Mercedes-Benz
Volvo
Togg
```

## Variant Kesinliği İçin Kaynak Hiyerarşisi

Variant bilgisi regülasyon ve üretici tarafında vardır; ancak kullanıcının elindeki ruhsatta ürün diliyle açık ve okunabilir biçimde bulunması garanti değildir. Hatta bazı durumlarda ruhsat/OCR çıktısı model ailesini bile bulanık verebilir.

Bu yüzden DMyC, ruhsatı tek kesin kaynak kabul etmemelidir. Variant kesinliği için kaynak hiyerarşisi şöyle düşünülmelidir:

```text
1. Satış faturası
2. Araç teslim / sipariş sözleşmesi
3. Uygunluk belgesi / COC
4. Şasi no / VIN üzerinden üretici sistemi
5. Araç içi uygulama / infotainment
6. Yetkili servis kaydı
7. Kullanıcı destekli variant seçimi
```

Ürün akışı:

```text
Araç ailesi bulundu
↓
Variant kesin değil
↓
Kullanıcıya yardımcı seçim
```

Togg T10X örnek yardımcı seçim:

```text
Togg T10X'in hangi versiyonu?

○ V1 Standart Menzil
  52.4 kWh / RWD / 314 km

○ V1 Uzun Menzil
  88.5 kWh / RWD / 523 km

○ V2 Uzun Menzil
  88.5 kWh / RWD / 523 km

○ V2 4More
  88.5 kWh / AWD / 468 km
```

Kullanıcı V1/V2 adını hatırlamıyorsa sistem teknik ipuçlarıyla seçim yaptırmalıdır:

```text
Menzilin kaç km görünüyordu?
Batarya küçük mü büyük mü?
AWD / 4More mu?
Donanımda V2 özellikleri var mı?
```

Mobilde mutlaka şu seçenek bulunmalıdır:

```text
Varyantı bilmiyorum
```

Bu seçenek seçilirse sistem kesin variant uydurmaz:

```text
T10X - Varyant bilinmiyor
Veri güveni: düşük / Kullanıcı Verisi Bekliyor
İlk karne: genel T10X aile verisiyle
```

Bu fallback, DMyC'nin yalnızca araç katalog uygulaması değil, kullanıcının “benim araç tam olarak ne?” problemini çözen kimlik katmanı olmasını sağlar.

## Yeni Kaynak Manifest

Bu dosyadaki liste teknik spec kaynağı değildir. Bu liste, hangi `brand + model + variant` kayıtlarının master seed içinde ayrı ayrı doldurulacağını belirleyen variant manifesttir.

Market / ülke kararı:

```text
Variant manifest teknik variant gerçekliğini tanımlar.
Pazar manifesti ise bu variantın hangi ülkede kullanıcıya aktif katalog seçeneği olarak gösterileceğini tanımlar.
```

İlk v2 manifest Türkiye aktif katalog gerçekliğine göre kurulmuştur.

Çoklu ülke desteğinde manifest ekseni şu hale gelir:

```text
market_code + brand + model + variant
```

Örnek:

```json
{
  "market_code": "GB",
  "brand": "Tesla",
  "model": "Model Y",
  "variants": [
    "Model Y Rear-Wheel Drive",
    "Model Y Long Range All-Wheel Drive"
  ]
}
```

Bu karar çoklu dil desteğinden ayrıdır:

```text
locale = UI dili
market_code = aktif araç kataloğu
```

Bir İngiltere kullanıcısı İngilizce arayüzle GB kataloğunu görebilir. Aynı kullanıcı Türkçe arayüz seçerse yine GB kataloğunu görmelidir.

Eksik pazar kaydı uydurulmaz. Bir variantın GB pazarında aktif satıldığı doğrulanmamışsa `market_code=GB` aktif kataloguna alınmaz; admin pending/evidence işi olarak kalır.

```json
[
  { "brand": "BMW", "model": "i4", "variants": ["i4 eDrive40 Sport Line", "i4 eDrive40 M Sport", "i4 eDrive40 Edition M Sport"] },
  { "brand": "BMW", "model": "iX3", "variants": ["iX3 M Sport"] },
  { "brand": "BYD", "model": "Atto 2", "variants": ["Atto 2 Boost", "Atto 2 Comfort"] },
  { "brand": "BYD", "model": "Atto 3", "variants": ["Atto 3 Design"] },
  { "brand": "BYD", "model": "Dolphin", "variants": ["Dolphin Design"] },
  { "brand": "BYD", "model": "Seal", "variants": ["Seal Excellence AWD"] },
  { "brand": "BYD", "model": "Seal U EV", "variants": ["Seal U EV Design"] },
  { "brand": "BYD", "model": "Sealion 7", "variants": ["Sealion 7"] },
  { "brand": "Hyundai", "model": "Ioniq 5", "variants": ["Ioniq 5 Dynamic", "Ioniq 5 Dynamic Vision Roof", "Ioniq 5 Advance", "Ioniq 5 Progressive", "Ioniq 5 N"] },
  { "brand": "Hyundai", "model": "Ioniq 6", "variants": ["Ioniq 6 Progressive"] },
  { "brand": "KGM", "model": "Torres EVX", "variants": ["Torres EVX"] },
  { "brand": "Kia", "model": "EV3", "variants": ["EV3 Elegance", "EV3 Prestige"] },
  { "brand": "Kia", "model": "EV6", "variants": ["EV6 Prestige", "EV6 GT"] },
  { "brand": "MG", "model": "MG4 Electric", "variants": ["MG4 Electric Comfort", "MG4 Electric Luxury"] },
  { "brand": "MINI", "model": "Countryman Electric", "variants": ["Countryman E Classic", "Countryman SE ALL4 Favoured", "Countryman SE ALL4 JCW"] },
  { "brand": "Mercedes-Benz", "model": "EQE SUV", "variants": ["EQE 350 4MATIC AMG"] },
  { "brand": "Opel", "model": "Mokka Electric", "variants": ["Mokka Electric Ultimate"] },
  { "brand": "Peugeot", "model": "E-208", "variants": ["E-208 GT"] },
  { "brand": "Renault", "model": "Megane E-Tech", "variants": ["Megane E-Tech Techno", "Megane E-Tech Iconic"] },
  { "brand": "Skywell", "model": "ET5", "variants": ["ET5 LR Elite", "ET5 LR Premium", "ET5 Legend"] },
  { "brand": "Tesla", "model": "Model Y", "variants": ["Model Y Arkadan Çekiş", "Model Y Long Range Arkadan Çekiş", "Model Y Long Range AWD", "Model Y Performance"] },
  { "brand": "Togg", "model": "T10F", "variants": ["T10F V1 RWD Standart Menzil", "T10F V1 RWD Uzun Menzil", "T10F V2 RWD Uzun Menzil", "T10F V2 4More"] },
  { "brand": "Togg", "model": "T10X", "variants": ["T10X V1 RWD Standart Menzil", "T10X V1 RWD Uzun Menzil", "T10X V2 RWD Uzun Menzil", "T10X V2 4More Obsidiyen"] },
  { "brand": "Volvo", "model": "EX30", "variants": ["EX30 Core", "EX30 Plus", "EX30 Ultra"] },
  { "brand": "Volvo", "model": "EX40", "variants": ["EX40 Core", "EX40 Plus", "EX40 Ultra"] }
]
```

## Yeni Dataset Sözleşmesi

Yeni seed JSON, her variant için ayrı kayıt taşımalı.

Örnek hedef kayıt şekli:

```json
{
  "brand": "Togg",
  "model": "T10X",
  "variant": "T10X V1 RWD Standart Menzil",
  "variant_display_name": "T10X V1 RWD Standart Menzil",
  "model_family": "T10X",
  "year_from": 2023,
  "year_to": 2026,
  "official_sales_status": "active",
  "battery_gross_kwh": null,
  "battery_net_kwh": null,
  "wltp_range_km": null,
  "ac_max_kw": null,
  "dc_max_kw": null,
  "drive_type": "RWD",
  "vehicle_class": "C-SUV",
  "curb_weight_kg": null,
  "official_efficiency_wh_km": null,
  "recommended_daily_soc_min": 20,
  "recommended_daily_soc_max": 80,
  "heat_pump_available": null,
  "heat_pump_standard": null,
  "battery_chemistry": null,
  "charging_port_type": "CCS2",
  "towing_capacity_kg": null,
  "seats": 5,
  "source_name": null,
  "source_url": null,
  "verification_level": "needs_review"
}
```

Kurallar:

- `brand`, `model`, `variant` zorunlu.
- `variant` mevcut DB/import uyumluluğu için kalır.
- `variant_display_name` kullanıcıya gösterilecek satış varyantıdır.
- `model_family` aynı model ailesi altındaki variantları gruplamak için kullanılır.
- Teknik değer yoksa `null` bırakılır.
- Tahmin veya yorum kesin veri gibi yazılmaz.
- `verification_level` kaynak sınıfını ve doğrulama seviyesini temsil eder.
- `data_completeness_score` doluluk oranıdır.
- `data_confidence` sistemin kaynak sınıfı + doluluk üzerinden hesapladığı sonuçtur.
- Veri güveni elle yazılmaz; doluluk ve kaynak sınıfından deterministik hesaplanır.

## Canonical Kararı

`canonical_vehicles` marka/model ailesini temsil etmeli; `vehicle_specs` ise variant gerçekliğini taşımalı.

Önerilen anlam:

```text
canonical_vehicles:
  BMW i4
  Tesla Model Y
  Togg T10X

vehicle_specs:
  BMW i4 eDrive40 Sport Line
  BMW i4 eDrive40 M Sport
  Tesla Model Y Long Range AWD
  Togg T10X V2 4More Obsidiyen
```

Bu sayede mobil akış doğal kalır:

```text
Marka seç
Model seç
Variant seç
İlk karne
```

Alan anlamı:

```text
canonical_vehicles.model_name -> model ailesi
vehicle_specs.model_family -> variantların bağlı olduğu model ailesi
vehicle_specs.variant -> teknik/import anahtarı olarak satış varyantı
vehicle_specs.variant_display_name -> kullanıcıya gösterilecek satış varyantı adı
```

DB açısından `variant` alanı geriye uyumluluk için kalabilir. Ancak yeni migration aşamasında `variant_display_name` ayrı kolon olarak eklenirse admin ve mobil UI daha temiz ayrışır.

## Import Stratejisi

Yeni seed geldiğinde işlem sırası:

1. Variant manifest ile beklenen kayıt listesi çıkarılır.
2. Yeni seed JSON içindeki `brand + model + variant` anahtarı normalize edilir.
3. Manifestte olup seed içinde olmayan variantlar raporlanır.
4. Seed içinde olup manifestte olmayan variantlar `extra_variant_review` olarak raporlanır.
5. Her kayıt için canonical vehicle bulunur veya oluşturulur.
6. Her variant için `vehicle_specs` upsert edilir.
7. Eksik teknik alanlar admin field tablosunda görünür kalır.
8. Mobil export yeniden üretilir.

Upsert anahtarı:

```text
brand + model + variant
```

Bu aşamada eski `vehicle_specs_master.json` doğrudan overwrite edilmemeli. Önce karşılaştırma raporu alınmalı.

Yeni seed importunda önerilen hesap alanları:

```text
verification_level -> kaynak/doğrulama sınıfı
data_completeness_score -> dolu teknik alan / beklenen teknik alan
data_confidence -> Fabrika Verisi / Topluluk Verisi / Kullanıcı Verisi Bekliyor / Eksik Katalog Verisi
```

`data_completeness_score` ve `data_confidence` elle seed içine yazılmamalıdır. Import veya export sırasında hesaplanmalıdır.

## Mobil Akış Etkisi

Mevcut mobil seçim akışı korunur ama variant listesi gerçek satış varyantlarından gelmelidir.

Beklenen akış:

```text
1. Marka
2. Model
3. Variant
4. Karne
```

Variant ekranı artık sadece mevcut teknik kayıtlardan değil, manifestte tanımlı variant ailesinden de beslenebilir. Teknik alanları eksik olan variant seçilirse ilk karne yine açılır ama eksik alanlar `Bilinmiyor` veya `Kullanıcı Verisi Bekliyor` gibi dürüst dille gösterilir.

## Admin Review Etkisi

Admin ekranındaki ana görev:

```text
Eksik variant kaydını seç.
Boş JSON alanlarını gör.
Resmi veya topluluk kaynağına göre alanları doldur.
Kaydet.
```

Admin şunları yapmamalı:

- Güven skoru elle girmemeli.
- Kaynağı olmayan teknik değeri kesin veri gibi yazmamalı.
- Aynı model altındaki farklı variantları tek kayıtta birleştirmemeli.

## Kabul Kriterleri

- Manifestteki her variant için `vehicle_specs` tarafında ayrı kayıt oluşur.
- Mobil katalog exportu marka/model/variant kırılımını doğru verir.
- İlk karne seçilen variant üzerinden hesaplanır.
- Eksik alanlar admin field tablosunda net görünür.
- `Veri Güveni` etiketi kaynak ve doluluk üzerinden deterministic hesaplanır.
- `verification_level`, `data_completeness_score` ve `data_confidence` aynı şey gibi kullanılmaz.
- Kullanıcıya gösterilen satış adı `variant_display_name` üzerinden okunabilir.
- Eski model seviyeli kayıtlar yeni variant kayıtlarıyla çakışmaz; gerekirse `legacy_reference` yapılır.

## İlk Uygulama Sırası

1. Bu variant manifesti ayrı bir JSON dosyası olarak repo içine koy.
2. Yeni gelecek seed JSON için schema kontrolü yaz.
3. `brand + model + variant` normalize/upsert kuralını güncelle.
4. Mevcut master ile manifest fark raporu üret.
5. Yeni seed JSON geldikten sonra import denemesi yap.
6. Mobil exportu yeniden üret.
7. Mobil variant seçim ekranında yeni kayıtları doğrula.

Net pipeline:

```text
vehicle_variant_manifest.json
↓
vehicle_specs_master_v2.json
↓
manifest diff report
↓
variant bazlı upsert
↓
mobil export
```

## Kapanan Kararlar

- Manifest dosyasının kalıcı adı `vehicle_variant_manifest.json` olabilir.
- Yeni master dosya adı `vehicle_specs_master_v2.json` olabilir.
- Eski `vehicle_specs_master.json` arşivlenmeli mi, yoksa v2 ile değiştirilmeli mi karar verilecek.
- Variant isimlerinde Türkçe satış adı mı, global teknik ad mı primary olacak karar verilecek.
- `model_family` alanı DB’ye ayrı kolon olarak eklenecek mi, yoksa sadece JSON/import düzeyinde mi kalacak karar verilecek.
- `variant_display_name` yeni DB kolonu olarak eklenecek mi, yoksa ilk aşamada `variant` alanı ile aynı değer mi tutulacak karar verilecek.
