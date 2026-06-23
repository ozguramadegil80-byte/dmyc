# EV Gerçek Kullanım, Araç Karnesi ve Araç Sicili Sistemi
 
## Konuşma Dökümü, Roadmap, Teknik Kapsam ve Net Kararlar
 
## 1. Konuşmanın Çıkış Noktası
 
Bu fikir elektrikli araç kullanıcılarının en temel korkusundan başladı: “Bu araç beni yolda bırakır mı?” İlk bakışta bu bir menzil tahmin problemi gibi görünüyor. Ancak konuşma ilerledikçe problemin araç menzilinden çok daha geniş olduğu anlaşıldı. Asıl mesele aracın katalog verisi değil; aracın gerçek sürücüyle, gerçek yolda, gerçek hava şartlarında, gerçek şarj alışkanlıklarıyla nasıl davrandığını görünür kılmak.
 
Başlangıçta konuşulan sistem, elektrikli araçlarda kalan menzili daha doğru hesaplayan bir yardımcı gibi görünüyordu. Ancak BBTV’de olduğu gibi burada da asıl fikir “prediction” değil, gerçek dünya modeliydi. Aracın kendisi tek başına problemi açıklamıyor. Sürücü davranışı, rota, trafik, hava durumu, klima kullanımı, yolcu sayısı, şarj alışkanlığı, araç yaşı ve batarya durumu birlikte değerlendirilmeden gerçek kullanım modeli kurulamaz.
 
Bu yüzden fikir ilk dakikalarda basit bir “menzil hesaplama uygulaması” gibi dursa da konuşma ilerledikçe “araç + sürücü + rota + şarj + bakım + sahiplik geçmişi” ekseninde çalışan bir dijital araç sicili sistemine dönüştü.
 
## 2. Temel Felsefe
 
Sistemin felsefesi BBTV ile aynı çizgide konumlandı. İyi sistem kullanıcı yerine karar vermez. İyi sistem görünmeyeni görünür kılar. Kullanıcıya tek sonuç dayatmaz; veriye dayalı alternatif ve açıklama üretir.
 
Bu sistemde de amaç kullanıcıya “sen yanlış kullanıyorsun” demek değildir. Amaç şunu göstermek:
 
 
- Bu araç normalde bu koşullarda böyle davranır.
 
- Senin kullanımında bu sonuç çıkıyor.
 
- Sapmanın muhtemel nedenleri bunlar.
 
- Daha düşük hız, farklı şarj davranışı, klima kullanımı veya rota tercihi sonucu şu kadar değiştirir.
 
- Karar yine sende.
 

 
Bu yaklaşım, manipülatif veya cezalandırıcı bir sistem yerine, kullanıcıya ekonomik ve teknik görünürlük sağlayan bir sistem oluşturur.
 
## 3. İlk Ürün Tanımı
 
İlk ürün kesinlikle “araç sicili” veya “OEM veri platformu” olarak başlamamalı. İlk kullanıcıya ilk gün değer veren basit vaat şudur:
 
Elektrikli aracının fabrika verisini, gerçek kullanım verisine dönüştür.
 
İlk açılışta kullanıcı aracını seçer. Sistem aracın üretici kılavuzu, batarya kapasitesi, fabrika menzili, önerilen şarj aralığı, genel tüketim verileri ve mümkünse topluluk ortalamaları üzerinden ilk görünürlüğü verir. Bu ilk değer kesin kişisel tahmin değildir. Kullanıcıya dürüstçe “şu an genel araç verisiyle konuşuyorum, kullanım verisi arttıkça hesap kişiselleşecek” denir.
 
İlk gün kullanıcının kazanımı şudur:
 
 
- Aracının fabrika menzili.
 
- Normal koşullarda beklenen gerçek menzil aralığı.
 
- Günlük kullanım için önerilen şarj aralığı.
 
- Ortalama km başı elektrik maliyeti.
 
- Bu değerlerin neden tahmini olduğu.
 
- Daha net hesap için hangi verilerin gerektiği.
 

 
Buradaki kritik nokta para istememek. Kullanıcıdan önce veri istenmez; önce görünürlük verilir. Sonra kullanım arttıkça sistem daha iyi sonuç vereceğini anlatır.
 
## 4. Onboarding Mantığı
 
Onboarding BBTV’deki hazır stok mantığına benzer olmalı. BBTV’de kullanıcıdan ilk gün mutfağındaki tüm stokları girmesi istenmedi. Kullanıcı profiline göre hazır stokla başlatıldı. Burada da kullanıcıdan ilk gün geçmiş şarj verisi, servis geçmişi, tüm rota geçmişi istenmemeli.
 
