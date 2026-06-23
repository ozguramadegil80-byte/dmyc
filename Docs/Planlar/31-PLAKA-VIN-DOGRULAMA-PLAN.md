# DMyC Plaka / VIN Doğrulama Planı

## Amaç

Araç kimliğini resmi kayıt sistemiyle bağlamak.
İkinci el raporu için "bu araç gerçekten bu plakaya mı ait?" sorusunu yanıtlamak.

---

## Neden Şimdi Değil

```text
- Türkiye Trafik Tescil API'si kapalı / özel erişimli (e-devlet entegrasyonu gerekir)
- KVKK uyumu → plaka → araç → kişi zinciri hassas veri
- Teknik önündeki hukuki engel büyük
- Kullanıcı yeterli değer görmeden bu bilgiyi vermez
```

---

## Kapsam

```text
Kapsam içi:
  VIN decode (açık veri):
    - VIN → marka, model, yıl, üretim ülkesi
    - NHTSA / VINS (uluslararası açık DB)
    - Türkiye için TSE VIN standardı

  Kullanıcı beyanı:
    - Plakayı kullanıcı girer → sistemde saklanır
    - Doğrulama rozeti yok (beyan bazlı)

Kapsam dışı:
  - Resmi trafik tescil sorgusu (e-devlet)
  - Araç muayene durumu sorgulama
  - Trafik cezası sorgulama
```

---

## DB Değişiklikleri

```text
vehicles tablosuna:
  vin      text (zaten var)
  plate    text   -- Türkiye: AA 000 AA formatı
  vin_decoded jsonb -- decode sonucu cache

vehicle_identity_verifications:
  vehicle_id, method ('user_declared' | 'vin_decode' | 'official'),
  verified_at, confidence
```

---

## VIN Decode Entegrasyonu

```text
NHTSA API (ABD üretimi araçlar, ücretsiz):
  GET https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{vin}?format=json

Türkiye araçları için:
  - Togg: VIN prefix TR... → farklı decode kuralı
  - İthal Çin araçları: BYD, OMODA → uluslararası standart
```

---

## Ön Koşul

```text
Kullanıcıların "plakamı görmek istiyorum" talebi gelmesi
veya
B2B (ikinci el galeri) müşteri talebi
```

---

## Durum: ⏳ BEKLEMEDE
