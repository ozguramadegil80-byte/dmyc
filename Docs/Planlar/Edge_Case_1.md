# Edge_Case_1.md — Aynı Evde Ortak Araç, Çoklu Sürücü ve Araç Tespiti

> Kapsam: Aynı evde yaşayan iki veya daha fazla kişinin aynı elektrikli aracı kullanması; telefon hareketiyle yolculuk algılanırken bu yolculuğun hangi araca ve hangi sürücüye yazılacağının belirlenmesi.
>
> Temel karar: Araç tespiti ve sürücü tespiti birbirinden ayrı ele alınmalıdır.

---

## 1. Problem Tanımı

EV Karnesi sistemi telefon hareketinden yolculuk algılayabilir.

Telefon GPS, ivme, hız ve konum paternleri üzerinden şunu anlayabilir:

```text
Bu kullanıcı araç hızında hareket ediyor.
```

Ancak bu tek başına şu iki soruya kesin cevap vermez:

```text
1. Bu yolculuk hangi araçla yapıldı?
2. Direksiyonda kim vardı?
```

Özellikle aynı evde şu senaryolar oluşabilir:

```text
- Aynı evde iki kişi aynı aracı kullanıyor.
- İki yetkili kullanıcı aynı anda araçta bulunuyor.
- Kullanıcının birden fazla aracı var.
- Evde birden fazla EV var.
- Telefon hareket ediyor ama hangi araca ait olduğu net değil.
```

Bu nedenle sistemin yolculuğu doğru araca ve mümkünse doğru sürücüye bağlaması gerekir.

---

## 2. Ana Prensip

```text
Araç tespiti ayrı bir problemdir.
Sürücü tespiti ayrı bir problemdir.
```

Sistem şu iki confidence değerini ayrı tutmalıdır:

```text
vehicle_confidence_score
driver_confidence_score
```

Yanlış yaklaşım:

```text
Telefon hareket ediyor → bu kullanıcı bu aracı sürdü
```

Doğru yaklaşım:

```text
Telefon hareket ediyor
↓
Hangi araçta olduğu tespit edilir
↓
Direksiyonda kim olduğu ayrıca tespit edilir
↓
Emin olunmazsa soru sorulur
↓
Cevap yoksa unknown bırakılır
```

---

## 3. Temel Senaryolar

### 3.1 Kullanıcının Tek Aktif Aracı Varsa

Eğer kullanıcının sistemde yalnızca bir aktif aracı varsa:

```text
vehicle_source = single_active_vehicle
vehicle_confidence_score = medium_high
```

Bu durumda yolculuk varsayılan olarak o araca yazılabilir.

Ancak sürücü yine ayrıca değerlendirilmelidir.

---

### 3.2 Aynı Evde İki Kişi, Tek Ortak Araç Varsa

Örnek:

```text
Araç: Tesla Model Y
Ana kullanıcı: Özgür
Partner kullanıcı: Eşi
İkisi de aynı aracı kullanabiliyor
```

Araç tek kalır:

```text
vehicle_id = aynı araç
ownership_id = aynı sahiplik dönemi
```

Sürücüler ayrı tutulur:

```text
vehicle_drivers:
- owner
- partner
- family
```

Eğer yalnızca bir telefon araçla hareket ediyorsa:

```text
vehicle_id = ortak araç
driver_user_id = hareket eden telefonun kullanıcısı
driver_source = phone_detected
```

Eğer iki telefon da aynı anda aynı rotada hareket ediyorsa:

```text
vehicle_id = ortak araç
driver_user_id = unknown
driver_source = co_presence_uncertain
```

Bu durumda sistem sürücüyü uydurmaz.

---

### 3.3 İki Telefon Aynı Araçta Algılanırsa

Bu durum `co_presence` olarak işaretlenir.

Sistem şunu bilir:

```text
İki yetkili kullanıcı aynı yolculukta birlikte olabilir.
```

Ama şunu kesin bilmez:

```text
Direksiyonda kim vardı?
```

Bu durumda sistem bağlam sorusu sorar:

```text
Bu yolculukta direksiyonda kim vardı?

- Ben sürüyordum
- Partner sürüyordu
- Ortak / değişimli
- Daha sonra
```

Cevap gelirse trip driver assignment güncellenir.

Cevap gelmezse:

```text
driver_user_id = null
driver_source = unknown
driver_confidence_score = low
```