Kullanıcı sadece aracını tanımlar:
 
 
- Marka.
 
- Model.
 
- Yıl.
 
- Batarya tipi veya versiyon.
 
- Mevcut batarya yüzdesi.
 
- Bulunduğu şehir.
 
- Kullanım amacı: işe gidiş, şehir içi, uzun yol, karma kullanım.
 

 
Araç bilgileri mümkünse AI destekli bir araç tanıma modülüyle normalize edilir. Kullanıcı “Togg T10X uzun menzil 2024” yazdığında sistem bunu teknik araç kaydına dönüştürür. Burada AI karar motoru değildir; sadece araç bilgisini anlamlandıran yardımcıdır.
 
Üretici kılavuzu veya fabrika verisi sistem tarafından işlenir. Kullanıcı 200 sayfalık kullanım kılavuzunu okumaz. Sistem o kılavuzdaki bilgiyi insan diline çevirir. İlk fayda da buradan gelir.
 
## 5. Veri Toplama Stratejisi
 
Sistemin veri toplama yaklaşımı “sürekli form doldurtma” olmamalıdır. Kullanıcı veri girişi yapmaya zorlanırsa sistem ölür. Veri toplama şu prensiple ilerlemelidir:
 
Sistem gözlemler, emin olamadığında sorar, zamanla susar.
 
Telefon GPS ile şu verileri toplayabilir:
 
 
- Rota.
 
- Mesafe.
 
- Hız.
 
- Ortalama hız.
 
- Dur-kalk oranı.
 
- Yolculuk süresi.
 
- Başlangıç ve bitiş noktası.
 
- Standart rota tekrarları.
 
- Şarj istasyonu yakınında durma.
 
- Servis noktası yakınında durma.
 

 
İlk haftalarda sistem bazı küçük sorular sorabilir:
 
 
- Yolculukta klima açık mıydı?
 
- Araçta kaç kişiydiniz?
 
- Bu duraklama şarj mıydı?
 
- Bu duraklama servis ziyareti miydi?
 
- Şarj ekranı veya fatura fotoğrafı eklemek ister misin?
 

 
Ancak amaç her yolculuk sonunda soru sormak değildir. Sistem normal paterni öğrendikçe soru sayısı azalmalıdır. Kullanıcı her sabah evden işe tek kişi gidiyorsa ve bu rota defalarca tekrarlandıysa sistem bunu varsayılan kabul eder. Ancak bir gün rota saparsa veya tüketim beklenenden fazla olursa push atar:
 
“Bugünkü yolculuk normal rotandan farklı görünüyor. Araçta ek yolcu var mıydı?”
 
Bu yaklaşım sürtünmeyi azaltır ve veriyi kaliteli tutar.
 
## 6. Şarj Algılama ve Şarj Verisi
 
Şarj sisteme manuel sorulmamalı. GPS, araç şarj istasyonu yakınında belirli süre durduğunu algılarsa kullanıcıya push gönderir:
 
“Şarj mı ediyorsun?”
 
Kullanıcıya üç seçenek verilir:
 
 
- Evet, hızlı gir.
 
- Şarj ekranının fotoğrafını yükle.
 
- Daha sonra ekle.
 

 
İlk birkaç kullanımda kullanıcıdan veri istenir. Sonra sistem kullanıcının alışkanlığını öğrenir. Aynı istasyonda benzer batarya yüzdesiyle şarj ediyorsa sistem bunu tanımaya başlayabilir.
 
Şarj verisinden çıkarılacaklar:
 
 
- Şarj başlangıç yüzdesi.
 
- Şarj bitiş yüzdesi.
 
- Şarj süresi.
 
- AC/DC ayrımı.
 
- Toplam alınan kWh.
 
- Toplam TL.
 
- Km başı elektrik maliyeti.
 
- Şarj başına ortalama maliyet.
 
- Aylık şarj maliyeti.
 
- Ev şarjı / istasyon şarjı ayrımı.
 

 
Bu veriler aylık ve yıllık karneye temel olur.
 
## 7. Yolculuk Modeli
 
Sistemin kalbi rota fingerprint mantığıdır. Aynı rota tekrarlandıkça sistem o rotanın normal tüketim davranışını öğrenir.
 
Örneğin:
 
Ev → İş rotası normalde yüzde 8 batarya tüketiyor. Bugün yüzde 11 tüketti. Sistem bunu sapma olarak işaretler.
 
Sapma nedenleri şu kaynaklardan ayrıştırılır:
 
 
- Ortalama hız yükseldi.
 
- Klima açıktı.
 
- Araçta ek yolcu vardı.
 
- Trafik dur-kalk fazlaydı.
 
- Hava çok sıcaktı veya soğuktu.
 
