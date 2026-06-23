# DMyC Gerçek Kullanım ve Usage Profile Planı

## Kısa Anlayış

Bu plan, katalog ve ilk karne foundation'ı kapandıktan sonra DMyC'nin gerçek kullanım verisine geçişini tanımlar.

Mevcut durumda:

- Variant bazlı araç kataloğu 53 kayıtla hazır.
- Mobil katalog export'u 53 kaydı taşıyor.
- API, araç kataloğu, kullanıcı, araç, sahiplik, şarj, trip ve admin review temelini taşıyor.
- Mobil uygulama marka, model, variant ve ilk karne akışını gösteriyor.
- Admin araç alanı, review evidence ve fotoğraf upload yüzeyleri çalışıyor.

Yeni hedef:

```text
Seçilen araç artık yalnızca local seçim olmayacak.
Araç backend'de kullanıcı, araç ve sahiplik bağlamına oturacak.
Trip ve şarj verisi bu gerçek bağlam üzerinden toplanacak.
Usage Profile deterministic projection olarak hesaplanacak.
İlk karne, fabrika verisi + kullanımdan öğrenilen veri ayrımına geçecek.
```

Temel prensip değişmez:

```text
Önce görünürlük ver.
Sonra veri iste.
Veri geldikçe güven seviyesini artır.
Emin değilsen unknown bırak.
AI karar vermez; deterministic motor karar üretir.
```

Çoklu dil prensibi:

```text
Veri ve event değerleri canonical key olarak kalır.
UI metinleri locale sözlüklerinden gelir.
İlk dil Türkçe'dir; İngilizce sözlük aynı key yapısıyla hazır tutulur.
Hardcoded metinler faz faz t() contract'ına taşınır.
```

Çoklu ülke / pazar prensibi:

```text
locale kullanıcıya gösterilecek dili belirler.
market_code kullanıcıya gösterilecek araç kataloğunu belirler.
Dil pazarı belirlemez; pazar dili belirlemez.
Default market TR, ilk genişleme market'i GB olarak planlanır.
```

---

## Kaynak Belgeler

Bu plan aşağıdaki mevcut kararların devamıdır:

```text
Docs/# 04-ROADMAP.md
Docs/# 02-DOMAIN-MODEL-AND-DATASET.md
Docs/03-BEHAVIOR-ENGINE.md
Docs/# 05-VEHICLE-BEHAVIOR-REALITY-MODEL.md
Docs/Planlar/05-REACT-NATIVE-POSTGIS-FOUNDATION-PLAN.md
Docs/Planlar/variant.md
Docs/Planlar/09-VEHICLE-REVIEW-EVIDENCE-ADMIN-MODEL.md
```

Bu plan katalog temizleme planı değildir. Eksik katalog alanları admin backlog olarak kalır. Bu planın odağı kullanıcı aracının gerçek kullanım verisine bağlanmasıdır.

---

## Mevcut Teknik Durum

Doğrulanan mevcut durum:

```text
vehicle_specs_master_v2.json: 53 kayıt
vehicle_variant_manifest.json: 53 variant
mobile_vehicle_catalog.json: 53 kayıt
PostGIS aktif
vehicle_specs: 53 kayıt
canonical_vehicles: 25 kayıt
vehicle_source_evidence: 53 kayıt
vehicle_spec_review_decisions: 53 kayıt
```

Mevcut API yüzeyleri:

```text
GET  /health
GET  /vehicle-specs
GET  /vehicle-specs/search
POST /users
POST /vehicles
POST /vehicle-ownerships
POST /usage-signals
POST /charge-sessions
POST /charge-evidence
POST /charging-decision-events
POST /trips
POST /trips/:id/points
POST /trips/:id/finish
GET  /vehicles/:id/usage-profile
GET  /vehicles/:id/charge-summary
GET  /vehicles/:id/trips
GET  /vehicles/:id/trip-summary
GET  /vehicles/:id/first-card
```

Mevcut boşluk:

```text
Mobilde gerçek veya minimum kullanıcı kayıt akışı yok.
Mobil araç seçimi backend vehicle/ownership kaydına bağlanmış değil.
Mobil takip modu seçimi yok.
Trip recorder API'de var ama mobilde ürün akışı yok.
Şarj davranışı API'de var ama mobilde kullanıcı yüzeyi yok.
Usage Profile tablosu var ama gerçek trip/charge verisinden hesaplanan projection motoru yok.
İlk karne hâlâ ağırlıklı olarak katalog/fabrika görünürlüğü veriyor.
```

---

## Faz Durum Özeti

```text
Kapalı fazlar:
- Faz 6I: Çoklu Dil Foundation
- Faz 6B: Kullanıcı kaydı ve backend ownership bağlamı
- Faz 6C: Takip modu seçimi
- Faz 6D: Mobil Trip Recorder MVP
- Faz 6E: Şarj davranışı ilk kullanıcı yüzeyi
- Faz 6F: Usage Profile Projection Motoru
- Faz 6G: İlk Karne v2
- Faz 6H: Admin Veri Kalite Backlog Ayrımı
- Faz 6A: Plan ve Roadmap Senkronizasyonu
- Faz 6J: Çoklu Ülke / Market Katalog Foundation

Açık kalan işler:
- Yok

Sıradaki uygulama fazı:
- Roadmap sonrası yeni ürün fazı kararı
```

---

## Faz 6A: Plan ve Roadmap Senkronizasyonu

Amaç:

```text
Kapanmış foundation işlerini tekrar açmadan yeni aktif fazı görünür yapmak.
```

Kapsam:

- Roadmap'teki eski genel faz sırası ile gerçek kapanış durumunu ayırmak.
- `Faz 6: Gerçek Kullanım ve Usage Profile` başlığını aktif uygulama fazı olarak kabul etmek.
- Katalog eksiklerini ürün fazı değil, admin veri kalite backlog'u olarak tanımlamak.

Kapanış kriterleri:

- `[x]` Yeni plan dosyası repo içinde yer alıyor.
- `[x]` Roadmap'e kısa aktif faz notu ekleniyor veya roadmap güncellemesi için ayrı karar veriliyor.
- `[x]` Faz 5I sonrası ilk uygulama adımı netleşiyor.

Kapanış notu:

```text
Roadmap içine kısa aktif yürütme notu eklendi. Roadmap ürün sırasını değiştirmeden
Docs/Planlar/10-GERCEK-KULLANIM-USAGE-PROFILE-PLAN.md dosyasını aktif uygulama planı
olarak işaretliyor. Kullanıcı kaydı, ownership, takip modu, trip recorder, şarj davranışı,
usage profile projection, İlk Karne v2 ve admin veri kalite backlog ayrımı kapalı fazlar
olarak bağlandı. Katalog eksiklerinin ürün fazını bloke etmeyip admin veri kalite backlog'u
olarak yönetileceği roadmap seviyesinde görünür hale getirildi.
```

Not:

```text
Roadmap ürün sırasını korur; bu dosya yürütme planıdır.
```

---

## Faz 6B: Kullanıcı Kaydı ve Backend Ownership Bağlamı

Amaç:

```text
Önce kullanıcı kayıt altına alınacak.
Sonra seçilen araç backend'de vehicle + vehicle_ownership bağlamına oturacak.
```

Kapsam:

- Mobilde basit kullanıcı kayıt ekranı oluşturma.
- Mobilde e-posta ve şifreyle tekrar giriş ekranı oluşturma.
- Karne ekranından çıkış yapıldığında login ekranına dönme.
- Kayıt alanları: kullanıcı adı, eposta, telefon, şifre, şifre doğrulama.
- Eposta ve telefon için ilk aşamada format/boşluk kontrolü yapma.
- Şifre ve şifre doğrulama eşleşmesini kontrol etme.
- Backend'de kullanıcı kaydını oluşturma veya mevcut kullanıcıyı yakalama.
- Seçilen `vehicleSpecId` veya `catalogKey` ile backend'de araç kaydı oluşturma.
- Oluşan kullanıcı ve araç için aktif ownership kaydı oluşturma.
- Mobil local state içinde backend `vehicleId`, `ownershipId`, `userId` değerlerini saklama.
- API kapalıysa local katalog fallback'ini bozmama.