---

### 3.4 Kullanıcının Birden Fazla Aracı Varsa

Örnek:

```text
Araçlar:
- Tesla Model Y
- Togg T10X
```

Telefon hareketi tek başına hangi araçta olduğunu kesin göstermez.

Bu durumda sistem aşağıdaki kanıt sırasını kullanmalıdır:

```text
1. OEM / araç API bağlantısı
2. Bluetooth bağlantısı
3. CarPlay / Android Auto bağlantısı
4. Araç içi BLE beacon
5. Kullanıcı seçimi
6. Rota ve kullanım paterni tahmini
7. Unknown
```

Eğer yüksek güvenli bağlantı yoksa sistem sormalıdır:

```text
Bu yolculuk hangi araçla yapıldı?

- Tesla Model Y
- Togg T10X
- Başka araç
- Daha sonra
```

---

## 4. İlk Kurulum Kararı: Bluetooth Eşleştirme

İlk kurulumda kullanıcıdan telefonunu aracın Bluetooth bağlantısıyla eşleştirmesi istenmelidir.

Amaç:

```text
Yolculukların doğru araca yazılması.
```

Kullanıcıya gösterilecek açıklama:

```text
Telefonunuzu aracın Bluetooth bağlantısıyla eşleştirerek yolculukların doğru araca yazılmasını sağlayabilirsiniz.

Bu işlem özellikle aynı evde birden fazla araç veya birden fazla sürücü varsa önemlidir. Bluetooth eşleşmesi sayesinde sistem “hangi araç kullanıldı?” sorusunu daha yüksek güvenle cevaplar.
```

Bluetooth adımı zorunlu değil, güçlü öneri olarak sunulmalıdır.

Kısa UI metni:

```text
Araç eşleştirme önerilir.
Bu sayede sistem yolculuğun hangi araçla yapıldığını daha doğru anlar.
```

---

## 5. Bluetooth Ne Çözer, Ne Çözmez?

Bluetooth çoğunlukla şu soruyu çözer:

```text
Bu yolculuk hangi araca ait?
```

Ama tek başına her zaman şu soruyu çözmez:

```text
Direksiyonda kim vardı?
```

Çünkü aynı araçta iki telefon aynı anda bulunabilir.

Bu nedenle sistemde ayrım korunmalıdır:

```text
Araç tespiti:
Bluetooth / CarPlay / OEM / tek aktif araç

Sürücü tespiti:
Telefon aktifliği / co-presence / kullanıcı doğrulaması / sürüş paterni
```

---

## 6. Önerilen Veri Modeli Ekleri

### 6.1 trips Tablosuna Eklenecek Alanlar

```sql
ALTER TABLE trips ADD COLUMN vehicle_source TEXT;
ALTER TABLE trips ADD COLUMN vehicle_confidence_score NUMERIC;
ALTER TABLE trips ADD COLUMN driver_user_id UUID;
ALTER TABLE trips ADD COLUMN driver_source TEXT;
ALTER TABLE trips ADD COLUMN driver_confidence_score NUMERIC;
```

Önerilen `vehicle_source` değerleri:

```text
single_active_vehicle
bluetooth_detected
carplay_detected
android_auto_detected
oem_api_detected
user_selected
inferred_from_pattern
unknown
```

Önerilen `driver_source` değerleri:

```text
phone_detected
user_selected
co_presence_confirmed
co_presence_uncertain
inferred_from_style
unknown
```

---

### 6.2 vehicle_device_links Tablosu

Telefon / Bluetooth / CarPlay / Android Auto / OEM bağlantılarını araca bağlamak için kullanılmalıdır.