- Rota değişti.
 
- Yokuş etkisi vardı.
 
- Şarj öncesi yüksek hız kullanımı oldu.
 

 
Bu noktada sistem doğrudan “araba sorunlu” veya “sen kötü sürücüsün” demez. Sadece tüketim farkını ve muhtemel nedenleri görünür kılar.
 
## 8. 3 Şarj Döngüsü Sonrası Kalibrasyon
 
İlk gün sistem fabrika verisiyle konuşur. İlk iki şarj arasında kullanım verisi toplanır. Üçüncü şarjla birlikte kişisel tüketim profili oluşmaya başlar.
 
Bu akış şöyle tasarlandı:
 
İlk gün: Sistem üretici verisi, araç modeli, hava, rota ve genel tüketim verisiyle tahmini görünürlük verir.
 
İkinci şarj: Sistem kullanıcının gerçek tüketiminden ilk sinyalleri çıkarır.
 
Üçüncü şarj: Sistem fabrika verisiyle kişisel veriyi karşılaştırır ve “kişisel menzil profili oluşuyor” der.
 
Daha sonra: Fabrika verisi geri plana düşer, kişisel model öne geçer.
 
Bu süreçte kullanıcıya güven skoru gösterilebilir:
 
 
- Kalibrasyon başladı.
 
- Veri güveni düşük.
 
- Veri güveni orta.
 
- Kişisel profil aktif.
 
- Kişisel hesap güveni yüksek.
 

 
Bu sistemin verdiği tahminlerin neden değiştiğini kullanıcıya açıklamak için tooltip kullanılmalı. Örneğin:
 
“Net menzil hesaplamak için rota, hız, hava durumu, klima, yolcu sayısı ve şarj geçmişi gerekir. Kullanım verin arttıkça hesap daha güvenilir hale gelir.”
 
## 9. Aylık Karne
 
Ürünün en güçlü kullanıcı çıktılarından biri aylık karne olacak.
 
Aylık karne şu bilgileri göstermeli:
 
 
- Toplam gidilen km.
 
- Toplam yolculuk sayısı.
 
- Klimalı km.
 
- Klimasız km.
 
- Ortalama hız.
 
- Dur-kalk süresi.
 
- Ortalama tüketim.
 
- Toplam elektrik maliyeti.
 
- Km başı elektrik maliyeti.
 
- Ortalama şarj süresi.
 
- AC/DC şarj oranı.
 
- Benzinli/dizel eşdeğer maliyet kıyası.
 
- Aylık tasarruf.
 
- Kullanım verimlilik özeti.
 

 
Bu karne kullanıcıya “benim aracım bana kaça mal oluyor?” sorusunun cevabını verir. Menzil korkusu ilk giriş kapısıdır, ama aylık karne ürünün sürekliliğini sağlar.
 
## 10. Yıllık Karne ve Sahiplik Ekonomisi
 
Yıllık karne daha geniştir. Burada araç sahipliği ekonomisi hesaplanır:
 
 
- Yıllık toplam km.
 
- Yıllık elektrik maliyeti.
 
- Kasko maliyeti.
 
- Bakım maliyeti.
 
- MTV veya ilgili yasal giderler.
 
- Tahmini değer kaybı.
 
- Araç piyasa değeri.
 
- Aynı segment benzinli/dizel araçla kıyas.
 
- Toplam sahip olma maliyeti.
 
- Yıllık net avantaj veya dezavantaj.
 

 
Bu kısım ürünün “para kazandırma” hissini oluşturur. Kullanıcı şunu fark eder:
 
Ben aracıma iyi bakarsam, sistemi düzgün takip edersem, ikinci elde daha iyi konumlanırım. Sistem sadece bilgi vermiyor, aracın değerini korumaya yardım ediyor.
 
## 11. Batarya Sağlığı ve Tahmini Kapasite
 
Sistem gerçek batarya sağlığına kesin teşhis koymamalı. Burada dil çok önemli. Kullanıcıya “bataryan yüzde 94 sağlıklı” gibi kesin ifade vermek yerine:
 
 
- Tahmini kapasite kaybı sinyali.
 
- Gerçek kullanım verisine göre kapasite göstergesi.
 
- Benzer araçlara göre sapma.
 
- Kullanım koşullarıyla açıklanamayan düşüş.
 
- Servis kontrolü önerisi.
 

 
denmeli.
 
Batarya tahmini şu mantıkla yapılır:
 
Aynı rota, benzer hava, benzer hız, benzer trafik ve benzer yolcu sayısında zamanla tüketim artıyorsa sistem bunu izler. Eğer sürücü davranışıyla açıklanamayan bir verim kaybı oluşuyorsa batarya veya araç verimi tarafında sinyal üretir.
 
