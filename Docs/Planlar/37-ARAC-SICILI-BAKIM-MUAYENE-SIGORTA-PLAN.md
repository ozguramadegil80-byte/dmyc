# DMyC Araç Sicili — Bakım · Muayene · Sigorta Planı

## Vizyon

Bakım takibi + TÜVTÜRK muayene + kasko bedeli üçlüsü DMyC'yi "sadece menzil takip eden app"
olmaktan çıkarıp **araç sicili ve EV karnesi platformuna** dönüştürür.

Kullanıcı tek yerden şunu görebilmeli:

```
Aracım nasıl kullanıldı?
Resmi yükümlülükleri takip edilmiş mi?
Ekonomik değeri ne yönde etkileniyor?
```

Bu plan 36 numaralı bakım periyotları planını genişletir ve onu Muayene ile Sigorta modülleriyle
birleştirir. Tüm veri modeli tek migrasyonda kurulur; özellikler faz faz açılır.

---

## Temel Prensipler

- **Resmi doğrulama yapma.** Muayene, sigorta, kasko — hepsi kullanıcı beyanı veya belge
  görüldü seviyesinde kalır. e-Devlet veya resmi API bağlantısı bu planda yoktur.
- **Yüz yüze dürüst ol.** Kasko değeri olasılıksaldır, muayene tarihi tahminidir. UI metni
  bunu açıkça söyler.
- **Kural yoksa fallback gizle.** Bakım kuralı olmayan araçta kullanıcıya `15.000 km` gibi
  yazmak yerine "Üretici bakım takvimi doğrulanmadı" gösterilir.
- **Premium rapor köprüsü.** Araç sicili verileri premium rapora akar; rapor kasko
  şirketine gönderilebilir belge olur.

---

## Veri Modeli

### maintenance_rule_candidates

Gemini / LLM çıktısı veya araştırma verisi buraya alınır. Admin onayı olmadan
`maintenance_rules` tablosuna geçmez.

```sql
CREATE TABLE maintenance_rule_candidates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_payload             JSONB,
  brand                   TEXT NOT NULL,
  model                   TEXT NOT NULL,
  variant                 TEXT,
  matched_vehicle_spec_id UUID REFERENCES vehicle_specs(id),
  match_status            TEXT NOT NULL,   -- exact | family_match | fuzzy_match | unmatched
  match_score             NUMERIC(5,2),
  rule_type               TEXT NOT NULL,   -- periodic_visit | item_schedule | condition_based | manual_required
  item_code               TEXT,            -- cabin_filter | brake_fluid | tire_rotation | coolant | hv_battery_check | general_inspection
  interval_km             INT,
  interval_months         INT,
  first_due_km            INT,
  first_due_months        INT,
  source_name             TEXT,
  source_url              TEXT,
  source_quote            TEXT,
  source_confidence       TEXT NOT NULL,   -- official_manual | official_web | dealer_source | community_unverified | research_needed
  source_depth            TEXT NOT NULL,   -- manual_deep_link | official_deep_link | official_homepage | dealer_page | unknown
  research_needed         BOOLEAN DEFAULT FALSE,
  warnings                TEXT[],
  missing_fields          TEXT[],
  admin_status            TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | needs_source
  admin_note              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### maintenance_rules

Yalnızca admin onaylı, kaynak kalitesi kabul edilmiş kurallar.

```sql
CREATE TABLE maintenance_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_spec_id     UUID REFERENCES vehicle_specs(id),
  canonical_vehicle_id UUID REFERENCES canonical_vehicles(id),
  rule_type           TEXT NOT NULL,
  item_code           TEXT,
  interval_km         INT,
  interval_months     INT,
  first_due_km        INT,
  first_due_months    INT,
  source_name         TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  source_confidence   TEXT NOT NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT source_url_required CHECK (source_url <> ''),
  CONSTRAINT interval_required   CHECK (interval_km IS NOT NULL OR interval_months IS NOT NULL)
);
```

### vehicle_inspection_records

TÜVTÜRK muayene takibi. Kullanıcı beyanı veya belge görüldü seviyesi.

```sql
CREATE TABLE vehicle_inspection_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id),
  last_inspection_date  DATE,
  next_inspection_date  DATE,               -- hesaplanmış veya belgeyle görüldü
  first_registration_year INT,              -- ilk tescil yılı (muayene hesabı için)
  result                TEXT,               -- passed | failed | unknown
  report_number_masked  TEXT,               -- son 4 karakter
  source_type           TEXT NOT NULL DEFAULT 'user_input',
                                            -- user_input | document_ocr | edevlet_screenshot
  confidence            TEXT NOT NULL DEFAULT 'user_declared',
                                            -- user_declared | document_seen
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### vehicle_compliance_records

