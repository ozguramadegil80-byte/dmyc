03-BEHAVIOR-ENGINE.md
EV Karnesi / Vehicle Reality Layer
Davranış Motoru ve Karar Sistemleri
1. Amaç

Bu doküman sistemin:

Nasıl gözlem yaptığı

Nasıl çıkarım yaptığı

Ne zaman soru sorduğu

Ne zaman sustuğu

Nasıl benchmark ürettiği

Nasıl rota planladığı

konularını tanımlar.

2. Temel Prensip

Sistemin ana prensibi:

Observe
Infer
Validate
Learn
Silence

Türkçesi:

Gözlemle
↓
Tahmin Et
↓
Doğrula
↓
Öğren
↓
Sus
3. Kullanıcıya Yük Bindirmeme Prensibi

Sistem:

Form toplamaz.

Anket toplamaz.

Sürekli soru sormaz.

Amaç:

Minimum veri girişi

Maksimum görünürlük
4. Sapma Motoru

Sistemin merkezindeki yapı budur.

Her yolculuk:

Beklenen
vs
Gerçekleşen

olarak karşılaştırılır.

Örnek:

Normal rota:

%8 tüketim

Bugün:

%12 tüketim

Sapma:

+%50

Sistem hemen kullanıcıyı rahatsız etmez.

Önce sebep arar.

## 4.1 Veri Doğruluk Seviyesi ve Takip Derinliği

Sistem ilk günden itibaren çalışabilir.

Ancak sistemin üreteceği hesapların doğruluk seviyesi, kullanıcıdan alınan doğrulama verileri arttıkça yükselir.

Bu nedenle onboarding sırasında kullanıcıya veri giriş zorunluluğu getirilmez.

Bunun yerine kullanıcıya hangi seviyede takip yapmak istediği sorulur.

Amaç veri toplamak değildir.

Amaç sistemin hangi doğruluk seviyesinde çalışacağını açıkça anlatmaktır.

---

### Temel Takip

Bu mod minimum sürtünme için tasarlanmıştır.

Sistem:

* Araç fabrika verilerini kullanır.
* GPS üzerinden yolculukları takip eder.
* Toplam kilometreyi hesaplar.
* Ortalama hızları çıkarır.
* Tahmini tüketim üretir.
* Tahmini maliyet hesaplar.
* Tahmini menzil görünürlüğü sağlar.

Bu seviyede kullanıcıdan ek veri talep edilmez.

Amaç mümkün olan en hızlı başlangıcı sağlamaktır.

Bu modda oluşturulan hesaplar:

```text
Tahmini
```

olarak işaretlenir.

---

### Gelişmiş Takip

Bu mod temel takibin üzerine ek doğrulama katmanı ekler.

Sistem gerektiğinde:

* Şarj başlangıç yüzdesi
* Şarj bitiş yüzdesi

bilgilerini isteyebilir.

Bu sayede:

* Enerji tüketimi
* Şarj davranışı
* Menzil hesapları

daha doğru hale gelir.

Kullanıcı her şarjda veri girmek zorunda değildir.

Sistem yalnızca gerektiğinde doğrulama ister.

---

### Hassas Takip

Bu mod maksimum doğruluk hedefleyen kullanıcılar içindir.

Sistem:

* Şarj fişleri
* Şarj faturaları
* Doğrulama belgeleri

işleyebilir.

Bu sayede:

* Gerçek kWh maliyeti
* Gerçek şarj maliyeti
* Şarj istasyonu bazlı analizler
* Daha hassas tüketim hesapları

oluşturulabilir.

Şarj fişleri sistem için doğrulama kaynağıdır.

Fiş yüklenmesi zorunlu değildir.

---

### Kullanıcıya Verilecek Açıklama

Sistem kullanıcıya şu yaklaşımı anlatmalıdır:

```text
Araç verilerini tahmini olarak hesaplayabilirim.

Kullanım verin arttıkça ve doğrulamalar geldikçe
hesaplar daha güvenilir hale gelir.

İstersen yalnızca GPS ile kullanabilir,
istersen daha hassas analizler için
ek doğrulamalar sağlayabilirsin.
```

---

### Temel Karar

Sistem hiçbir zaman:

```text
Veri vermezsen çalışmam.
```

yaklaşımıyla hareket etmez.

