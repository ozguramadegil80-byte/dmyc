# DMyC Araç Servis Bakım Periyotları Planı

## Amaç

Sistemde yüklü 53 elektrikli araç varyantının bakım periyotlarını tek bir `15.000 km` varsayımıyla değil, üretici/market/kılavuz kaynaklı kurallarla tutmak.

Mevcut durumda `vehicle_specs.service_interval_km` alanı 53 aracın tamamında boştur. API tarafında servis uyumu hesaplanırken boş değerler `15.000 km` fallback ile çalışmaktadır. Bu geçici davranış gerçek bakım takvimleri için yeterli değildir.

## Doğru Model

Elektrikli araçlarda bakım her zaman tek bir km aralığı değildir. Bazı markalar sabit km/ay kullanır, bazıları condition-based service kullanır, Tesla gibi bazıları da klasik periyodik servis yerine parça bazlı takvim verir.

Bu yüzden hedef model:

- `maintenance_rules`
- `vehicle_spec_id`
- `canonical_vehicle_id`
- `market_code`
- `rule_type`: `periodic_visit`, `item_schedule`, `condition_based`, `manual_required`
- `interval_km`
- `interval_months`
- `first_due_km`
- `first_due_months`
- `item_code`: `cabin_filter`, `brake_fluid`, `tire_rotation`, `coolant`, `hv_battery_check`, `general_inspection`
- `source_name`
- `source_url`
- `source_confidence`: `official_manual`, `official_web`, `dealer_source`, `community_unverified`, `research_needed`
- `notes`

`vehicle_specs.service_interval_km` sadece geriye dönük uyumluluk için kalmalı; ana hesap bu kural tablosundan yapılmalı.

## Gemini Çıktısı Kararı

Gemini'den alınan JSON çıktı ham veri olarak değerlidir, ancak doğrudan `maintenance_rules` tablosuna yazılmamalıdır.

Kontrol sonucu:

- JSON parse edilebilir.
- Araç sayısı 53/53 olarak tamamdır.
- Her araç için bakım kuralı adayı vardır.
- `researchNeeded`, `confidence`, `missingFields`, `warnings` alanları vardır.
- Kaynak URL'si olmayan kural yoktur.

Fakat çıktı kesin veri değildir:

- Varyant adları katalogla birebir eşleşmemektedir. Örnek: sistemde `BMW i4 eDrive40 Edition M Sport`, çıktıda `eDrive40 Edition M Sport`.
- Bazı kaynak URL'leri deep-link değil ana sayfadır. Örnek: `https://www.bmw.com.tr`, `https://www.kia.com.tr`, `https://www.volvocars.com/tr`.
- Bazı değerler model/market kılavuzu yerine genel marka yaklaşımı gibi görünmektedir.
- `official_web` görünen bazı kayıtlar, doğrudan bakım tablosu veya kullanım kılavuzu URL'si vermediği için otomatik doğrulanmış kabul edilmemelidir.

Bu nedenle Gemini çıktısı `maintenance_rule_candidates` tablosuna alınmalı, admin onayından sonra `maintenance_rules` tablosuna taşınmalıdır.

## Aday Veri Modeli

Kesin bakım kuralı ve aday bakım kuralı ayrı tutulmalıdır.

### maintenance_rule_candidates

- `id`
- `raw_payload`
- `brand`
- `model`
- `variant`
- `matched_vehicle_spec_id`
- `matched_canonical_vehicle_id`
- `match_status`: `exact`, `family_match`, `fuzzy_match`, `unmatched`
- `match_score`
- `market_code`
- `rule_type`
- `item_code`
- `interval_km`
- `interval_months`
- `first_due_km`
- `first_due_months`
- `source_name`
- `source_url`
- `source_quote`
- `source_confidence`
- `source_depth`: `manual_deep_link`, `official_deep_link`, `official_homepage`, `dealer_page`, `unknown`
- `research_needed`
- `warnings`
- `missing_fields`
- `admin_status`: `pending`, `approved`, `rejected`, `needs_source`
- `admin_note`

### maintenance_rules

Bu tablo sadece admin onaylı ve kaynak kalitesi kabul edilmiş kuralları tutar.

Zorunlu güvenlik kuralları:

- `source_url` boş olamaz.
- `official_manual` ve `official_web` kayıtları ana sayfa URL'si ile onaylanamaz.
- `interval_km` veya `interval_months` kesin değilse null kalır.
- `manual_required` veya `condition_based` kayıtları kullanıcıya "kesin bakım km'si" gibi gösterilmez.
- Tesla gibi item bazlı markalarda tek `periodic_service` kuralı üretilemez.

## Import ve Doğrulama Hattı

Gemini veya başka LLM çıktısı şu adımlardan geçmelidir:

1. JSON parse kontrolü yapılır.
2. 53 araçtan eksik/fazla var mı kontrol edilir.
3. `brand + model + variant` doğrudan eşleşme denenir.
4. Eşleşmezse `brand + model_family + variant_display_name` fuzzy eşleşmesi denenir.
5. `catalogKey` veya `vehicleSpecId` bulunmadan kesin tabloya yazılmaz.
6. Ana sayfa kaynakları `source_depth=official_homepage` yapılır ve admin onayına kapalı kalır.
7. Deep-link kullanım kılavuzu, bakım kitapçığı veya bakım tablosu kaynakları öncelik alır.
8. Aynı kural model ailesine uygulanıyorsa her varyanta bağlanır ama kaynak tekilleştirilir.
9. Çıktıdaki `researchNeeded=true` kayıtları kullanıcıya kesin bakım tavsiyesi olarak gösterilmez.

## Kaynak Güven Sınıfları

- `official_manual`: Kullanım kılavuzu, garanti/bakım kitapçığı, resmi PDF veya dijital manual.
- `official_web`: Resmi marka sitesinde doğrudan bakım periyodu veya bakım kalemi sayfası.
- `dealer_source`: Yetkili servis/distribütör sayfası.
- `community_unverified`: Forum, kullanıcı yorumu, servis deneyimi, üçüncü parti liste.
- `research_needed`: Bilgi eksik veya kaynak yeterli değil.

Ek sınıflandırma:

- `official_homepage`: Ana sayfa veya model sayfası; bakım periyodu kanıtı sayılmaz.
- `official_web_general`: Marka genel EV bakım yazısı; model/varyant kesinliği yoktur.
- `official_manual_deep_link`: Doğrudan kılavuz veya bakım tablosu; en güvenli kaynak.

## Sistemde Yüklü Araçlar

### BMW

- BMW i4 eDrive40 Edition M Sport
- BMW i4 eDrive40 M Sport
- BMW i4 eDrive40 Sport Line
- BMW iX3 M Sport

Bakım yaklaşımı: BMW i modellerinde sabit tek km yerine zaman/condition-based servis yaklaşımı görülüyor. Türkiye kılavuz veya yetkili servis dokümanı doğrulanmadan tek `service_interval_km` yazılmamalı.

Geçici kayıt: `condition_based`, `source_confidence=research_needed`

### BYD

- BYD Atto 2 Boost
- BYD Atto 2 Comfort
- BYD Atto 3 Design
- BYD Dolphin Design
- BYD Seal Excellence AWD
- BYD Seal U EV Design
- BYD Sealion 7

Bakım yaklaşımı: BYD Türkiye içeriklerinde elektrikli araçlar için genel olarak 2 yıl veya 30.000 km civarı bakım önerisinden bahsediliyor. Bu ifade model bazlı garanti/bakım kitapçığı yerine genel EV bakım içeriğidir.

Geçici kayıt: `periodic_visit`, `interval_km=30000`, `interval_months=24`, `source_confidence=official_web_general`

Kesinleştirme: Atto 2, Atto 3, Dolphin, Seal, Seal U EV, Sealion 7 için Türkiye garanti/bakım kitapçığı ayrı ayrı doğrulanmalı.

### Hyundai

- Hyundai Ioniq 5 Advance
- Hyundai Ioniq 5 Dynamic
- Hyundai Ioniq 5 Dynamic Vision Roof
- Hyundai Ioniq 5 N
- Hyundai Ioniq 5 Progressive
- Hyundai Ioniq 6 Progressive

Bakım yaklaşımı: Türkiye model kılavuzu veya servis planı doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### KGM

- KGM Torres EVX

Bakım yaklaşımı: Türkiye garanti/bakım dokümanı doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### Kia

- Kia EV3 Elegance
- Kia EV3 Prestige
- Kia EV6 GT
- Kia EV6 Prestige

