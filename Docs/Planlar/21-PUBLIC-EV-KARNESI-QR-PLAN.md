# DMyC Public EV Karnesi ve QR Planı

## Amaç

Roadmap Faz 12'yi uygulamak: ikinci el güven katmanı.

Araç satılırken alıcı QR okutup aracın doğrulanmış kullanım geçmişini görür.
"EV Karnesi Var" rozeti Sahibinden ve benzeri platformlarda güven sinyali olur.

Bu faz kişisel rota bilgisi, ev/iş adresi veya sürücü kimliği paylaşmaz.
Yalnızca araç bazlı anonim metrikler public görünür.

---

## Roadmap Bağlamı

```text
Faz 12 — Public EV Karnesi
```

Bağımlı mevcut temel:

```text
vehicle_public_reports (Plan 20 ile kurulur)
vehicle_state_snapshots
battery_lifecycle_stats
monthly_reports / annual_reports (Plan 19)
vehicle_ownerships
```

---

## Kapsam

### Kapsam İçi

```text
QR token üretimi (vehicle_public_reports.share_token)
Public URL: GET /public/vehicles/:token (auth gerektirmez)
Doğrulama seviyesi hesabı
Karne paylaşım butonu (mobil)
"EV Karnesi Var" rozeti verisi
```

### Kapsam Dışı

```text
Sahibinden.com veya benzeri platform entegrasyonu
Sunucu taraflı PDF / PNG üretimi
OEM doğrulama sistemi
Ruhsat sahibi kimlik doğrulama
```

---

## Doğrulama Seviyeleri

Sistem yargılamaz; yalnızca hangi verinin doğrulandığını gösterir.

```text
basic     — Araç profili oluşturulmuş, en az 1 trip kaydedilmiş
confirmed — En az 3 şarj oturumu doğrulanmış + route fingerprint öğrenilmiş
verified  — Yıllık rapor üretilmiş + servis ziyareti kaydedilmiş (Plan 23 sonrası)
```

## Public Karne İçeriği (kişisel veri yok)

```text
Araç modeli, yıl, batarya kapasitesi
Kayıtlı kullanım dönemi başlangıcı
Toplam km aralığı (bant olarak: "10.000–20.000 km")
Batarya kullanım notu (balanced / watch / high_stress)
AC/DC şarj oranı
Ortalama tüketim (kWh/100km)
Doğrulama seviyesi
Veri güven skoru
Karne oluşturma tarihi
```

---

## Fazlar

### Faz 21A: Plan ve Roadmap Senkronu

- `[x]` Plan 20 (Araç Sicili) kapalı kabul edilir.
- `[x]` Roadmap aktif yürütme notu bu plana güncellenir.
- `[x]` Public karne içeriği ve gizlilik sınırları netleştirilir.

### Faz 21B: QR Token ve Public Report Servisi

- `[x]` `PublicReportService.generate(vehicleId)` yazılır.
- `[x]` `vehicle_public_reports` kaydı oluşturulur veya güncellenir.
- `[x]` Doğrulama seviyesi deterministik kuralla hesaplanır.
- `[x]` Public snapshot verisi JSON olarak saklanır.

### Faz 21C: Public URL Endpoint

- `[x]` `GET /public/vehicles/:token` eklenir (auth guard yok).
- `[x]` View count artırılır.
- `[x]` Süresi dolmuş veya iptal edilmiş token 404 döner.
- `[x]` Kişisel veri (lokasyon, rota, user_id) response dışında tutulur.

### Faz 21D: Karne Üretim Endpoint'i

- `[x]` `POST /vehicles/:id/public-report` eklenir.
- `[x]` Mevcut raporu güncelleme veya yeni oluşturma desteklenir.
- `[x]` `GET /vehicles/:id/public-report` eklenir.

### Faz 21E: Mobil Görünürlük

- `[x]` Karne ekranına "Karneyi Paylaş" butonu eklenir.
- `[x]` QR veya link kopyalama akışı eklenir.
- `[x]` Doğrulama seviyesi rozeti gösterilir.
- `[x]` Metinler çoklu dil yapısına uygun hazırlanır.

### Faz 21F: Doğrulama

- `[x]` DB migration uygulanır (public_reports için varsa ek alan).
- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` Public URL auth olmadan erişilebilir olduğu smoke ile doğrulanır.
- `[x]` Kişisel veri sızıntısı olmadığı kontrol edilir.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Araç sahibi tek tıkla paylaşılabilir karne URL'i üretiyor.
Alıcı auth olmadan karne bilgilerini görebiliyor.
Doğrulama seviyesi deterministik olarak hesaplanıyor.
Kişisel lokasyon veya rota bilgisi public görünmüyor.
```

---

## Sonraki Plana Açılan Kapı

- Plan 23: Servis ziyareti kaydedildikçe doğrulama seviyesi 'verified'e çıkabilir.
- B2B: "EV Karnesi Var" rozeti platform entegrasyonu için foundation hazır.
