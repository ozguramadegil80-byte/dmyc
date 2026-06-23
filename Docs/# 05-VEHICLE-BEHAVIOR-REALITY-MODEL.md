# 05-VEHICLE-BEHAVIOR-REALITY-MODEL.md

# EV Karnesi / Vehicle Reality Layer

## Araç Kullanım Gerçekliği Modeli

Bu doküman teknik mimari dokümanı değildir.

Amaç:

```text
Araçlar nasıl çalışıyor?
```

sorusunu cevaplamak değildir.

Amaç:

```text
İnsanlar araçlarını gerçekte nasıl kullanıyor?
```

sorusunu cevaplamaktır.

Bu doküman sistemin gerçek dünya referansıdır.

Veri modeli, davranış motoru ve ürün kararları bu modele aykırı davranmamalıdır.

---

# 1. Temel Prensip

Araç gerçekliği:

```text
Araç
+
Sürücü
+
Yolculuk
+
Şarj
+
Bakım
+
Alışkanlık
```

birlikte oluşur.

Tek başına araç hiçbir şeyi açıklamaz.

---

# 2. Araç Modeli Değil Kullanım Modeli

Aynı araç farklı kişilerde tamamen farklı davranabilir.

Örnek:

Tesla Model Y

Kullanıcı A:

```text
20 km/gün

Evden şarj

Şehir içi
```

---

Kullanıcı B:

```text
300 km/gün

DC ağırlıklı

Otoyol
```

Araç aynıdır.

Gerçeklik farklıdır.

Bu nedenle sistemin merkezinde:

```text
Araç modeli
```

değil,

```text
Kullanım modeli
```

olmalıdır.

---

# 3. Kullanıcı Araç Satın Almaz

Kullanıcı:

```text
Batarya
Motor
WLTP
```

satın almaz.

Kullanıcı:

```text
Güven

Menzil

Rahatlık

Maliyet
```

satın alır.

Bu nedenle ürünün temel sorusu:

```text
Bu araç kaç km gider?
```

değil,

```text
Bu araç benim hayatımda nasıl davranır?
```

olmalıdır.

---

# 4. Menzil Kaygısı Gerçeği

Elektrikli araç kullanıcılarının temel korkusu:

```text
Batarya bitmesi
```

değildir.

Asıl korku:

```text
Belirsizlik
```

tir.

Örnek:

```text
%40 SOC
```

kullanıcıyı korkutmaz.

Ama:

```text
Yeter mi?
```

sorusu korkutur.

Bu nedenle sistem:

```text
Kalan enerji
```

değil,

```text
Güven görünürlüğü
```

üretmelidir.

---

# 5. Kullanıcı Sürekli Veri Girmez

Bu sistemin en kritik gerçeklerinden biridir.

Kullanıcı:

İlk gün veri girer.

İlk hafta veri girer.

Sonra bırakır.

Bu nedenle:

```text
Veri girişi
```

iş modeline dönüşemez.

---

Temel prensip:

```text
Önce gözlemle

Sonra tahmin et

Emin değilsen sor

Öğren

Sonra sus
```

---

# 6. Kullanıcı Şarj Kaydı Tutmaz

Gerçek dünyada kullanıcı:

```text
kWh

TL

Başlangıç SOC

Bitiş SOC
```

bilgilerini düzenli kaydetmez.

Bu nedenle sistem:

```text
Fotoğraf

OCR

GPS

İstasyon tespiti
```

gibi yöntemlerle veri toplamaya çalışmalıdır.

Manuel giriş son çaredir.

---

# 7. Araç Tek Kullanıcılı Değildir

Gerçek dünyada:

```text
Eş

Partner

Çocuk

Şirket çalışanı

Misafir sürücü
```

aynı aracı kullanabilir.

Bu nedenle:

```text
Araç ≠ Sürücü
```

kararı sistemin temel prensibidir.

---

# 8. Sürücü Her Zaman Bilinemez

İki yetkili kullanıcı aynı araçta olabilir.

Bu durumda sistem:

```text
Tahmin
```

yapabilir.

Ama:

```text
Kesin biliyorum
```

diyemez.

---

Temel prensip:

```text
Unknown
```

geçerli cevaptır.

Belirsizlik hata değildir.

Gerçek dünyanın bir parçasıdır.

---

# 9. Ortak Yolculuk Gerçeği

Uzun yolda:

```text
Bir süre ben

Bir süre eşim
```

araç kullanabilir.

Bu nedenle:

```text
Driver
Passenger
Shared Driver
```

rolleri desteklenmelidir.

---

# 10. İnsanlar Aynı Rotayı Tekrarlar

Çoğu sürücü:

```text
Ev

İş

Market

Aile ziyareti
```

gibi sınırlı sayıda rotayı tekrarlar.