Bakım yaklaşımı: EV6 için uluslararası kılavuzlarda 12 ay / 10.000 km adımlı kontrol tablosu görülüyor; ancak Türkiye EV3/EV6 garanti şartı ayrıca doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### Mercedes-Benz

- Mercedes-Benz EQE 350 4MATIC AMG SUV

Bakım yaklaşımı: Mercedes EQ araçlarda markete göre değişen Service A/B veya EV item schedule yaklaşımı var. Türkiye EQE SUV servis dokümanı doğrulanmadan tek km yazılmamalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### MG

- MG4 Electric Comfort
- MG4 Electric Luxury

Bakım yaklaşımı: MG kaynaklarında markete göre farklı aralıklar görülebiliyor. UK tarafında 15.000 mil / 12 ay, Avustralya tarafında elektrikli araçlar için 40.000 km / 24 ay bilgisi var. Türkiye için MG Motor Türkiye bakım planı doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### MINI

- MINI Countryman E Classic
- MINI Countryman SE ALL4 Favoured
- MINI Countryman SE ALL4 JCW

Bakım yaklaşımı: BMW/MINI tarafında condition-based ve parça bazlı bakım yaklaşımı olabilir. Countryman Electric Türkiye dokümanı doğrulanmalı.

Geçici kayıt: `condition_based`, `source_confidence=research_needed`

### Opel

- Opel Mokka Electric Ultimate

Bakım yaklaşımı: Opel/Vauxhall kaynaklarında 12 ay / 15.000 km veya markete göre farklı değerler görülebiliyor. Türkiye Mokka Electric kılavuzu doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### Peugeot

- Peugeot E-208 GT

Bakım yaklaşımı: Peugeot e-208 için bazı kaynaklarda ilk 12.500 km / 1 yıl kontrol ve sonra 25.000 km / 2 yıl bilgisi görülüyor; Türkiye E-208 bakım planı doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### Renault

- Renault Megane E-Tech Iconic
- Renault Megane E-Tech Techno

Bakım yaklaşımı: Türkiye için resmi Renault bakım planı doğrulanmalı. Gayriresmi kullanıcı kaynaklarında 20.000 km / 12 ay bilgisi görülüyor ancak sisteme kesin veri olarak yazılmamalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### Skywell

- Skywell ET5 Legend
- Skywell ET5 LR Elite
- Skywell ET5 LR Premium

Bakım yaklaşımı: Türkiye garanti/bakım dokümanı doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

### Tesla

- Tesla Model Y Arkadan Çekiş
- Tesla Model Y Long Range Arkadan Çekiş
- Tesla Model Y Long Range AWD
- Tesla Model Y Performance

Bakım yaklaşımı: Tesla Model Y için klasik periyodik servis km'si yerine item bazlı bakım takvimi tutulmalı.

Önerilen kayıtlar:

- `cabin_filter`: 24 ay
- `hepa_filter`: 36 ay
- `brake_fluid_check`: 48 ay, gerekirse değişim
- `tire_rotation`: 10.000 km veya diş derinliği farkı 1,5 mm
- `brake_caliper_cleaning`: tuzlu/kış şartlarında 20.000 km veya 12 ay

Geçici kayıt: `item_schedule`, `source_confidence=official_manual`

### Togg

- Togg T10F V1 RWD Standart Menzil
- Togg T10F V1 RWD Uzun Menzil
- Togg T10F V2 4More
- Togg T10F V2 RWD Uzun Menzil
- Togg T10X V1 RWD Standart Menzil
- Togg T10X V1 RWD Uzun Menzil
- Togg T10X V2 4More Obsidiyen
- Togg T10X V2 RWD Uzun Menzil

Bakım yaklaşımı: Togg SSS içinde bakım periyodu konusunda kullanıcı ihtiyacına göre çalışmaların sürdüğü ve parça değişim sıklığının kullanım kılavuzunda tanımlandığı belirtiliyor. Bu nedenle Togg için tek `20.000 km` veya `15.000 km` değeri yazılmamalı; T10X/T10F dijital kullanıcı kılavuzundan item bazlı kurallar çıkarılmalı.

Geçici kayıt: `manual_required`, `source_confidence=official_web_partial`

### Volvo

- Volvo EX30 Core
- Volvo EX30 Plus
- Volvo EX30 Ultra
- Volvo EX40 Core
- Volvo EX40 Plus
- Volvo EX40 Ultra