Temel prensip:

```text
Önce görünürlük ver.

Sonra veri iste.

Veri geldikçe doğruluğu artır.
```

Bu karar ürünün düşük sürtünmeli onboarding hedefiyle uyumludur.

Kullanıcı ilk gün fayda görür.

Doğrulama verileri ise zamanla güven seviyesini yükseltir.

Not: Net Karar:

Tahmini hesaplar sistemin varsayılan davranışıdır.

Doğrulama verileri (şarj yüzdesi, fiş, belge vb.) yalnızca güven seviyesini yükseltir.

Sistem veri gelmediğinde çalışmayı durdurmaz.

5. Sapma Açıklama Sırası

Öncelik sırası:

Hava

Trafik

Hız

Rota değişikliği

Klima

Yolcu

Yük

Örnek:

Hava +12°C arttı

Sapma açıklanıyorsa:

Soru sorulmaz.
6. Soru Motoru

Soru sormak başarısızlık değildir.

Ama pahalıdır.

Bu yüzden:

Sadece gerektiğinde

kullanılır.

Örnek:

Tüketim yüksek

Hava normal

Hız normal

Rota aynı

O zaman:

Araçta ek yolcu var mıydı?

sorulabilir.

7. Öğrenme Motoru

Kullanıcı cevap verdiğinde:

Soru
↓
Cevap
↓
Kural

oluşur.

Örnek:

Her cuma

aynı rota

2 yolcu

öğrenilir.

Bir süre sonra sistem:

2 yolcu olduğunu varsayar.
8. Sessizleşme Motoru

Amaç:

Öğrenmek

değil.

Amaç:

Öğrenip susmak.

Kötü sistem:

Her gün soru sorar.

İyi sistem:

Bir süre sonra soru sormaz.
9. Yolcu Tahmin Motoru

İlk sürüm:

Kullanıcı doğrulaması

ile çalışır.

İleri sürüm:

Hız profili

Fren davranışı

Hızlanma davranışı

Rota tipi

üzerinden çıkarım yapabilir.

Örnek:

Normalde:

130 km/h

Bugün:

105 km/h

Daha yumuşak sürüş

Sistem:

Yolcu olabilir

çıkarımı yapabilir.

10. Klima Tahmin Motoru

Klima doğrudan bilinmeyebilir.

Bu nedenle:

Hava sıcaklığı

Saat

Tüketim sapması

incelenir.

Örnek:

38°C

Güneş altında

Tüketim yüksek

Çıkarım:

Klima muhtemelen açık.
11. Rota Fingerprint Motoru

Tekrarlayan rotalar öğrenilir.

Örnek:

Ev
↓
İş

50 tekrar sonra:

Normal tüketim

Normal süre

Normal hız

oluşur.

Bu sistemin temel benchmarkıdır.

12. Topluluk Benchmark Motoru

Araç kendisiyle kıyaslanır.

Sonra:

Aynı araç

Aynı şehir

Aynı sıcaklık

Aynı yolcu profili

ile kıyaslanır.

Amaç:

Utandırmak değil

Görünürlük sağlamak
13. Batarya Yaşam Motoru

Batarya:

Döngü

ile değil,

EFC + Yıpranma Katsayısı

ile takip edilir.

Örnek:

20 → 80

ve

90 → 100

aynı kabul edilmez.

Sistem:

Toplam EFC

Toplam Yıpranma

ayrı hesaplar.

14. Batarya Kapasite Sinyali

Sistem:

Batarya %93 sağlıklı

demez.

Bunun yerine:

Benzer kullanımlara göre
kapasite düşüş sinyali var.

der.

Çünkü:

Teşhis koymuyor.
15. Şarj Kararı Motoru

En önemli B2B motorlardan biridir.

Şarj:

İşlem

değildir.

Şarj:

Karar

dır.

Sistem:

Kullanıcı
ilk ne zaman
şarj aramaya başladı?

sorusunu cevaplar.

16. Karar Anı

Örnek:

%22 SOC

Afyon girişi

Burada:

Charging Decision Event

oluşur.

İstasyona ulaşması gerekmez.

Karar yeterlidir.

17. Talep Hotspot Motoru

Karar noktaları kümelenir.

Örnek:

8.000 yolculuk

Sonuç:

Afyon girişi

