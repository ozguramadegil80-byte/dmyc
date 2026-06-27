# DMyC — Sistem Yetenekleri

**Sürüm:** 3.0 · **Güncelleme:** Haziran 2026

> Katalog menzili herkes için aynıdır. Gerçek menzil kişiseldir. DMyC bu farkı ölçer — ve araç değerini belgeler.

---

## Katman 1 — Çalışan Sistem

### Araç Yönetimi
- Katalog tabanlı araç kaydı (marka / model / variant)
- Birden fazla araç, paylaşım ve erişim yönetimi
- WLTP menzil, batarya kapasitesi ve teknik özellikler otomatik yüklenir

### Yolculuk Kaydı
- **Otomatik:** Arka planda GPS izleme; araç hareket edince başlar, durduğunda biter
- **Manuel:** Kullanıcı başlatıp bitirir
- Her yolculukta mesafe, süre, ortalama hız kaydedilir

### Rota ve Konum Yönetimi
- Ev / İş / Özel kategorili kayıtlı konum oluşturma, düzenleme, silme
- Harita üzerinden pin ile konum doğrulama
- Kayıtlı rotalar (origin → destination çifti)

### Rota Öğrenmesi
- Her yolculuk rota parmak izine atanır
- 4–5 yolculuktan sonra hat "Tanımlandı" — SÜRÜCÜ ekranında HATLARIM listesinde gösterilir
- Hat bazında ortalama sürüş skoru takibi

### Şarj Takibi
- Şarj seansı kaydı: başlangıç / bitiş SOC, şarj türü, maliyet
- AC / DC şarj ayrımı ve oranı hesaplanır
- Yüksek SOC / Düşük SOC şarj davranışı izlenir
- Şarj zekası: kişisel kullanım profiline göre kalibre edilmiş öneriler

### Batarya Ömür Takibi
- Toplam EFC (Equivalent Full Cycle) hesabı
- DC hızlı şarj oranı, yüksek SOC bekleme riski, düşük SOC stres skoru
- Batarya kullanım notu: **A+ / A / B+ / B / C / D** — sigorta ve değerleme raporlarında kullanılır

### Araç Sicili
- **TÜVTÜRK Muayenesi:** Son muayene tarihi, sonucu, sonraki muayene tarihi
- **Bakım Geçmişi:** Servis ziyaretleri, km bazlı bakım takibi
- Veriler paylaşılabilir kasko raporuna otomatik yansır

### Sürüş Davranışı Skoru
- Her yolculukta sert fren ve ani hızlanma olayları tespiti
- 0–100 sürüş skoru; düşük skorlarda push bildirimi
- 3 yolculuktan sonra kişisel karne başlar

### Raporlama
- Aylık / yıllık km, enerji, maliyet, yolculuk sayısı özetleri

### Push Bildirim Altyapısı
- Expo push token kaydı ve yönetimi
- Sürüş skoru, bilinmeyen rota ve HVAC senaryolarında tetiklenir

---

## Katman 2 — Değer ve Sigorta Raporları

Bu katman DMyC'nin en farklılaştırıcı özelliğidir. Araç; teknik geçmişi, batarya sinyalleri ve kullanım profiliyle birlikte **paylaşılabilir, PDF'e dönüştürülebilir resmi görünümlü belgeler** olarak sunulur.

### EV Karnesi — Premium Araç Sağlık Raporu
- Araç kimliği, sürüş profili, ekonomi özeti ve batarya analizi
- Şarj davranışı puanlaması (DC bağımlılık, yüksek SOC riski, düşük SOC stresi)
- WLTP'ye kıyasla pratik menzil tahmini
- Web tarayıcıda açılır → PDF olarak kaydedilebilir
- URL: `dmyc.digital/reports/premium/{id}`

### Kasko Değer Karnesi
Sigortacıya veya ekspere gönderilebilecek teknik ön değerleme belgesi.

**İçerik:**
- EV Kondisyon Skoru (0–100) — batarya notu + DC şarj oranı + EFC
- Kasko Risk Ön Endeksi — muayene durumu + batarya + DC bağımlılığı
- Batarya kullanım notu (A+→D) ve EFC bar grafiği
- Tahmini kasko değer aralığı: Liste fiyatı × yaş faktörü × batarya faktörü × km faktörü
- 4 araç fotoğrafı (kullanıcı yükler; GPS/EXIF metadata otomatik silinir)
- Muayene ve bakım geçmişi
- Web tarayıcıda açılır → PDF olarak kaydedilebilir
- URL: `dmyc.digital/reports/kasko/{id}`

**Veri kapsamı notu:**
TC kimlik numarası, ruhsat, tam şase/VIN, adres, ehliyet ve poliçe bilgisi bulunmaz.
DMyC sigorta aracılığı yapmaz; sigortacıya standart, okunabilir teknik ön dosya sağlar.