İkinci el araçlarda 3 şarj sonrası sistem aracın önceki durumuna dair sınırlı çıkarım yapabilir. Araç sıfır değilse bile kullanıcının sisteme başladığı andan itibaren bir referans noktası oluşur. Eski geçmiş aktarılamazsa yeni sahip aldığı km’den itibaren yeni sicil başlatır. Geçmiş varsa aktarılır; yoksa geçmiş yok sayılmaz ama tahmini ve düşük güvenli olarak işaretlenir.
 
## 12. Araç Sicili
 
Konuşmanın önemli kırılma noktası, ürünün kullanıcı merkezli değil araç merkezli düşünülmesi oldu. Kullanıcı değişir, araç kalır.
 
Araç sicili şu mantıkla kurulmalı:
 
 
- Araç kimliği oluşturulur.
 
- Sahiplik dönemleri ayrı tutulur.
 
- Her sahiplik dönemi kendi kullanım verisini üretir.
 
- Araç satıldığında veri devri iki taraflı onayla yapılabilir.
 
- Satıcı devretmezse alıcı kendi sahiplik döneminden yeni sicil başlatır.
 
- Eski veri yoksa sistem bunu açıkça belirtir.
 
- Araçta batarya değişimi, servis, bakım, kullanım dönemleri kayıt altına alınır.
 

 
Bu araç sicili ikinci el piyasasında güçlü bir çıktı üretir. Ekspertiz bir günün fotoğrafıdır. Araç sicili ise aracın yıllar içindeki kullanım filmidir.
 
## 13. QR Doğrulama ve Paylaşılabilir Karne
 
Araç karnesi Google sertifika doğrulama gibi çalışabilir. Satıcı aracının karnesini paylaşmak isterse sistem bir QR veya public URL üretir.
 
Alıcı QR okuttuğunda şunları görebilir:
 
 
- Araç modeli.
 
- Km.
 
- Kullanım dönemi.
 
- Tahmini batarya kapasite sinyali.
 
- Ortalama tüketim.
 
- AC/DC şarj oranı.
 
- Şarj döngüsü.
 
- Servis/bakım kayıtları.
 
- Doğrulama seviyesi.
 
- Veri güven skoru.
 
- Sahiplik dönemi ayrımı.
 

 
Bu, Sahibinden gibi platformlara embed edilebilir. Uzun vadede “Karne var mı?” sorusu ikinci el EV piyasasında güven sinyali haline gelebilir.
 
## 14. Devir Sistemi
 
Araç satıldığında devir iki taraflı onayla yapılabilir. Ruhsat sahibi doğrulaması burada kullanılabilir. Devirde asıl mesele kullanıcı verisi ile araç verisini ayırmaktır.
 
Araç verisi:
 
 
- Batarya değişimi.
 
- Servis geçmişi.
 
- Şarj döngüsü.
 
- Doğrulanmış bakım kayıtları.
 
- Km aralıkları.
 
- Araç dönemleri.
 

 
Kullanıcı verisi:
 
 
- Ev/iş rotası gibi kişisel lokasyonlar.
 
- Günlük davranış detayları.
 
- Kişisel hareket örüntüleri.
 

 
Public karneye kişisel rota detayı çıkmamalı. Araç siciline faydalı özet metrikler çıkmalı.
 
## 15. Servis ve Bakım Takvimi
 
Araç kullanım kılavuzundan periyodik bakım takvimi alınır. Sistem km ve zaman bazlı bakım zamanı yaklaşınca kullanıcıyı bilgilendirir.
 
Örneğin:
 
“Üretici takvimine göre 800 km sonra bakım zamanı geliyor.”
 
GPS ile servis lokasyonunda belirli süre durulduğu algılanırsa sistem sorar:
 
“Servis ziyareti algıladım. Bakım mı yaptırdın?”
 
Kullanıcı evet derse belge veya fotoğraf ekleyebilir. Burada da güven seviyesi tutulur:
 
 
- Servis yakınında görüldü.
 
- Kullanıcı onayladı.
 
- Belge yüklendi.
 
- Doğrulandı.
 

 
Sistem “bakımlı” veya “bakımsız” gibi yargılayıcı etiketler üretmemeli. Bunun yerine:
 
 
- Son doğrulanmış bakım.
 
- Üretici bakım takvimine uyum oranı.
 
- Zamanında yapılan bakım sayısı.
 
- Gecikmiş bakım sayısı.
 

 
gibi veri göstermeli.
 
## 16. Topluluk Karşılaştırması
 
Kullanıcı kendi aracını benzer kullanıcılarla kıyaslayabilir. Bu çok güçlü bir motivasyon ve paylaşım alanı oluşturur.
 
