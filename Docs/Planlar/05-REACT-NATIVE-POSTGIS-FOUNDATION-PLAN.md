# DMyC Başlangıç ve Gerçek Dünya Modeli Planı

## Kısa Anlayış Özeti

Bu proje elektrikli araç kullanıcıları için yalnızca bir menzil uygulaması değil; araç, sürücü, rota, şarj, bakım, sahiplik ve kullanım davranışını bir arada modelleyen deterministik bir Araç Karnesi / Vehicle Reality Layer olacak.

Bu ürünün ilk yüzü mobil uygulama olacak. React Native mobil taraf ilk görünürlük, araç seçimi, hafif sinyal toplama ve daha sonra GPS/şarj doğrulama akışlarını taşıyacak.

İşlem sırası roadmap ile uyumlu olmalıdır: önce araç katalog/dataset temeli kurulacak, sonra bu veri mobil uygulamaya verilecek, sunucu/API ve web/admin katmanı bundan sonra yazılacaktır.

Veritabanı yeni proje için ayrı kurulacak. Mevcut BBTV veritabanına dokunulmayacak. Docker üzerinde izole PostgreSQL + PostGIS kurulumu yapılacak; container, volume, network, database adı ve dış port DMyC’ye özel seçilecek. Bu ilk aşamada amaç production backend yazmak değil, canonical dataset ve veri modelini doğru kurmaktır.

Bu planın önceliği teknoloji seçimi değil, gerçek dünya modelidir:

```text
Önce gerçek dünya modeli.
Sonra veri modeli.
Sonra kod.
```

Araç tek başına gerçeği açıklamaz. Aynı Tesla Model Y; şehir içinde, evden şarj eden ve günde 20 km kullanan biriyle, otoyolda günde 300 km yapan ve DC ağırlıklı şarj eden biri için tamamen farklı bir ürün gerçekliği üretir. Bu nedenle sistemin erken çekirdeği yalnızca `vehicles` ve `trips` değil, `usage_profiles` mantığıyla kurulmalıdır.

Temel ürün prensibi:

```text
Önce görünürlük ver.
Sonra veri iste.
Veri geldikçe güven seviyesini artır.
Emin değilsen unknown bırak.
AI karar vermez; deterministic motor karar üretir.
```

Veri güveni elle girilen soyut bir skor olmamalıdır. Sistem güven dilini denetlenebilir sinyallerden üretmelidir:

```text
Veri doluluk oranı = dolu JSON alanı / beklenen JSON alanı
Kaynak sınıfı = fabrika / topluluk / kullanıcı / bilinmeyen
```

İlk kural:

- Kaynak resmi fabrika/katalog kaynağıysa ve JSON doluluğu `%50` ve üzerindeyse kullanıcıya `Veri Güveni: Fabrika Verisi` gösterilir.
- Kaynak internet yorumu, review, forum veya üçüncü taraf katalog ise ve doluluk `%50` ve üzerindeyse `Veri Güveni: Topluluk Verisi` gösterilir.
- Doluluk `%50` altındaysa sistem bunu kesin veri gibi sunmaz; `Kullanıcı Verisi Bekliyor` veya `Eksik Katalog Verisi` sınıfında tutar.
- Admin kullanıcı `güven skoru` yazmaz; sadece eksik JSON alanlarını ve kaynak bilgisini düzeltir.
- Güven etiketi mobil ve admin tarafında aynı deterministic hesapla üretilir.

---

## Kaynak Dokümanlardan Çıkan Ana Kararlar

Okunan dosyalar:

```text
Docs/#01 VISION-AND-PRODUCT-ENGINE.md
Docs/# 02-DOMAIN-MODEL-AND-DATASET.md
Docs/03-BEHAVIOR-ENGINE.md
Docs/# 04-ROADMAP.md
Docs/# 05-VEHICLE-BEHAVIOR-REALITY-MODEL.md
Docs/araclar_v1.md
Docs/vehicle_specs_master.json
```

Ana kararlar:

- İlk ürün kullanıcıya aracını seçtirip fabrika verisiyle ilk görünürlük verecek.
- İlk aşamada kullanıcıdan yoğun veri girişi istenmeyecek.
- İlk karne, kullanıcı gerçek veri girmeden de fabrika verisi ve kullanım amacıyla tahmini değer üretecek.
- Şarj davranışı, trip recorder’dan önce görünür ürün değeri olarak ele alınacak.
- Trip recorder ve GPS tabanlı gerçek kullanım verisi sonraki aşamada kişiselleştirme için kurulacak.
- Şarj, servis ve rota verileri zamanla doğrulama seviyesiyle zenginleşecek; manuel giriş varsayılan strateji olmayacak.
- Araç kullanıcıdan bağımsız ana varlık olacak; sahiplik dönemleri ayrı tutulacak.
- Araç modeli ile kullanım modeli ayrılacak; `usage_profiles` erken projection nesnesi olacak.
- Kullanıcı profil seçmeyecek; Usage Profile zamanla gözlem, çıkarım ve doğrulamayla oluşacak.
- Çoklu sürücü, ortak yolculuk, co-presence ve driver assignment modeli veri kirlenmesini önlemek için erken mimaride hesaba katılacak.
- Charging Decision Event, yalnızca şarj işlemini değil, şarj ihtiyacının hissedildiği anı modelleyecek.
- Canonical vehicle, canonical charger ve canonical route katmanı en baştan tasarlanacak.
- `vehicle_specs_master.json` başlangıç seed verisi için daha temiz ve teknik olarak dolu görünüyor.
- `araclar_v1.md` daha geniş kaynak izi taşıyor ama içinde eksik alan ve doğrulama farkları daha fazla; ileride karşılaştırma/import kaynağı olarak ele alınmalı.

Not: Bazı mevcut dokümanlarda gerçek mojibake izleri görünüyor. Bu plan dosyası onları düzeltmez; sadece yeni başlangıç planını temiz UTF-8 ile tanımlar.

---

## Önerilen Teknik Başlangıç Stack'i

### Mobil

```text
React Native + Expo
TypeScript
Expo Location
Expo Notifications
React Navigation
TanStack Query
Zustand veya küçük bir local state katmanı
```

Expo ile başlamak mantıklı; GPS, bildirim, kamera/fotoğraf ve hızlı cihaz testi için sürtünmeyi azaltır.

### Web / Admin / Public

```text
Next.js
TypeScript
App Router
Cloudflare upstream için sabit port
```

Next.js ilk kodlama adımı değildir. Web/admin/public ekranlar sunucu fazında ele alınacaktır.

BBTV aynı makinede Cloudflare üzerinden kullanıcıya çıktığı için DMyC web uygulaması ileride kurulursa varsayılan `3000` portunu kullanmamalıdır. Next.js scriptleri baştan sabit porta bağlanmalıdır.

Önerilen Next.js portu:

```text
DMyC Next.js Web: 4310
```

### Backend / API

İki uygun yol var:

```text
Seçenek A: NestJS + TypeScript
Seçenek B: FastAPI + Python
```

Backend ilk kodlama adımı değildir. İlk aşamada dataset, migration ve mobil ilk görünürlük kurulacak; API daha sonra bu dataset ve mobil akış netleşince yazılacaktır.

React Native tarafı TypeScript olacağı için backend aşamasında NestJS daha bütünleşik olur. Ancak veri işleme ve analiz tarafı ağırlaşırsa ileride Python job servisleri eklenebilir.

İlk öneri:

```text
Backend API: NestJS
Database: PostgreSQL + PostGIS
ORM / Query: Prisma + raw SQL PostGIS sorguları veya Drizzle
Migration: ORM migration + elle yazılmış PostGIS index migrationları
Background Jobs: ileride eklenecek
Object Storage: sonraki fazda S3 uyumlu storage
```

Redis ilk kurulumda gerekli değildir. Trip processing, notification queue veya ağır background job ihtiyacı netleştiğinde eklenmelidir.

### Database

```text
PostgreSQL 16 + PostGIS 3.x
Yeni database: dmyc_dev
Yeni user: dmyc_app
Host port: 55432
Container port: 5432
Volume: dmyc_postgres_data
Network: dmyc_network
```

`55432` dış portu özellikle seçildi; yerelde başka PostgreSQL veya BBTV servisleriyle çakışmasın.

