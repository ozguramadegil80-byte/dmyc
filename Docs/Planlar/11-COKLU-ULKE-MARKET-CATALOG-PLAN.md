# DMyC Çoklu Ülke / Market Katalog Planı

## Kısa Anlayış

Bu plan, çoklu dil foundation sonrasında DMyC katalog yapısının çoklu ülke/pazar gerçekliğine açılması için hazırlanmıştır.

Önemli ayrım:

```text
locale kullanıcıya gösterilecek dili belirler.
market_code kullanıcıya gösterilecek araç kataloğunu belirler.
```

Bu iki değer birbirinin yerine kullanılmaz.

Örnek:

```text
locale = en
market_code = TR

İngilizce arayüz, Türkiye aktif araç kataloğu.
```

```text
locale = tr
market_code = GB

Türkçe arayüz, İngiltere aktif araç kataloğu.
```

Bu planın amacı tüm İngiltere araçlarını tek seferde doldurmak değildir.

Amaç, TR dışındaki pazarları doğru modelleyecek altyapıyı kurmaktır.

---

## Kaynak Belgeler

Bu plan aşağıdaki kararların devamıdır:

```text
Docs/# 02-DOMAIN-MODEL-AND-DATASET.md
Docs/# 04-ROADMAP.md
Docs/Planlar/variant.md
Docs/Planlar/09-VEHICLE-REVIEW-EVIDENCE-ADMIN-MODEL.md
Docs/Planlar/10-GERCEK-KULLANIM-USAGE-PROFILE-PLAN.md
```

---

## Mevcut Durum

Mevcut katalog yapısı:

```text
vehicle_specs_master_v2.json
vehicle_variant_manifest.json
mobile_vehicle_catalog.json
vehicle_specs
vehicle_source_evidence
vehicle_spec_review_decisions
```

Mevcut katalog ağırlıklı olarak Türkiye aktif satış gerçekliğine göre yönetiliyor.

Bu doğru bir başlangıçtır; ancak global ürün için yeterli değildir.

İngiltere kullanıcısı, Türkiye'deki trim ve satış adlarını değil, İngiltere pazarında aktif olan araçları görmelidir.

---

## Temel Kararlar

### 1. Teknik Araç Gerçekliği Ayrı Kalır

`vehicle_specs` teknik variant gerçekliğini temsil eder.

Örnek:

```text
brand
model
variant
battery_net_kwh
wltp_range_km
ac_max_kw
dc_max_kw
drive_type
```

Bu alanlar pazar görünürlüğü değildir.

---

### 2. Pazar Görünürlüğü Ayrı Yönetilir

Bir teknik variantın hangi ülkede aktif katalogda görüneceği ayrı modeldir.

Önerilen tablo:

```sql
markets

code
name
default_locale
currency
distance_unit
is_active
created_at
updated_at
```

Önerilen tablo:

```sql
vehicle_spec_market_availability

id
vehicle_spec_id
market_code

local_display_name
local_sales_status

year_from
year_to

source_name
source_url
verification_level

created_at
updated_at
```

---

### 3. TR Default Market Olur

Mevcut aktif katalog ilk aşamada `TR` market availability olarak bağlanır.

Kural:

```text
official_sales_status = active/discontinued/partial verified kayıtlar TR için görünür olabilir.
legacy_reference kayıtlar TR aktif katalogunda görünmez.
needs_review veya unknown kayıtlar admin backlog olarak kalır.
```

Bu migration mevcut kullanıcı akışını bozmamalıdır.

---

### 4. GB İlk Genişleme Market'i Olur

İlk global genişleme hedefi:

```text
GB = United Kingdom
default_locale = en
currency = GBP
distance_unit = mile veya km karar bekliyor
```

GB katalogu TR kataloğunun İngilizce çevirisi değildir.

GB için ayrı kaynak/evidence gerekir.

---

### 5. Eksik Pazar Verisi Uydurulmaz

Bir araç TR'de aktif diye GB'de aktif kabul edilmez.

Bir model globalde var diye İngiltere kataloğuna alınmaz.

Kural:

```text
Kaynak yoksa market availability pending kalır.
Kullanıcıya aktif seçim olarak gösterilmez.
Admin veri kalite backlog'unda görünür.
```

---

