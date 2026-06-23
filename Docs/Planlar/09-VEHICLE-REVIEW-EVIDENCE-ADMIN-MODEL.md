# Vehicle Review Kanıt Havuzu ve Admin Karar Modeli

Bu doküman Faz 5D kapsamında araç dataset farklarının otomatik overwrite edilmeden, kanıt ve insan kararı olarak yönetilmesi için oluşturuldu.

## Neden Ayrı Model?

Araç teknik verilerinde görünen farklar her zaman hata değildir. Farkın sebebi şunlardan biri olabilir:

- Yeni model yılı
- Facelift
- Türkiye'ye özel paket
- Aynı model adının farklı batarya/çekiş varyantı
- Eski veya artık satılmayan trim
- Resmi sayfanın batarya kWh gibi bazı alanları açık vermemesi

Bu yüzden kaynakta görülen her değer doğrudan `vehicle_specs` tablosuna yazılmayacak.

## Veri Modeli

### vehicle_source_evidence

Ham kaynak kanıtını tutar.

Temel alanlar:

```text
vehicle_spec_id
canonical_vehicle_id
evidence_key
source_type
source_name
source_url
source_retrieved_at
brand
model
variant
field_values
conflict_fields
evidence_status
confidence_score
notes
raw_payload

market_code
source_country
local_sales_status
local_display_name
```

Kullanım örnekleri:

```text
Tesla resmi sayfası Model Y WLTP değerleri
Togg T10X katalog PDF teknik tablosu
BMW güncel i4 Türkiye sayfası
Mercedes güncel broşürünün EQE sedan verdiği, EQE SUV vermediği durumu
Tesla UK Model Y yerel satış varyantları
```

Market kararı:

```text
Kaynak kanıtı yalnızca teknik değer değil, pazar gerçekliği de taşır.
Tesla Türkiye kaynağı TR kataloğu için kanıttır.
Tesla UK kaynağı GB kataloğu için kanıttır.
Aynı model ailesindeki farklar otomatik hata sayılmaz; market_code ile ayrılır.
```

### vehicle_spec_review_decisions

Kanıta bakıldıktan sonra verilen insan kararını tutar.

Temel alanlar:

```text
vehicle_spec_id
evidence_id
decision_type
decision_status
decided_by
decided_at
field_decisions
resulting_verification_level
rationale
```

Örnek karar tipleri:

```text
update_existing_spec
create_new_variant
archive_legacy_spec
keep_existing_spec
mark_needs_more_evidence
```

## Admin Ekranında Gösterilecek Alanlar

Admin review ekranı tek satırda şu ayrımı gösterebilmelidir:

```text
Mevcut dataset değeri
Kaynak kanıt değeri
Çakışan alanlar
Kaynak tipi ve URL
Toplanma tarihi
Önerilen karar
Elle verilen son karar
Kararın gerekçesi
```

Örnek Tesla satırı:

```text
Dataset: Model Y Long Range AWD, WLTP 533 km
Kaynak: Tesla Türkiye, Premium Long Range AWD, WLTP 600 km
Karar: Yeni güncel variant olarak ayır.
Not: Batarya kWh resmi sayfada verilmediği için legacy datasetten korunur.
```

## Aktif Katalog Kuralı

```text
vehicle_specs: kontrollü katalog ve geçmiş referans.
vehicle_source_evidence: ham kaynak kanıtı.
vehicle_spec_review_decisions: elle verilmiş karar geçmişi.
mobile export: sadece kullanıcıya gösterilecek aktif katalog.
```

`legacy_reference` kayıtları DB'de tutulur; mobil export ve normal API listeleme dışında bırakılır.

Çoklu ülke kuralı:

```text
mobile export pazar bazlı üretilir.
TR export yalnızca TR aktif katalog kayıtlarını taşır.
GB export yalnızca GB aktif katalog kayıtlarını taşır.
Pazar doğrulaması olmayan kayıt aktif kullanıcı kataloğuna alınmaz.
```

## Kapanış Kararı

Faz 5D için ilk teknik temel yeterlidir:

- Kanıt havuzu tablosu var.
- Elle karar geçmişi tablosu var.
- Admin ekranında gösterilecek alanlar net.
- Dataset import/export kuralı net.

Gerçek admin arayüzü sonraki fazda ele alınmalıdır.