Örneğin:
 
 
- Senin tüketimin: 17.4 kWh / 100 km.
 
- Aynı model topluluk ortalaması: 16.8 kWh / 100 km.
 
- Aynı şehirdeki kullanıcılar: 17.1 kWh / 100 km.
 
- Aynı hız profilindeki kullanıcılar: 18.0 kWh / 100 km.
 

 
Burada sistem kullanıcıyı utandırmamalı. Sadece görünürlük sağlamalı.
 
## 17. Kullanıcıya Uygun Araçlar
 
Sistem uzun vadede kullanıcının gerçek kullanım paterninden yola çıkarak “sana uygun araçlar” ekranı üretebilir.
 
Bu ekran asla “Tesla’yı sat, BYD al” dememeli. BBTV naifliğinde olmalı:
 
“Kullanım profilinize göre şu araç tipleri daha uygun olabilir.”
 
Açıklamalar şeffaf olmalı:
 
 
- Uzun yol oranı yüksek.
 
- Ortalama hız yüksek.
 
- Sık DC şarj kullanılıyor.
 
- Klima etkisi yüksek.
 
- Sıcak iklimde kullanılıyor.
 
- Araçta ortalama yolcu sayısı yüksek.
 

 
Bu nedenle önerilen araç kriterleri:
 
 
- Daha iyi batarya soğutması.
 
- Daha yüksek hızlı şarj performansı.
 
- Uzun yolda daha verimli tüketim.
 
- Daha büyük batarya kapasitesi.
 
- Sıcak iklimde daha stabil performans.
 

 
Bu bölüm reklam motoru için de çok değerli hale gelir. Çünkü reklam “rastgele araç reklamı” değil, “bu kişinin kullanım davranışına uygun alternatif araç görünürlüğü” olur.
 
## 18. Reklam Motoru
 
Reklam modeli BBTV’deki düşünceyle aynı yapıda gelişti. Reklam bir popup veya dikkat çalan öğe olmamalı. Doğru hedef kitle, doğru mesaj, doğru anda olmalı.
 
Bu sistemde reklam katmanları şunlar olabilir:
 
### 18.1 Araç Ekosistemi Reklamları
 
Kullanıcı aracına uygun istasyon, servis, kaplama, sigorta, aksesuar, lastik, batarya checkup veya EV uzmanı işletme reklamları görebilir.
 
Örneğin: Tesla Model Y kullanıcısına Tesla uzmanı kaplama merkezi. Yüksek DC şarj kullanan kullanıcıya uygun şarj ağı. Uzun yol kullanan kullanıcıya EV lastik önerisi.
 
### 18.2 Karşılaştırma Ekranı Reklamları
 
Kullanıcı kendi aracını diğer araçlarla kıyasladığında burası çok değerli bir reklam alanı olur. Çünkü bu kullanıcı zaten elektrikli araç almış, yüksek satın alma gücüne sahip, teknolojiye açık ve araç karşılaştırması yapıyor.
 
BYD, Tesla, Togg, Hyundai gibi markalar burada görünmek isteyebilir. Ancak reklam yine manipülatif olmamalı. Veriyle desteklenmiş karşılaştırma formatında olmalı.
 
### 18.3 Davranış Segmenti Reklamları
 
Reklamverenler şu tarz segmentlere ulaşmak isteyebilir:
 
 
- Yıllık 30.000 km üzeri EV kullananlar.
 
- Sık DC şarj kullananlar.
 
- Şehir içi ağırlıklı kullananlar.
 
- Uzun yol ağırlıklı kullananlar.
 
- Aracına düzenli bakım yaptıranlar.
 
- İkinci el satışa hazırlananlar.
 
- Batarya sağlığına önem verenler.
 

 
Bu reklam modeli klasik demografik reklamdan çok daha değerlidir. Çünkü kullanıcı ne arıyor değil, nasıl yaşıyor bilgisi üzerinden çalışır.
 
## 19. Analiz Sistemi
 
Ürün büyüdükçe BBTV’deki AND/OR panelinin araç versiyonu gerekir. Bu analiz sistemi son kullanıcı için değil; OEM, batarya firmaları, filo şirketleri, sigorta şirketleri, şarj ağları ve ikinci el platformları için çalışır.
 
Filtreler şunlar olabilir:
 
 
- Marka.
 
- Model.
 
- Yıl.
 
- Batarya tipi.
 
- Bölge.
 
- Şehir.
 
- Sıcaklık aralığı.
 
- Şarj tipi.
 
- DC oranı.
 
- AC oranı.
 
- Ortalama hız.
 
- Uzun yol oranı.
 
- Şehir içi oranı.
 