Bu:

Demand Hotspot

olur.

Enerji şirketleri için satılabilir insight burada oluşur.

18. Rota Planlama Motoru

Ücretsiz katmanda:

Bu yol yapılabilir mi?

cevabı verilir.

Hesaplananlar:

Mesafe

Tahmini tüketim

Varış SOC

Şarj ihtiyacı
19. Senaryo Motoru

Aynı yol için:

Eco

Normal

Hızlı

senaryoları çalıştırılır.

Örnek:

Eco:
%18 varış

Normal:
%12 varış

Fast:
%5 varış
20. Rota Strateji Motoru

Sistem:

Tek rota

üretmez.

Üç strateji:

SAFE

FAST

ECONOMICAL
21. Varsayılan Strateji

Varsayılan:

SAFE

olacaktır.

Çünkü ürünün problemi:

Erken varmak

değil,

Yolda kalmamak

tır.

22. Şarj Durağı Seçim Motoru

Sistem:

Afyon civarı

demez.

Şunu der:

Trugo Afyon Otoyol

Çünkü kullanıcı aksiyon almak ister.

23. Menzil Güven Motoru

Premium katmandır.

Planlanan:

Varış %18

Gerçekleşen:

Varış %9

Sapma oluşur.

24. Sesli Enerji Koçu

Bildirim yerine:

Sesli açıklama

verilir.

Örnek:

Bu hızla devam ederseniz planlanan istasyona yaklaşık yüzde 9 batarya ile ulaşacaksınız.

25. Açıklanabilirlik Motoru

Sistem:

Bunu yap

demez.

Şunu söyler:

Durum bu

Sebep bu

Sonuç bu

Karar kullanıcıya aittir.

26. Trip Recap Motoru

Yolculuk sonunda:

Mesafe

Süre

Şarj

Maliyet

Varış SOC

özetlenir.

27. Sürüş Karakteri Motoru

Sistem:

Şoför puanı

vermez.

Yerine:

Dengeli

Dinamik

Verimlilik Odaklı

Konfor Odaklı

gibi karakterler üretir.

28. Share Card Motoru

Trip Recap'ten:

Story

WhatsApp

X

kartları üretilir.

29. Insight Motoru

B2B sorguları çalıştırır.

Örnek:

Antalya

35°C+

BYD Seal

3+ yolcu

İlk şarj kararı nerede veriliyor?
30. Vehicle Reality Layer Sonucu

Sistem sonunda şu üç soruya cevap verir:

Araç ne yaptı?

Kullanıcı nasıl kullandı?

Şarj ihtiyacı nerede ve neden oluştu?

Ve bence dikkat edersen bu dokümanla birlikte artık:

Vizyon var
Dataset var
Davranış motoru var

## 52. Çoklu Sürücü ve Araç Paylaşımı Kararı

Bu konuşmayla birlikte önemli bir eksik tamamlanmıştır.

Bir aracı her zaman tek kişi kullanmaz.

Aynı araç:

```text
Eş
Partner
Aile üyesi
Çalışan
Filo sürücüsü
Misafir sürücü
```

tarafından kullanılabilir.

Bu nedenle sistemde sahiplik ve sürücülük ayrılacaktır.

```text
Araç sahibi ≠ Her zaman aracı kullanan kişi
```

---

### 52.1 Partner Sürücü Mantığı

BBTV’deki “Partner Şef” mantığının araç versiyonu kullanılacaktır.

Ana kullanıcı araca ikinci bir sürücü tanımlayabilir.

Örnek:

```text
Ana kullanıcı:
Özgür

Araç:
Togg T10X

Ek sürücü:
Eşi
```

Ek sürücü kendi telefonundan uygulamaya bağlanabilir.

Bu sayede aynı araç için farklı sürücü profilleri oluşur.

---

### 52.2 Neden Gerekli?

Çünkü aynı araç iki farklı kullanıcıda farklı davranabilir.

Örnek:

```text
Sürücü A:
Daha hızlı kullanıyor
Daha sık DC şarj ediyor
Daha düşük SOC ile yola çıkıyor

Sürücü B:
Daha temkinli kullanıyor
Daha çok şehir içi kullanıyor
Daha düzenli şarj ediyor
```

Eğer sistem tüm kullanımı tek kullanıcıya yazarsa:

```text
Kişisel tüketim profili bozulur.
Sürüş karakteri yanlış çıkar.
Batarya davranışı yanlış yorumlanır.
Rota benchmarkları kirlenir.
```

---

### 52.3 Yeni Dataset: vehicle_drivers

```sql
vehicle_drivers

id

vehicle_id
ownership_id
user_id

driver_role
-- owner
-- partner
-- family
-- employee
-- guest

permission_level
-- full
-- drive_only
-- view_reports
-- manage_vehicle

status
-- invited
-- active
-- removed

invited_by_user_id

created_at
updated_at
```

---

### 52.4 trips Güncellemesi

Her yolculuk mümkünse bir sürücüye bağlanacaktır.

```sql
trips

driver_user_id
driver_source
-- phone_detected
-- user_selected
-- inferred
-- unknown

driver_confidence_score
```

---

### 52.5 Sürücü Tahmin Mantığı

Sistem her yolculukta “kim kullanıyor?” diye sormamalıdır.

Önce tahmin etmelidir.

Kaynaklar:

```text
Hangi telefon araçla birlikte hareket ediyor?

Bluetooth / araç bağlantısı var mı?

Uygulama hangi kullanıcıda aktif?

Sürüş stili kime benziyor?

Rota paterni kime ait?
```

Emin değilse sorar:

```text
Bu yolculuğu kim yaptı?
```

Seçenekler:

```text
Ben
Partner sürücü
Misafir
Daha sonra
```

---

### 52.6 Sürücü Profili

Yeni projection:

```sql
driver_vehicle_profiles

id

vehicle_id
ownership_id
user_id

trip_count

avg_consumption_kwh_100km
avg_speed_kmh

avg_hard_acceleration_count
avg_hard_braking_count

avg_charge_start_soc
avg_charge_end_soc

dc_charge_ratio

driving_profile
-- balanced
-- dynamic
-- efficient
-- cautious

confidence_score

last_calculated_at
```

Bu tablo ham veri değildir.

Yolculuk ve şarj kayıtlarından hesaplanan sürücü-araç profilidir.

---

### 52.7 Araç Karnesinde Ayrım

Araç karnesi iki seviyede çalışır:

```text
Araç toplamı
Sürücü bazlı kullanım
```

Örnek:

```text
Araç toplam tüketim:
18.2 kWh / 100 km

Özgür:
17.4 kWh / 100 km

Partner sürücü:
19.1 kWh / 100 km
```

Ancak sistem yargılayıcı dil kullanmaz.

```text
Kötü sürücü
İyi sürücü
```

demez.

Bunun yerine:

```text
Daha dinamik sürüş profili
Daha temkinli sürüş profili
Daha verimli şehir içi kullanımı
```

gibi açıklayıcı dil kullanır.

---

### 52.8 Gizlilik Kararı

Ek sürücünün kişisel rota detayları ana kullanıcıya doğrudan gösterilmemelidir.

Araç sahibine araç seviyesinde özet gösterilebilir.

Ancak kişisel rota, ev/iş adresi, günlük hareket detayı gibi özel veriler izin olmadan paylaşılmaz.

Araç sahibi görebilir:

```text
Toplam km
Ortalama tüketim
Şarj davranışı
Araç etkisi
```

Görememeli veya izinle görmeli:

```text
Tam rota geçmişi
Kişisel lokasyonlar
Günlük hareket paterni
```

---

## 53. Güncellenmiş Net Karar

```text
Araç sahipliği ve araç sürücülüğü ayrılacaktır.

Bir araç birden fazla kullanıcı tarafından kullanılabilir.

Ana kullanıcı araca partner sürücü tanımlayabilir.

Her yolculuk mümkün olduğunca sürücüye bağlanacaktır.

Sürücü bilinmiyorsa sistem önce tahmin edecek, emin değilse soracaktır.

Araç karnesi araç toplamı ve sürücü bazlı kullanım ayrımını destekleyecektir.

Gizlilik için kişisel rota detayları araç sahibine otomatik açılmayacaktır.
```


## 54. Ortak Araç Kullanımı, Co-Presence ve Sürücü Doğrulama Kararı

Bu konuşmayla birlikte çoklu sürücü modeline ek bir gerçek dünya kararı eklenmiştir.