## Faz 6J-1: Domain ve Migration Foundation

Amaç:

```text
Market kavramını veri modeline eklemek.
```

Kapsam:

- `markets` migration.
- `vehicle_spec_market_availability` migration.
- `TR` ve `GB` seed kayıtları.
- Mevcut `vehicle_specs` kayıtlarını TR availability ile bağlama stratejisi.

Kapanış kriterleri:

- `[x]` `markets` tablosu var.
- `[x]` `vehicle_spec_market_availability` tablosu var.
- `[x]` `TR` default market olarak seed edildi.
- `[x]` `GB` planlanan aktif market olarak seed edildi.
- `[x]` Mevcut TR katalog davranışı bozulmadı.

---

## Faz 6J-2: API Market Parametresi

Amaç:

```text
Public katalog API'si market'e göre araç döndürebilsin.
```

Kapsam:

- `GET /vehicle-specs?market=TR`
- `GET /vehicle-specs?market=GB`
- Market parametresi yoksa `TR` fallback.
- `legacy_reference`, `needs_review`, `unknown` kayıtların market aktif katalogundan ayrılması.
- DTO içinde gerekirse `marketCode`, `localDisplayName`, `localSalesStatus`.

Kapanış kriterleri:

- `[x]` Market parametresi API tarafından okunuyor.
- `[x]` Parametre yoksa TR dönüyor.
- `[x]` TR mevcut katalog ile uyumlu kalıyor.
- `[x]` GB veri yoksa boş veya pending olmayan güvenli cevap dönüyor.

---

## Faz 6J-3: Mobile Market Selection

Amaç:

```text
Mobil kullanıcı sade bir dil seçimi yaparken katalog pazarı cihaz bağlamından otomatik belirlensin.
```

Kapsam:

- Giriş ve kayıt ekranında Türkçe/English bayrak seçimi.
- Market cihaz locale ve saat diliminden `TR` veya `GB` olarak çıkarılır.
- Dil ve çıkarılan market AsyncStorage içinde saklanır.
- Katalog API çağrısı market parametresiyle yapılır.
- Kullanıcıya onboarding içinde teknik market/ülke katalog kartı gösterilmez.

Kapanış kriterleri:

- `[x]` Mobil giriş ve kayıt ekranında iki dil bayrağı var.
- `[x]` Çıkarılan market local state/AsyncStorage içinde saklanıyor.
- `[x]` Vehicle specs çağrısı market parametresi gönderiyor.
- `[x]` API kapalıysa local fallback TR davranışını bozmuyor.

---

## Faz 6J-4: Admin Market Availability Panel

Amaç:

```text
Admin aynı teknik araç kaydının pazar görünürlüğünü yönetebilsin.
```

Kapsam:

- Admin oturum açılışında ülke ve içerik dili seçimi.
- Oturum boyunca sabit kalan market çalışma alanı.
- Seçili market için aktif/backlog sayıları.
- Variant detayında market availability alanları.
- `local_display_name`, `local_sales_status`, `source_name`, `source_url`, `verification_level`.
- GB eksikleri için pending/evidence backlog görünürlüğü.

Kapanış kriterleri:

- `[x]` Admin girişinde ülke ve içerik dili seçimi var.
- `[x]` Seçilen market imzalı admin oturumunda tutuluyor.
- `[x]` TR katalog mevcut davranışını koruyor.
- `[x]` GB için availability olmayan kayıtlar aktif katalog gibi görünmüyor.
- `[x]` Admin GB availability kaydı oluşturabiliyor veya pending bırakabiliyor.

---

## Faz 6J-5: Export ve Seed Pipeline

Amaç:

```text
Market bazlı mobile catalog export üretmek.
```

Kapsam:

- `mobile_vehicle_catalog_TR.json`
- `mobile_vehicle_catalog_GB.json`
- Mevcut `mobile_vehicle_catalog.json` kısa vadede TR alias olarak kalabilir.
- Export scripti market parametresi alabilir.
- Validation scripti market availability tutarlılığını kontrol eder.

Kapanış kriterleri:

- `[x]` TR export mevcut mobil katalogla uyumlu.
- `[x]` GB export pending kayıtları aktif kataloga sokmuyor.
- `[x]` Export scripti market parametresiyle çalışıyor.
- `[x]` Validation market coverage raporu veriyor.