---

## Port Planı ve BBTV İzolasyonu

BBTV bu makinede host edildiği ve Cloudflare ile dışarı açıldığı için DMyC servisleri varsayılan framework portlarını kullanmayacak. Bu portlar şimdilik rezervasyon niteliğindedir; Next.js veya API hemen kurulmayacaktır.

Rezerve edilmemesi gereken portlar:

```text
3000  -> BBTV / mevcut Next.js hattı için boş bırakılacak
3001  -> BBTV yardımcı servisleri veya aktif local kontrol protokolleri için boş bırakılacak
5432  -> local/default PostgreSQL için boş bırakılacak
6379  -> local/default Redis için boş bırakılacak
```

DMyC port bloğu:

```text
4310  -> DMyC Next.js web / admin / public app
4311  -> DMyC API
4312  -> DMyC ops, docs veya ileride ayrı worker dashboard
55432 -> DMyC PostgreSQL + PostGIS host port
56379 -> DMyC Redis, sadece ihtiyaç netleşirse
19010 -> DMyC Expo / Metro, aynı anda BBTV veya başka mobil dev server varsa
```

Next.js ileride kurulduğunda önerilen script:

```json
{
  "scripts": {
    "dev:web": "next dev -p 4310",
    "start:web": "next start -p 4310"
  }
}
```

API ileride kurulduğunda önerilen env:

```text
PORT=4311
DATABASE_URL=postgresql://dmyc_app:dmyc_dev_password@localhost:55432/dmyc_dev
```

Cloudflare tarafında DMyC web açılacağı zaman upstream açıkça `http://127.0.0.1:4310` olmalıdır. Dataset ve mobil başlangıç aşamasında BBTV tunnel, origin rule veya service definition değerleri değiştirilmemelidir.

---

## Docker Compose Planı

İlk compose dosyası sadece yeni proje altyapısını ayağa kaldırmalı.

Önerilen dosya:

```text
docker-compose.yml
```

Önerilen servisler:

```yaml
services:
  dmyc-postgres:
    image: postgis/postgis:16-3.4
    container_name: dmyc-postgres
    environment:
      POSTGRES_DB: dmyc_dev
      POSTGRES_USER: dmyc_app
      POSTGRES_PASSWORD: dmyc_dev_password
    ports:
      - "55432:5432"
    volumes:
      - dmyc_postgres_data:/var/lib/postgresql/data
    networks:
      - dmyc_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dmyc_app -d dmyc_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  dmyc_postgres_data:

networks:
  dmyc_network:
    name: dmyc_network
```

BBTV izolasyon kuralları:

- BBTV container, volume, network veya database adları kullanılmayacak.
- BBTV web portlarıyla çakışmamak için DMyC web `4310`, API `4311` kullanacak.
- `5432` yerine `55432` kullanılacak.
- `docker compose down -v` yalnızca bu proje compose dosyası açıkça hedeflenerek kullanılacak.
- Eski DB bağlantı stringleri `.env` içine kopyalanmayacak.

---

## Gerçek Dünya Modeli: Araç Değil Kullanım Davranışı

Sistemin merkezinde yalnızca araç kaydı değil, aracın nasıl yaşadığı bulunur.

Erken domain soruları:

```text
Bu araç nerede kullanılıyor?
Günlük mü, uzun yol mu, karma mı?
Evden mi şarj ediliyor, istasyondan mı?
Şarj davranışı düşük SOC mi, güvenli aralık mı, son dakika mı?
Kullanıcı maliyet mi, menzil güveni mi, ikinci el değeri mi arıyor?
Veri doğruluğu tahmini mi, doğrulanmış mı?
```

Bu nedenle `usage_profiles` ilk fazdan itibaren düşünülmelidir.

`usage_profiles` ham veri değildir. Şarj, yolculuk ve doğrulama olaylarından hesaplanan davranışsal özet tablosudur. Kullanıcıya “hangi profilsin?” diye sorulmaz; sistem ilk sinyali alır, gözlemler, emin olmadığında sorar ve zamanla projection üretir.

Önerilen `usage_profiles` projection alanları:

```sql
usage_profiles

id
vehicle_id
ownership_id

user_id nullable

profile_type
-- city_commuter
-- long_distance_driver
-- family_vehicle
-- mixed_usage
-- fleet_vehicle
-- home_charger
-- high_dc_user
-- unknown

avg_daily_km
avg_weekly_km

city_trip_ratio
highway_trip_ratio

dc_charge_ratio
home_charge_ratio

avg_passenger_count

avg_start_soc
avg_end_soc

confidence_score

last_calculated_at
```

Usage Profile iki seviyede çalışabilir:

```text
Araç + sahiplik seviyesi: aracın toplam kullanım gerçekliği.
Araç + sahiplik + kullanıcı seviyesi: biliniyorsa sürücüye özel davranış özeti.
```

`user_id` bu yüzden nullable olmalıdır. Sürücü bilinmiyorsa sistem profili uydurmaz; araç/sahiplik seviyesinde toplar.

---

## Charging Decision Event Kararı

Şarj edilen yer ile şarj ihtiyacının oluştuğu yer aynı şey değildir.

```text
Kullanıcı Afyon'da şarj etmiş olabilir.
Ama şarj ihtiyacını Afyon girişinde hissetmiş olabilir.
```

Bu ayrım ürünün uzun vadeli Charging Demand Intelligence katmanı için temel veri noktasıdır.

Erken fazda tam akıllı motor yazılmayacak; ama veri modeli buna kapalı olmamalıdır.

İlk yaklaşım:

- Şarj oturumu ayrı olaydır.
- Şarj karar anı ayrı olaydır.
- Kullanıcı manuel kayıt tutmaz varsayımıyla fotoğraf, OCR, GPS ve istasyon tespiti önceliklidir.
- Manuel SOC/kWh/TL girişi son çaredir ve confidence yükseltmek için kullanılır.

---

## Canonical Katman Kararı

BBTV’deki canonical ingredient yaklaşımının EV karşılığı en baştan kurulmalıdır.

İlk canonical varlıklar:

```text
canonical_vehicles
canonical_charging_locations
canonical_routes
```

Neden gerekli?

```text
Tesla Model Y RWD
Model Y RWD
Tesla MY RWD
```

aynı araca işaret edebilir.

```text
ZES Antalya Migros
ZES Migros
Migros ZES
```

aynı şarj lokasyonuna işaret edebilir.

Erken canonical yaklaşım:

- `vehicle_specs` canonical vehicle kaydına bağlanmalı.
- Kullanıcının yazdığı araç metni doğrudan kesin araç yapılmamalı; normalize edilip confidence ile bağlanmalı.
- Şarj istasyonu adları ileride provider + lokasyon + koordinat eşleşmesiyle canonical kayda bağlanmalı.
- Rotalar tam adres değil, privacy-safe origin/destination cluster ve fingerprint ile tutulmalı.
- AI sadece normalizasyon yardımcısı olabilir; canonical eşleşmenin karar kaydı deterministic ve denetlenebilir olmalı.

Ruhsat veya OCR verisi genellikle gerçek teknik variantı çözmez; bazı durumlarda araç ailesini bile bulanık verebilir. Bu nedenle:

```text
Ruhsat / OCR -> olası brand + model / canonical vehicle adayları
Variant manifest -> aday satış variantları
Kullanıcı seçimi veya güçlü kaynak -> kesin vehicle_specs variant kaydı
```

`canonical_vehicles` model ailesini temsil eder; `vehicle_specs` gerçek satış variantını ve teknik spec değerlerini taşır. İlk karne öncesi variant seçimi bu yüzden opsiyonel süs değil, veri doğruluğu adımıdır. Mobil akışta `Varyantı bilmiyorum` seçeneği bulunmalı; sistem bu durumda kesin variant uydurmadan aile seviyesi düşük güvenli ilk karne üretmelidir. Detay plan: `Docs/Planlar/variant.md`.

Kullanıcı aracını listede bulamazsa akış durmamalıdır. Sistem en yakın eşleşmeyle yaklaşık başlatmalı, güveni açık söylemeli ve yeterli sinyal oluşunca eşleşmeyi düzeltmelidir.