Sigorta, trafik poliçesi, vergi, garanti gibi genel uyumluluk kayıtları.

```sql
CREATE TABLE vehicle_compliance_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id),
  record_type           TEXT NOT NULL,      -- traffic_insurance | casco | tax | warranty | tire_change
  status                TEXT NOT NULL DEFAULT 'user_declared',
                                            -- user_declared | document_seen
  issue_date            DATE,
  expiry_date           DATE,
  document_number_masked TEXT,
  source_type           TEXT NOT NULL DEFAULT 'user_input',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### vehicle_valuation_snapshots

TSB kasko referans değeri anlık görüntüsü.

```sql
CREATE TABLE vehicle_valuation_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
  valuation_type   TEXT NOT NULL DEFAULT 'tsb_casco_reference',
                                    -- tsb_casco_reference | user_market_estimate | dealer_offer
  value_try        NUMERIC(14,2) NOT NULL,
  valuation_month  TEXT NOT NULL,   -- YYYY-MM
  brand            TEXT NOT NULL,
  model            TEXT NOT NULL,
  model_year       INT NOT NULL,
  variant          TEXT,
  source_type      TEXT NOT NULL DEFAULT 'admin_entry',
                                    -- admin_entry | tsb_scrape | user_estimate
  source_url       TEXT,
  confidence       TEXT NOT NULL DEFAULT 'reference_only',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Faz Sırası

### Faz 1 — Veri Modeli (Temel)

Tüm tablolar tek migration dosyasında oluşturulur. Hiçbir özellik bu olmadan çalışmaz.

**Migrations:**
- `maintenance_rule_candidates`
- `maintenance_rules`
- `vehicle_inspection_records`
- `vehicle_compliance_records`
- `vehicle_valuation_snapshots`

**API:**
- `vehicle_specs.service_interval_km` fallback kaldırılmaz ama UI'a yansıtılmaz.
- `service-compliance` endpoint'i `maintenance_rules`'da kural var mı yok mu kontrol eder;
  yoksa `hasVerifiedRules: false` döner.

**Kabul kriterleri:**
- [ ] 5 tablo migration hatasız çalışır.
- [ ] `GET /vehicles/:id/service-compliance` → `hasVerifiedRules: boolean` alanı döner.
- [ ] Kural yoksa UI "Üretici bakım takvimi doğrulanmadı" gösterir, 15.000 km yazmaz.

---

### Faz 2 — Onboarding: Muayene ve Sigorta Soruları

Kullanıcı araç kaydı sırasında iki basit soru alır. Zorunlu değil, atlanabilir.

**Muayene sorusu akışı:**

```
"Muayene takibi yapmak ister misiniz?"
  → Evet

"Son muayene tarihinizi girin:"
  → [Tarih seçici]   veya   "Henüz muayene olmadı"

"Henüz muayene olmadı" seçilirse:
  "Aracın trafiğe çıkış yılı:" → [Yıl]
  Hesaplama: çıkış_yılı + 3 = ilk muayene yılı

Son tarih girildiyse:
  Hesaplama: son_muayene + 2 yıl = sonraki muayene
```

**Sigorta sorusu akışı:**

```
"Trafik sigortası bitiş tarihinizi kaydetmek ister misiniz?"
  → [Tarih seçici]   veya   "Atla"

"Kasko bitiş tarihinizi kaydetmek ister misiniz?"
  → [Tarih seçici]   veya   "Atla"
```

**Kabul kriterleri:**
- [ ] Onboarding'de muayene ve sigorta adımları atlanabilir.
- [ ] Girilen tarihler `vehicle_inspection_records` ve `vehicle_compliance_records`'a yazılır.
- [ ] Sonraki muayene tarihi hesaplanır ve `next_inspection_date` olarak kaydedilir.
- [ ] Araç sicili ekranında muayene kartı tarihle birlikte görünür.

---

### Faz 3 — Araç UI: Muayene ve Sigorta Kartları

Araç ekranında (AracScreen) mevcut servis bölümünün altına iki yeni kart:

**Muayene Kartı:**
```
TÜVTÜRK MUAYENESİ
Sonraki tahmini tarih: Mart 2027
Kalan: 8 ay

[Muayene Tarihini Güncelle]
```
- Tarih geçmişse kart kırmızı kenarlık + "Muayene gerekiyor" uyarısı.
- `confidence = 'document_seen'` ise "Belgeyle görüldü" rozeti eklenir.