## Faz 6J-6: Admin Login ve Çalışma Alanı Oturumu

Amaç:

Admin panelini doğrudan erişimden çıkarıp ülke ve içerik dili bağlamını girişte kurmak.

Kapsam:

- Kullanıcı adı ve şifre ile admin girişi.
- Giriş sırasında `market_code` ve içerik dili seçimi.
- Panel menüleri ve yönetim arayüzü sabit Türkçe.
- Araç adı, yerel satış durumu ve market kaynakları seçilen içerik dilinde yönetilir.
- Admin sayfaları imzalı `HttpOnly` oturum olmadan açılamaz.
- Admin API uçları sunucular arası anahtar olmadan çağrılamaz.

Kapanış kriterleri:

- `[x]` Oturumsuz admin isteği login ekranına yönleniyor.
- `[x]` TR/Türkçe ve GB/English çalışma alanları girişte seçilebiliyor.
- `[x]` Panel görünür yüzü seçilen içerik dilinden bağımsız olarak Türkçe kalıyor.
- `[x]` Ülke değişimi yeni oturum açılmasını gerektiriyor.
- `[x]` Çıkış işlemi oturumu sonlandırıyor.
- `[x]` Admin API anahtarsız doğrudan erişime kapalı.

## Kapanış Özeti

```text
Migration 013 ile market tabloları kuruldu. TR ve GB marketleri seed edildi; mevcut
53 vehicle spec TR availability ile bağlandı. API, mobile ve admin market_code üzerinden
çalışıyor. TR public katalog 53 kayıt, GB public katalog 0 doğrulanmış kayıt dönüyor.
Admin GB tarafında 53 teknik kaydı pending availability backlog olarak görebiliyor ve
market kaydı oluşturabiliyor. TR/GB export dosyaları üretildi; market validation raporu
issue olmadan tamamlandı. GB araç verisi kaynak olmadan uydurulmadı.

Admin login foundation tamamlandı. Ülke ve içerik dili girişte seçiliyor; market çalışma
alanı oturum boyunca sabit kalıyor. Panel kabuğu Türkçe kalırken GB/English oturumunda
yerel araç adı, satış durumu ve kaynak içerikleri İngilizce yönetiliyor. Admin sayfaları
oturumla, admin API uçları ayrıca sunucular arası anahtarla korunuyor.
```

---

## İlk Uygulama Sırası

Önerilen sıra:

1. Migration planını ve tablo isimlerini kesinleştir.
2. `markets` ve `vehicle_spec_market_availability` migrationlarını yaz.
3. TR/GB seed et.
4. Mevcut aktif `vehicle_specs` kayıtlarını TR availability olarak bağla.
5. API `market` parametresini ekle.
6. Mobil katalog çağrısına market parametresi ekle.
7. Mobil market seçimi UI'ını kur.
8. Admin market dropdown ve availability alanlarını ekle.
9. Export scriptini market bazlı hale getir.
10. GB katalogu doldurmadan önce pending/evidence akışını doğrula.

---

## Riskler

- TR kataloğu yanlışlıkla GB kataloğu gibi gösterilebilir.
- Locale ile market birbirine bağlanırsa İngilizce kullanan Türkiye kullanıcısı yanlış katalog görebilir.
- GB teknik araçları kaynak olmadan aktif kataloga alınırsa güven modeli bozulur.
- Market availability `vehicle_specs` içine gömülürse aynı araç farklı ülkelerde yönetilemez hale gelir.

---

## Kabul Kriteri

Bu planın başarılı sayılması için:

```text
TR kullanıcı mevcut katalogu görmeye devam eder.
GB kullanıcı boş/pending olmayan güvenli GB katalog davranışı görür.
Sistem GB aracı uydurmaz.
Admin TR ve GB pazarlarını ayrı yönetebilir.
locale ve market_code ayrı kalır.
```

---

## Sonraki Veri Genişletme Kararı

Foundation sonrasında yapılacak ilk katalog operasyonu:

```text
GB resmi kaynaklarından brand + model + variant manifesti çıkar.
Kaynak kanıtlarını market_code=GB ile evidence havuzuna ekle.
Yalnız doğrulanan GB availability kayıtlarını public GB kataloğuna aç.
```