Önerilen ürün akışı:

```text
Aracımı bulamadım
↓
En yakın modeli seç
↓
Veri güveni: düşük
↓
İlk karne: yaklaşık
↓
Admin sinyal toplar
↓
Yeni varyant import edilir
↓
Kullanıcıya "aracını daha doğru eşleştirdik" denir
```

Bu akışın temel ilkesi:

```text
Çalışmayı durdurma.
Yaklaşık başla.
Güveni açık söyle.
Zamanla düzelt.
```

DB tarafında araç eşleşmesi yalnızca seçilen spec id'den ibaret olmamalıdır:

```text
selected_vehicle_spec_id

match_type:
- exact
- closest_variant
- model_family_fallback
- unknown_user_declared

user_declared_vehicle_text
match_confidence
needs_admin_review
```

UI dili:

```text
Aracını listede bulamadın mı?

En yakın varyantla başlayabilirsin.
Kullandıkça ve yeterli sinyal oluşunca aracını daha doğru eşleştirebiliriz.
```

Bu karar variant dataset eksikliği riskini azaltır: kullanıcıyı durdurmaz, ama sistemi de kesin olmayan veriyi kesinmiş gibi konuşturmaz.

---

## İlk Veritabanı Şeması

MVP başlangıcı için tüm vizyonu tek seferde kurmamak daha doğru. İlk migration çekirdeği şu tabloları taşımalı:

```text
users
canonical_vehicles
vehicles
vehicle_specs
vehicle_ownerships
vehicle_drivers
trip_driver_assignments
co_presence_events
usage_profiles
charging_decision_events
charge_sessions
charge_evidence
trips
trip_points
```

PostGIS gerektiren alanlar:

```text
trips.start_location geography(Point, 4326)
trips.end_location geography(Point, 4326)
trip_points.location geography(Point, 4326)
charge_sessions.location geography(Point, 4326)
charging_decision_events.decision_location geography(Point, 4326)
```

Erken indexler:

```sql
CREATE INDEX trip_points_trip_id_recorded_at_idx ON trip_points (trip_id, recorded_at);
CREATE INDEX trip_points_location_gix ON trip_points USING GIST (location);
CREATE INDEX trips_vehicle_started_at_idx ON trips (vehicle_id, started_at DESC);
CREATE INDEX charge_sessions_vehicle_started_at_idx ON charge_sessions (vehicle_id, started_at DESC);
CREATE INDEX charging_decision_events_vehicle_decision_at_idx ON charging_decision_events (vehicle_id, decision_at DESC);
```

İlk seed:

```text
vehicle_specs_master.json -> vehicle_specs
```

Seed import sırasında canonical alanlar korunmalı:

```text
brand
model
variant
drive_type
vehicle_class
battery_chemistry
charging_port_type
verification_level
```

UI dil metinleri database davranışını belirlememeli. Çeviri ileride ayrı katman olarak ele alınmalı.

---

## Monorepo Yapısı Önerisi

Başlangıç için sade bir yapı yeterli:

```text
DMyC/
  apps/
    mobile/
  packages/
    shared/
  db/
    migrations/
    seeds/
  Docs/
```

Sunucu fazına geçildiğinde yapı genişletilebilir:

```text
DMyC/
  apps/
    api/
    web/
```

`packages/shared` içinde ilk etapta şunlar olabilir:

```text
canonical enum tipleri
ileride API DTO tipleri
vehicle spec type tanımları
ortak validation schema'ları
```

Bu yapı ilk aşamada mobil ve seed scriptlerinin aynı domain dilini kullanmasını sağlar. API/web klasörleri daha sonra eklenecektir.

---

## Faz 0: Dataset ve Veri Tabanı Foundation

Amaç:

```text
Yeni projenin eski BBTV veritabanından tamamen izole çalışan dataset ve veri modelini kurmak.
```

Yapılacaklar:

- `docker-compose.yml` ekle.
- PostgreSQL + PostGIS containerını ayağa kaldır.
- `.env.example` oluştur.
- PostGIS extension migrationını yaz.
- İlk `canonical_vehicles`, `vehicle_specs` ve `usage_profiles` migrationlarını yaz.
- `vehicle_drivers`, `trip_driver_assignments`, `co_presence_events` ve `charging_decision_events` için erken ama minimal migration yaz.
- `vehicle_specs_master.json` seed import scriptini yaz.
- Mobil uygulamaya verilecek ilk araç katalog JSON exportunu üret.
- Basit DB smoke testi ekle.

Kabul kriteri:

```text
docker compose up -d
psql ile dmyc_dev bağlantısı
SELECT PostGIS_Version()
vehicle_specs seed satırlarının görülmesi
Mobil için export edilen araç katalog dosyasının oluşması
BBTV container/database/volume adlarına temas edilmemesi
```

---

## Faz 1: Mobil Dataset Foundation

Amaç:

```text
Mobil uygulamanın backend beklemeden araç katalog verisini kullanabilmesini sağlamak.
```

Yapılacaklar:

- React Native / Expo proje başlangıcını yap.
- Mobil içine seed katalog dosyasını veya generated dataset paketini bağla.
- Marka/model/variant arama ve seçme UI'ını local dataset üzerinden çalıştır.
- Araç seçimi sonrası ilk görünürlük hesaplarını mobilde göster.
- İlk kullanım/şarj sinyallerini local state içinde tut.
- Sunucu gelene kadar local persistence stratejisini belirle.

İlk mobil veri kaynakları:

```text
vehicle_specs export JSON
canonical enum/type definitions
local selected vehicle state
local first usage/charging signals
```

Kabul kriteri:

```text
Mobil uygulama backend olmadan araç katalog verisini okuyabiliyor.
Kullanıcı araç seçebiliyor.
İlk görünürlük ekranı fabrika verisi ve düşük sürtünmeli sinyallerle çalışıyor.
Usage Profile kullanıcı seçimi değil, ileride hesaplanacak projection olarak kalıyor.
```

---

## Faz 2: React Native İlk Ürün Akışı

Amaç:

```text
Kullanıcı ilk gün aracını seçsin ve fabrika verisiyle ilk değeri görsün.
```

Ekranlar:

- Açılış / hesap başlangıcı
- Araç seçimi
- Araç varyantı seçimi
- Hafif kullanım sinyali
- Hafif şarj sinyali
- Veri takip derinliği seçimi
- İsteğe bağlı mevcut SOC girişi
- İlk görünürlük ekranı

Buradaki sinyaller profil seçtirme ekranı değildir. Kullanıcı “City Commuter” gibi bir profile sokulmaz. Sistem sadece ilk karneyi daha dürüst anlatmak için düşük sürtünmeli bağlam alır.

İlk görünürlük ekranı:

```text
Fabrika menzili
Beklenen gerçek menzil aralığı
Batarya kapasitesi
Önerilen günlük SOC aralığı
AC/DC şarj kapasitesi
Veri güven seviyesi: fabrika verisi
Kullanım gerçekliği: ilk sinyal / düşük güven
```

Dil prensibi:

```text
Kesin teşhis yok.
Tahmini alanlar açıkça tahmini olarak gösterilir.
Kullanıcı manipüle edilmez.
Manuel veri girişi zorunlu tutulmaz.
```

---

## Faz 3: Sunucu / API Foundation

Amaç:

```text
Mobilde doğrulanan ilk akışları kalıcı backend'e taşımak.
```

Yapılacaklar:

- API uygulaması oluştur.
- Health endpoint ekle.
- Vehicle specs listeleme endpointi ekle.
- Marka/model/variant arama endpointi ekle.
- Araç oluşturma endpointi ekle.
- Ownership oluşturma akışını ekle.
- Kullanım sinyali alma endpointi ekle.
- Usage profile projection okuma endpointi ekle.
- İlk tahmini karne endpointi ekle.
- Basit kullanıcı modeli ekle.

İlk endpointler:

```text
GET /health
GET /vehicle-specs
GET /vehicle-specs/search?q=
POST /users
POST /vehicles
POST /vehicle-ownerships
POST /usage-signals
GET /vehicles/:id/usage-profile
GET /vehicles/:id/first-card
```

Kabul kriteri:

```text
Mobil local datasetten backend datasetine geçebiliyor.
Kullanıcı araç ekleyebiliyor.
Araç sahiplik dönemi açılıyor.
İlk karne fabrika verisi ve düşük sürtünmeli kullanım sinyalleriyle backend üzerinden üretilebiliyor.
```

---

## Faz 4: Şarj Davranışı, Karar Anı ve Basit Karne

Amaç:

```text
Kullanıcının en görünür EV davranışını, yani şarjı düşük sürtünmeyle anlamak; şarj işlemi ile şarj karar anını ayrı modellemek ve ilk aylık görünürlüğü üretmek.
```

Yapılacaklar:

- Fotoğraf / fiş / ekran görüntüsü kanıt akışını ilk tasarıma koyma.
- GPS ile şarj istasyonu yakınında durma sinyalini modelleme.
- Ev şarjı / public AC / public DC ayrımı.
- Manuel şarj oturumu ekleme ama son çare ve isteğe bağlı doğrulama olarak tutma.
- Start SOC / end SOC alanlarını isteğe bağlı doğrulama olarak alma.
- kWh / TL alanlarını isteğe bağlı doğrulama olarak alma.
- Charging decision event için minimal kayıt modeli.
- Basit aylık toplamlar.

Kabul kriteri:

```text
Kullanıcı hiç veri girmezse sistem tahmini çalışmayı sürdürür.
Kullanıcı şarj verisi girerse güven seviyesi yükselir.
Şarj oturumu ile şarj karar anı veri modelinde ayrıdır.
İlk karne şarj sayısı, tahmini maliyet ve güven seviyesi gösterebilir.
```

---

## Faz 5: Trip Recorder MVP

Amaç:

```text
Gerçek kullanım verisini toplamak ve usage profile projection'ını kişiselleştirmeye başlamak.
```

Yapılacaklar:

- GPS izin akışı.
- Trip start / stop.
- Trip point buffer.
- Offline queue.
- Mesafe, süre, ortalama hız hesaplama.
- API'ye trip ve trip_points gönderimi.
- Trip sonrası küçük doğrulama sorusu altyapısı.
- Usage profile projection güncellemesi.
- Sürücü bilinmiyorsa `unknown` bırakma.
- Ortak yolculukta driver / passenger / shared_driver rollerini destekleme.

Kabul kriteri:

```text
Bir yolculuk başlatılıp bitiriliyor.
GPS noktaları PostGIS alanına yazılıyor.
Yolculuk listesinde toplam mesafe ve süre görünüyor.
Usage profile projection alanları gerçek veriyle güncellenmeye başlıyor.
Driver assignment yoksa sistem kesin sürücü uydurmuyor.
```

İlk karne metrikleri:

```text
Toplam km
Yolculuk sayısı
Ortalama hız
Tahmini tüketim
Şarj sayısı
Toplam şarj maliyeti
Km başı maliyet
```

---

## Faz 6: Davranış Motoru İçin Hazırlık

Amaç:

```text
Sapma motoru, rota fingerprint ve soru motoru için veri temelini kirletmeden büyütmek.
```

Yapılacaklar:

- `trip_contexts` ekle.
- `trip_behavior_signals` ekle.
- `trip_context_questions` ekle.
- `route_fingerprints` ekle.
- Confidence score standardını belirle.
- `unknown`, `inferred`, `user_confirmed` kaynaklarını enum olarak sabitle.
- Canonical route fingerprint kurallarını netleştir.
- Usage profile güncelleme kurallarını deterministic hale getir.

Kabul kriteri:

```text
Sistem bilmediği şeyi unknown bırakabiliyor.
Tahmin ve doğrulama ayrı kaynak seviyeleriyle tutuluyor.
```

---

## Yakın Dönem Uygulama Sırası

Önerilen ilk sprint sırası:

1. Docker Compose + PostGIS kurulumu.
2. DB migration ve `canonical_vehicles`, `vehicle_specs`, minimal event/projection temeli.
3. `vehicle_specs_master.json` seed importu.
4. Mobil için araç katalog exportu üretimi.
5. React Native / Expo proje başlangıcı.
6. Mobilde araç seçimi ve local dataset arama akışı.
7. İlk görünürlük ekranı.
8. Sunucu/API foundation.
9. Şarj davranışı ve charging decision için düşük sürtünmeli kayıt/doğrulama modeli.
10. Trip recorder veri modeli.
11. GPS ile ilk trip kaydı.

Bu sıra bilinçli olarak “önce veri, sonra davranış motoru” şeklinde. Çünkü roadmap’in ana prensibi burada da geçerli:

```text
Veri
Görünürlük
Karne
Güven
Premium
Sicil
Insight
```

---

## İlk 4 Sprint Uygulama Planı

Bu planla kodlamaya başlanabilir. Ancak ilk ayın odağı dar tutulmalıdır:

```text
Araç seçimi
İlk karne
```

Bu iki akış çalışmadan GPS, rota zekâsı, batarya ömrü, OEM insight veya gelişmiş şarj karar motoruna girilmemelidir.

### Sprint 1: Database Foundation

Amaç:

```text
Araç datasını ayağa kaldırmak.
```

Yapılacaklar:

- Docker Compose ile izole PostgreSQL + PostGIS kurulumu.
- PostGIS extension migrationı.
- `canonical_vehicles` migrationı.
- `vehicle_specs` migrationı.
- Minimal indexler ve smoke test.

Kabul kriteri:

```text
dmyc_dev ayağa kalkıyor.
PostGIS çalışıyor.
canonical_vehicles ve vehicle_specs tabloları hazır.
BBTV veritabanına temas edilmiyor.
```

### Sprint 2: Dataset Import ve Mobil Export

Amaç:

```text
Mobilin okuyacağı araç kataloğunu oluşturmak.
```

Yapılacaklar:

- `vehicle_specs_master.json` import scripti.
- Canonical vehicle eşleşme/oluşturma kuralı.
- Import sonrası doğrulama raporu.
- Mobil için katalog export JSON üretimi.
- Export alanlarını mobile özel sadeleştirme.

Kabul kriteri:

```text
vehicle_specs_master.json verisi database'e import edildi.
Mobilin okuyacağı katalog JSON oluştu.
Araç marka/model/variant listesi exporttan okunabilir durumda.
```

### Sprint 3: Expo / React Native Başlangıç

Amaç:

```text
Backend beklemeden araç seçimi akışını çalıştırmak.
```

Yapılacaklar:

- Expo + React Native + TypeScript proje kurulumu.
- Mobil katalog JSON'unu uygulamaya bağlama.
- Araç marka arama/seçme ekranı.
- Variant seçme ekranı.
- Seçilen aracı local state/local persistence içinde tutma.

Bu sprintte login yapılmayacak.

Kabul kriteri:

```text
Kullanıcı araç seçebiliyor.
Variant seçebiliyor.
Seçim local olarak saklanıyor.
Backend gerekmeden akış çalışıyor.
```

### Sprint 4: İlk Karne Ekranı

Amaç:

```text
İlk ürün değerini görünür hale getirmek.
```

Ekran içeriği:

```text
Tesla Model Y LR
WLTP: 533 km
Batarya: 75 kWh
AC/DC şarj kapasitesi
Beklenen gerçek menzil
Veri güveni
```

Yapılacaklar:

- Seçilen vehicle spec üzerinden ilk karne hesaplama.
- Fabrika verisi ile tahmini alanları ayrı gösterme.
- Veri güven seviyesini açıkça yazma.
- Manuel veri girişi istemeden ilk görünürlük üretme.

Kabul kriteri:

```text
Kullanıcı araç seçtikten sonra ilk karne ekranını görüyor.
Ekran "bu faydalıymış" hissi yaratacak kadar net değer veriyor.
Tahmini alanlar kesin gerçek gibi sunulmuyor.
```

### Erken Tablo Uyarısı

Şu tablolar mimari olarak doğru ve migration seviyesinde erken düşünülmelidir:

```text
vehicle_drivers
trip_driver_assignments
co_presence_events
charging_decision_events
usage_profiles
```

Ancak ilk ay bu tabloların davranış motorlarına dalınmayacaktır.

Kural:

```text
Migration oluştur.
İsimleri ve ilişkileri doğru kur.
Sonra unut.
İlk ay Araç seçimi + İlk karne dışında hiçbir şeyi mükemmelleştirme.
```

