# DMyC AI Destekli Özellikler Planı

## Amaç

AI'yi deterministik motorun yerine değil, **yanında** kullanmak.
Üretimde veri analizi yapan değil, metin üreten / anomali işaretleyen dar görevler.

---

## Temel Kural

```text
✓ AI üretilebilir: rapor metni, kullanıcı mesajı, özet narratif
✓ AI işaretleyebilir: "bu şarj davranışı olağandışı görünüyor"
✗ AI karar veremez: "bataryanız sağlıklı", "bu aracı alma"
✗ AI runtime'da veri hesaplayamaz: skorlar, tahminler deterministik kalır
```

---

## Neden Şimdi Değil

```text
- Deterministic motor doğrulanmadan AI katmanı güvenilirliği bozar
- Hallucination riski: araç değerlendirmesinde yanlış bilgi telafisi imkansız
- Maliyet: her kullanıcı isteğinde LLM çağrısı ölçeklenmiyor
- Önce verinin doğruluğu, sonra verinin anlatımı
```

---

## Planlanan Kullanım Alanları

### 1. Rapor Narratif Üretimi (offline / batch)
```text
Tetikleyici: premium rapor oluşturulduğunda (POST /premium-report)
Girdi: report_data JSON
Görev: 2-3 paragraf doğal dil özeti üret
Çıktı: report_data.aiNarrative alanına eklenir
Maliyet kontrolü: kullanıcı başına günde 1 üretim
```

### 2. Şarj Anomali İşaretleme (arka plan job)
```text
Tetikleyici: haftalık cron job
Analiz: son 4 hafta şarj pattern → önceki 4 hafta karşılaştırma
Anomali türleri:
  - DC şarj oranı ani artış (>+20pp)
  - Ortalama başlangıç SOC ani düşüş (<15% artışı)
  - Enerji verimliliği belirgin kötüleşme
Çıktı: usage_signals tablosuna 'ai_anomaly_flag' signal tipi
Kullanıcıya: bildirim (opsiyonel) — "Şarj davranışında değişim tespit edildi"
```

### 3. Soru Motoru Otomatik Seçimi (opsiyonel)
```text
Şu an: trip_context_questions kural tabanlı tetikleniyor
AI ile: "bu yolculuk için hangi soru en değerli?" sınıflaması
Önkoşul: yeterli labeled veri (1000+ cevaplı soru)
```

---

## Teknik Sınır

```text
Kullanılabilecek:
  Claude claude-sonnet-4-6 (Anthropic API)
  Structured output: JSON schema ile zorunlu format

Kullanılamaz:
  - Fine-tune (veri yok)
  - Embedding tabanlı arama (ölçek yok)
  - Ajanlar (kontrol edilemez)
```

---

## Güvenlik Notu

```text
AI çıktısı her zaman:
  - "yapay zeka destekli ön analiz" olarak etiketlenir
  - Deterministik veri yanında gösterilir, yerine geçmez
  - Kullanıcı "bu nasıl hesaplandı?" diye sorabilir → deterministik değerler gösterilir
```

---

## Ön Koşul

```text
Sistemde 500+ araç, 10.000+ yolculuk verisi
Deterministik raporların kullanıcı tarafından güvenilir bulunması (feedback)
LLM API maliyeti kontrol altında (rate limit + caching)
```

---

## Durum: ⏳ BEKLEMEDE