Bakım yaklaşımı: Volvo tamamen elektrikli bakım dokümanlarında markete göre 20.000 mil / 40.000 mil gibi planlar görünüyor; Avrupa/Türkiye EX30/EX40 kılavuzları doğrulanmalı.

Geçici kayıt: `manual_required`, `source_confidence=research_needed`

## Uygulama Fazları

### Faz 1 - Veri Modeli

- `maintenance_rules` migration ekle.
- `maintenance_rule_candidates` migration ekle.
- `vehicle_specs.service_interval_km` fallback kullanımını azalt.
- `service-compliance` hesaplamasını rule tablosundan okut.
- Kural bulunamazsa kullanıcıya "Üretici bakım takvimi doğrulanmadı" göster.

### Faz 2 - Kaynaklı Import

- Her marka/model için kılavuz veya resmi web kaynağı kaydet.
- Kaynak olmadan otomatik 15.000 km yazma.
- Market kodu zorunlu olsun: `TR`, `GB`, `EU`, `US` gibi.
- Gemini JSON çıktısını önce `maintenance_rule_candidates` tablosuna al.
- Import sırasında birebir eşleşen, fuzzy eşleşen ve eşleşmeyen araçları raporla.
- Deep-link olmayan resmi ana sayfaları otomatik `needs_source` yap.

### Faz 3 - Admin Doğrulama

- Admin panelde "Bakım Kuralı Adayları" ekranı aç.
- Eşleşen araç, kaynak URL, kaynak alıntısı ve uyarıları göster.
- Admin `onayla`, `kaynak iste`, `reddet`, `model ailesine uygula` aksiyonlarını kullanabilsin.
- Onaylanan adaylardan `maintenance_rules` satırları üret.
- Reddedilen adaylar silinmesin; audit için saklansın.

### Faz 4 - 10 Yıllık Plan

Her araç için 10 yıllık bakım çizelgesi üret:

- Periyodik servis ziyaretleri
- Kabin filtresi
- Fren hidroliği kontrol/değişim
- Lastik rotasyonu
- Soğutma sıvısı / batarya termal sistem kontrolü
- HV batarya görsel/diagnostic kontrolü
- Yazılım/OTA kontrolü

### Faz 5 - Kullanıcı ve Admin Panel

- Araç detayına "Bakım Kuralları" sekmesi ekle.
- Kural ekle/düzenle/sil.
- Kaynak URL ve güven seviyesi zorunlu.
- "Bu kural tüm varyant ailesine uygulansın" seçeneği ekle.
- Kullanıcı tarafında doğrulanmamış bakım periyodu için kesin km gösterme.
- Doğrulanmamış araçlarda "Üretici bakım takvimi doğrulanmadı" mesajı göster.

## İlk Karar

Mevcut 15.000 km fallback ürün içinde yanıltıcıdır. Bu değer sadece "kural yoksa geçici varsayım" olarak kalmalı, kullanıcıya kesin üretici periyodu gibi gösterilmemelidir.

Önce `maintenance_rule_candidates` ve `maintenance_rules` tabloları eklenmeli. Gemini çıktısı aday veri olarak içeri alınmalı. Tesla ve BYD gibi kaynakları nispeten net olan markalarla admin doğrulama başlatılmalı. Togg, BMW, MINI gibi condition/manual odaklı markalarda item bazlı kural çıkarılmadan kesin bakım km'si gösterilmemelidir.

## Kabul Kriterleri

- `[ ]` 53 araç Gemini/adayı JSON çıktısından parse edilir.
- `[ ]` 53 araçtan kaçı exact/fuzzy/unmatched eşleşti raporlanır.
- `[ ]` Ana sayfa URL'leri `official_homepage` olarak işaretlenir.
- `[ ]` `official_manual` olmayan hiçbir aday otomatik onaylanmaz.
- `[ ]` Admin onayı olmadan `maintenance_rules` tablosuna kayıt yazılmaz.
- `[ ]` `service-compliance` 15.000 km fallback'i kullanıcıya kesin bilgi gibi göstermez.
- `[ ]` Kural olmayan araçta "Üretici bakım takvimi doğrulanmadı" görünür.
- `[ ]` Tesla Model Y item bazlı kural olarak çalışır.
- `[ ]` En az bir periodic, bir condition-based ve bir item-schedule araç smoke testten geçer.