- Yolcu sayısı.
 
- Klima kullanımı.
 
- Şarj öncesi kullanım.
 
- Servis geçmişi.
 
- Batarya değişimi.
 
- Doğrulama seviyesi.
 

 
Çıktılar:
 
 
- Kaç araç.
 
- Kaç yolculuk.
 
- Kaç doğrulanmış şarj.
 
- Ortalama tüketim.
 
- Kapasite kaybı sinyali.
 
- Şarj davranışı.
 
- Bölgesel sapma.
 
- Hava koşulu etkisi.
 
- Araçlar arası benchmark.
 
- Güven seviyesi.
 

 
Bu sistem ham veri satmaz. Doğrulanmış davranış paterni satar.
 
## 20. OEM Veri Eşleştirme
 
OEM firmalarının kendi araç logları vardır. Ancak bu loglar çoğunlukla aracın içinde ne olduğunu gösterir. Batarya sıcaklığı, BMS kararı, hücre voltajı, şarj gücü gibi teknik sinyalleri verir.
 
Bu sistemin verisi farklıdır. Aracın dışında ne yaşandığını gösterir:
 
 
- Araç güneşte mi kaldı?
 
- Şarja gelmeden önce kaç km yapıldı?
 
- Ortalama hız neydi?
 
- Hava kaç dereceydi?
 
- Yolcu sayısı neydi?
 
- Klima kullanıldı mı?
 
- Şarj öncesi batarya yüzdesi neydi?
 
- Kullanıcı bunu doğruladı mı?
 
- Şarj faturası var mı?
 

 
OEM logu içeride ne olduğunu gösterir. Bu sistem dışarıda neden olmuş olabileceğini gösterir. Birlikte çok daha güçlü analiz çıkar.
 
Gelecekte bir OEM şu şekilde veri isteyebilir:
 
“Antalya, 35 derece üstü, Model Y, DC şarj öncesi yüksek hız kullanılan oturumları getir.”
 
Bu sistem de anonim ve toplulaştırılmış olarak bu paterni çıkarabilir.
 
## 21. OEM Neden Rakip Değil?
 
OEM kendi araçlarını bilir ama tüm pazarı aynı metodolojiyle bilemez. Tesla Tesla’yı bilir, BYD BYD’yi bilir. Bu sistem ise aynı şehir, aynı iklim, aynı rota tipi ve benzer kullanıcı davranışları altında farklı marka ve modelleri kıyaslayabilir.
 
Ayrıca OEM her aracın uzun yaşam döngüsünü takip etmeyebilir. Araç satılır, sahip değişir, batarya değişir, servis dışı işlemler olur. Bu sistem araç merkezli sicil tuttuğu için araç sahip değiştirirken de hikâyeyi sürdürmeye adaydır.
 
OEM için bu sistem rakip değil, dış bağlam katmanı olabilir.
 
## 22. Para Kazanma Kapıları
 
Konuşmada çıkan gelir kapıları şunlardır:
 
### 22.1 Ücretsiz Kullanıcı Uygulaması
 
İlk amaç veri ağı ve kullanıcı güvenidir. İlk aşamada kullanıcıdan para istenmemesi mantıklıdır. Çünkü en değerli şey yolculuk, şarj, bakım ve davranış verisinin oluşmasıdır.
 
### 22.2 EV Karne Sertifikası
 
Paylaşılabilir, QR doğrulamalı araç karnesi ücretli olabilir. Satıcı milyonluk araç satarken doğrulanmış karneye para ödeyebilir.
 
### 22.3 İkinci El Satış Rozeti
 
Sahibinden veya benzeri platformlarda “EV Karnesi Var” rozeti gelir modeli olabilir.
 
### 22.4 Devir Ücreti
 
Araç satıldığında dijital sicil devir işlemi küçük ücretle yapılabilir.
 
### 22.5 Galeri ve Filo Paketleri
 
Galeriler araçlarını karneli satmak isteyebilir. Filolar sürücü ve araç kullanımını izlemek isteyebilir.
 
### 22.6 Sigorta
 
Sürüş ve bakım davranışı sigorta için risk sinyali üretir. Ancak bu katman hassas olduğu için ileri aşamadır.
 
### 22.7 Reklam
 
Araç davranışına uygun reklam modeli oluşur. Bu reklam popup değil, bağlam ve davranış bazlı görünürlük olmalıdır.
 
### 22.8 OEM / Batarya / Şarj Ağı Insight
 
En büyük uzun vadeli gelir burada olabilir. Doğrulanmış davranış verisi, araç loglarıyla eşleştiğinde çok değerli olur.
 
## 23. Teknik Mimari Kararı
 
