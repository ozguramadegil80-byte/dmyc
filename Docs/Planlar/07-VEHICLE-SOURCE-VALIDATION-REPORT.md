# Araç Kaynak Doğrulama Raporu

Bu rapor Faz 5B kapsamında kritik araç kayıtlarının güncel resmi veya öncelikli kaynaklarla kontrol edilmesi için oluşturuldu.

## Kontrol Edilen Öncelikli Kaynaklar

- Togg T10X resmi sayfası: `https://www.togg.com.tr/en/t10x`
- Togg T10F resmi sayfası: `https://www.togg.com.tr/en/t10f`
- Togg T10X 4More Obsidian resmi sayfası: `https://www.togg.com.tr/en/t10x-4more-obsidian`
- Tesla Türkiye Model Y resmi sayfası: `https://www.tesla.com/tr_TR/modely`
- BYD Türkiye Atto 3 resmi sayfası: `https://www.bydauto.com.tr/atto3`
- BYD Türkiye Seal resmi sayfası: `https://www.bydauto.com.tr/seal`
- BYD Türkiye Dolphin resmi sayfası: `https://www.bydauto.com.tr/dolphin`
- Kia Türkiye EV3 resmi sayfası: `https://www.kia.com/tr/modeller/ev3/ozellikler.html`

## Dataset Güncellemeleri

- BYD Atto 3, BYD Seal AWD Excellence ve BYD Dolphin kayıtları resmi BYD Türkiye kaynaklarına bağlandı.
- Kia EV3 Long Range kaydı resmi Kia Türkiye kaynağına bağlandı; WLTP değeri `604 km` olarak düzeltildi.
- Togg T10X ve T10F kayıtlarının kaynak URL'leri doğrudan ilgili resmi model sayfalarına taşındı.
- Tesla Model Y kayıtları güncel Tesla Türkiye sayfasındaki değerlerle dataset değerleri çakıştığı için `needs_review` olarak işaretlendi.
- BMW i4 ve Mercedes EQE SUV kayıtları mevcut kaynak/model eşleşmesi net olmadığı için `needs_review` olarak işaretlendi.

## Çelişkili veya Dikkat Gerektiren Alanlar

### Tesla Model Y

Dataset içindeki Model Y değerleri eski EV Database benzeri değerlerle uyumlu görünüyor. Güncel Tesla Türkiye sayfasında Model Y varyantları için WLTP değerleri ve bazı teknik değerler farklılaştığı için bu kayıtlar otomatik güncellenmedi.

Karar:

```text
Tesla Model Y kayıtları needs_review.
Variant bazlı yeniden eşleme yapılmadan WLTP, ağırlık ve DC şarj değerleri overwrite edilmeyecek.
```

### Togg T10X

Togg T10X resmi sayfasında genel olarak `180 kW DC` ve `22 kW AC` şarj kapasitesi bilgisi görünüyor. Mevcut dataset içinde T10X bazı kayıtlarında `150 kW DC` bulunuyor.

Karar:

```text
T10X kaynak URL'leri resmi sayfaya taşındı.
DC/AC değerleri variant bazlı doğrulama yapılmadan topluca değiştirilmedi.
```

### Kia EV3

Kia Türkiye resmi sayfasında EV3 için `604 km` kombine WLTP bilgisi yer alıyor.

Karar:

```text
EV3 Long Range WLTP değeri 604 km olarak güncellendi.
```

### BYD

BYD Türkiye Atto 3, Seal ve Dolphin sayfaları dataset değerleriyle genel olarak uyumlu.

Karar:

```text
BYD kayıtları resmi kaynaklara bağlandı ve official_verified olarak korundu.
```

### BMW i4 ve Mercedes EQE SUV

BMW ve Mercedes kayıtlarında mevcut dataset varyantı ile güncel Türkiye sayfalarında görünen model/trim bilgisi birebir aynı değil.

Karar:

```text
BMW i4 ve Mercedes EQE SUV kayıtları needs_review.
Resmi model/trim eşleşmesi netleşmeden teknik değerler overwrite edilmeyecek.
```

## Sonraki Aksiyon

Faz 5C'de `needs_review` kayıtları variant bazlı ele alınmalı:

- Tesla Model Y güncel Türkiye varyantları ayrı kayıtlar olarak modellenmeli.
- Togg T10X AC/DC değerleri variant bazlı resmi kaynakla netleştirilmeli.
- BMW i4 ve Mercedes EQE SUV kayıtları Türkiye'de satılan güncel trim karşılıklarıyla eşleştirilmeli.
