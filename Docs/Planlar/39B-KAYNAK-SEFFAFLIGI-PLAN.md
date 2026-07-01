# Plan 39B — Kaynak Şeffaflığı

> **Öncelik:** Önemli. Plan 39A tamamlandıktan sonra başlar.  
> **Bağımlı planlar:** 39A tamamlanmış olmalı.

---

## Mevcut Sorun

DMyC'nin vaadi: "Aracının gerçek durumunu belgele, sigortacıya/alıcıya güvenilir kaynak sun."

Ama şu an:
- Karne skoru nereden hesaplandığını göstermiyor
- Araç sicilinde `user_declared` ile `official` veri aynı görünüyor
- Kasko karnesi PDF'inde kaynak zinciri yok
- Bakım önerileri `15.000 km fallback` içeriyor ama kullanıcı bunu bilmiyor
- Rapor üretildikten sonra kaynak veriler değişirse eski raporun kaynağı belirsizleşiyor

**Sonuç:** Kullanıcı "Bu sisteme güvenebilir miyim?" sorusuna UI'dan cevap alamıyor.

---

## B1 — İki Katmanlı Güven Sistemi

Kullanıcıya tek etiket yetmez. İki boyut gösterilmeli:

### Katman 1 — Kaynak Tipi (NE olduğu)

```
● Doğrulandı    → resmi kaynak veya admin onaylı
◐ Beyan         → kullanıcının girdiği, doğrulanmamış
○ Tahmin        → algoritmik hesap, gerçek veri yok
```

### Katman 2 — Güven Notu (NE KADAR güvenilir)

```
Yüksek güven   → Doğrulandı + birden fazla kaynak örtüşüyor
Orta güven     → Beyan + mantıksal tutarlı
Düşük güven    → Tahmin veya çelişkili veri
```

**Neden iki katman:**  
Kullanıcı "tahmin" görünce panikleyebilir. "Tahmin ama veriyle hesaplandı → orta güven" hissi farklıdır. Güven notu, kaynağın ötesinde sisteme olan inancı ayakta tutar.

**DB'de mevcut alanlar — yeni alan açılmıyor:**
- `vehicle_specs.verification_level` → `verified | research_needed`
- `vehicle_specs.spec_confidence` → `verified | unknown`
- `inspection_records.source_type` → `user_input | official`
- `maintenance_rules.rule_confidence` → `manufacturer_verified | estimated`

---

## B2 — UI Uygulama Noktaları

### Karne Ekranı

Her kart başlığının yanına küçük rozet:

```
[Şarj Verimliliği  ◐ Beyan]
[Fabrika Menzili   ● Doğrulandı]
[Bakım Skoru       ○ Tahmin — Orta güven]
```

Rozete dokunulunca: `"Bu veri kullanıcı tarafından girildi, resmi kaynakla doğrulanmadı."`

### Araç Sicili

Muayene / bakım / sigorta satırlarında kaynak ikonu:

```
✓  Araç Muayenesi  25.01.2025  [● Doğrulandı]
○  Sonraki Bakım   15.000 km   [○ Tahmin — Orta güven]
◐  Sigorta Bitiş   12.09.2025  [◐ Beyan]
```

### Premium Rapor

Footer'da kaynak tablosu (bkz. B3).

### Kasko Karnesi

Expandable section: "Bu değer nasıl hesaplandı?"

```
Piyasa değeri tahmini üç kaynaktan üretilmiştir:
  ● Fabrika verisi (BYD Türkiye resmi)
  ◐ Kullanıcı beyan km
  ○ Genel EV değer kaybı modeli

Güven düzeyi: Orta
```

---

## B3 — Rapor Kaynak Snapshot

Rapor üretildiği anda kaynak tablosu snapshot alınmalı. Sonradan veri değişirse eski raporun kaynağı değişmemeli.

**Uygulama:**