Kapanış kriterleri:

- `[x]` Mobilde kullanıcı adı, eposta, telefon, şifre ve şifre doğrulama alanlarıyla kayıt ekranı var.
- `[x]` Kayıtlı kullanıcı e-posta ve şifreyle tekrar giriş yapabiliyor.
- `[x]` Çıkış sonrası mobil login ekranına dönüyor ve yeniden giriş yapılabiliyor.
- `[x]` Şifre ve şifre doğrulama eşleşmeden kayıt yapılmıyor.
- `[x]` Geçerli minimum kullanıcı bilgisiyle backend user kaydı oluşabiliyor.
- `[x]` Variant seçimi sonrası backend vehicle kaydı oluşabiliyor.
- `[x]` Vehicle ownership kaydı oluşabiliyor.
- `[x]` Mobil seçili araç backend kimlikleriyle saklanıyor.
- `[x]` API kapalıysa local ilk karne akışı çalışmaya devam ediyor.
- `[x]` Aynı cihazda aynı araç tekrar tekrar gereksiz duplicate üretmiyor veya duplicate davranışı açıkça yönetiliyor.

Kapanış notu:

```text
Basit kullanıcı kayıt ekranı ve e-posta/şifre login ekranı mobil akışın giriş kapısı oldu. Backend `users` tablosuna `username` ve `password_hash` alanları eklendi; şifre scrypt hash ile saklanıyor ve response içinde dönmüyor. Kayıt sonrası seçilen variant için backend vehicle ve active ownership oluşturuluyor. Mobil, user/vehicle/ownership kimliklerini AsyncStorage içinde saklıyor; aynı kullanıcı yeniden giriş yaptığında cihazdaki mevcut binding yeniden kullanılabiliyor. Karne ekranındaki çıkış işlemi kullanıcı oturumunu kapatıp login ekranına döndürüyor. API erişimi yoksa local ilk karne akışı korunuyor.
```

Riskler:

- E-posta doğrulaması ve yenilenebilir erişim token'ı sonraki authentication seviyesinde ele alınmalıdır.
- Şifre saklama backend tarafında hash olmadan yapılmamalıdır.
- Duplicate vehicle/ownership üretimi erken dönemde veri kirliliği yaratabilir.
- Telefon numarası cihazdan veya operatörden otomatik okunabiliyor varsayılmamalıdır.

Karar:

```text
İlk aşamada basit kayıt akışı kurulacak.
Kullanıcıdan telefon numarası elle alınacak.
Telefon numarası operatör/SIM üzerinden otomatik okunmaya çalışılmayacak.
Telefon doğrulama ileride OTP ile yapılacak.
Google ile giriş daha sonra ikinci auth seviyesi olarak eklenecek.
Backend'e yazılan her araç, trip ve şarj kaydı user/vehicle/ownership bağlamıyla yazılmalıdır.
```

---

## Faz 6C: Takip Modu Seçimi

Amaç:

```text
Kullanıcıya veri girişi dayatmadan sistemin hangi doğruluk seviyesinde çalışacağını açıkça seçtirmek.
```

Modlar:

```text
Temel Takip
Gelişmiş Takip
Hassas Takip
```

Temel Takip:

- Fabrika verisi.
- GPS yolculuk takibi.
- Tahmini tüketim.
- Tahmini menzil görünürlüğü.
- Ek veri girişi zorunlu değil.

Gelişmiş Takip:

- Temel takibe ek olarak gerektiğinde SOC doğrulaması.
- Şarj başlangıç/bitiş yüzdesi opsiyonel.

Hassas Takip:

- Fiş, fatura veya belge ile doğrulama.
- Gerçek kWh ve maliyet hesapları.

Kapanış kriterleri:

- `[x]` Mobil onboarding içinde takip modu seçimi var.
- `[x]` Seçilen takip modu `usage_signals` veya ilgili profile payload'ına yazılıyor.
- `[x]` Kullanıcı veri girmezse sistem çalışmayı durdurmuyor.
- `[x]` UI dili "veri vermezsen çalışmam" demiyor.