Bir araçta birden fazla yetkili kullanıcı aynı anda bulunabilir.

Örnek:

```text
Ana kullanıcı
Partner kullanıcı
```

ikisi de aynı araçta olabilir.

Bu durumda sistemin sadece GPS veya telefon hareketinden:

```text
Aracı kesin şu kişi sürüyor.
```

demesi doğru değildir.

Çünkü iki telefon da aynı anda, aynı hızda, aynı yöne hareket eder.

---

### 54.1 Co-Presence Sinyali

Eğer iki yetkili kullanıcı:

```text
Aynı anda hareket ediyorsa

Aynı yöne gidiyorsa

Benzer hız profiline sahipse

Aynı rota üzerinde ilerliyorsa
```

sistem bunu:

```text
Aynı araçta birlikte olabilirler.
```

sinyali olarak işler.

Bu durum sürücü tespiti için kesin veri değildir.

Bu sadece:

```text
Co-presence detected
```

yani birlikte bulunma sinyalidir.

---

### 54.2 Sürücüyü Tahmin Etme Yerine Sorma Kararı

İki yetkili kullanıcı aynı araçta birlikte algılandığında sistem sürücüyü tahmin etmeye çalışmayacaktır.

Bunun yerine doğrudan bağlam sorusu soracaktır:

```text
Bu yolculukta direksiyonda kim var?
```

Cevap seçenekleri:

```text
Ben sürüyorum

Partner sürüyor

Ortak / değişimli

Daha sonra
```

---

### 54.3 Sorunun Kime Gönderileceği

Bu durumda soru mümkünse araçtaki sürmeyen kişiye yönlendirilmelidir.

Çünkü gerçek dünyada:

```text
Sürücü telefona bakmamalıdır.

Partner kullanıcı cevap verebilir.
```

Bu, sistemin hem güvenli hem de düşük sürtünmeli veri toplamasını sağlar.

Eğer sistem sürmeyen kişiyi kesin bilemiyorsa, bildirim her iki yetkili kullanıcıya da düşük öncelikli olarak gönderilebilir.

İlk cevap veren kullanıcının cevabı trip bağlamına işlenir.

---

### 54.4 Dataset Güncellemesi

#### co_presence_events

```sql
co_presence_events

id

vehicle_id
trip_id

user_a_id
user_b_id

detected_at

same_route_confidence
same_speed_confidence
same_vehicle_confidence

prompt_sent_to_user_id
prompt_answered_by_user_id

created_at
```

Bu tablo iki yetkili kullanıcının aynı araçta birlikte bulunma ihtimalini tutar.

---

#### trip_driver_assignments

```sql
trip_driver_assignments

id

trip_id
user_id

role
-- driver
-- passenger
-- shared_driver
-- unknown

source
-- user_confirmed
-- co_presence_prompt
-- inferred
-- unknown

confidence_score

confirmed_by_user_id

created_at
```

Bu tablo yolculuğun hangi kullanıcı tarafından sürüldüğünü veya ortak sürüş olup olmadığını tutar.

---

### 54.5 Belirsizlik Kararı

Cevap alınamazsa sistem sürücüyü uydurmaz.

Bu durumda:

```text
driver_source = unknown
```

kalır.

Sistem bilinmeyen sürücüyü kesin veri gibi kullanmaz.

Bu karar sistemin temel prensibiyle uyumludur:

```text
Emin değilsen sorma hakkın var.

Cevap yoksa unknown bırak.

Asla tahmini gerçek gibi yazma.
```

---

## 55. Güncellenmiş Net Karar

```text
Aynı araçta birden fazla yetkili kullanıcı bulunabilir.

İki yetkili kullanıcı aynı anda aynı rota ve hız profiliyle hareket ediyorsa co-presence sinyali oluşur.

Bu durumda sistem sürücüyü tahmin etmeye çalışmayacak, bağlam sorusu soracaktır.

Soru mümkünse sürmeyen partner kullanıcıya yönlendirilecektir.

Cevap gelirse trip_driver_assignments tablosuna sürücü, yolcu veya ortak sürüş bilgisi yazılacaktır.

Cevap gelmezse sürücü bilinmiyor olarak kalacaktır.

Sistem belirsizliği dürüstçe modelleyecek, tahmini kesin veri gibi işlemeyecektir.
```