```typescript
// report_source_snapshots tablosu
{
  reportId: uuid,
  generatedAt: timestamp,
  sources: [
    { field: 'factory_range', value: '482 km', sourceType: 'verified', sourceLabel: 'BYD Türkiye (resmi)' },
    { field: 'annual_km', value: '18.000', sourceType: 'user_declared', sourceLabel: 'Kullanıcı beyanı' },
    { field: 'maintenance_interval', value: '15.000 km', sourceType: 'estimated', sourceLabel: 'Genel EV standardı' },
    { field: 'charge_data', value: '47 seans', sourceType: 'app_recorded', sourceLabel: 'DMyC kayıt' },
  ]
}
```

PDF'de kaynak tablosu:

```
VERİ KAYNAKLARI — Rapor üretim tarihi: 30.06.2026
──────────────────────────────────────────────────
Fabrika menzili       BYD Türkiye (resmi)     ●
Yıllık km             Kullanıcı beyanı         ◐
Muayene tarihi        Kullanıcı beyanı         ◐
Bakım periyodu        Genel EV standardı       ○
Şarj verisi           DMyC uygulama kaydı      ●
──────────────────────────────────────────────────
Genel güven düzeyi: Orta
```

---

## B4 — Bakım Fallback Uyarısı

Mevcut `maintenance_rules.rule_confidence` alanı var ama UI bunu göstermiyor.

**Eklenecek metin (mobil + admin):**

```
Bu bakım periyodu 15.000 km'dir.
⚠ Bu değer BYD tarafından doğrulanmamış olup genel EV standartlarına göre hesaplanmıştır.
```

`rule_confidence === 'manufacturer_verified'` ise uyarı gösterilmez.

**Admin onay akışı:**
- Bakım kuralı listesinde onaysız kurallar sarı badge ile işaretlenir
- "Üretici doğrulama ekle" butonu → kaynak URL ve doğrulama notu girilebilir
- Onaylanan kural `manufacturer_verified` olur, uyarı kalkar

---

## B5 — Metin ve UX Rehberi

### Kaçınılacaklar

| Teknik terim | Kullanıcı dostu karşılık |
|---|---|
| `user_declared` | Beyan |
| `estimated` | Tahmin |
| `verified` | Doğrulandı |
| `research_needed` | Bilgi eksik |
| `manufacturer_verified` | Üretici onaylı |

### Açıklama tonlaması

- "Bu veri sisteminize bağlı olarak kaydedilmiştir." (DMyC kayıt)
- "Bu bilgiyi siz girdiniz, henüz doğrulanmadı." (Beyan)
- "Bu değer istatistiksel modelle hesaplandı, üreticiden alınmadı." (Tahmin)

---

## Uygulama Sırası

| Adım | İş | Süre |
|------|-----|------|
| 1 | `SourceBadge` UI bileşeni (3 ikon + renk) | 3 saat |
| 2 | Karne ekranına badge entegrasyonu | 4 saat |
| 3 | Araç sicili satır kaynak ikonu | 3 saat |
| 4 | Bakım fallback uyarı metni (mobil + admin) | 2 saat |
| 5 | `report_source_snapshots` tablosu + migration | 2 saat |
| 6 | Rapor üretiminde snapshot kaydı | 3 saat |
| 7 | PDF kaynak tablosu | 3 saat |
| 8 | Kasko karnesi "nasıl hesaplandı" section | 3 saat |
| 9 | Admin bakım kuralı onay akışı | 4 saat |

**Toplam tahmini:** ~2.5 gün

---

## Notlar

- Yeni DB alanı açılmıyor; mevcut `verification_level`, `spec_confidence`, `source_type`, `rule_confidence` kullanılıyor
- `report_source_snapshots` tek yeni tablo — snapshot immutable, güncellenmez
- Güven rozeti tasarımı renk körü kullanıcılar için ikon + renk kombinasyonu kullanmalı (yalnızca renge güvenme)
- B3 snapshot mekanizması, ileriki yasal uyumluluk için de zemin hazırlıyor (rapor bütünlüğü)
