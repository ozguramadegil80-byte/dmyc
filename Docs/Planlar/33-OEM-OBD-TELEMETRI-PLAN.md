# DMyC OEM / OBD Telemetri Planı

## Amaç

Gerçek araç verilerine erişmek: anlık SOC, gerçek odometer, şarj geçmişi,
hızlanma/frenleme kayıtları. Deterministik motorun girdilerini zenginleştirmek.

---

## Neden Şimdi Değil

```text
- Her OEM için ayrı entegrasyon gerekiyor (Tesla, Hyundai, Kia, BYD, Togg...)
- OEM API'leri kapalı / ücretli / değişken
- OBD-II dongle: donanım karmaşıklığı + Bluetooth bağlantı sorunları
- Mevcut sistem kullanıcı beyanı ile çalışıyor ve bu yeterli MVP için
- Teknik önündeki iş çok büyük, değer kanıtlanmadan başlanmaz
```

---

## OEM API Durumu (2026 itibarıyla)

```text
Tesla:
  - Fleet API (ücretli, araç sahibi onayı gerekir)
  - Türkiye'de aktif araç sayısı yeterli

Hyundai / Kia:
  - Bluelink / UVO Connect API (kapalı / partner anlaşması gerekir)

BYD:
  - API kamuya açık değil

Togg:
  - API henüz 3. taraflara açılmadı (2026)

OMODA / Jaecoo:
  - API yok

Renault / Dacia:
  - MyRenault API (partner programı)
```

---

## OBD-II Yaklaşımı

```text
Dongle: ELM327 Bluetooth / WiFi
  → mobil app ile bağlantı
  → PID sorguları: SOC, odometer, hız, ivme

Avantaj: marka bağımsız
Dezavantaj:
  - Kullanıcı donanım satın almalı (~200-500 TL)
  - Bluetooth pairing karmaşık
  - Bazı araçlar OBD-II erişimini kısıtlıyor (özellikle Çin araçları)
```

---

## Veri Katmanı Tasarımı

```text
telemetry_readings tablosu:
  vehicle_id, source ('oem_api' | 'obd2' | 'manual'),
  recorded_at, soc_percent, odometer_km,
  latitude, longitude, speed_kmh,
  battery_temp_c, charging_status, raw_payload jsonb

telemetry_sessions:
  vehicle_id, source, started_at, ended_at,
  reading_count, confidence
```

---

## Geçiş Stratejisi

```text
Mevcut sistem:
  kullanıcı beyanı → deterministic motor

OEM/OBD geldiğinde:
  telemetri → deterministic motor (girdiler daha hassas)
  kullanıcı beyanı → fallback (telemetri yoksa)

Değerlendirme confidence:
  'estimated' (beyan)  →  'measured' (telemetri)
```

---

## Ön Koşul

```text
Tesla veya Hyundai/Kia odaklı kullanıcı kitlesi oluşması
OEM partner anlaşması veya Fleet API erişimi
veya
OBD dongle pilot kullanıcı grubu (10+ araç)
```

---

## Durum: ⏳ BEKLEMEDE