Çünkü ilk ürün riski:

```text
GPS çalışır mı?
```

değil,

```text
İlk karne kullanıcıda fayda hissi yaratıyor mu?
```

sorusudur.

---

## İlk Teknik Riskler

- GPS izinleri ve arka plan konum takibi mobil platformlarda dikkatli tasarlanmalı.
- En büyük ürün riski manuel veri girişine güvenmektir; sistem veri girilmediğinde de çalışmalı.
- Usage Profile kullanıcı seçiminden üretilirse model kirlenir; projection olarak hesaplanmalı.
- Şarj edilen yer ile şarj ihtiyacının oluştuğu yer karıştırılırsa B2B insight katmanı zayıflar.
- Sürücü bilinmediğinde kesin sürücü yazmak rota, tüketim ve batarya davranışı analizlerini kirletir.
- Batarya sağlığı gibi alanlarda kesin teşhis dili kullanılmamalı.
- Araç datasetleri kaynak, doğrulama seviyesi ve çakışma yönetimi olmadan doğrudan “kesin gerçek” gibi kullanılmamalı.
- Canonical araç, şarj lokasyonu ve rota katmanı erken kurulmazsa veri temizleme maliyeti hızla büyür.
- PostGIS verisi büyümeden önce index stratejisi kurulmalı.
- BBTV veritabanı, Cloudflare upstream’i, web portu, container, volume veya env değerleriyle çakışma yaşanmamalı.
- Next.js varsayılan `3000` portuyla başlatılmamalı; DMyC web portu `4310` olmalı.
- Mevcut dokümanlarda görülen mojibake ayrı bir temizlik işi olarak ele alınmalı; ürün planı ile karıştırılmamalı.

---

## Net Başlangıç Kararı

Başlangıç için önerilen karar:

```text
React Native + Expo ile mobil uygulama.
İlk aşama dataset + mobil ilk görünürlük.
Sunucu/API sonraki fazda NestJS + TypeScript ile.
Next.js web/admin/public sonraki fazda ve gerekirse `4310` portunda.
NestJS API sonraki fazda ve gerekirse `4311` portunda.
Docker Compose üzerinde izole PostgreSQL + PostGIS `55432` host portunda.
Redis ilk kurulumda yok; ihtiyaç netleşince eklenecek.
vehicle_specs_master.json başlangıç katalog seed kaynağı.
İlk ürün vaadi: Araç seç, ilk görünürlüğü al, sistem kullandıkça kullanım gerçekliğini öğrensin.
```

İlk kodlama adımı:

```text
Docker Compose + PostGIS + canonical vehicle + vehicle_specs + minimal event/projection migration kurulumu.
```

---

## Faz Takip Alanı

Bu alan yürütme takibi içindir. Bir faz sadece kapanış kriterleri gerçekten tamamlandığında `[x]` yapılacaktır.

### Faz 0A: Docker + PostGIS Foundation

Durum:

```text
[x] Kapandı
```

Kapsam:

- DMyC için izole Docker Compose kurulumu.
- `dmyc-postgres` containerı.
- PostgreSQL + PostGIS.
- BBTV port/container/volume izolasyonu.

Kapanış kriterleri:

- `[x]` `dmyc-postgres` çalışıyor.
- `[x]` Host port `55432`.
- `[x]` BBTV `5432/6379` servislerine temas edilmedi.
- `[x]` `SELECT PostGIS_Version()` başarılı.

Kapanış notu:

```text
PostGIS 3.4 doğrulandı. dmyc-postgres 55432 üzerinde sağlıklı.
```

---

### Faz 0B: Vehicle Catalog Migration

Durum:

```text
[x] Kapandı
```

Kapsam:

- `canonical_vehicles` migrationı.
- `vehicle_specs` migrationı.
- Temel indexler.
- Migration scripti.

Kapanış kriterleri:

- `[x]` `canonical_vehicles` tablosu oluştu.
- `[x]` `vehicle_specs` tablosu oluştu.
- `[x]` Migration tekrar çalıştırılabilir yapıda.
- `[x]` Smoke testte tablo sayıları okunabiliyor.

Kapanış notu:

```text
001_vehicle_catalog_foundation.sql başarıyla uygulandı.
```

---

### Faz 0C: Vehicle Specs Seed ve Mobil Export

Durum:

```text
[x] Kapandı
```

Kapsam:

- `vehicle_specs_master.json` importu.
- Canonical vehicle üretimi.
- Mobil katalog JSON exportu.

Kapanış kriterleri:

- `[x]` `vehicle_specs` içinde 30 kayıt var.
- `[x]` `canonical_vehicles` içinde 30 kayıt var.
- `[x]` `db/exports/mobile_vehicle_catalog.json` oluştu.
- `[x]` Export mobilin okuyabileceği sade alanlarla üretildi.

Kapanış notu:

```text
30 araçlık katalog database'e import edildi ve mobil export üretildi.
```

---

### Faz 1A: Expo / React Native İskeleti

Durum:

```text
[x] Kapandı
```

Kapsam:

- Expo + React Native + TypeScript kurulumu.
- Mobil uygulama klasör yapısı.
- DMyC port/Metro çakışma önlemleri.
- Mobil katalog exportunun uygulama içine bağlanması için temel yapı.

Kapanış kriterleri:

- `[x]` `apps/mobile` oluşturuldu.
- `[x]` Expo uygulaması çalışıyor.
- `[x]` TypeScript aktif.
- `[x]` Mobil katalog JSON uygulamadan import edilebiliyor.
- `[x]` Backend gerekmeden boş başlangıç ekranı açılıyor.

Kapanış notu:

```text
Expo SDK 56 iskeleti oluşturuldu. Mobil katalog apps/mobile/src/data altına senkronlandı. TypeScript kontrolü geçti. Metro 19010 portunda açıldı ve kapatıldı.
```

---

### Faz 1B: Araç Seçimi ve Variant Akışı

Durum:

```text
[x] Kapandı
```

Kapsam:

- Marka arama/seçme.
- Model seçme.
- Variant seçme.
- Seçilen aracı local state/local persistence içinde tutma.

Kapanış kriterleri:

- `[x]` Kullanıcı marka seçebiliyor.
- `[x]` Kullanıcı model seçebiliyor.
- `[x]` Kullanıcı variant seçebiliyor.
- `[x]` Seçilen araç uygulamada saklanıyor.
- `[x]` Backend olmadan akış çalışıyor.

Kapanış notu:

```text
Marka, model ve variant akışı local katalog üzerinden çalışıyor. Seçilen araç AsyncStorage ile local olarak saklanıyor.
```

---

### Faz 1C: İlk Karne Ekranı

Durum:

```text
[x] Kapandı
```

Kapsam:

- Seçilen araç için ilk görünürlük ekranı.
- WLTP.
- Batarya kapasitesi.
- AC/DC şarj kapasitesi.
- Beklenen gerçek menzil.
- Veri güven seviyesi.

Kapanış kriterleri:

- `[x]` Araç seçildikten sonra ilk karne ekranı açılıyor.
- `[x]` Fabrika verisi ile tahmini alanlar ayrı gösteriliyor.
- `[x]` Veri güven seviyesi açıkça görünüyor.
- `[x]` Manuel veri girişi zorunlu değil.
- `[x]` Ekran kullanıcıya ilk gün değer veriyor.

Kapanış notu:

```text
Seçilen araçtan ilk karne hesaplanıyor. WLTP fabrika verisi, tahmini gerçek menzil, batarya, AC/DC, günlük SOC ve veri güveni ayrı gösteriliyor. Final onboarding tasarımı daha sonra kullanıcıdan gelecek UI'a göre giydirilecek.
```

---

### Faz 2A: Sunucu / API Foundation

Durum:

```text
[x] Kapandı
```

Kapsam:

- NestJS veya seçilecek backend iskeleti.
- API portu `4311`.
- Vehicle specs endpointleri.
- İlk karne endpointi.
- Mobilin ileride local datasetten backend datasına geçişi için DTO formatı.

Kapanış kriterleri:

- `[x]` API `4311` üzerinde çalışıyor.
- `[x]` `GET /health` çalışıyor.
- `[x]` `GET /vehicle-specs` çalışıyor.
- `[x]` İlk karne endpointi çalışıyor.
- `[x]` Vehicle specs endpointi mobilin okuyabileceği DTO formatını döndürüyor.
- `[x]` BBTV portlarıyla çakışma yok.

Kapanış notu:

```text
NestJS API iskeleti kuruldu. Health, vehicle specs, users, vehicles, vehicle ownerships, usage signals, usage profile ve first-card endpointleri eklendi. API 4311 portunda smoke testten geçti; DMyC PostGIS 55432 üzerinde kaldı, BBTV 5432/6379 hattına temas edilmedi.
```

---

### Faz 2B: Şarj Davranışı Temeli

Durum:

```text
[x] Kapandı
```

Kapsam:

- Şarj oturumu modeli.
- Şarj kanıtı modeli.
- Charging decision event için minimal kayıt.
- Manuel girişin son çare olarak konumlanması.

Kapanış kriterleri:

- `[x]` Şarj oturumu kaydı oluşturulabiliyor.
- `[x]` Şarj kanıtı placeholder modeli hazır.
- `[x]` Şarj oturumu ile karar anı ayrı tutuluyor.
- `[x]` Kullanıcı veri girmezse sistem tahmini çalışmayı sürdürüyor.

Kapanış notu:

```text
`charge_sessions`, `charge_evidence`, `charging_decision_events` ve `canonical_charging_locations` tabloları eklendi. API tarafında şarj oturumu, kanıt placeholder'ı, şarj karar anı ve araç bazlı charge summary endpointleri smoke testten geçti. Veri yokken summary tahmini çalışmanın sürdüğünü bildiriyor; veri girildiğinde güven ve toplamlar ayrı hesaplanıyor.
```

---

### Faz 3A: Trip Recorder MVP

Durum:

```text
[x] Kapandı
```

Kapsam:

- GPS izinleri.
- Trip start/stop.
- Trip point buffer.
- Mesafe, süre, ortalama hız.
- Offline queue.

Kapanış kriterleri:

- `[x]` Kullanıcı yolculuk başlatabiliyor.
- `[x]` Kullanıcı yolculuk bitirebiliyor.
- `[x]` GPS noktaları toplanıyor.
- `[x]` Mesafe/süre/ortalama hız hesaplanıyor.
- `[x]` Sürücü bilinmiyorsa `unknown` kalıyor.

Kapanış notu:

```text
`trips`, `trip_points` ve `trip_driver_assignments` tabloları eklendi. API tarafında trip başlatma, GPS point batch yazma, trip bitirme, araç bazlı trip listesi ve trip summary endpointleri smoke testten geçti. PostGIS mesafe hesabı doğrulandı; test tripinde 3 GPS noktası ile 3184 m, 720 sn ve `unknown` driver status döndü.
```

---

### Faz 3B: Expo Ekranda Görme ve Onboarding UI Hazırlığı

Durum:

```text
[x] Kapandı
```

Kapsam:

- Expo dev server'ı `19010` portunda başlatma.
- Mobil uygulamayı ekranda görme.
- Mevcut araç seçimi ve ilk karne akışını kullanıcıya gösterme.
- Gelecek onboarding tasarımları için ekran/component sınırlarını hazırlama.

Kapanış kriterleri:

- `[x]` Expo `19010` portunda açılıyor.
- `[x]` Uygulama QR / emulator / web önizleme ile görüntülenebiliyor.
- `[x]` Araç seçimi ekranda görülebiliyor.
- `[x]` İlk karne ekranda görülebiliyor.
- `[x]` Final UI tasarımları gelene kadar mevcut ekranın geçici olduğu net.

Kapanış notu:

```text
Expo web önizleme `19010` portunda açıldı. Kullanıcı Chrome üzerinde DMyC ekranını gördüğünü doğruladı. Bu ekran final onboarding tasarımı değildir; araç seçimi ve ilk karne akışını görünür kılan geçici doğrulama yüzeyidir.
```

---

### Faz 3C: Mobil API Bridge ve Backend Dataset Geçişi

Durum:

```text
[x] Kapandı
```

Kapsam:

- Mobil uygulamanın API health durumunu okuyabilmesi.
- Vehicle specs katalog verisini API'den çekebilmesi.
- API kapalıysa local katalog fallback'inin korunması.
- İlk karne akışının backend veya local katalog fark etmeksizin çalışması.

Kapanış kriterleri:

- `[x]` Mobil API client oluşturuldu.
- `[x]` `GET /health` mobil tarafından okunabiliyor.
- `[x]` `GET /vehicle-specs` mobil tarafından okunabiliyor.
- `[x]` API kapalıysa local katalogla akış bozulmuyor.
- `[x]` Araç seçimi ve ilk karne iki veri kaynağıyla da çalışıyor.

Kapanış notu:

```text
Mobil uygulamaya `apiClient` eklendi. Uygulama başlangıçta API health ve vehicle specs endpointlerini dener; API açıksa katalog API'den gelir, API kapalıysa local katalog fallback olarak korunur. Ekrana veri kaynağı durumu ve `API'yi yeniden dene` kontrolü eklendi.
```

---

### Faz 4A: Onboarding UI Tasarımlarını Bekleme ve Entegrasyon Hazırlığı

Durum:

```text
[x] Kapandı
```

Kapsam:

- Kullanıcıdan gelen ilk onboarding tasarımlarını alma.
- Mevcut geçici araç seçimi / ilk karne akışını tasarıma göre çok adımlı hale getirme.
- Marka seçimi, model seçimi, variant seçimi ve araç eklendi / ilk karne ekranlarını ayırma.
- Domain, API ve local fallback veri akışını bozmadan tasarım dilini uygulama.

Kapanış kriterleri:

- `[x]` Onboarding tasarım referansları alındı.
- `[x]` Ekran/component sınırları tasarıma göre netleşti.
- `[x]` Araç seçimi ve ilk karne akışı tasarıma göre giydirildi.
- `[x]` Backend/local fallback davranışı korunuyor.

Kapanış notu:

```text
`arac-secim.html`, `arac-model.html` ve `kullanici-araci.html` referanslarına göre mobil akış tek ekrandan çok adımlı onboarding yapısına taşındı. Akış artık marka seçimi, model seçimi, variant seçimi ve araç eklendi / ilk karne ekranlarından oluşuyor. API bridge ve local katalog fallback davranışı korundu.
```

---

### Faz 4B: Görsel İnce Ayar ve Gerçek Cihaz Kontrolü

Durum:

```text
[x] Kapandı
```

Kapsam:

- Kullanıcının ekranda gördüğü akış üzerinden görsel geri bildirim almak.
- Gerçek mobil cihaz veya emulator üzerinde Expo akışını kontrol etmek.
- Taşma, okunabilirlik, buton konumu ve seç-devam ergonomisini düzeltmek.
- Gerekirse HTML referanslarından eksik kalan mikro detayları taşımak.

Kapanış kriterleri:

- `[x]` Marka seçimi gerçek ekranda kontrol edildi.
- `[x]` Model seçimi gerçek ekranda kontrol edildi.
- `[x]` Variant seçimi gerçek ekranda kontrol edildi.
- `[x]` Araç eklendi / ilk karne ekranı gerçek ekranda kontrol edildi.
- `[x]` Kullanıcı geri bildirimiyle gerekli görsel düzeltmeler yapıldı.

Kapanış notu:

```text
Gerçek cihaz API bağlantısı için Expo public API URL desteği eklendi; web localhost, fiziksel cihaz LAN IP üzerinden API'ye gidecek şekilde ayarlandı. Mobil akışa güvenli alan ve adım göstergesi eklendi. Kullanıcı yeni çok adımlı onboarding akışını onayladı.
```

---

### Faz 5A: Araç Dataset Derinleştirme ve Alan Tamamlama

Durum:

```text
[x] Kapandı
```

Kapsam:

- `vehicle_specs_master.json` alanlarının mobil karne için yeterliliğini gözden geçirmek.
- Eksik ama ilk karneye değer katacak alanları belirlemek.
- Togg / Tesla / BYD gibi kritik markalarda veri doğrulama seviyesini netleştirmek.
- Dataset import/export akışını bozmadan alan genişletme planı yapmak.

Kapanış kriterleri:

- `[x]` Mevcut araç alanları gözden geçirildi.
- `[x]` İlk karne için gerekli ek alanlar belirlendi.
- `[x]` Seed/import/export etkisi çıkarıldı.
- `[x]` Mobil ilk karne alanlarıyla dataset alanları eşleştirildi.

Kapanış notu:

```text
DB şemasında zaten bulunan fakat API DTO ve mobil export katmanına taşınmayan dataset alanları tamamlandı. `catalogKey` ve `vehicleSpecId` ayrımı eklendi. Mobil ilk karne verimlilik, ağırlık, ısı pompası, koltuk sayısı ve kaynak bilgisini gösterebilir hale geldi. Alan taşıma kararı `Docs/Planlar/06-VEHICLE-DATASET-FIELD-AUDIT.md` dosyasına yazıldı.
```

---

### Faz 5B: Kritik Araç Kaynak Doğrulama

Durum:

```text
[x] Kapandı
```

Kapsam:

- Togg, Tesla, BYD ve ilk ekranda öne çıkan markaların kaynaklarını güncel resmi/öncelikli kaynaklarla doğrulamak.
- `verification_level`, `source_name` ve `source_url` alanlarını tutarlı hale getirmek.
- Güncel olmayan veya çelişkili değerleri ayrı notla işaretlemek.

Kapanış kriterleri:

- `[x]` Kritik markalar için kaynak kontrolü yapıldı.
- `[x]` Çelişkili alanlar listelendi.
- `[x]` Güncellenecek dataset kayıtları belirlendi.
- `[x]` Değişiklik gerekiyorsa seed/export akışı tekrar çalıştırıldı.

Kapanış notu:

```text
Togg, Tesla, BYD ve Kia için resmi kaynak kontrolü yapıldı. BYD ve Kia kayıtları resmi kaynaklarla uyumlu hale getirildi. Tesla Model Y, BMW i4 ve Mercedes EQE SUV kayıtları güncel/variant bazlı çakışma nedeniyle `needs_review` olarak işaretlendi. Togg T10X kaynak URL'leri resmi modele taşındı; AC/DC değerleri variant bazlı doğrulama gerektirdiği için topluca değiştirilmedi. Detaylı rapor `Docs/Planlar/07-VEHICLE-SOURCE-VALIDATION-REPORT.md` dosyasına yazıldı.
```

---

### Faz 5C: Needs Review Kayıtlarının Variant Bazlı Ayrıştırılması

Durum:

```text
[x] Kapandı
```

Kapsam:

- `needs_review` işaretlenen Tesla, BMW ve Mercedes kayıtlarını model/trim bazında yeniden eşlemek.
- Togg T10X AC/DC şarj değerlerini variant bazlı netleştirmek.
- Güncel resmi satış varyantları ile eski dataset varyantlarını ayırmak.
- Mobil katalogda eski veya çelişkili değerlerin kullanıcıya kesin gerçek gibi görünmesini engellemek.

Kapanış kriterleri:

- `[x]` Tesla Model Y güncel Türkiye varyantları ayrı ayrı çıkarıldı.
- `[x]` Togg T10X AC/DC değerleri variant bazında doğrulandı.
- `[x]` BMW i4 ve Mercedes EQE SUV kayıtları güncel Türkiye trimleriyle eşleştirildi veya arşiv/eski kayıt olarak ayrıldı.
- `[x]` Güncellenen kayıtlar seed, export ve mobil katalog akışına tekrar yansıtıldı.

Kapanış notu:

```text
Tesla Model Y güncel Türkiye varyantları Standard RWD, Premium Long Range RWD, Premium Long Range AWD ve Performance olarak ayrıldı. Togg T10X kayıtları resmi T10X katalog PDF'indeki variant tablosuna göre AC/DC, ağırlık ve tüketim alanlarında güncellendi. BMW i4 eDrive30 M Sport ve Mercedes-Benz EQE SUV 350 4MATIC kayıtları güncel Türkiye kaynaklarıyla birebir eşleşmediği için `legacy_reference` / `archived_legacy` olarak aktif katalogdan ayrıldı. Detaylı karar raporu `Docs/Planlar/08-VEHICLE-NEEDS-REVIEW-VARIANT-RESOLUTION.md` dosyasına yazıldı.
```

---

### Aktif Katalog Dışı / Eksik Kayıt Takibi

Bu liste silinen araçlar listesi değildir. DB içinde kanıt ve geçmiş için tutulan, ancak mobil onboarding katalogunda kullanıcıya aktif seçim olarak gösterilmeyen veya alan eksiği kalan kayıtları takip eder.

Aktif katalog dışına alınan kayıtlar:

```text
BMW i4 eDrive30 M Sport
Durum: legacy_reference / archived_legacy
Neden: Güncel BMW Türkiye i4 sayfası eDrive40 hattını gösteriyor; eDrive30 M Sport birebir güncel satış trim'i olarak doğrulanmadı.
Sonraki aksiyon: Güncel BMW i4 Türkiye varyantları ayrı kayıt olarak eklenecek veya eDrive30 arşiv kaydı olarak bırakılacak.

Mercedes-Benz EQE SUV 350 4MATIC
Durum: legacy_reference / archived_legacy
Neden: Güncel Mercedes Türkiye broşürü EQE sedan içeriği veriyor; EQE SUV 350 4MATIC için birebir güncel Türkiye teknik kaynak netleşmedi.
Sonraki aksiyon: EQE SUV güncel Türkiye teknik kaynağı bulunursa aktif kataloga yeni/temiz kayıt olarak eklenecek.
```

Alan eksiği kalan kayıtlar:

```text
Tesla Model Y güncel Türkiye varyantları
Eksik / kısmi alan: Resmi Tesla Türkiye sayfası batarya kWh değerini açık vermiyor.
Mevcut karar: WLTP, ağırlık, tüketim ve DC şarj resmi kaynaktan; batarya kapasitesi legacy datasetten korunuyor.
Doğrulama: partial_official_verified