Bu nedenle:

```text
Rota Fingerprint
```

ürünün temel yapı taşıdır.

---

# 11. İnsanlar Tahmin Edilebilir Ama Aynı Değildir

Her kullanıcı:

```text
Şehir içi

Uzun yol

Karışık
```

gibi genel kullanım kalıplarına sahiptir.

Ancak bireysel farklılıklar korunmalıdır.

Bu nedenle:

```text
Topluluk benchmarkı
```

tek gerçek kabul edilmez.

---

# 12. Kullanım Profili Kavramı

Sistemde yeni kavram:

```text
Usage Profile
```

olacaktır.

Bu araç değil,

kullanım davranışıdır.

---

Örnek profiller:

```text
City Commuter

Long Distance Driver

Family Vehicle

Mixed Usage

Fleet Vehicle

Home Charger

High DC User
```

---

Bu profiller zamanla oluşur.

Kullanıcı seçmez.

Sistem gözlemler.

---

# 13. usage_profiles Projection

Yeni projection:

```sql
usage_profiles

id

vehicle_id
ownership_id

user_id nullable

profile_type

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

Bu tablo ham veri değildir.

Davranışsal özet tablosudur.

---

# 14. Şarj Davranışı Gerçeği

İnsanlar:

```text
SOC yüzdesine göre
```

şarj etmez.

---

Aslında:

```text
Kaygı seviyesine göre
```

şarj eder.

Örnek:

```text
Bir kullanıcı %30'da şarj arar.

Başka biri %10'a kadar bekler.
```

---

Bu nedenle:

```text
Charging Decision Event
```

ürünün en önemli veri noktalarından biridir.

---

# 15. Şarj Edilen Yer ve Şarj İhtiyacı Aynı Şey Değildir

Kullanıcı:

```text
Afyon'da şarj etti.
```

Ama:

```text
Afyon girişinde şarj ihtiyacı hissetti.
```

olabilir.

---

Bu ayrım:

```text
Charging Demand Intelligence
```

ürününün temelidir.

---

# 16. Bakım Gerçeği

Araç sahipleri:

```text
Bakım yaptırdım
```

der.

Ama çoğu zaman kayıt tutmaz.

Bu nedenle:

```text
GPS

Fotoğraf

Fatura

Servis doğrulaması
```

gibi çoklu kanıt sistemi gerekir.

---

# 17. Kullanıcı Şeffaflık İster

Kullanıcı:

```text
Yap çünkü ben dedim.
```

diyen sistem istemez.

---

Kullanıcı şunu ister:

```text
Sebep bu

Risk bu

Alternatif bu
```

---

Karar yine kullanıcıya aittir.

---

# 18. Premium Gerçeği

Kullanıcı:

```text
Bu araç kaç km gider?
```

bilgisine para vermez.

Bu ürünün temel vaadidir.

---

Kullanıcı:

```text
Yolda bana eşlik et.

Risk oluşursa haber ver.

Şarjı benim yerime planla.
```

katmanına para verir.

---

Bu nedenle:

```text
Menzil hesabı
```

ücretsizdir.

---

Ama:

```text
Canlı rota desteği

Sesli enerji koçu

Şarj optimizasyonu
```

premium olabilir.

---

# 19. Canonical Layer Kararı

Sistem erken aşamada canonical katman kuracaktır.

---

## Canonical Vehicle

Örnek:

```text
Tesla Model Y

Tesla MY

Model Y RWD
```

aynı teknik araca bağlanmalıdır.

---

## Canonical Charger

Örnek:

```text
ZES Migros

Migros ZES

ZES Antalya Migros
```

aynı istasyona bağlanmalıdır.

---

## Canonical Route

Örnek:

```text
Ev → İş

Ev → Ofis

Sabah Rotası
```

aynı rota fingerprint'e bağlanabilir.

---

Canonical layer erken kurulmazsa veri kalitesi zamanla bozulur.

---

# 20. Vehicle Reality Layer Sonucu

Bu sistemin amacı:

```text
Araç izlemek
```

değildir.

---

Amaç:

```text
Araç kullanım gerçekliğini görünür kılmak
```

tır.

---

Sistem şu sorulara cevap vermelidir:

```text
Bu araç nasıl kullanılıyor?

Bu araç bana kaça mal oluyor?

Bu araçla bu yolu güvenle yapabilir miyim?

Bu batarya nasıl yaşlanıyor?

Şarj ihtiyacı nerede oluşuyor?

Araç geçmişi ne kadar güvenilir?
```

---

# Son Prensip

Bu sistemin merkezinde:

```text
Araç yoktur.
```

Merkezde:

```text
Araç + İnsan + Davranış
```

vardır.

Vehicle Reality Layer'ın temel tanımı budur.