**Sigorta Kartı:**
```
SİGORTA TAKİBİ
Trafik: 14.08.2025  [28 gün kaldı — uyarı]
Kasko:  22.11.2025  [3 ay kaldı]

[Tarihleri Güncelle]
```

**Kabul kriterleri:**
- [ ] Muayene kartı `next_inspection_date`'e göre renk değiştirir (yeşil / sarı / kırmızı).
- [ ] Sigorta bitiş tarihi 30 günden azsa sarı uyarı gösterilir.
- [ ] Tarih girişi modal üzerinden güncellenir, `vehicle_inspection_records`'a yazılır.

---

### Faz 4 — Admin: Bakım Kuralı Adayları Paneli

Admin panelde yeni sekme: "Bakım Adayları"

**Özellikler:**
- `maintenance_rule_candidates` listesi filtreli görünüm:
  - `admin_status`: pending / needs_source / approved / rejected
  - `match_status`: exact / family_match / fuzzy_match / unmatched
  - `source_confidence` seviyesi
- Her aday için: araç eşleşmesi, kaynak URL, kaynak alıntısı, uyarılar.
- Admin aksiyonları: **Onayla** / **Kaynak İste** / **Reddet** / **Modele Uygula**
- "Onayla" → `maintenance_rules`'a satır üretir.
- Reddedilenler audit için `maintenance_rule_candidates`'ta `rejected` olarak kalır.

**Import pipeline:**
- Gemini JSON çıktısı CLI aracıyla `maintenance_rule_candidates`'a alınır.
- Import sırasında: brand + model + variant eşleşmesi → `match_status` hesaplanır.
- Ana sayfa URL'leri otomatik `source_depth = 'official_homepage'` → `needs_source` durumuna düşer.

**Kabul kriterleri:**
- [ ] Admin 53 araç adayını görebilir, filtreleyebilir.
- [ ] Onay işlemi `maintenance_rules`'a satır yazar.
- [ ] `official_homepage` URL'li hiçbir aday otomatik onaylanamaz.
- [ ] Tesla item-based kuralları ayrı `item_code` satırları olarak görünür.

---

### Faz 5 — Araç UI: Bakım Periyodu Kartı

Mevcut servis uyumu kartı `maintenance_rules` tablosuna bağlanır.

**Kural varsa:**
```
ÜRETİCİ BAKIM TAKİBİ
Sonraki bakım: 2.400 km kaldı  (18.600 / 21.000 km)
Kabin Filtresi: 8 ay kaldı
Fren Hidroliği: 14 ay kaldı

Kaynak: BMW Türkiye Kullanım Kılavuzu  ↗
```

**Kural yoksa:**
```
ÜRETİCİ BAKIM TAKİBİ
Bu araç için üretici bakım takvimi henüz doğrulanmadı.
Servis ziyaretlerini elle kaydedebilirsiniz.
```

**Next service hesabı:**
```
Kural: first_due_km = 20.000, interval_km = 40.000
Araç: odometer = 18.600 km

Eğer odometer < first_due_km:
  kalan = first_due_km - odometer  →  1.400 km kaldı

Eğer odometer >= first_due_km:
  son_servis_km = last service visit km veya first_due_km
  kalan = interval_km - (odometer - son_servis_km)
```

**Kabul kriterleri:**
- [ ] `maintenance_rules` kuralı olan araçlarda km bazlı kalan gösterilir.
- [ ] Item-based kurallarda (Tesla vb.) liste görünümü: item + kalan ay/km.
- [ ] `condition_based` araçlarda "Üretici condition-based servis kullanır" notu.
- [ ] 15.000 km fallback kullanıcıya hiçbir koşulda gösterilmez.

---

### Faz 6 — Sigorta Değeri Sorgusu

Araç ekranında "Referans Kasko Değeri" kartı — sorgula butonu.

**Akış:**
```
[KASKO DEĞERİ SORGULA]
  ↓
Sistem vehicle_valuation_snapshots'a bakar.
Veri varsa:

  Referans Kasko Değeri
  ─────────────────────
  TSB Referans: 1.850.000 ₺  (Ocak 2026)
  DMyC Kullanım Sinyali: ↑ Olumlu
    ✓ Düzenli bakım kaydı
    ✓ Düşük DC hızlı şarj oranı (%12)
    ✓ A batarya notu

  ⚠ Bu olasılıksal bir referans değerdir.
    Km, hasar, kozmetik durum hesaba katılmamıştır.
    Kesin fiyat için kasko şirketine başvurun.

Veri yoksa:
  "Bu araç için referans değer henüz eklenmedi."
```

