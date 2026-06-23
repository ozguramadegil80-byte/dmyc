# Needs Review Variant Ayrıştırma Raporu

Bu rapor Faz 5C kapsamında `needs_review` veya çelişkili görünen araç kayıtlarının variant bazlı ayrıştırılması için oluşturuldu.

## Temel Karar

Dataset otomatik web scrape çıktısı gibi davranmayacak. Resmi kaynakla netleşen teknik değerler güncellenecek; resmi kaynakla birebir eşleşmeyen veya eski model/trim olduğu anlaşılan kayıtlar aktif mobil katalogdan ayrılacak.

## Tesla Model Y

Tesla Türkiye güncel Model Y sayfası eski dataset varyantlarıyla birebir aynı değil. Bu nedenle Model Y kayıtları güncel Türkiye varyantlarına göre yeniden ayrıldı.

Güncel aktif katalog kayıtları:

```text
Tesla Model Y Standard RWD
Tesla Model Y Premium Long Range RWD
Tesla Model Y Premium Long Range AWD
Tesla Model Y Performance
```

Güncellenen resmi alanlar:

```text
WLTP menzil
boş kütle
resmi enerji tüketimi
DC şarj gücü
variant adı
```

Not:

```text
Tesla resmi sayfası batarya kWh değerini açık vermediği için batarya kapasitesi eski dataset bilgisinden korunmuştur. Bu yüzden doğrulama seviyesi `partial_official_verified` olarak tutuldu.
```

## Togg T10X

Togg T10X için resmi katalog PDF'i variant bazlı teknik tablo verdiği için T10X kayıtları doğrudan katalog değerleriyle düzeltildi.

Güncellenen alanlar:

```text
AC şarj gücü
DC şarj gücü
boş ağırlık
resmi enerji tüketimi
kaynak URL
```

Karar:

```text
T10X kayıtları official_verified kaldı.
T10X DC şarj gücü 180 kW olarak güncellendi.
T10X AC şarj gücü 22 kW olarak güncellendi.
```

## BMW i4

Mevcut dataset kaydı:

```text
BMW i4 eDrive30 M Sport
```

BMW Türkiye güncel resmi sayfası eDrive40 ağırlıklı teknik değerler gösteriyor. Mevcut `eDrive30 M Sport` kaydı güncel resmi Türkiye kaydıyla birebir eşleşmediği için aktif katalogdan ayrıldı.

Karar:

```text
official_sales_status = legacy_reference
verification_level = archived_legacy
```

## Mercedes-Benz EQE SUV

Mevcut dataset kaydı:

```text
Mercedes-Benz EQE SUV 350 4MATIC
```

Mercedes Türkiye'de bulunan güncel broşür EQE sedan içeriği veriyor; EQE SUV kaydıyla birebir resmi Türkiye eşleşmesi netleşmedi.

Karar:

```text
official_sales_status = legacy_reference
verification_level = archived_legacy
```

## Aktif Katalog Kuralı

`legacy_reference` kayıtları database içinde kalır; ancak mobil katalog exportundan ve API listeleme endpointinden çıkarılır.

Kural:

```text
DB: kanıt ve geçmiş için tut.
Mobil katalog: kullanıcıya aktif seçim olarak gösterme.
API listeleme: aktif katalog gibi sunma.
```

Bu sayede eski veya çelişkili kayıtlar admin/review tarafında saklanabilir, ama kullanıcı ilk onboarding sırasında bunları kesin güncel araç gibi seçmez.

