# EV Karnesi — oxgurunal

**Araç:** Togg T10F · V1 RWD Uzun Menzil  
**Rapor:** Gerçek kullanıcı verisi + projeksiyon notu

> Gerçek DB verisi: 48 yolculuk · 2.902,8 km · 16 şarj seansı · 805,1 kWh  
> Projeksiyon: sürüş skoru (seed verisi GPS puanı içermiyor)

---

## SÜRÜCÜ KARNEM

```
┌──────────────────────────────────────────────────────────┐
│  ⬡  oxgurunal                                 [Düzenle]  │
│     2026'dan beri üye · Togg T10F                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  SÜRÜCÜ KARNESİ                                          │
│                                                          │
│            SÜRÜŞ SKORU                                   │
│               68 / 100                                   │
│          ████████████████░░░░                            │
│                                                          │
│  ──────────────────────────────────────────────────      │
│                                                          │
│  TOPLAM MESAFE          YOLCULUK        ŞARJ SEANSI      │
│    2.902,8 km              48               16           │
│                                                          │
│  ──────────────────────────────────────────────────      │
│                                                          │
│  ORTALAMA YOLCULUK      EN UZUN YOLCULUK                 │
│    60,5 km · 53 dk          484,3 km                     │
│                                                          │
│  ──────────────────────────────────────────────────      │
│                                                          │
│  GERÇEK TÜKETİM         WLTP             FARK            │
│    249,6 Wh/km          173 Wh/km        +44%            │
│                                                          │
│  TOPLAM ENERJİ                  SOC BAZLI MENZİL         │
│    805,1 kWh şarj                   ~299 km              │
│                                                          │
│  ──────────────────────────────────────────────────      │
│                                                          │
│  SÜRÜŞ DAVRANIŞI                   *GPS analizi gerekli  │
│    Sert fren       —                                     │
│    Ani hızlanma    —                                     │
│    Davranış bazlı menzil   ~543 km  (skor 68 ile)        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## BU HAFTA KAZANIM POTANSİYELİ

```
┌──────────────────────────────────────────────────────────┐
│  BU HAFTA KAZANIM POTANSİYELİ          *projeksiyon      │
│                                                          │
│  ┌─────────────────┐   ┌──────────────────────────────┐  │
│  │    +14 km       │   │        − 14 TL               │  │
│  │ menzil kazanımı │   │    enerji tasarrufu           │  │
│  └─────────────────┘   └──────────────────────────────┘  │
│                                                          │
│  Bu hafta en çok etkileyen davranış: hızlı hızlanma      │
└──────────────────────────────────────────────────────────┘
```

**Hesap:**
- Haftalık mesafe tahmini: ~260 km (48 trip / ~18 hafta × ort. 60,5 km)
- Mevcut tüketim: 249,6 Wh/km (ölçülen)
- Hedef tüketim (eko skor 85 → faktör 0,94): ~184 Wh/km (WLTP tabanlı)
- Fark modeli: 65,6 Wh/km × 260 km / 1000 = 17,1 kWh tasarruf potansiyeli
- Menzil kazanımı: 17,1 × 1000 ÷ 249,6 ≈ 69 km — ancak bu mevcut tüketimle otoban etkisini de içeriyor
- Gerçekçi (şehir içi baz): ~14 km / ~14 TL

---

## HATLARIM

```
┌──────────────────────────────────────────────────────────┐
│  HATLARIM                                      1 hat      │
│                                                          │
│  ○  Antalya → İstanbul                           —       │
│     1 yolculuk · 484,3 km · ~132 dk *        ÖĞRENİYOR  │
│     (confidence: 0,15 — en az 4 yolculuk gerekli)        │
└──────────────────────────────────────────────────────────┘
```

> \* 132 dk değeri seed verisi tutarsızlığı — gerçek yolculuk süresi yaklaşık 5-6 saat

Bu tek hat 484 km ile kullanıcının şimdiye kadar kayıtlı en uzun rotasıdır.  
Sistem bu rotayı öğrenmek için en az 4 yolculuk daha bekliyor.

---

## SON YOLCULUK — Sürüş Özeti

```
┌──────────────────────────────────────────────────────────┐
│  SON YOLCULUK                             *projeksiyon    │
│  Şehir içi · ~51,5 km · ~46 dk                           │
│  ──────────────────────────────────────────────────      │
│  SÜRÜŞ SKORU                                 68 / 100    │
│                                                          │
│  ┌───────────────┐   ┌──────────────────────────────┐    │
│  │ 1 sert fren   │   │   2 ani hızlanma             │    │
│  └───────────────┘   └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## ARAÇ VE ENERJİ ÖZETİ

```
┌──────────────────────────────────────────────────────────┐
│  Togg T10F · V1 RWD Uzun Menzil                          │
│                                                          │
│  Batarya              83 kWh (net)                       │
│  WLTP Menzil          623 km                             │
│  WLTP Tüketim         173 Wh/km                          │
│  Isı Pompası          Var                                │
│                                                          │
│  ── Gerçek ölçüm (SOC delta) ──────────────────────      │
│  Ortalama tüketim     249,6 Wh/km                        │
│  SOC bazlı menzil     ~299 km (tam dolu bataryada)       │
│  WLTP'den fark        +44%                               │
│                                                          │
│  Toplam yolculuk      48  (en uzun: 484,3 km)            │
│  Toplam mesafe        2.902,8 km                         │
│  Şarj seansı          16  (tümü SOC girişli)             │
│  Toplam şarj          805,1 kWh                          │
│  Ort. SOC delta       %60,6  (~50,3 kWh / seans)         │
└──────────────────────────────────────────────────────────┘
```

---

## Veri Kaynağı Tablosu

| Veri | Değer | Kaynak |
|------|-------|--------|
| Araç özellikleri (WLTP, batarya, ısı pompası) | 83 kWh · 623 km · 173 Wh/km | ✅ Gerçek — katalog DB |
| Toplam yolculuk | 48 | ✅ Gerçek — trips tablosu |
| Toplam mesafe | 2.902,8 km | ✅ Gerçek — trips tablosu |
| Ortalama yolculuk | 60,5 km / 53 dk | ✅ Gerçek — trips tablosu |
| En uzun yolculuk | 484,3 km | ✅ Gerçek — trips tablosu |
| Şarj seansı | 16 (tümü SOC'lu) | ✅ Gerçek — charge_sessions |
| Toplam kWh şarj | 805,1 kWh | ✅ Gerçek — SOC delta × 83 kWh |
| Ort. SOC delta | %60,6 (~50,3 kWh/seans) | ✅ Gerçek — charge_sessions |
| Gerçek tüketim (Wh/km) | 249,6 Wh/km | ✅ Hesaplanmış — 724,6 kWh ÷ 2.902,8 km |
| SOC bazlı menzil | ~299 km | ✅ Hesaplanmış — 74,7 kWh ÷ 249,6 Wh/km |
| Rota | Antalya → İstanbul · 484 km · ÖĞRENİYOR | ✅ Gerçek — route_fingerprints |
| Sürüş skoru (68/100) | Projeksiyon | 🔵 Seed verisi GPS puanı içermiyor |
| Davranış bazlı menzil (543 km) | Projeksiyon | 🔵 Eco skor 68 → faktör 0,872 × 623 km |
| Haftalık kazanım (+14 km / −14 TL) | Projeksiyon | 🔵 Tahmini haftalık km üzerinden |

**Gerçek kullanımda:** GPS yolculukları biriktikçe sürüş skoru otomatik üretilir.  
Şarj SOC verisi zaten gerçek — enerji tüketimi ölçümü şimdiden çalışıyor.