**TSB verisi:** Başlangıçta admin elle girer (`vehicle_valuation_snapshots`).
Sonraki aşamada aylık güncelleme otomasyonu planlanır.

**Kabul kriterleri:**
- [ ] Sorgula butonuna basınca snapshot gösterilir veya "veri yok" mesajı.
- [ ] DMyC sinyalleri (bakım, DC oranı, batarya notu) snapshot'a ek olarak hesaplanır.
- [ ] Olasılıksal uyarı metni her zaman görünür, gizlenemez.

---

### Faz 7 — Premium Rapor: Kasko Şirketine Gönder

Premium rapor PDF'ine araç sicili bölümü eklenir. Rapor doğrudan kasko teklifine
destek belgesi olarak kullanılabilir.

**PDF'e eklenen bölüm: Araç Sicili**
```
Muayene: Geçerli (Mart 2027'ye kadar)
Trafik Sigortası: Geçerli (Ağustos 2025'e kadar)
Kasko: Aktif (Kasım 2025'e kadar)
Üretici Bakımı: Düzenli takip ediliyor
Şase: Beyan Edilmiş / *****XXXXX
```

**Rapor gönderim akışı:**
```
"Raporu Kasko Şirketine Gönder"
  → PDF indir
  → "Bu raporu kasko teklifinize ekleyin.
     Sürücü profili ve araç kullanım verisi
     daha doğru fiyat almanızı sağlayabilir."
```

İleride: kasko şirketi API entegrasyonu → doğrudan teklif çekme.

**Kabul kriterleri:**
- [ ] Premium rapor PDF'inde araç sicili bölümü var.
- [ ] VIN / şase rozeti PDF'de görünüyor (`declared` / `vin_matched`).
- [ ] "Kasko şirketine gönder" akışı PDF paylaşımı açıyor.

---

## Kaynak Güven Sınıfları (Bakım Kuralları için)

| Sınıf | Açıklama |
|-------|----------|
| `official_manual` | Kullanım kılavuzu, garanti/bakım kitapçığı, resmi PDF |
| `official_web` | Resmi sitede bakım periyodu veya bakım kalemi sayfası |
| `dealer_source` | Yetkili servis / distribütör sayfası |
| `community_unverified` | Forum, kullanıcı yorumu, servis deneyimi |
| `research_needed` | Bilgi eksik veya kaynak yetersiz |

Ek derinlik sınıfı:
- `official_homepage` → Ana sayfa; bakım periyodu kanıtı sayılmaz, admin onayına kapalı.
- `official_web_general` → Genel EV bakım yazısı; model/varyant kesinliği yok.
- `manual_deep_link` → Doğrudan kılavuz veya bakım tablosu; en güvenli kaynak.

---

## Araç Sicili Bölümü (Tam Liste)

```
Araç Sicili
├── Üretici Bakım Takibi      (Faz 5)
├── TÜVTÜRK Muayene Takibi    (Faz 3)
├── Trafik Sigortası Tarihi   (Faz 3)
├── Kasko Poliçesi Tarihi     (Faz 3)
├── Referans Kasko Değeri     (Faz 6)
├── Şase / VIN Durumu         (Mevcut)
├── Batarya Garantisi         (İleride)
├── Genel Garanti             (İleride)
└── Lastik Değişim Geçmişi    (İleride)
```

---

## Tüm Kabul Kriterleri Özeti

- [ ] 5 yeni tablo migration hatasız çalışır.
- [ ] Onboarding'de muayene ve sigorta soruları atlanabilir şekilde sorulur.
- [ ] Araç UI'de muayene kartı yaklaşan/geçmiş tarih için renk değiştirir.
- [ ] Sigorta bitiş tarihi 30 günden azsa uyarı gösterilir.
- [ ] Admin panelde bakım adayları paneli açılır, onay akışı çalışır.
- [ ] `maintenance_rules` olmayan araçta "doğrulanmadı" gösterilir, 15.000 km yazılmaz.
- [ ] Kural olan araçta "X km kaldı" doğru hesaplanır (first_due + periodic mantığı).
- [ ] Kasko değeri sorgusu olasılıksal uyarı ile birlikte gösterilir.
- [ ] Premium rapor PDF'inde araç sicili ve VIN rozeti var.
- [ ] Tesla item-based kurallar (kabin filtresi, fren hidroliği vb.) ayrı satır olarak çalışır.
- [ ] `official_homepage` kaynaklı hiçbir aday otomatik onaylanamaz.
- [ ] e-Devlet veya resmi API entegrasyonu bu planda yoktur; tüm veri beyan veya belge görüldü seviyesindedir.