```sql
CREATE TABLE vehicle_device_links (
  id UUID PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  user_id UUID,

  device_type TEXT NOT NULL,
  -- phone
  -- bluetooth
  -- carplay
  -- android_auto
  -- ble_tag
  -- oem_account

  device_display_name TEXT,
  device_identifier_hash TEXT NOT NULL,

  link_status TEXT DEFAULT 'active',
  -- active
  -- removed

  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Güvenlik notu:

```text
Ham Bluetooth identifier düz yazı tutulmamalıdır.
Hash'li tanımlayıcı kullanılmalıdır.
```

---

### 6.3 co_presence_events Tablosu

İki yetkili kullanıcının aynı yolculukta birlikte algılandığı durumları tutar.

```sql
CREATE TABLE co_presence_events (
  id UUID PRIMARY KEY,
  trip_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,

  detected_user_ids JSONB NOT NULL,

  detection_source TEXT,
  -- gps_overlap
  -- bluetooth_overlap
  -- same_route_same_time
  -- mixed

  confidence_score NUMERIC,

  resolution_status TEXT DEFAULT 'pending',
  -- pending
  -- confirmed
  -- ignored
  -- expired

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 6.4 trip_driver_assignments Tablosu

Bir trip içinde sürücü/yolcu/ortak sürücü rollerini tutar.

```sql
CREATE TABLE trip_driver_assignments (
  id UUID PRIMARY KEY,
  trip_id UUID NOT NULL,
  user_id UUID,

  role TEXT NOT NULL,
  -- driver
  -- passenger
  -- shared_driver
  -- unknown

  source TEXT NOT NULL,
  -- user_confirmed
  -- co_presence_prompt
  -- inferred
  -- unknown

  confidence_score NUMERIC,

  confirmed_by_user_id UUID,
  confirmed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Karar Motoru

### 7.1 Araç Tespiti Karar Sırası

```text
1. OEM API aktif ve trip araca ait görünüyorsa
   → vehicle_source = oem_api_detected
   → confidence = very_high

2. Telefon araç Bluetooth’una bağlandıysa
   → vehicle_source = bluetooth_detected
   → confidence = high

3. CarPlay / Android Auto bağlantısı varsa
   → vehicle_source = carplay_detected / android_auto_detected
   → confidence = high

4. Kullanıcının tek aktif aracı varsa
   → vehicle_source = single_active_vehicle
   → confidence = medium_high

5. Rota ve kullanım paterni güçlü eşleşiyorsa
   → vehicle_source = inferred_from_pattern
   → confidence = medium

6. Birden fazla ihtimal varsa
   → kullanıcıya soru sor

7. Cevap yoksa
   → vehicle_source = unknown
   → confidence = low
```

---

### 7.2 Sürücü Tespiti Karar Sırası

```text
1. Tek yetkili kullanıcı araçla hareket ediyorsa
   → driver_source = phone_detected
   → confidence = medium_high

2. Kullanıcı manuel seçtiyse
   → driver_source = user_selected
   → confidence = high

3. İki yetkili kullanıcı aynı araçta algılandıysa
   → co_presence_event oluştur
   → sürücüyü sorma akışı başlat

4. Sürüş paterni çok güçlü eşleşiyorsa
   → driver_source = inferred_from_style
   → confidence = medium

5. Emin değilse
   → driver_source = unknown
```

---

## 8. Kullanıcıya Sorulacak Sorular

### 8.1 Hangi Araç Sorusu

```text
Bu yolculuk hangi araçla yapıldı?

- Tesla Model Y
- Togg T10X
- Başka araç
- Daha sonra
```

Bu soru yalnızca araç tespit güveni düşükse sorulur.

---

### 8.2 Kim Sürdü Sorusu

```text
Bu yolculukta direksiyonda kim vardı?

- Ben sürüyordum
- Partner sürüyordu
- Ortak / değişimli
- Daha sonra
```

Bu soru özellikle co-presence durumunda sorulur.

---

## 9. Soru Kime Gönderilmeli?

Eğer iki yetkili kullanıcı aynı araçta algılandıysa:

```text
Soru mümkünse sürmeyen kişiye gönderilmelidir.
```

Çünkü sürücü telefona bakmamalıdır.

Eğer sistem sürmeyen kişiyi bilemiyorsa:

```text
Düşük öncelikli bildirim iki yetkili kullanıcıya da gönderilebilir.
İlk doğrulayan kişinin cevabı trip bağlamına yazılır.
```

---

## 10. Raporlama Etkisi

Araç doğru tespit edilirse:

```text
Araç karnesi doğru oluşur.
Batarya döngüsü doğru araca yazılır.
Enerji maliyeti doğru araca yazılır.
```

Sürücü doğru tespit edilirse:

```text
Sürücü kullanım profili doğru oluşur.
Agresif / dengeli / verimli kullanım ayrımı doğru yapılır.
Partner sürücünün davranışı ana kullanıcıya yanlış yazılmaz.
```

Emin olunamayan yolculuklar:

```text
unknown
```

olarak kalmalıdır.

Unknown veri hata değildir; gerçek dünya belirsizliğidir.

---

## 11. Public / Premium Karneye Etkisi

Public QR karnede varsayılan olarak araç toplamı gösterilir:

```text
Araç toplam km
Tahmini döngü
Enerji kullanımı
Kullanım bandı
Veri güven skoru
```

Premium detayda sürücü bazlı ayrım gösterilebilir:

```text
Araç toplamı
Ana kullanıcı sürüş profili
Partner sürücü profili
Ortak / bilinmeyen yolculuk oranı
```

Örnek:

```text
Araç toplam tüketim: 18.2 kWh / 100 km
Ana kullanıcı: Dengeli kullanım
Partner sürücü: Hafif dinamik kullanım
Bilinmeyen/ortak yolculuk: %12
```

---

## 12. Gizlilik ve Güvenlik

Sistem kullanıcılara açıkça anlatmalıdır:

```text
Bluetooth eşleştirmesi, yolculukların doğru araca yazılması için kullanılır.
Bu veri, kullanıcıyı izlemek için değil; araç karnesinin doğru oluşması için kullanılır.
```

Saklanmaması gerekenler:

```text
Ham Bluetooth MAC adresi
Kişisel cihaz ID’si
Gereksiz sürekli konum geçmişi
```

Saklanabilecek güvenli veri:

```text
Hashlenmiş cihaz tanımlayıcı
Eşleşme tipi
Son görülme zamanı
Bağlı araç ID’si
Güven skoru
```

---

## 13. MVP Uygulama Sırası

### Faz 1 — Veri Modeli

```text
- vehicle_device_links tablosunu ekle
- trips tablosuna vehicle_source / vehicle_confidence_score ekle
- trips tablosuna driver_source / driver_confidence_score ekle
- co_presence_events tablosunu ekle
- trip_driver_assignments tablosunu ekle
```

### Faz 2 — Onboarding

```text
- Araç seçimi sonrası Bluetooth eşleştirme ekranı ekle
- Bluetooth eşleşirse vehicle_device_links kaydı oluştur
- Kullanıcıya eşleşmenin amacı açıkça anlat
```

### Faz 3 — Trip Başlangıcı

```text
- Telefon hareketiyle trip başlangıcı algıla
- Aktif Bluetooth / CarPlay / Android Auto bağlantısını kontrol et
- Eşleşen vehicle_id varsa trip’i o araca bağla
- Yoksa tek aktif araç kontrolü yap
- Birden fazla araç varsa kullanıcıdan seçim iste
```

### Faz 4 — Çoklu Sürücü

```text
- vehicle_drivers üzerinden yetkili kullanıcıları bul
- Aynı anda iki yetkili telefon hareket ediyorsa co_presence_event oluştur
- Sürücü sorusunu tetikle
- Cevabı trip_driver_assignments içine yaz
```

### Faz 5 — Raporlama

```text
- Araç karnesinde vehicle_confidence göster
- Sürücü profilinde driver_confidence göster
- Unknown / ortak yolculuk oranını rapora ekle
```

---

## 14. Başarı Kriterleri

Bu edge case çözülmüş sayılırsa:

```text
- Aynı evde iki kişi aynı aracı kullanabiliyor.
- Sistem aracı tek varlık olarak koruyor.
- Yolculuklar mümkün olduğunca doğru araca yazılıyor.
- Bluetooth eşleşmesi araç tespit güvenini artırıyor.
- İki telefon aynı araçta algılanırsa sistem sürücüyü uydurmuyor.
- Emin değilse kısa doğrulama sorusu soruyor.
- Cevap yoksa unknown bırakıyor.
- Public karne araç toplamını, premium karne sürücü ayrımını gösterebiliyor.
```

---

## 15. Net Karar

```text
Araç tespiti için ilk kurulumda Bluetooth eşleştirme önerilecek.

Bluetooth yolculuğun hangi araca ait olduğunu belirlemek için kullanılacak.

Bluetooth sürücüyü kesin belirlemek için tek başına yeterli kabul edilmeyecek.

Aynı araçta iki yetkili kullanıcı varsa sistem co-presence algılayacak ve gerekirse “kim sürdü?” sorusunu soracak.

Araç ve sürücü güven skorları ayrı tutulacak.

Belirsizlik durumunda sistem veri uydurmayacak; unknown geçerli cevap olacak.
```