Kapanış notu:

```text
Kayıt sonrası mobil akışa `Temel Takip`, `Gelişmiş Takip` ve `Hassas Takip` seçim ekranı eklendi. Seçim AsyncStorage içinde saklanıyor ve araç backend binding'i kurulduğunda `tracking_mode_selected` usage signal olarak `mobile_onboarding` kaynağıyla yazılıyor. Usage signal yazımı başarısız olursa kullanıcı akışı ve vehicle/ownership bağlamı bozulmuyor; local takip modu korunuyor. Takip modu ekranı veri girişi dayatmıyor, sadece doğruluk seviyesini açıklıyor.
```

---

## Faz 6D: Mobil Trip Recorder MVP

Amaç:

```text
Kullanıcı ilk gerçek yolculuğunu başlatıp bitirebilsin.
```

Kapsam:

- GPS izin akışı.
- Yolculuk başlat.
- GPS point buffer.
- Yolculuk bitir.
- Mesafe, süre ve ortalama hız özeti.
- Backend API'ye trip ve point yazma.
- Sürücü bilinmiyorsa `unknown` bırakma.

Kapanış kriterleri:

- `[x]` Mobilde yolculuk başlatılabiliyor.
- `[x]` Mobilde yolculuk bitirilebiliyor.
- `[x]` Trip point verisi backend'e yazılıyor.
- `[x]` Trip summary mobilde görülebiliyor.
- `[x]` Driver status bilinmiyorsa `unknown`.
- `[x]` API kapalı veya ağ kopuksa kullanıcıya dürüst durum gösteriliyor.

Kapanış notu:

```text
Mobil ilk karne sonrasına Trip Recorder ekranı eklendi. Backend ownership bağı varsa kullanıcı yolculuk başlatabiliyor, GPS noktası ekleyebiliyor ve yolculuğu bitirebiliyor. Browser/cihaz geolocation mevcutsa gerçek konum okunuyor; konum alınamazsa MVP doğrulaması için deterministic test noktası kullanılıyor ve kullanıcıya durum mesajı gösteriliyor. Trip verisi `POST /trips`, `POST /trips/:id/points`, `POST /trips/:id/finish` endpointlerine yazılıyor; `GET /vehicles/:id/trip-summary` mobil özet kutularında gösteriliyor. HTTP smoke testte completed trip, distance, duration, avg speed ve `unknown` driver status doğrulandı.
```

İlk sınır:

```text
Bu faz rota zekâsı değildir.
Bu faz yalnızca gerçek yolculuk verisini temiz toplamaktır.
```

---

## Faz 6E: Şarj Davranışı İlk Kullanıcı Yüzeyi

Amaç:

```text
Şarj oturumu ve şarj karar anı kullanıcıdan minimum sürtünmeyle alınabilsin.
```

Kapsam:

- "Şarj ettim" aksiyonu.
- Başlangıç SOC opsiyonel.
- Bitiş SOC opsiyonel.
- kWh ve maliyet opsiyonel.
- Şarj lokasyonu opsiyonel.
- Şarj karar anı, şarj oturumundan ayrı tutulur.

Kapanış kriterleri:

- `[x]` Mobilde charge session oluşturulabiliyor.
- `[x]` Mobilde charging decision event oluşturulabiliyor.
- `[x]` Boş alanlar uydurulmuyor.
- `[x]` Eksik veri varsa güven dili düşük/tahmini kalıyor.
- `[x]` Charge summary mobilde görülebiliyor.

Kapanış notu:

```text
Mobil karne sonrasına "Şarj Ettim" akışı eklendi. Kullanıcı başlangıç SOC, bitiş SOC, kWh,
maliyet, şarj yeri, karar nedeni ve hedef SOC alanlarını opsiyonel olarak girebiliyor.
Boş alanlar API payload'ına uydurma 0 değerleriyle yazılmıyor; eksik veri düşük güvenli/tahmini
dilde kalıyor. Kayıt sırasında charge session ve bundan ayrı charging decision event oluşturuluyor.
Kayıt sonrası charge summary mobilde oturum sayısı, toplam kWh, toplam maliyet ve ortalama güven
olarak gösteriliyor. HTTP smoke testte charge session, decision event ve summary zinciri doğrulandı.
```