Karar motoru telefonda değil, sunucuda yaşamalı.
 
Mobil uygulama sensör ve ekran görevi görmeli:
 
 
- GPS toplar.
 
- Yolculuk başlatır/bitirir.
 
- Şarj noktası algılar.
 
- Fotoğraf yükler.
 
- Kullanıcı mini cevaplarını alır.
 
- Offline kuyruk tutar.
 
- Sonuçları gösterir.
 

 
Sunucu beyin olmalı:
 
 
- Rota fingerprint.
 
- Tüketim hesapları.
 
- Şarj oturumu hesapları.
 
- Batarya kapasite çıkarımı.
 
- Araç sicili.
 
- Sahiplik dönemleri.
 
- Karne üretimi.
 
- Benchmark.
 
- Analiz paneli.
 
- Public QR raporları.
 

 
Bunun nedeni hem veri güvenliği hem kopyalanabilirlik hem de uzun vadeli veri ağıdır. Eğer tüm karar motoru telefonda çalışırsa sistemin savunulabilir tarafı zayıflar.
 
## 24. Önerilen Teknik Stack
 
Mobil: React Native / Expo ile başlanabilir. Daha önce mobil kodlama deneyimi yoksa Expo başlangıç için uygundur.
 
Backend: Supabase hızlı MVP için iyi adaydır. PostgreSQL ve PostGIS önemli olacaktır. Daha kontrollü ilerlemek istenirse FastAPI veya NestJS kullanılabilir.
 
Database: PostgreSQL + PostGIS.
 
Storage: Fotoğraf ve belge yüklemeleri için object storage gerekir.
 
Background Jobs: Aylık karne, rota işleme, şarj oturumu analizleri ve rapor üretimleri için job queue gerekir.
 
AI Kullanımı: AI sadece araç model normalizasyonu, kullanım kılavuzu özetleme ve fotoğraftan veri çıkarma gibi alanlarda kullanılmalı. Karar motoru deterministic olmalı.
 
## 25. Önerilen Database Ana Tabloları
 
Başlangıçta şu tablolar gerekir:
 
users Kullanıcı hesabı.
 
vehicles Araç kimliği, marka, model, yıl, batarya, versiyon.
 
vehicle_ownerships Araç sahiplik dönemleri. Başlangıç km, bitiş km, başlangıç tarihi, bitiş tarihi.
 
vehicle_specs Fabrika verileri, batarya kapasitesi, WLTP, önerilen şarj aralığı.
 
manual_rules Üretici kılavuzundan çıkarılmış kurallar: bakım takvimi, şarj önerileri, batarya kullanım önerileri.
 
trips Yolculuk kayıtları.
 
trip_points GPS noktaları.
 
route_fingerprints Tekrarlayan rota profilleri.
 
charge_sessions Şarj oturumları.
 
charge_evidence Şarj ekranı, fatura, fotoğraf, kullanıcı onayı.
 
service_visits Servis ziyaretleri.
 
service_evidence Belge, fotoğraf, fatura.
 
monthly_reports Aylık karne.
 
annual_reports Yıllık karne.
 
battery_health_snapshots Tahmini batarya kapasite sinyalleri.
 
vehicle_public_reports QR ile paylaşılan public karne.
 
transfer_requests Araç devir süreçleri.
 
ad_segments Reklam segmentleri.
 
insight_queries B2B analiz sorguları.
 
## 26. MVP Roadmap
 
### Faz 1: Veri Toplama Çekirdeği
 
İlk hedef trip recorder olmalı.
 
Yapılacaklar:
 
 
- Araç kayıt.
 
- Araç model normalizasyonu.
 
- GPS ile yolculuk takibi.
 
- Yolculuk başlangıç/bitiş.
 
- Ortalama hız, mesafe, süre.
 
- Basit rota kaydı.
 
- Varış sonrası mini soru.
 
- Basit backend’e veri gönderme.
 

 
### Faz 2: Şarj Algılama
 
 
- Şarj istasyonu POI verisi.
 
- Şarj istasyonu yakınında durma algısı.
 
- Push ile “şarj mı ediyorsun?” sorusu.
 
- Fotoğraf veya manuel giriş.
 
- Şarj maliyeti kaydı.
 
- kWh ve TL hesabı.
 

 
### Faz 3: İlk Karne
 
 
- Toplam km.
 
- Toplam elektrik maliyeti.
 
- Km başı maliyet.
 
- Ortalama tüketim.
 
- Şarj sayısı.
 
- Ortalama şarj süresi.
 
- İlk aylık karne.
 

 
### Faz 4: Rota Fingerprint ve Kalibrasyon
 
 
- Tekrarlayan rota bulma.
 
- Normal tüketim profili.
 