**Fotoğraf akışı:**
Kullanıcı "Değer İste" butonundan 4 fotoğraf yükler (ön / arka / sol / sağ). Sunucu tarafında sharp kütüphanesiyle EXIF/GPS metadata silinir; sıkıştırılmış JPEG olarak saklanır.

### Değerleme Algoritması (Deterministik)

```
Tahmini Değer = Liste Fiyatı × Yaş Faktörü × Batarya Faktörü × KM Faktörü

Yaş Faktörü:   0 yıl=1.00, 1=0.87, 2=0.76, 3=0.67, 4=0.60, 5=0.54, 6=0.49, 7=0.44, 8≥=0.40
Batarya Faktörü: A+=1.00, A=0.97, B+=0.94, B=0.89, C=0.80, D=0.68
KM Faktörü:    15.000 km/yıl = 1.0; her 5k fazla → −0.02; her 5k az → +0.015

Değer Aralığı = Nokta Tahmin ± %10
```

---

## Katman 3 — Beta / Yakın Yol Haritası

### Hava Durumu ve HVAC Etkisi _(entegrasyon tamamlandı, kalibrasyonda)_
- Yolculuk sonunda konuma göre hava durumu çekilir
- Sıcaklığa göre klima / ısıtma kullanımı ve menzil etkisi hesaplanır

### Sürücü Verimlilik Faktörü _(beta)_
- Sürüş skoru + HVAC etkisiyle kişisel pratik menzil tahmini
- "WLTP 400 km" yerine "Bu sürücüde ~340–360 km"

### Haftalık Kazanım Potansiyeli _(beta)_
- SOC delta verisiyle hat bazında "daha verimli sürseydin +X km / −Y TL" hesabı

### Topluluk Karşılaştırması _(veri birikiminde)_
- Aynı model kullanıcılarla anonim enerji verimliliği karşılaştırması

### Şarj Ağı Entegrasyonu _(planlanan)_
- OCPP tabanlı şarj noktası verisiyle otomatik seans eşleştirme

### Sigorta Şirketi Doğrudan Entegrasyonu _(planlanan)_
- Anlaşmalı sigortacıya kullanıcı onayıyla teknik rapor iletimi
- KVKK: açık aydınlatma + aktarım izni + hangi şirkete gönderildiği kaydı zorunlu

---

## Sistem Sınırları — Dürüst Tablo

| Konu | Gerçek Durum |
|------|-------------|
| Anlık batarya SOC | Kullanıcı manuel girer; OBD2 / araç API bağlantısı yok |
| Enerji ölçümü | SOC delta tahmini; wattmetre / OBD değil |
| Batarya sağlığı | EFC + şarj davranışı sinyali; kesin kapasite ölçümü değil |
| Şase / VIN doğrulama | Son 5 hane ile kısmi doğrulama; tam VIN sorgusu yok |
| Kasko değer tahmini | Deterministik algoritma; resmi eksper veya TSB fiyatı değil |
| Navigasyon | Yok — rota planlama var, sesli yönlendirme yok |
| iOS | Şu an sadece Android |
| Şarj ağı entegrasyonu | Yok — manuel kayıt |
| Katalog dışı araç | Yok — admin onaylı katalog |
| Çoklu eş zamanlı sürücü | Yok |

---

## Nasıl Öğrenir?

```
Yolculuk biter
  → GPS noktaları analiz edilir (sürüş olayları)
  → Sürüş skoru hesaplanır
  → Rota parmak izi güncellenir (α=0.30)
  → Sürücü profili güncellenir (α=0.30)
  → Hava durumu çekilir, HVAC çıkarımı yapılır  [beta]

Şarj seansı kaydedilir
  → SOC delta hesaplanır
  → Önceki şarjdan bu yana trip'lere enerji atfedilir
  → Batarya ömür istatistikleri (EFC, DC oranı, SOC profili) güncellenir
  → Haftalık kazanım potansiyeli yeniden hesaplanır

Kasko raporu oluşturulur
  → Anlık araç sicili snapshot'ı alınır (muayene + bakım)
  → Kondisyon skoru + değerleme deterministik hesaplanır
  → Kullanıcı 4 araç fotoğrafı yükler → EXIF/GPS silinerek saklanır
  → Paylaşılabilir web raporu + PDF aktif olur
```

---

## Ürün Pozisyonu

**DMyC, sigorta şirketinin yerine geçmez. Sigortacıya dağınık WhatsApp fotoğrafları yerine standart, notlandırılmış, araç geçmiş sinyalli teknik ön dosya sağlar.**

Bu ayrım hem kullanıcıya güven verir (kimlik verisi yok) hem sigortacıya değer katar (düzenli, okunabilir, karşılaştırılabilir veri).

---

_Bu doküman iç teknik referans içindir. Dışarıya yönelik sürüm için bkz. `sponsor-ozet.md`_