İlk sınır:

```text
OCR, fiş işleme ve otomatik istasyon tespiti bu fazın zorunlu parçası değildir.
```

---

## Faz 6F: Usage Profile Projection Motoru

Amaç:

```text
Trip ve şarj verilerinden aracın kullanım gerçekliğini deterministic olarak hesaplamak.
```

Hesaplanacak ilk alanlar:

```text
avg_daily_km
avg_weekly_km
city_trip_ratio
highway_trip_ratio
dc_charge_ratio
home_charge_ratio
avg_start_soc
avg_end_soc
confidence_score
last_calculated_at
```

Kapsam:

- Trip tamamlandığında profile refresh.
- Charge session oluştuğunda profile refresh.
- Veri yetersizse profile `unknown` veya düşük confidence kalır.
- Kullanıcı seçimiyle profile tipi kesinleştirilmez; projection hesaplar.

Kapanış kriterleri:

- `[x]` Trip sonrası `usage_profiles` güncelleniyor.
- `[x]` Charge session sonrası `usage_profiles` güncelleniyor.
- `[x]` Veri yetersizliğinde alanlar uydurulmuyor.
- `[x]` Confidence deterministic hesaplanıyor.
- `[x]` `GET /vehicles/:id/usage-profile` gerçek projection verisi dönüyor.

Kapanış notu:

```text
`UsageProfileService` eklendi. Completed trip ve charge session sonrası aynı deterministic
projection motoru çalışıyor ve `usage_profiles` kaydı vehicle bazında upsert ediliyor.
Trip verisinden avg_daily_km, avg_weekly_km, city_trip_ratio ve highway_trip_ratio;
şarj verisinden dc_charge_ratio, home_charge_ratio, avg_start_soc ve avg_end_soc
hesaplanıyor. Veri yoksa alanlar null kalıyor, profile_type `unknown` dönüyor.
Confidence trip ve charge gözlem sayısına göre deterministic hesaplanıyor. HTTP smoke testte
boş profilin unknown dönmesi, trip + charge sonrasında observed profile ve gerçek projection
alanlarının dönmesi doğrulandı.
```

İlk sınır:

```text
Usage Profile bir form cevabı değildir.
Usage Profile gözlem, çıkarım ve doğrulama sonucudur.
```

---

## Faz 6G: İlk Karne v2

Amaç:

```text
İlk karne artık yalnızca fabrika görünürlüğü değil, kullanıcıdan öğrenilen gerçeklik sinyallerini de gösterir.
```

Yeni karne ayrımı:

```text
Fabrika Verisi
Tahmini Gerçek Menzil
Senin Kullanımından Öğrenilenler
Veri Güveni
Eksik / Beklenen Sinyaller
```

Kapanış kriterleri:

- `[x]` First card endpoint usage profile verisini dikkate alıyor.
- `[x]` Mobil summary ekranı fabrika verisi ile kullanım verisini ayırıyor.
- `[x]` Veri yokken ekran boş kalmıyor.
- `[x]` Veri geldikçe karne dili "öğreniyor"dan "tahmini" veya "daha güvenilir" seviyesine geçiyor.
- `[x]` Batarya sağlığı gibi kesin teşhis dili kullanılmıyor.

Kapanış notu:

```text
First card endpoint usage profile projection verisini response'a ekliyor. Response artık
Fabrika Verisi, Tahmini Gerçek Menzil, Senin Kullanımından Öğrenilenler, Veri Güveni ve
Eksik / Beklenen Sinyaller ayrımını taşıyor. Mobil karne ekranı fabrika/katalog teknik
alanlarını ve kullanımdan öğrenilen günlük km, haftalık km, ev şarj oranı ve SOC ortalamasını
ayrı bloklarda gösteriyor. Veri yoksa ekran boş kalmıyor; "Sinyal bekleniyor" ve "Öğreniyor"
dili korunuyor. Trip + charge verisi geldikçe dil "Tahmini" seviyesine geçiyor. Batarya sağlığı
veya kesin teşhis dili kullanılmadı. HTTP smoke testte first-card response'unun usage profile
öncesi ve sonrası değiştiği doğrulandı.
```