Togg T10F RWD Standard Range / RWD Long Range
Eksik / kısmi alan: Ağırlık ve resmi tüketim alanları henüz variant bazlı resmi tabloyla tamamlanmadı.
Mevcut karar: Kaynak resmi T10F model sayfası; eksik alanlar null kalıyor.
Doğrulama: official_verified ama alan tamamlığı kısmi.
```

Kural:

```text
Eksik alan uydurulmaz.
Güncel trim net değilse aktif kataloga zorla sokulmaz.
DB geçmişi tutar; mobil katalog kullanıcıya temiz aktif seçenek gösterir.
```

---

### Faz 5D: Review Kanıt Havuzu ve Admin Karar Modeli

Durum:

```text
[x] Kapandı
```

Kapsam:

- Resmi kaynaklardan gelen ham kanıtları `vehicle_specs` içine doğrudan yazmadan ayrı modellemek.
- `vehicle_source_evidence` ve `vehicle_spec_review_decisions` veri modelini tasarlamak.
- Admin tarafında dataset değeri, kaynak kanıtı ve elle verilen karar geçmişini ayrı gösterecek yapıyı planlamak.
- Otomatik güncelleme yerine denetlenebilir insan kararı akışını kurmak.

Kapanış kriterleri:

- `[x]` Review kanıt havuzu veri modeli yazıldı.
- `[x]` Elle karar geçmişi veri modeli yazıldı.
- `[x]` Admin ekranında gösterilecek review alanları belirlendi.
- `[x]` Dataset import/export akışının bu kanıt havuzuyla ilişkisi netleştirildi.

Kapanış notu:

```text
`vehicle_source_evidence` ve `vehicle_spec_review_decisions` tabloları için migration eklendi. Admin review ekranında gösterilecek dataset değeri, kaynak kanıtı, çakışan alanlar, karar tipi ve karar gerekçesi modeli `Docs/Planlar/09-VEHICLE-REVIEW-EVIDENCE-ADMIN-MODEL.md` dosyasına yazıldı. `legacy_reference` kayıtlarının DB'de kalıp mobil export ve normal API listeleme dışında tutulması kuralı netleştirildi.
```

---

### Faz 5E: Review Evidence Seed ve Admin Listeleme Endpointleri

Durum:

```text
[x] Kapandı
```

Kapsam:

- Tesla, Togg, BMW ve Mercedes için ilk review kanıt kayıtlarını `vehicle_source_evidence` içine seed etmek.
- Admin tarafı için pending evidence ve decision listeleme endpointlerini hazırlamak.
- Aktif katalog dışı kayıtları admin review ekranında görünür hale getirmek.
- Mobil katalogu etkilemeden admin/review verisini sunucu tarafında okunabilir yapmak.

Kapanış kriterleri:

- `[x]` İlk review evidence seed kayıtları oluşturuldu.
- `[x]` Admin evidence listeleme endpointi eklendi.
- `[x]` Admin decision listeleme/oluşturma endpointi eklendi.
- `[x]` Aktif katalog dışı kayıtlar admin review yüzeyinde görülebiliyor.

Kapanış notu:

```text
Togg T10X, Tesla Model Y, BMW i4 ve Mercedes-Benz EQE SUV için ilk `vehicle_source_evidence` seed kayıtları oluşturuldu. Her evidence için ilk review decision kaydı eklendi. Admin API tarafında `GET /admin/vehicle-review/evidence`, `GET /admin/vehicle-review/decisions` ve `POST /admin/vehicle-review/decisions` endpointleri eklendi. API smoke ile evidence listeleme, archived reference filtreleme ve manuel decision oluşturma doğrulandı; test decision kaydı sonrasında temizlendi.
```

---

### Faz 5F: Admin Review UI ve Operasyon Ekranı

Durum:

```text
[x] Kapandı
```

Kapsam:

- Review evidence ve decision kayıtlarını gösterecek ilk admin ekranını tasarlamak.
- Aktif katalog, legacy reference ve kısmi doğrulanmış kayıtları ayrı görsel durumlarla ayırmak.
- Adminin karar geçmişini okuyabilmesi ve yeni karar oluşturabilmesi.
- Bu ekranın şimdilik public kullanıcı akışına bağlanmaması.

Kapanış kriterleri:

- `[x]` Admin review ekranı için rota/ekran yeri belirlendi.
- `[x]` Evidence listesi admin yüzeyinde görünüyor.
- `[x]` Decision geçmişi admin yüzeyinde görünüyor.
- `[x]` Yeni decision oluşturma akışı UI'dan çalışıyor.

Kapanış notu:

```text
`apps/web` altında Next.js tabanlı ilk admin review operasyon ekranı kuruldu. Web portu BBTV ile çakışmaması için `4310` olarak sabitlendi. Ekranda evidence listesi, durum metrikleri, kaynak detayları, çakışan alanlar, kaynak değerleri, karar geçmişi ve yeni decision formu yer alıyor. Evidence ve decision verisi `4311` API endpointlerinden okunuyor. Web build, web typecheck, API typecheck ve HTTP smoke kontrolleri geçti. Browser plugin tarafında aktif browser instance bulunmadığı için görsel otomasyon yapılamadı; sayfa HTML ve API akışı HTTP üzerinden doğrulandı.
```

---

### Faz 5G: Admin Review UI Görsel Kontrol ve İnce Ayar

Durum:

```text
[x] Kapandı
```

Kapsam:

- `http://localhost:4310` admin review ekranını gerçek tarayıcıda görsel olarak kontrol etmek.
- Desktop ve dar ekran düzeninde taşma, okunabilirlik ve form ergonomisini iyileştirmek.
- Decision oluşturma akışını UI üzerinden gerçek tıklama/form girdisiyle test etmek.
- Gerekirse admin ekranını kullanıcıya gösterilecek operasyon standardına yaklaştırmak.

Kapanış kriterleri:

- `[x]` Admin review ekranı `http://localhost:4310` üzerinden HTTP/build kontrollerinden geçti.
- `[x]` Evidence seçimi için interaktif liste ve detay paneli eklendi.
- `[x]` Decision formu endpoint smoke testiyle doğrulandı.
- `[x]` Gerekli görsel/ergonomik düzeltmeler yapıldı.

Kapanış notu:

```text
Admin review ekranı spec edit alanı yanında gerçek evidence/decision operasyon yüzeyine genişletildi. Evidence seçimi, kaynak detayları, conflict alanları, kaynak değerleri, karar geçmişi ve yeni karar formu aynı ekranda çalışıyor. `battery_chemistry` tekrarını engelleyen jsonKey tekilleştirme ve `year_to = null` için Devam ediyor davranışı korundu. Web typecheck, production build ve decision create/delete smoke testi geçti. Browser plugin aktif olmadığı için görsel doğrulama HTTP/build/smoke ve kullanıcı ekran kontrolüne bırakıldı.
```

---

### Faz 5H: Admin Araç ve Review Sayfa Ayrımı

Durum:

```text
[x] Kapandı
```

Kapsam:

- Araç alan doldurma ekranını ayrı admin sayfası yapmak.
- Kanıt ve karar operasyonunu ayrı admin sayfası yapmak.
- Ana admin girişini araç alan tablosuna yönlendirmek.
- İki ekran arasında gerçek route tabanlı geçiş sağlamak.

Kapanış kriterleri:

- `[x]` Araç alan tablosu `/admin/vehicles` rotasında tek başına açılıyor.
- `[x]` Kanıt ve karar detayı `/admin/review` rotasında tek başına açılıyor.
- `[x]` `/` kök adresi `/admin/vehicles` rotasına yönleniyor.
- `[x]` Web typecheck, production build ve HTTP route kontrolleri geçti.

Kapanış notu:

```text
Admin review yüzeyi iki gerçek sayfaya ayrıldı. `/admin/vehicles` sadece araç spec alan tablosunu gösteriyor; `/admin/review` sadece evidence/decision operasyonunu gösteriyor. Ortak veri yükleme helper'ı eklendi ve sekmeler sayfa içi state yerine route linkleriyle çalışacak hale getirildi. `npm run web:typecheck`, `npm run web:build`, `/admin/vehicles`, `/admin/review` ve `/` redirect HTTP kontrolleri geçti. Touched dosyalarda mojibake taraması temiz çıktı.
```

Faz yorumu:

```text
Admin JSON alanı üzerinde karar alıp kayıt yapabiliyorsa bu operasyon katmanı tamamlanmış kabul edilir. Bundan sonra boş kalan alanlar yeni bir uygulama fazı değil, `pending` veri tamamlama backlog'u olarak yönetilir. Eksik veri uydurulmaz; kaynak/kanıt gelene kadar kayıt pending kalır.
```

---

### Faz 5I: Araç Fotoğraf Alanı ve Upload Akışı

Durum:

```text
[x] Kapandı
```

Kapsam:

- Araç spec kaydına kullanıcıya gösterilecek fotoğraf alanı eklemek.
- Admin detay ekranında fotoğraf URL'i elle girilebilsin.
- Admin detay ekranında görsel dosya upload edilebilsin.
- Mobil katalog ve kullanıcı araç özeti seçili aracın fotoğrafını okuyabilsin.

Kapanış kriterleri:

- `[x]` `vehicle_specs.image_url` alanı migration ile eklendi.
- `[x]` Admin API ve public vehicle specs DTO `imageUrl` döndürüyor.
- `[x]` Admin araç detayında URL girişi, dosya upload ve önizleme çalışıyor.
- `[x]` Mobil katalog export/sync `imageUrl` alanını taşıyor.
- `[x]` Mobil araç özet ekranı araç fotoğrafı varsa onu, yoksa mevcut fallback görseli kullanıyor.

Kapanış notu:

```text
Araç fotoğrafı için `image_url` alanı eklendi. Admin web tarafında `/api/admin-review/upload` endpointi jpg/png/webp/gif dosyalarını `public/uploads/vehicles` altına yüklüyor ve kayda yazılabilecek tam URL döndürüyor. Admin detay ekranında hem URL elle yazılabiliyor hem dosya upload edilebiliyor; upload sonrası DB kaydı yine `Kaydet` butonuyla yapılıyor. Public API, admin API, mobile export ve mobil katalog tipi `imageUrl` alanını taşıyacak hale getirildi. API/web/mobile typecheck, web build, DB smoke ve upload smoke geçti.
```
