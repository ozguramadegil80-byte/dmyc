# DMyC GB Market Aktivasyon Planı

## Amaç

Türkiye odaklı platformu İngiltere pazarına açmak.
UK katalog, OFGEM tarife verisi, İngilizce dil katmanı.

---

## Neden Şimdi Değil

```text
- TR pazarı henüz validasyon aşamasında
- GB katalog kasıtlı boş bırakıldı
- İki pazarı aynı anda yönetmek odağı dağıtır
- İngilizce lokalizasyon %50 tamamlandı ama test edilmedi
```

---

## TR → GB Farklılıkları

```text
Elektrik Tarifesi:
  EPDK (TR) → OFGEM (GB)
  TR: tek zaman dilimi (residential)
  GB: Economy 7 (gece/gündüz farklı), peak/off-peak, Octopus Agile gibi dinamik

Şehir Profili:
  TR: İstanbul 1.15x, Ankara 1.08x, ...
  GB: London 1.12x, Manchester 1.07x, Edinburgh 1.05x, ...

Araç Kataloğu:
  GB'de yaygın ama TR'de olmayan modeller:
    Nissan Leaf, MG4, Vauxhall Corsa-e, MINI Electric
  TR'de yaygın ama GB'de az olanlar:
    Togg T10X (ihracat henüz yok)

Para birimi:
  TR: TRY
  GB: GBP
  Mevcut currency field var → GBP desteği eklenmeli

Yakıt Karşılaştırması:
  TR: benzin litre fiyatı
  GB: petrol litre fiyatı (pence/litre)
```

---

## Teknik Değişiklikler

```text
electricity_tariff_periods:
  → GB residential + GB Economy7 dönemleri seed edilir
  → OFGEM tarife verisi manuel yüklenir

city_traffic_profiles (ev-assessment.service.ts):
  → GB şehirleri JSON'a eklenir
  
vehicle_specs:
  → GB araçları kataloğa eklenir (market_code = 'GB')

Lokalizasyon (i18n):
  → Mevcut 'tr' lokalizasyon dosyası var
  → 'en' lokalizasyon dosyası tamamlanır
```

---

## Ön Koşul

```text
TR'de en az 100 aktif kullanıcı
veya
GB'den inbound talep gelmesi
```

---

## Durum: ⏳ BEKLEMEDE