---

## Faz 6H: Admin Veri Kalite Backlog Ayrımı

Amaç:

```text
Katalog eksikleri ürün fazını bloke etmesin; admin veri kalitesi olarak yönetilsin.
```

Mevcut backlog sinyalleri:

```text
research_needed kayıtlar
official_sales_status unknown kayıtlar
fotoğrafı olmayan araçlar
kaynak değeri zayıf veya eksik alanlar
```

Kapanış kriterleri:

- `[x]` Admin araç ekranında veri kalite filtreleri net.
- `[x]` Mobil aktif katalogu etkileyen eksikler ayrı görünüyor.
- `[x]` Arka plan katalog eksikleri ayrı görünüyor.
- `[x]` Eksik veri uydurulmuyor; kaynak/kanıt gelene kadar pending kalıyor.

Kapanış notu:

```text
Admin katalog ekranına veri kalite filtresi eklendi. Marka dropdown'u korunarak seçili marka altında
Mobil aktif, Backlog, Fotoğraf, Araştırma ve Zayıf kaynak filtreleriyle liste daraltılıyor. Üst metrikler
mobil aktif katalog, arka plan backlog ve fotoğraf eksiği sayılarını ayrı gösteriyor. Seçili varyant
detayında kalite bağlamı görünür: mobil aktif katalog eksiği, arka plan veri kalite backlogu veya hazır
aktif katalog olarak ayrılıyor. Hiçbir eksik alan otomatik doldurulmuyor; research_needed, unknown,
needs_review, zayıf kaynak ve fotoğraf eksikleri admin pending işi olarak kalıyor.
```

---

## Faz 6I: Çoklu Dil Foundation

Amaç:

```text
Ürün büyürken UI metinleri tek dile kilitlenmesin; veri modeli canonical kalsın.
```

Kapsam:

- Web admin için `tr/en` sözlük yapısı.
- Mobil için `tr/en` sözlük yapısı.
- Default locale olarak Türkçe.
- İlk etapta admin katalog kalite metinleri, mobil takip modu, step başlıkları ve temel format helper'ları.
- Katalog/event/status gibi machine value alanlarını çevirmeden koruma.

Kapanış kriterleri:

- `[x]` Web tarafında locale sözlüğü ve `t()` helper'ı var.
- `[x]` Mobil tarafında locale sözlüğü ve `t()` helper'ı var.
- `[x]` Türkçe default metinler bozulmadan çalışıyor.
- `[x]` İngilizce karşılıklar aynı key contract'ıyla hazır.
- `[x]` Canonical veri değerleri display metinlerden ayrılıyor.

Kapanış notu:

```text
`apps/web/src/i18n` ve `apps/mobile/src/i18n` altında bağımlılıksız locale foundation kuruldu.
İlk locale `tr`, ikinci locale `en` olarak hazırlandı. Admin katalog kalite filtresi/metric metinleri,
mobil takip modu, step başlıkları, binding/API/trip durumları, usage profile güven dili ve temel format
fallback'leri `t()` contract'ına taşındı. Veri tarafındaki official_sales_status, verification_level,
profile_type ve tracking mode gibi canonical değerler çevrilmedi; yalnızca UI display metinleri locale
sözlüğünden geliyor.
```

---

## Faz 6J: Çoklu Ülke / Market Katalog Foundation

Amaç:

```text
Kullanıcıya yalnızca arayüz diline göre değil, bulunduğu/seçtiği pazara göre doğru araç kataloğu göstermek.
```

Kapsam:

- `locale` ve `market_code` ayrımını ürün ve veri modelinde net tutma.
- Mevcut TR kataloğunu default market olarak kabul etme.
- GB pazarını ilk genişleme market'i olarak planlama.
- Market bazlı aktif katalog, local display name, sales status ve evidence kaynağı modelini kurma.
- Giriş ve kayıt ekranına Türkçe/English dil bayrakları ekleme.
- Katalog pazarını cihaz locale ve saat diliminden otomatik çıkarma.
- Admin katalog ekranına market filtresi ve market availability yönetimi ekleme.