- Sapma tespiti.
 
- Klima/yolcu/hız etkisi.
 
- 3 şarj sonrası kişisel profil.
 

 
### Faz 5: Public Karne
 
 
- QR rapor üretimi.
 
- Public URL.
 
- Paylaşılabilir araç karnesi.
 
- Veri güven seviyesi.
 

 
### Faz 6: Araç Sicili
 
 
- Sahiplik dönemi.
 
- Devir talebi.
 
- Araç merkezli kayıt.
 
- Yeni sahip başlangıcı.
 

 
### Faz 7: Servis/Bakım
 
 
- Kılavuzdan bakım takvimi.
 
- GPS ile servis algısı.
 
- Kullanıcı onayı.
 
- Belge/fotoğraf.
 
- Bakım uyum göstergesi.
 

 
### Faz 8: Benchmark
 
 
- Aynı araç modeli karşılaştırması.
 
- Aynı şehir karşılaştırması.
 
- Aynı kullanım profili karşılaştırması.
 
- Topluluk ortalamaları.
 

 
### Faz 9: Reklam Motoru
 
 
- Davranış segmentleri.
 
- Araç/servis/şarj/kaplama/sigorta reklamları.
 
- Karşılaştırma ekranı reklamları.
 

 
### Faz 10: Insight Studio
 
 
- AND/OR filtre paneli.
 
- OEM, batarya, sigorta, filo ve şarj ağı raporları.
 
- Anonim ve agregasyonlu veri ihracı.
 

 
## 27. En Kritik Net Kararlar
 
Bu konuşmada alınan ana kararlar şunlar oldu:
 
Sistem menzil uygulaması değil, gerçek kullanım görünürlük sistemi olacak.
 
AI karar motoru olmayacak. AI sadece araç bilgisi çıkarma, kılavuz özetleme, fotoğraf okuma ve anlatım katmanında kullanılacak.
 
Karar motoru deterministic olacak.
 
Telefon kabuk olacak; beyin sunucuda çalışacak.
 
İlk gün kullanıcıdan para istenmeyecek.
 
İlk gün kullanıcıya görünürlük verilecek.
 
İlk kişisel hesaplar düşük güvenli olacak ve açıkça “tahmini” olarak sunulacak.
 
Üçüncü şarjdan sonra kişisel model oluşmaya başlayacak.
 
Araç kullanıcıdan bağımsız bir varlık olarak tutulacak.
 
Sahip değişse de araç sicili devam edebilecek.
 
Public QR karne sistemi uzun vadeli güven katmanı olacak.
 
OEM rakip değil, ileride potansiyel veri eşleştirme müşterisi olacak.
 
En değerli veri teknik batarya logu değil, doğrulanmış davranış bağlamı olacak.
 
## 28. En Büyük Risk
 
En büyük risk teknik imkânsızlık değil, scope’un cazibesine kapılıp ilk kullanıcı faydasını unutmaktır.
 
Bu sistemin 10 yıllık vizyonu çok büyük olabilir. Ancak ilk ürün şu üç şeyi çok iyi yapmalı:
 
 
- Aracın genel verisini görünür kıl.
 
- Kullanıcının gerçek tüketimini toplamaya başla.
 
- İlk aylık karnede kullanıcıya “bu sistem bana para kazandırıyor” dedirt.
 

 
Bunlar olmadan OEM, sicil, ikinci el, reklam, sigorta, analiz sistemi sadece teori olarak kalır.
 
## 29. BBTV ile Ortak Pattern
 
Bu EV sistemi aslında BBTV’nin araç versiyonudur.
 
BBTV’de: İnsan + mutfak + stok + alışveriş + tüketim + karar modeli vardı.
 
Burada: İnsan + araç + rota + şarj + bakım + tüketim + karar modeli var.
 
İki sistemde de ortak prensip aynı:
 
 
- İnsan merkezde.
 
- Gerçek dünya modeli merkezde.
 
- AI karar verici değil.
 
- Deterministik sistem karar üretir.
 
- Sistem görünmeyeni görünür kılar.
 
- Kullanıcı manipüle edilmez.
 
- Alternatif ve açıklama üretilir.
 
- Veri zamanla ekonomik değere dönüşür.
 

 
## 30. Son Tanım
 
Bu sistemin bugünkü en doğru tanımı şudur:
 
Elektrikli araç kullanıcıları için gerçek kullanım, maliyet, şarj, batarya ve araç geçmişini görünür kılan; zamanla araç merkezli dijital sicile dönüşen deterministik araç yaşam döngüsü platformu.
 
Kısa adıyla:
 
Araç Karnesi.
 
Daha büyük vizyonuyla:
 
Vehicle Reality Layer.