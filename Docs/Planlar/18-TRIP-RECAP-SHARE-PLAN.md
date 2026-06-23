# DMyC Trip Recap ve Share Planı

## Amaç

Roadmap Faz 10'un amacı, tamamlanan yolculuklardan paylaşılabilir ama sürücü puanı vermeyen bir özet katmanı üretmektir.

Bu fazın ilk sürümü sosyal platform entegrasyonu veya görsel kart render servisi değildir. Önce tamamlanan trip için kalıcı recap ve share card verisi üretilir; görsel export ve public sayfa sonraki adımlarda bu modele bağlanır.

## Kapsam

İçerir:

- `trip_recaps`
- `trip_share_cards`
- Tamamlanan trip üstünden recap üretimi
- Share card token ve paylaş metni
- Mobil Trip ekranında son yolculuk recap görünürlüğü

İçermez:

- Gerçek sosyal medya API entegrasyonu
- Sunucu taraflı PNG/JPEG kart üretimi
- Public web sayfası SEO/OG kartları
- Sürücü puanı / skor dili

## Ürün Dili

Sistem şunu demez:

```text
Sürücü puanın 82.
```

Şunu der:

```text
Bu yolculuk dengeli/verimli/dinamik karakterdeydi.
Enerji tüketimi tahmini/ölçülü olarak özetlendi.
Paylaşmak istersen kişisel olmayan kart hazır.
```

## Fazlar

### Faz 18A: Plan ve Roadmap Senkronu

- `[x]` Faz 9 Premium Güven Katmanı kapalı kabul edilir.
- `[x]` Faz 10'un ilk hedefi trip recap/share foundation olarak netleştirilir.

### Faz 18B: DB Foundation

- `[x]` `trip_recaps` tablosu eklenir.
- `[x]` `trip_share_cards` tablosu eklenir.
- `[x]` Trip başına tek recap, recap başına card token modeli kurulur.

### Faz 18C: Recap API

- `[x]` `POST /trips/:id/recap` eklenir.
- `[x]` `GET /trips/:id/recap` eklenir.
- `[x]` Recap metni sürücü puanı vermeden üretilir.

### Faz 18D: Share Card API

- `[x]` `POST /trip-recaps/:id/share-cards` eklenir.
- `[x]` `GET /trip-share-cards/:token` eklenir.
- `[x]` Share count artırma davranışı eklenir.

### Faz 18E: Mobil Görünürlük

- `[x]` Trip bitince recap otomatik istenir.
- `[x]` Trip ekranında son recap kartı görünür.
- `[x]` Paylaş metni kopyala/native share hazırlığı yapılır.

### Faz 18F: Doğrulama

- `[x]` DB migration uygulanır.
- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` Recap/share smoke doğrulanır.
- `[x]` Mobil recap kartı gözle kontrol edilir.

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Kullanıcı tamamlanan son yolculuğun özetini görebilir.
Sistem sürücü puanı vermeden yolculuk karakteri söyler.
Kullanıcı paylaşılabilir metin/kart tokenı alabilir.
```

## Sonraki Fazlara Açılan Kapı

- Public EV Karnesi için public URL altyapısı
- Araç Sicili için trip geçmişi anlatısı
- Viral paylaşım için görsel kart render servisi