Kapanış kriterleri:

- `[x]` Domain modelde market availability kararı net.
- `[x]` `markets` ve `vehicle_spec_market_availability` veri modeli planlandı veya migration'a hazır.
- `[x]` Mevcut TR katalog kayıtları default market olarak bağlandı.
- `[x]` API `market` parametresiyle katalog dönebilecek hale getirildi.
- `[x]` Mobil katalog seçimi `locale` yerine `market_code` ile filtreleniyor.
- `[x]` GB katalog eksikleri uydurulmadan admin pending/evidence backlog olarak görünüyor.

Kapanış notu:

```text
`markets` ve `vehicle_spec_market_availability` tabloları eklendi. TR default market,
GB ilk genişleme market'i olarak seed edildi. Mevcut 53 araç TR availability kaydıyla
bağlandı. Public API `market=TR|GB` parametresi alıyor; TR 53 kayıt döndürürken kanıtlı
GB availability olmadığı için GB kataloğu boş dönüyor. Mobil giriş ve kayıt ekranında dil
bayrakları var; katalog pazarı kullanıcıya teknik TR/GB seçimi göstermeden cihaz locale ve
saat diliminden çıkarılıp AsyncStorage içinde saklanıyor. Admin katalog ekranında TR/GB
market filtresi, market görünür adı, satış durumu ve market kaynak alanları düzenlenebiliyor.
Market bazlı TR/GB exportları ve validation raporu üretildi. Eksik GB araçları uydurulmadı;
admin tarafında pending backlog olarak görünür kaldı.
```

Detay plan:

```text
Docs/Planlar/11-COKLU-ULKE-MARKET-CATALOG-PLAN.md
```

İlk sınır:

```text
Bu faz tüm İngiltere araç kataloğunu doldurma fazı değildir.
Bu faz market-aware katalog altyapısını kurma fazıdır.
```

---

## İlk Uygulama Sırası

Önerilen sıra:

1. Faz 6B: Basit kullanıcı kayıt akışını kur.
2. Faz 6B: Kayıtlı kullanıcıyla mobil araç seçimini backend ownership'e bağla.
3. Faz 6C: Takip modu seçimini ekle.
4. Faz 6D: Trip Recorder MVP mobil yüzeyini kur.
5. Faz 6F: Trip verisinden usage profile refresh et.
6. Faz 6E: Şarj davranışı ilk yüzeyini ekle.
7. Faz 6F'i charge verisiyle genişlet.
8. Faz 6G: İlk Karne v2'yi bağla.
9. Faz 6H: Admin veri kalite backlog filtrelerini toparla.

Bu sıra özellikle korunmalıdır:

```text
User yoksa ownership kurulamaz.
Ownership yoksa trip/charge bağlamı kirlenir.
Trip/charge yoksa usage profile gerçek veri üretemez.
Usage profile yoksa karne v2 yalnızca katalog ekranı olarak kalır.
```

---

## Doğrulama Komutları

Plan uygulanırken kullanılacak temel doğrulamalar:

```text
npm run api:typecheck
npm run mobile:typecheck
npm run web:typecheck
npm run web:build
node scripts/validate-vehicle-specs-v2.js
node scripts/db-smoke.js
```

Servis kontrolleri:

```text
http://localhost:4311/health
http://localhost:19010
http://localhost:4310/admin/vehicles
http://localhost:4310/admin/review
```

Mojibake kontrolü:

```text
rg -n "<mojibake-pattern>" Docs apps db scripts -g "!node_modules" -g "!dist" -g "!*.map"
```

---

## Net Başlangıç Kararı

Güncel durum:

```text
Faz 6 kapsamı kapandı.
Kullanıcı kaydı, login, ownership, tracking mode, trip, charge, usage profile, ilk karne,
admin backlog ayrımı, çoklu dil foundation ve çoklu ülke/market foundation tamamlandı.
Bu plan içinde açık kalan uygulama işi yok.
```

Sonraki kodlama adımı bu dosyadan değil roadmap sonrası seçilecek yeni ürün fazından başlamalıdır.
